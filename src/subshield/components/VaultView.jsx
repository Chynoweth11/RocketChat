import { AlertTriangle, Check, Send, Upload, Zap } from "lucide-react";
import { policyIcon } from "../icons.js";
import { formatLongDate, formatMoney, getStatus } from "../utils.js";
import { Section, Info, Spinner } from "./Layout.jsx";
import ScoreRing from "./ScoreRing.jsx";

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
  renewingId,
  shoppingId,
}) {
  return (
    <div className="ss-grid">
      <section className="ss-card ss-span">
        <div className="ss-hero">
          <div>
            <span className="ss-eyebrow">
              {critical.length ? "Action needed" : "Job-site ready"}
            </span>
            <h2>{score}% compliant</h2>
            <p>
              {critical.length
                ? `${critical.length} polic${critical.length === 1 ? "y is" : "ies are"} critical. Renew before routing new COI packages.`
                : "All required policies are current and ready for routing."}
            </p>
            <div className="ss-row">
              <button className="ss-button" onClick={onSend}>
                <Send size={16} /> Send package
              </button>
              <button className="ss-button soft" onClick={onScan}>
                <Upload size={16} /> Add document
              </button>
            </div>
          </div>
          <ScoreRing value={score} />
        </div>
      </section>

      <section className="ss-card">
        <Section title="Insurance vault" sub={`${docs} verified files`} />
        {policies.map((policy) => (
          <PolicyRow
            key={policy.id}
            policy={policy}
            selected={policy.id === selectedPolicy.id}
            onClick={() => onSelectPolicy(policy.id)}
          />
        ))}
      </section>

      <section className="ss-card">
        <PolicyDetail
          policy={selectedPolicy}
          onRenew={() => onRenew(selectedPolicy.id)}
          onShop={() => onShop(selectedPolicy.id)}
          onSend={onSend}
          isRenewing={renewingId === selectedPolicy.id}
          isShopping={shoppingId === selectedPolicy.id}
        />
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
          {policy.carrier} · {policy.policyNumber}
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
            {policy.carrier} · {policy.policyNumber}
          </p>
        </div>
      </div>

      <div className="ss-bar-top">
        <span>{policy.daysRemaining} days left</span>
        <span>{formatMoney(policy.premium)}/yr</span>
      </div>
      <div className="ss-bar">
        <span className={status.className} style={{ width }} />
      </div>

      <div className="ss-info-grid">
        <Info label="Limit" value={policy.limit} />
        <Info label="Expires" value={formatLongDate(policy.expires)} />
        <Info label="Documents" value={`${policy.documents.length} verified`} />
        <Info label="Carrier" value={policy.carrier} />
      </div>

      <div className={`ss-note ${isCritical ? "danger" : ""}`}>
        <AlertTriangle size={16} />
        <span>{policy.statusNote}</span>
      </div>

      <Section
        title="Verified documents"
        sub={`${policy.documents.length} files`}
      />
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
              <Spinner /> Renewing…
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
              <Spinner /> Shopping rates…
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
        <small>Original carrier-issued document · verified</small>
      </div>
      <em className="ss-verified">
        <Check size={13} /> Verified
      </em>
    </div>
  );
}
