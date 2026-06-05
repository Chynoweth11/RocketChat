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
  Settings,
  Shield,
  Sparkles,
  Upload,
  UserPlus,
} from "lucide-react";

function activityIcon(title = "") {
  const t = title.toLowerCase();
  if (t.includes("certificate") || t.includes("sent to")) return <Send size={14} />;
  if (t.includes("upload") || t.includes("document")) return <Upload size={14} />;
  if (t.includes("sav") || t.includes("quote") || t.includes("coverage review")) return <BadgeDollarSign size={14} />;
  if (t.includes("setting") || t.includes("logout") || t.includes("profile")) return <Settings size={14} />;
  if (t.includes("holder") || t.includes("advisor")) return <UserPlus size={14} />;
  return <Shield size={14} />;
}

function activityColor(title = "") {
  const t = title.toLowerCase();
  if (t.includes("certificate") || t.includes("sent to")) return "#2f63e9";
  if (t.includes("upload") || t.includes("document")) return "#7c3aed";
  if (t.includes("sav") || t.includes("quote")) return "#0b7f5d";
  if (t.includes("setting") || t.includes("logout")) return "#64748b";
  return "#0284c7";
}
import {
  formatMoney,
  formatShortDate,
  getStatus,
  policyLabelFromType,
  savingsForOpportunity,
  timeAgo,
} from "../utils.js";
import { Section } from "./Layout.jsx";

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

// Projected monthly pace: we only know the annual premium until a backend
// supplies real spend history, so this charts an even 1/12 distribution
// across the trailing six months ending with the current month. Labels are
// derived from today's date so they never go stale.
function buildMonthlySpend(totalPremium, now = new Date()) {
  const monthly = Math.round(totalPremium / 12);
  const points = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    points.push({ label: MONTH_ABBR[date.getMonth()], value: monthly });
  }
  return points;
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
                Keep every policy, certificate, and renewal in one place — so you can
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
                  <small>Get reminders before coverage expires — and compare options with licensed partners when you want.</small>
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

            <div className="ss-spend-chart" aria-label="Projected monthly insurance spend, even pace across the trailing six months">
              {monthlySeries.map((point, idx) => (
                <div
                  key={point.label}
                  className={`ss-spend-point${idx === monthlySeries.length - 1 ? " is-current" : ""}`}
                >
                  <em className="ss-spend-val">{formatMoney(point.value)}</em>
                  <span style={{ height: `${Math.max(12, Math.round((point.value / monthlyPeak) * 70))}px` }} />
                  <small>{point.label}</small>
                </div>
              ))}
            </div>
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
                  <b>Upload document</b>
                  <small>Declarations or certificates</small>
                </span>
                <ArrowRight size={15} />
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
                    else if (item.target === "certificates") onOpenCertificates();
                  }}
                >
                  {item.action}
                </button>
              )}
            </div>
          ))}
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

      <section className="ss-card ss-dash-lower-left">
        <Section
          title="Upcoming renewals"
          sub="Deadlines needing action first"
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

      <section className="ss-card ss-dash-lower-right">
        <Section
          title="Recent activity"
          sub="Latest policy, certificate, and quote events"
        />

        {recentActivity.length === 0 && (
          <div className="ss-note">
            <CheckCircle2 size={16} />
            <span>No activity yet. Actions like uploads, certificate sends, and savings will appear here.</span>
          </div>
        )}

        {recentActivity.map((item) => (
          <div className="ss-dash-activity-row" key={item.id}>
            <span
              className="ss-dash-activity-icon"
              style={{ color: activityColor(item.title) }}
              aria-hidden="true"
            >
              {activityIcon(item.title)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{item.title}</b>
              <small>{item.body}</small>
            </div>
            <small className="ss-activity-time">{timeAgo(item.createdAt)}</small>
          </div>
        ))}
      </section>

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
    <section className="ss-card">
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
        <div className="ss-coi-overview-stat">
          <b className="ss-coi-stat-num">{current}</b>
          <small>of {contractors.length} holders current</small>
          <div className="ss-coi-bar">
            <div
              className="ss-coi-bar-fill"
              style={{ width: contractors.length ? `${Math.round((current / contractors.length) * 100)}%` : "0%" }}
            />
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
          <span>All certificate holders have a current COI on file — you're good.</span>
        </div>
      )}

      <button type="button" className="ss-button soft" style={{ width: "100%", marginTop: 12 }} onClick={onOpenCertificates}>
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
            <span className={`ss-action-dot ${action.priority}`} aria-hidden="true">{action.icon}</span>
            <span className="ss-action-text">
              <b>{action.title}</b>
              <small>{action.detail}</small>
            </span>
            <span className="ss-action-cta">{action.cta} <ArrowRight size={12} /></span>
          </button>
        ))}
      </div>
    </section>
  );
}

