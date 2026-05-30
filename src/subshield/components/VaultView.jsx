import { useMemo, useState } from "react";
import { AlertTriangle, Check, Search, Send, Upload, Zap } from "lucide-react";
import { policyIcon } from "../icons.js";
import { formatLongDate, formatMoney, getStatus } from "../utils.js";
import { Section, Info, Spinner } from "./Layout.jsx";
import ScoreRing from "./ScoreRing.jsx";

const FILTERS = [
  { id: "all", label: "All policies" },
  { id: "danger", label: "Critical" },
  { id: "warning", label: "Expiring soon" },
  { id: "success", label: "Active" },
];

export default function VaultView({
  score,
  docs,
  critical,
  policies,
  selectedPolicy,
  onSelectPolicy,
  onRenew,
  onShop,
  onSend,
  onScan,
  onAddPolicy,
  renewingId,
  shoppingId,
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
  const policyForDetail = selectedInFiltered ? selectedPolicy : filteredPolicies[0] || selectedPolicy;

  return (
    <div className="ss-grid">
      <section className="ss-card ss-span">
        <div className="ss-hero">
          <div>
            <span className="ss-eyebrow">
              {critical.length ? "Action needed" : "Coverage ready"}
            </span>
            <h2>{score}% compliant</h2>
            <p>
              Keep policy data, renewal timelines, and original documents in one clean
              workspace so sends and renewals are faster.
            </p>
            <div className="ss-row">
              <button className="ss-button" onClick={onSend}>
                <Send size={16} /> Send package
              </button>
              <button className="ss-button soft" onClick={onAddPolicy}>
                <Zap size={16} /> Add policy
              </button>
              <button className="ss-button soft" onClick={onScan}>
                <Upload size={16} /> Add document
              </button>
            </div>
          </div>
          <ScoreRing value={score} />
        </div>

        <div className="ss-command-metrics">
          <Info label="Policies tracked" value={policies.length} />
          <Info label="Critical" value={critical.length} />
          <Info label="Verified files" value={docs} />
          <Info
            label="Expiring in 30 days"
            value={policies.filter((policy) => (policy.daysRemaining ?? 0) <= 30).length}
          />
        </div>
      </section>

      <section className="ss-card">
        <Section
          title="Policy List"
          sub={`${filteredPolicies.length} policy${filteredPolicies.length === 1 ? "" : "ies"} shown`}
        />

        {policies.length > 0 && (
          <>
            <div className="ss-search">
              <Search size={16} className="ss-search-icon" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by policy, carrier, or policy number..."
                aria-label="Search policies"
              />
            </div>

            <div className="ss-chip-group">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`ss-chip ${filter === item.id ? "active" : ""}`}
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
            selected={policy.id === policyForDetail.id}
            onClick={() => onSelectPolicy(policy.id)}
          />
        ))}
      </section>

      <section className="ss-card">
        {policyForDetail ? (
          <PolicyDetail
            policy={policyForDetail}
            onRenew={() => onRenew(policyForDetail.id)}
            onShop={() => onShop(policyForDetail.id)}
            onSend={onSend}
            isRenewing={renewingId === policyForDetail.id}
            isShopping={shoppingId === policyForDetail.id}
          />
        ) : (
          <div className="ss-empty" style={{ minHeight: 220 }}>
            <AlertTriangle size={28} />
            <h2>No policy selected</h2>
            <p>Add or select a policy to view full coverage details.</p>
          </div>
        )}
      </section>
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
          {policy.carrier} - {policy.policyNumber}
        </small>
      </span>
      <em className={`ss-status ${status.className}`}>{status.label}</em>
    </button>
  );
}

function PolicyDetail({ policy, onRenew, onShop, onSend, isRenewing, isShopping }) {
  const Icon = policyIcon(policy.type);
  const status = getStatus(policy.daysRemaining);
  const width = `${Math.max(5, Math.min(100, (policy.daysRemaining / 180) * 100))}%`;
  const isCritical = status.className === "danger";

  return (
    <div>
      <div className="ss-detail-head">
        <span className="ss-icon-tile" aria-hidden="true">
          <Icon size={22} />
        </span>
        <div>
          <span className="ss-eyebrow">Policy detail</span>
          <h2>{policy.name}</h2>
          <p className="ss-muted">
            {policy.carrier} - {policy.policyNumber}
          </p>
        </div>
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
        <Info label="Limit" value={policy.coverageLimits || policy.limit} />
        <Info label="Renews" value={formatLongDate(policy.renewalDate || policy.expires)} />
        <Info label="Documents" value={`${policy.documents.length} verified`} />
        <Info label="Review Partner" value={policy.brokerId ? "Assigned" : "Not assigned"} />
      </div>

      <div className={`ss-note ${isCritical ? "danger" : ""}`}>
        <AlertTriangle size={16} />
        <span>{policy.statusNote}</span>
      </div>

      <Section title="Verified Documents" sub={`${policy.documents.length} file${policy.documents.length === 1 ? "" : "s"}`} />
      {policy.documents.map((doc) => (
        <DocumentRow key={doc} name={doc} />
      ))}

      <div className="ss-row">
        <button
          className="ss-button"
          onClick={onRenew}
          disabled={isRenewing || isShopping}
        >
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
        <button
          className="ss-button soft"
          onClick={onShop}
          disabled={isShopping || isRenewing}
        >
          {isShopping ? (
            <>
              <Spinner /> Shopping rates...
            </>
          ) : (
            <>Lower bill</>
          )}
        </button>
        <button className="ss-button soft" onClick={onSend}>
          <Send size={16} /> Send
        </button>
      </div>
    </div>
  );
}

function DocumentRow({ name }) {
  return (
    <div className="ss-doc">
      <span className="ss-pdf" aria-hidden="true">PDF</span>
      <div className="ss-doc-body">
        <b>{name}</b>
        <small>Original carrier-issued document - verified</small>
      </div>
      <em className="ss-verified">
        <Check size={13} /> Verified
      </em>
    </div>
  );
}
