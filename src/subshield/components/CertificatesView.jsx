import { useMemo, useState } from "react";
import {
  Building2,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Plus,
  Search,
  Send,
  ShieldCheck,
  SquarePen,
} from "lucide-react";
import { Section, Info } from "./Layout.jsx";
import { formatShortDate } from "../utils.js";
import CopyButton from "./CopyButton.jsx";

export default function CertificatesView({ contractors, coiSends, onSend, onAdd, onEdit }) {
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState(() => contractors[0]?.id || "");

  const contractorById = useMemo(
    () => new Map(contractors.map((c) => [c.id, c])),
    [contractors]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contractors;
    return contractors.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.contact.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.projects.some((p) => p.toLowerCase().includes(q))
    );
  }, [query, contractors]);

  const totalProjects = contractors.reduce((sum, gc) => sum + gc.projects.length, 0);
  const recentSends = [...(coiSends || [])].slice(0, 5);

  return (
    <div className="ss-grid ss-certificates-grid">
      <section className="ss-card ss-span">
        <Section
          title="Certificates of Insurance"
          sub="Send certificates, save certificate holders, and keep a complete delivery history."
          extra={
            <button type="button" className="ss-button" onClick={() => onSend()}>
              <Send size={15} /> Send certificate
            </button>
          }
        />
        <div className="ss-command-metrics">
          <Info label="Saved holders" value={contractors.length} />
          <Info label="Certificates sent" value={(coiSends || []).length} />
          <Info label="Projects tracked" value={totalProjects} />
        </div>
      </section>

      <section className="ss-card">
        <Section
          title="Certificate holders"
          sub="Saved recipients with holder wording and delivery rules"
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
              onChange={(event) => setQuery(event.target.value)}
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
              Add a certificate holder to save legal wording, delivery instructions,
              and project history for fast certificate sends.
            </p>
            <button className="ss-button" onClick={onAdd}>
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

        <div className="ss-holder-list">
          {filtered.map((contractor) => (
            <HolderRow
              key={contractor.id}
              contractor={contractor}
              expanded={expandedId === contractor.id}
              onToggle={() =>
                setExpandedId((current) => (current === contractor.id ? "" : contractor.id))
              }
              onSend={() => onSend(contractor)}
              onEdit={() => onEdit(contractor)}
            />
          ))}
        </div>
      </section>

      <section className="ss-card">
        <Section title="Recent sends" sub="Proof of certificate delivery" />
        {recentSends.length === 0 ? (
          <div className="ss-empty" style={{ minHeight: 160 }}>
            <FileCheck2 size={28} />
            <h2>No sends yet</h2>
            <p>Your certificate delivery history will appear here.</p>
          </div>
        ) : (
          recentSends.map((send) => {
            const holder = contractorById.get(send.contractorId);
            return (
              <div className="ss-insight" key={send.id}>
                <div>
                  <b>{send.project}</b>
                  <small>
                    {holder?.name || send.email} - {send.docCount} files
                  </small>
                </div>
                <span className="ss-pill" style={{ padding: "6px 10px", fontSize: 11 }}>
                  <CalendarClock size={12} /> {formatShortDate(send.sentAt)}
                </span>
              </div>
            );
          })
        )}

        <div className="ss-note success" style={{ marginTop: 14 }}>
          <CheckCircle2 size={16} />
          <span>
            Each send reuses saved holder wording and delivery rules, so certificates
            go out in a few clicks without digging through old emails.
          </span>
        </div>
      </section>
    </div>
  );
}

function HolderRow({ contractor, expanded, onToggle, onSend, onEdit }) {
  const latestSend = contractor.pastSends?.[0];

  return (
    <article className={`ss-gc-card ${expanded ? "expanded" : ""}`}>
      <div className="ss-gc">
        <span className="ss-gc-avatar" aria-hidden="true">
          {contractor.initials}
        </span>
        <span className="ss-gc-copy">
          <b>{contractor.name}</b>
          <small>
            {contractor.contact} - {contractor.email}
          </small>
          <span className="ss-holder-meta">
            <em>
              <ShieldCheck size={12} /> COI ready
            </em>
            <em>
              <ClipboardCheck size={12} /> {contractor.projects.length} project
              {contractor.projects.length === 1 ? "" : "s"}
            </em>
            {latestSend ? (
              <em>
                <CalendarClock size={12} /> Last sent {formatShortDate(latestSend.sentAt)}
              </em>
            ) : (
              <em>No sends yet</em>
            )}
          </span>
        </span>
        <div className="ss-gc-actions">
          <button
            type="button"
            className="ss-mini-btn"
            onClick={onEdit}
            aria-label={`Edit ${contractor.name}`}
            title="Edit details"
          >
            <SquarePen size={16} />
          </button>
          <button
            type="button"
            className="ss-mini-btn"
            onClick={onToggle}
            aria-label={`${expanded ? "Collapse" : "Expand"} ${contractor.name}`}
            aria-expanded={expanded}
            title={expanded ? "Collapse details" : "View details"}
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <button
            type="button"
            className="ss-button"
            onClick={onSend}
            aria-label={`Send certificate to ${contractor.name}`}
          >
            <Send size={14} /> Send COI
          </button>
        </div>
      </div>

      {expanded && (
        <div className="ss-holder-detail">
          <div className="ss-holder-panel wording">
            <div className="ss-holder-panel-head">
              <b>Holder wording</b>
              <CopyButton text={contractor.holder} label="Copy holder" small />
            </div>
            <pre>{contractor.holder}</pre>
          </div>
          <div className="ss-holder-panel">
            <b>Delivery requirements</b>
            <p>{contractor.requirements || "Standard verified COI package accepted."}</p>
            {contractor.portalInstructions ? (
              <small>Portal: {contractor.portalInstructions}</small>
            ) : null}
          </div>
          <div className="ss-holder-panel">
            <b>Projects</b>
            <div className="ss-holder-projects">
              {contractor.projects.map((project) => (
                <span key={project}>{project}</span>
              ))}
            </div>
          </div>
          <div className="ss-holder-panel">
            <b>Send history</b>
            {contractor.pastSends?.length ? (
              contractor.pastSends.slice(0, 3).map((send) => (
                <p key={send.id}>
                  {send.project} - {formatShortDate(send.sentAt)}
                </p>
              ))
            ) : (
              <p>No certificates sent to this holder yet.</p>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
