import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

const STATUS_LABEL = {
  met: "Meets requirement",
  unmet: "Does not meet",
  missing: "No policy on file",
};

/**
 * Compact gap indicator for holder rows. We surface problems and imply
 * success: nothing renders when the holder is compliant or has no
 * requirements set — only an open coverage gap shows a chip.
 */
export function ComplianceBadge({ result }) {
  if (!result || !result.hasRequirements || result.compliant) {
    return null;
  }
  return (
    <span className="ss-comply-badge gap">
      {result.unmetCount} gap{result.unmetCount !== 1 ? "s" : ""}
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
            {req.checks.map((check) => (
              <span key={check.label} className={`ss-comply-check ${check.ok ? "ok" : "no"}`}>
                {check.ok ? "✓" : "✗"} {check.label}
                {check.detail ? <em>, {check.detail}</em> : null}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
