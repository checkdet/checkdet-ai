import { RekognitionClient, DetectFacesCommand } from "@aws-sdk/client-rekognition";
import fetch from "node-fetch";

const rekognition = new RekognitionClient({
  region: process.env.AWS_REGION
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { image, consent, selections } = req.body;

    if (!image || consent !== true) {
      return res.status(200).json({ faceDetected:false });
    }

    const base64 = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");

    const detect = await rekognition.send(
      new DetectFacesCommand({
        Image:{Bytes:buffer},
        Attributes:[]
      })
    );

    if (!detect.FaceDetails || detect.FaceDetails.length === 0) {
      return res.status(200).json({ faceDetected:false });
    }

    const question = `
Du er en professionel ansigtsstylist.

Skriv udførligt, men præcist.
Undgå gentagelser mellem afsnit.
Hvert afsnit skal bygge videre på det forrige.

Brug konkrete observationer fra billedet og disse fokusområder:
${(selections?.focus||[]).join(", ")}

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

    const r = await fetch("https://api.openai.com/v1/chat/completions",{
      method:"POST",
      headers:{
        "Authorization":`Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        model:"gpt-4o-mini",
        messages:[{role:"user",content:question}],
        temperature:0.65
      })
    });

    const data = await r.json();

    return res.status(200).json({
      faceDetected:true,
      answer:data.choices[0].message.content
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error:"server_error" });
  }
}
