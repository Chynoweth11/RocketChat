import { makeId } from "./utils.js";

// pdf.js is heavy (~hundreds of KB). Load it on demand the first time a PDF is
// actually processed, so simply opening the Documents tab doesn't pull it in.
let pdfjsPromise = null;
function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
      // Load the worker via a resolved URL (more reliable across dev/proxied
      // hosts than `new URL(..., import.meta.url)`, which can fail to fetch).
      const { default: workerUrl } = await import(
        "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"
      );
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
      return pdfjsLib;
    })();
  }
  return pdfjsPromise;
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

  // Drop scalar values that clearly came from certificate boilerplate
  // (disclaimer / cancellation / general wording) rather than a real field.
  const boilerplate =
    /authorized representative|notwithstanding|cancel|subrogation|additional insured|confers no rights|does not (constitute|affirmatively)|policy (eff|exp|period)|^limits$|in lieu of|certificate holder/i;
  const scalarKeys = new Set([
    "carrier",
    "policyNumber",
    "insuredName",
    "certificateHolder",
    "effectiveDate",
    "expirationDate",
    "coverageLimit",
  ]);

  return Object.fromEntries(
    Object.entries(fields).filter(([key, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      if (!value) return false;
      if (scalarKeys.has(key) && boilerplate.test(value)) return false;
      return true;
    })
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
  const pdfjsLib = await getPdfjs();
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

/* ---------- ACORD 25 (Certificate of Liability) structured parser ----------
 * ACORD certificates use a fixed multi-column layout, so a flat line read mixes
 * disclaimer/cancellation text into the wrong fields (the classic "Carrier =
 * AUTHORIZED REPRESENTATIVE" bug). This parser reads the positioned text items
 * (x/y) and pulls each value from its correct region/column, then extracts each
 * coverage line and its limits separately. */

const ACORD_DATE_RE = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
const ACORD_MONEY_RE = /\$\s?\d[\d,]*(?:\.\d{2})?/;
const ACORD_PHONE_RE = /\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/;

const ACORD_COVERAGE_TYPES = [
  { re: /commercial general liability/i, type: "Commercial General Liability" },
  { re: /automobile liability/i, type: "Automobile Liability" },
  { re: /umbrella liab|excess liab/i, type: "Umbrella / Excess Liability" },
  { re: /workers'?\s*compensation/i, type: "Workers' Compensation" },
  { re: /employment practices liability/i, type: "Employment Practices Liability" },
];

const ACORD_LIMIT_NAMES = [
  [/each occurrence/i, "Each Occurrence"],
  [/damage to rented/i, "Damage to Rented Premises"],
  [/med exp/i, "Medical Expense"],
  [/personal\s*&?\s*adv/i, "Personal & Advertising Injury"],
  [/products?\s*-?\s*comp/i, "Products / Completed Operations Aggregate"],
  [/general aggregate/i, "General Aggregate"],
  [/combined single limit/i, "Combined Single Limit"],
  [/bodily injury \(per person\)/i, "Bodily Injury (Per Person)"],
  [/bodily injury \(per accident\)/i, "Bodily Injury (Per Accident)"],
  [/property damage/i, "Property Damage"],
  [/e\.?l\.?\s*each accident/i, "E.L. Each Accident"],
  [/e\.?l\.?\s*disease.*employee/i, "E.L. Disease - Each Employee"],
  [/e\.?l\.?\s*disease.*policy/i, "E.L. Disease - Policy Limit"],
  [/each claim limit/i, "Each Claim Limit"],
  [/annual aggregate limit/i, "Annual Aggregate Limit"],
  [/aggregate/i, "Aggregate"],
];

function cleanAcordLimitName(raw = "") {
  const text = normalizeSpaces(raw);
  if (!text) return "Limit";
  const hit = ACORD_LIMIT_NAMES.find(([re]) => re.test(text));
  if (hit) return hit[1];
  return text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isAcordCertificate(text = "") {
  const t = text.toLowerCase();
  return (
    t.includes("certificate of liability insurance") ||
    (t.includes("acord 25") && t.includes("insurer"))
  );
}

export function parseAcordItems(rawItems = []) {
  const all = rawItems
    .map((i) => ({ x: Math.round(i.x), y: Math.round(i.y), text: normalizeSpaces(i.text) }))
    .filter((i) => i.text);
  if (!all.length) return null;

  const rowAt = (y, tol = 3) =>
    all.filter((i) => Math.abs(i.y - y) <= tol).sort((a, b) => a.x - b.x);

  const fields = {};
  const fieldConfidence = {};
  const set = (key, value, confidence = 92) => {
    const v = normalizeSpaces(value);
    if (v) {
      fields[key] = v;
      fieldConfidence[key] = confidence;
    }
  };

  // Certificate date - top-right date token
  const certDate = all
    .filter((i) => ACORD_DATE_RE.test(i.text) && i.x > 440)
    .sort((a, b) => b.y - a.y)[0];
  if (certDate) set("certificateDate", certDate.text);

  // Insurer A (carrier) + NAIC, read from the "INSURER A :" row
  const insurerA = all.find((i) => /^insurer a\b/i.test(i.text));
  if (insurerA) {
    const after = rowAt(insurerA.y).filter((i) => i.x > insurerA.x + 15);
    const naicItem = after.find((i) => /^\d{3,6}$/.test(i.text));
    const carrier = after
      .filter((i) => i !== naicItem && !/^\d{3,6}$/.test(i.text))
      .map((i) => i.text)
      .join(" ");
    set("carrier", carrier);
    if (naicItem) set("naic", naicItem.text);
  }

  // Producer block (left column under the PRODUCER label)
  const producerLabel = all.find((i) => i.text.toUpperCase() === "PRODUCER" && i.x < 120);
  if (producerLabel) {
    const block = all
      .filter((i) => i.x < 235 && i.y < producerLabel.y && i.y > producerLabel.y - 60)
      .sort((a, b) => b.y - a.y)
      .map((i) => i.text);
    if (block[0]) set("producer", block[0]);
    const address = block.slice(1).filter((l) => !/^\d{6,}$/.test(l)).join(", ");
    if (address) set("producerAddress", address, 80);
    const phone = all.find(
      (i) => ACORD_PHONE_RE.test(i.text) && i.x > 260 && i.x < 460 && i.y > producerLabel.y - 60
    );
    if (phone) set("producerPhone", (phone.text.match(ACORD_PHONE_RE) || [])[0]);
  }

  // Insured block (label is exactly "INSURED")
  const insuredLabel = all.find((i) => i.text.toUpperCase() === "INSURED" && i.x < 80);
  if (insuredLabel) {
    const block = all
      .filter((i) => i.x < 220 && i.y < insuredLabel.y && i.y > insuredLabel.y - 60)
      .sort((a, b) => b.y - a.y)
      .map((i) => i.text);
    if (block[0]) set("insuredName", block[0]);
    const addr = block.slice(1).join(", ");
    if (addr) set("insuredAddress", addr, 80);
  }

  // Certificate holder block (left column under the CERTIFICATE HOLDER label).
  // Match the standalone label cell only - "certificate holder" also appears in
  // the IMPORTANT disclaimer sentence near the top.
  const holderLabel = all.find((i) => /^certificate holder$/i.test(i.text) && i.x < 200);
  if (holderLabel) {
    const block = all
      .filter((i) => i.x < 300 && i.y < holderLabel.y && i.y > 95)
      .sort((a, b) => b.y - a.y)
      .map((i) => i.text);
    const firstAddr = block.findIndex((l) => /^\d/.test(l));
    const nameLines = firstAddr === -1 ? block.slice(0, 2) : block.slice(0, firstAddr);
    const addrLines = firstAddr === -1 ? [] : block.slice(firstAddr);
    if (nameLines.length) set("certificateHolder", nameLines.join(", "));
    if (addrLines.length) set("holderAddress", addrLines.join(", "), 80);
  }

  // Coverage sections, anchored by their type labels in the left column
  const anchors = [];
  ACORD_COVERAGE_TYPES.forEach(({ re, type }) => {
    const hit = all
      .filter((i) => re.test(i.text) && i.x > 40 && i.x < 175)
      .sort((a, b) => b.y - a.y)[0];
    if (hit) anchors.push({ type, y: hit.y });
  });
  anchors.sort((a, b) => b.y - a.y);

  // The coverage table ends at the "DESCRIPTION OF OPERATIONS / LOCATIONS"
  // header (not the "describe under DESCRIPTION OF OPERATIONS below" hint that
  // sits inside the Workers' Comp cell).
  const descLabel = all.find((i) => /description of operations\s*\/\s*locations/i.test(i.text));
  const tableBottom = descLabel ? descLabel.y + 4 : 95;

  const coverages = [];
  const missingCoverages = [];

  anchors.forEach((anchor, idx) => {
    const top = anchor.y + 6;
    const bottom = idx + 1 < anchors.length ? anchors[idx + 1].y + 4 : tableBottom;
    const band = all.filter((i) => i.y < top && i.y > bottom);

    const policyItem = band.find(
      (i) =>
        i.x >= 215 &&
        i.x <= 305 &&
        /[A-Za-z0-9]/.test(i.text) &&
        /[0-9]/.test(i.text) &&
        i.text.length >= 5 &&
        !ACORD_MONEY_RE.test(i.text) &&
        !ACORD_DATE_RE.test(i.text)
    );
    const effItem = band.find((i) => ACORD_DATE_RE.test(i.text) && i.x >= 300 && i.x < 360);
    const expItem = band.find((i) => ACORD_DATE_RE.test(i.text) && i.x >= 360 && i.x < 420);

    const limits = band
      .filter((i) => i.x >= 500 && ACORD_MONEY_RE.test(i.text))
      .sort((a, b) => b.y - a.y)
      .map((amt) => {
        const nameItems = band
          .filter((i) => Math.abs(i.y - amt.y) <= 4 && i.x >= 395 && i.x < 505)
          .sort((a, b) => a.x - b.x);
        return {
          name: cleanAcordLimitName(nameItems.map((i) => i.text).join(" ")),
          amount: (amt.text.match(ACORD_MONEY_RE) || [amt.text])[0].replace(/\s/g, ""),
        };
      });

    if (limits.length || policyItem) {
      coverages.push({
        type: anchor.type,
        policyNumber: policyItem ? policyItem.text : "",
        effectiveDate: effItem ? effItem.text : "",
        expirationDate: expItem ? expItem.text : "",
        limits,
      });
    } else {
      missingCoverages.push(anchor.type);
    }
  });

  // Top-level policy + dates come from the primary (first) coverage line
  const primary = coverages[0];
  if (primary) {
    if (primary.policyNumber) set("policyNumber", primary.policyNumber);
    if (primary.effectiveDate) set("effectiveDate", primary.effectiveDate);
    if (primary.expirationDate) set("expirationDate", primary.expirationDate);
  }

  return { fields, fieldConfidence, coverages, missingCoverages };
}

/* ---------- Smart document title ----------
 * Rename the document from its insurance content (policy type + category +
 * carrier) instead of the raw file name, so the review screen reads cleanly. */

const DOC_CATEGORY_WORD = {
  certificate: "Certificate",
  declaration: "Declarations",
  endorsement: "Endorsement",
  quote: "Quote",
  invoice: "Invoice",
  policy: "Policy",
};

const CARRIER_SUFFIX_WORDS = new Set([
  "company",
  "co",
  "co.",
  "insurance",
  "underwriters",
  "group",
  "inc",
  "inc.",
  "llc",
  "corp",
  "corp.",
  "corporation",
  "casualty",
  "indemnity",
]);

function shortCarrier(carrier = "") {
  const words = normalizeSpaces(carrier).split(/\s+/).filter(Boolean);
  while (words.length > 1 && CARRIER_SUFFIX_WORDS.has(words[words.length - 1].toLowerCase())) {
    words.pop();
  }
  return words.join(" ");
}

export function buildDocTitle({ docTypeId, coverages = [], carrier = "", fileName = "" }) {
  const category = DOC_CATEGORY_WORD[docTypeId] || "Document";
  const primaryType = coverages.length ? coverages[0].type : "";
  const carrierLabel = shortCarrier(carrier);
  if (primaryType && carrierLabel) return `${primaryType} ${category} — ${carrierLabel}`;
  if (primaryType) return `${primaryType} ${category}`;
  if (carrierLabel) return `${category} — ${carrierLabel}`;
  const cleaned = normalizeSpaces(String(fileName).replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
  return cleaned || category;
}

function buildResult({ file, pdf, metadata, pages, source, extractedAt }) {
  const text = normalizeTextBlock(pages.map((page) => page.text).join("\n\n"));
  const type = detectDocumentType(text || file.name);

  // Prefer the structure-aware ACORD parser when the document is a certificate
  // and we have positioned text items (embedded PDFs). Fall back to the generic
  // regex extractor for declarations, quotes, and OCR text.
  const acordPage = pages.find(
    (page) => Array.isArray(page.items) && page.items.length && isAcordCertificate(page.text)
  );
  let acord = null;
  if (acordPage) {
    try {
      acord = parseAcordItems(acordPage.items);
    } catch {
      acord = null;
    }
  }

  const genericFields = extractKnownFields(text);
  let fields;
  let fieldConfidence;
  let coverages = [];
  let missingCoverages = [];
  let docKind = "generic";

  if (acord && Object.keys(acord.fields).length) {
    docKind = "acord25";
    fields = {
      ...acord.fields,
      emails: genericFields.emails,
      phones: genericFields.phones,
      moneyAmounts: genericFields.moneyAmounts,
      dates: genericFields.dates,
      addresses: genericFields.addresses,
    };
    Object.keys(fields).forEach((key) => {
      if (fields[key] == null) delete fields[key];
    });
    fieldConfidence = { ...acord.fieldConfidence };
    coverages = acord.coverages;
    missingCoverages = acord.missingCoverages;
  } else {
    fields = genericFields;
    fieldConfidence = confidenceForFields(fields, source);
  }

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
    title: buildDocTitle({
      docTypeId: type.id,
      coverages,
      carrier: fields.carrier,
      fileName: file.name,
    }),
    fileSize: file.size,
    pages: pdf.numPages,
    characters: text.length,
    words: text ? text.split(/\s+/).filter(Boolean).length : 0,
    status: hasText ? (source === "ocr" ? "ocr_extracted" : "extracted") : "needs_ocr",
    source,
    docType: type.id,
    docTypeLabel: type.label,
    docKind,
    confidence: type.confidence,
    fields,
    fieldConfidence,
    coverages,
    missingCoverages,
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
    // Positioned items (x/y) power the structure-aware ACORD parser, which
    // needs column positions a flat line read throws away.
    const items = content.items
      .filter((item) => typeof item.str === "string" && item.str.trim())
      .map((item) => ({
        x: Math.round(Number(item.transform?.[4] || 0)),
        y: Math.round(Number(item.transform?.[5] || 0)),
        text: normalizeSpaces(item.str),
      }));
    pages.push({
      pageNumber,
      lineCount: lines.length,
      text: lines.join("\n"),
      lines,
      items,
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
    title: file?.name ? String(file.name).replace(/\.[^.]+$/, "") : "Document",
    fileSize: file?.size || 0,
    pages: 0,
    characters: 0,
    words: 0,
    status: "failed",
    source: "embedded",
    docType: "policy",
    docTypeLabel: "Policy",
    docKind: "generic",
    confidence: 0,
    fields: {},
    fieldConfidence: {},
    coverages: [],
    missingCoverages: [],
    tables: [],
    metadata: {},
    text: "",
    pageText: [],
    // User-facing message; the raw error is kept in errorDetail for debugging.
    warnings: ["We couldn't read this PDF automatically. Try OCR, or review the document manually."],
    errorDetail: error?.message || String(error || ""),
    extractedAt: new Date().toISOString(),
  };
}
