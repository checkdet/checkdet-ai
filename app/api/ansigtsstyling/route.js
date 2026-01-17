import AWS from "aws-sdk";

/* 🔴 VIGTIGSTE LINJE */
export const runtime = "nodejs";

const rekognition = new AWS.Rekognition({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

/* ===== CORS PREFLIGHT ===== */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "https://www.checkdet.dk",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

/* ===== POST ===== */
export async function POST(req) {
  try {
    const { image, consent } = await req.json();

    if (!image || consent !== true) {
      return new Response(
        JSON.stringify({
          faceDetected: false,
          message: "Billedet kunne ikke analyseres som et ansigt."
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "https://www.checkdet.dk"
          }
        }
      );
    }

    const base64 = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");

    const result = await rekognition
      .detectFaces({ Image: { Bytes: buffer } })
      .promise();

    if (!result.FaceDetails || result.FaceDetails.length === 0) {
      return new Response(
        JSON.stringify({
          faceDetected: false,
          message: "Der kan ikke ses et menneskeligt ansigt på billedet."
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "https://www.checkdet.dk"
          }
        }
      );
    }

    return new Response(
      JSON.stringify({
        faceDetected: true,
        message: "Der kan ses et menneskeligt ansigt på billedet."
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "https://www.checkdet.dk"
        }
      }
    );

  } catch (err) {
    console.error("Ansigtsstyling crash:", err);
    return new Response(
      JSON.stringify({ error: "ansigtsstyling_failed" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "https://www.checkdet.dk"
        }
      }
    );
  }
}
