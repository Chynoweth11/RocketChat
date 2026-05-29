/**
 * Utilities for SubShield.
 * Pure functions only — no React, no DOM beyond localStorage / clipboard.
 */

export const STORAGE_KEY = "subshield.complete.v2";


/* ---------- Storage ---------- */

function isValidDataShape(value) {
  return Boolean(
    value &&
      Array.isArray(value.policies) &&
      Array.isArray(value.contractors) &&
      Array.isArray(value.activity)
  );
}

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

function normalizeActivityItem(item) {
  if (!item || typeof item !== "object") return null;
  if (!item.id || !item.title) return null;
  return {
    ...item,
    title: String(item.title).trim(),
    body: String(item.body || ""),
    time: String(item.time || ""),
    createdAt: item.createdAt ? String(item.createdAt) : undefined,
  };
}

export function readStoredData(fallback) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    if (!isValidDataShape(parsed)) return fallback;

    const activity = parsed.activity
      .map(normalizeActivityItem)
      .filter(Boolean);
    const fallbackPreferences = fallback.preferences || {};

    return {
      ...fallback,
      ...parsed,
      policies: parsed.policies.length ? parsed.policies : fallback.policies,
      contractors: parsed.contractors.length
        ? parsed.contractors
        : fallback.contractors,
      activity: activity.length ? activity : fallback.activity,
      preferences: normalizePreferences(parsed.preferences, fallbackPreferences),
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


/* ---------- Status & scoring ---------- */

export function getStatus(days) {
  if (days <= 10) return { label: "Critical", className: "danger" };
  if (days <= 30) return { label: "Expiring", className: "warning" };
  return { label: "Active", className: "success" };
}

export function getComplianceScore(policies = []) {
  if (!policies.length) return 0;

  const total = policies.reduce((sum, policy) => {
    if (policy.daysRemaining >= 90) return sum + 100;
    if (policy.daysRemaining >= 45) return sum + 84;
    if (policy.daysRemaining >= 30) return sum + 70;
    if (policy.daysRemaining >= 10) return sum + 48;
    return sum + 18;
  }, 0);

  return Math.round(total / policies.length);
}

export function scoreClass(score) {
  if (score >= 85) return "success";
  if (score >= 65) return "warning";
  return "danger";
}

export function getUpcomingRenewals(policies = [], limit = 3) {
  return [...policies]
    .filter((p) => p.type !== "license")
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, limit);
}


/* ---------- Formatting ---------- */

export function formatMoney(value) {
  return `$${Number(value || 0).toLocaleString()}`;
}

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function parseIso(iso) {
  if (!iso) return null;
  // ISO YYYY-MM-DD — parse without timezone shift
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return new Date(iso);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

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

/** Returns an ISO date (YYYY-MM-DD) `days` from today. */
export function dateFromToday(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}


/* ---------- Package helpers ---------- */

export function packagePolicies(policies = []) {
  return policies.filter((policy) => policy.type !== "license");
}

export function countDocuments(policies = []) {
  return policies.reduce(
    (sum, policy) => sum + (policy.documents?.length || 0),
    0
  );
}


/* ---------- Activity grouping ---------- */

const DAY_BUCKETS = ["Today", "Yesterday"];

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
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


/* ---------- Initials & ids ---------- */

export function deriveInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function makeId(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
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
