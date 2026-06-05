import { useState } from "react";
import { Check, FileCheck2, Mail, Send, ShieldCheck } from "lucide-react";
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
    await new Promise((resolve) => setTimeout(resolve, 700));
    onSend();
  };

  const firstName = contractor.contact.split(" ")[0] || "team";
  const coverEmail =
    `To: ${contractor.email}\n` +
    `Subject: COI Package - ${finalProject}\n\n` +
    `Hello ${firstName}, please see the attached verified insurance package for ${finalProject}. ` +
    "All documents are originals issued by our carriers and licensed insurance partners.";

  return (
    <Modal
      title="Send COI package"
      subtitle={`${docs} verified files ready for ${contractor.name}`}
      onClose={onClose}
    >
      <div className="ss-modal-brief">
        <div>
          <span className="ss-eyebrow">Delivery review</span>
          <b>{contractor.email}</b>
          <small>Logged delivery, reusable holder wording, verified document package.</small>
        </div>
        <span>
          <ShieldCheck size={15} /> Ready
        </span>
      </div>

      <div className="ss-send-summary">
        <div>
          <small>Recipient</small>
          <b>{contractor.name}</b>
        </div>
        <div>
          <small>Project</small>
          <b>{finalProject || "Select project"}</b>
        </div>
        <div>
          <small>Files</small>
          <b>{docs}</b>
        </div>
      </div>

      <div className="ss-field-grid">
        <label className="ss-field">
          <span className="ss-field-label">Recipient company</span>
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
        <span className="ss-field-label">New project name</span>
        <input
          value={newProject}
          onChange={(event) => onNewProjectChange(event.target.value)}
          placeholder="Example: PDX186 Tile Buildout"
        />
      </label>

      <div className="ss-review">
        <div className="ss-review-box">
          <div className="ss-review-box-head">
            <b>Certificate holder wording</b>
            <CopyButton text={contractor.holder} small />
          </div>
          <pre>{contractor.holder}</pre>
        </div>
        <div className="ss-review-box">
          <b>GC requirements</b>
          <p>{contractor.requirements || "Standard package accepted."}</p>
        </div>
      </div>

      <div className="ss-email">
        <div className="ss-email-head">
          <b>
            <Mail size={16} /> Cover email preview
          </b>
          <CopyButton text={coverEmail} small />
        </div>
        <p>
          <strong>To:</strong> {contractor.email}
        </p>
        <p>
          <strong>Subject:</strong> COI Package - {finalProject}
        </p>
        <p>
          Hello {firstName}, please see the attached verified insurance package for {finalProject}.
          All documents are originals issued by our carriers and licensed insurance partners.
        </p>
      </div>

      <div className="ss-modal-doc-list">
        <div className="ss-modal-list-head">
          <FileCheck2 size={15} />
          <b>Verified attachments</b>
          <span>{docs} files</span>
        </div>
        {policies.map((policy) =>
          policy.documents.map((doc) => (
            <DocumentRow key={`${policy.id}-${doc}`} name={`${policy.name} - ${doc}`} />
          ))
        )}
      </div>

      <footer className="ss-footer">
        <span className="ss-footer-info">{docs} verified files ready for delivery</span>
        <button
          type="button"
          className="ss-button"
          onClick={handleSend}
          disabled={sending}
        >
          {sending ? (
            <>
              <span className="ss-spinner" /> Routing...
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
        <small>Original carrier-issued document - verified</small>
      </div>
      <em className="ss-verified">
        <Check size={13} /> Verified
      </em>
    </div>
  );
}
