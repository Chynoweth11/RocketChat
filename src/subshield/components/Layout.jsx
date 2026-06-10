import { useCallback } from "react";
import {
  ArrowRight,
  BadgeDollarSign,
  Bell,
  Database,
  FileCheck2,
  FlaskConical,
  FolderOpen,
  LayoutDashboard,
  Link2,
  Search,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { formatMoney } from "../utils.js";

const NAV_SECTIONS = [
  {
    items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Coverage",
    items: [
      { id: "policies", label: "Policies", icon: ShieldCheck },
      { id: "certificates", label: "Certificates", icon: FileCheck2 },
      { id: "documents", label: "Documents", icon: FolderOpen },
    ],
  },
  {
    label: "Connect",
    items: [
      { id: "connections", label: "Connections", icon: Link2 },
      { id: "savings", label: "Savings", icon: BadgeDollarSign },
    ],
  },
];

export function Brand() {
  return (
    <div className="ss-brand">
      <span className="ss-brand-mark" aria-hidden="true">
        <img src="/subshield-logo.png" alt="" />
      </span>
      <div>
        <b>SubShield</b>
        <small className="ss-small">Insurance compliance for subcontractors</small>
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
          {NAV_SECTIONS.map((section, sIdx) => (
            <div key={sIdx}>
              {sIdx > 0 && <div className="ss-nav-divider" aria-hidden="true" />}
              {section.label && <div className="ss-nav-section">{section.label}</div>}
              {section.items.map((item) => (
                <NavButton
                  key={item.id}
                  active={view === item.id}
                  icon={item.icon}
                  label={item.label}
                  badge={item.id === "savings" && savingsCount > 0 ? savingsCount : null}
                  onClick={() => setView(item.id)}
                />
              ))}
            </div>
          ))}
          <div className="ss-nav-divider" aria-hidden="true" />
          <NavButton
            active={view === "settings"}
            icon={Settings}
            label="Settings"
            onClick={() => setView("settings")}
          />
        </nav>

        <div className="ss-side-card">
          <span className="ss-eyebrow">{soon > 0 ? "Renewing soon" : "Coverage healthy"}</span>
          <strong>{soon > 0 ? `${soon} renewal${soon === 1 ? "" : "s"}` : "You're set"}</strong>
          <p>
            {soon > 0
              ? "Within 30 days. Review coverage before it lapses."
              : "No renewals in the next 30 days."}
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
          {potentialSavings > 0 && (
            <button type="button" className="ss-button soft" onClick={onReviewSavings}>
              Review {formatMoney(potentialSavings)}/yr in savings
              <ArrowRight size={15} />
            </button>
          )}
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
    connections: "Connections",
  };
  const subtitle = {
    dashboard: "What needs your attention today.",
    policies: "Coverage, premiums, and renewals in one place.",
    savings: "Review coverage and pricing with licensed partners.",
    certificates: "Send and track certificates of insurance.",
    documents: "Every insurance document, organized automatically.",
    settings: "Profile, team, alerts, and workspace controls.",
    connections: "Connect providers to import policies automatically.",
  };

  return (
    <header className="ss-top">
      <div className="ss-top-head">
        <h1>{titles[view]}</h1>
        <p className="ss-top-sub">{subtitle[view]}</p>
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
 * Compliance disclaimer. SubShield is a workflow/platform layer - it does not
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
  { id: "purchase", label: "Review & choose", detail: "Review options with the partner" },
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
  // Un-numbered lifecycle status rail (distinct from the numbered wizard below
  // it) so the two progress indicators don't read as competing steppers.
  return (
    <div className="ss-journey-status" role="list" aria-label="Coverage review status">
      {PARTNER_JOURNEY_STEPS.map((step, index) => {
        const state = index < activeIndex ? "done" : index === activeIndex ? "active" : "todo";
        return (
          <div
            key={step.id}
            className={`ss-journey-status-step ${state}`}
            role="listitem"
            aria-current={state === "active" ? "step" : undefined}
          >
            <span className="ss-journey-status-dot" aria-hidden="true" />
            <span className="ss-journey-status-label">{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}
