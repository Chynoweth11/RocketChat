import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeDollarSign,
  CalendarClock,
  Check,
  Download,
  FileSpreadsheet,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Upload,
  Zap,
} from "lucide-react";
import { policyIcon } from "../icons.js";
import {
  formatDeductible,
  formatLongDate,
  formatMoney,
  formatShortDate,
  getStatus,
  policyHealthScore,
  scoreClass,
  timeAgo,
} from "../utils.js";
import { Section, Info, Spinner } from "./Layout.jsx";
import ScoreRing from "./ScoreRing.jsx";

function exportPoliciesCsv(policies) {
  const header = ["Policy","Type","Carrier","Policy Number","Annual Premium","Deductible","Coverage Limit","Effective Date","Renewal Date","Days Remaining","Status"];
  const rows = policies.map((policy) => [
    policy.name,
    policy.policyType || policy.type,
    policy.carrier,
    policy.policyNumber,
    policy.premiumAmount ?? policy.premium ?? 0,
    formatDeductible(policy.deductible),
    policy.coverageLimits || policy.limit || "",
    formatLongDate(policy.effectiveDate),
    formatLongDate(policy.renewalDate || policy.expires),
    policy.daysRemaining ?? "",
    getStatus(policy.daysRemaining).label,
  ].map((cell) => `"${String(cell).replace(/"/g, '""')}"`));
  const csv = [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "policies.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const FILTERS = [
  { id: "all", label: "All policies" },
  { id: "danger", label: "Critical" },
  { id: "warning", label: "Expiring soon" },
  { id: "success", label: "Active" },
];

export default function PoliciesView({
  score,
  docs,
  critical,
  policies,
  totalPremium,
  upcoming = [],
  reminders = [],
  selectedPolicy,
  onSelectPolicy,
  onRenew,
  onSend,
  onUpload,
  onAddPolicy,
  onFindSavings,
  renewingId,
  carrierConnections = {},
  onManageConnections,
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const filteredPolicies = useMemo(() => {
    const q = query.trim().toLowerCase();
    return policies.filter((policy) => {
      const status = getStatus(policy.daysRemaining).className;
      const matchesFilter = filter === "all" || status === filter;
      const matchesQuery =
        !q ||
        policy.name.toLowerCase().includes(q) ||
        policy.carrier.toLowerCase().includes(q) ||
        policy.policyNumber.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [policies, query, filter]);

  const selectedInFiltered = selectedPolicy
    ? filteredPolicies.some((policy) => policy.id === selectedPolicy.id)
    : false;
  const policyForDetail = selectedInFiltered
    ? selectedPolicy
    : filteredPolicies[0] || selectedPolicy;

  return (
    <div className="ss-grid ss-policies-grid">
      <section className="ss-card ss-span">
        <div className="ss-hero">
          <div>
            <span className="ss-eyebrow">
              {critical.length ? "Action needed" : "Coverage healthy"}
            </span>
            <h2>{policies.length} policies tracked</h2>
            <p>
              Every policy, premium, deductible, and renewal date in one place.
              Add coverage, upload documents, and act on renewals without digging
              through email.
            </p>
            <div className="ss-row">
              <button type="button" className="ss-button" onClick={onAddPolicy}>
                <Plus size={16} /> Add policy
              </button>
              <button type="button" className="ss-button soft" onClick={onUpload}>
                <Upload size={16} /> Upload document
              </button>
              <button type="button" className="ss-button soft" onClick={onSend}>
                <Send size={16} /> Send certificate
              </button>
              {policies.length > 0 && (
                <button type="button" className="ss-button soft" onClick={() => exportPoliciesCsv(policies)} title="Export all policies as CSV">
                  <FileSpreadsheet size={16} /> Export CSV
                </button>
              )}
            </div>
          </div>
          <ScoreRing value={score} />
        </div>

        <div className="ss-command-metrics">
          <Info label="Policies tracked" value={policies.length} />
          <Info label="Tracked premium" value={`${formatMoney(totalPremium)}/yr`} />
          <Info label="Critical" value={critical.length} />
          <Info label="Verified files" value={docs} />
        </div>
      </section>

      <div className="ss-policies-body">
        <section className="ss-card ss-policies-list">
          <Section
            title="Policy list"
            sub={`${filteredPolicies.length} ${filteredPolicies.length === 1 ? "policy" : "policies"} shown`}
          />

          {policies.length > 0 && (
            <>
              <div className="ss-search">
                <Search size={16} className="ss-search-icon" aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by policy, carrier, or number..."
                  aria-label="Search policies"
                />
              </div>

              <div className="ss-chip-group">
                {FILTERS.map((item) => (
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
            </>
          )}

          {filteredPolicies.length === 0 && (
            <div className="ss-empty" style={{ minHeight: 170 }}>
              <Search size={28} />
              <h2>No matching policies</h2>
              <p>Try a different search or filter to find the policy you need.</p>
            </div>
          )}

          {filteredPolicies.map((policy) => (
            <PolicyRow
              key={policy.id}
              policy={policy}
              selected={policyForDetail && policy.id === policyForDetail.id}
              onClick={() => onSelectPolicy(policy.id)}
            />
          ))}
        </section>

        <div className="ss-policies-content">
          <section className="ss-card ss-policies-detail">
            {policyForDetail ? (
              <PolicyDetail
                policy={policyForDetail}
                onRenew={() => onRenew(policyForDetail.id)}
                onFindSavings={() => onFindSavings(policyForDetail.id)}
                onSend={onSend}
                isRenewing={renewingId === policyForDetail.id}
                carrierConnections={carrierConnections}
                onManageConnections={onManageConnections}
              />
            ) : (
              <div className="ss-empty" style={{ minHeight: 220 }}>
                <AlertTriangle size={28} />
                <h2>No policy selected</h2>
                <p>Add or select a policy to view full coverage details.</p>
              </div>
            )}
          </section>

          {upcoming.length > 0 && (
            <section className="ss-card">
              <Section
                title="Renewal timeline"
                sub="Policies ordered by urgency. Take action before the critical window."
                extra={<CalendarClock size={16} style={{ color: "var(--muted)" }} />}
              />
              <div className="ss-renewal-grid">
                {upcoming.map((policy) => {
                  const status = getStatus(policy.daysRemaining);
                  return (
                    <button
                      key={policy.id}
                      type="button"
                      className="ss-renewal-card"
                      onClick={() => onSelectPolicy(policy.id)}
                    >
                      <div className="ss-renewal-header">
                        <span className={`ss-status ${status.className}`}>{status.label}</span>
                        <b className="ss-renewal-days">{policy.daysRemaining}d</b>
                      </div>
                      <b>{policy.name}</b>
                      <small>{policy.carrier}</small>
                      <div className="ss-renewal-meta">
                        <span>{formatShortDate(policy.renewalDate || policy.expires)}</span>
                        <span>{formatMoney(policy.premiumAmount ?? policy.premium)}/yr</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function PolicyRow({ policy, selected, onClick }) {
  const Icon = policyIcon(policy.type);
  const status = getStatus(policy.daysRemaining);
  return (
    <button
      type="button"
      className={`ss-policy ${selected ? "selected" : ""}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      <span className="ss-icon-tile" aria-hidden="true">
        <Icon size={20} />
      </span>
      <span className="ss-policy-copy">
        <b>{policy.name}</b>
        <small>
          {policy.carrier} · {formatMoney(policy.premiumAmount ?? policy.premium)}/yr · {policy.daysRemaining}d left
        </small>
      </span>
      <div className="ss-policy-meta">
        <span className={`ss-policy-status ${status.className}`}>
          <i className="ss-policy-status-dot" aria-hidden="true" />
          {status.label}
        </span>
      </div>
    </button>
  );
}

function PolicyDetail({
  policy,
  onRenew,
  onFindSavings,
  onSend,
  isRenewing,
  carrierConnections = {},
  onManageConnections,
}) {
  const [showChecks, setShowChecks] = useState(false);
  const verifiedCarrierId = Object.keys(carrierConnections).find((id) =>
    policy.carrier?.toLowerCase().includes(id)
  );
  const Icon = policyIcon(policy.type);
  const status = getStatus(policy.daysRemaining);
  const cls = status.className;
  const notLicense = (policy.type || policy.policyType) !== "license";
  const health = policyHealthScore(policy);
  const hcls = scoreClass(health.score);
  const premium = formatMoney(policy.premiumAmount ?? policy.premium);
  const urgent = cls === "danger" || cls === "warning";

  // One clear primary action, ordered by what matters in this policy's state.
  const renewAction = {
    key: "renew",
    label: isRenewing ? "Renewing…" : "Renew now",
    Icon: Zap,
    onClick: onRenew,
    disabled: isRenewing,
  };
  const sendAction = { key: "send", label: "Send certificate", Icon: Send, onClick: onSend };
  const saveAction = notLicense
    ? { key: "save", label: "Find savings", Icon: BadgeDollarSign, onClick: onFindSavings }
    : null;
  const actions = (urgent
    ? [renewAction, saveAction, sendAction]
    : [sendAction, saveAction, renewAction]
  ).filter(Boolean);

  const facts = [
    ["Premium", `${premium}/yr`],
    ["Deductible", formatDeductible(policy.deductible)],
    ["Coverage limit", policy.coverageLimits || policy.limit || "—"],
    [
      "Term",
      `${formatLongDate(policy.effectiveDate)} – ${formatLongDate(
        policy.expirationDate || policy.expires
      )}`,
    ],
    ["Documents", `${policy.documents.length} on file`],
    ["Advisor", policy.brokerId ? "Assigned" : "Not assigned"],
  ];

  return (
    <div className="ss-pd">
      {/* Executive overview */}
      <div className="ss-pd-head">
        <span className="ss-pd-icon" aria-hidden="true">
          <Icon size={20} />
        </span>
        <div className="ss-pd-head-copy">
          <h2>{policy.name}</h2>
          <small>
            {policy.carrier} · {policy.policyNumber}
          </small>
        </div>
        <span className={`ss-pdx-status ${cls}`}>
          <i className="ss-pdx-status-dot" aria-hidden="true" />
          {status.label}
        </span>
      </div>

      <div className="ss-pdx-meta">
        <span className={`ss-pdx-renews ${cls}`}>
          Renews in {policy.daysRemaining} day{policy.daysRemaining === 1 ? "" : "s"}
          <span className="ss-pdx-renews-date">
            {" · "}
            {formatLongDate(policy.renewalDate || policy.expires)}
          </span>
        </span>
        <span className="ss-pdx-prem">{premium}/yr</span>
      </div>

      {verifiedCarrierId ? (
        <span className="ss-pd-verified">
          <ShieldCheck size={12} /> Carrier verified · synced{" "}
          {timeAgo(carrierConnections[verifiedCarrierId].syncedAt)}
        </span>
      ) : (
        <button type="button" className="ss-pd-link" onClick={onManageConnections}>
          Connect carrier for real-time verification
        </button>
      )}

      {/* One clear primary action */}
      <div className="ss-pd-actions">
        {actions.map((action, index) => {
          const ActionIcon = action.Icon;
          return (
            <button
              key={action.key}
              type="button"
              className={`ss-button${index === 0 ? "" : " soft"}`}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.key === "renew" && isRenewing ? <Spinner /> : <ActionIcon size={16} />}{" "}
              {action.label}
            </button>
          );
        })}
      </div>

      {/* Key facts — airy, boxless */}
      <dl className="ss-pdx-facts">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      {/* Health — typographic summary */}
      <div className="ss-pdx-health">
        <span className="ss-eyebrow">Policy health</span>
        <div className="ss-pdx-health-row">
          <span className={`ss-pdx-score ${hcls}`}>
            {health.score}
            <i>/100</i>
          </span>
          <span className="ss-pdx-grade">{health.grade}</span>
        </div>
        <div className="ss-pdx-points">
          {health.issues.length === 0 ? (
            <div className="ss-pdx-point good">All checks passed</div>
          ) : (
            health.issues.map((item) => (
              <div key={item} className="ss-pdx-point issue">
                {item}
              </div>
            ))
          )}
          {health.good.length > 0 && (
            <>
              <button
                type="button"
                className="ss-pd-link ss-pdx-health-toggle"
                onClick={() => setShowChecks((value) => !value)}
              >
                {showChecks
                  ? "Hide completed checks"
                  : `Show ${health.good.length} completed check${
                      health.good.length === 1 ? "" : "s"
                    }`}
              </button>
              {showChecks &&
                health.good.map((item) => (
                  <div key={item} className="ss-pdx-point good">
                    {item}
                  </div>
                ))}
            </>
          )}
        </div>
      </div>

      {/* Documents */}
      <div className="ss-pd-section">
        <div className="ss-pd-section-head">
          <b>Documents on file</b>
          <small>
            {policy.documents.length} file{policy.documents.length === 1 ? "" : "s"}
          </small>
        </div>
        {policy.documents.length === 0 ? (
          <div className="ss-note">
            <AlertTriangle size={15} />
            <span>No documents stored yet. Upload the declarations page to keep certificates ready.</span>
          </div>
        ) : (
          <div className="ss-pd-docs">
            {policy.documents.map((doc) => (
              <div className="ss-pd-doc" key={doc}>
                <span className="ss-pd-doc-pdf" aria-hidden="true">
                  PDF
                </span>
                <span className="ss-pd-doc-name">{doc}</span>
                <Check size={14} className="ss-pd-doc-check" aria-hidden="true" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Secondary, de-emphasized */}
      <div className="ss-pd-secondary">
        <button
          type="button"
          className="ss-pd-link ss-pd-summary"
          onClick={() => downloadPolicySummary(policy)}
        >
          <Download size={14} /> Download one-page summary
        </button>
      </div>
    </div>
  );
}

function downloadPolicySummary(policy) {
  const lines = [
    "SubShield Policy Client Summary",
    "==================================",
    `Policy: ${policy.name}`,
    `Carrier: ${policy.carrier}`,
    `Policy number: ${policy.policyNumber}`,
    `Term: ${formatLongDate(policy.effectiveDate)} - ${formatLongDate(
      policy.expirationDate || policy.expires
    )}`,
    `Annual premium: ${formatMoney(policy.premiumAmount ?? policy.premium)}`,
    `Deductible: ${formatDeductible(policy.deductible)}`,
    `Coverage limit: ${policy.coverageLimits || policy.limit}`,
    `Renews: ${formatLongDate(policy.renewalDate || policy.expires)}`,
    `Documents on file: ${policy.documents.join(", ") || "None"}`,
    "",
    `Generated ${new Date().toLocaleString()}`,
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${policy.policyNumber || policy.name}-summary.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
