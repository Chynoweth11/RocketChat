import { useMemo, useState } from "react";
import {
  BadgeDollarSign,
  CheckCircle2,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  History,
  RefreshCcw,
  Search,
  Send,
  Settings,
  Shield,
  Upload,
  UserPlus,
} from "lucide-react";
import { Section } from "./Layout.jsx";
import { formatActivityTime, groupActivityByDate } from "../utils.js";

function exportActivityCsv(activity) {
  const header = ["Title","Details","Time"];
  const rows = activity.map((item) => [
    item.title,
    item.body,
    formatActivityTime(item),
  ].map((cell) => `"${String(cell).replace(/"/g, '""')}"`));
  const csv = [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "activity-log.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const TYPE_FILTERS = [
  { id: "all", label: "All" },
  { id: "policy", label: "Policies" },
  { id: "certificate", label: "Certificates" },
  { id: "document", label: "Documents" },
  { id: "savings", label: "Savings" },
  { id: "settings", label: "Settings" },
];

function detectActivityType(title = "") {
  const t = title.toLowerCase();
  if (t.includes("certificate") || t.includes("coi") || t.includes("sent to")) return "certificate";
  if (t.includes("upload") || t.includes("document") || t.includes("file") || t.includes("vault")) return "document";
  if (t.includes("sav") || t.includes("quote") || t.includes("rate") || t.includes("coverage review")) return "savings";
  if (t.includes("setting") || t.includes("logout") || t.includes("reset") || t.includes("profile")) return "settings";
  if (t.includes("holder") || t.includes("contractor") || t.includes("advisor")) return "contact";
  if (t.includes("renew") || t.includes("policy") || t.includes("added") || t.includes("updated")) return "policy";
  return "general";
}

function ActivityIcon({ type }) {
  const props = { size: 17, strokeWidth: 2 };
  switch (type) {
    case "certificate": return <Send {...props} />;
    case "document": return <Upload {...props} />;
    case "savings": return <BadgeDollarSign {...props} />;
    case "settings": return <Settings {...props} />;
    case "contact": return <UserPlus {...props} />;
    case "policy": return <Shield {...props} />;
    default: return <CheckCircle2 {...props} />;
  }
}

const TYPE_COLORS = {
  certificate: "#2f63e9",
  document: "#7c3aed",
  savings: "#0b7f5d",
  settings: "#64748b",
  contact: "#d97706",
  policy: "#0284c7",
  general: "#374151",
};

export default function ActivityView({ activity }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const withTypes = useMemo(
    () => activity.map((item) => ({ ...item, activityType: detectActivityType(item.title) })),
    [activity]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return withTypes.filter((item) => {
      const matchesQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q);
      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "policy" && ["policy", "general"].includes(item.activityType)) ||
        item.activityType === typeFilter;
      return matchesQuery && matchesType;
    });
  }, [withTypes, query, typeFilter]);

  const groups = groupActivityByDate(filtered);

  const counts = useMemo(() => {
    const c = {};
    withTypes.forEach((item) => {
      c[item.activityType] = (c[item.activityType] || 0) + 1;
    });
    return c;
  }, [withTypes]);

  return (
    <section className="ss-card">
      <Section
        title="Activity Log"
        sub="A complete timeline of renewals, uploads, sends, and savings actions."
        extra={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--faint)" }}>
              {filtered.length} event{filtered.length === 1 ? "" : "s"}
            </span>
            {activity.length > 0 && (
              <button
                type="button"
                className="ss-copy-btn"
                onClick={() => exportActivityCsv(activity)}
                title="Export activity log as CSV"
              >
                <FileSpreadsheet size={13} /> Export
              </button>
            )}
          </div>
        }
      />

      {activity.length > 0 && (
        <>
          <div className="ss-search" style={{ marginBottom: 8 }}>
            <Search size={16} className="ss-search-icon" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search activity by action or detail..."
              aria-label="Search activity"
            />
          </div>
          <div className="ss-chip-group" style={{ marginBottom: 14 }}>
            {TYPE_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`ss-chip ${typeFilter === item.id ? "active" : ""}`}
                aria-pressed={typeFilter === item.id}
                onClick={() => setTypeFilter(item.id)}
              >
                {item.label}
                {item.id !== "all" && counts[item.id] > 0 && (
                  <span className="ss-chip-count">{counts[item.id]}</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {activity.length === 0 && (
        <div className="ss-empty">
          <History size={32} />
          <h2>No activity yet</h2>
          <p>
            As you vault documents, renew policies, and route COI packages,
            everything will be logged here for your records.
          </p>
        </div>
      )}

      {activity.length > 0 && filtered.length === 0 && (
        <div className="ss-empty" style={{ minHeight: 170 }}>
          <Search size={28} />
          <h2>No matching events</h2>
          <p>Try a different search term or filter to find the event you need.</p>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.label} className="ss-activity-group">
          <div className="ss-day-header">{group.label}</div>
          {group.items.map((item) => (
            <div className="ss-activity" key={item.id}>
              <span
                className="ss-activity-icon"
                style={{ color: TYPE_COLORS[item.activityType] || TYPE_COLORS.general }}
                aria-hidden="true"
              >
                <ActivityIcon type={item.activityType} />
              </span>
              <div className="ss-activity-body">
                <b>{item.title}</b>
                <small>{item.body}</small>
                <small className="ss-time">{formatActivityTime(item)}</small>
              </div>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
