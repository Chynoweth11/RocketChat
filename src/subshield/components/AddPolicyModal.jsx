import { useMemo, useState } from "react";
import { FilePlus2 } from "lucide-react";
import Modal from "./Modal.jsx";
import { makeId, policyLabelFromType } from "../utils.js";

const POLICY_TYPES = [
  "liability",
  "workers",
  "auto",
  "umbrella",
  "property",
  "cyber",
  "equipment",
  "tools",
  "builders_risk",
  "professional",
  "pollution",
  "bonding",
  "license",
];

const EMPTY = {
  policyType: "liability",
  carrier: "",
  policyNumber: "",
  premiumAmount: "",
  premiumFrequency: "annual",
  deductible: "",
  effectiveDate: "",
  renewalDate: "",
  coverageLimits: "",
  brokerId: "",
  documents: "",
};

export default function AddPolicyModal({ brokers = [], defaultType, onClose, onSave }) {
  const [form, setForm] = useState({
    ...EMPTY,
    policyType: defaultType || EMPTY.policyType,
  });
  const [errors, setErrors] = useState({});

  const availableBrokers = useMemo(() => brokers || [], [brokers]);

  const change = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const validate = () => {
    const next = {};
    if (!form.carrier.trim()) next.carrier = "Required";
    if (!form.policyNumber.trim()) next.policyNumber = "Required";
    if (!form.renewalDate.trim()) next.renewalDate = "Required";
    if (!form.premiumAmount || Number(form.premiumAmount) < 0) {
      next.premiumAmount = "Enter a valid amount";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const renewalDate = form.renewalDate;
    const effectiveDate = form.effectiveDate || renewalDate;
    const premiumAmount = Number(form.premiumAmount);
    const deductible =
      form.deductible === "" ? null : Number(String(form.deductible).replace(/[^\d.]/g, ""));
    const documents = form.documents
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    onSave({
      id: makeId("pol"),
      policyType: form.policyType,
      type: form.policyType,
      name: policyLabelFromType(form.policyType),
      carrier: form.carrier.trim(),
      policyNumber: form.policyNumber.trim(),
      premiumAmount,
      premium: premiumAmount,
      premiumFrequency: form.premiumFrequency,
      deductible,
      effectiveDate,
      expirationDate: renewalDate,
      renewalDate,
      expires: renewalDate,
      coverageLimits: form.coverageLimits.trim(),
      limit: form.coverageLimits.trim(),
      brokerId: form.brokerId || null,
      documents,
      status: "active",
      savingsStatus: "monitoring",
    });
  };

  return (
    <Modal
      title="Add insurance policy"
      subtitle="Track every policy in one place with renewal dates, premiums, and documents."
      onClose={onClose}
    >
      <div className="ss-field-grid">
        <FormField label="Policy type">
          <select value={form.policyType} onChange={change("policyType")}>
            {POLICY_TYPES.map((type) => (
              <option key={type} value={type}>
                {policyLabelFromType(type)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          label="Carrier"
          value={form.carrier}
          onChange={change("carrier")}
          placeholder="Progressive Commercial"
          error={errors.carrier}
        />
        <FormField
          label="Policy number"
          value={form.policyNumber}
          onChange={change("policyNumber")}
          placeholder="CA-55120984"
          error={errors.policyNumber}
        />
        <FormField
          label="Premium amount"
          value={form.premiumAmount}
          onChange={change("premiumAmount")}
          type="number"
          placeholder="2460"
          error={errors.premiumAmount}
        />
        <FormField label="Premium frequency">
          <select
            value={form.premiumFrequency}
            onChange={change("premiumFrequency")}
          >
            <option value="annual">Annual</option>
            <option value="monthly">Monthly</option>
          </select>
        </FormField>
        <FormField
          label="Deductible (optional)"
          value={form.deductible}
          onChange={change("deductible")}
          type="number"
          placeholder="1000"
        />
        <FormField
          label="Effective date"
          value={form.effectiveDate}
          onChange={change("effectiveDate")}
          type="date"
        />
        <FormField
          label="Renewal date"
          value={form.renewalDate}
          onChange={change("renewalDate")}
          type="date"
          error={errors.renewalDate}
        />
        <FormField label="Insurance review partner">
          <select value={form.brokerId} onChange={change("brokerId")}>
            <option value="">No partner selected</option>
            {availableBrokers.map((broker) => (
              <option key={broker.id} value={broker.id}>
                {broker.name} | {broker.company}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField
        label="Coverage limits"
        value={form.coverageLimits}
        onChange={change("coverageLimits")}
        placeholder="$1M combined single limit"
      />

      <FormField
        label="Documents (one per line)"
        value={form.documents}
        onChange={change("documents")}
        placeholder={"Certificate of Insurance\nAdditional Insured endorsement"}
        multiline
      />

      <footer className="ss-footer">
        <span className="ss-footer-info">Policies are saved to your insurance wallet.</span>
        <button type="button" className="ss-button" onClick={handleSave}>
          <FilePlus2 size={16} /> Save policy
        </button>
      </footer>
    </Modal>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  multiline,
  children,
}) {
  return (
    <label className="ss-field">
      <span className="ss-field-label">{label}</span>
      {children ? (
        children
      ) : multiline ? (
        <textarea value={value} onChange={onChange} placeholder={placeholder} />
      ) : (
        <input
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          type={type}
        />
      )}
      {error && <span className="ss-field-error">{error}</span>}
    </label>
  );
}
