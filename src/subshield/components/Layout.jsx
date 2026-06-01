import { useCallback } from "react";
import {
  ArrowRight,
  BadgeDollarSign,
  Bell,
  CalendarClock,
  Database,
  FileCheck2,
  FlaskConical,
  FolderOpen,
  History,
  LayoutDashboard,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { formatMoney, getStatus } from "../utils.js";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "policies", label: "My Insurance", icon: ShieldCheck },
  { id: "savings", label: "Lower My Insurance", icon: BadgeDollarSign },
  { id: "renewals", label: "Renewals", icon: CalendarClock },
  { id: "certificates", label: "Certificates", icon: FileCheck2 },
  { id: "documents", label: "Documents", icon: FolderOpen },
  { id: "activity", label: "Activity", icon: History },
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

        {upcoming && upcoming.length > 0 && (
          <div className="ss-upcoming">
            <div className="ss-upcoming-title">
              <b>Upcoming renewals</b>
              <small>Next {upcoming.length}</small>
            </div>
            {upcoming.slice(0, 4).map((policy) => {
              const status = getStatus(policy.daysRemaining);
              return (
                <div key={policy.id} className="ss-upcoming-row">
                  <span className="ss-upcoming-name">{policy.name}</span>
                  <span className={`ss-upcoming-days ${status.className}`}>
                    {policy.daysRemaining}d
                  </span>
                </div>
              );
            })}
          </div>
        )}

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
  onActivity,
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
    policies: "My Insurance",
    savings: "Lower My Insurance",
    renewals: "Renewals",
    certificates: "Certificates of Insurance",
    documents: "Documents",
    activity: "Activity",
    settings: "Settings",
  };
  const eyebrow = {
    dashboard: "Insurance command center",
    policies: "Coverage, premiums, deductibles, and renewals",
    savings: "Find better rates through licensed coverage partners",
    renewals: "Never miss a renewal deadline",
    certificates: "Send and track certificates of insurance",
    documents: "Declarations, certificates, endorsements, and quotes",
    activity: "A complete record of every insurance action",
    settings: "Account, team, billing, and product controls",
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
        <button
          type="button"
          className="ss-icon-button"
          onClick={onActivity}
          aria-label={unread > 0 ? `View activity, ${unread} need attention` : "View activity"}
        >
          <Bell size={18} aria-hidden="true" />
          {unread > 0 && <span className="ss-dot" aria-hidden="true" />}
        </button>
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
