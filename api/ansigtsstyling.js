} catch (err) {
  console.error("🔥 AWS FEJL:", err);

  return res.status(500).json({
    error: "ansigtsstyling_failed",
    aws: {
      name: err.name,
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      region: process.env.AWS_REGION
    }
  });
}
