import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Mail,
  Send,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import Modal from "./Modal.jsx";
import CopyButton from "./CopyButton.jsx";
import { CompliancePanel } from "./CompliancePanel.jsx";
import { checkCompliance, countDocuments, formatShortDate } from "../utils.js";

const STEPS = ["Recipient", "Requirements", "Send"];

function Disclosure({ title, icon, extra, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`ss-coi-disclosure${open ? " open" : ""}`}>
      <div className="ss-coi-disclosure-head">
        <button
          type="button"
          className="ss-coi-disclosure-toggle"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          {icon}
          <span>{title}</span>
        </button>
        {extra}
      </div>
      {open && <div className="ss-coi-disclosure-body">{children}</div>}
    </div>
  );
}

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
  const [step, setStep] = useState(0);
  const [sending, setSending] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  const finalProject = newProject.trim() || project;
  const docs = countDocuments(policies);

  const compliance = useMemo(
    () => checkCompliance(contractor.coverageRequirements, allPolicies || policies),
    [contractor.coverageRequirements, allPolicies, policies]
  );

  const lastSend = (contractor.pastSends || []).sort(
    (a, b) => new Date(b.sentAt) - new Date(a.sentAt)
  )[0];

  const firstName = contractor.contact?.split(" ")[0] || "team";
  const coverEmail =
    `To: ${contractor.email}\n` +
    `Subject: COI Package: ${finalProject}\n\n` +
    `Hello ${firstName}, please find the attached certificate of insurance for ${finalProject}. ` +
    "All documents are originals issued by our carriers and licensed insurance partners.";

  const hasGap = compliance.hasRequirements && !compliance.compliant;
  const docGroups = policies
    .filter((policy) => policy.documents?.length)
    .map((policy) => ({ id: policy.id, name: policy.name, files: policy.documents }));

  const handleSend = async () => {
    if (sending) return;
    setSending(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    onSend();
  };

  return (
    <Modal title="Send COI Package" onClose={onClose} className="ss-coi-modal">
      <div className="ss-coi-steps" role="tablist" aria-label="Send steps">
        {STEPS.map((label, index) => (
          <button
            type="button"
            key={label}
            className={`ss-coi-step-chip${index === step ? " active" : ""}${
              index < step ? " done" : ""
            }`}
            onClick={() => index < step && setStep(index)}
            disabled={index > step}
            aria-current={index === step ? "step" : undefined}
          >
            <span className="ss-coi-step-num" aria-hidden="true">
              {index < step ? <Check size={12} /> : index + 1}
            </span>
            {label}
          </button>
        ))}
      </div>

      <div className="ss-coi-summary">
        <div className="ss-coi-summary-main">
          <b>{contractor.name}</b>
          <small>
            {contractor.email}
            {finalProject ? ` · ${finalProject}` : ""}
          </small>
        </div>
        <span className={`ss-coi-ready ${hasGap ? "gap" : "ok"}`}>
          {hasGap ? (
            <>
              <ShieldAlert size={12} /> {compliance.unmetCount} gap
              {compliance.unmetCount === 1 ? "" : "s"}
            </>
          ) : (
            <>
              <ShieldCheck size={12} /> Ready
            </>
          )}
        </span>
      </div>

      {/* Step 1 — Recipient & project */}
      {step === 0 && (
        <div className="ss-coi-panel">
          <div className="ss-field-grid">
            <label className="ss-field">
              <span className="ss-field-label">Recipient company</span>
              <select value={contractor.id} onChange={(e) => onContractorChange(e.target.value)}>
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
                  contractor.projects.map((item) => <option key={item}>{item}</option>)
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

          {lastSend && (
            <p className="ss-coi-lastsent">
              <Clock size={13} /> Last sent {formatShortDate(lastSend.sentAt)} for{" "}
              <b>{lastSend.project}</b>
            </p>
          )}
        </div>
      )}

      {/* Step 2 — Requirements */}
      {step === 1 && (
        <div className="ss-coi-panel">
          {compliance.hasRequirements ? (
            <div className={`ss-coi-readiness ${compliance.compliant ? "ok" : "gap"}`}>
              <span className="ss-coi-readiness-icon" aria-hidden="true">
                {compliance.compliant ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
              </span>
              <div className="ss-coi-readiness-copy">
                <b>
                  {compliance.compliant
                    ? `Coverage meets ${contractor.name}'s requirements`
                    : `${compliance.unmetCount} coverage ${
                        compliance.unmetCount === 1 ? "gap" : "gaps"
                      }`}
                </b>
                <small>
                  {compliance.compliant
                    ? `${compliance.metCount} of ${compliance.total} requirements met. Safe to send.`
                    : "This certificate may be rejected. Review the gap before sending."}
                </small>
              </div>
            </div>
          ) : (
            <div className="ss-coi-readiness ok">
              <span className="ss-coi-readiness-icon" aria-hidden="true">
                <ShieldCheck size={18} />
              </span>
              <div className="ss-coi-readiness-copy">
                <b>No specific requirements on file</b>
                <small>{contractor.name} hasn't set coverage requirements. The full package will be sent.</small>
              </div>
            </div>
          )}

          {compliance.hasRequirements && <CompliancePanel result={compliance} compact />}

          <Disclosure
            title="Certificate holder wording"
            extra={<CopyButton text={contractor.holder} small />}
          >
            <pre className="ss-coi-pre">{contractor.holder}</pre>
          </Disclosure>

          {contractor.requirements && (
            <Disclosure title="GC requirements">
              <p className="ss-coi-reqs">{contractor.requirements}</p>
            </Disclosure>
          )}
        </div>
      )}

      {/* Step 3 — Documents & send */}
      {step === 2 && (
        <div className="ss-coi-panel">
          {hasGap && (
            <div className="ss-coi-readiness gap">
              <span className="ss-coi-readiness-icon" aria-hidden="true">
                <ShieldAlert size={18} />
              </span>
              <div className="ss-coi-readiness-copy">
                <b>
                  {compliance.unmetCount} requirement{compliance.unmetCount === 1 ? "" : "s"} not met
                </b>
                <small>The certificate may be rejected. You can review the gap or send anyway.</small>
              </div>
              <button type="button" className="ss-coi-link" onClick={() => setStep(1)}>
                Review gap
              </button>
            </div>
          )}

          <div className="ss-coi-docsummary">
            <span className="ss-coi-docsummary-icon" aria-hidden="true">
              <ShieldCheck size={18} />
            </span>
            <div className="ss-coi-readiness-copy">
              <b>
                {docs} verified file{docs === 1 ? "" : "s"} included
              </b>
              <small>
                {docs === 0
                  ? "No documents attached yet."
                  : `Carrier-issued originals across ${docGroups.length} ${
                      docGroups.length === 1 ? "policy" : "policies"
                    }.`}
              </small>
            </div>
            {docs > 0 && (
              <button type="button" className="ss-coi-link" onClick={() => setShowDocs((v) => !v)}>
                {showDocs ? "Hide files" : "Review files"}
              </button>
            )}
          </div>

          {showDocs && docGroups.length > 0 && (
            <div className="ss-coi-docgroups">
              {docGroups.map((group) => (
                <div className="ss-coi-docgroup" key={group.id}>
                  <div className="ss-coi-docgroup-head">
                    <b>{group.name}</b>
                    <small>
                      {group.files.length} file{group.files.length === 1 ? "" : "s"}
                    </small>
                  </div>
                  {group.files.map((file) => (
                    <div className="ss-coi-docfile" key={file}>
                      <Check size={13} aria-hidden="true" />
                      <span>{file}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          <Disclosure title="Cover email preview" icon={<Mail size={14} />} extra={<CopyButton text={coverEmail} small />}>
            <div className="ss-coi-email">
              <p>
                <strong>To</strong> {contractor.email}
              </p>
              <p>
                <strong>Subject</strong> COI Package: {finalProject || "your project"}
              </p>
              <p className="ss-coi-email-body">
                Hello {firstName}, please find the attached certificate of insurance for{" "}
                {finalProject || "your project"}. All documents are originals issued by our carriers
                and licensed insurance partners.
              </p>
            </div>
          </Disclosure>
        </div>
      )}

      <footer className="ss-coi-footer">
        {step > 0 ? (
          <button type="button" className="ss-button soft" onClick={() => setStep(step - 1)}>
            <ArrowLeft size={15} /> Back
          </button>
        ) : (
          <button type="button" className="ss-button soft" onClick={onClose}>
            Cancel
          </button>
        )}

        {step < 2 ? (
          <button
            type="button"
            className="ss-button"
            onClick={() => setStep(step + 1)}
            disabled={step === 0 && !finalProject}
          >
            Continue <ArrowRight size={15} />
          </button>
        ) : (
          <button type="button" className="ss-button" onClick={handleSend} disabled={sending || docs === 0}>
            {sending ? (
              <>
                <span className="ss-spinner" /> Sending…
              </>
            ) : (
              <>
                <Send size={16} /> Send package
              </>
            )}
          </button>
        )}
      </footer>
    </Modal>
  );
}
