import { RekognitionClient, DetectFacesCommand } from "@aws-sdk/client-rekognition";

const rekognition = new RekognitionClient({
  region: process.env.AWS_REGION
});

export default async function handler(req, res) {
  // CORS (matcher din vercel.json)
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
    const { image, consent, selections } = req.body || {};

    if (!image || consent !== true) {
      return res.status(200).json({
        faceDetected: false,
        assessment: "IKKE_ANSIGT",
        message: "Billedet kunne ikke analyseres.",
        score: 0
      });
    }

    // Fjern base64 header
    const base64 = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");

    // AWS Rekognition – DETTE ER GATEKEEPEREN
    const detect = await rekognition.send(
      new DetectFacesCommand({
        Image: { Bytes: buffer },
        Attributes: []
      })
    );

    if (!detect.FaceDetails || detect.FaceDetails.length === 0) {
      return res.status(200).json({
        faceDetected: false,
        assessment: "IKKE_ANSIGT",
        message: "Der kan ikke ses et menneskeligt ansigt på billedet.",
        score: 0
      });
    }

    // Byg prompt til /api/ask (samme AI som resten af platformen)
    const question = `
Du er en professionel ansigtsstylist.

Der er teknisk påvist et menneskeligt ansigt på billedet.
Billedet gemmes ikke og bruges kun til denne vurdering.

Brugerens valg:
${JSON.stringify(selections || {}, null, 2)}

Krav:
- Vær ærlig og direkte (ikke sukkersød)
- Forklar konsekvenser
- Brug konkrete observationer
- Undgå gætterier om køn eller identitet

Strukturér svaret i præcis disse 7 afsnit:
1. Helhedsindtryk
2. Overordnet udtryk
3. Formål og signalværdi
4. Konkrete stylingforslag
5. Fokusområder
6. Hvad der bør undgås
7. Alternativ tilgang

Skriv på dansk i professionel tone.
`.trim();

    // Kald eksisterende /api/ask (VIGTIGT: intern genbrug)
    const baseUrl = `https://${req.headers.host}`;

    const aiRes = await fetch(`${baseUrl}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });

    const aiData = await aiRes.json();

    if (!aiRes.ok) {
      throw new Error("AI fejl");
    }

    return res.status(200).json({
      faceDetected: true,
      assessment: "ANSIGT",
      message: "Der kan ses et menneskeligt ansigt på billedet.",
      score: 80,
      answer: aiData.answer
    });

  } catch (err) {
    console.error("Ansigtsstyling fejl:", err);
    return res.status(500).json({
      error: "ansigtsstyling_failed"
    });
  }
}
