
const assert = require("node:assert/strict");
const { calculateRiskScore } = require("./riskScore");

const tests = [
  {
    name: "No findings",
    findings: [],
    expectedScore: 0,
    expectedLevel: "Low",
  },
  {
    name: "One medium finding",
    findings: [{ title: "Data sharing", severity: "Medium" }],
    expectedScore: 10,
    expectedLevel: "Low",
  },
  {
    name: "High and medium findings",
    findings: [
      { title: "Auto renewal", severity: "High" },
      { title: "Data sharing", severity: "Medium" },
    ],
    expectedScore: 28,
    expectedLevel: "Moderate",
  },
  {
    name: "Score capped at 100",
    findings: Array.from({ length: 5 }, (_, i) => ({
      title: `Critical finding ${i}`,
      severity: "Critical",
    })),
    expectedScore: 100,
    expectedLevel: "Critical",
  },
];

for (const test of tests) {
  const result = calculateRiskScore(test.findings);

  assert.equal(result.overallScore, test.expectedScore, test.name);
  assert.equal(result.riskLevel, test.expectedLevel, test.name);

  console.log(`PASS: ${test.name}`);
}

console.log("\nAll risk engine tests passed!");
