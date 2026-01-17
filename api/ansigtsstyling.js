export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://www.checkdet.dk");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const AWS = (await import("aws-sdk")).default;
    const { image, consent, selections } = req.body || {};

    if (!image || consent !== true) {
      return res.status(200).json({
        faceDetected: false,
        message: "Manglende billede eller samtykke."
      });
    }

    /* ===============================
       1. AWS REKOGNITION – GATEKEEPER
    =============================== */
    const rekognition = new AWS.Rekognition({
      region: process.env.AWS_REGION, // eu-west-1
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });

    const base64 = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");

    const detect = await rekognition
      .detectFaces({ Image: { Bytes: buffer } })
      .promise();

    const hasFace = (detect.FaceDetails || []).length > 0;

    if (!hasFace) {
      return res.status(200).json({
        faceDetected: false,
        message: "Der kan ikke ses et menneskeligt ansigt på billedet."
      });
    }

    /* ===============================
       2. DYB STYLIST-PROMPT
    =============================== */
    const prompt = `
Du er en **senior ansigtsstylist** med mange års erfaring fra mode, foto og professionel fremtoning.

DIN OPGAVE:
Du skal analysere ansigtets visuelle helhedsindtryk og give **konkrete, selektive og personlige stylingråd**.
Svarene skal føles som noget, en rigtig stylist ville sige efter at have set personen – ikke som generelle tips.

VIGTIGE REGLER (SKAL OVERHOLDES):
- Du må IKKE antage, gætte eller fastslå køn.
- Brug ALDRIG ordene “mand”, “kvinde”, “han”, “hun”.
- Brug KUN neutrale betegnelser som “personen”, “ansigtet”, “udtrykket”.
- Undgå generiske råd som “vælg noget der passer til dig”.
- Vælg hellere få, klare anbefalinger end mange brede.

DER ER TEKNISK PÅVIST ET MENNESKELIGT ANSIGT PÅ BILLEDET.
Billedet gemmes ikke og bruges kun til denne vurdering.

BRUGERENS VALG:
${JSON.stringify(selections || {}, null, 2)}

SÅDAN SKAL DU TÆNKE:
- Hvad virker allerede stærkt ved ansigtets udtryk?
- Hvad kan med små justeringer løftes markant?
- Hvad bør man bevidst undgå, selvom det er populært?
- Hvordan påvirker formålet (fx hverdag, job, socialt) helhedsindtrykket?

STRUKTUR (SKAL FØLGES – 7 AFSNIT):
1. Kort vurdering af helhedsindtryk (konkret, sansende)
2. Overordnet udtryk (hvad signaleres visuelt?)
3. Formål og alder (kun baseret på brugerens valg)
4. Konkrete stylingforslag (meget specifikke)
5. Fokusområder (prioritér 1–2)
6. Hvad der bør undgås (vær ærlig, men respektfuld)
7. Alternativ tilgang (hvis man vil gå i en anden retning)

Sprog: dansk  
Tone: professionel, præcis, erfaren stylist  
Svarlængde: dyb – hellere kvalitet end kvantitet
    `.trim();

    /* ===============================
       3. KALD /api/ask (AI)
    =============================== */
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `http://${req.headers.host}`;

    const askRes = await fetch(`${baseUrl}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: prompt,
        // Let variation – gør svar forskellige
        temperature: 0.7
      })
    });

    const askData = await askRes.json();

    if (!askRes.ok) {
      return res.status(500).json({ error: "ask_failed" });
    }

    /* ===============================
       4. RETURNÉR STYLING
    =============================== */
    return res.status(200).json({
      faceDetected: true,
      answer: askData.answer
    });

  } catch (err) {
    console.error("Ansigtsstyling fejl:", err);
    return res.status(500).json({
      error: "ansigtsstyling_failed"
    });
  }
}
