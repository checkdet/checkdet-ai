export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Kun POST tilladt" });
  }

  try {
    const { subject, level, question } = req.body;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: `
Du er en hjælpsom dansk lektiehjælper.
Forklar ting simpelt og ansvarligt.
Ingen færdige afleveringer – kun forklaring.

Fag: ${subject}
Niveau: ${level}
Spørgsmål: ${question}
`
      })
    });

    const data = await response.json();

    // 👇 NY måde at læse svaret på
    const answer =
      data.output_text ||
      (data.output && data.output[0]?.content?.[0]?.text) ||
      null;

    if (!answer) {
      return res.status(500).json({ error: "AI fejl" });
    }

    res.status(200).json({ answer });

  } catch (err) {
    res.status(500).json({
      error: "AI fejl",
      details: err.message
    });
  }
}
