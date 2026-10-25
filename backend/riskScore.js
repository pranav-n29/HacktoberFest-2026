
const SEVERITY_POINTS = {
  Low: 4,
  Medium: 10,
  High: 18,
  Critical: 25,
};

function calculateRiskScore(findings = []) {
  if (!Array.isArray(findings)) {
    throw new TypeError("findings must be an array");
  }

  // Avoid counting duplicate findings more than once.
  const uniqueFindings = [];
  const seen = new Set();

  for (const finding of findings) {
    if (!finding || typeof finding !== "object") continue;

    const severity = Object.keys(SEVERITY_POINTS).find(
      key => key.toLowerCase() === String(finding.severity || "").toLowerCase()
    );

    if (!severity) continue;

    const identity = [
      finding.category || "",
      finding.title || "",
      finding.evidence || "",
    ].join("|").toLowerCase();

    if (seen.has(identity)) continue;
    seen.add(identity);

    uniqueFindings.push({ ...finding, severity });
  }

  const rawScore = uniqueFindings.reduce(
    (total, finding) => total + SEVERITY_POINTS[finding.severity],
    0
  );

  const score = Math.min(100, rawScore);

  let riskLevel;
  if (score >= 70) riskLevel = "Critical";
  else if (score >= 45) riskLevel = "High";
  else if (score >= 20) riskLevel = "Moderate";
  else riskLevel = "Low";

  return {
    overallScore: score,
    riskLevel,
    findingsCount: uniqueFindings.length,
    scoreMethod: "Sum of severity weights, capped at 100",
    disclaimer:
      "This is an illustrative screening score, not a legal assessment. A low score does not guarantee safe terms.",
  };
}

module.exports = { calculateRiskScore };
