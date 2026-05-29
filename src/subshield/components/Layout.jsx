import { Bell, Building2, Camera, History, Shield, ShieldCheck, User } from "lucide-react";
import { getStatus } from "../utils.js";

export function Brand() {
  return (
    <div className="ss-brand">
      <span className="ss-brand-mark" aria-hidden="true">
        <Shield size={20} />
      </span>
      <div>
        <b>SubShield</b>
        <small className="ss-small">Compliance vault</small>
      </div>
    </div>
  );
}

export function Sidebar({
  view,
  setView,
  docCount,
  upcoming,
  criticalCount,
  onSend,
}) {
  return (
    <aside className="ss-sidebar">
      <Brand />
      <nav aria-label="Primary">
        <NavButton
          active={view === "vault"}
          icon={ShieldCheck}
          label="Vault"
          onClick={() => setView("vault")}
        />
        <NavButton
          active={view === "contractors"}
          icon={Building2}
          label="GCs"
          onClick={() => setView("contractors")}
        />
        <NavButton
          active={view === "activity"}
          icon={History}
          label="Activity"
          onClick={() => setView("activity")}
        />
        <NavButton
          active={view === "profile"}
          icon={User}
          label="Profile"
          onClick={() => setView("profile")}
        />
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
          {criticalCount > 0 ? "Action needed" : "Package ready"}
        </span>
        <strong>{docCount} files</strong>
        <p>
          {criticalCount > 0
            ? `${criticalCount} polic${criticalCount === 1 ? "y" : "ies"} need attention before routing.`
            : "Original carrier-issued documents are ready to route."}
        </p>
        <button className="ss-button" onClick={onSend}>
          Send COI
        </button>
      </div>
    </aside>
  );
}

export function NavButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      className={`ss-nav ${active ? "active" : ""}`}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={19} />
      <span>{label}</span>
    </button>
  );
}

export function Header({ view, onScan, onActivity, unread }) {
  const titles = {
    vault: "Document Vault",
    contractors: "GC Directory",
    activity: "Activity Log",
    profile: "Company Profile",
  };
  const eyebrow = {
    vault: "Subcontractor compliance",
    contractors: "Saved certificate holders",
    activity: "What's happened",
    profile: "Account & preferences",
  };

  return (
    <header className="ss-top">
      <div>
        <span className="ss-eyebrow">{eyebrow[view]}</span>
        <h1>{titles[view]}</h1>
      </div>
      <div className="ss-top-actions">
        <button
          type="button"
          className="ss-icon-button"
          onClick={onScan}
          aria-label="Vault a document"
        >
          <Camera size={18} />
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

export function Info({ label, value }) {
  return (
    <div className="ss-info">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

export function Spinner() {
  return <span className="ss-spinner" aria-hidden="true" />;
}
