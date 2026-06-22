import "../dashboard.css";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Car,
  CheckCircle2,
  Clock3,
  FileText,
  HardHat,
  Plus,
  ShieldCheck,
  Umbrella,
  Upload,
} from "lucide-react";
import {
  formatMoney,
  policyLabelFromType,
  savingsForOpportunity,
  scoreClass,
  timeAgo,
} from "../utils.js";

function activityTone(title = "") {
  const t = title.toLowerCase();
  if (t.includes("certificate") || t.includes("coi") || t.includes("sent to")) return "certificate";
  if (t.includes("upload") || t.includes("document")) return "document";
  if (t.includes("sav") || t.includes("quote") || t.includes("rate") || t.includes("coverage review")) return "savings";
  if (t.includes("renew")) return "renewal";
  return "policy";
}

function greetingFor(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function longDate(date = new Date()) {
  return date
    .toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    .toUpperCase();
}

function policyIcon(policy) {
  const key = `${policy.policyType || policy.type || ""} ${policy.name || ""}`.toLowerCase();
  if (key.includes("worker")) return <HardHat size={16} />;
  if (key.includes("auto")) return <Car size={16} />;
  if (key.includes("umbrella")) return <Umbrella size={16} />;
  if (key.includes("property")) return <Building2 size={16} />;
  if (key.includes("license")) return <FileText size={16} />;
  return <ShieldCheck size={16} />;
}

function dashboardPolicyStatus(policy) {
  const days = policy.daysRemaining ?? 999;
  if (days <= 10) return { label: "Critical", className: "danger" };
  if (days <= 45) return { label: "Review soon", className: "warning" };
  return { label: "Active", className: "success" };
}

// Deterministic per-policy health proxy until a backend supplies real scores:
// strong coverage by default, trimmed as a renewal deadline approaches.
function policyHealthScore(policy) {
  const days = policy.daysRemaining ?? 999;
  const penalty = days <= 10 ? 18 : days <= 45 ? 6 : days <= 120 ? 9 : 4;
  return Math.max(78, Math.min(99, 100 - penalty));
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

function HealthRing({ value }) {
  const cls = scoreClass(value);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  return (
    <div className={`ss-nd-ring ${cls}`} role="img" aria-label={`Coverage health ${value} out of 100`}>
      <svg viewBox="0 0 120 120" width="120" height="120">
        <circle cx="60" cy="60" r={radius} className="ss-nd-ring-track" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          className="ss-nd-ring-value"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="ss-nd-ring-label">
        <strong>{value}</strong>
        <span>/ 100</span>
      </div>
    </div>
  );
}

export default function DashboardView({
  firstName,
  coverageHealth = 0,
  totalPremium,
  potentialSavings,
  realizedSavings,
  policies,
  docsCount,
  upcoming,
  opportunities,
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
  const monthlySpend = Math.round(totalPremium / 12);
  const recentActivity = activity.slice(0, 4);
  const renewingSoon = upcoming.filter((p) => (p.daysRemaining ?? 999) <= 30);
  const openSavings = opportunities.filter((item) => ["available", "quote_received"].includes(item.status));
  const quoteReady = openSavings.filter((o) => o.status === "quote_received");
  const topQuote = quoteReady
    .map((o) => savingsForOpportunity(o))
    .sort((a, b) => b - a)[0];
  const criticalCount = activePolicies.filter((p) => dashboardPolicyStatus(p).className === "danger").length;
  const compliantLines = Math.max(0, activePolicies.length - criticalCount - missingDocuments.length);
  const healthClass = scoreClass(coverageHealth);
  const renewalRows = [...upcoming].slice(0, 5);
  const spendBreakdown = [...policyAccounts]
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      name: policyLabelFromType(p.policyType || p.type),
      value: p.premiumAmount ?? p.premium ?? 0,
    }));
  const breakdownPeak = Math.max(1, ...spendBreakdown.map((r) => r.value));

  if (policies.length === 0) {
    return (
      <div className="ss-grid ss-dashboard-grid">
        <section className="ss-card ss-span">
          <div className="ss-dash-onboard">
            <div>
              <span className="ss-eyebrow">{firstName ? `${greetingFor()}, ${firstName}` : "Welcome to SubShield"}</span>
              <h2>Your insurance command center</h2>
              <p className="ss-muted">
                Keep every policy, certificate, and renewal in one place so you can prove coverage in
                seconds, never miss an expiration, and never let paperwork hold up approval or field work.
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
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="ss-nd">
      {/* Header */}
      <header className="ss-nd-header">
        <div className="ss-nd-header-copy">
          <span className="ss-nd-eyebrow">{longDate()}</span>
          <h1>{firstName ? `${greetingFor()}, ${firstName}` : "Welcome back"}</h1>
          <p>Here&apos;s what needs your attention today.</p>
        </div>
        <div className="ss-nd-header-actions">
          <button type="button" className="ss-nd-btn ghost" onClick={onReviewSavings}>
            Request quote
          </button>
          <button type="button" className="ss-nd-btn dark" onClick={onUpload}>
            <Upload size={15} /> Upload policy
          </button>
        </div>
      </header>

      {/* Stat cards */}
      <div className="ss-nd-stats">
        <article className="ss-nd-stat">
          <span className="ss-nd-stat-label">Annual premium</span>
          <strong className="ss-nd-stat-value">{formatMoney(totalPremium)}</strong>
          <small className="ss-nd-stat-foot">across {activePolicies.length} active policies</small>
        </article>
        <article className="ss-nd-stat">
          <span className="ss-nd-stat-label">Active policies</span>
          <strong className="ss-nd-stat-value">{activePolicies.length}</strong>
          <small className="ss-nd-stat-foot">
            <em className="ss-nd-dot warning" />
            {renewingSoon.length} renewing soon
          </small>
        </article>
        <article className="ss-nd-stat">
          <span className="ss-nd-stat-label">Tracked savings</span>
          <strong className="ss-nd-stat-value">{formatMoney(potentialSavings)}<i>/yr</i></strong>
          <small className="ss-nd-stat-foot accent">
            {topQuote ? (
              <>
                <ArrowUpRight size={13} /> {formatMoney(topQuote)} partner offer ready
              </>
            ) : (
              <>Compare partner-backed options</>
            )}
          </small>
        </article>
        <article className="ss-nd-stat">
          <span className="ss-nd-stat-label">Coverage health</span>
          <strong className="ss-nd-stat-value">{coverageHealth}<i>/100</i></strong>
          <small className="ss-nd-stat-foot success">
            {compliantLines} of {activePolicies.length} lines fully compliant
          </small>
        </article>
      </div>

      {/* Cost analysis */}
      <section className="ss-nd-card ss-nd-cost">
        <div className="ss-nd-card-head">
          <div>
            <span className="ss-nd-kicker">Cost analysis</span>
            <h2>Premium by policy group</h2>
            <p>Monthly-equivalent spend across your highest-cost policies.</p>
          </div>
          <div className="ss-nd-cost-total">
            <strong>{formatMoney(monthlySpend)}<i>/mo</i></strong>
            <small>total across {spendBars.length} lines</small>
          </div>
        </div>
        <div className="ss-nd-cost-bars">
          {spendBars.map((item) => (
            <div className="ss-nd-cost-row" key={item.id}>
              <span className="ss-nd-cost-name" title={item.name}>{item.name}</span>
              <span className="ss-nd-cost-track">
                <span className="ss-nd-cost-fill" style={{ width: `${item.percent}%` }} />
              </span>
              <span className="ss-nd-cost-val">{formatMoney(item.value)}/mo</span>
            </div>
          ))}
        </div>
      </section>

      {/* Main two-column workspace */}
      <div className="ss-nd-workspace">
        <div className="ss-nd-main">
          <ActionCenter
            upcoming={upcoming}
            missingDocuments={missingDocuments}
            coverageGaps={coverageGaps}
            openSavings={openSavings}
            topQuote={topQuote}
            recommendedAction={recommendedAction}
            pendingCertificates={pendingCertificates}
            onUpload={onUpload}
            onOpenPolicies={onOpenPolicies}
            onReviewSavings={onReviewSavings}
            onOpenCertificates={onOpenCertificates}
          />

          <section className="ss-nd-card ss-nd-renewals">
            <div className="ss-nd-card-head">
              <div>
                <span className="ss-nd-kicker">Renewal calendar</span>
                <h2>Upcoming renewals</h2>
              </div>
              <button type="button" className="ss-nd-link" onClick={onOpenPolicies}>
                All policies <ArrowRight size={13} />
              </button>
            </div>

            {renewalRows.length === 0 ? (
              <div className="ss-nd-empty">
                <CheckCircle2 size={16} /> No upcoming renewals. Coverage is in good shape.
              </div>
            ) : (
              <div className="ss-nd-table" role="table">
                <div className="ss-nd-table-head" role="row">
                  <span role="columnheader">Policy</span>
                  <span role="columnheader">Renews</span>
                  <span role="columnheader">Premium</span>
                  <span role="columnheader">Health</span>
                </div>
                {renewalRows.map((policy) => {
                  const days = policy.daysRemaining ?? 0;
                  const status = dashboardPolicyStatus(policy);
                  return (
                    <button
                      type="button"
                      className="ss-nd-table-row"
                      role="row"
                      key={policy.id}
                      onClick={onOpenPolicies}
                    >
                      <span className="ss-nd-policy-cell" role="cell">
                        <span className="ss-nd-policy-icon">{policyIcon(policy)}</span>
                        <span className="ss-nd-policy-meta">
                          <b>{policy.name}</b>
                          {policy.policyNumber && <small>{policy.policyNumber}</small>}
                        </span>
                      </span>
                      <span className={`ss-nd-renews ${status.className}`} role="cell">
                        {days} day{days === 1 ? "" : "s"}
                      </span>
                      <span className="ss-nd-premium" role="cell">
                        {formatMoney(policy.premiumAmount ?? policy.premium)}
                      </span>
                      <span className="ss-nd-health" role="cell">
                        {policyHealthScore(policy)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right rail */}
        <aside className="ss-nd-rail">
          <section className="ss-nd-card ss-nd-health-card">
            <span className="ss-nd-kicker">Coverage health</span>
            <div className="ss-nd-health-body">
              <HealthRing value={coverageHealth} />
              <div className="ss-nd-health-copy">
                <b>{healthClass === "success" ? "Strong coverage" : healthClass === "warning" ? "Needs attention" : "At risk"}</b>
                <p>
                  {healthClass === "success"
                    ? "Above the 85 benchmark for your trade and region."
                    : "Review the items below to lift your coverage score."}
                </p>
              </div>
            </div>
            <ul className="ss-nd-health-list">
              <li>
                <CheckCircle2 size={15} className="ss-nd-ic success" />
                {compliantLines} of {activePolicies.length} lines fully compliant
              </li>
              <li>
                <Clock3 size={15} className="ss-nd-ic warning" />
                {renewingSoon.length} renewal{renewingSoon.length === 1 ? "" : "s"} need{renewingSoon.length === 1 ? "s" : ""} attention
              </li>
            </ul>
          </section>

          <section className="ss-nd-card ss-nd-spend-card">
            <div className="ss-nd-card-head tight">
              <span className="ss-nd-kicker">Insurance spend</span>
            </div>
            <strong className="ss-nd-spend-total">{formatMoney(totalPremium)}<i>/year</i></strong>
            <small className="ss-nd-spend-sub">Across {activePolicies.length} lines of coverage</small>
            <div className="ss-nd-spend-list">
              {spendBreakdown.map((row) => (
                <div className="ss-nd-spend-row" key={row.id}>
                  <div className="ss-nd-spend-line">
                    <span>{row.name}</span>
                    <b>{formatMoney(row.value)}</b>
                  </div>
                  <span className="ss-nd-spend-track">
                    <span style={{ width: `${Math.round((row.value / breakdownPeak) * 100)}%` }} />
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="ss-nd-card ss-nd-activity-card">
            <div className="ss-nd-card-head tight">
              <span className="ss-nd-kicker">Recent activity</span>
              {recentActivity.length > 0 && (
                <small className="ss-nd-muted">Updated {timeAgo(recentActivity[0].createdAt)}</small>
              )}
            </div>
            {recentActivity.length === 0 ? (
              <div className="ss-nd-empty sm">
                <CheckCircle2 size={15} /> No recent account movement.
              </div>
            ) : (
              <ul className="ss-nd-activity-list">
                {recentActivity.map((item) => (
                  <li className={`ss-nd-activity-row tone-${activityTone(item.title)}`} key={item.id}>
                    <span className="ss-nd-activity-dot" aria-hidden="true" />
                    <div className="ss-nd-activity-copy">
                      <div className="ss-nd-activity-top">
                        <b title={item.title}>{item.title}</b>
                        <small>{timeAgo(item.createdAt)}</small>
                      </div>
                      <p title={item.body}>{item.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {contractors.length > 0 && (
        <COIStatusCard
          contractors={contractors}
          coiSends={coiSends}
          onOpenCertificates={onOpenCertificates}
        />
      )}
    </div>
  );
}

function buildActionItems({
  upcoming,
  missingDocuments,
  coverageGaps,
  openSavings,
  topQuote,
  pendingCertificates,
  onUpload,
  onOpenPolicies,
  onReviewSavings,
  onOpenCertificates,
}) {
  const items = [];

  upcoming
    .filter((p) => (p.daysRemaining ?? 999) <= 30)
    .slice(0, 1)
    .forEach((p) => {
      items.push({
        key: `renew-${p.id}`,
        tone: (p.daysRemaining ?? 0) <= 10 ? "danger" : "warning",
        title: `${p.name} renews in ${p.daysRemaining} day${p.daysRemaining === 1 ? "" : "s"}`,
        carrier: p.carrier,
        chip: p.policyNumber,
        amount: p.premiumAmount ?? p.premium,
        tag: "Renews soon",
        cta: "Review",
        onClick: onOpenPolicies,
      });
    });

  if (topQuote) {
    items.push({
      key: "quote",
      tone: "info",
      title: "Better rate found via partner",
      carrier: `${formatMoney(topQuote)}/yr lower`,
      tag: "Via partner",
      cta: "View offer",
      primary: true,
      onClick: onReviewSavings,
    });
  } else if (openSavings.length > 0) {
    items.push({
      key: "savings",
      tone: "info",
      title: `${openSavings.length} savings ${openSavings.length === 1 ? "opportunity" : "opportunities"} available`,
      carrier: "Compare partner-backed options before renewal",
      tag: "Savings",
      cta: "Compare",
      onClick: onReviewSavings,
    });
  }

  if (missingDocuments.length > 0) {
    items.push({
      key: "docs",
      tone: "warning",
      title: `${missingDocuments.length} ${missingDocuments.length === 1 ? "policy is" : "policies are"} missing declaration pages`,
      carrier: "Upload declarations to keep certificates ready",
      tag: "Planning",
      cta: "Upload",
      onClick: onUpload,
    });
  }

  if (pendingCertificates > 0) {
    items.push({
      key: "certs",
      tone: "info",
      title: `${pendingCertificates} certificate ${pendingCertificates === 1 ? "holder" : "holders"} need a fresh COI`,
      carrier: "Send proof of insurance to keep GCs current",
      tag: "Certificates",
      cta: "Send",
      onClick: onOpenCertificates,
    });
  }

  if (coverageGaps.length > 0) {
    items.push({
      key: "gaps",
      tone: "warning",
      title: `${coverageGaps.length} coverage ${coverageGaps.length === 1 ? "gap" : "gaps"} detected`,
      carrier: coverageGaps.slice(0, 2).map((g) => g.label).join(", "),
      tag: "Coverage",
      cta: "Open",
      onClick: onOpenPolicies,
    });
  }

  return items.slice(0, 4);
}

function ActionCenter(props) {
  const items = buildActionItems(props);

  return (
    <section className="ss-nd-card ss-nd-action">
      <div className="ss-nd-card-head">
        <div>
          <span className="ss-nd-kicker">Action center</span>
          <h2>What needs attention</h2>
        </div>
        <small className="ss-nd-muted">{items.length} item{items.length === 1 ? "" : "s"}</small>
      </div>

      {items.length === 0 ? (
        <div className="ss-nd-empty">
          <CheckCircle2 size={16} /> Everything looks good. No urgent actions right now.
        </div>
      ) : (
        <ul className="ss-nd-action-list">
          {items.map((item) => (
            <li className="ss-nd-action-row" key={item.key}>
              <span className={`ss-nd-action-dot ${item.tone}`} aria-hidden="true" />
              <div className="ss-nd-action-copy">
                <b>{item.title}</b>
                <small>
                  {item.carrier}
                  {item.chip && <span className="ss-nd-chip">{item.chip}</span>}
                  {item.amount != null && <span className="ss-nd-amount">{formatMoney(item.amount)}/yr</span>}
                </small>
              </div>
              <span className="ss-nd-action-tag">{item.tag}</span>
              <button
                type="button"
                className={`ss-nd-btn sm ${item.primary ? "primary" : "ghost"}`}
                onClick={item.onClick}
              >
                {item.cta}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
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
  const pct = contractors.length ? Math.round((current / contractors.length) * 100) : 0;

  return (
    <section className="ss-nd-card ss-nd-coi">
      <div className="ss-nd-card-head">
        <div>
          <span className="ss-nd-kicker">COI status</span>
          <h2>Who has a current certificate on file</h2>
        </div>
        <button type="button" className="ss-nd-link" onClick={onOpenCertificates}>
          Manage <ArrowRight size={13} />
        </button>
      </div>

      <div className="ss-nd-coi-summary">
        <div>
          <span className="ss-nd-kicker">Certificate readiness</span>
          <b>{current} of {contractors.length} holders current</b>
          <small>
            {needsAction.length > 0
              ? `${needsAction.length} holder${needsAction.length === 1 ? "" : "s"} need a current COI.`
              : "Every tracked holder has current proof of insurance."}
          </small>
        </div>
        <div className="ss-nd-coi-meter">
          <strong className={scoreClass(pct)}>{pct}%</strong>
          <span className="ss-nd-coi-bar">
            <span style={{ width: `${pct}%` }} />
          </span>
        </div>
      </div>

      {needsAction.length > 0 && (
        <div className="ss-nd-coi-holders">
          {needsAction.slice(0, 4).map(({ contractor, status }) => (
            <div className="ss-nd-coi-holder" key={contractor.id}>
              <span className="ss-nd-coi-avatar" aria-hidden="true">{contractor.initials}</span>
              <div className="ss-nd-coi-holder-copy">
                <b>{contractor.name}</b>
                <small>{contractor.email}</small>
              </div>
              <span className={`ss-nd-coi-status ${status}`}>
                {status === "unsent" ? "No COI sent" : status === "aging" ? "COI aging" : "Needs refresh"}
              </span>
            </div>
          ))}
        </div>
      )}

      {needsAction.length === 0 && (
        <div className="ss-nd-empty">
          <CheckCircle2 size={16} /> All certificate holders have a current COI on file.
        </div>
      )}

      <button type="button" className="ss-nd-btn dark wide" onClick={onOpenCertificates}>
        Send certificates
      </button>
    </section>
  );
}
