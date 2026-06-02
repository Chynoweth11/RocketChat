import { AlertTriangle, CheckCircle2, ShieldCheck, ShieldAlert } from "lucide-react";

const STATUS_LABEL = {
  met: "Meets requirement",
  unmet: "Does not meet",
  missing: "No policy on file",
};

/**
 * Compact pill for holder cards / lists. Shows compliant, a gap count, or that
 * no structured requirements have been set yet.
 */
export function ComplianceBadge({ result }) {
  if (!result || !result.hasRequirements) {
    return <span className="ss-comply-badge none">No requirements set</span>;
  }
  if (result.compliant) {
    return (
      <span className="ss-comply-badge ok">
        <ShieldCheck size={11} /> Compliant
      </span>
    );
  }
  return (
    <span className="ss-comply-badge gap">
      <ShieldAlert size={11} /> {result.unmetCount} gap{result.unmetCount !== 1 ? "s" : ""}
    </span>
  );
}

/**
 * Full requirement-by-requirement breakdown with per-check ✓/✗ lines. Used in
 * the send flow and the expanded holder card.
 */
export function CompliancePanel({ result, compact = false }) {
  if (!result || !result.hasRequirements) {
    return (
      <div className="ss-note">
        <ShieldAlert size={16} />
        <span>
          No coverage requirements set for this holder yet. Add them when editing the holder
          and SubShield will check every send automatically.
        </span>
      </div>
    );
  }

  return (
    <div className={`ss-comply-panel${compact ? " compact" : ""}`}>
      {result.results.map((req) => (
        <div key={req.policyType} className={`ss-comply-req ${req.status}`}>
          <div className="ss-comply-req-head">
            {req.status === "met" ? (
              <CheckCircle2 size={15} className="ss-comply-ico ok" />
            ) : (
              <AlertTriangle size={15} className="ss-comply-ico no" />
            )}
            <b>{req.label}</b>
            <span className="ss-comply-req-status">{STATUS_LABEL[req.status]}</span>
          </div>
          <div className="ss-comply-checks">
            {req.checks.map((check, index) => (
              <span key={index} className={`ss-comply-check ${check.ok ? "ok" : "no"}`}>
                {check.ok ? "✓" : "✗"} {check.label}
                {check.detail ? <em> — {check.detail}</em> : null}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
