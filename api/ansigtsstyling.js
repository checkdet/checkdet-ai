const faces = result.FaceDetails || [];

if (faces.length === 0) {
  return res.status(200).json({
    faceDetected: false,
    assessment: "IKKE_ANSIGT",
    reason: "Ingen ansigter fundet"
  });
}

const face = faces[0];

// 🔧 JUSTEREDE TÆRSKLER (selfie-kalibreret)
const confidenceOk = face.Confidence >= 75;

const box = face.BoundingBox || {};
const faceArea = (box.Width || 0) * (box.Height || 0);
const sizeOk = faceArea >= 0.04; // 4 %

const pose = face.Pose || {};
const poseOk =
  Math.abs(pose.Yaw || 0) <= 30 &&
  Math.abs(pose.Pitch || 0) <= 30;

const quality = face.Quality || {};
const qualityOk =
  (quality.Brightness || 0) >= 30 &&
  (quality.Sharpness || 0) >= 30;

const isValidFace =
  confidenceOk && sizeOk && poseOk && qualityOk;

if (!isValidFace) {
  return res.status(200).json({
    faceDetected: false,
    assessment: "IKKE_ANSIGT",
    reason: "Ansigt opfylder ikke krav til tydelig selfie"
  });
}

return res.status(200).json({
  faceDetected: true,
  assessment: "ANSIGT",
  reason: "Tydeligt menneskeligt ansigt (selfie)"
});
