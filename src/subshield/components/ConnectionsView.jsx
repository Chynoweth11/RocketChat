import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Link2,
  Link2Off,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Unlink,
  Zap,
} from "lucide-react";
import { Section } from "./Layout.jsx";
import { policyLabelFromType, timeAgo } from "../utils.js";
import { CARRIER_CATALOG } from "../carriers.js";

const CAPABILITY_LABELS = {
  policy_sync: "Policy sync",
  coi_verify: "COI verification",
  renewal_alerts: "Renewal alerts",
  instant_coi: "Instant COI",
  form_pull: "Form pull",
};

const CAP_ICONS = {
  policy_sync: RefreshCw,
  coi_verify: ShieldCheck,
  renewal_alerts: AlertTriangle,
  instant_coi: Zap,
  form_pull: ExternalLink,
};

function CarrierLogo({ carrier, size = 44 }) {
  return (
    <span
      className="ss-carrier-logo"
      style={{
        width: size,
        height: size,
        background: carrier.logoColor,
        fontSize: size * 0.29,
      }}
      aria-hidden="true"
    >
      {carrier.logoMark}
    </span>
  );
}

function ConnectModal({ carrier, onClose, onConnect, onViewDocuments }) {
  const [step, setStep] = useState("form"); // form | connecting | success
  const [creds, setCreds] = useState({ accountId: "", apiKey: "" });
  const [error, setError] = useState("");

  function handleConnect() {
    if (!creds.accountId.trim()) {
      setError("Account ID is required.");
      return;
    }
    setError("");
    setStep("connecting");
    setTimeout(() => setStep("success"), 2200);
  }

  function handleDone() {
    onConnect(carrier.id, creds);
    onClose();
    onViewDocuments?.();
  }

  return (
    <div className="ss-modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <section className="ss-modal ss-modal--connect" role="dialog" aria-modal="true" aria-labelledby="connect-title">
        <button type="button" className="ss-close" onClick={onClose} aria-label="Close">✕</button>

        {step === "form" && (
          <>
            <div className="ss-connect-modal-head">
              <CarrierLogo carrier={carrier} size={52} />
              <div>
                <h2 id="connect-title">Connect {carrier.name}</h2>
                <p>Securely link {carrier.name} and SubShield automatically retrieves your policies, declarations, COIs, endorsements, and renewal dates — no manual uploads.</p>
              </div>
            </div>

            <div className="ss-connect-caps">
              {carrier.capabilities.map((cap) => {
                const Icon = CAP_ICONS[cap] || CheckCircle2;
                return (
                  <div key={cap} className="ss-connect-cap">
                    <Icon size={14} />
                    {CAPABILITY_LABELS[cap]}
                  </div>
                );
              })}
            </div>

            <div className="ss-connect-fields">
              <div className="ss-field">
                <label className="ss-field-label">Account ID / Policy Number</label>
                <input
                  type="text"
                  placeholder={`Your ${carrier.name} account number`}
                  value={creds.accountId}
                  onChange={(e) => setCreds((c) => ({ ...c, accountId: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="ss-field">
                <label className="ss-field-label">API Key or Access Token <span style={{ fontWeight: 400, textTransform: "none", color: "var(--muted)" }}>(optional)</span></label>
                <input
                  type="password"
                  placeholder="Paste key from carrier portal"
                  value={creds.apiKey}
                  onChange={(e) => setCreds((c) => ({ ...c, apiKey: e.target.value }))}
                />
              </div>
              {error && <p className="ss-connect-error">{error}</p>}
              <p className="ss-connect-notice">
                Credentials are stored locally on your device and never transmitted to SubShield servers.
              </p>
            </div>

            <div className="ss-connect-foot">
              <button type="button" className="ss-button soft" onClick={onClose}>Cancel</button>
              <button type="button" className="ss-button" onClick={handleConnect}>
                <Link2 size={15} /> Connect {carrier.name}
              </button>
            </div>
          </>
        )}

        {step === "connecting" && (
          <div className="ss-connect-progress">
            <div className="ss-connect-progress-icon">
              <Loader2 size={32} className="ss-spin" />
            </div>
            <h2>Connecting to {carrier.name}</h2>
            <p>Verifying credentials and pulling your policy data…</p>
            <div className="ss-connect-steps">
              <div className="ss-connect-step done"><CheckCircle2 size={15} /> Authenticating</div>
              <div className="ss-connect-step active"><Loader2 size={15} className="ss-spin" /> Fetching policies</div>
              <div className="ss-connect-step pending"><RefreshCw size={15} /> Syncing coverage</div>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="ss-connect-success">
            <div className="ss-connect-success-icon">
              <CheckCircle2 size={36} />
            </div>
            <h2>{carrier.name} connected</h2>
            <p>
              SubShield retrieved your coverage automatically. Everything below was imported and organized for you.
            </p>
            <ul className="ss-connect-retrieved">
              {(carrier.policyTypes || []).map((type) => (
                <li key={type}>
                  <CheckCircle2 size={14} /> {policyLabelFromType(type)} policy &amp; declarations
                </li>
              ))}
              <li>
                <CheckCircle2 size={14} /> Certificate of Insurance package
              </li>
              <li>
                <CheckCircle2 size={14} /> Renewal dates &amp; coverage limits
              </li>
            </ul>
            <button type="button" className="ss-button" onClick={handleDone} style={{ marginTop: 8 }}>
              View imported documents <ArrowRight size={15} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function CarrierCard({ carrier, connection, onConnect, onDisconnect, onSync }) {
  const isConnected = !!connection;
  const isSyncing = connection?.syncing;

  return (
    <div className={`ss-carrier-card ${isConnected ? "is-connected" : ""}`}>
      <div className="ss-carrier-card-head">
        <CarrierLogo carrier={carrier} />
        <div className="ss-carrier-card-info">
          <div className="ss-carrier-card-name-row">
            <b>{carrier.name}</b>
            {carrier.amRating && <span className="ss-carrier-rating">{carrier.amRating}</span>}
            <span className="ss-carrier-category">{carrier.category}</span>
          </div>
          <p className="ss-carrier-card-desc">{carrier.description}</p>
        </div>
        <div className="ss-carrier-card-status">
          {isConnected ? (
            <span className="ss-status success"><ShieldCheck size={12} /> Connected</span>
          ) : (
            <span className="ss-status" style={{ color: "var(--muted)", background: "#f4f6fa", border: "1px solid #e4e9f2" }}>
              <Link2Off size={12} /> Not connected
            </span>
          )}
        </div>
      </div>

      {isConnected && connection.syncedAt && (
        <div className="ss-carrier-sync-bar">
          <span><RefreshCw size={12} /> Last synced {timeAgo(connection.syncedAt)}</span>
          {connection.policyCount > 0 && (
            <span>{connection.policyCount} {connection.policyCount === 1 ? "policy" : "policies"} linked</span>
          )}
        </div>
      )}

      <div className="ss-carrier-caps">
        {carrier.capabilities.map((cap) => {
          const Icon = CAP_ICONS[cap] || CheckCircle2;
          return (
            <span key={cap} className="ss-carrier-cap">
              <Icon size={11} />
              {CAPABILITY_LABELS[cap]}
            </span>
          );
        })}
      </div>

      <div className="ss-carrier-card-foot">
        {isConnected ? (
          <>
            <button
              type="button"
              className="ss-button soft ss-button-sm"
              onClick={() => onSync(carrier.id)}
              disabled={isSyncing}
            >
              <RefreshCw size={13} className={isSyncing ? "ss-spin" : ""} />
              {isSyncing ? "Syncing…" : "Sync now"}
            </button>
            <button
              type="button"
              className="ss-button soft ss-button-sm"
              onClick={() => onDisconnect(carrier.id)}
            >
              <Unlink size={13} /> Disconnect
            </button>
          </>
        ) : (
          <button type="button" className="ss-button ss-button-sm" onClick={() => onConnect(carrier)}>
            <Link2 size={13} /> Connect
            <ChevronRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function ConnectionsView({ connections, onConnect, onDisconnect, onSync, onViewDocuments }) {
  const [connecting, setConnecting] = useState(null); // carrier being connected
  const [filter, setFilter] = useState("all");

  const connectedCount = Object.keys(connections).length;

  const filtered = CARRIER_CATALOG.filter((c) => {
    if (filter === "connected") return !!connections[c.id];
    if (filter === "carriers") return c.category === "Carrier";
    if (filter === "platforms") return c.category !== "Carrier";
    return true;
  });

  return (
    <div className="ss-grid">
      <section className="ss-card ss-span">
        <Section
          title="Insurance Connections"
          sub="Securely connect your carriers, agencies, and platforms — then SubShield retrieves your policies, COIs, endorsements, and renewals automatically, the way Plaid links your bank."
        />
        <div className="ss-command-metrics">
          <div className="ss-info">
            <span>Connected</span>
            <b>{connectedCount}</b>
          </div>
          <div className="ss-info">
            <span>Available</span>
            <b>{CARRIER_CATALOG.length}</b>
          </div>
          <div className="ss-info">
            <span>Auto-verifying</span>
            <b>{Object.values(connections).filter((c) => c.capabilities?.includes("coi_verify")).length}</b>
          </div>
          <div className="ss-info">
            <span>Syncing policies</span>
            <b>{Object.values(connections).reduce((sum, c) => sum + (c.policyCount || 0), 0)}</b>
          </div>
        </div>
      </section>

      {connectedCount === 0 && (
        <section className="ss-card ss-span">
          <div className="ss-connections-hero">
            <div className="ss-connections-hero-logos">
              {CARRIER_CATALOG.slice(0, 6).map((c) => (
                <CarrierLogo key={c.id} carrier={c} size={40} />
              ))}
            </div>
            <h2>Connect your insurance providers</h2>
            <p>
              Link a carrier, agency, or platform once and SubShield pulls in your policies, dec pages, COIs, and endorsements automatically. No manual entry, and no hunting through emails.
            </p>
            <div className="ss-connections-hero-points">
              <div><RefreshCw size={15} /> Policies, COIs, and endorsements import automatically</div>
              <div><ShieldCheck size={15} /> Verify coverage in real time when GCs request a COI</div>
              <div><AlertTriangle size={15} /> Renewal alerts 30, 14, and 7 days before expiration</div>
              <div><Zap size={15} /> Coverage gaps and savings surfaced as they're found</div>
            </div>
          </div>
        </section>
      )}

      <section className="ss-card ss-span">
        <div className="ss-chip-group" style={{ marginBottom: 8 }}>
          {[
            { id: "all", label: "All integrations" },
            { id: "connected", label: `Connected (${connectedCount})` },
            { id: "carriers", label: "Insurance carriers" },
            { id: "platforms", label: "Agency systems" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              className={`ss-chip ${filter === f.id ? "active" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {CARRIER_CATALOG.filter((c) => c.popular && !connections[c.id] && filter === "all").length > 0 && filter === "all" && (
          <div className="ss-connections-section-label">Popular</div>
        )}

        <div className="ss-carrier-grid">
          {filtered.map((carrier) => (
            <CarrierCard
              key={carrier.id}
              carrier={carrier}
              connection={connections[carrier.id] || null}
              onConnect={setConnecting}
              onDisconnect={onDisconnect}
              onSync={onSync}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="ss-empty" style={{ minHeight: 140 }}>
            <Building2 size={28} />
            <h2>No connected carriers yet</h2>
            <p>Switch to "All integrations" to browse available carriers.</p>
          </div>
        )}
      </section>

      {connecting && (
        <ConnectModal
          carrier={connecting}
          onClose={() => setConnecting(null)}
          onConnect={(id, creds) => {
            onConnect(id, creds, connecting);
            setConnecting(null);
          }}
          onViewDocuments={onViewDocuments}
        />
      )}
    </div>
  );
}
