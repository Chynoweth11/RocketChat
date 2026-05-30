import { useMemo, useState } from "react";
import { BadgeDollarSign } from "lucide-react";
import Modal from "./Modal.jsx";
import { formatMoney, policyLabelFromType } from "../utils.js";

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

  const validate = () => {
    const next = {};
    if (!policyId) next.policyId = "Select a policy";
    if (routeType === "partner" && !partnerId) next.partnerId = "Select a partner";
    if (routeType === "broker" && !brokerId) next.brokerId = "Select an advisor";
    if (!contactEmail.trim()) next.contactEmail = "Contact email required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (submitting || !validate()) return;
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

  return (
    <Modal
      title="Request coverage review or savings quote"
      subtitle="SubShield routes your insurance details to licensed insurance review partners, carriers, and brokers. SubShield does not issue insurance directly."
      onClose={onClose}
    >
      <div className="ss-field-grid">
        <FormField label="Policy">
          <select value={policyId} onChange={(event) => setPolicyId(event.target.value)}>
            {policies.map((policy) => (
              <option key={policy.id} value={policy.id}>
                {policy.name} - {policy.carrier}
              </option>
            ))}
          </select>
          {errors.policyId && <span className="ss-field-error">{errors.policyId}</span>}
        </FormField>

        <FormField label="Routing">
          <select value={routeType} onChange={(event) => setRouteType(event.target.value)}>
            <option value="partner">Coverage & savings network</option>
            <option value="broker">My insurance advisor</option>
          </select>
        </FormField>
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
        <FormField label="Insurance review partner">
          <select value={brokerId} onChange={(event) => setBrokerId(event.target.value)}>
            <option value="">Select advisor</option>
            {brokers.map((broker) => (
              <option key={broker.id} value={broker.id}>
                {broker.name} - {broker.company}
              </option>
            ))}
          </select>
          {errors.brokerId && <span className="ss-field-error">{errors.brokerId}</span>}
        </FormField>
      )}

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
            {company.tradeType} - {company.state}
            <br />
            {revenueRange || "Revenue range not set"} - {employees || "Employees not set"}
          </p>
        </div>
      </div>

      <div className="ss-field-grid">
        <FormField label="Business contact email">
          <input
            type="email"
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
            placeholder="owner@company.com"
          />
          {errors.contactEmail && <span className="ss-field-error">{errors.contactEmail}</span>}
        </FormField>
        <FormField label="Revenue range">
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

      <footer className="ss-footer">
        <span className="ss-footer-info">
          Requests are logged for compliance and quote follow-up.
        </span>
        <button type="button" className="ss-button" onClick={submit} disabled={submitting}>
          <BadgeDollarSign size={16} />
          {submitting ? "Submitting..." : "Submit request"}
        </button>
      </footer>
    </Modal>
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
