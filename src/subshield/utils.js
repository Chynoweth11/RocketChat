/**
 * Utilities for SubShield.
 * Pure functions only - no React, no DOM beyond localStorage / clipboard.
 */

export const STORAGE_KEY = "subshield.complete.v3";

export const RENEWAL_REMINDER_DAYS = [90, 60, 30, 10, 0];

const POLICY_TYPE_NAMES = {
  liability: "General Liability",
  workers: "Workers' Compensation",
  auto: "Commercial Auto",
  umbrella: "Umbrella / Excess Liability",
  license: "Trade License",
  pollution: "Pollution Liability",
  professional: "Professional Liability",
  tools: "Tools & Equipment",
  builders_risk: "Builder's Risk",
  bonding: "Bonding",
};

const DEFAULT_POLICY_LIMITS = {
  liability: "$2M aggregate / $1M occurrence",
  workers: "Statutory / $1M employer liability",
  auto: "$1M combined single limit",
  umbrella: "$2M excess liability",
  license: "Trade contractor license",
  pollution: "$1M pollution liability",
  professional: "$1M professional liability",
  tools: "$150k scheduled tools",
  builders_risk: "$500k project limit",
  bonding: "$500k bond capacity",
};

const DAY_BUCKETS = ["Today", "Yesterday"];

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
  sent_to_partner: "Sent to partner",
  quote_received: "Quote received",
  accepted: "Accepted",
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
  return d.toISOString().slice(0, 10);
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

/* ---------- Policy helpers ---------- */

export function policyLabelFromType(type) {
  return POLICY_TYPE_NAMES[type] || "Insurance Policy";
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

export function getStatus(days) {
  if (days <= 10) return { label: "Critical", className: "danger" };
  if (days <= 30) return { label: "Expiring", className: "warning" };
  return { label: "Active", className: "success" };
}

export function scoreClass(score) {
  if (score >= 85) return "success";
  if (score >= 65) return "warning";
  return "danger";
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

export function totalTrackedPremium(policies = []) {
  return policies.reduce((sum, policy) => sum + toNumber(policy.premiumAmount ?? policy.premium, 0), 0);
}

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

/* ---------- Savings & quotes ---------- */

export function normalizeSavingsOpportunity(raw, policies = [], companyId = "subshield-tile-co") {
  const policy = policies.find((item) => item.id === raw.policyId);
  const policyType = raw.policyType || policy?.policyType || "liability";
  const renewalDate = raw.renewalDate || policy?.renewalDate || dateFromToday(30);
  const currentPremium = toNumber(
    raw.currentPremium ?? policy?.premiumAmount ?? policy?.premium,
    0
  );
  const estimatedSavings = toNumber(raw.estimatedSavings, Math.round(currentPremium * 0.12));
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
    ["submitted", "sent_to_partner", "quote_received"].includes(item.status)
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

function getDayDifference(isoDateTime) {
  const parsed = new Date(isoDateTime);
  if (Number.isNaN(parsed.getTime())) return null;
  const today = startOfLocalDay(new Date());
  const day = startOfLocalDay(parsed);
  return Math.round((today - day) / 86400000);
}

function bucketFromLegacyTime(value) {
  const time = (value || "").toLowerCase();
  if (time === "just now" || time === "today") return "Today";
  if (time === "yesterday" || time === "1 day ago") return "Yesterday";
  return "Earlier";
}

export function formatActivityTime(item) {
  if (item?.createdAt) {
    const dayDiff = getDayDifference(item.createdAt);
    if (dayDiff === 0) return "Today";
    if (dayDiff === 1) return "Yesterday";
    if (dayDiff > 1) return `${dayDiff} days ago`;
  }
  return item?.time || "Just now";
}

export function groupActivityByDate(activity = []) {
  const groups = { Today: [], Yesterday: [], Earlier: [] };

  activity.forEach((item) => {
    const dayDiff = item?.createdAt ? getDayDifference(item.createdAt) : null;
    if (dayDiff === 0) {
      groups.Today.push(item);
    } else if (dayDiff === 1) {
      groups.Yesterday.push(item);
    } else {
      const fallbackBucket = bucketFromLegacyTime(item?.time);
      groups[fallbackBucket].push(item);
    }
  });

  return [...DAY_BUCKETS, "Earlier"]
    .map((label) => ({ label, items: groups[label] }))
    .filter((group) => group.items.length > 0);
}

/* ---------- Storage ---------- */

function normalizePreferences(value, fallback = {}) {
  const defaults = {
    alerts: typeof fallback.alerts === "boolean" ? fallback.alerts : true,
    routing: typeof fallback.routing === "boolean" ? fallback.routing : true,
    autoshop: typeof fallback.autoshop === "boolean" ? fallback.autoshop : false,
  };

  if (!value || typeof value !== "object") return defaults;

  return {
    alerts: typeof value.alerts === "boolean" ? value.alerts : defaults.alerts,
    routing: typeof value.routing === "boolean" ? value.routing : defaults.routing,
    autoshop: typeof value.autoshop === "boolean" ? value.autoshop : defaults.autoshop,
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

    return {
      ...fallback,
      ...parsed,
      company,
      policies,
      contractors,
      activity: activity.length ? activity : fallback.activity,
      preferences: normalizePreferences(parsed.preferences, fallback.preferences || {}),
      brokers,
      partners,
      savingsOpportunities,
      quoteRequests,
      coiSends: Array.isArray(parsed.coiSends) ? parsed.coiSends : fallback.coiSends || [],
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
