
const API_URL = "http://localhost:3000/api/analyze";

const termsInput = document.getElementById("terms");
const analyzeButton = document.getElementById("analyze");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const readPageButton = document.getElementById("extract");
// Read text from the active tab after the user clicks the button.
readPageButton?.addEventListener("click", async () => {
  readPageButton.disabled = true;
  statusEl.textContent = "Reading the current page...";

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) {
      throw new Error("No active browser tab found.");
    }

    // Some browser pages do not allow content-script injection.
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.body?.innerText || "",
    });

    const text = (result || "").trim();

    if (text.length < 100) {
      throw new Error(
        "Not enough readable text on this page. Try pasting the terms manually."
      );
    }

    termsInput.value = text.slice(0, 30000);
    statusEl.textContent =
      `Page text loaded (${Math.min(text.length, 30000)} characters). Click Analyze terms.`;
  } catch (error) {
    statusEl.textContent =
      `${error.message || "Could not read this page."} Try a normal webpage or paste the terms manually.`;
  } finally {
    readPageButton.disabled = false;
  }
});

analyzeButton.addEventListener("click", async () => {
  const text = termsInput.value.trim();

  if (text.length < 100) {
    statusEl.textContent = "Paste or read at least 100 characters of terms.";
    return;
  }

  analyzeButton.disabled = true;
  statusEl.textContent = "Gemma is analyzing the terms...";
  resultsEl.replaceChildren();
  resultsEl.hidden = false;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 30000) }),
    });

    const data = await response.json();
    console.log("CheckMyTOC API response:", data);

    if (!response.ok) {
      throw new Error(data.error || "Analysis failed.");
    }

    const heading = document.createElement("h3");
    heading.textContent =
      `Risk: ${data.overallScore}/100 — ${data.riskLevel}`;
    resultsEl.appendChild(heading);

    const summary = document.createElement("p");
    summary.textContent = data.summary || "";
    resultsEl.appendChild(summary);

    for (const finding of data.findings || []) {
      const card = document.createElement("section");

      const title = document.createElement("h4");
      title.textContent = `${finding.severity}: ${finding.title}`;

      const explanation = document.createElement("p");
      explanation.textContent = finding.explanation || "";

      const evidence = document.createElement("blockquote");
      evidence.textContent =
        `Evidence: "${finding.evidence || "Not provided"}"`;

      const impact = document.createElement("p");
      impact.textContent =
        `Potential impact: ${finding.potentialImpact || "Not specified."}`;

      const recommendation = document.createElement("p");
      recommendation.textContent =
        `Next step: ${finding.recommendation || "Review this clause."}`;

      card.append(title, explanation, evidence, impact, recommendation);
      resultsEl.appendChild(card);
    }

    if (data.agreementChecklist?.length) {
      const checklistTitle = document.createElement("h3");
      checklistTitle.textContent = "Before you agree";
      resultsEl.appendChild(checklistTitle);

      for (const item of data.agreementChecklist) {
        const p = document.createElement("p");
        p.textContent = `☐ ${item}`;
        resultsEl.appendChild(p);
      }
    }

    const disclaimer = document.createElement("p");
    disclaimer.textContent =
      data.disclaimer || "Informational screening only; not legal advice.";
    resultsEl.appendChild(disclaimer);

   statusEl.textContent = `Analysis complete! ${data.findings?.length || 0} findings detected.`;
resultsEl.hidden = false;
  } catch (error) {
    statusEl.textContent =
      `${error.message} Ensure the backend is running on localhost:3000.`;
  } finally {
    analyzeButton.disabled = false;
  }
});
