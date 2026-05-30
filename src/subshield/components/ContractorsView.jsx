import { useMemo, useState } from "react";
import { Building2, CheckCircle2, Plus, Search, Send, SquarePen } from "lucide-react";
import { Section } from "./Layout.jsx";
import CopyButton from "./CopyButton.jsx";

export default function ContractorsView({
  contractors,
  onSend,
  onAdd,
  onEdit,
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contractors;
    return contractors.filter((c) => {
      return (
        c.name.toLowerCase().includes(q) ||
        c.contact.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.projects.some((p) => p.toLowerCase().includes(q))
      );
    });
  }, [query, contractors]);

  return (
    <div className="ss-grid">
      <section className="ss-card ss-span">
        <Section
          title="Recipients Directory"
          sub="Manage certificate holders, project contacts, and delivery rules in one place."
          extra={
            <button
              type="button"
              className="ss-button soft"
              onClick={onAdd}
              style={{ minHeight: 40, padding: "10px 14px" }}
            >
              <Plus size={15} /> Add recipient
            </button>
          }
        />

        {contractors.length > 0 && (
          <div className="ss-command-metrics">
            <Stat label="Saved companies" value={contractors.length} />
            <Stat
              label="Projects tracked"
              value={contractors.reduce((sum, gc) => sum + gc.projects.length, 0)}
            />
            <Stat
              label="Past sends"
              value={contractors.reduce((sum, gc) => sum + (gc.pastSends?.length || 0), 0)}
            />
          </div>
        )}

        {contractors.length > 0 && (
          <div className="ss-search">
            <Search size={16} className="ss-search-icon" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by GC, contact, email, or project..."
              aria-label="Search contractors"
            />
          </div>
        )}

        {contractors.length === 0 && (
          <div className="ss-empty">
            <Building2 size={32} />
            <h2>No recipients saved yet</h2>
            <p>
              Add your first recipient to save certificate holder details,
              delivery instructions, and project history for fast COI sends.
            </p>
            <button className="ss-button" onClick={onAdd}>
              <Plus size={15} /> Add first recipient
            </button>
          </div>
        )}

        {contractors.length > 0 && filtered.length === 0 && (
          <div className="ss-empty">
            <Search size={28} />
            <h2>No matches</h2>
            <p>No recipients match "{query}". Try a different name, email, or project.</p>
          </div>
        )}

        {filtered.map((contractor) => (
          <ContractorRow
            key={contractor.id}
            contractor={contractor}
            onSend={() => onSend(contractor)}
            onEdit={() => onEdit(contractor)}
          />
        ))}
      </section>

      <section className="ss-card">
        <Section title="How This Helps" sub="A cleaner COI workflow" />
        <p className="ss-muted">
          Each send uses stored legal holder wording, contact details, and portal
          instructions. That removes repetitive typing and reduces compliance mistakes.
        </p>
        <div className="ss-note success" style={{ marginTop: 14 }}>
          <CheckCircle2 size={16} />
          <span>Keep this page updated so your team can route COIs in a few clicks without searching old emails.</span>
        </div>
      </section>
    </div>
  );
}

function ContractorRow({ contractor, onSend, onEdit }) {
  return (
    <div className="ss-gc">
      <span className="ss-gc-avatar" aria-hidden="true">
        {contractor.initials}
      </span>
      <span className="ss-gc-copy">
        <b>{contractor.name}</b>
        <small>
          {contractor.projects.length} project
          {contractor.projects.length === 1 ? "" : "s"} - {contractor.email}
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
          aria-label={`Send COI to ${contractor.name}`}
        >
          <Send size={14} /> Send COI
        </button>
      </div>
    </div>
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
