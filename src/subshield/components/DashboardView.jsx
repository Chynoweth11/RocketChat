import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileWarning,
  PiggyBank,
  Send,
  Shield,
  ShieldPlus,
  Sparkles,
} from "lucide-react";
import {
  formatMoney,
  formatShortDate,
  getStatus,
  policyLabelFromType,
  savingsForOpportunity,
} from "../utils.js";
import { Section, Info } from "./Layout.jsx";

function buildActionQueue({
  reminders,
  opportunities,
  openQuoteRequests,
  coverageGaps,
  missingDocuments,
}) {
  const queue = [];

  opportunities
    .filter((item) => item.status === "quote_received")
    .slice(0, 2)
    .forEach((opportunity) => {
      queue.push({
        id: `quote-ready-${opportunity.id}`,
        severity: "success",
        title: `Better ${policyLabelFromType(opportunity.policyType)} rate ready`,
        detail: `Save ${formatMoney(savingsForOpportunity(opportunity))}/yr by switching - review and approve.`,
        actionLabel: "Review & switch",
        target: "savings",
      });
    });

  reminders.slice(0, 3).forEach((reminder) => {
    queue.push({
      id: `renew-${reminder.id}`,
      severity: reminder.daysRemaining <= 10 ? "danger" : "warning",
      title: `${reminder.policyName} renews soon`,
      detail: reminder.message,
      actionLabel: "Review policy",
      target: "policies",
    });
  });

  opportunities
    .filter((item) => item.status === "available")
    .slice(0, 2)
    .forEach((opportunity) => {
      queue.push({
        id: `save-${opportunity.id}`,
        severity: "success",
        title: `${policyLabelFromType(opportunity.policyType)} savings available`,
        detail: `Up to ${formatMoney(savingsForOpportunity(opportunity))}/yr in potential savings before ${formatShortDate(opportunity.renewalDate)}.`,
        actionLabel: "Find better rate",
        target: "savings",
      });
    });

  coverageGaps.slice(0, 2).forEach((gap) => {
    queue.push({
      id: `gap-${gap.type}`,
      severity: "warning",
      title: `Missing coverage: ${gap.label}`,
      detail: gap.reason,
      actionLabel: "Add coverage",
      target: "add-coverage",
      gapType: gap.type,
    });
  });

  missingDocuments.slice(0, 1).forEach((policy) => {
    queue.push({
      id: `doc-${policy.id}`,
      severity: "warning",
      title: `Upload ${policy.name} paperwork`,
      detail: "We don't have a stored document for this policy yet. Upload the declarations page.",
      actionLabel: "Upload",
      target: "upload",
    });
  });

  openQuoteRequests.slice(0, 1).forEach((request) => {
    queue.push({
      id: `req-${request.id}`,
      severity: "warning",
      title: "Quote request in progress",
      detail: `Your ${policyLabelFromType(request.policyType || "liability")} quote is awaiting a partner response.`,
      actionLabel: "Track request",
      target: "savings",
    });
  });

  return queue.slice(0, 6);
}

export default function DashboardView({
  firstName,
  totalPremium,
  potentialSavings,
  realizedSavings,
  policies,
  docsCount,
  upcoming,
  reminders,
  opportunities,
  openQuoteRequests,
  coiSends,
  coverageGaps,
  missingDocuments,
  recommendedAction,
  onReviewSavings,
  onOpenPolicies,
  onAddCoverage,
  onUpload,
  onQueueAction,
}) {
  const criticalCount = policies.filter((policy) => (policy.daysRemaining ?? 0) <= 10).length;
  const activePolicies = policies.filter((p) => (p.policyType || p.type) !== "license").length;
  const latestSends = [...coiSends].slice(0, 3);
  const readyQuotes = opportunities.filter((item) => item.status === "quote_received");
  const actionQueue = buildActionQueue({
    reminders,
    opportunities,
    openQuoteRequests,
    coverageGaps,
    missingDocuments,
  });

  const headline =
    realizedSavings > 0
      ? `${formatMoney(realizedSavings)}/yr saved so far`
      : potentialSavings > 0
      ? `${formatMoney(potentialSavings)}/yr in savings found`
      : "Your insurance is in good shape";

  return (
    <div className="ss-grid">
      <section className="ss-card ss-span">
        <div className="ss-hero">
          <div>
            <span className="ss-hero-kicker">Trusted coverage and savings workspace</span>
            <span className="ss-eyebrow">
              {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
            </span>
            <h2>{headline}</h2>
            <p>
              SubShield reviews your business insurance, watches every renewal, and
              finds lower-cost options from licensed partners - so you stay covered
              and stop overpaying.
            </p>
            <div className="ss-row">
              <button className="ss-button" onClick={onReviewSavings}>
                <PiggyBank size={16} /> Review savings
              </button>
              <button className="ss-button soft" onClick={onOpenPolicies}>
                <Shield size={16} /> View policies
              </button>
            </div>
          </div>

          <div className="ss-command-tip">
            <b>Recommended next step</b>
            <p>{recommendedAction.detail}</p>
            <button type="button" className="ss-copy-btn" onClick={onReviewSavings}>
              {recommendedAction.label} <ArrowRight size={13} />
            </button>
          </div>
        </div>

        <div className="ss-command-metrics">
          <Info label="Tracked premium" value={`${formatMoney(totalPremium)}/yr`} />
          <Info
            label="Potential savings"
            value={`${formatMoney(potentialSavings)}/yr`}
            hint={readyQuotes.length ? `${readyQuotes.length} quote ready` : undefined}
          />
          <Info label="Active policies" value={activePolicies} />
          <Info label="Upcoming renewals" value={upcoming.length} />
          <Info label="Open quotes" value={openQuoteRequests.length} />
          <Info
            label="Coverage gaps"
            value={coverageGaps.length}
            hint={coverageGaps.length ? "Action suggested" : "All covered"}
          />
        </div>
      </section>

      <section className="ss-card ss-span">
        <Section
          title="Your priority queue"
          sub="Everything that needs a decision, ranked so you always know what's next."
          extra={
            <span className="ss-section-extra">
              {actionQueue.length} item{actionQueue.length === 1 ? "" : "s"}
            </span>
          }
        />

        {actionQueue.length === 0 && (
          <div className="ss-note success">
            <CheckCircle2 size={16} />
            <span>You're all caught up. No renewals, savings, or gaps need attention.</span>
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
                if (item.target === "add-coverage") onAddCoverage(item.gapType);
                else if (item.target === "upload") onUpload();
                else onQueueAction(item.target);
              }}
            >
              {item.actionLabel}
            </button>
          </div>
        ))}
      </section>

      <section className="ss-card">
        <Section
          title="Better options found"
          sub="Lower-cost coverage we surfaced for you"
          extra={
            <button type="button" className="ss-copy-btn" onClick={onReviewSavings}>
              View all <ArrowRight size={13} />
            </button>
          }
        />
        {opportunities.filter((o) => ["available", "quote_received"].includes(o.status)).length === 0 && (
          <div className="ss-note success">
            <Sparkles size={16} />
            <span>No new savings right now. We'll keep monitoring the market and your renewals.</span>
          </div>
        )}
        {opportunities
          .filter((o) => ["available", "quote_received"].includes(o.status))
          .slice(0, 3)
          .map((opportunity) => {
            const saving = savingsForOpportunity(opportunity);
            const ready = opportunity.status === "quote_received";
            return (
              <div className="ss-insight" key={opportunity.id}>
                <div>
                  <b>{policyLabelFromType(opportunity.policyType)}</b>
                  <small>
                    {ready
                      ? `Quote ready from ${opportunity.alternateQuote?.carrier || "a partner"}`
                      : `Current ${formatMoney(opportunity.currentPremium)}/yr`}
                  </small>
                </div>
                <div className="ss-insight-amount">
                  <strong className="ss-savings-pos">{formatMoney(saving)}/yr</strong>
                  <button
                    type="button"
                    className="ss-copy-btn"
                    onClick={onReviewSavings}
                    title="Review savings"
                  >
                    {ready ? "Review" : "Compare"} <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}
      </section>

      <section className="ss-card">
        <Section title="Renewal timeline" sub="What's coming up next" />
        {upcoming.length === 0 && (
          <div className="ss-note success">
            <CheckCircle2 size={16} />
            <span>No renewals in your current window.</span>
          </div>
        )}
        {upcoming.map((policy) => {
          const status = getStatus(policy.daysRemaining);
          return (
            <div className="ss-inline-row" key={policy.id}>
              <div>
                <span>{policy.name}</span>
                <small style={{ display: "block" }}>
                  {policy.carrier} - {formatShortDate(policy.renewalDate || policy.expires)}
                </small>
              </div>
              <small className={`ss-upcoming-days ${status.className}`}>
                {policy.daysRemaining}d
              </small>
            </div>
          );
        })}
      </section>

      {coverageGaps.length > 0 && (
        <section className="ss-card ss-span">
          <Section
            title="Close your coverage gaps"
            sub="Protection most businesses in your category carry"
          />
          <div className="ss-gap-grid">
            {coverageGaps.map((gap) => (
              <div className="ss-gap-card" key={gap.type}>
                <span className="ss-gap-icon" aria-hidden="true">
                  <ShieldPlus size={18} />
                </span>
                <div className="ss-gap-body">
                  <b>{gap.label}</b>
                  <small>{gap.reason}</small>
                </div>
                <button
                  type="button"
                  className="ss-button soft ss-button-sm"
                  onClick={() => onAddCoverage(gap.type)}
                >
                  Add coverage
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="ss-card ss-span">
        <Section
          title="Recent certificates"
          sub="Latest proof-of-insurance deliveries"
          extra={<span className="ss-section-extra">{docsCount} verified files</span>}
        />
        {latestSends.length === 0 ? (
          <div className="ss-empty" style={{ minHeight: 140 }}>
            <FileCheck2 size={30} />
            <h2>No certificates sent yet</h2>
            <p>Send your first certificate of insurance to start your delivery history.</p>
          </div>
        ) : (
          latestSends.map((sendItem) => (
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
          ))
        )}
      </section>

      {criticalCount > 0 && (
        <section className="ss-card ss-span">
          <div className="ss-note danger">
            <AlertTriangle size={16} />
            <span>
              {criticalCount} polic{criticalCount === 1 ? "y is" : "ies are"} expiring within 10 days.
              Renew or switch before they lapse.
            </span>
          </div>
        </section>
      )}

      {missingDocuments.length > 0 && (
        <section className="ss-card ss-span">
          <div className="ss-note">
            <FileWarning size={16} />
            <span>
              {missingDocuments.length} polic{missingDocuments.length === 1 ? "y is" : "ies are"} missing
              stored documents. Upload them so certificates are always ready.
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
