import { Lock, RefreshCcw } from "lucide-react";
import { useState } from "react";
import { formatMoney } from "../utils.js";
import { Section } from "./Layout.jsx";

export default function ProfileView({
  company,
  data,
  settings,
  totalPremium,
  onToggleSetting,
  onReset,
}) {
  const [confirming, setConfirming] = useState(false);

  const totalDocs = data.policies.reduce(
    (sum, policy) => sum + policy.documents.length,
    0
  );

  return (
    <div className="ss-grid">
      <section className="ss-card">
        <div className="ss-profile">
          <div className="ss-avatar">{company?.name?.slice(0, 2).toUpperCase() || "SS"}</div>
          <h2>{company?.name || "SubShield Company"}</h2>
          <p className="ss-muted">
            {company?.tradeType || "Subcontractor"} - {company?.state || "N/A"}
          </p>
          <span className="ss-pill">
            <Lock size={14} /> Original document vault enabled
          </span>
        </div>

        <div className="ss-info-grid" style={{ marginTop: 24 }}>
          <Stat label="Policies tracked" value={data.policies.length} />
          <Stat label="Verified docs" value={totalDocs} />
          <Stat label="Saved GCs" value={data.contractors.length} />
          <Stat label="Tracked premium" value={`${formatMoney(totalPremium)}/yr`} />
          <Stat label="Brokers" value={data.brokers?.length || 0} />
          <Stat label="Quote requests" value={data.quoteRequests?.length || 0} />
        </div>
      </section>

      <section className="ss-card">
        <Section title="Settings" sub="Company workflow preferences" />
        <Setting
          label="Push renewal alerts"
          on={settings.alerts}
          onToggle={() => onToggleSetting("alerts")}
        />
        <Setting
          label="Verified COI routing"
          on={settings.routing}
          onToggle={() => onToggleSetting("routing")}
        />
        <Setting
          label="Auto-shop better rates"
          on={settings.autoshop}
          onToggle={() => onToggleSetting("autoshop")}
        />
      </section>

      <section className="ss-card ss-span">
        <Section title="Demo controls" sub="Reset to a clean seed state" />
        <p className="ss-muted" style={{ marginBottom: 14 }}>
          This resets local data including policies, savings opportunities,
          quote requests, broker contacts, and activity history.
        </p>

        {!confirming ? (
          <button
            type="button"
            className="ss-button soft"
            onClick={() => setConfirming(true)}
          >
            <RefreshCcw size={16} /> Reset demo data
          </button>
        ) : (
          <div className="ss-row">
            <button
              type="button"
              className="ss-button danger"
              onClick={() => {
                onReset();
                setConfirming(false);
              }}
            >
              <RefreshCcw size={16} /> Yes, reset
            </button>
            <button
              type="button"
              className="ss-button soft"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function Setting({ label, on, onToggle }) {
  return (
    <button
      type="button"
      className="ss-setting"
      onClick={onToggle}
      aria-pressed={on}
    >
      <span>{label}</span>
      <span className={`ss-toggle ${on ? "on" : ""}`} aria-hidden="true">
        <i />
      </span>
    </button>
  );
}

function Stat({ label, value }) {
  return (
    <div className="ss-info">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
