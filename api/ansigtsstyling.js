import AWS from "aws-sdk";

export default async function handler(req, res) {
  // 🔐 CORS – altid først
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
    const { image, consent } = req.body || {};

    if (!image || consent !== true) {
      return res.status(200).json({
        faceDetected: false,
        assessment: "IKKE_ANSIGT",
        reason: "Manglende billede eller samtykke"
      });
    }

    const rekognition = new AWS.Rekognition({
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });

    const base64 = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");

    const result = await rekognition.detectFaces({
      Image: { Bytes: buffer },
      Attributes: ["ALL"]
    }).promise();

    const faces = result.FaceDetails || [];

    if (faces.length === 0) {
      return res.status(200).json({
        faceDetected: false,
        assessment: "IKKE_ANSIGT",
        reason: "Ingen ansigter fundet"
      });
    }

    const face = faces[0];

    // 🎯 Selfie-kalibrerede tærskler
    const confidenceOk = face.Confidence >= 75;

    const box = face.BoundingBox || {};
    const faceArea = (box.Width || 0) * (box.Height || 0);
    const sizeOk = faceArea >= 0.04;

    const pose = face.Pose || {};
    const poseOk =
      Math.abs(pose.Yaw || 0) <= 30 &&
      Math.abs(pose.Pitch || 0) <= 30;

    const quality = face.Quality || {};
    const qualityOk =
      (quality.Brightness || 0) >= 30 &&
      (quality.Sharpness || 0) >= 30;

    const isValidFace =
      confidenceOk && sizeOk && poseOk && qualityOk;

    if (!isValidFace) {
      return res.status(200).json({
        faceDetected: false,
        assessment: "IKKE_ANSIGT",
        reason: "Ansigt opfylder ikke krav til tydelig selfie"
      });
    }

    return res.status(200).json({
      faceDetected: true,
      assessment: "ANSIGT",
      reason: "Tydeligt menneskeligt ansigt"
    });

  } catch (err) {
    console.error("🔥 AWS Rekognition fejl:", err);
    return res.status(500).json({
      error: "ansigtsstyling_failed",
      message: err.message
    });
  }
}
