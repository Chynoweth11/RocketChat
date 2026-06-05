import {
  ArrowRight,
  BadgeDollarSign,
  Bell,
  Beaker,
  CalendarClock,
  Command,
  FileCheck2,
  FolderOpen,
  History,
  LayoutDashboard,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Upload,
  UserRound,
} from "lucide-react";
import { formatMoney, getStatus } from "../utils.js";

const NAV_ITEMS = [
  { id: "dashboard", label: "Command center", icon: LayoutDashboard, group: "Workspace" },
  { id: "policies", label: "Policies", icon: ShieldCheck, group: "Coverage" },
  { id: "savings", label: "Savings", icon: BadgeDollarSign, group: "Coverage" },
  { id: "renewals", label: "Renewals", icon: CalendarClock, group: "Coverage" },
  { id: "certificates", label: "Certificates", icon: FileCheck2, group: "Operations" },
  { id: "documents", label: "Documents", icon: FolderOpen, group: "Operations" },
  { id: "activity", label: "Activity", icon: History, group: "Operations" },
  { id: "settings", label: "Settings", icon: Settings, group: "Admin" },
];

const NAV_GROUPS = ["Workspace", "Coverage", "Operations", "Admin"];

export function Brand() {
  return (
    <div className="ss-brand">
      <span className="ss-brand-mark" aria-hidden="true">
        <Shield size={20} />
      </span>
      <div>
        <b>SubShield</b>
        <small className="ss-small">Business insurance, handled</small>
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
}) {
  return (
    <aside className="ss-sidebar">
      <Brand />
      <nav aria-label="Primary">
        {NAV_GROUPS.map((group) => (
          <div className="ss-nav-group" key={group}>
            <span className="ss-nav-label">{group}</span>
            {NAV_ITEMS.filter((item) => item.group === group).map((item) => (
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
      </nav>

      {upcoming && upcoming.length > 0 && (
        <div className="ss-upcoming">
          <div className="ss-upcoming-title">
            <b>Upcoming renewals</b>
            <small>Next {upcoming.length}</small>
          </div>
          {upcoming.map((policy) => {
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
        <span className="ss-eyebrow">
          {potentialSavings > 0 ? "Savings found" : "All optimized"}
        </span>
        <strong>
          {potentialSavings > 0 ? `${formatMoney(potentialSavings)}/yr` : "You're set"}
        </strong>
        <p>
          {potentialSavings > 0
            ? "We found lower-cost options on your current coverage. Review and switch in a few clicks."
            : "No new savings right now. We'll keep watching your renewals and the market."}
        </p>
        <button className="ss-button" onClick={onReviewSavings}>
          {potentialSavings > 0 ? "Review savings" : "View savings center"}
          <ArrowRight size={15} />
        </button>
      </div>

      <div className="ss-account-card">
        <span className="ss-account-avatar" aria-hidden="true">
          <UserRound size={15} />
        </span>
        <div>
          <b>Jordan Rivera</b>
          <small>SubShield Tile Co.</small>
        </div>
        <em>Growth</em>
      </div>
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
      <Icon size={19} />
      <span>{label}</span>
      {badge ? <span className="ss-nav-badge">{badge}</span> : null}
    </button>
  );
}

export function Header({ view, onUpload, onActivity, unread }) {
  const titles = {
    dashboard: "Dashboard",
    policies: "My Insurance",
    savings: "Lower My Insurance",
    renewals: "Renewals",
    certificates: "Certificates",
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
    settings: "Account, team, alerts, and workspace controls",
  };

  return (
    <header className="ss-top">
      <div>
        <span className="ss-eyebrow">{eyebrow[view]}</span>
        <h1>{titles[view]}</h1>
      </div>
      <div className="ss-top-actions">
        <span className="ss-top-chip demo">
          <Beaker size={14} /> Demo data
        </span>
        <span className="ss-top-chip">
          <Command size={14} /> Synced Jun 3, 2026
        </span>
        <label className="ss-global-search">
          <Search size={15} />
          <input type="search" placeholder="Search" aria-label="Search workspace" />
          <kbd>Ctrl K</kbd>
        </label>
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
          aria-label="View activity"
        >
          <Bell size={18} />
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
