import { RekognitionClient, DetectFacesCommand } from "@aws-sdk/client-rekognition";

const client = new RekognitionClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://www.checkdet.dk");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST allowed" });

  try {
    const { image, consent } = req.body || {};
    if (!image || consent !== true) {
      return res.status(200).json({
        faceDetected: false,
        message: "Billedet kunne ikke analyseres som et ansigt."
      });
    }

    const base64 = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");

    const command = new DetectFacesCommand({
      Image: { Bytes: buffer }
    });

    const result = await client.send(command);

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
    console.error("AWS ERROR:", err);
    return res.status(500).json({
      error: "ansigtsstyling_failed",
      message: err.message
    });
  }
}
