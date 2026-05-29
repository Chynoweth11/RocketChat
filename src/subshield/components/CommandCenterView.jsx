import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  Building2,
  CalendarClock,
  CheckCircle2,
  FileCheck2,
  Send,
  Shield,
} from "lucide-react";
import {
  formatMoney,
  formatShortDate,
  getStatus,
} from "../utils.js";
import { Section, Info } from "./Layout.jsx";

export default function CommandCenterView({
  score,
  policies,
  docs,
  contractors,
  upcoming,
  reminders,
  opportunities,
  openQuoteRequests,
  coiSends,
  totalPremium,
  recommendedAction,
  onOpenSend,
  onOpenQuote,
  onOpenSavings,
  onOpenVault,
}) {
  const criticalCount = policies.filter((policy) => (policy.daysRemaining ?? 0) <= 10).length;
  const latestSends = [...coiSends].slice(0, 3);
  const topOpportunities = opportunities.filter((item) => item.status === "available").slice(0, 3);

  return (
    <div className="ss-grid">
      <section className="ss-card ss-span">
        <div className="ss-hero">
          <div>
            <span className="ss-eyebrow">Insurance command center</span>
            <h2>{score}% compliant</h2>
            <p>
              Track renewals, route COIs, and request better rates before policies
              expire or premiums climb.
            </p>
            <div className="ss-row">
              <button className="ss-button" onClick={onOpenSend}>
                <Send size={16} /> Send COI package
              </button>
              <button className="ss-button soft" onClick={onOpenSavings}>
                <BadgeDollarSign size={16} /> Review savings
              </button>
            </div>
          </div>

          <div className="ss-command-tip">
            <b>Recommended next action</b>
            <p>{recommendedAction.detail}</p>
            <button type="button" className="ss-copy-btn" onClick={onOpenVault}>
              {recommendedAction.label} <ArrowRight size={13} />
            </button>
          </div>
        </div>

        <div className="ss-command-metrics">
          <Info label="Tracked premium" value={`${formatMoney(totalPremium)}/yr`} />
          <Info label="Policies" value={policies.length} />
          <Info label="Verified files" value={docs} />
          <Info label="Saved GCs" value={contractors.length} />
          <Info label="Critical policies" value={criticalCount} />
          <Info label="Open quote requests" value={openQuoteRequests.length} />
        </div>
      </section>

      <section className="ss-card">
        <Section title="Renewal radar" sub="Never miss a policy renewal" />
        {reminders.length === 0 && (
          <div className="ss-note success">
            <CheckCircle2 size={16} />
            <span>No reminder alerts right now. Coverage timelines look healthy.</span>
          </div>
        )}

        {reminders.slice(0, 5).map((reminder) => {
          const status = getStatus(reminder.daysRemaining);
          return (
            <div className="ss-insight" key={reminder.id}>
              <div>
                <b>{reminder.policyName}</b>
                <small>{reminder.message}</small>
              </div>
              <em className={`ss-status ${status.className}`}>
                {reminder.daysRemaining}d
              </em>
            </div>
          );
        })}

        <Section title="Upcoming renewals" />
        {upcoming.map((policy) => (
          <div className="ss-inline-row" key={policy.id}>
            <span>{policy.name}</span>
            <small>{formatShortDate(policy.renewalDate || policy.expires)}</small>
          </div>
        ))}
      </section>

      <section className="ss-card">
        <Section
          title="Savings opportunities"
          sub="Rocket Money style insurance savings, built for subcontractors"
          extra={
            <button type="button" className="ss-copy-btn" onClick={onOpenSavings}>
              View all <ArrowRight size={13} />
            </button>
          }
        />

        {topOpportunities.length === 0 && (
          <div className="ss-note success">
            <Shield size={16} />
            <span>No active opportunities right now. Policies are in monitoring mode.</span>
          </div>
        )}

        {topOpportunities.map((opportunity) => (
          <div className="ss-insight" key={opportunity.id}>
            <div>
              <b>{opportunity.currentCarrier}</b>
              <small>
                {formatMoney(opportunity.currentPremium)}/yr - renewal {formatShortDate(opportunity.renewalDate)}
                <br />
                Estimated savings {formatMoney(opportunity.estimatedSavings)}/yr
              </small>
            </div>
            <button
              type="button"
              className="ss-mini-btn"
              onClick={() => onOpenQuote(opportunity, "partner")}
              title="Request quote"
            >
              <BadgeDollarSign size={14} />
            </button>
          </div>
        ))}
      </section>

      <section className="ss-card ss-span">
        <Section title="Recent COI sends" sub="Package routing history" />
        {latestSends.length === 0 && (
          <div className="ss-empty" style={{ minHeight: 140 }}>
            <FileCheck2 size={30} />
            <h2>No packages sent yet</h2>
            <p>Send a package to create your compliance send history.</p>
          </div>
        )}
        {latestSends.map((sendItem) => (
          <div className="ss-insight" key={sendItem.id}>
            <div>
              <b>{sendItem.project}</b>
              <small>
                {sendItem.email} - {sendItem.docCount} verified files
              </small>
            </div>
            <span className="ss-pill" style={{ padding: "6px 10px", fontSize: 11 }}>
              <CalendarClock size={12} /> {formatShortDate(sendItem.sentAt)}
            </span>
          </div>
        ))}
      </section>

      {criticalCount > 0 && (
        <section className="ss-card ss-span">
          <div className="ss-note danger">
            <AlertTriangle size={16} />
            <span>
              {criticalCount} critical polic{criticalCount === 1 ? "y requires" : "ies require"} action before sending new packages to
              {contractors.length ? ` ${contractors[0].name} and other GCs.` : " clients."}
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
