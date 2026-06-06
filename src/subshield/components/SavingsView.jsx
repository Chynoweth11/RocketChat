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
  estimateLowerPremium,
  estimateSavings,
  formatDeductible,
  formatLongDate,
  formatMoney,
  policyLabelFromType,
  quoteStatusLabel,
  savingsForOpportunity,
} from "../utils.js";
import { Info, PartnerDisclaimer, PartnerJourney, Section, Spinner } from "./Layout.jsx";

const FILTERS = [
  { id: "open", label: "Needs action" },
  { id: "all", label: "All" },
  { id: "available", label: "Available" },
  { id: "pending_partner", label: "Awaiting partner" },
  { id: "quote_received", label: "Offer ready" },
  { id: "at_partner", label: "At partner" },
  { id: "accepted", label: "Purchased" },
  { id: "remind_later", label: "Snoozed" },
  { id: "dismissed", label: "Dismissed" },
];

// Internal stage IDs are unchanged (persisted in saved drafts), but the
// labels reflect the partner-routed model: the user prepares and submits
// their information; a licensed partner handles review, quotes, and issuance.
const WORKFLOW_STEPS = [
  { id: "start", label: "Start", journey: "start" },
  { id: "coverage", label: "Coverage info", journey: "coverage" },
  { id: "application", label: "Partner match", journey: "coverage" },
  { id: "quote", label: "Request details", journey: "coverage" },
  { id: "purchase", label: "Review & submit", journey: "review" },
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
  { value: "renewal_review", label: "Renewal review: check this renewal for better options" },
  { value: "compare_quotes", label: "Better quote options: compare new quotes" },
  { value: "savings_review", label: "Savings review: look for lower-cost coverage" },
  { value: "missing_coverage", label: "Missing coverage: add a coverage type I don't have" },
  { value: "certificate_need", label: "Certificate need: I need a COI for a project" },
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
  onRequestQuote,
  onGoToPurchase,
  onConfirmPurchase,
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
          ? ["available", "pending_partner", "quote_received", "at_partner"].includes(opportunity.status)
          : opportunity.status === statusFilter;
      return matchesQuery && matchesFilter;
    });
  }, [opportunities, policyById, query, statusFilter]);

  const availableCount = opportunities.filter((item) =>
    ["available", "pending_partner", "quote_received", "at_partner"].includes(item.status)
  ).length;
  const switchedCount = opportunities.filter((item) => item.status === "accepted").length;

  // Drive the top-level partner journey strip from the user's real state:
  // once a request is submitted we advance past "coverage info"; a returned
  // quote moves to "quote options"; a switched policy means it was purchased
  // through the partner and the documents are saved back into SubShield.
  const journeyActiveId = useMemo(() => {
    if (switchedCount > 0) return "documents";
    const hasQuote = opportunities.some((item) => item.status === "quote_received");
    if (hasQuote) return "quotes";
    const hasSubmitted = (quoteRequests || []).length > 0;
    if (hasSubmitted) return "review";
    const stage = coverageApplication?.stage;
    if (stage === "purchase") return "review";
    if (stage && stage !== "start") return "coverage";
    return "start";
  }, [switchedCount, opportunities, quoteRequests, coverageApplication]);

  return (
    <div className="ss-grid">
      <section className="ss-card ss-span">
        <Section
          title="Coverage review through licensed partners"
          sub="Prepare your business and policy details in SubShield, then submit them to licensed insurance partners for review, quotes, and issuance."
        />

        <PartnerJourney activeId={journeyActiveId} />
        <PartnerDisclaimer />

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
          sub="Where licensed partners may find comparable coverage at lower cost, organized by priority."
          extra={
            <span className="ss-section-extra">
              {availableCount} open | {switchedCount} switched
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
                  aria-pressed={statusFilter === item.id}
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
            <p>Add or upload policies and SubShield will flag where licensed partners may be able to find lower-cost coverage.</p>
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
              partner={partnerById.get(opportunity.alternateQuote?.partnerId || opportunity.partnerId)}
              busy={findingId === opportunity.id}
              onRequestQuote={() => onRequestQuote(opportunity)}
              onGoToPurchase={() => onGoToPurchase(opportunity)}
              onConfirmPurchase={() => onConfirmPurchase(opportunity)}
              onKeepCurrent={() => onKeepCurrent(opportunity)}
              onTalkToAdvisor={() => onTalkToAdvisor(opportunity)}
              onRemindLater={() => onRemindLater(opportunity)}
              onReactivate={() => onReactivate(opportunity)}
            />
          ))}
        </div>
      </section>

      <section className="ss-card">
        <Section title="Quote requests & partner status" sub="What you submitted, when, and which licensed partner it routed to" />
        {quoteRequests.length === 0 && (
          <div className="ss-empty" style={{ minHeight: 160 }}>
            <History size={28} />
            <h2>No quote requests yet</h2>
            <p>Complete the coverage review above to submit your first request to a licensed partner.</p>
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
          <Info label="Purchased via partner" value={switchedCount} />
        </div>
        <PartnerDisclaimer compact />
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

  const selectedPolicy = useMemo(
    () =>
      policies.find(
        (policy) => (policy.policyType || policy.type) === form.policyType
      ) || null,
    [policies, form.policyType]
  );

  function updateField(key, value) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Autofill from the matching vault policy when the user picks a policy type
      if (key === "policyType") {
        const match = policies.find(
          (policy) => (policy.policyType || policy.type) === value
        );
        if (match) {
          if (!prev.currentCarrier) next.currentCarrier = match.carrier || "";
          const renewal = match.renewalDate || match.expirationDate || match.expires;
          if (renewal) {
            const date = new Date(renewal);
            if (!Number.isNaN(date.getTime())) {
              if (!prev.renewalMonth) next.renewalMonth = MONTHS[date.getMonth()];
              if (!prev.renewalYear) next.renewalYear = String(date.getFullYear());
            }
          }
        }
      }
      return next;
    });
  }

  function validateStep() {
    const nextErrors = {};
    if (stepIndex === 0 && !form.policyType) nextErrors.policyType = "Select a policy type.";
    if (stepIndex === 1) {
      if (!form.renewalMonth) nextErrors.renewalMonth = "Select a renewal month.";
      if (!form.renewalYear) nextErrors.renewalYear = "Select a renewal year.";
      if (!form.state?.trim()) nextErrors.state = "State is required.";
    }
    if (stepIndex === 2 && !form.contactEmail?.trim()) nextErrors.contactEmail = "Contact email is required.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function nextStep() {
    if (!validateStep()) return;
    const nextIndex = Math.min(stepIndex + 1, WORKFLOW_STEPS.length - 1);
    const nextStage = WORKFLOW_STEPS[nextIndex].id;
    const next = { ...form, stage: nextStage };
    setForm(next);
    onSaveCoverageApplication(next, { logActivity: false, toast: false });
  }

  function previousStep() {
    setErrors({});
    const nextIndex = Math.max(stepIndex - 1, 0);
    const nextStage = WORKFLOW_STEPS[nextIndex].id;
    const next = { ...form, stage: nextStage };
    setForm(next);
    onSaveCoverageApplication(next, { logActivity: false, toast: false });
  }

  function saveDraft() {
    onSaveCoverageApplication(form, { logActivity: true, toast: true });
  }

  function submit() {
    // Validate every required field across the whole wizard, not just the
    // final step - a user can reach the last step without completing an
    // earlier one (e.g. by navigating back). Jump to the first step with an
    // error so the user can see and fix it.
    const stepErrors = [
      { step: 0, errors: form.policyType ? {} : { policyType: "Select a policy type." } },
      {
        step: 1,
        errors: {
          ...(form.renewalMonth ? {} : { renewalMonth: "Select a renewal month." }),
          ...(form.renewalYear ? {} : { renewalYear: "Select a renewal year." }),
          ...(form.state?.trim() ? {} : { state: "State is required." }),
        },
      },
      {
        step: 2,
        errors: form.contactEmail?.trim() ? {} : { contactEmail: "Contact email is required." },
      },
    ];
    const firstBad = stepErrors.find((entry) => Object.keys(entry.errors).length > 0);
    if (firstBad) {
      setErrors(firstBad.errors);
      setForm((prev) => ({ ...prev, stage: WORKFLOW_STEPS[firstBad.step].id }));
      return;
    }
    setErrors({});
    onSubmitCoverageApplication({ ...form, stage: "quote" });
  }

  const isLastStep = stepIndex === WORKFLOW_STEPS.length - 1;

  return (
    <div className="ss-coverage-application-card">
      <ol className="ss-coverage-stepper" aria-label="Coverage application progress">
        {WORKFLOW_STEPS.map((step, index) => (
          <li
            key={step.id}
            className={`ss-coverage-step ${index < stepIndex ? "done" : ""} ${index === stepIndex ? "active" : ""}`}
            aria-current={index === stepIndex ? "step" : undefined}
            aria-label={`Step ${index + 1} of ${WORKFLOW_STEPS.length}: ${step.label}${index < stepIndex ? " (completed)" : index === stepIndex ? " (current)" : ""}`}
          >
            <span>{index + 1}</span>
            <small>{step.label}</small>
          </li>
        ))}
      </ol>

      {/* Step 0 - Start: policy type + carrier */}
      {stepIndex === 0 && (
        <>
          <div className="ss-note success" style={{ marginTop: 0 }}>
            Tell us which policy you want help with. SubShield will autofill details from your vault.
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
              {errors.policyType && <span className="ss-field-error" role="alert">{errors.policyType}</span>}
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
          {selectedPolicy && (
            <div className="ss-coverage-estimate">
              <div className="ss-coverage-estimate-row">
                <span>Current premium</span>
                <strong>{formatMoney(selectedPolicy.premiumAmount ?? selectedPolicy.premium ?? 0)}/yr</strong>
              </div>
              <div className="ss-coverage-estimate-row">
                <span>Estimated with a better rate</span>
                <strong>
                  {formatMoney(estimateLowerPremium(selectedPolicy.premiumAmount ?? selectedPolicy.premium ?? 0))}/yr
                </strong>
              </div>
              <div className="ss-coverage-estimate-row total">
                <span>Potential annual savings</span>
                <strong className="ss-savings-pos">
                  {formatMoney(estimateSavings(selectedPolicy.premiumAmount ?? selectedPolicy.premium ?? 0))}/yr
                </strong>
              </div>
              <p className="ss-fine">Estimate based on your current premium. Partners confirm the exact figure after review.</p>
            </div>
          )}
        </>
      )}

      {/* Step 1 - Coverage: renewal dates, trade, state */}
      {stepIndex === 1 && (
        <>
          <div className="ss-note success" style={{ marginTop: 0 }}>
            When does this policy renew? This helps partners contact you at the right time.
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
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
              {errors.renewalMonth && <span className="ss-field-error" role="alert">{errors.renewalMonth}</span>}
            </label>
            <label className="ss-field">
              <span className="ss-field-label">Policy renewal year</span>
              <select
                value={form.renewalYear || ""}
                onChange={(event) => updateField("renewalYear", event.target.value)}
              >
                <option value="">Select year</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              {errors.renewalYear && <span className="ss-field-error" role="alert">{errors.renewalYear}</span>}
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
              {errors.state && <span className="ss-field-error" role="alert">{errors.state}</span>}
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
        </>
      )}

      {/* Step 2 - Application: contact, partner, request type */}
      {stepIndex === 2 && (
        <>
          <div className="ss-note success" style={{ marginTop: 0 }}>
            How should a licensed partner reach you? We&apos;ll route to the best match for your trade and state.
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
              {errors.contactEmail && <span className="ss-field-error" role="alert">{errors.contactEmail}</span>}
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
                    <option key={partner.id} value={partner.id}>{partner.name}</option>
                  ))}
              </select>
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
        </>
      )}

      {/* Step 3 - Quote: certificate support + notes */}
      {stepIndex === 3 && (
        <>
          <div className="ss-note success" style={{ marginTop: 0 }}>
            Do you need a certificate of insurance sent alongside the quote?
          </div>
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
                  onChange={(event) => updateField("recurringCertificateEmails", event.target.checked)}
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
        </>
      )}

      {/* Step 4 - Purchase: review summary before submit */}
      {stepIndex === 4 && (
        <div className="ss-coverage-estimate" style={{ marginTop: 8 }}>
          <div className="ss-coverage-estimate-row"><span>Policy type</span><strong>{form.policyType ? policyLabelFromType(form.policyType) : "Not set"}</strong></div>
          <div className="ss-coverage-estimate-row"><span>Current carrier</span><strong>{form.currentCarrier || "Not set"}</strong></div>
          <div className="ss-coverage-estimate-row"><span>Renewal</span><strong>{form.renewalMonth && form.renewalYear ? `${form.renewalMonth} ${form.renewalYear}` : "Not set"}</strong></div>
          <div className="ss-coverage-estimate-row"><span>State</span><strong>{form.state || "Not set"}</strong></div>
          <div className="ss-coverage-estimate-row"><span>Contact email</span><strong>{form.contactEmail || "Not set"}</strong></div>
          {selectedPolicy && (
            <div className="ss-coverage-estimate-row total">
              <span>Est. savings to confirm with partner</span>
              <strong className="ss-savings-pos">
                {formatMoney(estimateSavings(selectedPolicy.premiumAmount ?? selectedPolicy.premium ?? 0))}/yr
              </strong>
            </div>
          )}
          <p className="ss-fine">
            When you submit, SubShield sends these details to a licensed insurance
            partner for review. The partner, not SubShield, provides any quotes,
            handles the application, and issues coverage. Returned documents are
            saved back into your SubShield account.
          </p>
        </div>
      )}

      <footer className="ss-footer">
        <span className="ss-footer-info">
          Last saved {form.updatedAt ? formatLongDate(form.updatedAt) : "today"}.
        </span>
        <div className="ss-row">
          {stepIndex > 0 && (
            <button type="button" className="ss-button soft ss-button-sm" onClick={previousStep}>
              Back
            </button>
          )}
          <button type="button" className="ss-button soft ss-button-sm" onClick={saveDraft}>
            Save draft
          </button>
          {!isLastStep && (
            <button type="button" className="ss-button ss-button-sm" onClick={nextStep}>
              Continue
            </button>
          )}
          {isLastStep && (
            <button type="button" className="ss-button ss-button-sm" onClick={submit}>
              Submit to licensed partner
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

function PolicyServicesCard({ onNavigate, partnerNames, potentialSavings }) {
  const services = [
    {
      key: "manage",
      nav: "policies",
      title: "Manage my insurance",
      detail: "Review policy details, limits, and documentation in one place.",
      icon: ShieldCheck,
    },
    {
      key: "certificate",
      nav: "certificates",
      title: "Request certificate",
      detail: "Send COI packages with saved holder wording and project context.",
      icon: FileCheck2,
    },
    {
      key: "renewals",
      nav: "policies",
      title: "Manage renewals",
      detail: "Track deadlines and keep coverage active before policies lapse.",
      icon: CalendarClock,
    },
    {
      key: "workspace",
      nav: "settings",
      title: "Manage workspace settings",
      detail: "Update alerts, team access, document preferences, and COI templates.",
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
            key={service.key}
            className="ss-service-row"
            onClick={() => onNavigate(service.nav)}
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
        {partnerNames.length ? (
          <div className="ss-partner-chips" style={{ marginTop: 8 }}>
            {partnerNames.map((name) => (
              <span className="ss-partner-chip" key={name}>
                <ShieldCheck size={12} /> {name}
              </span>
            ))}
          </div>
        ) : (
          <p className="ss-muted" style={{ marginTop: 6 }}>
            Partner network available after your first request.
          </p>
        )}
      </div>
    </div>
  );
}

function OpportunityCard({
  opportunity,
  policy,
  partner,
  busy,
  onRequestQuote,
  onGoToPurchase,
  onConfirmPurchase,
  onKeepCurrent,
  onTalkToAdvisor,
  onRemindLater,
  onReactivate,
}) {
  const status = opportunity.status;
  const saving = savingsForOpportunity(opportunity);
  const name = policy?.name || policyLabelFromType(opportunity.policyType);
  const quote = opportunity.alternateQuote;
  const partnerName = quote?.carrier || partner?.name || "Licensed partner";

  // -- Purchased via partner --------------------------------------------------
  if (status === "accepted") {
    return (
      <article className="ss-savings-card accepted">
        <div className="ss-savings-head">
          <div>
            <span className="ss-eyebrow">Purchased via licensed partner</span>
            <h2>{name}</h2>
            <p className="ss-muted">
              Issued by {quote?.carrier || opportunity.currentCarrier}. Documents
              uploaded and saved in SubShield.
            </p>
          </div>
          <div className="ss-savings-amount">
            <small>Annual savings</small>
            <strong className="ss-savings-pos">{formatMoney(saving)}/yr</strong>
          </div>
        </div>
        <div className="ss-note success">
          <BadgeCheck size={16} />
          <span>
            Coverage purchased through the partner. SubShield will monitor your next renewal.
          </span>
        </div>
      </article>
    );
  }

  // -- Snoozed or dismissed --------------------------------------------------
  if (status === "dismissed" || status === "remind_later") {
    return (
      <article className="ss-savings-card muted">
        <div className="ss-savings-head">
          <div>
            <span className="ss-eyebrow">{quoteStatusLabel(status)}</span>
            <h2>{name}</h2>
            <p className="ss-muted">
              {status === "remind_later"
                ? "Snoozed. This will resurface near your renewal date."
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

  // -- Awaiting partner response ---------------------------------------------
  if (status === "pending_partner") {
    return (
      <article className="ss-savings-card pending">
        <div className="ss-savings-head">
          <div>
            <span className="ss-eyebrow">Awaiting partner response</span>
            <h2>{name}</h2>
            <p className="ss-muted">
              Your request has been submitted to {partnerName}. We'll notify you when their offer arrives.
            </p>
          </div>
          <div className="ss-savings-amount">
            <small>Est. savings</small>
            <strong className="ss-savings-pos">{formatMoney(saving)}/yr</strong>
          </div>
        </div>
        <div className="ss-note" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Spinner />
          <span>
            <b>{partnerName}</b> is reviewing your coverage details. Their offer will appear here when ready.
          </span>
        </div>
      </article>
    );
  }

  // -- Partner sent offer - user clicks through to purchase -----------------
  if (status === "at_partner") {
    return (
      <article className="ss-savings-card at-partner">
        <div className="ss-savings-head">
          <div>
            <span className="ss-eyebrow">Sent to partner. Complete purchase there</span>
            <h2>{name}</h2>
            <p className="ss-muted">
              You were redirected to {partnerName} to finalize. Once you've purchased, come back here to save your new policy.
            </p>
          </div>
          <div className="ss-savings-amount">
            <small>Partner offer</small>
            <strong className="ss-savings-pos">
              {quote?.premium ? formatMoney(quote.premium) + "/yr" : formatMoney(saving) + "/yr saved"}
            </strong>
          </div>
        </div>
        <div className="ss-note">
          <TrendingDown size={16} />
          <span>
            Purchased on {partnerName}'s platform? Come back and confirm so SubShield can update your policy record.
          </span>
        </div>
        <div className="ss-row">
          <button type="button" className="ss-button" onClick={onConfirmPurchase}>
            <BadgeCheck size={16} /> I've purchased. Save my policy
          </button>
          <button type="button" className="ss-button soft" onClick={onGoToPurchase}>
            Re-open {partnerName}
          </button>
          <button type="button" className="ss-button soft" onClick={onKeepCurrent}>
            <CircleOff size={16} /> Changed my mind
          </button>
        </div>
      </article>
    );
  }

  // -- Partner offer received - show comparison ------------------------------
  if (status === "quote_received" && quote) {
    return (
      <article className="ss-savings-card">
        <div className="ss-savings-head">
          <div>
            <span className="ss-eyebrow">Partner offer from {partnerName}</span>
            <h2>{name}</h2>
            <p className="ss-muted">
              Current carrier: {opportunity.currentCarrier} | Renews {formatLongDate(opportunity.renewalDate)}
            </p>
          </div>
          <div className="ss-savings-amount">
            <small>You save</small>
            <strong className="ss-savings-pos">{formatMoney(saving)}/yr</strong>
          </div>
        </div>

        <div className="ss-partner-offer-badge">
          <BadgeCheck size={13} />
          Offer provided by <b>{partnerName}</b>
          {quote.amRating && <span className="ss-am-rating">AM Best {quote.amRating}</span>}
        </div>

        <div className="ss-compare">
          <div className="ss-compare-col">
            <span className="ss-compare-label">Your current coverage</span>
            <b>{opportunity.currentCarrier}</b>
            <div className="ss-compare-rows">
              <span>Premium</span>
              <strong>{formatMoney(opportunity.currentPremium)}/yr</strong>
              <span>Deductible</span>
              <strong>{formatDeductible(policy?.deductible)}</strong>
              <span>Limit</span>
              <strong>{policy?.coverageLimits || policy?.limit || "N/A"}</strong>
            </div>
          </div>
          <div className="ss-compare-arrow" aria-hidden="true">
            <ArrowRight size={18} />
          </div>
          <div className="ss-compare-col recommended">
            <span className="ss-compare-label">
              <BadgeCheck size={13} /> {partnerName}'s offer
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
          <button type="button" className="ss-button" onClick={onGoToPurchase}>
            <ArrowRight size={16} /> Go purchase at {partnerName}
          </button>
          <button type="button" className="ss-button soft" onClick={onKeepCurrent}>
            Keep current
          </button>
          <button type="button" className="ss-button soft" onClick={onTalkToAdvisor}>
            Talk to a licensed partner
          </button>
        </div>
        <p className="ss-fine">
          This offer was provided by {partnerName}, a licensed insurance partner. Clicking "Go purchase"
          will open their site in a new tab. Coverage is applied for, bound, and issued entirely
          by the partner, not by SubShield. Return here to upload your new policy document.
          {quote.bindableUntil && ` Offer valid through ${formatLongDate(quote.bindableUntil)}.`}
        </p>
      </article>
    );
  }

  // -- Available: no quote yet -----------------------------------------------
  return (
    <article className="ss-savings-card">
      <div className="ss-savings-head">
        <div>
          <span className="ss-eyebrow">Savings opportunity</span>
          <h2>{name}</h2>
          <p className="ss-muted">
            Current carrier: {opportunity.currentCarrier} | Renews{" "}
            {formatLongDate(opportunity.renewalDate)}
          </p>
        </div>
        <div className="ss-savings-amount">
          <small>Est. savings</small>
          <strong className="ss-savings-pos">{formatMoney(saving)}/yr</strong>
        </div>
      </div>

      <div className="ss-info-grid">
        <Info label="Current premium" value={`${formatMoney(opportunity.currentPremium)}/yr`} />
        <Info label="Estimated savings" value={`${formatMoney(saving)}/yr`} hint="Illustrative. Partner confirms exact amount after review." />
      </div>
      {opportunity.notes ? <p className="ss-muted">{opportunity.notes}</p> : null}

      <div className="ss-row">
        <button type="button" className="ss-button" onClick={onRequestQuote} disabled={busy}>
          {busy ? (
            <><Spinner /> Submitting to partner...</>
          ) : (
            <><Search size={16} /> Request quote from partner</>
          )}
        </button>
        <button type="button" className="ss-button soft" onClick={onTalkToAdvisor}>
          Talk to a licensed partner
        </button>
        <button type="button" className="ss-button soft" onClick={onRemindLater}>
          <BellRing size={16} /> Remind me later
        </button>
        <button type="button" className="ss-button soft" onClick={onKeepCurrent}>
          <CircleOff size={16} /> Not interested
        </button>
      </div>
      <p className="ss-fine">
        Submitting sends your policy details to a licensed insurance partner for review.
        SubShield does not sell or quote insurance. The partner handles review, quotes, and issuance.
      </p>
    </article>
  );
}
