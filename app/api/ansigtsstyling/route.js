import { RekognitionClient, DetectFacesCommand } from "@aws-sdk/client-rekognition";

const rekognition = new RekognitionClient({
  region: process.env.AWS_REGION
});

export async function POST(request) {
  try {
    const { image, consent, selections } = await request.json();

    if (!image || consent !== true) {
      return new Response(JSON.stringify({ faceDetected: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const base64 = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");

    const detect = await rekognition.send(
      new DetectFacesCommand({
        Image: { Bytes: buffer },
        Attributes: []
      })
    );

    if (!detect.FaceDetails || detect.FaceDetails.length === 0) {
      return new Response(JSON.stringify({ faceDetected: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const question = `
Du er en professionel ansigtsstylist.

Skriv udførligt, men præcist.
Undgå gentagelser mellem afsnit.
Hvert afsnit skal bygge videre på det forrige.

Brug konkrete observationer fra billedet og disse fokusområder:
${(selections?.focus || []).join(", ")}

Vær ærlig og professionel – ikke sukkersød.
Forklar konsekvenser.

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

    // 👇 BRUG GLOBAL fetch (INGEN IMPORT)
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: question }],
        temperature: 0.65
      })
    });

    const aiData = await openaiRes.json();

    return new Response(JSON.stringify({
      faceDetected: true,
      answer: aiData.choices[0].message.content
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("ANSIGTSSTYLING ERROR:", err);
    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
