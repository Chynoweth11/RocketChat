import { Lock, RefreshCcw } from "lucide-react";
import { useState } from "react";
import { Section } from "./Layout.jsx";

export default function ProfileView({ data, onReset }) {
  const [confirming, setConfirming] = useState(false);
  const [settings, setSettings] = useState({
    alerts: true,
    routing: true,
    autoshop: false,
  });
  const toggle = (key) =>
    setSettings((current) => ({ ...current, [key]: !current[key] }));

  const totalDocs = data.policies.reduce(
    (sum, policy) => sum + policy.documents.length,
    0
  );

  return (
    <div className="ss-grid">
      <section className="ss-card">
        <div className="ss-profile">
          <div className="ss-avatar">ST</div>
          <h2>SubShield Tile Co.</h2>
          <p className="ss-muted">Tile subcontractor · Austin, TX</p>
          <span className="ss-pill">
            <Lock size={14} /> Original document vault enabled
          </span>
        </div>

        <div className="ss-info-grid" style={{ marginTop: 24 }}>
          <Stat label="Policies tracked" value={data.policies.length} />
          <Stat label="Verified docs" value={totalDocs} />
          <Stat label="GCs saved" value={data.contractors.length} />
          <Stat label="Activity events" value={data.activity.length} />
        </div>
      </section>

      <section className="ss-card">
        <Section title="Settings" sub="Prototype preferences" />
        <Setting
          label="Push renewal alerts"
          on={settings.alerts}
          onToggle={() => toggle("alerts")}
        />
        <Setting
          label="Verified COI routing"
          on={settings.routing}
          onToggle={() => toggle("routing")}
        />
        <Setting
          label="Auto-shop better rates"
          on={settings.autoshop}
          onToggle={() => toggle("autoshop")}
        />
      </section>

      <section className="ss-card ss-span">
        <Section title="Demo controls" sub="Reset to a clean prototype state" />
        <p className="ss-muted" style={{ marginBottom: 14 }}>
          This wipes the local storage data and reloads the seed policies,
          contractors, and activity. Useful while exploring the prototype.
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
