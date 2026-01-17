export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://www.checkdet.dk");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  return res.status(200).json({
    ok: true,
    message: "Ansigtsstyling endpoint virker"
  });
}
