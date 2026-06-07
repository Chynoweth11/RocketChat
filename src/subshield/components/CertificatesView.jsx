import { useMemo, useState } from "react";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileCheck2,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  SquarePen,
  TriangleAlert,
} from "lucide-react";
import { Section, Info } from "./Layout.jsx";
import { ComplianceBadge, CompliancePanel } from "./CompliancePanel.jsx";
import { checkCompliance, formatShortDate } from "../utils.js";
import CopyButton from "./CopyButton.jsx";

export default function CertificatesView({
  contractors,
  coiSends,
  policies = [],
  onSend,
  onAdd,
  onEdit,
}) {
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  // Merge pastSends stored on each contractor with global coiSends, deduplicated by id
  const sendsByHolder = useMemo(() => {
    const map = new Map();
    contractors.forEach((c) => {
      const onHolder = c.pastSends || [];
      const onGlobal = (coiSends || []).filter(
        (s) => s.contractorId === c.id && !onHolder.find((ps) => ps.id === s.id)
      );
      const merged = [...onHolder, ...onGlobal].sort(
        (a, b) => new Date(b.sentAt) - new Date(a.sentAt)
      );
      map.set(c.id, merged);
    });
    return map;
  }, [contractors, coiSends]);

  const complianceByHolder = useMemo(() => {
    const map = new Map();
    contractors.forEach((c) => {
      map.set(c.id, checkCompliance(c.coverageRequirements, policies));
    });
    return map;
  }, [contractors, policies]);

  const compliantCount = useMemo(() => {
    let withReqs = 0;
    let compliant = 0;
    contractors.forEach((c) => {
      const result = complianceByHolder.get(c.id);
      if (result?.hasRequirements) {
        withReqs += 1;
        if (result.compliant) compliant += 1;
      }
    });
    return { withReqs, compliant };
  }, [contractors, complianceByHolder]);

  const totalSends = (coiSends || []).length;
  const holdersWithRecentCOI = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return contractors.filter((c) => {
      const sends = sendsByHolder.get(c.id) || [];
      return sends.length > 0 && new Date(sends[0].sentAt).getTime() >= cutoff;
    }).length;
  }, [contractors, sendsByHolder]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contractors;
    return contractors.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.contact || "").toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.projects || []).some((p) => p.toLowerCase().includes(q))
    );
  }, [query, contractors]);

  return (
    <div className="ss-grid">
      <section className="ss-card ss-span">
        <Section
          title="Certificates of Insurance"
          sub="Send proof of coverage to GCs, save holders, and track every COI delivery."
          extra={
            <button type="button" className="ss-button" onClick={() => onSend()}>
              <Send size={15} /> Send COI
            </button>
          }
        />
        <div className="ss-command-metrics">
          <Info label="Saved holders" value={contractors.length} />
          <Info label="COIs sent" value={totalSends} />
          {contractors.length > 0 && (
            <Info label="COI current" value={`${holdersWithRecentCOI} / ${contractors.length}`} />
          )}
          {compliantCount.withReqs > 0 && (
            <Info
              label="Coverage compliant"
              value={`${compliantCount.compliant} / ${compliantCount.withReqs}`}
            />
          )}
        </div>
      </section>

      <section className="ss-card ss-span ss-cert-holders">
        <Section
          title="Certificate holders"
          sub="Saved GCs and clients. Send a COI in a few clicks with clean holder records."
          extra={
            <button type="button" className="ss-button soft ss-button-sm" onClick={onAdd}>
              <Plus size={14} /> Add holder
            </button>
          }
        />

        {contractors.length > 0 && (
          <div className="ss-search">
            <Search size={16} className="ss-search-icon" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search holders, contacts, or projects..."
              aria-label="Search certificate holders"
            />
          </div>
        )}

        {contractors.length === 0 && (
          <div className="ss-empty">
            <Building2 size={32} />
            <h2>No holders saved yet</h2>
            <p>
              Add a GC or client as a certificate holder to store their legal wording and delivery
              rules, then send a COI package in a few clicks with a complete delivery record.
            </p>
            <button type="button" className="ss-button" onClick={onAdd}>
              <Plus size={15} /> Add first holder
            </button>
          </div>
        )}

        {contractors.length > 0 && filtered.length === 0 && (
          <div className="ss-empty" style={{ minHeight: 160 }}>
            <Search size={28} />
            <h2>No matches</h2>
            <p>No holders match "{query}". Try a different name, email, or project.</p>
          </div>
        )}

        {filtered.map((contractor) => {
          const sends = sendsByHolder.get(contractor.id) || [];
          const isExpanded = expandedId === contractor.id;
          return (
            <HolderCard
              key={contractor.id}
              contractor={contractor}
              sends={sends}
              compliance={complianceByHolder.get(contractor.id)}
              isExpanded={isExpanded}
              onToggle={() => setExpandedId(isExpanded ? null : contractor.id)}
              onSend={() => onSend(contractor)}
              onEdit={() => onEdit(contractor)}
            />
          );
        })}
      </section>

      <section className="ss-card ss-span ss-cert-recent">
        <Section title="Delivery log" sub="Full delivery history across all holders" />

        {totalSends === 0 ? (
          <div className="ss-empty" style={{ minHeight: 160 }}>
            <FileCheck2 size={28} />
            <h2>No sends yet</h2>
            <p>
              Your certificate delivery history will appear here. Each send is logged so you
              can prove exactly when and where a COI was delivered.
            </p>
          </div>
        ) : (
          [...(coiSends || [])].slice(0, 10).map((send) => {
            const holder = contractors.find((c) => c.id === send.contractorId);
            return <DeliveryRow key={send.id} send={send} holder={holder} />;
          })
        )}

        {totalSends > 0 && (
          <div className="ss-note success" style={{ marginTop: 14 }}>
            <CheckCircle2 size={16} />
            <span>
              Saved holder wording and project details mean every resend is a few clicks —
              no searching through old emails.
            </span>
          </div>
        )}
      </section>
    </div>
  );
}

function coiStatusFor(sends) {
  if (!sends.length) return "unsent";
  const daysSince = Math.floor(
    (Date.now() - new Date(sends[0].sentAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSince <= 30) return "current";
  if (daysSince <= 90) return "aging";
  return "stale";
}

const COI_STATUS_LABEL = {
  unsent: "No COI sent",
  current: "COI current",
  aging: "COI aging",
  stale: "COI may need refresh",
};

function HolderCard({ contractor, sends, compliance, isExpanded, onToggle, onSend, onEdit }) {
  const status = coiStatusFor(sends);
  const lastSend = sends[0];
  const hasHistory = sends.length > 0 || compliance?.hasRequirements;

  return (
    <div className={`ss-holder-card${isExpanded ? " is-expanded" : ""}`}>
      <div className="ss-holder-main">
        <span className="ss-gc-avatar" aria-hidden="true">
          {contractor.initials}
        </span>
        <div className="ss-holder-info">
          <div className="ss-holder-name-row">
            <b className="ss-holder-name">{contractor.name}</b>
            <span className={`ss-coi-status ${status}`}>
              {status === "unsent" && <TriangleAlert size={11} />}
              {status === "current" && <CheckCircle2 size={11} />}
              {(status === "aging" || status === "stale") && <Clock size={11} />}
              {COI_STATUS_LABEL[status]}
            </span>
            {compliance?.hasRequirements && <ComplianceBadge result={compliance} />}
          </div>
          <small className="ss-holder-meta">
            {contractor.email}
            {contractor.phone ? ` · ${contractor.phone}` : ""}
          </small>
          <small className="ss-holder-meta">
            {(contractor.projects || []).length} project
            {(contractor.projects || []).length !== 1 ? "s" : ""}
            {lastSend
              ? ` · Last sent ${formatShortDate(lastSend.sentAt)}`
              : " · No COI sent yet"}
            {sends.length > 1 ? ` · ${sends.length} total sends` : ""}
          </small>
        </div>

        <div className="ss-gc-actions">
          <button
            type="button"
            className="ss-mini-btn"
            onClick={onEdit}
            aria-label={`Edit ${contractor.name}`}
            title="Edit holder"
          >
            <SquarePen size={16} />
          </button>
          {hasHistory && (
            <button
              type="button"
              className="ss-mini-btn"
              onClick={onToggle}
              aria-label={isExpanded ? "Hide details" : "View details"}
              title={isExpanded ? "Hide details" : "View details"}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          )}
          <button
            type="button"
            className="ss-button"
            onClick={onSend}
            style={{ minHeight: 36, padding: "8px 14px" }}
            aria-label={`Send COI to ${contractor.name}`}
          >
            <Send size={14} />
            {lastSend ? "Resend COI" : "Send COI"}
          </button>
        </div>
      </div>

      {isExpanded && hasHistory && (
        <div className="ss-holder-history">
          {compliance?.hasRequirements && (
            <div className="ss-holder-comply">
              <div className="ss-holder-history-head">
                <ShieldCheck size={13} />
                <span>Coverage requirements</span>
                <span className="ss-holder-history-count">
                  {compliance.metCount}/{compliance.total} met
                </span>
              </div>
              <CompliancePanel result={compliance} compact />
            </div>
          )}

          <div className="ss-holder-history-head" style={{ marginTop: compliance?.hasRequirements ? 14 : 0 }}>
            <FileText size={13} />
            <span>Send history</span>
            <span className="ss-holder-history-count">{sends.length} send{sends.length !== 1 ? "s" : ""}</span>
            <CopyButton text={contractor.holder} label="Copy holder wording" small />
          </div>
          {sends.length > 0 ? (
            <div className="ss-holder-history-list">
              {sends.slice(0, 8).map((send) => (
                <div key={send.id} className="ss-history-row">
                  <span className="ss-history-icon" aria-hidden="true">
                    <CheckCircle2 size={13} />
                  </span>
                  <div className="ss-history-info">
                    <b>{send.project}</b>
                    <small>
                      {formatShortDate(send.sentAt)} · {send.docCount} file
                      {send.docCount !== 1 ? "s" : ""} · {send.email}
                    </small>
                  </div>
                  <span className="ss-history-pill">Delivered</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="ss-muted" style={{ margin: "6px 0 0", fontSize: 12.5 }}>
              No certificates sent to this holder yet.
            </p>
          )}
          <div className="ss-holder-history-footer">
            <button
              type="button"
              className="ss-button soft"
              onClick={onSend}
              style={{ minHeight: 34, padding: "7px 14px", fontSize: 13 }}
            >
              <RefreshCw size={13} /> {sends.length > 0 ? "Resend to" : "Send to"} {contractor.name}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DeliveryRow({ send, holder }) {
  return (
    <div className="ss-insight">
      <div>
        <b>{send.project}</b>
        <small>
          {holder?.name || send.email} · {send.docCount} file{send.docCount !== 1 ? "s" : ""}
        </small>
      </div>
      <span className="ss-pill" style={{ padding: "5px 10px", fontSize: 11, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        <CalendarClock size={12} /> {formatShortDate(send.sentAt)}
      </span>
    </div>
  );
}
