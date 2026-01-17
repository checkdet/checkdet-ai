import AWS from "aws-sdk";

const rekognition = new AWS.Rekognition({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

export default async function handler(req, res) {

  /* 🔒 CORS – ALTID FØRST */
  res.setHeader("Access-Control-Allow-Origin", "https://www.checkdet.dk");
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

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    const detectResult = await rekognition.detectFaces({
      Image: { Bytes: imageBuffer },
      Attributes: []
    }).promise();

    if (!detectResult.FaceDetails || detectResult.FaceDetails.length === 0) {
      return res.status(200).json({
        faceDetected: false,
        assessment: "IKKE_ANSIGT",
        message: "Der kan ikke ses et menneskeligt ansigt på billedet.",
        score: 0
      });
    }

    const question = `
Du er en professionel ansigtsstylist.

Der er teknisk påvist et menneskeligt ansigt på billedet.
Billedet gemmes ikke og bruges kun til denne vurdering.

Giv rådgivende stylingforslag i 7 afsnit.
`.trim();

    const askRes = await fetch("https://checkdet-ai.vercel.app/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });

    const askData = await askRes.json();

    return res.status(200).json({
      faceDetected: true,
      assessment: "ANSIGT",
      message: "Der kan ses et menneskeligt ansigt på billedet.",
      score: 80,
      answer: askData.answer
    });

  } catch (err) {
    return res.status(500).json({
      error: "ansigtsstyling_failed"
    });
  }
}
