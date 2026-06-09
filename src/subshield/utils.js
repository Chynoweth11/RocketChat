/**
 * Utilities for SubShield.
 * Pure functions only - no React, no DOM beyond localStorage / clipboard.
 */

// Bumped to v6 when the app switched from seeded demo data to an empty-by-
// default account. The version suffix invalidates any cached demo data from
// earlier builds so existing browsers also start clean.
export const STORAGE_KEY = "subshield.complete.v6";

export const RENEWAL_REMINDER_DAYS = [90, 60, 30, 10, 0];

/**
 * Illustrative annual savings rate applied when an opportunity has no
 * confirmed alternate quote yet. Centralized so every entry point (vault,
 * coverage review, savings view UI) shows a consistent estimate. This is a
 * placeholder figure shown to users until a licensed partner confirms the
 * real number; keep it in one place so it stays consistent.
 */
export const ESTIMATED_SAVINGS_RATE = 0.12;

/** Helper: estimated annual savings for a premium at the illustrative rate. */
export function estimateSavings(premium) {
  return Math.round(toNumber(premium, 0) * ESTIMATED_SAVINGS_RATE);
}

/** Helper: estimated premium after applying the illustrative savings rate. */
export function estimateLowerPremium(premium) {
  return Math.round(toNumber(premium, 0) * (1 - ESTIMATED_SAVINGS_RATE));
}

const POLICY_TYPE_NAMES = {
  liability: "General Liability",
  workers: "Workers' Compensation",
  auto: "Commercial Auto",
  umbrella: "Umbrella / Excess Liability",
  property: "Commercial Property",
  cyber: "Cyber Liability",
  equipment: "Equipment / Inland Marine",
  tools: "Tools & Equipment",
  builders_risk: "Builder's Risk",
  pollution: "Pollution Liability",
  professional: "Professional Liability",
  epl: "Employment Practices Liability",
  directors: "Directors & Officers",
  crime: "Crime / Fidelity",
  liquor: "Liquor Liability",
  garage: "Garage / Dealers",
  bonding: "Surety Bonding",
  license: "Trade License",
};

const DEFAULT_POLICY_LIMITS = {
  liability: "$2M aggregate / $1M occurrence",
  workers: "Statutory / $1M employer liability",
  auto: "$1M combined single limit",
  umbrella: "$2M excess liability",
  property: "$750k building / $250k contents",
  cyber: "$1M cyber liability",
  equipment: "$150k scheduled equipment",
  tools: "$150k scheduled tools",
  builders_risk: "$500k project limit",
  pollution: "$1M pollution liability",
  professional: "$1M professional liability",
  epl: "$1M employment practices",
  directors: "$1M directors & officers",
  crime: "$250k crime / fidelity",
  liquor: "$1M liquor liability",
  garage: "$1M garage liability",
  bonding: "$500k bond capacity",
  license: "Trade contractor license",
};

/**
 * Core coverages most commercial businesses should carry. Used to surface
 * "missing coverage" gaps on the dashboard and savings views.
 */
const RECOMMENDED_COVERAGE = [
  {
    type: "liability",
    reason: "Baseline protection nearly every client and contract requires.",
  },
  {
    type: "workers",
    reason: "Required in most states once you have employees.",
  },
  {
    type: "auto",
    reason: "Covers vehicles used for business and is often required on job sites.",
  },
  {
    type: "property",
    reason: "Protects your building, tools, and contents from loss.",
  },
  {
    type: "umbrella",
    reason: "Extends your limits to meet larger contract requirements.",
  },
  {
    type: "cyber",
    reason: "Covers breaches, wire fraud, and downtime, and is increasingly required.",
  },
];

const DOCUMENT_TYPE_LABELS = {
  declaration: "Declarations Page",
  certificate: "Certificate (COI)",
  endorsement: "Endorsement",
  quote: "Renewal Quote",
  invoice: "Compliance File",
  policy: "Policy Document",
};

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const QUOTE_STATUS_LABELS = {
  draft: "Draft",
  submitted: "Submitted",
  requested: "Requested",
  pending_partner: "Awaiting partner",
  sent_to_partner: "Sent to partner",
  at_partner: "Reviewing at partner",
  quote_received: "Partner offer ready",
  available: "Savings available",
  monitoring: "Monitoring",
  accepted: "Switched via partner",
  purchased: "Switched via partner",
  remind_later: "Snoozed",
  dismissed: "Dismissed",
  declined: "Declined",
  closed: "Closed",
};

/* ---------- General ---------- */

export function makeId(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

export function dateFromToday(days) {
  const d = new Date();
  d.setDate(d.getDate() + Number(days || 0));
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function parseIso(iso) {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
  if (!m) return new Date(iso);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysUntil(isoDate) {
  const parsed = parseIso(isoDate);
  if (!parsed || Number.isNaN(parsed.getTime())) return 0;
  const today = startOfLocalDay(new Date());
  const day = startOfLocalDay(parsed);
  return Math.round((day - today) / 86400000);
}

/* ---------- Time helpers ---------- */

export function timeAgo(isoString) {
  if (!isoString) return "";
  const ms = Date.now() - new Date(isoString).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}yr ago`;
}

/* ---------- Policy helpers ---------- */

export function policyLabelFromType(type) {
  return POLICY_TYPE_NAMES[type] || "Insurance Policy";
}

// Reverse lookup: a coverage display label (e.g. "Commercial General
// Liability") back to our internal policy-type key. Used when a confirmed
// extraction is filed into the document library so it groups correctly.
const POLICY_LABEL_TO_TYPE = (() => {
  const map = {};
  Object.entries(POLICY_TYPE_NAMES).forEach(([key, label]) => {
    map[label.toLowerCase()] = key;
  });
  Object.assign(map, {
    "commercial general liability": "liability",
    "general liability": "liability",
    "automobile liability": "auto",
    "commercial auto": "auto",
    "umbrella / excess liability": "umbrella",
    "inland marine / equipment": "equipment",
    "crime / fidelity": "crime",
    "builder's risk": "builders_risk",
    "directors & officers": "directors",
    "employment practices liability": "epl",
  });
  return map;
})();

export function policyTypeFromLabel(label) {
  if (!label) return null;
  return POLICY_LABEL_TO_TYPE[String(label).toLowerCase().trim()] || null;
}

function normalizePolicyDocuments(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((doc) => String(doc || "").trim())
    .filter(Boolean);
}

export function normalizePolicy(rawPolicy, companyId = "subshield-tile-co") {
  const policyType = rawPolicy.policyType || rawPolicy.type || "liability";
  const policyName = rawPolicy.name || policyLabelFromType(policyType);
  const premiumAmount = toNumber(
    rawPolicy.premiumAmount ?? rawPolicy.premium,
    0
  );
  const premiumFrequency = rawPolicy.premiumFrequency || "annual";
  const expirationDate =
    rawPolicy.expirationDate ||
    rawPolicy.renewalDate ||
    rawPolicy.expires ||
    dateFromToday(rawPolicy.daysRemaining ?? 365);
  const renewalDate = rawPolicy.renewalDate || expirationDate;
  const daysRemaining =
    typeof rawPolicy.daysRemaining === "number"
      ? rawPolicy.daysRemaining
      : daysUntil(renewalDate);
  const status = getStatus(daysRemaining);
  const createdAt = rawPolicy.createdAt || new Date().toISOString();
  const updatedAt = rawPolicy.updatedAt || createdAt;
  const coverageLimits = rawPolicy.coverageLimits || rawPolicy.limit || DEFAULT_POLICY_LIMITS[policyType] || "";
  const documents = normalizePolicyDocuments(rawPolicy.documents);
  const rawDeductible = rawPolicy.deductible;
  const deductible =
    rawDeductible === null || rawDeductible === undefined || rawDeductible === ""
      ? null
      : toNumber(rawDeductible, 0);

  return {
    ...rawPolicy,
    id: rawPolicy.id || makeId("pol"),
    companyId: rawPolicy.companyId || companyId,
    policyType,
    type: policyType,
    name: policyName,
    carrier: rawPolicy.carrier || "Carrier TBD",
    policyNumber: rawPolicy.policyNumber || "Pending",
    premiumAmount,
    premium: premiumAmount,
    premiumFrequency,
    deductible,
    effectiveDate: rawPolicy.effectiveDate || dateFromToday(daysRemaining - 365),
    expirationDate,
    renewalDate,
    expires: expirationDate,
    daysRemaining,
    coverageLimits,
    limit: coverageLimits,
    brokerId: rawPolicy.brokerId || null,
    documents,
    status: rawPolicy.status || status.label.toLowerCase(),
    statusClass: status.className,
    statusNote:
      rawPolicy.statusNote ||
      (daysRemaining <= 10
        ? "Critical. Renew before sending new COI packages."
        : daysRemaining <= 30
        ? "Inside the renewal planning window."
        : "Active and ready for routing."),
    savingsStatus: rawPolicy.savingsStatus || "monitoring",
    lastQuotedAt: rawPolicy.lastQuotedAt || null,
    createdAt,
    updatedAt,
  };
}

export function normalizePolicies(policies = [], companyId) {
  return (policies || []).map((policy) => normalizePolicy(policy, companyId));
}

export function formatMoney(value) {
  return `$${Number(value || 0).toLocaleString()}`;
}

export function formatDeductible(value) {
  if (value === null || value === undefined || value === "") return "N/A";
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return "$0";
  return formatMoney(n);
}

export function getStatus(days) {
  if (days <= 10) return { label: "Critical", className: "danger" };
  if (days <= 30) return { label: "Expiring", className: "warning" };
  return { label: "Active", className: "success" };
}

export function scoreClass(score) {
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  return "danger";
}

/**
 * Compute a 0-100 health score for a single policy and a list of what's
 * bringing the score down so the UI can show a Good / Needs Work breakdown.
 */
export function policyHealthScore(policy) {
  if (!policy) return { score: 0, grade: "Critical", issues: [] };

  let score = 100;
  const issues = [];
  const good = [];

  const days = policy.daysRemaining ?? 999;
  if (days <= 10) {
    score -= 40;
    issues.push("Policy is in the critical renewal window");
  } else if (days <= 30) {
    score -= 20;
    issues.push("Policy renews within 30 days");
  } else if (days <= 90) {
    score -= 5;
    issues.push("Policy renews within 90 days");
  } else {
    good.push("Renewal date is well ahead");
  }

  const hasDocs = (policy.documents?.length ?? 0) > 0;
  if (!hasDocs) {
    score -= 18;
    issues.push("No declaration documents on file");
  } else {
    good.push("Declaration page on file");
  }

  const hasLimits = Boolean(policy.coverageLimits || policy.limit);
  if (!hasLimits) {
    score -= 8;
    issues.push("Coverage limits not recorded");
  } else {
    good.push("Coverage limits documented");
  }

  const hasDeductible = policy.deductible !== null && policy.deductible !== undefined && policy.deductible !== "";
  if (!hasDeductible) {
    score -= 5;
    issues.push("Deductible not recorded");
  } else {
    good.push("Deductible on file");
  }

  const hasEffective = Boolean(policy.effectiveDate);
  if (!hasEffective) {
    score -= 5;
    issues.push("Effective date missing");
  } else {
    good.push("Policy term dates complete");
  }

  const finalScore = Math.max(0, Math.min(100, score));
  const grade = finalScore >= 80 ? "Good" : finalScore >= 55 ? "Needs Work" : "Critical";
  return { score: finalScore, grade, issues, good };
}

/* ---------- COI compliance matching ----------
 * GCs require specific coverage on their certificates (a minimum limit, plus
 * endorsements like Additional Insured). These helpers let SubShield compare a
 * GC's structured requirements against the contractor's actual policies, so we
 * can answer "Am I covered for this job?" before a COI is sent.
 */

// Coverage types that can be required on a COI (license is never a COI line).
export const REQUIREMENT_COVERAGE_TYPES = [
  "liability",
  "workers",
  "auto",
  "umbrella",
  "property",
];

// Common minimum-limit options for the requirement builder, in dollars.
export const LIMIT_OPTIONS = [
  { value: 500000, label: "$500K" },
  { value: 1000000, label: "$1M" },
  { value: 2000000, label: "$2M" },
  { value: 5000000, label: "$5M" },
  { value: 10000000, label: "$10M" },
];

// Endorsements a GC may demand. We detect them from an explicit policy flag
// (`policy.endorsements[key]`) or, failing that, from the policy's document
// names (e.g. a "Additional Insured" document implies the endorsement).
export const ENDORSEMENT_TYPES = [
  { key: "additionalInsured", label: "Additional Insured", keywords: ["additional insured"] },
  { key: "waiverOfSubrogation", label: "Waiver of Subrogation", keywords: ["waiver"] },
  {
    key: "primaryNonContributory",
    label: "Primary & Non-Contributory",
    keywords: ["primary", "non-contributory", "noncontributory"],
  },
];

// Short money label used in compliance UI: 2000000 -> "$2M", 750000 -> "$750K".
export function formatLimitShort(value) {
  const num = toNumber(value, 0);
  if (num >= 1_000_000) {
    const m = num / 1_000_000;
    return `$${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  if (num >= 1000) return `$${Math.round(num / 1000)}K`;
  return `$${num}`;
}

// Parse a free-text limit string ("$2M aggregate / $1M occurrence") into its
// largest dollar figure so it can be compared numerically. Returns 0 when no
// figure is present (e.g. "Statutory").
export function parseLimitToNumber(value) {
  if (typeof value === "number") return value;
  if (!value) return 0;
  let max = 0;
  const re = /\$?\s*(\d[\d,]*(?:\.\d+)?)\s*([mk])?/gi;
  let match;
  while ((match = re.exec(String(value))) !== null) {
    let n = parseFloat(match[1].replace(/,/g, ""));
    if (!Number.isFinite(n)) continue;
    const unit = (match[2] || "").toLowerCase();
    if (unit === "m") n *= 1_000_000;
    else if (unit === "k") n *= 1_000;
    if (n > max) max = n;
  }
  return max;
}

// Does a policy carry a given endorsement? Explicit flag wins, otherwise we
// look for the endorsement name in the policy's document list.
export function policyHasEndorsement(policy, endorsementKey) {
  if (!policy) return false;
  if (policy.endorsements && policy.endorsements[endorsementKey]) return true;
  const def = ENDORSEMENT_TYPES.find((item) => item.key === endorsementKey);
  if (!def) return false;
  const haystack = (policy.documents || []).join(" ").toLowerCase();
  return def.keywords.some((keyword) => haystack.includes(keyword));
}

// Clean a requirements array (as stored on a GC) into a predictable shape.
export function normalizeRequirements(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const cleaned = [];
  list.forEach((req) => {
    if (!req || !REQUIREMENT_COVERAGE_TYPES.includes(req.policyType)) return;
    if (seen.has(req.policyType)) return;
    seen.add(req.policyType);
    cleaned.push({
      policyType: req.policyType,
      minLimit: toNumber(req.minLimit, 0),
      additionalInsured: Boolean(req.additionalInsured),
      waiverOfSubrogation: Boolean(req.waiverOfSubrogation),
      primaryNonContributory: Boolean(req.primaryNonContributory),
    });
  });
  return cleaned;
}

// Compare a GC's structured requirements against the contractor's policies.
// Returns a summary plus a per-requirement breakdown with individual checks,
// so the UI can render ✓/✗ lines and an overall compliant/gaps verdict.
export function checkCompliance(requirements, policies) {
  const reqs = normalizeRequirements(requirements);
  const results = reqs.map((req) => {
    const label = policyLabelFromType(req.policyType);
    const policy = (policies || []).find(
      (item) => (item.policyType || item.type) === req.policyType
    );

    if (!policy) {
      return {
        policyType: req.policyType,
        label,
        status: "missing",
        policy: null,
        checks: [{ label: `${label} policy on file`, ok: false }],
      };
    }

    const checks = [];

    if (req.minLimit > 0) {
      const have = parseLimitToNumber(policy.coverageLimits || policy.limit);
      checks.push({
        label: `Limit ≥ ${formatLimitShort(req.minLimit)}`,
        ok: have >= req.minLimit,
        detail: have > 0 ? `carries ${formatLimitShort(have)}` : "limit not detected",
      });
    } else {
      checks.push({ label: "Coverage on file", ok: true });
    }

    ENDORSEMENT_TYPES.forEach((endorsement) => {
      if (req[endorsement.key]) {
        checks.push({
          label: endorsement.label,
          ok: policyHasEndorsement(policy, endorsement.key),
        });
      }
    });

    if ((policy.daysRemaining ?? 0) <= 0) {
      checks.push({ label: "Policy active (not expired)", ok: false });
    }

    const allOk = checks.every((check) => check.ok);
    return {
      policyType: req.policyType,
      label,
      status: allOk ? "met" : "unmet",
      policy,
      checks,
    };
  });

  const unmetCount = results.filter((result) => result.status !== "met").length;
  return {
    hasRequirements: reqs.length > 0,
    compliant: reqs.length > 0 && unmetCount === 0,
    total: results.length,
    metCount: results.length - unmetCount,
    unmetCount,
    results,
  };
}

export function getComplianceScore(policies = []) {
  if (!policies.length) return 0;

  const total = policies.reduce((sum, policy) => {
    const days = typeof policy.daysRemaining === "number"
      ? policy.daysRemaining
      : daysUntil(policy.renewalDate || policy.expirationDate || policy.expires);
    if (days >= 90) return sum + 100;
    if (days >= 45) return sum + 84;
    if (days >= 30) return sum + 70;
    if (days >= 10) return sum + 48;
    return sum + 18;
  }, 0);

  return Math.round(total / policies.length);
}

// A trade license is a fee, not an insurance premium, so it's excluded from
// premium totals. This keeps "insurance spend", the active-policy count, and
// the per-policy breakdown (all of which already exclude license) consistent.
export function totalTrackedPremium(policies = []) {
  return policies
    .filter((policy) => (policy.policyType || policy.type) !== "license")
    .reduce((sum, policy) => sum + toNumber(policy.premiumAmount ?? policy.premium, 0), 0);
}

/**
 * Coverages the business is recommended to carry but currently does not.
 * Powers the "missing coverage" surface so users can close protection gaps.
 */
export function getCoverageGaps(policies = []) {
  const existing = new Set(
    policies.map((policy) => policy.policyType || policy.type)
  );
  return RECOMMENDED_COVERAGE.filter((item) => !existing.has(item.type)).map(
    (item) => ({
      type: item.type,
      label: policyLabelFromType(item.type),
      reason: item.reason,
    })
  );
}

/**
 * Total annual savings still in play from open opportunities. Includes
 * in-flight statuses (requested / sent_to_partner) so pursuing an opportunity
 * doesn't make the headline savings figure drop.
 */
export function getPotentialSavings(opportunities = []) {
  return opportunities
    .filter((item) =>
      [
        "available",
        "requested",
        "pending_partner",
        "sent_to_partner",
        "quote_received",
        "at_partner",
      ].includes(item.status)
    )
    .reduce((sum, item) => sum + savingsForOpportunity(item), 0);
}

/** Total annual savings already locked in by accepting better quotes. */
export function getRealizedSavings(opportunities = []) {
  return opportunities
    .filter((item) => item.status === "accepted")
    .reduce((sum, item) => sum + savingsForOpportunity(item), 0);
}

function savingsForOpportunity(opportunity) {
  if (opportunity?.alternateQuote?.premium != null) {
    const delta =
      toNumber(opportunity.currentPremium, 0) -
      toNumber(opportunity.alternateQuote.premium, 0);
    return Math.max(0, delta);
  }
  return Math.max(0, toNumber(opportunity?.estimatedSavings, 0));
}

export { savingsForOpportunity };

export function getUpcomingRenewals(policies = [], limit = 3) {
  return [...policies]
    .filter((p) => p.policyType !== "license" && p.type !== "license")
    .sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0))
    .slice(0, limit);
}

export function getRenewalReminders(policies = []) {
  const reminders = [];
  policies.forEach((policy) => {
    const days = policy.daysRemaining ?? daysUntil(policy.renewalDate);
    const threshold = RENEWAL_REMINDER_DAYS.find((d) => days <= d && days >= d - 2);
    if (threshold === undefined) return;
    reminders.push({
      id: `${policy.id}-${threshold}`,
      policyId: policy.id,
      policyName: policy.name,
      policyType: policy.policyType,
      renewalDate: policy.renewalDate,
      daysRemaining: days,
      threshold,
      message:
        threshold === 0
          ? `${policy.name} renews today. Upload your new paperwork or request a quote now.`
          : `${policy.name} renews in ${days} day${days === 1 ? "" : "s"}. Review coverage or compare quotes.`,
    });
  });
  return reminders.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export function packagePolicies(policies = []) {
  return policies.filter((policy) => {
    const type = policy.policyType || policy.type;
    return type !== "license";
  });
}

export function countDocuments(policies = []) {
  return policies.reduce(
    (sum, policy) => sum + (policy.documents?.length || 0),
    0
  );
}

/* ---------- Documents ---------- */

export function documentTypeLabel(docType) {
  return DOCUMENT_TYPE_LABELS[docType] || "Document";
}

export function normalizeDocument(raw = {}) {
  const docType = DOCUMENT_TYPE_LABELS[raw.docType] ? raw.docType : "policy";
  return {
    ...raw,
    id: raw.id || makeId("doc"),
    name: String(raw.name || documentTypeLabel(docType)).trim(),
    docType,
    policyId: raw.policyId || null,
    policyType: raw.policyType || null,
    carrier: raw.carrier || "",
    fileType: raw.fileType || "PDF",
    sizeKb: Math.max(1, toNumber(raw.sizeKb, 120)),
    status: raw.status === "pending" ? "pending" : "verified",
    addedBy: raw.addedBy || "You",
    uploadedAt: raw.uploadedAt || new Date().toISOString(),
  };
}

export function normalizeDocuments(documents = []) {
  return (Array.isArray(documents) ? documents : []).map(normalizeDocument);
}

/**
 * Non-license policies that do not yet have a stored document on file.
 * Surfaces "upload your paperwork" nudges on the dashboard.
 */
export function getMissingDocuments(policies = [], documents = []) {
  const documentedPolicyIds = new Set(
    documents.map((doc) => doc.policyId).filter(Boolean)
  );
  return policies.filter((policy) => {
    const type = policy.policyType || policy.type;
    if (type === "license") return false;
    return !documentedPolicyIds.has(policy.id);
  });
}

/* ---------- Savings & quotes ---------- */

export function normalizeSavingsOpportunity(raw, policies = [], companyId = "subshield-tile-co") {
  const policy = policies.find((item) => item.id === raw.policyId);
  const policyType = raw.policyType || policy?.policyType || "liability";
  const renewalDate = raw.renewalDate || policy?.renewalDate || dateFromToday(30);
  const currentPremium = toNumber(
    raw.currentPremium ?? policy?.premiumAmount ?? policy?.premium,
    0
  );
  const estimatedSavings = toNumber(raw.estimatedSavings, estimateSavings(currentPremium));
  return {
    ...raw,
    id: raw.id || makeId("sav"),
    companyId: raw.companyId || companyId,
    policyId: raw.policyId || policy?.id || null,
    policyType,
    currentCarrier: raw.currentCarrier || policy?.carrier || "Current carrier",
    currentPremium,
    estimatedSavings,
    renewalDate,
    status: raw.status || "available",
    partnerId: raw.partnerId || null,
    alternateQuote: raw.alternateQuote || null,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
    notes: raw.notes || "",
  };
}

export function normalizeSavingsList(opportunities = [], policies = [], companyId) {
  return (opportunities || []).map((item) =>
    normalizeSavingsOpportunity(item, policies, companyId)
  );
}

export function normalizeQuoteRequest(raw, companyId = "subshield-tile-co") {
  return {
    ...raw,
    id: raw.id || makeId("qr"),
    companyId: raw.companyId || companyId,
    status: raw.status || "submitted",
    requestedBy: raw.requestedBy || "owner",
    submittedAt: raw.submittedAt || new Date().toISOString(),
    respondedAt: raw.respondedAt || null,
    routeType: raw.routeType || (raw.partnerId ? "partner" : "broker"),
    notes: raw.notes || "",
    businessInfo: raw.businessInfo || {},
    currentCoverageInfo: raw.currentCoverageInfo || {},
  };
}

export function normalizeQuoteRequests(requests = [], companyId) {
  return (requests || []).map((item) => normalizeQuoteRequest(item, companyId));
}

export function quoteStatusLabel(status) {
  return QUOTE_STATUS_LABELS[status] || "Open";
}

export function getOpenQuoteRequests(requests = []) {
  return requests.filter((item) =>
    ["submitted", "sent_to_partner", "pending_partner", "at_partner", "quote_received"].includes(item.status)
  );
}

export function getNextRecommendedAction({ reminders = [], opportunities = [], openQuoteRequests = [] }) {
  if (reminders.length) {
    return {
      label: "Review renewal",
      detail: reminders[0].message,
    };
  }
  const available = opportunities.find((item) => item.status === "available");
  if (available) {
    return {
      label: "Compare rates",
      detail: `${policyLabelFromType(available.policyType)} may save ${formatMoney(available.estimatedSavings)}/yr.`,
    };
  }
  if (openQuoteRequests.length) {
    return {
      label: "Track quote requests",
      detail: `${openQuoteRequests.length} quote request${openQuoteRequests.length === 1 ? "" : "s"} awaiting response.`,
    };
  }
  return {
    label: "Send updated package",
    detail: "Route your latest verified COI package to active GC projects.",
  };
}

/* ---------- Formatting ---------- */

export function formatLongDate(iso) {
  const d = parseIso(iso);
  if (!d || Number.isNaN(d.getTime())) return iso || "";
  return `${MONTHS_LONG[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatShortDate(iso) {
  const d = parseIso(iso);
  if (!d || Number.isNaN(d.getTime())) return iso || "";
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

/* ---------- Activity ---------- */

function normalizeActivityItem(item) {
  if (!item || typeof item !== "object") return null;
  if (!item.id || !item.title) return null;
  return {
    ...item,
    id: String(item.id),
    title: String(item.title).trim(),
    body: String(item.body || ""),
    time: String(item.time || ""),
    createdAt: item.createdAt ? String(item.createdAt) : undefined,
  };
}

/* ---------- Storage ---------- */

function normalizeStringArray(value = []) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function normalizeTeamMember(raw) {
  return {
    ...raw,
    id: raw.id || makeId("tm"),
    name: String(raw.name || "Team member").trim(),
    email: String(raw.email || "").trim().toLowerCase(),
    role: String(raw.role || "Member").trim(),
    status: ["active", "invited", "disabled"].includes(raw.status)
      ? raw.status
      : "active",
    lastActiveAt: raw.lastActiveAt || new Date().toISOString(),
  };
}

function normalizeRole(raw) {
  const incoming = raw.permissions || {};
  return {
    ...raw,
    id: raw.id || makeId("role"),
    name: String(raw.name || "Custom role").trim(),
    description: String(raw.description || "").trim(),
    permissions: {
      vault: Boolean(incoming.vault),
      sendCoi: Boolean(incoming.sendCoi),
      manageSettings: Boolean(incoming.manageSettings),
      manageUsers: Boolean(incoming.manageUsers),
      manageBilling: Boolean(incoming.manageBilling),
      requestQuotes: Boolean(incoming.requestQuotes),
    },
  };
}

function normalizeInvoice(raw) {
  return {
    ...raw,
    id: String(raw.id || makeId("inv")).trim(),
    date: raw.date || new Date().toISOString(),
    amount: toNumber(raw.amount, 0),
    status: ["paid", "pending", "failed", "refunded"].includes(raw.status)
      ? raw.status
      : "paid",
  };
}

function normalizeSettings(value, fallback = {}, company = {}) {
  const source = value && typeof value === "object" ? value : {};
  const defaults = fallback && typeof fallback === "object" ? fallback : {};
  const userProfile = source.userProfile || {};
  const account = source.account || {};
  const companyProfile = source.companyProfile || {};
  const notifications = source.notifications || {};
  const emailPreferences = source.emailPreferences || {};
  const security = source.security || {};
  const password = source.password || {};
  const billing = source.billing || {};
  const paymentMethod = source.paymentMethod || {};
  const documentPreferences = source.documentPreferences || {};
  const emailTemplates = source.emailTemplates || {};
  const privacy = source.privacy || {};
  const dataStorage = source.dataStorage || {};
  const support = source.support || {};

  return {
    userProfile: {
      ...defaults.userProfile,
      firstName: String(userProfile.firstName ?? defaults.userProfile?.firstName ?? "").trim(),
      lastName: String(userProfile.lastName ?? defaults.userProfile?.lastName ?? "").trim(),
      jobTitle: String(userProfile.jobTitle ?? defaults.userProfile?.jobTitle ?? "").trim(),
      phone: String(userProfile.phone ?? defaults.userProfile?.phone ?? "").trim(),
      timezone: String(
        userProfile.timezone ?? defaults.userProfile?.timezone ?? "America/Los_Angeles"
      ).trim(),
      avatarColor: String(userProfile.avatarColor ?? defaults.userProfile?.avatarColor ?? "#2563eb"),
    },
    account: {
      ...defaults.account,
      workspaceName: String(
        account.workspaceName ??
          defaults.account?.workspaceName ??
          company.name ??
          "SubShield Workspace"
      ).trim(),
      loginEmail: String(
        account.loginEmail ?? defaults.account?.loginEmail ?? company.contactEmail ?? ""
      ).trim().toLowerCase(),
      language: String(account.language ?? defaults.account?.language ?? "en-US").trim(),
      dateFormat: String(
        account.dateFormat ?? defaults.account?.dateFormat ?? "MM/DD/YYYY"
      ).trim(),
      timeFormat: String(account.timeFormat ?? defaults.account?.timeFormat ?? "12h").trim(),
    },
    companyProfile: {
      ...defaults.companyProfile,
      legalName: String(
        companyProfile.legalName ?? defaults.companyProfile?.legalName ?? company.name ?? ""
      ).trim(),
      dbaName: String(companyProfile.dbaName ?? defaults.companyProfile?.dbaName ?? "").trim(),
      tradeType: String(
        companyProfile.tradeType ?? defaults.companyProfile?.tradeType ?? company.tradeType ?? ""
      ).trim(),
      state: String(companyProfile.state ?? defaults.companyProfile?.state ?? company.state ?? "").trim(),
      headquartersAddress: String(
        companyProfile.headquartersAddress ??
          defaults.companyProfile?.headquartersAddress ??
          ""
      ).trim(),
      website: String(companyProfile.website ?? defaults.companyProfile?.website ?? "").trim(),
      licenseNumber: String(
        companyProfile.licenseNumber ?? defaults.companyProfile?.licenseNumber ?? ""
      ).trim(),
      taxId: String(companyProfile.taxId ?? defaults.companyProfile?.taxId ?? "").trim(),
      revenueRange: String(
        companyProfile.revenueRange ??
          defaults.companyProfile?.revenueRange ??
          company.revenueRange ??
          ""
      ).trim(),
      employees: String(
        companyProfile.employees ?? defaults.companyProfile?.employees ?? company.employees ?? ""
      ).trim(),
    },
    notifications: {
      ...defaults.notifications,
      renewal90Day: Boolean(notifications.renewal90Day ?? defaults.notifications?.renewal90Day),
      renewal60Day: Boolean(notifications.renewal60Day ?? defaults.notifications?.renewal60Day),
      renewal30Day: Boolean(notifications.renewal30Day ?? defaults.notifications?.renewal30Day),
      renewal10Day: Boolean(notifications.renewal10Day ?? defaults.notifications?.renewal10Day),
      expirationDay: Boolean(notifications.expirationDay ?? defaults.notifications?.expirationDay),
      expiredNotice: Boolean(notifications.expiredNotice ?? defaults.notifications?.expiredNotice),
      gcSendDelivery: Boolean(notifications.gcSendDelivery ?? defaults.notifications?.gcSendDelivery),
      quoteRequestUpdates: Boolean(
        notifications.quoteRequestUpdates ?? defaults.notifications?.quoteRequestUpdates
      ),
      weeklyComplianceSnapshot: Boolean(
        notifications.weeklyComplianceSnapshot ??
          defaults.notifications?.weeklyComplianceSnapshot
      ),
      pushEnabled: Boolean(notifications.pushEnabled ?? defaults.notifications?.pushEnabled),
    },
    emailPreferences: {
      ...defaults.emailPreferences,
      complianceAlerts: Boolean(
        emailPreferences.complianceAlerts ?? defaults.emailPreferences?.complianceAlerts
      ),
      quoteUpdates: Boolean(emailPreferences.quoteUpdates ?? defaults.emailPreferences?.quoteUpdates),
      productUpdates: Boolean(
        emailPreferences.productUpdates ?? defaults.emailPreferences?.productUpdates
      ),
      billingNotices: Boolean(
        emailPreferences.billingNotices ?? defaults.emailPreferences?.billingNotices
      ),
      marketingMessages: Boolean(
        emailPreferences.marketingMessages ?? defaults.emailPreferences?.marketingMessages
      ),
      digestFrequency: String(
        emailPreferences.digestFrequency ?? defaults.emailPreferences?.digestFrequency ?? "weekly"
      ).trim(),
      defaultReplyTo: String(
        emailPreferences.defaultReplyTo ?? defaults.emailPreferences?.defaultReplyTo ?? ""
      ).trim().toLowerCase(),
      signature: String(emailPreferences.signature ?? defaults.emailPreferences?.signature ?? ""),
    },
    security: {
      ...defaults.security,
      mfaEnabled: Boolean(security.mfaEnabled ?? defaults.security?.mfaEnabled),
      ssoEnabled: Boolean(security.ssoEnabled ?? defaults.security?.ssoEnabled),
      sessionTimeoutMinutes: Math.max(
        15,
        toNumber(security.sessionTimeoutMinutes ?? defaults.security?.sessionTimeoutMinutes, 60)
      ),
      requireDeviceVerification: Boolean(
        security.requireDeviceVerification ?? defaults.security?.requireDeviceVerification
      ),
      allowPasswordLogin: Boolean(
        security.allowPasswordLogin ?? defaults.security?.allowPasswordLogin
      ),
      allowedDomains: normalizeStringArray(
        security.allowedDomains ?? defaults.security?.allowedDomains ?? []
      ),
      ipAllowlist: normalizeStringArray(security.ipAllowlist ?? defaults.security?.ipAllowlist ?? []),
    },
    password: {
      ...defaults.password,
      lastUpdatedAt:
        password.lastUpdatedAt || defaults.password?.lastUpdatedAt || new Date().toISOString(),
      minLength: Math.max(8, toNumber(password.minLength ?? defaults.password?.minLength, 10)),
      requireSymbols: Boolean(password.requireSymbols ?? defaults.password?.requireSymbols),
      requireNumbers: Boolean(password.requireNumbers ?? defaults.password?.requireNumbers),
      requireMixedCase: Boolean(password.requireMixedCase ?? defaults.password?.requireMixedCase),
    },
    teamMembers: (Array.isArray(source.teamMembers) ? source.teamMembers : defaults.teamMembers || [])
      .map(normalizeTeamMember),
    roles: (Array.isArray(source.roles) ? source.roles : defaults.roles || []).map(normalizeRole),
    billing: {
      ...defaults.billing,
      planName: String(billing.planName ?? defaults.billing?.planName ?? "Starter").trim(),
      billingCycle: String(
        billing.billingCycle ?? defaults.billing?.billingCycle ?? "monthly"
      ).trim(),
      seatCount: Math.max(1, toNumber(billing.seatCount ?? defaults.billing?.seatCount, 1)),
      seatPrice: Math.max(0, toNumber(billing.seatPrice ?? defaults.billing?.seatPrice, 0)),
      basePrice: Math.max(0, toNumber(billing.basePrice ?? defaults.billing?.basePrice, 0)),
      renewalDate: billing.renewalDate || defaults.billing?.renewalDate || dateFromToday(30),
      autoRenew: Boolean(billing.autoRenew ?? defaults.billing?.autoRenew),
      billingEmail: String(
        billing.billingEmail ?? defaults.billing?.billingEmail ?? company.contactEmail ?? ""
      ).trim().toLowerCase(),
    },
    paymentMethod: {
      ...defaults.paymentMethod,
      cardBrand: String(paymentMethod.cardBrand ?? defaults.paymentMethod?.cardBrand ?? "").trim(),
      last4: String(paymentMethod.last4 ?? defaults.paymentMethod?.last4 ?? "").replace(/\D/g, "").slice(-4),
      expMonth: String(paymentMethod.expMonth ?? defaults.paymentMethod?.expMonth ?? "").replace(/\D/g, "").slice(0, 2),
      expYear: String(paymentMethod.expYear ?? defaults.paymentMethod?.expYear ?? "").replace(/\D/g, "").slice(0, 4),
      nameOnCard: String(
        paymentMethod.nameOnCard ?? defaults.paymentMethod?.nameOnCard ?? ""
      ).trim(),
      billingZip: String(
        paymentMethod.billingZip ?? defaults.paymentMethod?.billingZip ?? ""
      ).trim(),
    },
    invoices: (Array.isArray(source.invoices) ? source.invoices : defaults.invoices || [])
      .map(normalizeInvoice),
    documentPreferences: {
      ...defaults.documentPreferences,
      defaultVisibility: String(
        documentPreferences.defaultVisibility ??
          defaults.documentPreferences?.defaultVisibility ??
          "team"
      ).trim(),
      requireVerificationBeforeSend: Boolean(
        documentPreferences.requireVerificationBeforeSend ??
          defaults.documentPreferences?.requireVerificationBeforeSend
      ),
      retainVersionHistory: Boolean(
        documentPreferences.retainVersionHistory ??
          defaults.documentPreferences?.retainVersionHistory
      ),
      retentionMonths: Math.max(
        1,
        toNumber(
          documentPreferences.retentionMonths ??
            defaults.documentPreferences?.retentionMonths,
          24
        )
      ),
      namingTemplate: String(
        documentPreferences.namingTemplate ??
          defaults.documentPreferences?.namingTemplate ??
          "{policyType}-{carrier}-{renewalDate}"
      ).trim(),
      defaultFolder: String(
        documentPreferences.defaultFolder ??
          defaults.documentPreferences?.defaultFolder ??
          "Active Policies"
      ).trim(),
    },
    emailTemplates: {
      ...defaults.emailTemplates,
      coiSubject: String(emailTemplates.coiSubject ?? defaults.emailTemplates?.coiSubject ?? ""),
      coiBody: String(emailTemplates.coiBody ?? defaults.emailTemplates?.coiBody ?? ""),
      brokerRequestSubject: String(
        emailTemplates.brokerRequestSubject ?? defaults.emailTemplates?.brokerRequestSubject ?? ""
      ),
      brokerRequestBody: String(
        emailTemplates.brokerRequestBody ?? defaults.emailTemplates?.brokerRequestBody ?? ""
      ),
      quoteFollowupSubject: String(
        emailTemplates.quoteFollowupSubject ?? defaults.emailTemplates?.quoteFollowupSubject ?? ""
      ),
      quoteFollowupBody: String(
        emailTemplates.quoteFollowupBody ?? defaults.emailTemplates?.quoteFollowupBody ?? ""
      ),
    },
    privacy: {
      ...defaults.privacy,
      profileVisibility: String(
        privacy.profileVisibility ?? defaults.privacy?.profileVisibility ?? "team_only"
      ).trim(),
      shareAnonymizedBenchmarks: Boolean(
        privacy.shareAnonymizedBenchmarks ?? defaults.privacy?.shareAnonymizedBenchmarks
      ),
      partnerLeadSharing: Boolean(
        privacy.partnerLeadSharing ?? defaults.privacy?.partnerLeadSharing
      ),
      allowAnalytics: Boolean(privacy.allowAnalytics ?? defaults.privacy?.allowAnalytics),
      cookieTracking: Boolean(privacy.cookieTracking ?? defaults.privacy?.cookieTracking),
    },
    dataStorage: {
      ...defaults.dataStorage,
      storageUsedGb: Math.max(
        0,
        toNumber(dataStorage.storageUsedGb ?? defaults.dataStorage?.storageUsedGb, 0)
      ),
      storageLimitGb: Math.max(
        1,
        toNumber(dataStorage.storageLimitGb ?? defaults.dataStorage?.storageLimitGb, 50)
      ),
      backupFrequency: String(
        dataStorage.backupFrequency ?? defaults.dataStorage?.backupFrequency ?? "daily"
      ).trim(),
      exportFormat: String(
        dataStorage.exportFormat ?? defaults.dataStorage?.exportFormat ?? "zip_pdf_csv"
      ).trim(),
      retentionDays: Math.max(
        30,
        toNumber(dataStorage.retentionDays ?? defaults.dataStorage?.retentionDays, 2555)
      ),
      auditLogRetentionDays: Math.max(
        30,
        toNumber(
          dataStorage.auditLogRetentionDays ?? defaults.dataStorage?.auditLogRetentionDays,
          3650
        )
      ),
    },
    support: {
      ...defaults.support,
      preferredContactMethod: String(
        support.preferredContactMethod ?? defaults.support?.preferredContactMethod ?? "email"
      ).trim(),
      supportEmail: String(support.supportEmail ?? defaults.support?.supportEmail ?? "").trim(),
      supportPhone: String(support.supportPhone ?? defaults.support?.supportPhone ?? "").trim(),
      helpCenterUrl: String(support.helpCenterUrl ?? defaults.support?.helpCenterUrl ?? "").trim(),
      statusPageUrl: String(support.statusPageUrl ?? defaults.support?.statusPageUrl ?? "").trim(),
      onboardingCallEnabled: Boolean(
        support.onboardingCallEnabled ?? defaults.support?.onboardingCallEnabled
      ),
    },
  };
}

function normalizeContractor(raw) {
  return {
    ...raw,
    id: raw.id || makeId("gc"),
    name: raw.name || "General Contractor",
    initials: raw.initials || deriveInitials(raw.name || ""),
    contact: raw.contact || "",
    email: raw.email || "",
    phone: raw.phone || "",
    delivery: raw.delivery || "Compliance inbox",
    holder: raw.holder || "",
    requirements: raw.requirements || "Standard verified COI package accepted.",
    notes: raw.notes || "",
    portalInstructions: raw.portalInstructions || "",
    projects: Array.isArray(raw.projects) ? raw.projects.filter(Boolean) : [],
    pastSends: Array.isArray(raw.pastSends) ? raw.pastSends : [],
  };
}

function normalizeBroker(raw, companyId) {
  return {
    ...raw,
    id: raw.id || makeId("broker"),
    companyId: raw.companyId || companyId,
    name: raw.name || "Broker contact",
    company: raw.company || "",
    email: raw.email || "",
    phone: raw.phone || "",
    policyTypes: Array.isArray(raw.policyTypes) ? raw.policyTypes : [],
    notes: raw.notes || "",
  };
}

function normalizePartner(raw) {
  return {
    ...raw,
    id: raw.id || makeId("partner"),
    name: raw.name || "Insurance partner",
    type: raw.type || "broker",
    statesServed: Array.isArray(raw.statesServed) ? raw.statesServed : [],
    policyTypes: Array.isArray(raw.policyTypes) ? raw.policyTypes : [],
    tradeTypes: Array.isArray(raw.tradeTypes) ? raw.tradeTypes : [],
    contactMethod: raw.contactMethod || "email",
    commissionModel: raw.commissionModel || "referral",
    active: typeof raw.active === "boolean" ? raw.active : true,
  };
}

function isValidDataShape(value) {
  return Boolean(
    value &&
      Array.isArray(value.policies) &&
      Array.isArray(value.contractors) &&
      Array.isArray(value.activity)
  );
}

export function readStoredData(fallback) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    if (!isValidDataShape(parsed)) return fallback;

    const company = parsed.company || fallback.company;
    const companyId = company?.id || "subshield-tile-co";
    const policies = normalizePolicies(
      parsed.policies?.length ? parsed.policies : fallback.policies,
      companyId
    );
    const contractors = (parsed.contractors?.length ? parsed.contractors : fallback.contractors)
      .map(normalizeContractor);
    const activity = (parsed.activity || [])
      .map(normalizeActivityItem)
      .filter(Boolean);
    const brokers = (parsed.brokers?.length ? parsed.brokers : fallback.brokers || [])
      .map((broker) => normalizeBroker(broker, companyId));
    const partners = (parsed.partners?.length ? parsed.partners : fallback.partners || [])
      .map(normalizePartner);
    const savingsOpportunities = normalizeSavingsList(
      parsed.savingsOpportunities?.length
        ? parsed.savingsOpportunities
        : fallback.savingsOpportunities || [],
      policies,
      companyId
    );
    const quoteRequests = normalizeQuoteRequests(
      parsed.quoteRequests?.length ? parsed.quoteRequests : fallback.quoteRequests || [],
      companyId
    );
    const settings = normalizeSettings(parsed.settings, fallback.settings || {}, company);
    const documents = normalizeDocuments(
      parsed.documents?.length ? parsed.documents : fallback.documents || []
    );

    return {
      ...fallback,
      ...parsed,
      company,
      policies,
      contractors,
      activity: activity.length ? activity : fallback.activity,
      brokers,
      partners,
      savingsOpportunities,
      quoteRequests,
      coiSends: Array.isArray(parsed.coiSends) ? parsed.coiSends : fallback.coiSends || [],
      documents,
      settings,
    };
  } catch {
    return fallback;
  }
}

export function writeStoredData(data) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage can fail in private mode. Keep the app usable.
  }
}

export function clearStoredData() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/* ---------- Initials ---------- */

export function deriveInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/* ---------- Clipboard ---------- */

export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to fallback
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

