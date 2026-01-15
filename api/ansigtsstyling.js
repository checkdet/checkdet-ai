export default async function handler(req, res) {
  // CORS for one.com → Vercel
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { image, consent, userChoices } = req.body || {};

    // Ærlig billed-logik (ingen teknisk ansigtsanalyse endnu)
    const imageAnalysisUsed = Boolean(image && consent === true);

    // Payload der matcher dit eksisterende /api/ask
    const askPayload = {
      tool: "ansigtsstyling",
      imageAnalysisUsed,
      faceMetrics: null,
      userChoices: userChoices || {}
    };

    // Absolut URL til internt kald (kræver at Deployment Protection er slået fra)
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `http://${req.headers.host}`;

    const askResponse = await fetch(`${baseUrl}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(askPayload)
    });

    if (!askResponse.ok) {
      const text = await askResponse.text();
      throw new Error("AI endpoint failed: " + text);
    }

    const askData = await askResponse.json();

    // Deterministisk score
    const score = imageAnalysisUsed ? 70 : 60;

    return res.status(200).json({
      imageAnalysisUsed,
      score,
      answer: askData.answer
    });

  } catch (err) {
    console.error("Ansigtsstyling error:", err.message);
    return res.status(500).json({ error: "ansigtsstyling_failed" });
  }
}
