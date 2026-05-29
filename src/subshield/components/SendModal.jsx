import { useState } from "react";
import { Check, Mail, Send } from "lucide-react";
import Modal from "./Modal.jsx";
import CopyButton from "./CopyButton.jsx";
import { countDocuments } from "../utils.js";

export default function SendModal({
  contractors,
  policies,
  contractor,
  project,
  newProject,
  onContractorChange,
  onProjectChange,
  onNewProjectChange,
  onClose,
  onSend,
}) {
  const [sending, setSending] = useState(false);
  const finalProject = newProject.trim() || project;
  const docs = countDocuments(policies);

  const handleSend = async () => {
    if (sending) return;
    setSending(true);
    await new Promise((r) => setTimeout(r, 700));
    onSend();
  };

  const firstName = contractor.contact.split(" ")[0] || "team";
  const coverEmail =
    `To: ${contractor.email}\n` +
    `Subject: COI Package — ${finalProject}\n\n` +
    `Hello ${firstName}, please see the attached verified insurance package for ${finalProject}. ` +
    `All documents are originals issued by our carriers and licensed broker.`;

  return (
    <Modal
      title="Review COI package"
      subtitle={`${docs} verified files · routed to ${contractor.email}`}
      onClose={onClose}
    >
      <div className="ss-field-grid">
        <label className="ss-field">
          <span className="ss-field-label">General contractor</span>
          <select
            value={contractor.id}
            onChange={(event) => onContractorChange(event.target.value)}
          >
            {contractors.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="ss-field">
          <span className="ss-field-label">Saved project</span>
          <select
            value={project}
            onChange={(event) => onProjectChange(event.target.value)}
            disabled={!contractor.projects.length}
          >
            {contractor.projects.length ? (
              contractor.projects.map((item) => (
                <option key={item}>{item}</option>
              ))
            ) : (
              <option>No saved projects yet</option>
            )}
          </select>
        </label>
      </div>

      <label className="ss-field">
        <span className="ss-field-label">Or create new project</span>
        <input
          value={newProject}
          onChange={(event) => onNewProjectChange(event.target.value)}
          placeholder="Example: PDX186 Tile Buildout"
        />
      </label>

      <div className="ss-review">
        <div className="ss-review-box">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <b>Certificate holder</b>
            <CopyButton text={contractor.holder} small />
          </div>
          <pre>{contractor.holder}</pre>
        </div>
        <div className="ss-review-box">
          <b>Requirements</b>
          <p>{contractor.requirements || "Standard package accepted."}</p>
        </div>
      </div>

      <div className="ss-email">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <b>
            <Mail size={16} /> Cover email preview
          </b>
          <CopyButton text={coverEmail} small />
        </div>
        <p>
          <strong>To:</strong> {contractor.email}
        </p>
        <p>
          <strong>Subject:</strong> COI Package — {finalProject}
        </p>
        <p style={{ marginTop: 8 }}>
          Hello {firstName}, please see the attached verified insurance package
          for {finalProject}. All documents are originals issued by our
          carriers and licensed broker.
        </p>
      </div>

      <div>
        {policies.map((policy) =>
          policy.documents.map((doc) => (
            <DocumentRow key={`${policy.id}-${doc}`} name={`${policy.name} · ${doc}`} />
          ))
        )}
      </div>

      <footer className="ss-footer">
        <span className="ss-footer-info">{docs} verified files ready</span>
        <button
          type="button"
          className="ss-button"
          onClick={handleSend}
          disabled={sending}
        >
          {sending ? (
            <>
              <span className="ss-spinner" /> Routing…
            </>
          ) : (
            <>
              <Send size={16} /> Send package
            </>
          )}
        </button>
      </footer>
    </Modal>
  );
}

function DocumentRow({ name }) {
  return (
    <div className="ss-doc">
      <span className="ss-pdf" aria-hidden="true">PDF</span>
      <div className="ss-doc-body">
        <b>{name}</b>
        <small>Original carrier-issued document · verified</small>
      </div>
      <em className="ss-verified">
        <Check size={13} /> Verified
      </em>
    </div>
  );
}
