import AWS from "aws-sdk";

export default async function handler(req, res) {
  // 🔒 CORS – skal være øverst
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
    const rekognition = new AWS.Rekognition({
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });

    const { image, consent } = req.body || {};

    if (!image || consent !== true) {
      return res.status(200).json({
        faceDetected: false,
        message: "Billedet kunne ikke analyseres som et ansigt."
      });
    }

    const base64 = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");

    const result = await rekognition.detectFaces({
      Image: { Bytes: buffer }
    }).promise();

    if (!result.FaceDetails || result.FaceDetails.length === 0) {
      return res.status(200).json({
        faceDetected: false,
        message: "Der kan ikke ses et menneskeligt ansigt på billedet."
      });
    }

    return res.status(200).json({
      faceDetected: true,
      message: "Der kan ses et menneskeligt ansigt på billedet."
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "ansigtsstyling_failed" });
  }
}
