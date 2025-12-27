export default async function handler(req, res) {
  // 🔓 CORS – tillad kald fra hjemmesider
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight request (browser-tjek)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Kun POST tilladt" });
  }

  try {
    const { subject, level, question } = req.body;

    const prompt = `
Du er en hjælpsom dansk assistent.
Forklar ting simpelt og ansvarligt.
Ingen færdige afleveringer – kun forklaring.

Fag: ${subject}
Niveau: ${level}
Spørgsmål: ${question}
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4
      })
    });

    const data = await response.json();

    res.status(200).json({
      answer: data.choices[0].message.content
    });

  } catch (error) {
    res.status(500).json({
      error: "AI-fejl",
      details: error.message
    });
  }
}
