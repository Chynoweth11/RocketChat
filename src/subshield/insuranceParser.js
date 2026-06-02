/**
 * Insurance document parser for SubShield.
 *
 * Pure functions only — no PDF library, no DOM. Given the plain text extracted
 * from a PDF (see pdfText.js), this turns it into structured insurance data:
 * carrier, policy number, coverage type, limits, effective / expiration dates,
 * and endorsements (Additional Insured, Waiver of Subrogation, Primary &
 * Non-Contributory).
 *
 * It understands two real-world document shapes:
 *   1. A single-policy DECLARATIONS page (one coverage, labelled fields).
 *   2. A multi-policy ACORD 25 CERTIFICATE OF LIABILITY INSURANCE, which lists
 *      General Liability, Auto, Umbrella, and Workers' Comp on one form.
 *
 * Nothing here is assumed to be perfect — every field carries a confidence
 * level so the upload UI can highlight what to double-check, and every value is
 * editable before it is saved. Keeping the logic pure means it is exhaustively
 * unit-tested (see __tests__/insuranceParser.test.js).
 */

import { parseLimitToNumber, policyLabelFromType } from "./utils.js";

/* ---------- Coverage-type detection ---------- */

// Ordered most-specific first so a row like "UMBRELLA LIAB" is never mistaken
// for plain "LIABILITY". Each entry maps real ACORD / declaration wording to a
// SubShield policy type.
const TYPE_MATCHERS = [
  {
    type: "workers",
    patterns: [
      /workers'?\s*comp(?:ensation)?/i,
      /workmens?\s*comp/i,
      /employers'?\s*liability/i,
    ],
  },
  {
    type: "umbrella",
    patterns: [/umbrella\s*liab/i, /excess\s*liab/i, /\bumbrella\b/i, /\bexcess\b/i],
  },
  {
    type: "auto",
    patterns: [
      /automobile\s*liability/i,
      /business\s*auto/i,
      /commercial\s*auto/i,
      /\bany\s*auto\b/i,
      /hired\s*(?:&|and)?\s*non[-\s]?owned/i,
    ],
  },
  {
    type: "liability",
    patterns: [
      /commercial\s*general\s*liability/i,
      /general\s*liability/i,
      /\bC\.?G\.?L\.?\b/,
    ],
  },
  {
    type: "property",
    patterns: [
      /commercial\s*property/i,
      /business\s*personal\s*property/i,
      /building\s*(?:&|and)\s*(?:contents|personal\s*property)/i,
      /\bproperty\s*coverage\b/i,
      /\binland\s*marine\b/i,
    ],
  },
];

// First matching type for a single line (used when walking COI rows).
function typeForLine(line) {
  for (const matcher of TYPE_MATCHERS) {
    if (matcher.patterns.some((re) => re.test(line))) return matcher.type;
  }
  return null;
}

// Every coverage type whose wording appears anywhere in the document.
export function detectCoverageTypes(text) {
  const found = [];
  for (const matcher of TYPE_MATCHERS) {
    if (matcher.patterns.some((re) => re.test(text))) found.push(matcher.type);
  }
  return found;
}

/* ---------- Dates ---------- */

const MONTH_NAMES = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9,
  september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

function isoFrom(year, month, day) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const yyyy = year < 100 ? 2000 + year : year;
  if (yyyy < 1990 || yyyy > 2100) return null;
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// All dates in the string, in document order, as { iso, index, raw }.
export function findDates(str) {
  const out = [];
  const numeric = /\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/g;
  let m;
  while ((m = numeric.exec(str)) !== null) {
    const iso = isoFrom(Number(m[3]), Number(m[1]), Number(m[2]));
    if (iso) out.push({ iso, index: m.index, raw: m[0] });
  }
  const named =
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t)?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2}),?\s+(\d{4})\b/gi;
  while ((m = named.exec(str)) !== null) {
    const month = MONTH_NAMES[m[1].toLowerCase().replace(/\./g, "")];
    const iso = isoFrom(Number(m[3]), month, Number(m[2]));
    if (iso) out.push({ iso, index: m.index, raw: m[0] });
  }
  return out.sort((a, b) => a.index - b.index);
}

/* ---------- Money / limits ---------- */

// Dollar amounts >= $1,000 (limits, not policy numbers), in document order.
export function findAmounts(str) {
  const out = [];
  const re = /\$\s?(\d{1,3}(?:,\d{3})+(?:\.\d{2})?)|\$\s?(\d{4,})(?:\.\d{2})?|\b(\d{1,3}(?:,\d{3})+)\b/g;
  let m;
  while ((m = re.exec(str)) !== null) {
    const raw = m[1] || m[2] || m[3];
    const value = Number(raw.replace(/,/g, ""));
    if (Number.isFinite(value) && value >= 1000) {
      out.push({ value, index: m.index, raw: m[0].trim() });
    }
  }
  return out;
}

// Human-readable limit string for a coverage type, derived from the amounts in
// its block of text. Falls back to the largest amount, then to "".
function buildLimitString(type, blockText) {
  const amounts = findAmounts(blockText).map((a) => a.value);
  if (!amounts.length) return "";
  const unique = [...new Set(amounts)].sort((a, b) => b - a);
  const money = (n) => `$${n.toLocaleString()}`;

  if (type === "liability") {
    const occ = nearestAmount(blockText, /each\s*occurrence/i);
    const agg = nearestAmount(blockText, /general\s*aggregate/i);
    if (occ && agg) return `${money(agg)} aggregate / ${money(occ)} occurrence`;
    if (unique.length >= 2) return `${money(unique[0])} aggregate / ${money(unique[1])} occurrence`;
    return money(unique[0]);
  }
  if (type === "auto") {
    const csl = nearestAmount(blockText, /combined\s*single\s*limit/i);
    if (csl) return `${money(csl)} combined single limit`;
    return `${money(unique[0])} combined single limit`;
  }
  if (type === "umbrella") {
    const occ = nearestAmount(blockText, /each\s*occurrence/i);
    return `${money(occ || unique[0])} excess liability`;
  }
  if (type === "workers") {
    const each = nearestAmount(blockText, /e\.?l\.?\s*each\s*accident/i);
    return each ? `Statutory / ${money(each)} employer liability` : "Statutory limits";
  }
  if (type === "property") {
    if (unique.length >= 2) return `${money(unique[0])} building / ${money(unique[1])} contents`;
    return `${money(unique[0])} property`;
  }
  return money(unique[0]);
}

// The first dollar amount appearing after a label within the block, if any.
function nearestAmount(blockText, labelRe) {
  const match = labelRe.exec(blockText);
  if (!match) return 0;
  const after = blockText.slice(match.index, match.index + 120);
  const amounts = findAmounts(after);
  return amounts.length ? amounts[0].value : 0;
}

/* ---------- Policy numbers ---------- */

// Candidate policy numbers: a short letter prefix followed by 5–14 digits,
// optionally separated by a dash or space (GL-44827193, WC 90183321, UM7740921).
export function findPolicyNumbers(str) {
  const out = [];
  // Uppercase letter prefix + 5–14 digits, optionally dash/space separated.
  const re = /\b([A-Z]{1,6})[-\s]?(\d{5,14})\b/g;
  let m;
  while ((m = re.exec(str)) !== null) {
    // Skip obvious non-policy prefixes.
    if (/^(PO|NO|ID|EXP|EFF|FAX|TEL)$/.test(m[1])) continue;
    out.push({ value: `${m[1]}-${m[2]}`, index: m.index, raw: m[0].trim() });
  }
  // De-dupe by raw token, keep document order.
  const seen = new Set();
  return out.filter((item) => {
    const key = item.raw.toUpperCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Labelled policy number ("Policy Number: GL-123456") wins when present.
function labelledPolicyNumber(text) {
  const m = /policy\s*(?:number|no\.?|#)\s*[:#]?\s*([A-Z0-9][A-Z0-9\-\s]{4,20}\d)/i.exec(text);
  if (!m) return null;
  return m[1].trim().replace(/\s+/g, " ");
}

/* ---------- Endorsements ---------- */

// Detect the three endorsements GCs care about, document-wide. A COI shows
// these as "X" columns or as wording in the description of operations.
export function detectEndorsements(text) {
  const lower = text.toLowerCase();
  return {
    additionalInsured: /additional\s*insured/.test(lower),
    waiverOfSubrogation: /waiver\s*of\s*subrogation|subr(?:ogation)?\s*waiv|\bwaiver\b/.test(lower),
    primaryNonContributory:
      /primary\s*(?:and|&|\/)?\s*non[-\s]?contributory|non[-\s]?contributory/.test(lower),
  };
}

/* ---------- Named insured / certificate holder / carrier ---------- */

const CARRIER_KEYWORDS = /(insurance\b|\bmutual\b|\bcasualty\b|\bindemnity\b|underwriters|assurance|\bsurety\b|specialty\s+insurance|ins(?:urance)?\s+co\b)/i;
const KNOWN_CARRIERS = [
  "Travelers", "The Hartford", "Hartford", "Liberty Mutual", "Nationwide",
  "Progressive", "State Farm", "Chubb", "CNA", "Zurich", "AmTrust", "Hiscox",
  "Acuity", "Cincinnati", "Selective", "Erie", "Markel", "Berkshire",
  "Sentinel", "Sentry", "Allmerica", "Philadelphia", "Auto-Owners",
  "StateFund", "Acme Mutual", "NEXT Insurance", "Employers",
];

function detectCarrier(text) {
  for (const name of KNOWN_CARRIERS) {
    if (new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(text)) {
      return { value: name, confidence: "high" };
    }
  }
  // "INSURER A : Some Insurance Co" style.
  const insurer = /insurer\s*[a-f]\s*[:#]?\s*([A-Z][A-Za-z&.,'\- ]{3,50})/i.exec(text);
  if (insurer && CARRIER_KEYWORDS.test(insurer[1])) {
    return { value: cleanName(insurer[1]), confidence: "med" };
  }
  // Any line that looks like a carrier name.
  for (const line of splitLines(text)) {
    if (CARRIER_KEYWORDS.test(line) && /[A-Za-z]/.test(line) && line.length < 60) {
      const cleaned = cleanName(line.replace(/\s+NAIC.*$/i, ""));
      if (
        cleaned.length >= 4 &&
        !/insured|holder|producer|certificate|coverage|policy\s*number|description/i.test(cleaned)
      ) {
        return { value: cleaned, confidence: "low" };
      }
    }
  }
  return { value: "", confidence: "low" };
}

// Map ACORD insurer letters to carrier names ("INSURER A : Acme Mutual ...").
function parseInsurerMap(text) {
  const map = {};
  const re = /insurer\s+([a-f])\s*[:#]?\s*(.+?)(?=\s*naic|\s*#|\r?\n|$)/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const letter = m[1].toUpperCase();
    const name = cleanName(m[2]).replace(/\s+NAIC.*$/i, "");
    if (name && name.length >= 3 && !map[letter]) map[letter] = name;
  }
  return map;
}

// The ACORD row letter (A–F) that precedes a coverage anchor on its line.
function rowLetterBefore(text, index) {
  const lineStart = text.lastIndexOf("\n", index - 1) + 1;
  const prefix = text.slice(lineStart, index).trim();
  const m = /^([A-F])\b/.exec(prefix);
  return m ? m[1] : null;
}

function detectLabelled(text, labelRe) {
  const m = labelRe.exec(text);
  if (!m) return "";
  // Value may follow on the same line.
  const tail = text.slice(m.index + m[0].length, m.index + m[0].length + 80);
  const firstLine = tail.split(/\r?\n/)[0].trim();
  return cleanName(firstLine);
}

function cleanName(value) {
  return String(value || "")
    .replace(/[\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/[:#|]+$/g, "")
    .trim();
}

function splitLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/* ---------- Document kind ---------- */

export function detectDocumentKind(text) {
  const lower = text.toLowerCase();
  if (/certificate\s*of\s*liability\s*insurance/.test(lower) || /\bacord\b/.test(lower)) {
    return "coi";
  }
  if (/declarations?\s*(?:page|summary)?/.test(lower) || /\bdec\s*page\b/.test(lower)) {
    return "declaration";
  }
  if (/certificate\s*of\s*insurance/.test(lower)) return "coi";
  return detectCoverageTypes(text).length ? "policy" : "unknown";
}

/* ---------- Per-type candidate ---------- */

// Slice of text most relevant to a coverage type: from its anchor to the next
// coverage anchor (so an ACORD row's policy #, dates, and limits stay together).
function blockForType(text, type, anchors) {
  const me = anchors.find((a) => a.type === type);
  if (!me) return text;
  const next = anchors
    .filter((a) => a.index > me.index)
    .sort((a, b) => a.index - b.index)[0];
  const end = next ? next.index : Math.min(text.length, me.index + 700);
  return text.slice(me.index, end);
}

// Where each coverage type's wording first appears.
function coverageAnchors(text) {
  const anchors = [];
  for (const matcher of TYPE_MATCHERS) {
    let best = Infinity;
    for (const re of matcher.patterns) {
      const m = re.exec(text);
      if (m && m.index < best) best = m.index;
    }
    if (best !== Infinity) anchors.push({ type: matcher.type, index: best });
  }
  return anchors.sort((a, b) => a.index - b.index);
}

function buildCandidate(type, text, anchors, insurerMap, docEndorsements) {
  const multi = anchors.length > 1;
  const me = anchors.find((a) => a.type === type);
  const block = blockForType(text, type, anchors);

  // Dates: a declaration page may put the policy period anywhere, so for a
  // single-policy doc we look at the whole text; for a COI we stay in the row.
  const scope = multi ? block : text;
  const dates = findDates(scope);
  const effectiveDate = dates[0]?.iso || "";
  const expirationDate = dates[1]?.iso || "";

  const policyNumber =
    labelledPolicyNumber(scope) ||
    findPolicyNumbers(block)[0]?.raw ||
    findPolicyNumbers(text)[0]?.raw ||
    "";

  const coverageLimits = buildLimitString(type, block);

  // Carrier: prefer the ACORD insurer-letter mapping (row "A" → INSURER A),
  // which is accurate per row; then a single-doc carrier scan; finally the
  // first listed insurer as a low-confidence guess.
  let carrier = { value: "", confidence: "low" };
  const letter = me ? rowLetterBefore(text, me.index) : null;
  if (letter && insurerMap[letter]) {
    carrier = { value: insurerMap[letter], confidence: "high" };
  } else if (!multi) {
    carrier = detectCarrier(text);
  } else {
    const first = Object.values(insurerMap)[0];
    carrier = { value: first || "", confidence: "low" };
  }

  // Endorsements only meaningfully attach to liability lines; default the rest
  // to the document-wide detection so the user can confirm.
  const endorsements =
    type === "liability" || type === "umbrella" || type === "auto"
      ? { ...docEndorsements }
      : { additionalInsured: false, waiverOfSubrogation: docEndorsements.waiverOfSubrogation, primaryNonContributory: false };

  const confidence = {
    policyType: "high",
    carrier: carrier.confidence,
    policyNumber: policyNumber ? (multi ? "med" : "high") : "low",
    dates: effectiveDate && expirationDate ? (multi ? "med" : "high") : "low",
    limits: coverageLimits ? (multi ? "med" : "high") : "low",
  };

  return {
    key: `scan-${type}`,
    policyType: type,
    name: policyLabelFromType(type),
    carrier: carrier.value,
    policyNumber,
    effectiveDate,
    expirationDate,
    coverageLimits,
    limitValue: parseLimitToNumber(coverageLimits),
    endorsements,
    confidence,
    selected: true,
  };
}

/* ---------- Orchestrator ---------- */

/**
 * Parse extracted PDF text into a structured result the upload UI can review.
 * @param {string} text   Plain text extracted from the PDF.
 * @returns {{
 *   kind: string,
 *   namedInsured: string,
 *   certificateHolder: string,
 *   endorsements: object,
 *   policies: object[],
 *   confidence: number,
 *   fieldsFound: number,
 * }}
 */
export function parseInsuranceDocument(text) {
  const clean = String(text || "");
  const kind = detectDocumentKind(clean);
  const anchors = coverageAnchors(clean);
  const types = anchors.map((a) => a.type);
  const endorsements = detectEndorsements(clean);
  const insurerMap = parseInsurerMap(clean);

  const namedInsured =
    detectLabelled(clean, /named\s*insured\s*[:#]?/i) ||
    detectLabelled(clean, /\binsured\s*[:#]/i) ||
    "";
  const certificateHolder = detectLabelled(
    clean,
    /certificate\s*holder\s*[:#]?/i
  );

  const policies = types.map((type) =>
    buildCandidate(type, clean, anchors, insurerMap, endorsements)
  );

  // Overall confidence: share of strong field detections across all policies.
  let strong = 0;
  let total = 0;
  policies.forEach((policy) => {
    Object.values(policy.confidence).forEach((level) => {
      total += 1;
      if (level === "high") strong += 1;
      else if (level === "med") strong += 0.5;
    });
  });
  const confidence = total ? Math.round((strong / total) * 100) / 100 : 0;

  return {
    kind,
    namedInsured,
    certificateHolder,
    endorsements,
    policies,
    confidence,
    fieldsFound: policies.length,
  };
}
