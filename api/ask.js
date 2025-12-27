export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const { question } = req.body;

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
            content: "Du er en hjælpsom dansk assistent."
          },
          {
            role: "user",
            content: question
          }
        ]
      })
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(500).json({ error: "OpenAI fejl", details: data });
    }

    res.status(200).json({
      answer: data.choices[0].message.content
    });

  } catch (e) {
    res.status(500).json({ error: "Serverfejl", details: e.message });
  }
}
