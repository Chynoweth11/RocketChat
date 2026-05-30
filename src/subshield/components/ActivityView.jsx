import { useMemo, useState } from "react";
import { CheckCircle2, History, Search } from "lucide-react";
import { Section } from "./Layout.jsx";
import { formatActivityTime, groupActivityByDate } from "../utils.js";

export default function ActivityView({ activity }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activity;
    return activity.filter((item) => {
      return (
        item.title.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q)
      );
    });
  }, [activity, query]);
  const groups = groupActivityByDate(filtered);

  return (
    <section className="ss-card">
      <Section
        title="Activity Log"
        sub="A complete timeline of renewals, uploads, sends, and savings actions."
        extra={`${filtered.length} event${filtered.length === 1 ? "" : "s"}`}
      />

      {activity.length > 0 && (
        <div className="ss-search" style={{ marginBottom: 6 }}>
          <Search size={16} className="ss-search-icon" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search activity by action or detail..."
            aria-label="Search activity"
          />
        </div>
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
          <p>Try a different search term to find the event you need.</p>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.label}>
          <div className="ss-day-header">{group.label}</div>
          {group.items.map((item) => (
            <div className="ss-activity" key={item.id}>
              <CheckCircle2 size={18} color="#0b7f5d" aria-hidden="true" />
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
