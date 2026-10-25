const API_URL = "http://localhost:3000/api/analyze";
const $ = (id) => document.getElementById(id);
const termsInput = $("terms");
const extractButton = $("extract");
const analyzeButton = $("analyze");
const statusEl = $("status");
const resultsEl = $("results");
const notesEl = $("notes");
const notesTab = $("notesTab");
const checklistSection = $("checklistSection");
let currentFindings = [];
let activeTab = "findings";

const riskClass = (value = "low") => String(value).toLowerCase().replace(/[^a-z]/g, "");
const escapeText = (value) => String(value ?? "");

extractButton.addEventListener("click", async () => {
  extractButton.disabled = true;
  statusEl.textContent = "Reading visible text from this tab…";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab was found.");
    const injected = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({ text: document.body?.innerText || "", title: document.title || location.hostname, url: location.href })
    });
    const page = injected?.[0]?.result;
    const text = String(page?.text || "").trim();
    if (text.length < 100) throw new Error("Not enough readable text. Try pasting the terms manually.");
    termsInput.value = text.slice(0, 30000);
    $("siteName").textContent = page.title || page.url || "Current page";
    statusEl.textContent = `Loaded ${Math.min(text.length, 30000).toLocaleString()} characters. Click Analyze terms.`;
  } catch (error) {
    statusEl.textContent = `${error.message || "Could not read this page."} Use a normal webpage or paste the terms.`;
  } finally {
    extractButton.disabled = false;
  }
});

analyzeButton.addEventListener("click", async () => {
  const text = termsInput.value.trim();
  if (text.length < 100) {
    statusEl.textContent = "Read a page or enter at least 100 characters of terms.";
    return;
  }
  analyzeButton.disabled = true;
  extractButton.disabled = true;
  analyzeButton.textContent = "Analyzing…";
  statusEl.textContent = "Gemma is reviewing the terms…";
  resultsEl.innerHTML = `<div class="empty-state"><div class="empty-icon">✳</div><strong>Review in progress</strong><p>Checking clauses and supporting evidence.</p></div>`;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 30000), url: tab?.url || "" })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Backend returned ${response.status}`);
    currentFindings = Array.isArray(data.findings) ? data.findings : [];
    renderAnalysis(data);
    statusEl.textContent = `Analysis complete! ${currentFindings.length} evidence-backed finding(s).`;
  } catch (error) {
    resultsEl.innerHTML = `<div class="empty-state"><strong>Analysis could not finish</strong><p>${escapeText(error.message)}. Confirm the backend is running at localhost:3000.</p></div>`;
    statusEl.textContent = "Analysis failed. Check the backend terminal for details.";
  } finally {
    analyzeButton.disabled = false;
    extractButton.disabled = false;
    analyzeButton.innerHTML = 'Analyze terms <span>↗</span>';
  }
});

function renderAnalysis(data) {
  $("score").textContent = Number.isFinite(Number(data.overallScore)) ? String(data.overallScore) : "—";
  const score = Math.max(0, Math.min(100, Number(data.overallScore) || 0));
  $("ringValue").style.strokeDashoffset = String(301.59 * (1 - score / 100));
  const level = String(data.riskLevel || "Unknown");
  $("riskLevel").textContent = level;
  $("summaryMini").textContent = data.summary || "Analysis completed. Review the findings below.";
  $("findingCount").textContent = `${currentFindings.length} clause${currentFindings.length === 1 ? "" : "s"} flagged`;
  $("countBadge").textContent = String(currentFindings.length);
  $("siteStatus").textContent = "ANALYSIS READY";
  $("siteName").textContent = "Terms review complete";
  renderFindings(currentFindings);
  renderChecklist(data.agreementChecklist || []);
  notesEl.hidden = true;
  resultsEl.hidden = false;
  notesTab.textContent = "Quick notes";
}

function renderFindings(findings) {
  resultsEl.replaceChildren();
  if (!findings.length) {
    resultsEl.innerHTML = `<div class="empty-state"><div class="empty-icon">✓</div><strong>No supported findings returned</strong><p>This does not guarantee the terms are safe. Review the source text carefully.</p></div>`;
    return;
  }
  for (const finding of findings) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "finding-card";
    const top = document.createElement("div"); top.className = "finding-top";
    const category = document.createElement("span"); category.className = "category"; category.textContent = finding.category || "Terms clause";
    const severity = document.createElement("span"); severity.className = `severity ${riskClass(finding.severity)}`; severity.textContent = finding.severity || "Unrated";
    top.append(category, severity);
    const title = document.createElement("h3"); title.textContent = finding.title || "Potential issue";
    const explanation = document.createElement("p"); explanation.textContent = finding.explanation || "Review this clause carefully.";
    const bottom = document.createElement("div"); bottom.className = "finding-bottom";
    const clause = document.createElement("span"); clause.textContent = finding.evidence ? "EVIDENCE AVAILABLE" : "NO QUOTE PROVIDED";
    const inspect = document.createElement("span"); inspect.textContent = "Inspect →";
    bottom.append(clause, inspect);
    card.append(top, title, explanation, bottom);
    card.addEventListener("click", () => showDetail(finding));
    resultsEl.append(card);
  }
}

function renderChecklist(items) {
  const target = $("checklist"); target.replaceChildren();
  checklistSection.hidden = !Array.isArray(items) || items.length === 0;
  for (const item of items) {
    const label = document.createElement("label"); label.className = "check-item";
    const input = document.createElement("input"); input.type = "checkbox";
    const text = document.createElement("span"); text.textContent = String(item);
    label.append(input, text); target.append(label);
  }
}

function showDetail(f) {
  $("detailSeverity").className = `severity ${riskClass(f.severity)}`;
  $("detailSeverity").textContent = f.severity || "Unrated";
  const body = $("detailBody"); body.replaceChildren();
  const category = document.createElement("div"); category.className = "eyebrow"; category.textContent = f.category || "TERMS CLAUSE";
  const title = document.createElement("h2"); title.textContent = f.title || "Potential issue";
  const explanation = document.createElement("p"); explanation.textContent = f.explanation || "No explanation provided.";
  const clause = document.createElement("section"); clause.className = "detail-clause";
  const clauseLabel = document.createElement("div"); clauseLabel.className = "eyebrow"; clauseLabel.textContent = "ORIGINAL CLAUSE · EVIDENCE";
  const quote = document.createElement("blockquote"); quote.textContent = f.evidence ? `“${f.evidence}”` : "No exact evidence quote was returned.";
  clause.append(clauseLabel, quote);
  const impact = document.createElement("section"); impact.className = "detail-impact";
  const impactLabel = document.createElement("div"); impactLabel.className = "eyebrow"; impactLabel.textContent = "POTENTIAL IMPACT";
  const impactText = document.createElement("p"); impactText.textContent = f.potentialImpact || "Impact not specified."; impact.append(impactLabel, impactText);
  const next = document.createElement("section"); next.className = "detail-next";
  const nextLabel = document.createElement("div"); nextLabel.className = "eyebrow"; nextLabel.textContent = "PRACTICAL NEXT STEP";
  const nextText = document.createElement("p"); nextText.textContent = f.recommendation || "Review the clause and the full agreement."; next.append(nextLabel, nextText);
  body.append(category, title, explanation, clause, impact, next);
  $("detailLayer").hidden = false;
}

$("backButton").addEventListener("click", () => { $("detailLayer").hidden = true; });
notesTab.addEventListener("click", () => {
  activeTab = activeTab === "findings" ? "notes" : "findings";
  notesEl.hidden = activeTab !== "notes";
  resultsEl.hidden = activeTab !== "findings";
  notesTab.textContent = activeTab === "notes" ? "View findings" : "Quick notes";
});
