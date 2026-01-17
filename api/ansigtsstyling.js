export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://www.checkdet.dk");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST" });

  try {
    const AWS = (await import("aws-sdk")).default;
    const { image, consent, selections } = req.body || {};

    if (!image || consent !== true) {
      return res.status(200).json({
        faceDetected: false,
        message: "Manglende billede eller samtykke."
      });
    }

    const rek = new AWS.Rekognition({
      region: process.env.AWS_REGION, // eu-west-1
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });

    const base64 = image.replace(/^data:image\/\w+;base64,/, "");
    const buf = Buffer.from(base64, "base64");

    const r = await rek.detectFaces({ Image: { Bytes: buf } }).promise();
    const hasFace = (r.FaceDetails || []).length > 0;

    // ❌ IKKE ANSIGT → STOP
    if (!hasFace) {
      return res.status(200).json({
        faceDetected: false,
        message: "Der kan ikke ses et menneskeligt ansigt på billedet."
      });
    }

    // ✅ ANSIGT → KALD /api/ask
    const prompt = `
Du er en professionel ansigtsstylist.

START ALTID MED ÉN LINJE:
[ASSESSMENT: ANSIGT]

Skriv derefter 7 afsnit (adskilt af tom linje):
1. Kort vurdering af billedet
2. Overordnet indtryk
3. Alder og formål
4. Konkrete stylingforslag
5. Fokusområder
6. Hvad der bør undgås
7. Alternativ tilgang

Valg:
${JSON.stringify(selections || {}, null, 2)}

Tone: professionel, rolig, handlingsorienteret.
Sprog: dansk.
    `.trim();

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `http://${req.headers.host}`;

    const askRes = await fetch(`${baseUrl}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: prompt })
    });

    const askData = await askRes.json();

    if (!askRes.ok) {
      return res.status(500).json({ error: "ask_failed" });
    }

    return res.status(200).json({
      faceDetected: true,
      answer: askData.answer
    });

  } catch (e) {
    return res.status(500).json({ error: "ansigtsstyling_failed" });
  }
}
