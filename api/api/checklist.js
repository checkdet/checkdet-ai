export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    // 🔒 ALTID en string – ALDRIG null
    const question = String(
      req.body.question ||
      req.body.message ||
      "Lav en praktisk huskeseddel med relevante punkter."
    );

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "Du laver korte, konkrete tjeklister i punktform på dansk."
          },
          {
            role: "user",
            content: question
          }
        ],
        temperature: 0.4
      })
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(500).json({
        error: "OpenAI fejl",
        details: data
      });
    }

    res.status(200).json({
      answer: data.choices[0].message.content
    });

  } catch (e) {
    res.status(500).json({
      error: "Serverfejl",
      details: e.message
    });
  }
}
