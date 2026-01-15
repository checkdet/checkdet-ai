export default async function handler(req, res) {
  // CORS – nødvendigt for one.com
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { image, consent, userChoices } = req.body || {};

    const imageAnalysisUsed = Boolean(image && consent === true);

    /* ================================
       BYG EN KLAR PROMPT (STRING)
       Matcher /api/ask 1:1
    ================================= */
    const question = `
Du er en professionel ansigtsstylist.

Billedstatus:
- Billede uploadet: ${image ? "ja" : "nej"}
- Samtykke givet: ${consent ? "ja" : "nej"}
- Billedet bruges aktivt: ${imageAnalysisUsed ? "ja" : "nej"}

Brugerens valg:
${JSON.stringify(userChoices, null, 2)}

Opgave:
Giv rådgivende, ikke-dømmende forslag til ansigtsstyling.

Strukturér svaret i disse 7 afsnit:
1. Kort vurdering
2. Overordnet indtryk
3. Formål og alder
4. Konkrete stylingforslag
5. Fokusområder
6. Hvad der bør undgås
7. Alternativ tilgang

Skriv på dansk i professionel, rolig tone.
    `.trim();

    /* ================================
       KALD /api/ask KORREKT
    ================================= */
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `http://${req.headers.host}`;

    const askResponse = await fetch(`${baseUrl}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });

    const askData = await askResponse.json();

    if (!askResponse.ok) {
      return res.status(500).json({
        error: "ask_failed",
        details: askData
      });
    }

    /* ================================
       SIMPEL SCORE
    ================================= */
    const score = imageAnalysisUsed ? 70 : 60;

    return res.status(200).json({
      imageAnalysisUsed,
      score,
      answer: askData.answer
    });

  } catch (err) {
    return res.status(500).json({
      error: "ansigtsstyling_failed",
      details: err.message
    });
  }
}
