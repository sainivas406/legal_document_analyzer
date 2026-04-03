let fileContent = "";
let extractedClauses = [];
let extractedEntities = [];

function analyzeDocument() {
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];

  if (!file) {
    alert("Please upload a TXT file first.");
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    fileContent = e.target.result;
    document.getElementById("documentText").textContent = fileContent;

    extractClauses(fileContent);
    extractEntities(fileContent);
    generateSummary(fileContent);
  };

  reader.readAsText(file);
}

function extractClauses(text) {
  const clausesList = document.getElementById("clausesList");
  clausesList.innerHTML = "";
  extractedClauses = [];

  let found = false;

  // Numbered clauses
  const clauseRegex = /Clause\s*\d+\s*:\s*([\s\S]*?)(?=Clause\s*\d+\s*:|$)/gi;
  let match;

  while ((match = clauseRegex.exec(text)) !== null) {
    const clauseText = match[0].trim();
    addClauseBox(clauseText);
    extractedClauses.push(clauseText);
    found = true;
  }

  // Judgment-style clauses
  if (!found) {
    const lines = text.split(/\n|\./);

    const legalClauseKeywords = [
      "issue for consideration",
      "argued",
      "submitted",
      "contended",
      "observed",
      "held that",
      "petition is allowed",
      "petition is dismissed",
      "court held",
      "judgment",
      "dismissal",
      "violation",
      "lawful",
      "unlawful",
      "order",
      "decision",
      "relief",
      "set aside",
      "quashed",
      "decreed"
    ];

    lines.forEach(line => {
      const cleanedLine = line.trim();
      if (cleanedLine.length > 10) {
        for (const keyword of legalClauseKeywords) {
          if (cleanedLine.toLowerCase().includes(keyword)) {
            addClauseBox(cleanedLine);
            extractedClauses.push(cleanedLine);
            found = true;
            break;
          }
        }
      }
    });
  }

  if (!found) {
    clausesList.innerHTML = `<div class="empty-box">No clauses found.</div>`;
  }
}

function addClauseBox(text) {
  const clausesList = document.getElementById("clausesList");
  const div = document.createElement("div");
  div.className = "box-item";
  div.textContent = text;
  clausesList.appendChild(div);
}

function extractEntities(text) {
  const entitiesList = document.getElementById("entitiesList");
  entitiesList.innerHTML = "";
  extractedEntities = [];

  const entityPatterns = [
    {
      label: "Court",
      regex: /(Supreme Court of India|High Court of [A-Za-z\s]+|District Court of [A-Za-z\s]+|Civil Court of [A-Za-z\s]+|Labour Court of [A-Za-z\s]+)/i
    },
    {
      label: "Case Number",
      regex: /(Case No\.?\s*[A-Za-z0-9\/.-]+|Writ Petition No\.?\s*[A-Za-z0-9\/.-]+|Civil Suit No\.?\s*[A-Za-z0-9\/.-]+|Special Leave Petition No\.?\s*[A-Za-z0-9\/.-]+|Labour Dispute Case No\.?\s*[A-Za-z0-9\/.-]+)/i
    },
    {
      label: "Judge",
      regex: /(Justice\s+[A-Z][a-zA-Z.\s]+)/i
    },
    {
      label: "Date",
      regex: /\b(\d{2}\/\d{2}\/\d{4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})\b/i
    },
    {
      label: "Section",
      regex: /(Section\s+\d+\s*[A-Z]*)/i
    },
    {
      label: "Petitioner",
      regex: /Petitioner:\s*([A-Za-z0-9\s.&]+)$/im
    },
    {
      label: "Respondent",
      regex: /Respondent:\s*([A-Za-z0-9\s.&]+)$/im
    },
    {
      label: "Act",
      regex: /Act:\s*([A-Za-z0-9\s,().-]+)$/im
    }
  ];

  let found = false;

  entityPatterns.forEach(entity => {
    const match = text.match(entity.regex);
    if (match) {
      const value = match[1] ? match[1].trim() : match[0].trim();
      addEntityBox(entity.label, value);
      extractedEntities.push({ label: entity.label, value: value });
      found = true;
    }
  });

  if (!found) {
    entitiesList.innerHTML = `<div class="empty-box">No entities found.</div>`;
  }
}

function addEntityBox(label, value) {
  const entitiesList = document.getElementById("entitiesList");
  const div = document.createElement("div");
  div.className = "box-item entity";
  div.innerHTML = `<strong>${label}:</strong> ${value}`;
  entitiesList.appendChild(div);
}

function generateSummary(text) {
  const summaryBox = document.getElementById("summaryBox");

  const sentences = text
    .replace(/\n+/g, " ")
    .split(/(?<=[.?!])\s+/)
    .filter(s => s.trim().length > 0);

  const summary = sentences.slice(0, 4).join(" ");
  summaryBox.textContent = summary || "No summary available.";
}

function downloadResults() {
  if (!fileContent) {
    alert("Please analyze a document first.");
    return;
  }

  const result = {
    summary: document.getElementById("summaryBox").textContent,
    clauses: extractedClauses,
    entities: extractedEntities
  };

  const blob = new Blob([JSON.stringify(result, null, 2)], {
    type: "application/json"
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "legal_analysis_result.json";
  link.click();
}