export default async function handler(req, res) {
  /* ================================
     CORS – nødvendigt for one.com
  ================================= */
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

    /* ================================
       1. ÆRLIG BILLED-LOGIK
    ================================= */
    const imageAnalysisUsed = Boolean(image && consent === true);

    /* ================================
       2. BYG PAYLOAD TIL /api/ask
    ================================= */
    const askPayload = {
      tool: "ansigtsstyling",
      imageAnalysisUsed,
      faceMetrics: null,
      userChoices: userChoices || {}
    };

    /* ================================
       3. KALD /api/ask (ABSOLUT URL)
    ================================= */
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

    /* ================================
       4. SIMPEL, DETERMINISTISK SCORE
    ================================= */
    const score = imageAnalysisUsed ? 70 : 60;

    /* ================================
       5. RETURNÉR SVAR
    ================================= */
    return res.status(200).json({
      imageAnalysisUsed,
      score,
      answer: askData.answer
    });

  } catch (err) {
    console.error("Ansigtsstyling error:", err.message);

    return res.status(500).json({
      error: "ansigtsstyling_failed"
    });
  }
}
