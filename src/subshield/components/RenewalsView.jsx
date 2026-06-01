import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CalendarClock, FileSpreadsheet, Search } from "lucide-react";
import { formatLongDate, formatMoney, getStatus } from "../utils.js";
import { Section } from "./Layout.jsx";

function exportRenewalsCsv(policies) {
  const header = ["Policy","Carrier","Policy Number","Renewal Date","Days Remaining","Status","Annual Premium"];
  const rows = policies.map((policy) => [
    policy.name,
    policy.carrier,
    policy.policyNumber,
    formatLongDate(policy.renewalDate || policy.expires),
    policy.daysRemaining ?? "",
    getStatus(policy.daysRemaining).label,
    policy.premiumAmount ?? policy.premium ?? 0,
  ].map((cell) => `"${String(cell).replace(/"/g, '""')}"`));
  const csv = [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "renewal-schedule.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const RENEWAL_FILTERS = [
  { id: "all", label: "All renewals" },
  { id: "critical", label: "Critical (10d)" },
  { id: "soon", label: "Next 30 days" },
  { id: "quarter", label: "Next 90 days" },
];

export default function RenewalsView({
  policies,
  reminders,
  totalPremium,
  onOpenPolicies,
  onReviewSavings,
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const orderedPolicies = useMemo(
    () =>
      [...policies]
        .filter((policy) => (policy.policyType || policy.type) !== "license")
        .sort((a, b) => (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999)),
    [policies]
  );

  const filteredPolicies = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orderedPolicies.filter((policy) => {
      const days = policy.daysRemaining ?? 9999;
      const matchesQuery =
        !q ||
        policy.name.toLowerCase().includes(q) ||
        policy.carrier.toLowerCase().includes(q) ||
        policy.policyNumber.toLowerCase().includes(q);

      if (!matchesQuery) return false;
      if (filter === "critical") return days <= 10;
      if (filter === "soon") return days <= 30;
      if (filter === "quarter") return days <= 90;
      return true;
    });
  }, [orderedPolicies, query, filter]);

  const critical = orderedPolicies.filter((policy) => (policy.daysRemaining ?? 9999) <= 10);
  const due30 = orderedPolicies.filter((policy) => (policy.daysRemaining ?? 9999) <= 30);

  return (
    <div className="ss-grid">
      <section className="ss-card ss-span">
        <div className="ss-renewals-head">
          <div>
            <span className="ss-eyebrow">Renewal center</span>
            <h2>{due30.length} renewal{due30.length === 1 ? "" : "s"} due in 30 days</h2>
            <p>
              Keep coverage active by reviewing expiring policies, updating documents, and
              requesting quote comparisons before renewal.
            </p>
          </div>
          <div className="ss-row">
            <button type="button" className="ss-button soft" onClick={onOpenPolicies}>
              View policies
            </button>
            <button type="button" className="ss-button" onClick={onReviewSavings}>
              Lower my insurance
            </button>
          </div>
        </div>

        <div className="ss-renewals-metrics">
          <Metric label="Total annual premium" value={`${formatMoney(totalPremium)}/yr`} />
          <Metric label="Policies tracked" value={orderedPolicies.length} />
          <Metric label="Critical renewals" value={critical.length} />
          <Metric label="Reminder events" value={reminders.length} />
        </div>
      </section>

      <section className="ss-card">
        <Section
          title="Upcoming renewals"
          sub={`${filteredPolicies.length} policy${filteredPolicies.length === 1 ? "" : "ies"}`}
          extra={
            orderedPolicies.length > 0 ? (
              <button
                type="button"
                className="ss-copy-btn"
                onClick={() => exportRenewalsCsv(orderedPolicies)}
                title="Export renewal schedule as CSV"
              >
                <FileSpreadsheet size={13} /> Export
              </button>
            ) : null
          }
        />

        <div className="ss-search">
          <Search size={16} className="ss-search-icon" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search policy, carrier, or number..."
            aria-label="Search renewals"
          />
        </div>

        <div className="ss-chip-group">
          {RENEWAL_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`ss-chip ${filter === item.id ? "active" : ""}`}
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {filteredPolicies.length === 0 && (
          <div className="ss-empty" style={{ minHeight: 160 }}>
            <CalendarClock size={28} />
            <h2>No matching renewals</h2>
            <p>Try a different search or filter to see your renewal schedule.</p>
          </div>
        )}

        {filteredPolicies.map((policy) => {
          const status = getStatus(policy.daysRemaining);
          return (
            <div className="ss-renewal-row" key={policy.id}>
              <div>
                <b>{policy.name}</b>
                <small>
                  {policy.carrier} | {policy.policyNumber}
                </small>
              </div>
              <div className="ss-renewal-meta">
                <span>{formatLongDate(policy.renewalDate || policy.expires)}</span>
                <em className={`ss-status ${status.className}`}>{policy.daysRemaining}d</em>
              </div>
            </div>
          );
        })}
      </section>

      <section className="ss-card">
        <Section title="Renewal reminders" sub="Scheduled alerts for every policy cycle" />
        <div className="ss-renewal-steps">
          {["90 days", "60 days", "30 days", "10 days", "Expiration day"].map((step) => (
            <div className="ss-renewal-step" key={step}>
              <span>{step}</span>
              <small>Reminder active</small>
            </div>
          ))}
        </div>

        {critical.length > 0 && (
          <div className="ss-note danger" style={{ marginTop: 14 }}>
            <AlertTriangle size={16} />
            <span>
              {critical.length} polic{critical.length === 1 ? "y is" : "ies are"} inside a critical
              renewal window. Start review now.
            </span>
          </div>
        )}

        <div className="ss-renewal-action">
          <b>Coverage review partners are ready.</b>
          <p>Route expiring policies to licensed insurance partners to compare options.</p>
          <button type="button" className="ss-copy-btn" onClick={onReviewSavings}>
            Open Lower My Insurance <ArrowRight size={13} />
          </button>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="ss-info">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
