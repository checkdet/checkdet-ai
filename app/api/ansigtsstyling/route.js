import AWS from "aws-sdk";

const rekognition = new AWS.Rekognition({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

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

export async function POST(req) {
  try {
    const { image, consent } = await req.json();

    if (!image || consent !== true) {
      return Response.json(
        { faceDetected: false, message: "Billedet kunne ikke analyseres som et ansigt." },
        { status: 200 }
      );
    }

    const base64 = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");

    const result = await rekognition.detectFaces({
      Image: { Bytes: buffer }
    }).promise();

    if (!result.FaceDetails || result.FaceDetails.length === 0) {
      return Response.json(
        { faceDetected: false, message: "Der kan ikke ses et menneskeligt ansigt på billedet." },
        { status: 200 }
      );
    }

    return Response.json(
      { faceDetected: true, message: "Der kan ses et menneskeligt ansigt på billedet." },
      { status: 200 }
    );

  } catch (e) {
    return Response.json(
      { error: "ansigtsstyling_failed" },
      { status: 500 }
    );
  }
}
