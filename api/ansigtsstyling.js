import AWS from "aws-sdk";

export default async function handler(req, res) {
  // CORS
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
    // 🔍 LOG ENV (uden at lække nøgler)
    console.log("AWS_REGION:", process.env.AWS_REGION);
    console.log(
      "AWS_ACCESS_KEY_ID present:",
      Boolean(process.env.AWS_ACCESS_KEY_ID)
    );
    console.log(
      "AWS_SECRET_ACCESS_KEY present:",
      Boolean(process.env.AWS_SECRET_ACCESS_KEY)
    );

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

    console.log("Image buffer length:", buffer.length);

    const result = await rekognition
      .detectFaces({
        Image: { Bytes: buffer }
      })
      .promise();

    console.log("Rekognition result:", result);

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
    console.error("🔥 AWS ERROR:", err);

    return res.status(500).json({
      error: "ansigtsstyling_failed",
      awsError: {
        name: err.name,
        message: err.message,
        code: err.code,
        statusCode: err.statusCode
      }
    });
  }
}
