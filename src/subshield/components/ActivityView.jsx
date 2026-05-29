import { CheckCircle2, History } from "lucide-react";
import { Section } from "./Layout.jsx";
import { groupActivityByDate } from "../utils.js";

export default function ActivityView({ activity }) {
  const groups = groupActivityByDate(activity);

  return (
    <section className="ss-card">
      <Section
        title="Activity log"
        sub="Renewals, uploads, sends, and savings"
        extra={`${activity.length} event${activity.length === 1 ? "" : "s"}`}
      />

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

      {groups.map((group) => (
        <div key={group.label}>
          <div className="ss-day-header">{group.label}</div>
          {group.items.map((item) => (
            <div className="ss-activity" key={item.id}>
              <CheckCircle2 size={18} color="#0b7f5d" aria-hidden="true" />
              <div className="ss-activity-body">
                <b>{item.title}</b>
                <small>{item.body}</small>
                <small className="ss-time">{item.time}</small>
              </div>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
