import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BadgeDollarSign, Check } from "lucide-react";
import Modal from "./Modal.jsx";
import { formatMoney, policyLabelFromType } from "../utils.js";

const STEPS = [
  { id: "start", label: "Start" },
  { id: "coverage", label: "Coverage" },
  { id: "application", label: "Application" },
  { id: "review", label: "Review" },
];

export default function QuoteRequestModal({
  company,
  policies,
  partners,
  brokers,
  opportunity,
  defaultPolicyId,
  defaultRouteType = "partner",
  defaultPartnerId = "",
  defaultBrokerId = "",
  onClose,
  onSubmit,
}) {
  const firstPolicyId = policies[0]?.id || "";
  const [step, setStep] = useState(0);
  const [policyId, setPolicyId] = useState(
    opportunity?.policyId || defaultPolicyId || firstPolicyId
  );
  const [routeType, setRouteType] = useState(defaultRouteType);
  const [partnerId, setPartnerId] = useState(
    defaultPartnerId || opportunity?.partnerId || partners.find((item) => item.active)?.id || ""
  );
  const [brokerId, setBrokerId] = useState(defaultBrokerId || brokers[0]?.id || "");
  const [notes, setNotes] = useState("");
  const [contactEmail, setContactEmail] = useState(company.contactEmail || "");
  const [revenueRange, setRevenueRange] = useState(company.revenueRange || "");
  const [employees, setEmployees] = useState(company.employees || "");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const selectedPolicy = useMemo(
    () => policies.find((item) => item.id === policyId) || policies[0],
    [policies, policyId]
  );

  const activePartners = useMemo(
    () => partners.filter((item) => item.active),
    [partners]
  );

  const selectedPartner = activePartners.find((item) => item.id === partnerId);
  const selectedBroker = brokers.find((item) => item.id === brokerId);

  const validateStep = (index) => {
    const next = {};
    if (index === 0) {
      if (!policyId) next.policyId = "Select a policy";
      if (!contactEmail.trim()) next.contactEmail = "Contact email required";
    }
    if (index === 1) {
      if (routeType === "partner" && !partnerId) next.partnerId = "Select a partner";
      if (routeType === "broker" && !brokerId) next.brokerId = "Select an advisor";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setErrors({});
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const submit = async () => {
    if (submitting) return;
    // Re-validate the gating steps before final submit.
    if (!validateStep(0)) {
      setStep(0);
      return;
    }
    if (!validateStep(1)) {
      setStep(1);
      return;
    }
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    onSubmit({
      policyId,
      routeType,
      partnerId: routeType === "partner" ? partnerId : null,
      brokerId: routeType === "broker" ? brokerId : null,
      businessInfo: {
        companyName: company.name,
        tradeType: company.tradeType,
        state: company.state,
        revenueRange,
        employees,
        contactEmail: contactEmail.trim(),
      },
      currentCoverageInfo: {
        currentCarrier: selectedPolicy?.carrier || "",
        currentPremium: selectedPolicy?.premiumAmount || 0,
        renewalDate: selectedPolicy?.renewalDate || selectedPolicy?.expirationDate || "",
      },
      notes: notes.trim(),
      opportunityId: opportunity?.id || null,
    });
  };

  const isLast = step === STEPS.length - 1;

  return (
    <Modal
      title="Let's get you covered"
      subtitle="SubShield routes your insurance details to licensed review partners, carriers, and advisors to find better coverage and pricing. SubShield does not issue insurance directly."
      onClose={onClose}
    >
      <ol className="ss-stepper" aria-label="Quote progress">
        {STEPS.map((item, index) => {
          const state = index < step ? "done" : index === step ? "current" : "upcoming";
          return (
            <li key={item.id} className={`ss-step ${state}`}>
              <span className="ss-step-dot">
                {state === "done" ? <Check size={13} /> : index + 1}
              </span>
              <span className="ss-step-label">{item.label}</span>
            </li>
          );
        })}
      </ol>

      <div className="ss-step-body">
        {step === 0 && (
          <>
            <p className="ss-step-intro">
              Tell us which coverage to review and where to send your quote. It takes about two minutes.
            </p>
            <FormField label="Which policy do you want to review?">
              <select value={policyId} onChange={(event) => setPolicyId(event.target.value)}>
                {policies.map((policy) => (
                  <option key={policy.id} value={policy.id}>
                    {policy.name} | {policy.carrier}
                  </option>
                ))}
              </select>
              {errors.policyId && <span className="ss-field-error">{errors.policyId}</span>}
            </FormField>
            <FormField label="Business contact email">
              <input
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                placeholder="owner@company.com"
              />
              <small className="ss-field-hint">
                We only use your email to deliver quotes and coverage updates.
              </small>
              {errors.contactEmail && <span className="ss-field-error">{errors.contactEmail}</span>}
            </FormField>
          </>
        )}

        {step === 1 && (
          <>
            <p className="ss-step-intro">Choose how you want SubShield to source your quote.</p>
            <div className="ss-choice-grid">
              <ChoiceCard
                active={routeType === "partner"}
                onClick={() => setRouteType("partner")}
                title="Coverage & savings network"
                detail="Compare rates from licensed partner carriers."
              />
              <ChoiceCard
                active={routeType === "broker"}
                onClick={() => setRouteType("broker")}
                title="My insurance advisor"
                detail="Send to a broker you already work with."
              />
            </div>

            {routeType === "partner" ? (
              <FormField label="Quote partner">
                <select value={partnerId} onChange={(event) => setPartnerId(event.target.value)}>
                  <option value="">Select partner</option>
                  {activePartners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name} ({partner.type})
                    </option>
                  ))}
                </select>
                {errors.partnerId && <span className="ss-field-error">{errors.partnerId}</span>}
              </FormField>
            ) : (
              <FormField label="Insurance advisor">
                <select value={brokerId} onChange={(event) => setBrokerId(event.target.value)}>
                  <option value="">Select advisor</option>
                  {brokers.map((broker) => (
                    <option key={broker.id} value={broker.id}>
                      {broker.name} | {broker.company}
                    </option>
                  ))}
                </select>
                {errors.brokerId && <span className="ss-field-error">{errors.brokerId}</span>}
              </FormField>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <p className="ss-step-intro">
              These details help partners return accurate quotes. Optional, but recommended.
            </p>
            <div className="ss-field-grid">
              <FormField label="Annual revenue range">
                <input
                  value={revenueRange}
                  onChange={(event) => setRevenueRange(event.target.value)}
                  placeholder="$1M-$5M"
                />
              </FormField>
              <FormField label="Employees">
                <input
                  value={employees}
                  onChange={(event) => setEmployees(event.target.value)}
                  placeholder="11-25"
                />
              </FormField>
            </div>
            <FormField label="Notes for the review partner">
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Please review this renewal for coverage gaps, quote options, and premium savings opportunities."
              />
            </FormField>
          </>
        )}

        {step === 3 && (
          <>
            <p className="ss-step-intro">Review your request before we send it.</p>
            <div className="ss-review">
              <div className="ss-review-box">
                <b>Current policy snapshot</b>
                <p>
                  {selectedPolicy ? (
                    <>
                      {policyLabelFromType(selectedPolicy.policyType)} with {selectedPolicy.carrier}
                      <br />
                      Premium: {formatMoney(selectedPolicy.premiumAmount)}/{selectedPolicy.premiumFrequency}
                      <br />
                      Renewal: {selectedPolicy.renewalDate || selectedPolicy.expirationDate}
                    </>
                  ) : (
                    "No policy selected."
                  )}
                </p>
              </div>
              <div className="ss-review-box">
                <b>Business profile</b>
                <p>
                  {company.name}
                  <br />
                  {company.tradeType} | {company.state}
                  <br />
                  {revenueRange || "Revenue range not set"} | {employees || "Employees not set"}
                </p>
              </div>
              <div className="ss-review-box">
                <b>Routing</b>
                <p>
                  {routeType === "partner"
                    ? selectedPartner
                      ? `${selectedPartner.name} (${selectedPartner.type})`
                      : "Coverage & savings network"
                    : selectedBroker
                      ? `${selectedBroker.name} | ${selectedBroker.company}`
                      : "Insurance advisor"}
                  <br />
                  Quotes sent to {contactEmail || "your contact email"}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      <footer className="ss-footer ss-wizard-footer">
        <span className="ss-footer-info">
          {isLast
            ? "Requests are logged for compliance and quote follow-up."
            : `Step ${step + 1} of ${STEPS.length}`}
        </span>
        <div className="ss-wizard-actions">
          {step > 0 && (
            <button type="button" className="ss-button soft" onClick={goBack} disabled={submitting}>
              <ArrowLeft size={16} /> Back
            </button>
          )}
          {isLast ? (
            <button type="button" className="ss-button" onClick={submit} disabled={submitting}>
              <BadgeDollarSign size={16} />
              {submitting ? "Submitting..." : "Submit request"}
            </button>
          ) : (
            <button type="button" className="ss-button" onClick={goNext}>
              Continue <ArrowRight size={16} />
            </button>
          )}
        </div>
      </footer>
    </Modal>
  );
}

function ChoiceCard({ active, onClick, title, detail }) {
  return (
    <button
      type="button"
      className={`ss-choice-card ${active ? "active" : ""}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className="ss-choice-radio" aria-hidden="true" />
      <span className="ss-choice-text">
        <b>{title}</b>
        <small>{detail}</small>
      </span>
    </button>
  );
}

function FormField({ label, children }) {
  return (
    <label className="ss-field">
      <span className="ss-field-label">{label}</span>
      {children}
    </label>
  );
}
