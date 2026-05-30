import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Send,
  Shield,
  Sparkles,
} from "lucide-react";
import {
  formatMoney,
  formatShortDate,
  getStatus,
  policyLabelFromType,
} from "../utils.js";
import { Section, Info } from "./Layout.jsx";

function buildActionQueue({ reminders, opportunities, openQuoteRequests }) {
  const renewalActions = reminders.slice(0, 3).map((reminder) => ({
    id: `renew-${reminder.id}`,
    type: "renewal",
    title: `${reminder.policyName} renewal`,
    detail: reminder.message,
    severity: reminder.daysRemaining <= 10 ? "danger" : "warning",
    actionLabel: "Review policy",
    target: "vault",
  }));

  const savingsActions = opportunities
    .filter((item) => item.status === "available")
    .slice(0, 2)
    .map((opportunity) => ({
      id: `save-${opportunity.id}`,
      type: "savings",
      title: `${policyLabelFromType(opportunity.policyType)} savings opportunity`,
      detail: `Potential ${formatMoney(opportunity.estimatedSavings)}/yr in savings before ${formatShortDate(opportunity.renewalDate)}.`,
      severity: "success",
      actionLabel: "Compare rates",
      target: "quote",
      opportunity,
    }));

  const quoteFollowUps = openQuoteRequests.slice(0, 2).map((request) => ({
    id: `quote-${request.id}`,
    type: "quote",
    title: "Quote follow-up pending",
    detail: `Quote request for ${policyLabelFromType(request.policyType || "liability")} is awaiting response.`,
    severity: "warning",
    actionLabel: "Track requests",
    target: "savings",
  }));

  return [...renewalActions, ...savingsActions, ...quoteFollowUps].slice(0, 6);
}

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
  const availableOpportunities = opportunities.filter((item) => item.status === "available");
  const actionQueue = buildActionQueue({
    reminders,
    opportunities,
    openQuoteRequests,
  });

  return (
    <div className="ss-grid">
      <section className="ss-card ss-span">
        <div className="ss-hero">
          <div>
            <span className="ss-eyebrow">Today in SubShield</span>
            <h2>{score}% compliant</h2>
            <p>
              Everything you need for compliance, COI delivery, and insurance savings
              is organized below. Start with the priority queue, then move to sends.
            </p>
            <div className="ss-row">
              <button className="ss-button" onClick={onOpenSend}>
                <Send size={16} /> Send COI package
              </button>
              <button className="ss-button soft" onClick={onOpenVault}>
                <Shield size={16} /> Review policies
              </button>
              <button className="ss-button soft" onClick={onOpenSavings}>
                <BadgeDollarSign size={16} /> Review savings
              </button>
            </div>
          </div>

          <div className="ss-command-tip">
            <b>Recommended next step</b>
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
          <Info label="Saved recipients" value={contractors.length} />
          <Info label="Critical policies" value={criticalCount} />
          <Info label="Open quote requests" value={openQuoteRequests.length} />
        </div>
      </section>

      <section className="ss-card ss-span">
        <Section
          title="Priority Queue"
          sub="Clear next actions so you never wonder what to do next."
          extra={
            <span className="ss-section-extra">
              {actionQueue.length} active task{actionQueue.length === 1 ? "" : "s"}
            </span>
          }
        />

        {actionQueue.length === 0 && (
          <div className="ss-note success">
            <CheckCircle2 size={16} />
            <span>No urgent actions right now. Your account is in a healthy state.</span>
          </div>
        )}

        {actionQueue.map((item) => (
          <div className="ss-task-row" key={item.id}>
            <span className={`ss-task-dot ${item.severity}`} aria-hidden="true" />
            <div className="ss-task-copy">
              <b>{item.title}</b>
              <small>{item.detail}</small>
            </div>
            <button
              type="button"
              className="ss-button soft ss-button-sm"
              onClick={() => {
                if (item.target === "vault") onOpenVault();
                else if (item.target === "savings") onOpenSavings();
                else if (item.target === "quote" && item.opportunity) {
                  onOpenQuote(item.opportunity, "partner");
                }
              }}
            >
              {item.actionLabel}
            </button>
          </div>
        ))}
      </section>

      <section className="ss-card">
        <Section title="Renewal Timeline" sub="What is coming up next" />
        {upcoming.length === 0 && (
          <div className="ss-note success">
            <CheckCircle2 size={16} />
            <span>No upcoming renewals in your current window.</span>
          </div>
        )}
        {upcoming.map((policy) => {
          const status = getStatus(policy.daysRemaining);
          return (
            <div className="ss-inline-row" key={policy.id}>
              <span>{policy.name}</span>
              <small className={`ss-upcoming-days ${status.className}`}>
                {policy.daysRemaining}d
              </small>
            </div>
          );
        })}
      </section>

      <section className="ss-card">
        <Section title="Savings Snapshot" sub="High-impact opportunities first" />
        {availableOpportunities.length === 0 && (
          <div className="ss-note success">
            <Sparkles size={16} />
            <span>No active savings opportunities right now.</span>
          </div>
        )}
        {availableOpportunities.slice(0, 3).map((opportunity) => (
          <div className="ss-insight" key={opportunity.id}>
            <div>
              <b>{policyLabelFromType(opportunity.policyType)}</b>
              <small>
                Current premium {formatMoney(opportunity.currentPremium)}/yr
                <br />
                Potential savings {formatMoney(opportunity.estimatedSavings)}/yr
              </small>
            </div>
            <button
              type="button"
              className="ss-mini-btn"
              onClick={() => onOpenQuote(opportunity, "partner")}
              title="Compare rates"
            >
              <BadgeDollarSign size={14} />
            </button>
          </div>
        ))}
      </section>

      <section className="ss-card ss-span">
        <Section title="Recent COI Sends" sub="Latest package deliveries and proof of routing" />
        {latestSends.length === 0 && (
          <div className="ss-empty" style={{ minHeight: 140 }}>
            <FileCheck2 size={30} />
            <h2>No packages sent yet</h2>
            <p>Send your first COI package to start your verified delivery history.</p>
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
              {criticalCount} critical polic{criticalCount === 1 ? "y requires" : "ies require"} action before
              routing new packages.
            </span>
          </div>
        </section>
      )}

      {openQuoteRequests.length > 0 && (
        <section className="ss-card ss-span">
          <div className="ss-note">
            <Clock3 size={16} />
            <span>
              You have {openQuoteRequests.length} open quote request
              {openQuoteRequests.length === 1 ? "" : "s"} in progress.
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
