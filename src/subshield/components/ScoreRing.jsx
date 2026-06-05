import { CheckCircle2, ShieldCheck, TrendingUp } from "lucide-react";
import { scoreClass } from "../utils.js";

export default function ScoreRing({ value }) {
  const cls = scoreClass(value);
  const safeValue = Math.max(0, Math.min(100, value));
  const label =
    cls === "success" ? "Strong portfolio" : cls === "warning" ? "Needs work" : "Action required";

  return (
    <div
      className={`ss-score-card ${cls}`}
      role="img"
      aria-label={`Compliance score ${value} percent`}
    >
      <div className="ss-score-topline">
        <span>
          <ShieldCheck size={15} /> Portfolio health
        </span>
        <em>{label}</em>
      </div>
      <div className="ss-score-main">
        <strong>{value}</strong>
        <span>/100</span>
      </div>
      <div className="ss-score-meter" aria-hidden="true">
        <span style={{ width: `${safeValue}%` }} />
      </div>
      <div className="ss-score-foot">
        <span>
          <CheckCircle2 size={13} /> Verified files
        </span>
        <span>
          <TrendingUp size={13} /> Renewal ready
        </span>
      </div>
    </div>
  );
}
