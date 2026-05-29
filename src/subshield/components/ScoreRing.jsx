import { scoreClass } from "../utils.js";

/**
 * Animated SVG progress ring for the compliance score.
 * Size is a single number (width = height). Stroke width scales with size.
 */
export default function ScoreRing({ value, size = 138 }) {
  const cls = scoreClass(value);
  const stroke = Math.round(size * 0.072);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, value)) / 100);

  return (
    <div
      className={`ss-ring ${cls}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Compliance score ${value} percent`}
    >
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <linearGradient id="ss-grad-success" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#18a77b" />
            <stop offset="100%" stopColor="#0b7f5d" />
          </linearGradient>
          <linearGradient id="ss-grad-warning" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e4a33a" />
            <stop offset="100%" stopColor="#c47a07" />
          </linearGradient>
          <linearGradient id="ss-grad-danger" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f07167" />
            <stop offset="100%" stopColor="#cf3f35" />
          </linearGradient>
        </defs>
        <circle
          className="ss-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
        />
        <circle
          className={`ss-ring-fill ${cls}`}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="ss-ring-inner">
        <div className="ss-ring-value">{value}</div>
        <div className="ss-ring-label">Score</div>
      </div>
    </div>
  );
}
