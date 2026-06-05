import { CheckCircle2, ShieldCheck } from "lucide-react";
import { scoreClass } from "../utils.js";

export default function ScoreRing({ value }) {
  const cls = scoreClass(value);
  const label = cls === "success" ? "Strong" : cls === "warning" ? "Needs work" : "At risk";

  return (
    <div className={`ss-score-card ${cls}`} role="img" aria-label={`Policy health score ${value} out of 100`}>
      <div className="ss-score-topline">
        <span>Policy health</span>
        <em>{label}</em>
      </div>
      <div className="ss-score-main">
        <ShieldCheck size={24} aria-hidden="true" />
        <strong>{value}</strong>
        <span>/100</span>
      </div>
      <div className="ss-score-meter" aria-hidden="true">
        <span style={{ width: `${Math.max(4, Math.min(100, value))}%` }} />
      </div>
      <div className="ss-score-foot">
        <span>Documents, limits, endorsements, and renewals</span>
        <CheckCircle2 size={15} aria-hidden="true" />
      </div>
    </div>
  );
}
