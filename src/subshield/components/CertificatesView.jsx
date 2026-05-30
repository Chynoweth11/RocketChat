import { useMemo, useState } from "react";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  FileCheck2,
  Plus,
  Search,
  Send,
  SquarePen,
} from "lucide-react";
import { Section, Info } from "./Layout.jsx";
import { formatShortDate } from "../utils.js";
import CopyButton from "./CopyButton.jsx";

export default function CertificatesView({ contractors, coiSends, onSend, onAdd, onEdit }) {
  const [query, setQuery] = useState("");

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
    <div className="ss-grid">
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

        {filtered.map((contractor) => (
          <HolderRow
            key={contractor.id}
            contractor={contractor}
            onSend={() => onSend(contractor)}
            onEdit={() => onEdit(contractor)}
          />
        ))}
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
                    {holder?.name || send.email}  -  {send.docCount} files
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
            Each send reuses saved holder wording and delivery rules, so certificates go
            out in a few clicks  -  no digging through old emails.
          </span>
        </div>
      </section>
    </div>
  );
}

function HolderRow({ contractor, onSend, onEdit }) {
  return (
    <div className="ss-gc">
      <span className="ss-gc-avatar" aria-hidden="true">
        {contractor.initials}
      </span>
      <span className="ss-gc-copy">
        <b>{contractor.name}</b>
        <small>
          {contractor.projects.length} project
          {contractor.projects.length === 1 ? "" : "s"}  -  {contractor.email}
        </small>
        {contractor.phone ? <small>{contractor.phone}</small> : null}
        {contractor.portalInstructions ? (
          <small>Portal: {contractor.portalInstructions}</small>
        ) : null}
        <div style={{ marginTop: 6 }}>
          <CopyButton text={contractor.holder} label="Copy holder" small />
        </div>
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
          className="ss-button"
          onClick={onSend}
          style={{ minHeight: 36, padding: "8px 14px" }}
          aria-label={`Send certificate to ${contractor.name}`}
        >
          <Send size={14} /> Send
        </button>
      </div>
    </div>
  );
}

