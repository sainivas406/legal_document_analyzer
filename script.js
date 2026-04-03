let fileContent = "";
let extractedClauses = [];
let extractedEntities = [];

async function analyzeDocument() {
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];

  if (!file) {
    alert("Please upload a legal document first.");
    return;
  }

  const fileName = file.name.toLowerCase();

  try {
    if (
      fileName.endsWith(".txt") ||
      fileName.endsWith(".md") ||
      fileName.endsWith(".json")
    ) {
      const text = await readTextFile(file);
      fileContent = text;
      processText(fileContent);
    } 
    else if (fileName.endsWith(".html") || fileName.endsWith(".htm")) {
      const htmlText = await readTextFile(file);
      fileContent = extractTextFromHTML(htmlText);
      processText(fileContent);
    } 
    else if (fileName.endsWith(".pdf")) {
      const pdfText = await readPDFFile(file);
      fileContent = pdfText;
      processText(fileContent);
    } 
    else if (fileName.endsWith(".docx")) {
      const docxText = await readDOCXFile(file);
      fileContent = docxText;
      processText(fileContent);
    } 
    else {
      alert("Unsupported file type. Please upload TXT, PDF, DOCX, HTML, MD, or JSON.");
    }
  } catch (error) {
    console.error("File processing error:", error);
    alert("Could not analyze this file.");
  }
}

function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function extractTextFromHTML(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  return doc.body ? doc.body.innerText : htmlString;
}

function readPDFFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async function (e) {
      try {
        const typedArray = new Uint8Array(e.target.result);
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
        let fullText = "";

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(" ");
          fullText += pageText + "\n";
        }

        resolve(fullText);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function readDOCXFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async function (e) {
      try {
        const arrayBuffer = e.target.result;
        const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
        resolve(result.value);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function processText(text) {
  const cleanText = (text || "").replace(/\s+/g, " ").trim();

  document.getElementById("documentText").textContent =
    cleanText || "No readable text found.";

  extractClauses(cleanText);
  extractEntities(cleanText);
  generateSummary(cleanText);
}

function extractClauses(text) {
  const clausesList = document.getElementById("clausesList");
  clausesList.innerHTML = "";
  extractedClauses = [];

  const added = new Set();

  // 1. Extract numbered clauses like Clause 1, Clause 2, etc.
  const clauseRegex = /(Clause\s*\d+\s*:\s*[\s\S]*?)(?=Clause\s*\d+\s*:|$)/gi;
  let match;

  while ((match = clauseRegex.exec(text)) !== null) {
    const clauseText = match[0].trim();
    if (!added.has(clauseText)) {
      addClauseBox("Clause", clauseText);
      extractedClauses.push(`Clause: ${clauseText}`);
      added.add(clauseText);
    }
  }

  // 2. Extract categorized legal clauses from long text
  const sentenceCandidates = text
    .split(/(?<=[.?!])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 20);

  sentenceCandidates.forEach(sentence => {
    const lower = sentence.toLowerCase();
    let category = "";

    if (lower.includes("issue for consideration")) {
      category = "Issue";
    } else if (
      lower.includes("argued") ||
      lower.includes("submitted") ||
      lower.includes("contended")
    ) {
      category = "Argument";
    } else if (
      lower.includes("observed") ||
      lower.includes("the court observed")
    ) {
      category = "Observation";
    } else if (
      lower.includes("held that") ||
      lower.includes("court held") ||
      lower.includes("the court finds")
    ) {
      category = "Finding";
    } else if (
      lower.includes("petition is allowed") ||
      lower.includes("petition is dismissed") ||
      lower.includes("appeal is allowed") ||
      lower.includes("appeal is dismissed") ||
      lower.includes("set aside") ||
      lower.includes("quashed") ||
      lower.includes("decreed") ||
      lower.includes("it is ordered")
    ) {
      category = "Decision";
    } else if (
      lower.includes("relief") ||
      lower.includes("directed to") ||
      lower.includes("reinstated") ||
      lower.includes("compensation") ||
      lower.includes("back wages")
    ) {
      category = "Relief";
    }

    if (category && !added.has(sentence)) {
      addClauseBox(category, sentence);
      extractedClauses.push(`${category}: ${sentence}`);
      added.add(sentence);
    }
  });

  if (extractedClauses.length === 0) {
    clausesList.innerHTML = `<div class="empty-box">No clauses found.</div>`;
  }
}

function addClauseBox(category, text) {
  const clausesList = document.getElementById("clausesList");
  const div = document.createElement("div");
  div.className = "box-item";
  div.innerHTML = `<strong>${category}:</strong> ${text}`;
  clausesList.appendChild(div);
}

function extractEntities(text) {
  const entitiesList = document.getElementById("entitiesList");
  entitiesList.innerHTML = "";
  extractedEntities = [];

  const entityPatterns = [
    {
      label: "Court",
      regex: /(Supreme Court of India|High Court of [A-Za-z\s]+|District Court of [A-Za-z\s]+|Civil Court of [A-Za-z\s]+|Labour Court of [A-Za-z\s]+|Sessions Court of [A-Za-z\s]+)/i
    },
    {
      label: "Case Number",
      regex: /(Case No\.?\s*[A-Za-z0-9\/.-]+|Writ Petition No\.?\s*[A-Za-z0-9\/.-]+|Civil Suit No\.?\s*[A-Za-z0-9\/.-]+|Special Leave Petition No\.?\s*[A-Za-z0-9\/.-]+|Labour Dispute Case No\.?\s*[A-Za-z0-9\/.-]+|Criminal Appeal No\.?\s*[A-Za-z0-9\/.-]+)/i
    },
    {
      label: "Judge",
      regex: /(Justice\s+[A-Z][a-zA-Z.\s]+|Hon'?ble\s+Justice\s+[A-Z][a-zA-Z.\s]+)/i
    },
    {
      label: "Date",
      regex: /\b(\d{2}\/\d{2}\/\d{4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})\b/i
    },
    {
      label: "Section",
      regex: /(Section\s+\d+\s*[A-Z]*\s*(?:IPC|CrPC|CPC|IPC,|of [A-Za-z\s]+)?)/i
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

  const added = new Set();

  entityPatterns.forEach(entity => {
    const match = text.match(entity.regex);
    if (match) {
      const value = (match[1] ? match[1] : match[0]).trim();
      const key = `${entity.label}:${value}`;

      if (!added.has(key)) {
        addEntityBox(entity.label, value);
        extractedEntities.push({ label: entity.label, value: value });
        added.add(key);
      }
    }
  });

  if (extractedEntities.length === 0) {
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
    .split(/(?<=[.?!])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 30);

  const important = sentences.filter(s => {
    const lower = s.toLowerCase();
    return (
      lower.includes("petition") ||
      lower.includes("appeal") ||
      lower.includes("court held") ||
      lower.includes("issue for consideration") ||
      lower.includes("judgment") ||
      lower.includes("relief") ||
      lower.includes("set aside") ||
      lower.includes("quashed")
    );
  });

  const chosen =
    important.length >= 4 ? important.slice(0, 4) : sentences.slice(0, 4);

  summaryBox.textContent = chosen.join(" ") || "No summary available.";
}