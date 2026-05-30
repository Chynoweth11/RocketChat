import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileWarning,
  PiggyBank,
  Plus,
  Shield,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  formatMoney,
  formatShortDate,
  getStatus,
  policyLabelFromType,
  savingsForOpportunity,
} from "../utils.js";
import { Section } from "./Layout.jsx";

function buildSpendBars(policies = []) {
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
  return top.map((item) => ({ ...item, percent: Math.max(18, Math.round((item.value / peak) * 100)) }));
}

function greetingFor(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function buildMonthlySpend(totalPremium) {
  const monthly = Math.round(totalPremium / 12);
  const variance = [0.78, 0.84, 0.91, 0.96, 1.04, 1.08];
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  return monthLabels.map((label, idx) => ({
    label,
    value: Math.round(monthly * variance[idx]),
  }));
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
  const recentActivity = activity.slice(0, 5);
  const criticalRenewals = upcoming.filter((policy) => (policy.daysRemaining ?? 0) <= 10);
  const monthlySpend = Math.round(totalPremium / 12);
  const missingDocCount = missingDocuments.length;
  const openSavings = opportunities.filter((item) => ["available", "quote_received"].includes(item.status));
  const monthlySeries = buildMonthlySpend(totalPremium);
  const monthlyPeak = Math.max(1, ...monthlySeries.map((item) => item.value));

  const metricCards = [
    { label: "Total annual premium", value: `${formatMoney(totalPremium)}/yr` },
    { label: "Active policies", value: activePolicies.length },
    { label: "Estimated savings", value: `${formatMoney(potentialSavings)}/yr` },
    { label: "Open quote reviews", value: openQuoteRequests.length },
    { label: "Missing documents", value: missingDocCount, action: "Upload", target: "upload" },
    { label: "Pending certificates", value: pendingCertificates, action: "Certificates", target: "certificates" },
  ];

  if (policies.length === 0) {
    return (
      <div className="ss-grid ss-dashboard-grid">
        <section className="ss-card ss-span">
          <div className="ss-dash-onboard">
            <div>
              <span className="ss-eyebrow">{firstName ? `${greetingFor()}, ${firstName}` : "Welcome to SubShield"}</span>
              <h2>Your insurance command center</h2>
              <p className="ss-muted">
                Upload your first policy document and SubShield will extract the details,
                track your renewal dates, and start looking for savings.
              </p>
              <div className="ss-row" style={{ marginTop: 18 }}>
                <button type="button" className="ss-button" onClick={onUpload}>
                  <Upload size={16} /> Upload first policy
                </button>
                <button type="button" className="ss-button soft" onClick={onOpenPolicies}>
                  <Plus size={16} /> Add manually
                </button>
              </div>
            </div>
            <div className="ss-dash-onboard-steps">
              <div className="ss-dash-onboard-step">
                <span className="ss-dash-onboard-num">1</span>
                <div>
                  <b>Upload a declarations page</b>
                  <small>We extract policy, carrier, and renewal details automatically.</small>
                </div>
              </div>
              <div className="ss-dash-onboard-step">
                <span className="ss-dash-onboard-num">2</span>
                <div>
                  <b>Add your certificate holders</b>
                  <small>Save GC contact info and send COIs in a few clicks.</small>
                </div>
              </div>
              <div className="ss-dash-onboard-step">
                <span className="ss-dash-onboard-num">3</span>
                <div>
                  <b>Let SubShield watch for savings</b>
                  <small>We compare rates at renewal time and surface lower-cost options.</small>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="ss-grid ss-dashboard-grid">
      <section className="ss-card ss-span">
        <div className="ss-dash-top-grid">
          <div className="ss-dash-spend-panel">
            <span className="ss-eyebrow">{firstName ? `${greetingFor()}, ${firstName}` : "Welcome back"}</span>
            <h2>Current insurance spend</h2>
            <div className="ss-dash-spend-value">{formatMoney(totalPremium)}</div>
            <p className="ss-muted">
              About {formatMoney(monthlySpend)}/month across {activePolicies.length} active policies.
            </p>

            <div className="ss-spend-chart" aria-label="Insurance spend trend">
              {monthlySeries.map((point) => (
                <div key={point.label} className="ss-spend-point">
                  <span style={{ height: `${Math.max(12, Math.round((point.value / monthlyPeak) * 70))}px` }} />
                  <small>{point.label}</small>
                </div>
              ))}
            </div>

            <div className="ss-row">
              <button type="button" className="ss-button" onClick={onReviewSavings}>
                <PiggyBank size={16} /> Lower My Insurance
              </button>
              <button type="button" className="ss-button soft" onClick={onOpenPolicies}>
                <Shield size={16} /> View policies
              </button>
            </div>
          </div>

          <div className="ss-dash-accounts-panel">
            <Section
              title="Insurance policies"
              sub="Carrier, renewal status, and annual spend"
              extra={
                <button type="button" className="ss-copy-btn" onClick={onOpenPolicies}>
                  View all <ArrowRight size={13} />
                </button>
              }
            />
            {policyAccounts.slice(0, 6).map((policy) => {
              const status = getStatus(policy.daysRemaining);
              return (
                <div className="ss-dash-account-row" key={policy.id}>
                  <div>
                    <b>{policy.name}</b>
                    <small>
                      {policy.carrier} | {policy.daysRemaining}d to renew
                    </small>
                  </div>
                  <div className="ss-insight-amount">
                    <strong>{formatMoney(policy.premiumAmount ?? policy.premium)}/yr</strong>
                    <em className={`ss-status ${status.className}`}>{status.label}</em>
                  </div>
                </div>
              );
            })}
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
            <small>Monthly-equivalent spend across your highest-cost policies</small>
          </div>
          <div className="ss-dash-trend-bars">
            {spendBars.map((item) => (
              <div className="ss-dash-trend-item" key={item.id}>
                <span style={{ height: `${Math.max(8, Math.round(item.percent * 0.55))}px` }} />
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
          title="Upcoming renewals"
          sub="Deadlines needing action first"
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
                  {policy.carrier} | {formatShortDate(policy.renewalDate || policy.expires)}
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
              {criticalRenewals.length} {criticalRenewals.length === 1 ? "policy is" : "policies are"} in the critical window.
            </span>
          </div>
        )}
      </section>

      <section className="ss-card">
        <Section
          title="Recent insurance activity"
          sub="Latest policy, certificate, and quote events"
          extra={
            <button type="button" className="ss-copy-btn" onClick={() => onQueueAction("activity")}>
              Open activity <ArrowRight size={13} />
            </button>
          }
        />

        {recentActivity.length === 0 && (
          <div className="ss-note success">
            <CheckCircle2 size={16} />
            <span>No recent activity yet. New actions will appear here.</span>
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

      <section className="ss-card ss-span">
        <Section
          title="Ways to save"
          sub="Lower premium spend before renewal by comparing partner-backed options"
        />

        <div className="ss-dash-save-grid">
          <div className="ss-dash-save-primary">
            <b>{recommendedAction.label}</b>
            <p>{recommendedAction.detail}</p>
            <button type="button" className="ss-button" onClick={onReviewSavings}>
              Open Lower My Insurance
            </button>
          </div>

          <div className="ss-dash-save-list">
            {openSavings.length === 0 && (
              <div className="ss-note success">
                <Sparkles size={16} />
                <span>No open savings opportunities right now. We keep monitoring renewal timing and rates.</span>
              </div>
            )}

            {openSavings.slice(0, 4).map((opportunity) => {
              const saving = savingsForOpportunity(opportunity);
              return (
                <div className="ss-dash-save-row" key={opportunity.id}>
                  <div>
                    <b>{policyLabelFromType(opportunity.policyType)}</b>
                    <small>
                      {opportunity.status === "quote_received"
                        ? "Quote ready to review"
                        : `Renews ${formatShortDate(opportunity.renewalDate)}`}
                    </small>
                  </div>
                  <strong>{formatMoney(saving)}/yr</strong>
                </div>
              );
            })}

            <div className="ss-dash-save-footer">
              <div>
                <small>Open opportunities</small>
                <b>{openSavings.length}</b>
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

      {(missingDocCount > 0 || coverageGaps.length > 0) && (
        <section className="ss-card ss-span ss-action-row-card">
          {missingDocCount > 0 && (
            <button type="button" className="ss-action-item" onClick={onUpload}>
              <span className="ss-action-dot warning" aria-hidden="true" />
              <span className="ss-action-text">
                <b>{missingDocCount} {missingDocCount === 1 ? "policy" : "policies"} missing documents</b>
                <small>Upload declarations pages to keep certificates ready</small>
              </span>
              <span className="ss-action-cta">Upload now</span>
            </button>
          )}
          {coverageGaps.length > 0 && (
            <button type="button" className="ss-action-item" onClick={() => onQueueAction("renewals")}>
              <span className="ss-action-dot danger" aria-hidden="true" />
              <span className="ss-action-text">
                <b>{coverageGaps.length} coverage {coverageGaps.length === 1 ? "gap" : "gaps"} need review</b>
                <small>Check renewal dates and coverage continuity</small>
              </span>
              <span className="ss-action-cta">Review</span>
            </button>
          )}
        </section>
      )}
    </div>
  );
}

