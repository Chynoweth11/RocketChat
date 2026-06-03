import { useCallback } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  CircleDollarSign,
  Bell,
  Database,
  FileCheck2,
  FlaskConical,
  FolderOpen,
  LayoutDashboard,
  Link2,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { formatMoney } from "../utils.js";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "policies", label: "Policies", icon: ShieldCheck },
  { id: "savings", label: "Savings", icon: BadgeDollarSign },
  { id: "getpaid", label: "Get Paid", icon: CircleDollarSign },
  { id: "certificates", label: "Certificates", icon: FileCheck2 },
  { id: "connections", label: "Connections", icon: Link2 },
  { id: "documents", label: "Documents", icon: FolderOpen },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Brand() {
  return (
    <div className="ss-brand">
      <span className="ss-brand-mark" aria-hidden="true">
        <Shield size={20} />
      </span>
      <div>
        <b>SubShield</b>
        <small className="ss-small">Insurance workspace for subcontractors</small>
      </div>
    </div>
  );
}

export function Sidebar({
  view,
  setView,
  upcoming,
  potentialSavings,
  savingsCount,
  onReviewSavings,
  account,
}) {
  const soon = upcoming?.filter((policy) => (policy.daysRemaining ?? 999) <= 30).length || 0;

  const handleNavKeyDown = useCallback((event) => {
    const items = Array.from(event.currentTarget.querySelectorAll(".ss-nav"));
    const idx = items.indexOf(document.activeElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(idx + 1) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(idx - 1 + items.length) % items.length]?.focus();
    }
  }, []);

  return (
    <aside className="ss-sidebar">
      <Brand />

      <div className="ss-sidebar-scroll">
        <nav aria-label="Primary" onKeyDown={handleNavKeyDown}>
          {NAV_ITEMS.map((item) => (
            <NavButton
              key={item.id}
              active={view === item.id}
              icon={item.icon}
              label={item.label}
              badge={item.id === "savings" && savingsCount > 0 ? savingsCount : null}
              onClick={() => setView(item.id)}
            />
          ))}
        </nav>

        <div className="ss-side-card">
          <span className="ss-eyebrow">{potentialSavings > 0 ? "Savings found" : "Coverage healthy"}</span>
          <strong>
            {potentialSavings > 0 ? `${formatMoney(potentialSavings)}/yr` : "You're set"}
          </strong>
          <p>
            {potentialSavings > 0
              ? "Lower-rate options are available. Review before renewal."
              : "No new savings right now. We keep monitoring rates."}
          </p>
          <div className="ss-savings-stack">
            <div>
              <small>Needs action</small>
              <strong>{savingsCount}</strong>
            </div>
            <div>
              <small>Renewing soon</small>
              <strong>{soon}</strong>
            </div>
          </div>
          <button type="button" className="ss-button" onClick={onReviewSavings}>
            {potentialSavings > 0 ? "Review savings" : "View savings"}
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {account && (
        <button
          type="button"
          className={`ss-account ${view === "settings" ? "active" : ""}`}
          onClick={() => setView("settings")}
          aria-label="Open account settings"
        >
          <span
            className="ss-account-avatar"
            style={account.avatarColor ? { background: account.avatarColor } : undefined}
            aria-hidden="true"
          >
            {account.initials}
          </span>
          <span className="ss-account-copy">
            <b>{account.name}</b>
            <small>{account.workspace}</small>
          </span>
          {account.plan && <span className="ss-account-plan">{account.plan}</span>}
        </button>
      )}
    </aside>
  );
}

export function NavButton({ active, icon: Icon, label, onClick, badge }) {
  return (
    <button
      type="button"
      className={`ss-nav ${active ? "active" : ""}`}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={19} aria-hidden="true" />
      <span>{label}</span>
      {badge ? (
        <span className="ss-nav-badge" aria-label={`${badge} needs attention`}>
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export function Header({
  view,
  onUpload,
  onSearch,
  unread,
  demoMode = false,
  onLoadSample,
  onClearDemo,
}) {
  const todayLabel = new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const titles = {
    dashboard: "Dashboard",
    policies: "Policies",
    savings: "Savings",
    certificates: "Certificates",
    documents: "Documents",
    settings: "Settings",
    getpaid: "Get Paid",
    connections: "Connections",
  };
  const eyebrow = {
    dashboard: "Your insurance command center",
    policies: "Coverage, premiums, renewals, and health scores",
    savings: "Find better rates through licensed coverage partners",
    certificates: "Send and track certificates of insurance",
    documents: "Declarations, certificates, endorsements, and quotes",
    settings: "Account, team, billing, and product controls",
    getpaid: "Coverage status, delivery, and payment readiness",
    connections: "Link carriers to sync policies and verify coverage in real time",
  };

  return (
    <header className="ss-top">
      <div>
        <span className="ss-eyebrow">{eyebrow[view]}</span>
        <h1>{titles[view]}</h1>
      </div>
      <div className="ss-top-actions">
        {demoMode ? (
          <span className="ss-demo-pill" role="status">
            <FlaskConical size={13} aria-hidden="true" />
            Demo data
            {onClearDemo && (
              <button
                type="button"
                className="ss-demo-pill-clear"
                onClick={onClearDemo}
                aria-label="Clear demo data and return to an empty account"
              >
                <X size={13} />
              </button>
            )}
          </span>
        ) : (
          onLoadSample && (
            <button
              type="button"
              className="ss-demo-load"
              onClick={onLoadSample}
              title="Fill the app with a realistic example account"
            >
              <Database size={14} aria-hidden="true" /> Load demo data
            </button>
          )
        )}
        <small className="ss-top-date">Synced {todayLabel}</small>
        {onSearch && (
          <button
            type="button"
            className="ss-search-trigger"
            onClick={onSearch}
            aria-label="Search (Command or Control + K)"
          >
            <Search size={15} />
            <span>Search</span>
            <kbd>⌘K</kbd>
          </button>
        )}
        <button
          type="button"
          className="ss-button soft ss-upload-btn"
          onClick={onUpload}
        >
          <Upload size={16} /> Upload insurance
        </button>
        {unread > 0 && (
          <span className="ss-alert-chip" role="status" aria-label={`${unread} policies need attention`}>
            <Bell size={13} aria-hidden="true" />
            {unread} need attention
          </span>
        )}
      </div>
    </header>
  );
}

export function Section({ title, sub, extra }) {
  return (
    <div className="ss-section">
      <div>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {extra && <div className="ss-section-extra">{extra}</div>}
    </div>
  );
}

export function Info({ label, value, hint }) {
  return (
    <div className="ss-info">
      <span>{label}</span>
      <b>{value}</b>
      {hint && <small className="ss-info-hint">{hint}</small>}
    </div>
  );
}

export function Spinner() {
  return <span className="ss-spinner" aria-hidden="true" />;
}

/**
 * Compliance disclaimer. SubShield is a workflow/platform layer — it does not
 * sell, bind, or underwrite insurance. Coverage is quoted and issued by
 * licensed insurance partners. Shown anywhere the user is reviewing coverage
 * or savings so the business model is unambiguous and legally safer.
 */
export function PartnerDisclaimer({ compact = false }) {
  if (compact) {
    return (
      <p className="ss-partner-disclaimer compact">
        <ShieldCheck size={12} aria-hidden="true" />
        SubShield is not an insurance company, agency, or broker. Quotes and
        policies are provided by licensed insurance partners.
      </p>
    );
  }
  return (
    <div className="ss-partner-disclaimer" role="note">
      <ShieldCheck size={15} aria-hidden="true" />
      <span>
        <b>How SubShield works.</b> SubShield is a platform that helps you
        organize your insurance information and connect with licensed insurance
        partners. SubShield is not an insurance company, agency, or broker and
        does not sell, recommend, or bind coverage. All quotes, applications,
        underwriting, and policy issuance are handled by licensed insurance
        partners.
      </span>
    </div>
  );
}

const PARTNER_JOURNEY_STEPS = [
  { id: "start", label: "Start", detail: "Tell us what you need" },
  { id: "coverage", label: "Coverage info", detail: "Enter business & policy details" },
  { id: "review", label: "Partner review", detail: "Licensed partners review your info" },
  { id: "quotes", label: "Quote options", detail: "Compare returned quotes" },
  { id: "purchase", label: "Purchase", detail: "Buy directly through the partner" },
  { id: "documents", label: "Documents saved", detail: "Stored in SubShield after issuance" },
];

/**
 * Read-only journey strip that frames the end-to-end partner-routed flow so
 * users always understand SubShield prepares and organizes, while a licensed
 * partner handles the actual transaction.
 */
export function PartnerJourney({ activeId = "coverage" }) {
  const activeIndex = Math.max(
    0,
    PARTNER_JOURNEY_STEPS.findIndex((step) => step.id === activeId)
  );
  return (
    <ol className="ss-partner-journey" aria-label="How coverage review works">
      {PARTNER_JOURNEY_STEPS.map((step, index) => (
        <li
          key={step.id}
          className={`ss-journey-step ${index < activeIndex ? "done" : ""} ${
            index === activeIndex ? "active" : ""
          }`}
          aria-current={index === activeIndex ? "step" : undefined}
        >
          <span className="ss-journey-num">{index + 1}</span>
          <span className="ss-journey-copy">
            <b>{step.label}</b>
            <small>{step.detail}</small>
          </span>
        </li>
      ))}
    </ol>
  );
}
