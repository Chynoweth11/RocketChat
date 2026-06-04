import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock,
  FileCheck2,
  FileText,
  FileX2,
  RefreshCw,
  Send,
  ShieldCheck,
  SquarePen,
  Upload,
  Wallet,
} from "lucide-react";
import { Section, Info } from "./Layout.jsx";
import { CompliancePanel } from "./CompliancePanel.jsx";
import { formatShortDate, timeAgo } from "../utils.js";

const FILTERS = [
  { id: "all", label: "All GCs" },
  { id: "action", label: "Needs action" },
  { id: "gaps", label: "Doc gaps" },
  { id: "clear", label: "Docs current" },
];

// Document types required for payment readiness
const DOC_TYPES = [
  { key: "gl", label: "General Liability" },
  { key: "wc", label: "Workers' Comp" },
  { key: "auto", label: "Auto Liability" },
  { key: "umbrella", label: "Umbrella / Excess" },
  { key: "coi", label: "Certificate (COI)" },
  { key: "endorsement", label: "Endorsement" },
  { key: "waiver", label: "Waiver of Subrogation" },
];

function matchesFilter(job, filter) {
  if (filter === "all") return true;
  if (filter === "gaps") return job.status === "not_covered";
  if (filter === "clear") return job.status === "covered_sent";
  return job.status !== "covered_sent";
}

function docReadinessFromJob(job) {
  // Derive a document checklist from job data
  const compliance = job.compliance;
  const sent = Boolean(job.lastSend);
  const current = sent && job.daysSinceSend != null && job.daysSinceSend <= 90;

  const docs = [];

  // GL — check if compliance has GL requirement
  const glMet = compliance?.hasRequirements
    ? (compliance.details || []).find((d) => /general.?liab/i.test(d.label))
    : null;
  if (glMet !== undefined) {
    docs.push({ key: "gl", label: "General Liability", status: glMet?.met ? "present" : glMet ? "missing" : "present" });
  }

  // WC
  const wcMet = compliance?.hasRequirements
    ? (compliance.details || []).find((d) => /workers|comp/i.test(d.label))
    : null;
  if (wcMet !== undefined) {
    docs.push({ key: "wc", label: "Workers' Comp", status: wcMet?.met ? "present" : wcMet ? "missing" : "present" });
  }

  // COI sent status
  docs.push({
    key: "coi",
    label: "Certificate of Insurance (COI)",
    status: !sent ? "missing" : !current ? "expiring" : "present",
    detail: sent ? (current ? `Sent ${timeAgo(job.lastSend.sentAt)}` : "May be outdated — resend") : "Not yet delivered",
  });

  // If compliance has requirements at all, surface total gap
  if (compliance?.hasRequirements && !compliance.compliant) {
    docs.push({
      key: "req",
      label: `Coverage Requirements (${compliance.unmetCount} gap${compliance.unmetCount !== 1 ? "s" : ""})`,
      status: "missing",
      detail: `${compliance.metCount} of ${compliance.total} met`,
    });
  }

  return docs;
}

export default function GetPaidView({
  jobs,
  summary,
  hasHolders,
  onSend,
  onFixCoverage,
  onEditHolder,
  onAddHolder,
}) {
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(
    () => jobs.filter((job) => matchesFilter(job, filter)),
    [jobs, filter]
  );

  const expiringSoon = jobs.filter(
    (j) => j.daysSinceSend != null && j.daysSinceSend > 60 && j.daysSinceSend <= 90
  ).length;

  return (
    <div className="ss-grid">
      {/* Summary header */}
      <section className="ss-card ss-span ss-pr-header">
        <Section
          title="Payment Readiness"
          sub="Track the insurance documents your GCs and project owners require before they'll release payment. See what's missing, expiring, or already delivered."
          extra={
            <button type="button" className="ss-button soft ss-button-sm" onClick={onAddHolder}>
              <Building2 size={14} /> Add GC
            </button>
          }
        />
        <div className="ss-command-metrics">
          <Info label="GCs tracked" value={summary.total} />
          <Info label="Docs current" value={summary.coveredSent} hint="All docs delivered" />
          <Info
            label="Needs action"
            value={summary.actionNeeded}
            hint={summary.actionNeeded > 0 ? "May delay payment" : undefined}
          />
          <Info
            label="Document gaps"
            value={summary.gaps}
            hint={summary.gaps > 0 ? "Missing required docs" : undefined}
          />
        </div>

        {(summary.gaps > 0 || expiringSoon > 0) && (
          <div className="ss-pr-alert">
            <CircleAlert size={15} aria-hidden="true" />
            <span>
              {summary.gaps > 0 && (
                <>
                  <b>{summary.gaps} GC{summary.gaps !== 1 ? "s" : ""}</b> have missing documents that could delay payment.
                </>
              )}
              {summary.gaps > 0 && expiringSoon > 0 && " "}
              {expiringSoon > 0 && (
                <>
                  <b>{expiringSoon} COI{expiringSoon !== 1 ? "s" : ""}</b> are older than 60 days and should be refreshed.
                </>
              )}
            </span>
          </div>
        )}
      </section>

      {/* What delays payment — educational context strip */}
      <section className="ss-card ss-span ss-pr-context">
        <div className="ss-pr-context-inner">
          <div className="ss-pr-context-item">
            <FileX2 size={18} />
            <div>
              <b>Missing documents</b>
              <small>GCs hold payment until they have your COI, WC cert, GL cert, and any required endorsements on file.</small>
            </div>
          </div>
          <div className="ss-pr-context-item">
            <Clock size={18} />
            <div>
              <b>Expired certificates</b>
              <small>Even if documents were sent, outdated COIs trigger hold-backs. GCs require current coverage proof.</small>
            </div>
          </div>
          <div className="ss-pr-context-item">
            <FileCheck2 size={18} />
            <div>
              <b>SubShield keeps it ready</b>
              <small>We track what each GC needs, flag gaps before they're a problem, and let you send documents in one click.</small>
            </div>
          </div>
        </div>
      </section>

      {!hasHolders ? (
        <section className="ss-card ss-span">
          <div className="ss-empty">
            <Wallet size={32} />
            <h2>No GCs tracked yet</h2>
            <p>
              Add the general contractors and project owners you work with. SubShield will show you exactly which insurance documents each one requires — so nothing holds up your next payment.
            </p>
            <button type="button" className="ss-button" onClick={onAddHolder}>
              <Building2 size={15} /> Add your first GC
            </button>
          </div>
        </section>
      ) : (
        <section className="ss-card ss-span">
          <div className="ss-chip-group" style={{ marginBottom: 4 }}>
            {FILTERS.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`ss-chip ${filter === item.id ? "active" : ""}`}
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="ss-empty" style={{ minHeight: 150 }}>
              <CheckCircle2 size={28} />
              <h2>All clear here</h2>
              <p>
                {filter === "action" || filter === "gaps"
                  ? "No GCs have document issues — your payment readiness is in good shape."
                  : "No GCs match this filter."}
              </p>
            </div>
          ) : (
            <div className="ss-jobs">
              {filtered.map((job) => (
                <ReadinessCard
                  key={job.id}
                  job={job}
                  onSend={() => onSend(job.contractor, job.hasProject ? job.project : "")}
                  onFixCoverage={() => onFixCoverage(job.contractor)}
                  onEditHolder={() => onEditHolder(job.contractor)}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ReadinessCard({ job, onSend, onFixCoverage, onEditHolder }) {
  const [open, setOpen] = useState(false);
  const docs = docReadinessFromJob(job);
  const hasGaps = job.status === "not_covered";
  const isClear = job.status === "covered_sent";

  const statusConfig = {
    not_covered: { label: "Document gaps", tone: "danger", icon: CircleAlert },
    ready_to_send: { label: "COI not sent", tone: "warning", icon: Send },
    needs_resend: { label: "Docs may be outdated", tone: "warning", icon: Clock },
    covered_sent: { label: "Docs current", tone: "success", icon: CheckCircle2 },
  };
  const cfg = statusConfig[job.status] || statusConfig.ready_to_send;
  const StatusIcon = cfg.icon;

  return (
    <div className={`ss-job ss-job--${job.tone}`}>
      <div className="ss-job-head">
        <span className="ss-gc-avatar" aria-hidden="true">
          {job.initials}
        </span>
        <div className="ss-job-id">
          <div className="ss-job-title-row">
            <b className="ss-job-project">{job.gcName}</b>
          </div>
          <small className="ss-job-gc">
            {job.hasProject ? job.project : "General coverage"}
            {job.lastSend
              ? ` · COI delivered ${timeAgo(job.lastSend.sentAt)}`
              : " · No COI delivered yet"}
          </small>
        </div>
        <span className={`ss-job-status ss-job-status--${job.tone}`}>
          <StatusIcon size={13} aria-hidden="true" />
          {cfg.label}
        </span>
      </div>

      {/* Document checklist */}
      <div className="ss-doc-checklist">
        <div className="ss-doc-checklist-label">Document status</div>
        <div className="ss-doc-rows">
          {docs.map((doc) => (
            <DocRow key={doc.key} doc={doc} />
          ))}
          {docs.length === 0 && (
            <div className="ss-doc-row ss-doc-row--neutral">
              <FileText size={14} />
              <span>No specific requirements on file</span>
            </div>
          )}
        </div>
      </div>

      {/* Blockers */}
      {job.blockers.length > 0 && (
        <div className="ss-job-blockers">
          <AlertCircle size={14} aria-hidden="true" />
          <div>
            <b>Holding up payment:</b>
            <ul className="ss-blocker-list">
              {job.blockers.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Compliance detail expand */}
      {hasGaps && open && (
        <div className="ss-job-coverage">
          <CompliancePanel result={job.compliance} compact />
        </div>
      )}

      {/* Actions */}
      <div className="ss-job-actions">
        {hasGaps ? (
          <>
            <button type="button" className="ss-button" onClick={onFixCoverage}>
              <ShieldCheck size={15} /> Fix coverage gaps
              <ArrowRight size={14} />
            </button>
            <button type="button" className="ss-button soft" onClick={() => setOpen((v) => !v)}>
              {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              {open ? "Hide detail" : "View gaps"}
            </button>
            <button type="button" className="ss-button soft" onClick={onSend}>
              <Upload size={15} /> Upload document
            </button>
          </>
        ) : isClear ? (
          <>
            <span className="ss-job-done">
              <CheckCircle2 size={15} />
              Delivered {formatShortDate(job.lastSend.sentAt)} — clear for payment
            </span>
            <button type="button" className="ss-button soft" onClick={onSend}>
              <RefreshCw size={15} /> Resend COI
            </button>
            <button
              type="button"
              className="ss-mini-btn"
              onClick={onEditHolder}
              aria-label={`Edit ${job.gcName} requirements`}
              title="Edit requirements"
            >
              <SquarePen size={16} />
            </button>
          </>
        ) : (
          <>
            <button type="button" className="ss-button" onClick={onSend}>
              <Send size={15} />
              {job.status === "needs_resend" ? "Send updated COI" : "Send COI to GC"}
              <ArrowRight size={14} />
            </button>
            <button type="button" className="ss-button soft" onClick={onSend}>
              <Upload size={15} /> Upload document
            </button>
            <button
              type="button"
              className="ss-mini-btn"
              onClick={onEditHolder}
              aria-label={`Edit ${job.gcName} requirements`}
              title="Edit requirements"
            >
              <SquarePen size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function DocRow({ doc }) {
  const statusClass =
    doc.status === "present"
      ? "present"
      : doc.status === "expiring"
      ? "expiring"
      : "missing";

  const Icon =
    doc.status === "present"
      ? CheckCircle2
      : doc.status === "expiring"
      ? Clock
      : FileX2;

  return (
    <div className={`ss-doc-row ss-doc-row--${statusClass}`}>
      <Icon size={14} aria-hidden="true" />
      <span className="ss-doc-name">{doc.label}</span>
      {doc.detail && <span className="ss-doc-detail">{doc.detail}</span>}
    </div>
  );
}
