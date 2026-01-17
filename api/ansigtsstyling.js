import AWS from "aws-sdk";

const rekognition = new AWS.Rekognition({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

export default async function handler(req, res) {
  /* ===== TVUNGEN CORS – ALTID ===== */
  res.setHeader("Access-Control-Allow-Origin", "https://www.checkdet.dk");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { image, consent } = req.body || {};

    if (!image || consent !== true) {
      return res.status(200).json({
        faceDetected: false,
        assessment: "IKKE_ANSIGT",
        message: "Billedet kunne ikke analyseres som et ansigt.",
        score: 0
      });
    }

    const base64 = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");

    const result = await rekognition
      .detectFaces({ Image: { Bytes: buffer } })
      .promise();

    if (!result.FaceDetails || result.FaceDetails.length === 0) {
      return res.status(200).json({
        faceDetected: false,
        assessment: "IKKE_ANSIGT",
        message: "Der kan ikke ses et menneskeligt ansigt på billedet.",
        score: 0
      });
    }

    return res.status(200).json({
      faceDetected: true,
      assessment: "ANSIGT",
      message: "Der kan ses et menneskeligt ansigt på billedet.",
      score: 80,
      answer: "Ansigt registreret korrekt."
    });

  } catch (e) {
    return res.status(500).json({ error: "ansigtsstyling_failed" });
  }
}
