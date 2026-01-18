import { RekognitionClient, DetectFacesCommand } from "@aws-sdk/client-rekognition";

const rekognition = new RekognitionClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

export default async function handler(req, res) {
  // CORS (matcher dine andre værktøjer)
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

    // 1️⃣ Basal validering
    if (!image || consent !== true) {
      return res.status(200).json({
        faceDetected: false,
        message: "Ingen gyldigt billede eller samtykke."
      });
    }

    // 2️⃣ Klargør billede
    const base64 = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");

    // 3️⃣ AWS Rekognition – gatekeeper
    const detectResult = await rekognition.send(
      new DetectFacesCommand({
        Image: { Bytes: buffer },
        Attributes: []
      })
    );

    if (!detectResult.FaceDetails || detectResult.FaceDetails.length === 0) {
      return res.status(200).json({
        faceDetected: false,
        message: "Der kan ikke ses et menneskeligt ansigt på billedet."
      });
    }

    // 4️⃣ Byg prompt til AI
    const focusText = (selections?.focus || []).join(", ") || "ingen specifikke fokusområder";

    const prompt = `
Du er en professionel ansigtsstylist.

Der er teknisk påvist et menneskeligt ansigt på billedet.
Billedet gemmes ikke.

Brugerens fokusområder:
${focusText}

Skriv dybdegående, konkrete og ærlige råd.
Undgå sukkersødt sprog og gentagelser.
Forklar konsekvenser og signalværdi.

Strukturér svaret i præcis disse 7 afsnit:
1. Helhedsindtryk
2. Overordnet udtryk
3. Formål og signalværdi
4. Konkrete stylingforslag
5. Fokusområder
6. Hvad der bør undgås
7. Alternativ tilgang

Skriv på dansk i rolig, professionel tone.
`.trim();

    // 5️⃣ Kald OpenAI (samme måde som dine andre værktøjer)
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      })
    });

    const aiData = await aiResponse.json();

    if (!aiResponse.ok) {
      throw new Error("OpenAI-fejl");
    }

    // 6️⃣ Returnér samlet svar
    return res.status(200).json({
      faceDetected: true,
      assessment: "ANSIGT",
      score: 80,
      answer: aiData.choices[0].message.content
    });

  } catch (err) {
    console.error("ANSIGTSSTYLING FEJL:", err);
    return res.status(500).json({
      error: "ansigtsstyling_failed"
    });
  }
}
