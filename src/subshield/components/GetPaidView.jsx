import { useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleDollarSign,
  Clock,
  HandCoins,
  MinusCircle,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  SquarePen,
} from "lucide-react";
import { Section, Info } from "./Layout.jsx";
import { ComplianceBadge, CompliancePanel } from "./CompliancePanel.jsx";
import { formatShortDate, timeAgo } from "../utils.js";

const FILTERS = [
  { id: "all", label: "All jobs" },
  { id: "action", label: "Action needed" },
  { id: "gaps", label: "Coverage gaps" },
  { id: "sent", label: "Sent" },
];

const STATUS_ICON = {
  not_covered: ShieldAlert,
  ready_to_send: Send,
  needs_resend: Clock,
  covered_sent: ShieldCheck,
};

function matchesFilter(job, filter) {
  if (filter === "all") return true;
  if (filter === "gaps") return job.status === "not_covered";
  if (filter === "sent") return job.status === "covered_sent" || job.status === "needs_resend";
  return job.status !== "covered_sent"; // action
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

  return (
    <div className="ss-grid">
      <section className="ss-card ss-span">
        <Section
          title="Get Paid"
          sub="Every job in one place — what's covered, what's been sent, and exactly what's holding up your payment."
          extra={
            <button type="button" className="ss-button soft ss-button-sm" onClick={onAddHolder}>
              <Building2 size={14} /> Add GC
            </button>
          }
        />
        <div className="ss-command-metrics">
          <Info label="Active jobs" value={summary.total} />
          <Info label="Ready to bill" value={summary.coveredSent} />
          <Info label="Need action" value={summary.actionNeeded} />
          <Info label="Coverage gaps" value={summary.gaps} />
        </div>
      </section>

      {!hasHolders ? (
        <section className="ss-card ss-span">
          <div className="ss-empty">
            <HandCoins size={32} />
            <h2>No jobs to track yet</h2>
            <p>
              Add the GCs you work for and the projects you're on. SubShield will line up their
              coverage requirements against your real policies and tell you the moment a job is
              clear to bill.
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
              <h2>Nothing here</h2>
              <p>
                {filter === "action" || filter === "gaps"
                  ? "No jobs need your attention in this view — nice work."
                  : "No jobs match this filter yet."}
              </p>
            </div>
          ) : (
            <div className="ss-jobs">
              {filtered.map((job) => (
                <JobCard
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

function JobCard({ job, onSend, onFixCoverage, onEditHolder }) {
  const [open, setOpen] = useState(false);
  const StatusIcon = STATUS_ICON[job.status] || CircleDollarSign;
  const hasGaps = job.status === "not_covered";

  return (
    <div className={`ss-job ss-job--${job.tone}`}>
      <div className="ss-job-head">
        <span className="ss-gc-avatar" aria-hidden="true">
          {job.initials}
        </span>
        <div className="ss-job-id">
          <div className="ss-job-title-row">
            <b className="ss-job-project">{job.project}</b>
            {job.compliance?.hasRequirements && <ComplianceBadge result={job.compliance} />}
          </div>
          <small className="ss-job-gc">
            {job.gcName}
            {job.lastSend ? ` · COI sent ${timeAgo(job.lastSend.sentAt)}` : " · no COI sent"}
          </small>
        </div>
        <span className={`ss-job-status ss-job-status--${job.tone}`}>
          <StatusIcon size={13} aria-hidden="true" />
          {job.statusLabel}
        </span>
      </div>

      <div className="ss-job-steps">
        {job.steps.map((step, index) => (
          <div
            key={index}
            className={`ss-job-step ${
              step.neutral ? "neutral" : step.done ? "done" : "todo"
            }`}
          >
            {step.neutral ? (
              <MinusCircle size={15} aria-hidden="true" />
            ) : step.done ? (
              <CheckCircle2 size={15} aria-hidden="true" />
            ) : (
              <Circle size={15} aria-hidden="true" />
            )}
            <span className="ss-job-step-label">{step.label}</span>
            <span className="ss-job-step-detail">{step.detail}</span>
          </div>
        ))}
      </div>

      {job.blockers.length > 0 && (
        <div className="ss-job-blockers">
          <ShieldAlert size={14} aria-hidden="true" />
          <span>
            <b>Blocking payment:</b> {job.blockers.join(" · ")}
          </span>
        </div>
      )}

      {hasGaps && open && (
        <div className="ss-job-coverage">
          <CompliancePanel result={job.compliance} compact />
        </div>
      )}

      <div className="ss-job-actions">
        {hasGaps ? (
          <>
            <button type="button" className="ss-button" onClick={onFixCoverage}>
              <ShieldCheck size={15} /> Review coverage
            </button>
            <button type="button" className="ss-button soft" onClick={() => setOpen((v) => !v)}>
              {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              {open ? "Hide gaps" : "View gaps"}
            </button>
            <button type="button" className="ss-button warn" onClick={onSend}>
              <Send size={15} /> Send anyway
            </button>
          </>
        ) : job.status === "covered_sent" ? (
          <>
            <span className="ss-job-done">
              <CheckCircle2 size={15} /> Delivered {formatShortDate(job.lastSend.sentAt)} — clear to bill
            </span>
            <button type="button" className="ss-button soft" onClick={onSend}>
              <RefreshCw size={15} /> Resend
            </button>
          </>
        ) : (
          <>
            <button type="button" className="ss-button" onClick={onSend}>
              <Send size={15} />
              {job.status === "needs_resend" ? "Resend COI" : "Send COI"}
              <ArrowRight size={14} />
            </button>
            <button
              type="button"
              className="ss-mini-btn"
              onClick={onEditHolder}
              aria-label={`Edit ${job.gcName} requirements`}
              title="Edit GC & requirements"
            >
              <SquarePen size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
