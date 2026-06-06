import { useMemo, useState } from "react";
import { Check, Clock, Mail, Send, ShieldAlert, ShieldCheck } from "lucide-react";
import Modal from "./Modal.jsx";
import CopyButton from "./CopyButton.jsx";
import { CompliancePanel } from "./CompliancePanel.jsx";
import { checkCompliance, countDocuments, formatShortDate } from "../utils.js";

export default function SendModal({
  contractors,
  policies,
  allPolicies,
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
  const [showChecks, setShowChecks] = useState(false);
  const finalProject = newProject.trim() || project;
  const docs = countDocuments(policies);

  const compliance = useMemo(
    () => checkCompliance(contractor.coverageRequirements, allPolicies || policies),
    [contractor.coverageRequirements, allPolicies, policies]
  );

  const lastSend = (contractor.pastSends || []).sort(
    (a, b) => new Date(b.sentAt) - new Date(a.sentAt)
  )[0];

  const handleSend = async () => {
    if (sending) return;
    setSending(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    onSend();
  };

  const firstName = contractor.contact?.split(" ")[0] || "team";
  const coverEmail =
    `To: ${contractor.email}\n` +
    `Subject: COI Package: ${finalProject}\n\n` +
    `Hello ${firstName}, please find the attached certificate of insurance for ${finalProject}. ` +
    "All documents are originals issued by our carriers and licensed insurance partners.";

  return (
    <Modal
      title="Send COI Package"
      subtitle={`${docs} verified file${docs !== 1 ? "s" : ""} ready for ${contractor.email}`}
      onClose={onClose}
    >
      {lastSend && (
        <div className="ss-note" style={{ marginTop: 0 }}>
          <Clock size={15} />
          <span>
            Last sent to {contractor.name}: <b>{formatShortDate(lastSend.sentAt)}</b> for{" "}
            <b>{lastSend.project}</b>
          </span>
        </div>
      )}

      {compliance.hasRequirements && (
        <div className={`ss-comply-banner ${compliance.compliant ? "ok" : "gap"}`}>
          <div className="ss-comply-banner-head">
            <span className="ss-comply-banner-icon" aria-hidden="true">
              {compliance.compliant ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
            </span>
            <div className="ss-comply-banner-copy">
              <b>
                {compliance.compliant
                  ? `Coverage meets ${contractor.name}'s requirements`
                  : `${compliance.unmetCount} coverage ${
                      compliance.unmetCount === 1 ? "gap" : "gaps"
                    } vs. ${contractor.name}'s requirements`}
              </b>
              <small>
                {compliance.compliant
                  ? `${compliance.metCount} of ${compliance.total} requirements met. Safe to send.`
                  : "This certificate may be rejected. Review the gaps before sending."}
              </small>
            </div>
            <button
              type="button"
              className="ss-copy-btn"
              onClick={() => setShowChecks((open) => !open)}
            >
              {showChecks ? "Hide" : "View"} checks
            </button>
          </div>
          {showChecks && (
            <div className="ss-comply-banner-body">
              <CompliancePanel result={compliance} compact />
            </div>
          )}
        </div>
      )}

      <div className="ss-field-grid">
        <label className="ss-field">
          <span className="ss-field-label">Recipient company</span>
          <select
            value={contractor.id}
            onChange={(e) => onContractorChange(e.target.value)}
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
            onChange={(e) => onProjectChange(e.target.value)}
            disabled={!contractor.projects?.length}
          >
            {contractor.projects?.length ? (
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
        <span className="ss-field-label">Or enter a new project name</span>
        <input
          value={newProject}
          onChange={(e) => onNewProjectChange(e.target.value)}
          placeholder="Example: PDX186 Tile Buildout"
        />
      </label>

      <div className="ss-review">
        <div className="ss-review-box">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <b>Certificate holder wording</b>
            <CopyButton text={contractor.holder} small />
          </div>
          <pre>{contractor.holder}</pre>
        </div>
        {contractor.requirements && (
          <div className="ss-review-box">
            <b>GC requirements</b>
            <p>{contractor.requirements}</p>
          </div>
        )}
      </div>

      <div className="ss-email">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <b>
            <Mail size={16} /> Cover email preview
          </b>
          <CopyButton text={coverEmail} small />
        </div>
        <p>
          <strong>To:</strong> {contractor.email}
        </p>
        <p>
          <strong>Subject:</strong> COI Package: {finalProject || "your project"}
        </p>
        <p style={{ marginTop: 8 }}>
          Hello {firstName}, please find the attached certificate of insurance for{" "}
          {finalProject || "your project"}. All documents are originals issued by our carriers
          and licensed insurance partners.
        </p>
      </div>

      <div className="ss-send-docs-list">
        {policies.map((policy) =>
          policy.documents.map((doc) => (
            <DocumentRow key={`${policy.id}-${doc}`} name={`${policy.name}: ${doc}`} />
          ))
        )}
        {docs === 0 && (
          <p className="ss-muted" style={{ margin: 0, fontSize: 13 }}>
            No documents attached yet. Upload policy declarations pages to include files in this
            package.
          </p>
        )}
      </div>

      <footer className="ss-footer">
        <span className="ss-footer-info">
          {compliance.hasRequirements && !compliance.compliant ? (
            <>
              <ShieldAlert size={14} style={{ verticalAlign: -2, marginRight: 4, color: "var(--warning)" }} />
              {compliance.unmetCount} unmet requirement{compliance.unmetCount !== 1 ? "s" : ""}. Send anyway?
            </>
          ) : (
            <>{docs} verified file{docs !== 1 ? "s" : ""} ready for delivery</>
          )}
        </span>
        <button
          type="button"
          className={`ss-button${compliance.hasRequirements && !compliance.compliant ? " warn" : ""}`}
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
      <span className="ss-pdf" aria-hidden="true">
        PDF
      </span>
      <div className="ss-doc-body">
        <b>{name}</b>
        <small>Original carrier-issued document. Verified</small>
      </div>
      <em className="ss-verified">
        <Check size={13} /> Verified
      </em>
    </div>
  );
}
