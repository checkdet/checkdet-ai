export default async function handler(req, res) {
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

    const imageAnalysisUsed = Boolean(image && consent === true);

    const askPayload = {
      tool: "ansigtsstyling",
      imageAnalysisUsed,
      faceMetrics: null,
      userChoices: userChoices || {}
    };

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `http://${req.headers.host}`;

    const askResponse = await fetch(`${baseUrl}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(askPayload)
    });

    const rawText = await askResponse.text();

    // 🔴 HER returnerer vi DEN RIGTIGE FEJL
    if (!askResponse.ok) {
      return res.status(500).json({
        error: "ask_failed",
        status: askResponse.status,
        response: rawText
      });
    }

    const askData = JSON.parse(rawText);

    return res.status(200).json({
      imageAnalysisUsed,
      score: imageAnalysisUsed ? 70 : 60,
      answer: askData.answer,
      debug: {
        sentToAsk: askPayload
      }
    });

  } catch (err) {
    return res.status(500).json({
      error: "ansigtsstyling_crash",
      message: err.message
    });
  }
}
