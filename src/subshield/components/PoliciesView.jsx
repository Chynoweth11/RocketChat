import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeDollarSign,
  CalendarClock,
  Check,
  CheckCircle2,
  Download,
  FileCheck2,
  FileSpreadsheet,
  LifeBuoy,
  Plus,
  Search,
  Send,
  Shield,
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
import { Section, Info, Spinner } from "./Layout.jsx";
import ScoreRing from "./ScoreRing.jsx";

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
        <section className="ss-card ss-span">
          <Section
            title="Renewal timeline"
            sub="Policies ordered by urgency — take action before the critical window"
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
  );
}

function PolicyRow({ policy, selected, onClick }) {
  const Icon = policyIcon(policy.type);
  const status = getStatus(policy.daysRemaining);
  const health = policyHealthScore(policy);
  const hClass = scoreClass(health.score);
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
          {policy.carrier} | {formatMoney(policy.premiumAmount ?? policy.premium)}/yr
          {" · "}{policy.daysRemaining}d left
        </small>
      </span>
      <div className="ss-policy-meta">
        <em className={`ss-status ${status.className}`}>{status.label}</em>
        <span
          className={`ss-policy-health-dot ${hClass}`}
          title={`Health: ${health.score}/100 — ${health.grade}`}
          aria-label={`Health score ${health.score}`}
        />
      </div>
    </button>
  );
}

function PolicyDetail({ policy, onRenew, onFindSavings, onSend, isRenewing, carrierConnections = {}, onManageConnections }) {
  const verifiedCarrierId = Object.keys(carrierConnections).find((id) =>
    policy.carrier?.toLowerCase().includes(id)
  );
  const Icon = policyIcon(policy.type);
  const status = getStatus(policy.daysRemaining);
  const width = `${Math.max(0, Math.min(100, (policy.daysRemaining / 180) * 100))}%`;
  const isCritical = status.className === "danger";
  const notLicense = (policy.type || policy.policyType) !== "license";
  const health = policyHealthScore(policy);

  return (
    <div className="ss-detail">
      <div className="ss-detail-head">
        <span className="ss-icon-tile" aria-hidden="true">
          <Icon size={22} />
        </span>
        <div className="ss-detail-head-copy">
          <span className="ss-eyebrow">Policy detail</span>
          <h2>{policy.name}</h2>
          <p className="ss-muted">
            {policy.carrier} | {policy.policyNumber}
          </p>
          {verifiedCarrierId ? (
            <span className="ss-carrier-verified-badge">
              <ShieldCheck size={12} /> Carrier verified · synced {timeAgo(carrierConnections[verifiedCarrierId].syncedAt)}
            </span>
          ) : (
            <button type="button" className="ss-link-btn" style={{ fontSize: 12, marginTop: 2 }} onClick={onManageConnections}>
              Connect carrier for real-time verification →
            </button>
          )}
        </div>
        <em className={`ss-status ${status.className}`}>{status.label}</em>
      </div>

      <div className="ss-bar-top">
        <span>{policy.daysRemaining} days left</span>
        <span>
          {formatMoney(policy.premiumAmount ?? policy.premium)}/
          {policy.premiumFrequency || "annual"}
        </span>
      </div>
      <div className="ss-bar">
        <span className={status.className} style={{ width }} />
      </div>

      <div className="ss-info-grid">
        <Info label="Annual premium" value={`${formatMoney(policy.premiumAmount ?? policy.premium)}`} />
        <Info label="Deductible" value={formatDeductible(policy.deductible)} />
        <Info label="Coverage limit" value={policy.coverageLimits || policy.limit} />
        <Info
          label="Term"
          value={`${formatLongDate(policy.effectiveDate)} - ${formatLongDate(
            policy.expirationDate || policy.expires
          )}`}
        />
        <Info label="Documents" value={`${policy.documents.length} on file`} />
        <Info label="Advisor" value={policy.brokerId ? "Assigned" : "Not assigned"} />
      </div>

      {policy.statusNote && (
        <div className={`ss-note ${isCritical ? "danger" : ""}`}>
          <AlertTriangle size={16} />
          <span>{policy.statusNote}</span>
        </div>
      )}

      <div className="ss-health-card">
        <div className="ss-health-score-row">
          <div>
            <span className="ss-eyebrow">Policy health score</span>
            <div className="ss-health-number">
              <span className={`ss-health-val ${scoreClass(health.score)}`}>{health.score}</span>
              <span className="ss-health-denom">/100</span>
              <span className={`ss-health-grade ss-health-grade--${scoreClass(health.score)}`}>{health.grade}</span>
            </div>
          </div>
          <div className="ss-health-bar-wrap">
            <div className="ss-health-bar">
              <span className={`ss-health-fill ${scoreClass(health.score)}`} style={{ width: `${health.score}%` }} />
            </div>
          </div>
        </div>
        <div className="ss-health-breakdown">
          {health.good.map((item) => (
            <div key={item} className="ss-health-item good">
              <CheckCircle2 size={13} /> <span>{item}</span>
            </div>
          ))}
          {health.issues.map((item) => (
            <div key={item} className="ss-health-item issue">
              <AlertTriangle size={13} /> <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ss-detail-body">
        <div className="ss-detail-col">
          <Section title="Policy services" sub="Manage this policy and its paperwork" />
          <div className="ss-service-list">
            <ServiceLink
              icon={Shield}
              title="Manage / renew policy"
              detail="Renew coverage or compare a better rate before the deadline."
              onClick={onRenew}
            />
            <ServiceLink
              icon={FileCheck2}
              title="Request certificate"
              detail="Send a certificate of insurance to a holder or GC."
              onClick={onSend}
            />
            {notLicense && (
              <ServiceLink
                icon={BadgeDollarSign}
                title="Find savings"
                detail="Route this policy to partners for lower-rate quotes."
                onClick={onFindSavings}
              />
            )}
            <ServiceLink
              icon={Download}
              title="Download client summary"
              detail="Export a one-page coverage summary for this policy."
              onClick={() => downloadPolicySummary(policy)}
            />
          </div>
        </div>

        <div className="ss-detail-col">
          <Section
            title="Documents on file"
            sub={`${policy.documents.length} file${policy.documents.length === 1 ? "" : "s"}`}
          />
          {policy.documents.length === 0 ? (
            <div className="ss-note">
              <AlertTriangle size={16} />
              <span>No documents stored yet. Upload the declarations page to keep certificates ready.</span>
            </div>
          ) : (
            policy.documents.map((doc) => <DocumentRow key={doc} name={doc} />)
          )}

          <div className="ss-claims-card" style={{ marginTop: 12 }}>
            <b className="ss-claims-title">Filing a claim</b>
            <p className="ss-muted">Have these ready to speed up the process:</p>
            <ul className="ss-claims-list">
              <li>Policy number ({policy.policyNumber})</li>
              <li>Date, time, place, and description of the incident</li>
              <li>Names and roles of anyone involved</li>
            </ul>
            <button type="button" className="ss-button soft ss-button-sm" onClick={onSend}>
              <LifeBuoy size={15} /> Contact advisor
            </button>
          </div>
        </div>
      </div>

      <div className="ss-detail-actions">
        <button type="button" className="ss-button" onClick={onRenew} disabled={isRenewing}>
          {isRenewing ? (
            <>
              <Spinner /> Renewing...
            </>
          ) : (
            <>
              <Zap size={16} /> Renew now
            </>
          )}
        </button>
        {notLicense && (
          <button type="button" className="ss-button soft" onClick={onFindSavings}>
            <BadgeDollarSign size={16} /> Find savings
          </button>
        )}
        <button type="button" className="ss-button soft" onClick={onSend}>
          <Send size={16} /> Send certificate
        </button>
      </div>
    </div>
  );
}

function ServiceLink({ icon: Icon, title, detail, onClick }) {
  return (
    <button type="button" className="ss-service-link" onClick={onClick}>
      <span className="ss-service-icon" aria-hidden="true">
        <Icon size={18} />
      </span>
      <span className="ss-service-copy">
        <b>{title}</b>
        <small>{detail}</small>
      </span>
    </button>
  );
}

function downloadPolicySummary(policy) {
  const lines = [
    "SubShield — Policy Client Summary",
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

function DocumentRow({ name }) {
  return (
    <div className="ss-doc">
      <span className="ss-pdf" aria-hidden="true">PDF</span>
      <div className="ss-doc-body">
        <b>{name}</b>
        <small>Carrier-issued document | verified</small>
      </div>
      <em className="ss-verified">
        <Check size={13} /> Verified
      </em>
    </div>
  );
}
