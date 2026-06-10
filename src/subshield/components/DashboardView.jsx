import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BadgeDollarSign,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileWarning,
  Plus,
  ShieldCheck,
  Upload,
} from "lucide-react";
import {
  formatMoney,
  formatShortDate,
  policyLabelFromType,
  timeAgo,
} from "../utils.js";

/* ------------------------------------------------------------------ *
 * Dashboard — rebuilt as a calm, intentional command center.
 * A KPI strip answers "where do I stand", a prioritized "Needs
 * attention" list answers "what do I do next", and supporting cards
 * give coverage health, renewals, spend, and recent movement. All
 * styling lives under the self-contained `.ssd` namespace in
 * styles.css so the layout is fully intentional.
 * ------------------------------------------------------------------ */

function greetingFor(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function activityTone(title = "") {
  const t = title.toLowerCase();
  if (t.includes("certificate") || t.includes("sent to")) return "certificate";
  if (t.includes("upload") || t.includes("document")) return "document";
  if (t.includes("sav") || t.includes("quote") || t.includes("coverage review")) return "savings";
  if (t.includes("holder") || t.includes("advisor")) return "holder";
  return "policy";
}

function policyStatus(policy) {
  const days = policy.daysRemaining ?? 999;
  if (days <= 10) return { label: "Critical", tone: "danger", rank: 0 };
  if (days <= 45) return { label: "Renew soon", tone: "warning", rank: 1 };
  return { label: "Active", tone: "ok", rank: 2 };
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

function buildActions({
  upcoming,
  missingDocCount,
  coverageGaps,
  openSavings,
  pendingCertificates,
  onUpload,
  onOpenPolicies,
  onReviewSavings,
  onOpenCertificates,
}) {
  const actions = [];
  const soon = upcoming.filter((p) => (p.daysRemaining ?? 999) <= 30);
  if (soon.length) {
    const urgent = soon.some((p) => p.daysRemaining <= 10);
    actions.push({
      key: "renew",
      tone: urgent ? "danger" : "warning",
      icon: Clock3,
      title: `${soon.length} ${soon.length === 1 ? "policy renews" : "policies renew"} within 30 days`,
      detail: soon.map((p) => p.name).join(", "),
      cta: "Review",
      onClick: onOpenPolicies,
    });
  }
  if (missingDocCount > 0) {
    actions.push({
      key: "docs",
      tone: "warning",
      icon: FileWarning,
      title: `${missingDocCount} ${missingDocCount === 1 ? "policy is" : "policies are"} missing declarations`,
      detail: "Upload declaration pages so certificates stay ready for GCs.",
      cta: "Upload",
      onClick: onUpload,
    });
  }
  const quoteReady = openSavings.filter((o) => o.status === "quote_received");
  if (quoteReady.length) {
    actions.push({
      key: "quote",
      tone: "info",
      icon: BadgeDollarSign,
      title: `${quoteReady.length} partner quote${quoteReady.length > 1 ? "s" : ""} ready to review`,
      detail: "A licensed partner returned a lower rate. Review before it expires.",
      cta: "Review",
      onClick: onReviewSavings,
    });
  } else if (openSavings.length) {
    actions.push({
      key: "savings",
      tone: "info",
      icon: BadgeDollarSign,
      title: `${openSavings.length} savings ${openSavings.length === 1 ? "opportunity" : "opportunities"} available`,
      detail: "Compare partner-backed options before your next renewal.",
      cta: "Compare",
      onClick: onReviewSavings,
    });
  }
  if (pendingCertificates > 0) {
    actions.push({
      key: "certs",
      tone: "info",
      icon: FileCheck2,
      title: `${pendingCertificates} certificate ${pendingCertificates === 1 ? "holder" : "holders"} need a fresh COI`,
      detail: "Send updated proof of insurance to keep your GCs current.",
      cta: "Send",
      onClick: onOpenCertificates,
    });
  }
  if (coverageGaps.length) {
    actions.push({
      key: "gaps",
      tone: "warning",
      icon: AlertTriangle,
      title: `${coverageGaps.length} coverage ${coverageGaps.length === 1 ? "gap" : "gaps"} detected`,
      detail: coverageGaps.slice(0, 2).map((g) => g.label).join(", "),
      cta: "Add",
      onClick: onOpenPolicies,
    });
  }
  return actions;
}

function KpiCard({ label, value, sub, tone, icon: Icon }) {
  return (
    <div className={`ssd-kpi${tone ? ` is-${tone}` : ""}`}>
      <div className="ssd-kpi-head">
        <span className="ssd-kpi-label">{label}</span>
        {Icon && <Icon size={15} aria-hidden="true" className="ssd-kpi-icon" />}
      </div>
      <strong className="ssd-kpi-value">{value}</strong>
      {sub && <span className="ssd-kpi-sub">{sub}</span>}
    </div>
  );
}

function CardHead({ title, sub, action }) {
  return (
    <div className="ssd-card-head">
      <div>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {action}
    </div>
  );
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
  coiSends,
  contractors = [],
  coverageGaps,
  missingDocuments,
  onReviewSavings,
  onOpenPolicies,
  onOpenCertificates,
  onUpload,
  activity = [],
  pendingCertificates = 0,
}) {
  const activePolicies = policies.filter((p) => (p.policyType || p.type) !== "license");

  if (policies.length === 0) {
    return (
      <div className="ssd ssd-empty-state">
        <section className="ssd-card ssd-onboard">
          <span className="ssd-eyebrow">
            {firstName ? `${greetingFor()}, ${firstName}` : "Welcome to SubShield"}
          </span>
          <h2>Your insurance command center</h2>
          <p>
            Keep every policy, certificate, and renewal in one place — prove coverage in
            seconds, never miss an expiration, and never let paperwork hold up the job.
          </p>
          <div className="ssd-onboard-actions">
            <button type="button" className="ssd-btn ssd-btn-primary" onClick={onUpload}>
              <Upload size={16} /> Upload your first policy
            </button>
            <button type="button" className="ssd-btn ssd-btn-ghost" onClick={onOpenPolicies}>
              <Plus size={16} /> Add manually
            </button>
          </div>
          <div className="ssd-onboard-steps">
            {[
              ["Upload your policies", "We read carrier, coverage, and renewal dates automatically."],
              ["Save GCs & send COIs", "Store client details once and send proof of insurance in a click."],
              ["Stay ahead of renewals", "Get reminders before coverage lapses and compare options when you want."],
            ].map(([t, d], i) => (
              <div className="ssd-onboard-step" key={t}>
                <span className="ssd-onboard-num">{i + 1}</span>
                <div>
                  <b>{t}</b>
                  <small>{d}</small>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  const monthly = Math.round(totalPremium / 12);
  const carriers = new Set(activePolicies.map((p) => p.carrier).filter(Boolean)).size;
  const holderStatuses = contractors.map((c) => coiStatusForHolder(c, coiSends));
  const compliantHolders = holderStatuses.filter((s) => s === "current").length;
  const complianceTone =
    contractors.length === 0
      ? undefined
      : compliantHolders === contractors.length
      ? "ok"
      : compliantHolders === 0
      ? "danger"
      : "warning";
  const openSavings = opportunities.filter((o) => ["available", "quote_received"].includes(o.status));
  const nextRenewal = upcoming[0];

  const actions = buildActions({
    upcoming,
    missingDocCount: missingDocuments.length,
    coverageGaps,
    openSavings,
    pendingCertificates,
    onUpload,
    onOpenPolicies,
    onReviewSavings,
    onOpenCertificates,
  });

  const premiumRows = [...activePolicies]
    .map((p) => ({
      id: p.id,
      name: policyLabelFromType(p.policyType || p.type),
      carrier: p.carrier,
      annual: p.premiumAmount ?? p.premium ?? 0,
    }))
    .sort((a, b) => b.annual - a.annual);
  const premiumPeak = Math.max(1, ...premiumRows.map((r) => r.annual));

  const healthRows = [...activePolicies]
    .sort(
      (a, b) =>
        policyStatus(a).rank - policyStatus(b).rank ||
        (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999)
    )
    .slice(0, 5);

  const recentActivity = activity.slice(0, 5);

  return (
    <div className="ssd">
      {/* KPI strip ------------------------------------------------ */}
      <div className="ssd-kpis">
        <KpiCard label="Annual premium" value={formatMoney(totalPremium)} sub={`≈ ${formatMoney(monthly)} / month`} />
        <KpiCard
          label="Active policies"
          value={activePolicies.length}
          sub={`${carriers} carrier${carriers === 1 ? "" : "s"}`}
        />
        <KpiCard
          label="Compliant holders"
          value={contractors.length ? `${compliantHolders} / ${contractors.length}` : "—"}
          sub={contractors.length ? "current certificates" : "no holders yet"}
          tone={complianceTone}
        />
        <KpiCard
          label="Savings identified"
          value={formatMoney(potentialSavings)}
          sub={openSavings.length ? `${openSavings.length} to review` : "monitoring rates"}
          tone={potentialSavings > 0 ? "accent" : undefined}
        />
      </div>

      {/* Main grid ----------------------------------------------- */}
      <div className="ssd-grid">
        <div className="ssd-main">
          {/* Needs attention */}
          <section className="ssd-card">
            <CardHead
              title="Needs attention"
              sub={
                actions.length
                  ? `${actions.length} item${actions.length === 1 ? "" : "s"} to act on`
                  : "You're all caught up"
              }
            />
            {actions.length === 0 ? (
              <div className="ssd-allclear">
                <CheckCircle2 size={18} />
                <span>Everything looks good — no urgent actions right now.</span>
              </div>
            ) : (
              <ul className="ssd-actions">
                {actions.slice(0, 4).map((a) => (
                  <li key={a.key}>
                    <button type="button" className={`ssd-action is-${a.tone}`} onClick={a.onClick}>
                      <span className="ssd-action-icon" aria-hidden="true">
                        <a.icon size={16} />
                      </span>
                      <span className="ssd-action-body">
                        <span className="ssd-action-title">{a.title}</span>
                        <span className="ssd-action-detail">{a.detail}</span>
                      </span>
                      <span className="ssd-action-cta">
                        {a.cta} <ArrowRight size={14} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Upcoming renewals */}
          <section className="ssd-card">
            <CardHead
              title="Upcoming renewals"
              sub="Ordered by deadline"
              action={
                <button type="button" className="ssd-link" onClick={onOpenPolicies}>
                  View all <ArrowRight size={13} />
                </button>
              }
            />
            {upcoming.length === 0 ? (
              <div className="ssd-allclear">
                <CheckCircle2 size={18} />
                <span>No renewals coming up — your coverage is in good shape.</span>
              </div>
            ) : (
              <ul className="ssd-renewals">
                {upcoming.map((p) => {
                  const st = policyStatus(p);
                  return (
                    <li key={p.id}>
                      <button type="button" className="ssd-renewal" onClick={onOpenPolicies}>
                        <span className={`ssd-renewal-date is-${st.tone}`}>
                          <b>{formatShortDate(p.renewalDate || p.expires)}</b>
                          <small>{p.daysRemaining} day{p.daysRemaining === 1 ? "" : "s"}</small>
                        </span>
                        <span className="ssd-renewal-body">
                          <b>{p.name}</b>
                          <small>{p.carrier}</small>
                        </span>
                        <span className={`ssd-pill is-${st.tone}`}>{st.label}</span>
                        <ArrowRight size={15} className="ssd-renewal-arrow" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Premium by policy */}
          <section className="ssd-card">
            <CardHead
              title="Premium by policy"
              sub="Annual spend across active coverage"
              action={<span className="ssd-total">{formatMoney(totalPremium)} / yr</span>}
            />
            <ul className="ssd-bars">
              {premiumRows.map((r) => (
                <li className="ssd-bar-row" key={r.id}>
                  <span className="ssd-bar-name" title={`${r.name} · ${r.carrier}`}>{r.name}</span>
                  <span className="ssd-bar-track" aria-hidden="true">
                    <span
                      className="ssd-bar-fill"
                      style={{ width: `${Math.max(6, Math.round((r.annual / premiumPeak) * 100))}%` }}
                    />
                  </span>
                  <span className="ssd-bar-val">{formatMoney(r.annual)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Sidebar column */}
        <aside className="ssd-side">
          {/* Policy health */}
          <section className="ssd-card">
            <CardHead
              title="Policy health"
              action={
                <button type="button" className="ssd-link" onClick={onOpenPolicies}>
                  All <ArrowRight size={13} />
                </button>
              }
            />
            <ul className="ssd-health">
              {healthRows.map((p) => {
                const st = policyStatus(p);
                return (
                  <li key={p.id} className="ssd-health-row">
                    <span className={`ssd-dot is-${st.tone}`} aria-hidden="true" />
                    <span className="ssd-health-body">
                      <b>{p.name}</b>
                      <small>{p.carrier} · {p.daysRemaining}d</small>
                    </span>
                    <span className="ssd-health-amt">{formatMoney(p.premiumAmount ?? p.premium)}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Savings */}
          <section className="ssd-card ssd-savings">
            <CardHead title="Savings" />
            <div className="ssd-savings-figure">
              <span className="ssd-savings-amt">{formatMoney(potentialSavings)}</span>
              <span className="ssd-savings-unit">/ yr identified</span>
            </div>
            <p className="ssd-savings-copy">
              {openSavings.length
                ? `${openSavings.length} opportunit${openSavings.length === 1 ? "y" : "ies"} ready to compare with licensed partners.`
                : "We monitor renewal timing and market rates for lower-cost options."}
            </p>
            <div className="ssd-savings-meta">
              <div><small>Realized</small><b>{formatMoney(realizedSavings)}/yr</b></div>
              <div><small>Documents</small><b>{docsCount}</b></div>
            </div>
            <button type="button" className="ssd-btn ssd-btn-primary ssd-btn-block" onClick={onReviewSavings}>
              Review savings <ArrowUpRight size={15} />
            </button>
          </section>

          {/* Recent activity */}
          <section className="ssd-card">
            <CardHead
              title="Recent activity"
              action={
                recentActivity.length ? (
                  <span className="ssd-muted-xs">Updated {timeAgo(recentActivity[0].createdAt)}</span>
                ) : null
              }
            />
            {recentActivity.length === 0 ? (
              <div className="ssd-allclear">
                <CheckCircle2 size={18} />
                <span>Uploads, certificate sends, and savings will show up here.</span>
              </div>
            ) : (
              <ul className="ssd-activity">
                {recentActivity.map((item) => (
                  <li key={item.id} className={`ssd-activity-row is-${activityTone(item.title)}`}>
                    <span className="ssd-activity-mark" aria-hidden="true" />
                    <div>
                      <div className="ssd-activity-top">
                        <b title={item.title}>{item.title}</b>
                        <small>{timeAgo(item.createdAt)}</small>
                      </div>
                      <small title={item.body}>{item.body}</small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {nextRenewal && (
        <p className="ssd-foot">
          <ShieldCheck size={13} aria-hidden="true" />
          Next renewal: <b>{nextRenewal.name}</b> on{" "}
          {formatShortDate(nextRenewal.renewalDate || nextRenewal.expires)} ({nextRenewal.daysRemaining} days).
        </p>
      )}
    </div>
  );
}
