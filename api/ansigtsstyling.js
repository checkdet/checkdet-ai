export default async function handler(req, res) {
  /* =====================================
     🔐 CORS – ABSOLUT FØRST
     (browser → proxy → Vercel)
  ===================================== */
  res.setHeader("Access-Control-Allow-Origin", "https://www.checkdet.dk");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight må ALDRIG fejle
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    // Importér AWS SDK først NU (runtime-safe på Vercel)
    const AWS = (await import("aws-sdk")).default;

    const { image, consent } = req.body || {};

    if (!image || consent !== true) {
      return res.status(200).json({
        faceDetected: false,
        assessment: "IKKE_ANSIGT",
        message: "Manglende billede eller samtykke."
      });
    }

    const rekognition = new AWS.Rekognition({
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });

    // Fjern base64-header
    const base64 = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");

    const result = await rekognition
      .detectFaces({
        Image: { Bytes: buffer },
        Attributes: []
      })
      .promise();

    const faces = result.FaceDetails || [];

    // 🔴 AWS fandt INGEN ansigter
    if (faces.length === 0) {
      return res.status(200).json({
        faceDetected: false,
        assessment: "IKKE_ANSIGT",
        message: "Der kan ikke ses et menneskeligt ansigt på billedet."
      });
    }

    // ✅ AWS fandt ET ansigt → GODKEND
    return res.status(200).json({
      faceDetected: true,
      assessment: "ANSIGT",
      message: "Der kan ses et menneskeligt ansigt på billedet."
    });

  } catch (err) {
    console.error("🔥 Ansigtsstyling serverfejl:", err);
    return res.status(500).json({
      error: "ansigtsstyling_failed",
      message: err.message
    });
  }
}
