/**
 * CheckDet – Ansigtsstyling
 * Korrekt Vercel Serverless-version
 * Matcher eksisterende /api/ask
 */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { image, consent, userChoices } = req.body || {};

    /* ================================
       1. FASTSLÅ OM BILLEDE INDGÅR
       (ingen teknisk analyse – ærlig)
    ================================= */
    const imageProvided = Boolean(image);
    const imageAnalysisUsed = imageProvided && consent === true;

    /* ================================
       2. BYG PAYLOAD TIL /api/ask
       (matcher dit eksisterende setup)
    ================================= */
    const askPayload = {
      tool: "ansigtsstyling",
      imageAnalysisUsed,
      faceMetrics: null,
      userChoices: userChoices || {}
    };

    /* ================================
       3. KALD /api/ask (RELATIV PATH)
       → korrekt på Vercel
    ================================= */
    const askResponse = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(askPayload)
    });

    if (!askResponse.ok) {
      throw new Error("AI endpoint failed");
    }

    const askData = await askResponse.json();

    /* ================================
       4. SIMPEL, ÆRLIG SCORE
    ================================= */
    let score = imageAnalysisUsed ? 70 : 60;

    /* ================================
       5. RETURNÉR SAMLET SVAR
    ================================= */
    return res.status(200).json({
      imageAnalysisUsed,
      score,
      answer: askData.answer
    });

  } catch (err) {
    console.error("Ansigtsstyling error:", err);

    return res.status(500).json({
      error: "ansigtsstyling_failed"
    });
  }
}
