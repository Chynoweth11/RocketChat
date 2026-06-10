import { useState, useEffect } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileWarning,
  PiggyBank,
  Plus,
  Send,
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
  timeAgo,
} from "../utils.js";
import { Section } from "./Layout.jsx";

function activityTone(title = "") {
  const t = title.toLowerCase();
  if (t.includes("certificate") || t.includes("sent to")) return "certificate";
  if (t.includes("upload") || t.includes("document")) return "document";
  if (t.includes("sav") || t.includes("quote") || t.includes("coverage review")) return "savings";
  if (t.includes("setting") || t.includes("logout") || t.includes("profile")) return "neutral";
  if (t.includes("holder") || t.includes("advisor")) return "holder";
  return "policy";
}

function buildSpendBars(policies = []) {
  const top = [...policies]
    .filter((policy) => (policy.policyType || policy.type) !== "license")
    .sort((a, b) => (b.premiumAmount ?? b.premium ?? 0) - (a.premiumAmount ?? a.premium ?? 0))
    .slice(0, 6)
    .map((policy) => ({
      id: policy.id,
      name: policyLabelFromType(policy.policyType || policy.type),
      value: Math.round((policy.premiumAmount ?? policy.premium ?? 0) / 12),
    }));

  const peak = Math.max(1, ...top.map((item) => item.value));
  return top.map((item) => ({ ...item, percent: Math.max(8, Math.round((item.value / peak) * 100)) }));
}

function greetingFor(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const POLICY_HEALTH_LIMIT = 4;

// Cumulative spend pace: until a backend supplies real billing history, this
// charts the even 1/12 monthly run-rate accumulated across the trailing six
// months ending with the current month — an honest, rising curve of how spend
// adds up. `value` is the single-month run-rate (used by the breakdown modal);
// `cumulative` drives the ascending bars. Labels derive from today's date so
// they never go stale.
function buildMonthlySpend(totalPremium, now = new Date()) {
  const monthly = Math.round(totalPremium / 12);
  const points = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const monthsElapsed = 6 - offset; // 1 (oldest) … 6 (current)
    points.push({
      label: MONTH_ABBR[date.getMonth()],
      value: monthly,
      cumulative: monthly * monthsElapsed,
    });
  }
  return points;
}

function compactAnnualPremium(value) {
  const amount = Number(value) || 0;
  if (amount >= 1000) {
    const compact = (amount / 1000).toFixed(amount >= 10000 ? 1 : 1).replace(/\.0$/, "");
    return `$${compact}k / yr`;
  }
  return `${formatMoney(amount)} / yr`;
}

function dashboardPolicyStatus(policy) {
  const days = policy.daysRemaining ?? 999;
  if (days <= 10) return { label: "Critical", className: "danger", rank: 0 };
  if (days <= 60) return { label: "Review Soon", className: "warning", rank: 1 };
  return { label: "Active", className: "success", rank: 2 };
}

function policyHealthTypeRank(policy) {
  const key = `${policy.policyType || policy.type || ""} ${policy.name || ""}`.toLowerCase();
  if (key.includes("worker")) return 0;
  if (key.includes("auto")) return 1;
  if (key.includes("general") || (key.includes("liability") && !key.includes("umbrella"))) return 2;
  if (key.includes("umbrella")) return 3;
  if (key.includes("property")) return 4;
  return 9;
}

function dashboardPolicyName(policy) {
  return policy.name === "Umbrella / Excess Liability" ? "Umbrella / Excess" : policy.name;
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
  contractors = [],
  coverageGaps,
  missingDocuments,
  recommendedAction,
  onReviewSavings,
  onOpenPolicies,
  onOpenCertificates,
  onUpload,
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
  const primaryCriticalRenewal = criticalRenewals[0];
  const monthlySpend = Math.round(totalPremium / 12);
  const missingDocCount = missingDocuments.length;
  const openSavings = opportunities.filter((item) => ["available", "quote_received"].includes(item.status));
  const monthlySeries = buildMonthlySpend(totalPremium);
  const monthlyPeak = Math.max(1, ...monthlySeries.map((item) => item.cumulative));
  const criticalPolicyCount = activePolicies.filter((policy) => dashboardPolicyStatus(policy).className === "danger").length;
  const policyHealthRows = [...activePolicies]
    .sort((a, b) => {
      const aStatus = dashboardPolicyStatus(a);
      const bStatus = dashboardPolicyStatus(b);
      return (
        policyHealthTypeRank(a) - policyHealthTypeRank(b) ||
        aStatus.rank - bStatus.rank ||
        (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999) ||
        (b.premiumAmount ?? b.premium ?? 0) - (a.premiumAmount ?? a.premium ?? 0)
      );
    })
    .slice(0, POLICY_HEALTH_LIMIT);
  const [breakdownMonth, setBreakdownMonth] = useState(null);
  const monthlyBreakdown = policyAccounts.map((policy) => {
    const annual = policy.premiumAmount ?? policy.premium ?? 0;
    return {
      id: policy.id,
      name: policyLabelFromType(policy.policyType || policy.type),
      carrier: policy.carrier,
      annual,
      monthly: Math.round(annual / 12),
    };
  });

  if (policies.length === 0) {
    return (
      <div className="ss-grid ss-dashboard-grid">
        <section className="ss-card ss-span">
          <div className="ss-dash-onboard">
            <div>
              <span className="ss-eyebrow">{firstName ? `${greetingFor()}, ${firstName}` : "Welcome to SubShield"}</span>
              <h2>Your insurance command center</h2>
              <p className="ss-muted">
                Keep every policy, certificate, and renewal in one place so you can
                prove coverage in seconds, never miss an expiration, and never let
                paperwork hold up approval or field work.
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
                  <b>Upload your policies</b>
                  <small>We pull carrier, coverage, and renewal dates so nothing slips through.</small>
                </div>
              </div>
              <div className="ss-dash-onboard-step">
                <span className="ss-dash-onboard-num">2</span>
                <div>
                  <b>Save your GCs & send COIs</b>
                  <small>Store client info once and send proof of insurance in a few clicks.</small>
                </div>
              </div>
              <div className="ss-dash-onboard-step">
                <span className="ss-dash-onboard-num">3</span>
                <div>
                  <b>Stay ahead of renewals</b>
                  <small>Get reminders before coverage expires and compare options with licensed partners when you want.</small>
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

            <div className="ss-spend-chart" aria-label="Cumulative insurance spend across the trailing six months">
              {monthlySeries.map((point, idx) => (
                <button
                  type="button"
                  key={point.label}
                  className={`ss-spend-point${idx === monthlySeries.length - 1 ? " is-current" : ""}`}
                  onDoubleClick={() => setBreakdownMonth(`${point.label} ${new Date().getFullYear()}`)}
                  title={`Double-click for the ${point.label} cost breakdown`}
                  aria-label={`${point.label}: ${formatMoney(point.cumulative)} cumulative (${formatMoney(point.value)} that month). Double-click for the cost breakdown.`}
                >
                  <em className="ss-spend-val">{formatMoney(point.cumulative)}</em>
                  <span style={{ height: `${Math.max(12, Math.round((point.cumulative / monthlyPeak) * 78))}px` }} />
                  <small>{point.label}</small>
                </button>
              ))}
            </div>
            <p className="ss-spend-hint">Cumulative spend over the last 6 months. Double-click a month for its cost breakdown.</p>
            <div className="ss-dash-action-rail" aria-label="Dashboard primary actions">
              <button type="button" className="ss-action-tile primary" onClick={onReviewSavings}>
                <span className="ss-action-icon">
                  <PiggyBank size={16} />
                </span>
                <span>
                  <b>Review savings</b>
                  <small>{formatMoney(potentialSavings)}/yr identified</small>
                </span>
                <ArrowRight size={15} />
              </button>
              <button type="button" className="ss-action-tile" onClick={onOpenPolicies}>
                <span className="ss-action-icon">
                  <Shield size={16} />
                </span>
                <span>
                  <b>Open policies</b>
                  <small>Limits, deductibles, renewals</small>
                </span>
                <ArrowRight size={15} />
              </button>
              <button type="button" className="ss-action-tile" onClick={onUpload}>
                <span className="ss-action-icon">
                  <Upload size={16} />
                </span>
                <span>
                  <b>Upload insurance</b>
                  <small>Declarations or certificates</small>
                </span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>

          <div className="ss-dash-accounts-panel">
            <Section
              title="Policy Health"
              sub="Active coverage, renewals, and risk items"
            />

            <div className="ss-policy-health-summary" aria-label="Policy health summary">
              <span><b>{activePolicies.length}</b> Active</span>
              <span><b>{criticalPolicyCount}</b> Critical</span>
              <span><b>{compactAnnualPremium(totalPremium)}</b></span>
            </div>

            {policyHealthRows.map((policy) => {
              const status = dashboardPolicyStatus(policy);
              return (
                <div className="ss-policy-health-row" key={policy.id}>
                  <div className="ss-policy-health-copy">
                    <b>{dashboardPolicyName(policy)}</b>
                    <small>
                      {policy.carrier} · Renews in {policy.daysRemaining} day{policy.daysRemaining === 1 ? "" : "s"}
                    </small>
                  </div>
                  <div className="ss-policy-health-meta">
                    <strong>{formatMoney(policy.premiumAmount ?? policy.premium)}/yr</strong>
                    <em className={`ss-status ${status.className}`}>{status.label}</em>
                  </div>
                </div>
              );
            })}
            {policyHealthRows.length === 0 && (
              <div className="ss-note">
                <FileWarning size={16} />
                <span>No policies added yet. Upload a policy to start tracking spend.</span>
              </div>
            )}
            {policyHealthRows.length > 0 && (
              <button type="button" className="ss-policy-health-action" onClick={onOpenPolicies}>
                View all policies <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="ss-dash-trend">
          <div className="ss-dash-trend-head">
            <b>Premium trend by policy group</b>
            <small>Monthly-equivalent spend across your highest-cost policies</small>
          </div>
          <div className="ss-dash-trend-bars">
            {spendBars.map((item) => (
              <div className="ss-dash-trend-row" key={item.id}>
                <span className="ss-dash-trend-name" title={item.name}>{item.name}</span>
                <span className="ss-dash-trend-track">
                  <span className="ss-dash-trend-fill" style={{ width: `${item.percent}%` }} />
                </span>
                <span className="ss-dash-trend-val">{formatMoney(item.value)}/mo</span>
              </div>
            ))}
            {spendBars.length === 0 && (
              <p className="ss-muted" style={{ margin: 0, fontSize: 13 }}>
                Add a policy to see your premium breakdown.
              </p>
            )}
          </div>
        </div>
      </section>

      <ActionCenter
        upcoming={upcoming}
        missingDocCount={missingDocCount}
        coverageGaps={coverageGaps}
        openSavings={openSavings}
        onUpload={onUpload}
        onOpenPolicies={onOpenPolicies}
        onReviewSavings={onReviewSavings}
        onOpenCertificates={onOpenCertificates}
        pendingCertificates={pendingCertificates}
      />

      <div className="ss-dashboard-workspace ss-span">
        <section className="ss-card ss-dash-renewals-card ss-dash-lower-left">
          <Section
            title="Upcoming renewals"
            sub="Prioritized by deadline and policy impact"
            extra={
              <button type="button" className="ss-copy-btn" onClick={onOpenPolicies}>
                View all <ArrowRight size={13} />
              </button>
            }
          />

          {upcoming.length === 0 && (
            <div className="ss-note success">
              <CheckCircle2 size={16} />
              <span>No upcoming renewals. Your coverage is in good shape.</span>
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="ss-renewal-timeline">
              {upcoming.map((policy) => {
                const status = getStatus(policy.daysRemaining);
                const isPriority = policy.id === primaryCriticalRenewal?.id;
                const renewalDate = formatShortDate(policy.renewalDate || policy.expires);
                return (
                  <button
                    type="button"
                    className={`ss-renewal-timeline-row ${status.className}${isPriority ? " is-priority" : ""}`}
                    key={policy.id}
                    onClick={onOpenPolicies}
                    aria-label={`Open ${policy.name} renewal details`}
                  >
                    <span className="ss-renewal-time">
                      <b>{renewalDate}</b>
                      <small>
                        {policy.daysRemaining} day{policy.daysRemaining === 1 ? "" : "s"}
                      </small>
                    </span>
                    <span className="ss-renewal-rail" aria-hidden="true">
                      <span />
                    </span>
                    <span className="ss-renewal-copy">
                      {isPriority && <em>Next renewal</em>}
                      <b title={policy.name}>{policy.name}</b>
                      <small title={`${policy.carrier} | Renews ${renewalDate}`}>{policy.carrier}</small>
                    </span>
                    <span className="ss-renewal-state">
                      {status.className === "danger"
                        ? "Review now"
                        : status.className === "warning"
                        ? "Prepare"
                        : "Scheduled"}
                    </span>
                    <ArrowRight className="ss-renewal-row-arrow" size={15} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="ss-card ss-dash-activity-card ss-dash-lower-right">
          <Section
            title="Recent activity"
            sub="Latest account movement"
            extra={
              recentActivity.length > 0 && (
                <span className="ss-activity-summary">Updated {timeAgo(recentActivity[0].createdAt)}</span>
              )
            }
          />

          {recentActivity.length === 0 && (
            <div className="ss-note">
              <CheckCircle2 size={16} />
              <span>No activity yet. Actions like uploads, certificate sends, and savings will appear here.</span>
            </div>
          )}

          {recentActivity.length > 0 && (
            <div className="ss-dash-activity-list">
              {recentActivity.map((item) => (
                <article className={`ss-dash-activity-row ss-dash-activity-row--${activityTone(item.title)}`} key={item.id}>
                  <span className="ss-activity-marker" aria-hidden="true" />
                  <div className="ss-dash-activity-content">
                    <div className="ss-dash-activity-mainline">
                      <b title={item.title}>{item.title}</b>
                      <small className="ss-activity-time">{timeAgo(item.createdAt)}</small>
                    </div>
                    <small title={item.body}>{item.body}</small>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {contractors.length > 0 && (
        <COIStatusCard
          contractors={contractors}
          coiSends={coiSends}
          onOpenCertificates={onOpenCertificates}
        />
      )}

      <section className="ss-card ss-span">
        <Section
          title="Savings opportunities"
          sub="Lower your premium spend before renewal by comparing partner-backed options"
          extra={
            <button type="button" className="ss-copy-btn" onClick={onReviewSavings}>
              Review all <ArrowRight size={13} />
            </button>
          }
        />

        <div className="ss-dash-save-grid">
          <div className="ss-dash-save-primary">
            <b>{recommendedAction.label}</b>
            <p>{recommendedAction.detail}</p>
            <button type="button" className="ss-button" onClick={onReviewSavings}>
              Open Savings
            </button>
          </div>

          <div className="ss-dash-save-list">
            {openSavings.length === 0 && (
              <div className="ss-note success">
                <Sparkles size={16} />
                <span>No open savings right now. We keep monitoring renewal timing and market rates.</span>
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
            </div>
          </div>
        </div>
      </section>

      {breakdownMonth && (
        <MonthBreakdownModal
          month={breakdownMonth}
          rows={monthlyBreakdown}
          total={monthlySpend}
          onClose={() => setBreakdownMonth(null)}
        />
      )}
    </div>
  );
}

function MonthBreakdownModal({ month, rows, total, onClose }) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const peak = Math.max(1, ...rows.map((row) => row.monthly));

  return (
    <div
      className="ss-breakdown-backdrop"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="ss-breakdown" role="dialog" aria-modal="true" aria-label={`${month} cost breakdown`}>
        <div className="ss-breakdown-head">
          <div>
            <span className="ss-eyebrow">Estimated monthly spend</span>
            <h3>{month}</h3>
          </div>
          <button type="button" className="ss-breakdown-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="ss-breakdown-total">
          <span>Total this month</span>
          <strong>{formatMoney(total)}</strong>
        </div>

        <div className="ss-breakdown-list">
          {rows.map((row) => (
            <div className="ss-breakdown-row" key={row.id}>
              <div className="ss-breakdown-row-head">
                <span className="ss-breakdown-name">{row.name}</span>
                <strong>{formatMoney(row.monthly)}/mo</strong>
              </div>
              <div className="ss-breakdown-track" aria-hidden="true">
                <span style={{ width: `${Math.round((row.monthly / peak) * 100)}%` }} />
              </div>
              <small>{row.carrier} · {formatMoney(row.annual)}/yr</small>
            </div>
          ))}
        </div>

        <p className="ss-breakdown-note">
          Projected at one-twelfth of each active policy's annual premium. Actual billing may vary by
          carrier schedule.
        </p>
      </div>
    </div>
  );
}

function coiStatusForHolder(contractor, coiSends) {
  const sends = [
    ...(contractor.pastSends || []),
    ...(coiSends || []).filter((s) => s.contractorId === contractor.id),
  ].sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
  if (!sends.length) return "unsent";
  const daysSince = Math.floor((Date.now() - new Date(sends[0].sentAt).getTime()) / 86400000);
  if (daysSince <= 30) return "current";
  if (daysSince <= 90) return "aging";
  return "stale";
}

function COIStatusCard({ contractors, coiSends, onOpenCertificates }) {
  const statuses = contractors.map((c) => ({ contractor: c, status: coiStatusForHolder(c, coiSends) }));
  const current = statuses.filter((s) => s.status === "current").length;
  const needsAction = statuses.filter((s) => s.status !== "current");

  return (
    <section className="ss-card ss-span ss-coi-card">
      <Section
        title="COI status"
        sub="Who has a current certificate on file"
        extra={
          <button type="button" className="ss-copy-btn" onClick={onOpenCertificates}>
            Manage <ArrowRight size={13} />
          </button>
        }
      />

      <div className="ss-coi-overview">
        <div className="ss-coi-summary">
          <div className="ss-coi-summary-copy">
            <span>Certificate readiness</span>
            <b>
              {current} of {contractors.length} holders current
            </b>
            <small>
              {needsAction.length > 0
                ? `${needsAction.length} holder${needsAction.length === 1 ? "" : "s"} need a current COI.`
                : "Every tracked holder has current proof of insurance."}
            </small>
          </div>
          <div className="ss-coi-summary-meter" aria-hidden="true">
            <strong>{contractors.length ? Math.round((current / contractors.length) * 100) : 0}%</strong>
            <span className="ss-coi-bar">
              <span
                className="ss-coi-bar-fill"
                style={{ width: contractors.length ? `${Math.round((current / contractors.length) * 100)}%` : "0%" }}
              />
            </span>
          </div>
        </div>
      </div>

      {needsAction.length > 0 && (
        <div className="ss-coi-needs-action">
          {needsAction.slice(0, 4).map(({ contractor, status }) => (
            <div key={contractor.id} className="ss-coi-holder-row">
              <span className="ss-gc-avatar ss-gc-avatar--sm" aria-hidden="true">{contractor.initials}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{contractor.name}</b>
                <small>{contractor.email}</small>
              </div>
              <span className={`ss-coi-status ${status}`}>
                {status === "unsent" ? "No COI sent" : status === "aging" ? "COI aging" : "Needs refresh"}
              </span>
            </div>
          ))}
          {needsAction.length > 4 && (
            <p className="ss-muted" style={{ margin: "8px 0 0", fontSize: 12 }}>
              +{needsAction.length - 4} more need action
            </p>
          )}
        </div>
      )}

      {needsAction.length === 0 && (
        <div className="ss-note success">
          <CheckCircle2 size={16} />
          <span>All certificate holders have a current COI on file. You're good.</span>
        </div>
      )}

      <button type="button" className="ss-button soft ss-coi-send-btn" onClick={onOpenCertificates}>
        <Send size={14} /> Send certificates
      </button>
    </section>
  );
}

function ActionCenter({ upcoming, missingDocCount, coverageGaps, openSavings, onUpload, onOpenPolicies, onReviewSavings, onOpenCertificates, pendingCertificates }) {
  const actions = [];

  const criticalPolicies = upcoming.filter((p) => (p.daysRemaining ?? 999) <= 30);
  if (criticalPolicies.length > 0) {
    actions.push({
      key: "renew",
      priority: criticalPolicies.some((p) => p.daysRemaining <= 10) ? "danger" : "warning",
      icon: <Clock3 size={16} />,
      title: `${criticalPolicies.length} ${criticalPolicies.length === 1 ? "policy renews" : "policies renew"} within 30 days`,
      detail: criticalPolicies.map((p) => p.name).join(", "),
      cta: "View policies",
      onClick: onOpenPolicies,
    });
  }

  if (missingDocCount > 0) {
    actions.push({
      key: "docs",
      priority: "warning",
      icon: <FileWarning size={16} />,
      title: `${missingDocCount} ${missingDocCount === 1 ? "policy is" : "policies are"} missing declaration pages`,
      detail: "Upload declarations pages to keep certificates ready for GCs.",
      cta: "Upload now",
      onClick: onUpload,
    });
  }

  const quoteReadySavings = openSavings.filter((o) => o.status === "quote_received");
  if (quoteReadySavings.length > 0) {
    actions.push({
      key: "quote",
      priority: "info",
      icon: <BadgeDollarSign size={16} />,
      title: `${quoteReadySavings.length} quote${quoteReadySavings.length > 1 ? "s" : ""} ready to review`,
      detail: "A licensed partner found a lower rate. Review before it expires.",
      cta: "Review quotes",
      onClick: onReviewSavings,
    });
  } else if (openSavings.length > 0) {
    actions.push({
      key: "savings",
      priority: "info",
      icon: <BadgeDollarSign size={16} />,
      title: `${openSavings.length} savings ${openSavings.length === 1 ? "opportunity" : "opportunities"} available`,
      detail: "Compare rates and find lower-cost coverage before renewal.",
      cta: "Compare rates",
      onClick: onReviewSavings,
    });
  }

  if (pendingCertificates > 0 && actions.length < 3) {
    actions.push({
      key: "certs",
      priority: "info",
      icon: <FileCheck2 size={16} />,
      title: `${pendingCertificates} certificate ${pendingCertificates === 1 ? "holder" : "holders"} haven't received a COI recently`,
      detail: "Send a fresh certificate of insurance to keep your GCs current.",
      cta: "Send COI",
      onClick: onOpenCertificates,
    });
  }

  if (coverageGaps.length > 0 && actions.length < 3) {
    actions.push({
      key: "gaps",
      priority: "warning",
      icon: <AlertTriangle size={16} />,
      title: `${coverageGaps.length} coverage ${coverageGaps.length === 1 ? "gap" : "gaps"} detected`,
      detail: coverageGaps.slice(0, 2).map((g) => g.label).join(", "),
      cta: "Add coverage",
      onClick: onOpenPolicies,
    });
  }

  const topActions = actions.slice(0, 3);

  if (topActions.length === 0) {
    return (
      <section className="ss-card ss-span ss-action-center">
        <div className="ss-action-center-head">
          <b>Action Center</b>
          <small>Things that need your attention right now</small>
        </div>
        <div className="ss-note success">
          <CheckCircle2 size={16} />
          <span>Everything looks good. No urgent actions needed.</span>
        </div>
      </section>
    );
  }

  return (
    <section className="ss-card ss-span ss-action-center">
      <div className="ss-action-center-head">
        <b>Action Center</b>
        <small>{topActions.length} thing{topActions.length > 1 ? "s" : ""} to do right now</small>
      </div>
      <div className="ss-action-center-list">
        {topActions.map((action) => (
          <button key={action.key} type="button" className={`ss-action-item ss-action-item--${action.priority}`} onClick={action.onClick}>
            <span className={`ss-action-dot ${action.priority}`} aria-hidden="true">
              {action.icon}
            </span>
            <span className="ss-action-text">
              <span className="ss-action-title">{action.title}</span>
              <small>{action.detail}</small>
            </span>
            <span className="ss-action-cta">{action.cta} <ArrowRight size={12} /></span>
          </button>
        ))}
      </div>
    </section>
  );
}

