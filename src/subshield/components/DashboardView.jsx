import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileWarning,
  PiggyBank,
  Shield,
  Sparkles,
} from "lucide-react";
import {
  formatMoney,
  formatShortDate,
  getStatus,
  policyLabelFromType,
  savingsForOpportunity,
} from "../utils.js";
import { Section } from "./Layout.jsx";

function buildSpendBars(policies) {
  const top = [...policies]
    .filter((policy) => (policy.policyType || policy.type) !== "license")
    .sort((a, b) => (b.premiumAmount ?? b.premium ?? 0) - (a.premiumAmount ?? a.premium ?? 0))
    .slice(0, 6)
    .map((policy) => ({
      id: policy.id,
      label: policyLabelFromType(policy.policyType || policy.type).slice(0, 3).toUpperCase(),
      value: Math.round((policy.premiumAmount ?? policy.premium ?? 0) / 12),
    }));

  const peak = Math.max(1, ...top.map((item) => item.value));
  return top.map((item) => ({ ...item, percent: Math.max(14, Math.round((item.value / peak) * 100)) }));
}

export default function DashboardView({
  firstName,
  totalPremium,
  potentialSavings,
  realizedSavings,
  policies,
  docsCount,
  upcoming,
  opportunities,
  openQuoteRequests,
  coiSends,
  coverageGaps,
  missingDocuments,
  recommendedAction,
  onReviewSavings,
  onOpenPolicies,
  onUpload,
  onQueueAction,
  activity = [],
  pendingCertificates = 0,
}) {
  const activePolicies = policies.filter((policy) => (policy.policyType || policy.type) !== "license");
  const policyAccounts = [...activePolicies].sort(
    (a, b) => (b.premiumAmount ?? b.premium ?? 0) - (a.premiumAmount ?? a.premium ?? 0)
  );
  const spendBars = buildSpendBars(policyAccounts);
  const savingsCards = opportunities
    .filter((item) => ["available", "quote_received"].includes(item.status))
    .slice(0, 3);
  const recentActivity = activity.slice(0, 6);
  const readyQuotes = opportunities.filter((item) => item.status === "quote_received");
  const criticalRenewals = upcoming.filter((policy) => (policy.daysRemaining ?? 0) <= 10);
  const monthlySpend = Math.round(totalPremium / 12);
  const missingDocCount = missingDocuments.length;

  const metricCards = [
    { label: "Total annual premium", value: `${formatMoney(totalPremium)}/yr` },
    { label: "Active policies", value: activePolicies.length },
    { label: "Estimated savings", value: `${formatMoney(potentialSavings)}/yr` },
    { label: "Upcoming renewals", value: upcoming.length, action: "View renewals", target: "renewals" },
    { label: "Missing documents", value: missingDocCount, action: "Upload", target: "upload" },
    {
      label: "Pending certificates",
      value: pendingCertificates,
      action: "Open certificates",
      target: "certificates",
    },
    { label: "Open quote reviews", value: openQuoteRequests.length, action: "Open", target: "savings" },
    { label: "Coverage gaps", value: coverageGaps.length, action: "Review", target: "policies" },
  ];

  return (
    <div className="ss-grid ss-dashboard-grid">
      <section className="ss-card ss-span">
        <div className="ss-dash-top-grid">
          <div className="ss-dash-spend-panel">
            <span className="ss-eyebrow">
              {firstName ? `Good evening, ${firstName}` : "Welcome back"}
            </span>
            <h2>Current insurance spend</h2>
            <div className="ss-dash-spend-value">{formatMoney(totalPremium)}</div>
            <p className="ss-muted">
              About {formatMoney(monthlySpend)}/month across {activePolicies.length} active policies.
            </p>
            <div className="ss-row">
              <button type="button" className="ss-button" onClick={onReviewSavings}>
                <PiggyBank size={16} /> Lower my insurance
              </button>
              <button type="button" className="ss-button soft" onClick={onOpenPolicies}>
                <Shield size={16} /> My insurance
              </button>
            </div>
          </div>

          <div className="ss-dash-accounts-panel">
            <Section
              title="Insurance accounts / policies"
              sub="Grouped coverage and annual cost summary"
              extra={
                <button type="button" className="ss-copy-btn" onClick={onOpenPolicies}>
                  View all <ArrowRight size={13} />
                </button>
              }
            />
            {policyAccounts.slice(0, 6).map((policy) => (
              <div className="ss-dash-account-row" key={policy.id}>
                <div>
                  <b>{policy.name}</b>
                  <small>
                    {policy.carrier} - {policy.daysRemaining}d to renew
                  </small>
                </div>
                <strong>{formatMoney(policy.premiumAmount ?? policy.premium)}/yr</strong>
              </div>
            ))}
            {policyAccounts.length === 0 && (
              <div className="ss-note">
                <FileWarning size={16} />
                <span>No policies added yet. Upload a policy to start tracking spend.</span>
              </div>
            )}
          </div>
        </div>

        <div className="ss-dash-trend">
          <div>
            <b>Premium trend by policy group</b>
            <small>Monthly equivalent spend for your highest-cost policies</small>
          </div>
          <div className="ss-dash-trend-bars">
            {spendBars.map((item) => (
              <div className="ss-dash-trend-item" key={item.id}>
                <span style={{ height: `${item.percent}%` }} />
                <small>{item.label}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="ss-dash-metrics">
          {metricCards.map((item) => (
            <div className="ss-dash-metric" key={item.label}>
              <span>{item.label}</span>
              <b>{item.value}</b>
              {item.action && (
                <button
                  type="button"
                  className="ss-copy-btn"
                  onClick={() => {
                    if (item.target === "upload") onUpload();
                    else if (item.target) onQueueAction(item.target);
                  }}
                >
                  {item.action}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="ss-card">
        <Section
          title="Recent insurance activity"
          sub="Latest policy, certificate, and savings actions"
          extra={
            <button type="button" className="ss-copy-btn" onClick={() => onQueueAction("activity")}>
              Open activity <ArrowRight size={13} />
            </button>
          }
        />

        {recentActivity.length === 0 && (
          <div className="ss-note success">
            <CheckCircle2 size={16} />
            <span>No recent activity yet. Actions will appear here in real time.</span>
          </div>
        )}

        {recentActivity.map((item) => (
          <div className="ss-dash-activity-row" key={item.id}>
            <Clock3 size={15} />
            <div>
              <b>{item.title}</b>
              <small>{item.body}</small>
            </div>
          </div>
        ))}
      </section>

      <section className="ss-card">
        <Section
          title="Upcoming renewals"
          sub="Deadlines that need action first"
          extra={
            <button type="button" className="ss-copy-btn" onClick={() => onQueueAction("renewals")}>
              See all <ArrowRight size={13} />
            </button>
          }
        />

        {upcoming.length === 0 && (
          <div className="ss-note success">
            <CheckCircle2 size={16} />
            <span>No upcoming renewals in your current timeline.</span>
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
              <small className={`ss-upcoming-days ${status.className}`}>{policy.daysRemaining}d</small>
            </div>
          );
        })}

        {criticalRenewals.length > 0 && (
          <div className="ss-note danger" style={{ marginTop: 12 }}>
            <AlertTriangle size={16} />
            <span>
              {criticalRenewals.length} polic
              {criticalRenewals.length === 1 ? "y is" : "ies are"} near expiration. Review now.
            </span>
          </div>
        )}
      </section>

      <section className="ss-card ss-span">
        <Section title="Ways to save" sub="Compare better options before renewal and reduce premium spend" />

        <div className="ss-dash-save-grid">
          <div className="ss-dash-save-primary">
            <b>{recommendedAction.label}</b>
            <p>{recommendedAction.detail}</p>
            <button type="button" className="ss-button" onClick={onReviewSavings}>
              Open Lower My Insurance
            </button>
          </div>

          <div className="ss-dash-save-list">
            {savingsCards.length === 0 && (
              <div className="ss-note success">
                <Sparkles size={16} />
                <span>No new savings opportunities yet. We will keep checking partner rates.</span>
              </div>
            )}

            {savingsCards.map((opportunity) => {
              const saving = savingsForOpportunity(opportunity);
              return (
                <div className="ss-dash-save-row" key={opportunity.id}>
                  <div>
                    <b>{policyLabelFromType(opportunity.policyType)}</b>
                    <small>
                      {opportunity.status === "quote_received"
                        ? "Quote is ready to review"
                        : `Renews ${formatShortDate(opportunity.renewalDate)}`}
                    </small>
                  </div>
                  <strong>{formatMoney(saving)}/yr</strong>
                </div>
              );
            })}

            <div className="ss-dash-save-footer">
              <div>
                <small>Open quote reviews</small>
                <b>{openQuoteRequests.length}</b>
              </div>
              <div>
                <small>Realized savings</small>
                <b>{formatMoney(realizedSavings)}/yr</b>
              </div>
              <div>
                <small>Certificates sent</small>
                <b>{coiSends.length}</b>
              </div>
              <div>
                <small>Verified files</small>
                <b>{docsCount}</b>
              </div>
              <button type="button" className="ss-copy-btn" onClick={onReviewSavings}>
                Review all <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {missingDocCount > 0 && (
        <section className="ss-card ss-span">
          <div className="ss-note">
            <FileCheck2 size={16} />
            <span>
              {missingDocCount} polic{missingDocCount === 1 ? "y is" : "ies are"} missing supporting
              documents. Upload now so certificates stay ready.
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
