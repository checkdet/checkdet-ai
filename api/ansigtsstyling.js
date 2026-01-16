import AWS from "aws-sdk";

const rekognition = new AWS.Rekognition({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

export default async function handler(req, res) {
  // CORS (one.com → Vercel)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { image, consent, userChoices } = req.body || {};

    if (!image || consent !== true) {
      return res.status(200).json({
        faceDetected: false,
        assessment: "IKKE_ANSIGT",
        message: "Billedet kunne ikke analyseres som et ansigt.",
        score: 0
      });
    }

    // Fjern base64 header
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    /* ================================
       1. AWS REKOGNITION – FACE CHECK
    ================================= */
    const detectResult = await rekognition.detectFaces({
      Image: { Bytes: imageBuffer },
      Attributes: []
    }).promise();

    const faceDetected = detectResult.FaceDetails.length > 0;

    /* ================================
       2. HVIS IKKE ANSIGT → STOP HER
    ================================= */
    if (!faceDetected) {
      return res.status(200).json({
        faceDetected: false,
        assessment: "IKKE_ANSIGT",
        message: "Der kan ikke ses et menneskeligt ansigt på billedet.",
        score: 0
      });
    }

    /* ================================
       3. BYG PROMPT TIL /api/ask
    ================================= */
    const question = `
Du er en professionel ansigtsstylist.

Der er teknisk påvist et menneskeligt ansigt på billedet.
Billedet gemmes ikke og bruges kun til denne vurdering.

Brugerens valg:
${JSON.stringify(userChoices, null, 2)}

Opgave:
Giv rådgivende, ansvarlige stylingforslag.

Strukturér svaret i disse 7 afsnit:
1. Kort vurdering af helhedsindtryk
2. Overordnet udtryk
3. Formål og alder
4. Konkrete stylingforslag
5. Fokusområder
6. Hvad der bør undgås
7. Alternativ tilgang

Skriv på dansk i professionel, rolig tone.
    `.trim();

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `http://${req.headers.host}`;

    const askResponse = await fetch(`${baseUrl}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });

    const askData = await askResponse.json();

    if (!askResponse.ok) {
      throw new Error("AI fejl");
    }

    /* ================================
       4. RETURNÉR FULDT SVAR
    ================================= */
    return res.status(200).json({
      faceDetected: true,
      assessment: "ANSIGT",
      message: "Der kan ses et menneskeligt ansigt på billedet.",
      score: 80,
      answer: askData.answer
    });

  } catch (err) {
    console.error("Ansigtsstyling fejl:", err.message);
    return res.status(500).json({
      error: "ansigtsstyling_failed"
    });
  }
}
