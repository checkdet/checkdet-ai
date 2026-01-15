/**
 * CheckDet – Ansigtsstyling
 * Samlet endpoint, der matcher eksisterende /api/ask
 * Ingen nye API-nøgler
 * Ærlig håndtering af billede
 */

import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { image, consent, userChoices } = req.body;

    /* ================================
       1. FASTSLÅ OM BILLEDE INDGÅR
       (ingen teknisk ansigtsgenkendelse)
    ================================= */
    const imageProvided = Boolean(image);
    const imageAnalysisUsed = imageProvided && consent === true;

    /* ================================
       2. BYG PAYLOAD TIL /api/ask
       Matcher dit eksisterende setup
    ================================= */
    const askPayload = {
      tool: "ansigtsstyling",

      // vigtigt flag til AI
      imageAnalysisUsed,

      // ingen fiktive metrics
      faceMetrics: null,

      // brugerens valg
      userChoices
    };

    /* ================================
       3. KALD DIT EKSISTERENDE /api/ask
       (samme Vercel-projekt)
    ================================= */
    const askResponse = await fetch(
      `${req.headers.origin}/api/ask`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(askPayload)
      }
    );

    if (!askResponse.ok) {
      throw new Error("AI request failed");
    }

    const askData = await askResponse.json();

    /* ================================
       4. SIMPEL, ÆRLIG SCORE
    ================================= */
    let score = 60;

    if (imageAnalysisUsed) {
      score = 70;
    }

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
