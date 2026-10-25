
require("dotenv").config({
  path: require("node:path").join(__dirname, ".env"),
});

const express = require("express");
const { analyzeTerms } = require("./analyze");
const { calculateRiskScore } = require("./riskScore");

const app = express();

app.use(express.json({ limit: "200kb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "CheckMyTOC API" });
});

app.post("/api/analyze", async (req, res) => {
  try {
    const { text, url = "" } = req.body || {};

    if (typeof text !== "string" || text.trim().length < 100) {
      return res.status(400).json({
        error: "Provide at least 100 characters of terms text.",
      });
    }

    if (text.length > 30000) {
      return res.status(413).json({
        error: "Terms are too long. Maximum is 30,000 characters.",
      });
    }

    const analysis = await analyzeTerms(text.trim());
    const risk = calculateRiskScore(analysis.findings);

    res.json({
      url: typeof url === "string" ? url.slice(0, 2000) : "",
      summary: analysis.summary || "Analysis completed.",
      findings: analysis.findings,
      agreementChecklist: analysis.agreementChecklist,
      ...risk,
      model: "gemma-4-26b-a4b-it",
    });
  } catch (error) {
    console.error("Analysis failed:", error.message);

    res.status(500).json({
      error: "Analysis failed. Check API configuration and server logs.",
    });
  }
});

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`CheckMyTOC API running at http://localhost:${port}`);
});
