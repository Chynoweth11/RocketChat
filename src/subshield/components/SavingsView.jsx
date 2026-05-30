import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BadgeDollarSign,
  BellRing,
  CalendarClock,
  CircleOff,
  FileCheck2,
  Handshake,
  History,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import {
  formatDeductible,
  formatLongDate,
  formatMoney,
  policyLabelFromType,
  quoteStatusLabel,
  savingsForOpportunity,
} from "../utils.js";
import { Info, Section, Spinner } from "./Layout.jsx";

const FILTERS = [
  { id: "open", label: "Needs action" },
  { id: "all", label: "All" },
  { id: "available", label: "Available" },
  { id: "quote_received", label: "Quote ready" },
  { id: "accepted", label: "Switched" },
  { id: "remind_later", label: "Snoozed" },
  { id: "dismissed", label: "Dismissed" },
];

const WORKFLOW_STEPS = [
  { id: "start", label: "Start" },
  { id: "coverage", label: "Coverage" },
  { id: "application", label: "Application" },
  { id: "quote", label: "Quote" },
  { id: "purchase", label: "Purchase" },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const REQUEST_TYPES = [
  { value: "renewal_review", label: "Review this renewal for better options" },
  { value: "compare_quotes", label: "Compare new quote options" },
  { value: "missing_coverage", label: "Help me add missing coverage" },
];

const CERTIFICATE_SUPPORT = [
  { value: "specific_holder", label: "Specific requester / certificate holder" },
  { value: "none", label: "No certificate holder support needed" },
];

export default function SavingsView({
  opportunities,
  policies,
  quoteRequests,
  partners,
  brokers,
  potentialSavings,
  realizedSavings,
  findingId,
  onFindBetterRate,
  onAcceptQuote,
  onKeepCurrent,
  onTalkToAdvisor,
  onRemindLater,
  onReactivate,
  onAddAdvisor,
  coverageApplication,
  onSaveCoverageApplication,
  onSubmitCoverageApplication,
  onNavigate,
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");

  const policyById = useMemo(
    () => new Map((policies || []).map((policy) => [policy.id, policy])),
    [policies]
  );
  const partnerById = useMemo(
    () => new Map((partners || []).map((partner) => [partner.id, partner])),
    [partners]
  );
  const brokerById = useMemo(
    () => new Map((brokers || []).map((broker) => [broker.id, broker])),
    [brokers]
  );

  const filteredOpportunities = useMemo(() => {
    const q = query.trim().toLowerCase();
    return opportunities.filter((opportunity) => {
      const policy = policyById.get(opportunity.policyId);
      const policyLabel = policy?.name || policyLabelFromType(opportunity.policyType);
      const matchesQuery =
        !q ||
        policyLabel.toLowerCase().includes(q) ||
        opportunity.currentCarrier.toLowerCase().includes(q);
      const matchesFilter =
        statusFilter === "all"
          ? true
          : statusFilter === "open"
          ? ["available", "quote_received"].includes(opportunity.status)
          : opportunity.status === statusFilter;
      return matchesQuery && matchesFilter;
    });
  }, [opportunities, policyById, query, statusFilter]);

  const availableCount = opportunities.filter((item) =>
    ["available", "quote_received"].includes(item.status)
  ).length;
  const switchedCount = opportunities.filter((item) => item.status === "accepted").length;

  return (
    <div className="ss-grid">
      <section className="ss-card ss-span">
        <Section
          title="Coverage review workflow"
          sub="Enter policy details, continue your application, and connect with licensed insurance partners."
        />

        <div className="ss-coverage-flow-grid">
          <CoverageApplicationCard
            coverageApplication={coverageApplication}
            policies={policies}
            partners={partners}
            onSaveCoverageApplication={onSaveCoverageApplication}
            onSubmitCoverageApplication={onSubmitCoverageApplication}
          />

          <PolicyServicesCard
            onNavigate={onNavigate}
            partnerNames={partners
              .filter((item) => item.active)
              .slice(0, 4)
              .map((item) => item.name)}
            potentialSavings={potentialSavings}
          />
        </div>
      </section>

      <section className="ss-card ss-span">
        <Section
          title="Savings opportunities"
          sub="Comparable coverage at lower cost, organized by priority."
          extra={
            <span className="ss-section-extra">
              {availableCount} open - {switchedCount} switched
            </span>
          }
        />

        {opportunities.length > 0 && (
          <>
            <div className="ss-search">
              <Search size={16} className="ss-search-icon" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by policy or carrier..."
                aria-label="Search opportunities"
              />
            </div>
            <div className="ss-chip-group">
              {FILTERS.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`ss-chip ${statusFilter === item.id ? "active" : ""}`}
                  onClick={() => setStatusFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </>
        )}

        {opportunities.length === 0 && (
          <div className="ss-empty">
            <BadgeDollarSign size={28} />
            <h2>No opportunities yet</h2>
            <p>Add or upload policies and SubShield will surface savings opportunities.</p>
          </div>
        )}

        {opportunities.length > 0 && filteredOpportunities.length === 0 && (
          <div className="ss-empty" style={{ minHeight: 160 }}>
            <Search size={28} />
            <h2>No matches</h2>
            <p>Try a different filter or search term.</p>
          </div>
        )}

        <div className="ss-savings-list">
          {filteredOpportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              policy={policyById.get(opportunity.policyId)}
              busy={findingId === opportunity.id}
              onFindBetterRate={() => onFindBetterRate(opportunity)}
              onAcceptQuote={() => onAcceptQuote(opportunity)}
              onKeepCurrent={() => onKeepCurrent(opportunity)}
              onTalkToAdvisor={() => onTalkToAdvisor(opportunity)}
              onRemindLater={() => onRemindLater(opportunity)}
              onReactivate={() => onReactivate(opportunity)}
            />
          ))}
        </div>
      </section>

      <section className="ss-card">
        <Section title="Quote history" sub="Submitted requests and partner responses" />
        {quoteRequests.length === 0 && (
          <div className="ss-empty" style={{ minHeight: 160 }}>
            <History size={28} />
            <h2>No quote requests yet</h2>
            <p>Start a coverage review workflow to create your first request.</p>
          </div>
        )}
        {quoteRequests.map((request) => {
          const partner = request.partnerId ? partnerById.get(request.partnerId) : null;
          const broker = request.brokerId ? brokerById.get(request.brokerId) : null;
          const tone =
            request.status === "quote_received" || request.status === "accepted"
              ? "success"
              : request.status === "declined"
              ? "danger"
              : "warning";
          return (
            <div className="ss-insight" key={request.id}>
              <div>
                <b>{policyById.get(request.policyId)?.name || "Policy request"}</b>
                <small>
                  {request.routeType === "partner"
                    ? `Partner: ${partner?.name || "Unassigned"}`
                    : `Advisor: ${broker?.name || "Unassigned"}`}
                  <br />
                  Submitted {formatLongDate(request.submittedAt)}
                </small>
              </div>
              <em className={`ss-status ${tone}`}>{quoteStatusLabel(request.status)}</em>
            </div>
          );
        })}
      </section>

      <section className="ss-card">
        <Section
          title="Insurance review partners"
          sub="Licensed contacts for renewals, policy questions, and quote support"
          extra={
            <button type="button" className="ss-button soft ss-button-sm" onClick={onAddAdvisor}>
              <Plus size={14} /> Add
            </button>
          }
        />
        {brokers.length === 0 && (
          <div className="ss-note">
            <Sparkles size={16} />
            <span>No advisor saved. Add one for one-click renewal reviews.</span>
          </div>
        )}
        {brokers.map((broker) => (
          <div className="ss-insight" key={broker.id}>
            <div>
              <b>{broker.name}</b>
              <small>
                {broker.company}
                <br />
                {broker.email}
              </small>
            </div>
          </div>
        ))}

        <div className="ss-partner-network">
          <span className="ss-eyebrow">Coverage and savings network</span>
          <div className="ss-partner-chips">
            {partners
              .filter((partner) => partner.active)
              .map((partner) => (
                <span className="ss-partner-chip" key={partner.id} title={partner.amRating || ""}>
                  <ShieldCheck size={12} /> {partner.name}
                </span>
              ))}
          </div>
        </div>
      </section>

      <section className="ss-card">
        <Section title="Savings summary" sub="How much has been found and realized" />
        <div className="ss-info-grid">
          <Info label="Potential savings" value={`${formatMoney(potentialSavings)}/yr`} />
          <Info label="Realized savings" value={`${formatMoney(realizedSavings)}/yr`} />
          <Info label="Open opportunities" value={availableCount} />
          <Info label="Switched policies" value={switchedCount} />
        </div>
      </section>
    </div>
  );
}

function CoverageApplicationCard({
  coverageApplication,
  policies,
  partners,
  onSaveCoverageApplication,
  onSubmitCoverageApplication,
}) {
  const [form, setForm] = useState(coverageApplication);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm(coverageApplication);
  }, [coverageApplication]);

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1, current + 2].map((value) => String(value));
  }, []);

  const policyTypes = useMemo(() => {
    const seen = new Set();
    const options = [];
    policies.forEach((policy) => {
      const policyType = policy.policyType || policy.type;
      if (!policyType || seen.has(policyType) || policyType === "license") return;
      seen.add(policyType);
      options.push({ value: policyType, label: policyLabelFromType(policyType) });
    });
    return options.length
      ? options
      : [{ value: "workers", label: policyLabelFromType("workers") }];
  }, [policies]);

  const stepIndex = Math.max(
    0,
    WORKFLOW_STEPS.findIndex((item) => item.id === form.stage)
  );

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function nextStep() {
    const nextIndex = Math.min(stepIndex + 1, WORKFLOW_STEPS.length - 1);
    const nextStage = WORKFLOW_STEPS[nextIndex].id;
    const next = { ...form, stage: nextStage };
    setForm(next);
    onSaveCoverageApplication(next, { logActivity: false, toast: false });
  }

  function previousStep() {
    const nextIndex = Math.max(stepIndex - 1, 0);
    const nextStage = WORKFLOW_STEPS[nextIndex].id;
    const next = { ...form, stage: nextStage };
    setForm(next);
    onSaveCoverageApplication(next, { logActivity: false, toast: false });
  }

  function validate() {
    const nextErrors = {};
    if (!form.policyType) nextErrors.policyType = "Select a policy type.";
    if (!form.contactEmail?.trim()) nextErrors.contactEmail = "Contact email is required.";
    if (!form.renewalMonth) nextErrors.renewalMonth = "Select a renewal month.";
    if (!form.renewalYear) nextErrors.renewalYear = "Select a renewal year.";
    if (!form.state?.trim()) nextErrors.state = "State is required.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function saveDraft() {
    onSaveCoverageApplication(form, { logActivity: true, toast: true });
  }

  function submit() {
    if (!validate()) return;
    onSubmitCoverageApplication({ ...form, stage: "quote" });
  }

  return (
    <div className="ss-coverage-application-card">
      <div className="ss-coverage-stepper" aria-label="Coverage application progress">
        {WORKFLOW_STEPS.map((step, index) => (
          <div
            key={step.id}
            className={`ss-coverage-step ${index <= stepIndex ? "active" : ""}`}
          >
            <span>{index + 1}</span>
            <small>{step.label}</small>
          </div>
        ))}
      </div>

      <div className="ss-note success" style={{ marginTop: 0 }}>
        Enter your current insurance details and SubShield will route your request to licensed
        partners for renewal help and savings quotes.
      </div>

      <div className="ss-field-grid">
        <label className="ss-field">
          <span className="ss-field-label">Policy type</span>
          <select
            value={form.policyType || ""}
            onChange={(event) => updateField("policyType", event.target.value)}
          >
            {policyTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          {errors.policyType && <span className="ss-field-error">{errors.policyType}</span>}
        </label>

        <label className="ss-field">
          <span className="ss-field-label">Current insurance carrier (optional)</span>
          <input
            value={form.currentCarrier || ""}
            onChange={(event) => updateField("currentCarrier", event.target.value)}
            placeholder="StateFund West"
          />
        </label>
      </div>

      <div className="ss-field-grid">
        <label className="ss-field">
          <span className="ss-field-label">Policy renewal month</span>
          <select
            value={form.renewalMonth || ""}
            onChange={(event) => updateField("renewalMonth", event.target.value)}
          >
            <option value="">Select month</option>
            {MONTHS.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
          {errors.renewalMonth && <span className="ss-field-error">{errors.renewalMonth}</span>}
        </label>

        <label className="ss-field">
          <span className="ss-field-label">Policy renewal year</span>
          <select
            value={form.renewalYear || ""}
            onChange={(event) => updateField("renewalYear", event.target.value)}
          >
            <option value="">Select year</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          {errors.renewalYear && <span className="ss-field-error">{errors.renewalYear}</span>}
        </label>
      </div>

      <div className="ss-field-grid">
        <label className="ss-field">
          <span className="ss-field-label">Trade type</span>
          <input
            value={form.tradeType || ""}
            onChange={(event) => updateField("tradeType", event.target.value)}
            placeholder="Tile and stone installation"
          />
        </label>

        <label className="ss-field">
          <span className="ss-field-label">State</span>
          <input
            value={form.state || ""}
            onChange={(event) => updateField("state", event.target.value)}
            placeholder="TX"
          />
          {errors.state && <span className="ss-field-error">{errors.state}</span>}
        </label>
      </div>

      <div className="ss-field-grid">
        <label className="ss-field">
          <span className="ss-field-label">Contact email</span>
          <input
            type="email"
            value={form.contactEmail || ""}
            onChange={(event) => updateField("contactEmail", event.target.value)}
            placeholder="owner@company.com"
          />
          {errors.contactEmail && <span className="ss-field-error">{errors.contactEmail}</span>}
        </label>

        <label className="ss-field">
          <span className="ss-field-label">Preferred licensed partner</span>
          <select
            value={form.preferredPartnerId || ""}
            onChange={(event) => updateField("preferredPartnerId", event.target.value)}
          >
            <option value="">Auto-route to best partner</option>
            {partners
              .filter((partner) => partner.active)
              .map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
          </select>
        </label>
      </div>

      <div className="ss-field-grid">
        <label className="ss-field">
          <span className="ss-field-label">Revenue range</span>
          <input
            value={form.revenueRange || ""}
            onChange={(event) => updateField("revenueRange", event.target.value)}
            placeholder="$1M-$5M"
          />
        </label>
        <label className="ss-field">
          <span className="ss-field-label">Employees</span>
          <input
            value={form.employees || ""}
            onChange={(event) => updateField("employees", event.target.value)}
            placeholder="11-25"
          />
        </label>
      </div>

      <label className="ss-field">
        <span className="ss-field-label">Request type</span>
        <div className="ss-option-stack">
          {REQUEST_TYPES.map((item) => (
            <label key={item.value} className="ss-radio-row">
              <input
                type="radio"
                name="request-type"
                checked={form.requestType === item.value}
                onChange={() => updateField("requestType", item.value)}
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </label>

      <label className="ss-field">
        <span className="ss-field-label">Certificate support</span>
        <div className="ss-option-stack">
          {CERTIFICATE_SUPPORT.map((item) => (
            <label key={item.value} className="ss-radio-row">
              <input
                type="radio"
                name="certificate-support"
                checked={form.certificateSupportType === item.value}
                onChange={() => updateField("certificateSupportType", item.value)}
              />
              <span>{item.label}</span>
            </label>
          ))}
          <label className="ss-radio-row">
            <input
              type="checkbox"
              checked={Boolean(form.recurringCertificateEmails)}
              onChange={(event) =>
                updateField("recurringCertificateEmails", event.target.checked)
              }
            />
            <span>Send this certificate reminder each policy term</span>
          </label>
        </div>
      </label>

      <label className="ss-field">
        <span className="ss-field-label">Notes for the insurance partner</span>
        <textarea
          value={form.notes || ""}
          onChange={(event) => updateField("notes", event.target.value)}
          placeholder="Please review coverage gaps, renewal pricing, and quote alternatives."
        />
      </label>

      <footer className="ss-footer">
        <span className="ss-footer-info">
          Last saved {form.updatedAt ? formatLongDate(form.updatedAt) : "today"}.
        </span>
        <div className="ss-row">
          <button type="button" className="ss-button soft ss-button-sm" onClick={previousStep}>
            Back
          </button>
          <button type="button" className="ss-button soft ss-button-sm" onClick={nextStep}>
            Continue application
          </button>
          <button type="button" className="ss-button soft ss-button-sm" onClick={saveDraft}>
            Save draft
          </button>
          <button type="button" className="ss-button ss-button-sm" onClick={submit}>
            Submit request
          </button>
        </div>
      </footer>
    </div>
  );
}

function PolicyServicesCard({ onNavigate, partnerNames, potentialSavings }) {
  const services = [
    {
      id: "policies",
      title: "Manage my insurance",
      detail: "Review policy details, limits, and documentation in one place.",
      icon: ShieldCheck,
    },
    {
      id: "certificates",
      title: "Request certificate",
      detail: "Send COI packages with saved holder wording and project context.",
      icon: FileCheck2,
    },
    {
      id: "renewals",
      title: "Manage renewals",
      detail: "Track deadlines and keep coverage active before policies lapse.",
      icon: CalendarClock,
    },
    {
      id: "settings",
      title: "Manage billing and account",
      detail: "Update billing contacts, payment methods, and workspace settings.",
      icon: Handshake,
    },
  ];

  return (
    <div className="ss-policy-services-card">
      <Section
        title="Policy services"
        sub="Quick actions modeled after carrier portals and insurance partner workflows."
      />

      <div className="ss-note">
        <Sparkles size={16} />
        <span>
          Potential savings: {formatMoney(potentialSavings)}/yr across your open opportunities.
        </span>
      </div>

      {services.map((service) => {
        const Icon = service.icon;
        return (
          <button
            type="button"
            key={service.id}
            className="ss-service-row"
            onClick={() => onNavigate(service.id)}
          >
            <span className="ss-service-icon" aria-hidden="true">
              <Icon size={15} />
            </span>
            <span className="ss-service-copy">
              <b>{service.title}</b>
              <small>{service.detail}</small>
            </span>
            <ArrowRight size={14} />
          </button>
        );
      })}

      <div className="ss-partner-network">
        <span className="ss-eyebrow">Connected licensed partners</span>
        <p className="ss-muted" style={{ marginTop: 6 }}>
          {partnerNames.length
            ? partnerNames.join(", ")
            : "Partner network available after your first request."}
        </p>
      </div>
    </div>
  );
}

function OpportunityCard({
  opportunity,
  policy,
  busy,
  onFindBetterRate,
  onAcceptQuote,
  onKeepCurrent,
  onTalkToAdvisor,
  onRemindLater,
  onReactivate,
}) {
  const status = opportunity.status;
  const saving = savingsForOpportunity(opportunity);
  const name = policy?.name || policyLabelFromType(opportunity.policyType);
  const quote = opportunity.alternateQuote;

  if (status === "accepted") {
    return (
      <article className="ss-savings-card accepted">
        <div className="ss-savings-head">
          <div>
            <span className="ss-eyebrow">Switched and saving</span>
            <h2>{name}</h2>
            <p className="ss-muted">
              Now with {quote?.carrier || opportunity.currentCarrier}.
            </p>
          </div>
          <div className="ss-savings-amount">
            <small>Annual savings</small>
            <strong className="ss-savings-pos">{formatMoney(saving)}/yr</strong>
          </div>
        </div>
        <div className="ss-note success">
          <BadgeCheck size={16} />
          <span>Coverage switched and logged. We will keep monitoring future renewals.</span>
        </div>
      </article>
    );
  }

  if (status === "dismissed" || status === "remind_later") {
    return (
      <article className="ss-savings-card muted">
        <div className="ss-savings-head">
          <div>
            <span className="ss-eyebrow">{quoteStatusLabel(status)}</span>
            <h2>{name}</h2>
            <p className="ss-muted">
              {status === "remind_later"
                ? "Snoozed. This will return near renewal."
                : "Dismissed. Reopen any time to compare again."}
            </p>
          </div>
          <button type="button" className="ss-button soft ss-button-sm" onClick={onReactivate}>
            Reopen
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="ss-savings-card">
      <div className="ss-savings-head">
        <div>
          <span className="ss-eyebrow">
            {status === "quote_received" ? "Quote ready" : "Savings available"}
          </span>
          <h2>{name}</h2>
          <p className="ss-muted">
            Current carrier {opportunity.currentCarrier} - Renews{" "}
            {formatLongDate(opportunity.renewalDate)}
          </p>
        </div>
        <div className="ss-savings-amount">
          <small>{status === "quote_received" ? "You save" : "Estimated savings"}</small>
          <strong className="ss-savings-pos">{formatMoney(saving)}/yr</strong>
        </div>
      </div>

      {status === "quote_received" && quote ? (
        <>
          <div className="ss-compare">
            <div className="ss-compare-col">
              <span className="ss-compare-label">Current</span>
              <b>{opportunity.currentCarrier}</b>
              <div className="ss-compare-rows">
                <span>Premium</span>
                <strong>{formatMoney(opportunity.currentPremium)}/yr</strong>
                <span>Deductible</span>
                <strong>{formatDeductible(policy?.deductible)}</strong>
                <span>Limit</span>
                <strong>{policy?.coverageLimits || "N/A"}</strong>
              </div>
            </div>
            <div className="ss-compare-arrow" aria-hidden="true">
              <ArrowRight size={18} />
            </div>
            <div className="ss-compare-col recommended">
              <span className="ss-compare-label">
                <BadgeCheck size={13} /> Recommended
              </span>
              <b>{quote.carrier}</b>
              <div className="ss-compare-rows">
                <span>Premium</span>
                <strong className="ss-savings-pos">{formatMoney(quote.premium)}/yr</strong>
                <span>Deductible</span>
                <strong>{formatDeductible(quote.deductible)}</strong>
                <span>Limit</span>
                <strong>{quote.coverageLimits || "N/A"}</strong>
              </div>
            </div>
          </div>

          {quote.highlights?.length ? (
            <ul className="ss-quote-highlights">
              {quote.highlights.map((highlight) => (
                <li key={highlight}>
                  <BadgeCheck size={13} /> {highlight}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="ss-row">
            <button type="button" className="ss-button" onClick={onAcceptQuote}>
              <BadgeCheck size={16} /> Accept and switch
            </button>
            <button type="button" className="ss-button soft" onClick={onKeepCurrent}>
              Keep current
            </button>
            <button type="button" className="ss-button soft" onClick={onTalkToAdvisor}>
              Talk to advisor
            </button>
          </div>
          {quote.amRating ? (
            <p className="ss-fine">
              {quote.carrier} - AM Best rating {quote.amRating}. Quote valid through{" "}
              {formatLongDate(quote.bindableUntil)}.
            </p>
          ) : null}
        </>
      ) : (
        <>
          <div className="ss-info-grid">
            <Info label="Current premium" value={`${formatMoney(opportunity.currentPremium)}/yr`} />
            <Info label="Estimated savings" value={`${formatMoney(saving)}/yr`} />
          </div>
          {opportunity.notes ? <p className="ss-muted">{opportunity.notes}</p> : null}
          <div className="ss-row">
            <button type="button" className="ss-button" onClick={onFindBetterRate} disabled={busy}>
              {busy ? (
                <>
                  <Spinner /> Shopping rates...
                </>
              ) : (
                <>
                  <Search size={16} /> Find better rate
                </>
              )}
            </button>
            <button type="button" className="ss-button soft" onClick={onTalkToAdvisor}>
              Talk to advisor
            </button>
            <button type="button" className="ss-button soft" onClick={onRemindLater}>
              <BellRing size={16} /> Remind me later
            </button>
            <button type="button" className="ss-button soft" onClick={onKeepCurrent}>
              <CircleOff size={16} /> Not interested
            </button>
          </div>
        </>
      )}
    </article>
  );
}
