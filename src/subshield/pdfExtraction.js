import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { makeId } from "./utils.js";

if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
}

const OCR_SCALE = 2.2;

const DOCUMENT_TYPE_RULES = [
  {
    id: "certificate",
    label: "Certificate",
    terms: [
      "certificate of liability insurance",
      "certificate holder",
      "producer",
      "acord",
    ],
  },
  {
    id: "declaration",
    label: "Declarations",
    terms: [
      "declarations",
      "declaration page",
      "policy declarations",
      "named insured",
      "policy period",
    ],
  },
  {
    id: "endorsement",
    label: "Endorsement",
    terms: [
      "endorsement",
      "additional insured",
      "waiver of subrogation",
      "schedule of forms",
    ],
  },
  {
    id: "quote",
    label: "Quote",
    terms: ["quote", "proposal", "estimated premium", "bindable", "quotation"],
  },
  {
    id: "invoice",
    label: "Invoice",
    terms: ["invoice", "amount due", "balance due", "payment due", "bill to"],
  },
  {
    id: "policy",
    label: "Policy",
    terms: ["policy", "coverage", "insured", "premium"],
  },
];

const DIRECT_FIELD_KEYS = new Set([
  "carrier",
  "policyNumber",
  "insuredName",
  "certificateHolder",
  "effectiveDate",
  "expirationDate",
  "premium",
  "deductible",
  "coverageLimit",
  "invoiceNumber",
]);

function normalizeSpaces(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizeTextBlock(value = "") {
  return String(value)
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function unique(values = [], limit = 20) {
  const seen = new Set();
  const out = [];
  values.forEach((value) => {
    const normalized = normalizeSpaces(value);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(normalized);
  });
  return out.slice(0, limit);
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) return normalizeSpaces(match[1]);
  }
  return "";
}

function cleanFieldValue(value = "") {
  return normalizeSpaces(value)
    .replace(/\s+(policy|certificate|invoice)\s*$/i, "")
    .replace(/[.,;:\s]+$/g, "")
    .trim();
}

function parsePdfDate(value) {
  if (!value) return "";
  const raw = String(value);
  const match = /^D:(\d{4})(\d{2})?(\d{2})?/.exec(raw);
  if (!match) return raw;
  const year = match[1];
  const month = match[2] || "01";
  const day = match[3] || "01";
  return `${year}-${month}-${day}`;
}

function extractLines(textContent) {
  const rows = [];
  textContent.items
    .filter((item) => typeof item.str === "string" && item.str.trim())
    .forEach((item) => {
      const transform = item.transform || [];
      const x = Number(transform[4] || 0);
      const y = Number(transform[5] || 0);
      const existing = rows.find((row) => Math.abs(row.y - y) < 3);

      if (existing) {
        existing.items.push({ x, text: item.str });
        existing.y = (existing.y + y) / 2;
      } else {
        rows.push({ y, items: [{ x, text: item.str }] });
      }
    });

  return rows
    .sort((a, b) => b.y - a.y)
    .map((row) =>
      row.items
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text)
        .join(" ")
        .replace(/\s+([,.:;)])/g, "$1")
        .replace(/([(])\s+/g, "$1")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);
}

function linesFromPlainText(text = "") {
  return normalizeTextBlock(text)
    .split(/\n+/g)
    .map((line) => normalizeSpaces(line))
    .filter(Boolean);
}

function detectDocumentType(text) {
  const lower = text.toLowerCase();
  const scored = DOCUMENT_TYPE_RULES.map((rule) => {
    const score = rule.terms.reduce(
      (sum, term) => sum + (lower.includes(term) ? 1 : 0),
      0
    );
    return { ...rule, score };
  }).sort((a, b) => b.score - a.score);

  const top = scored[0];
  const totalTerms = top?.terms.length || 1;
  return {
    id: top?.score ? top.id : "policy",
    label: top?.score ? top.label : "Policy",
    confidence: Math.min(100, Math.round(((top?.score || 1) / totalTerms) * 100)),
  };
}

function extractKnownFields(text) {
  const datePattern =
    /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b/gi;
  const moneyPattern = /\$\s?\d[\d,]*(?:\.\d{2})?/g;

  const fields = {
    carrier: cleanFieldValue(
      firstMatch(text, [
        /\bcarrier\s*[:#-]?\s*([^\n]{3,90})/i,
        /\binsurer\s*[:#-]?\s*([^\n]{3,90})/i,
        /\binsurance company\s*[:#-]?\s*([^\n]{3,90})/i,
        /\bcompany affording coverage\s*[:#-]?\s*([^\n]{3,90})/i,
      ])
    ),
    policyNumber: cleanFieldValue(
      firstMatch(text, [
        /\bpolicy\s*(?:number|no\.?|#)\s*[:#-]?\s*([A-Z0-9][A-Z0-9 ./-]{3,40})/i,
        /\bpol(?:icy)?\s*#\s*([A-Z0-9][A-Z0-9 ./-]{3,40})/i,
        /\bcertificate\s*(?:number|no\.?|#)\s*[:#-]?\s*([A-Z0-9][A-Z0-9 ./-]{3,40})/i,
      ])
    ),
    insuredName: cleanFieldValue(
      firstMatch(text, [
        /\bnamed insured\s*[:#-]?\s*([^\n]{3,110})/i,
        /\binsured name\s*[:#-]?\s*([^\n]{3,110})/i,
        /\binsured\s*[:#-]?\s*([^\n]{3,110})/i,
        /\bapplicant\s*[:#-]?\s*([^\n]{3,110})/i,
      ])
    ),
    certificateHolder: cleanFieldValue(
      firstMatch(text, [
        /\bcertificate holder\s*[:#-]?\s*([^\n]{3,130})/i,
        /\bholder\s*[:#-]?\s*([^\n]{3,130})/i,
      ])
    ),
    effectiveDate: firstMatch(text, [
      /\beffective date\s*[:#-]?\s*([^\n]{6,35})/i,
      /\bpolicy period\s*(?:from)?\s*[:#-]?\s*([^\n]{6,35})/i,
      /\bfrom\s*[:#-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
    ]),
    expirationDate: firstMatch(text, [
      /\bexpiration date\s*[:#-]?\s*([^\n]{6,35})/i,
      /\bexpires\s*[:#-]?\s*([^\n]{6,35})/i,
      /\bto\s*[:#-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
    ]),
    premium: firstMatch(text, [
      /\btotal(?: annual)? premium\s*[:#-]?\s*(\$?\s?\d[\d,]*(?:\.\d{2})?)/i,
      /\bpremium\s*[:#-]?\s*(\$?\s?\d[\d,]*(?:\.\d{2})?)/i,
      /\bamount due\s*[:#-]?\s*(\$?\s?\d[\d,]*(?:\.\d{2})?)/i,
    ]),
    deductible: firstMatch(text, [
      /\bdeductible\s*[:#-]?\s*(\$?\s?\d[\d,]*(?:\.\d{2})?|none|n\/a)/i,
    ]),
    coverageLimit: cleanFieldValue(
      firstMatch(text, [
        /\beach occurrence\s*[:#-]?\s*([^\n]{3,90})/i,
        /\bgeneral aggregate\s*[:#-]?\s*([^\n]{3,90})/i,
        /\blimit(?:s| of insurance)?\s*[:#-]?\s*([^\n]{3,110})/i,
      ])
    ),
    invoiceNumber: cleanFieldValue(
      firstMatch(text, [
        /\binvoice\s*(?:number|no\.?|#)\s*[:#-]?\s*([A-Z0-9][A-Z0-9 ./-]{2,40})/i,
        /\binv\s*#\s*([A-Z0-9][A-Z0-9 ./-]{2,40})/i,
      ])
    ),
    emails: unique(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [], 12),
    phones: unique(
      text.match(/\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g) ||
        [],
      12
    ),
    moneyAmounts: unique(text.match(moneyPattern) || [], 20),
    dates: unique(text.match(datePattern) || [], 20),
    addresses: unique(
      text.match(/\b\d{1,6}\s+[A-Za-z0-9 .#'-]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/g) ||
        [],
      10
    ),
  };

  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) =>
      Array.isArray(value) ? value.length > 0 : Boolean(value)
    )
  );
}

function confidenceForFields(fields, source) {
  const directBase = source === "ocr" ? 68 : 86;
  const arrayBase = source === "ocr" ? 58 : 72;
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => {
      if (Array.isArray(value)) return [key, arrayBase];
      if (DIRECT_FIELD_KEYS.has(key)) return [key, directBase];
      return [key, Math.max(55, directBase - 10)];
    })
  );
}

function extractTables(pages) {
  const tables = [];

  pages.forEach((page) => {
    const tableRows = page.lines
      .map((line) => {
        const cells = line
          .split(/\s{2,}|\t|\|/g)
          .map((cell) => normalizeSpaces(cell))
          .filter(Boolean);
        return cells.length >= 2 ? cells : null;
      })
      .filter(Boolean);

    if (tableRows.length >= 2) {
      tables.push({
        pageNumber: page.pageNumber,
        rows: tableRows.slice(0, 80),
      });
    }
  });

  return tables;
}

function normalizeMetadata(raw = {}) {
  return Object.fromEntries(
    Object.entries({
      title: raw.Title,
      author: raw.Author,
      subject: raw.Subject,
      creator: raw.Creator,
      producer: raw.Producer,
      creationDate: parsePdfDate(raw.CreationDate),
      modificationDate: parsePdfDate(raw.ModDate),
    }).filter(([, value]) => Boolean(value))
  );
}

async function loadPdf(file) {
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  const metadataResult = await pdf.getMetadata().catch(() => ({}));
  return {
    pdf,
    metadata: normalizeMetadata(metadataResult.info || {}),
  };
}

function buildResult({ file, pdf, metadata, pages, source, extractedAt }) {
  const text = normalizeTextBlock(pages.map((page) => page.text).join("\n\n"));
  const type = detectDocumentType(text || file.name);
  const fields = extractKnownFields(text);
  const tables = extractTables(pages);
  const warnings = [];
  const hasText = text.length >= 30;

  if (!hasText && source === "embedded") {
    warnings.push(
      "No embedded text was found. This PDF may be image-only and needs OCR."
    );
  }

  if (!hasText && source === "ocr") {
    warnings.push("OCR finished, but no readable text was detected.");
  }

  if (hasText && source === "ocr") {
    warnings.push("OCR text was generated from page images. Review before saving.");
  }

  return {
    id: makeId("pdf"),
    fileName: file.name,
    fileSize: file.size,
    pages: pdf.numPages,
    characters: text.length,
    words: text ? text.split(/\s+/).filter(Boolean).length : 0,
    status: hasText ? (source === "ocr" ? "ocr_extracted" : "extracted") : "needs_ocr",
    source,
    docType: type.id,
    docTypeLabel: type.label,
    confidence: type.confidence,
    fields,
    fieldConfidence: confidenceForFields(fields, source),
    tables,
    metadata,
    text,
    pageText: pages.map(({ pageNumber, lineCount, text: pageText }) => ({
      pageNumber,
      lineCount,
      text: pageText,
    })),
    warnings,
    extractedAt,
  };
}

export async function extractPdfFile(file) {
  const extractedAt = new Date().toISOString();
  const { pdf, metadata } = await loadPdf(file);
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines = extractLines(content);
    pages.push({
      pageNumber,
      lineCount: lines.length,
      text: lines.join("\n"),
      lines,
    });
  }

  return buildResult({
    file,
    pdf,
    metadata,
    pages,
    source: "embedded",
    extractedAt,
  });
}

async function renderPageToCanvas(page) {
  if (typeof document === "undefined") {
    throw new Error("OCR rendering is available in the browser only.");
  }

  const viewport = page.getViewport({ scale: OCR_SCALE });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: false });
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  return canvas;
}

export async function ocrPdfFile(file, onProgress = () => {}) {
  const extractedAt = new Date().toISOString();
  const { pdf, metadata } = await loadPdf(file);
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (message) =>
      onProgress({
        phase: "recognizing",
        status: message.status || "recognizing",
        progress: Number(message.progress || 0),
      }),
  });
  const pages = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      onProgress({
        phase: "rendering",
        status: "rendering page",
        pageNumber,
        totalPages: pdf.numPages,
        progress: (pageNumber - 1) / pdf.numPages,
      });

      const page = await pdf.getPage(pageNumber);
      const canvas = await renderPageToCanvas(page);

      onProgress({
        phase: "recognizing",
        status: "reading page",
        pageNumber,
        totalPages: pdf.numPages,
        progress: (pageNumber - 1) / pdf.numPages,
      });

      const { data } = await worker.recognize(canvas);
      canvas.width = 0;
      canvas.height = 0;

      const text = normalizeTextBlock(data?.text || "");
      const lines = linesFromPlainText(text);
      pages.push({
        pageNumber,
        lineCount: lines.length,
        text,
        lines,
      });
    }
  } finally {
    await worker.terminate();
  }

  return buildResult({
    file,
    pdf,
    metadata,
    pages,
    source: "ocr",
    extractedAt,
  });
}

export function makeFailedExtraction(file, error) {
  return {
    id: makeId("pdf"),
    fileName: file?.name || "Unknown PDF",
    fileSize: file?.size || 0,
    pages: 0,
    characters: 0,
    words: 0,
    status: "failed",
    source: "embedded",
    docType: "policy",
    docTypeLabel: "Policy",
    confidence: 0,
    fields: {},
    fieldConfidence: {},
    tables: [],
    metadata: {},
    text: "",
    pageText: [],
    warnings: [error?.message || "The PDF could not be extracted."],
    extractedAt: new Date().toISOString(),
  };
}
