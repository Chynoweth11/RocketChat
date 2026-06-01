import { useId, useState } from "react";
import { BriefcaseBusiness } from "lucide-react";
import Modal from "./Modal.jsx";
import { makeId } from "../utils.js";

const EMPTY = {
  name: "",
  company: "",
  email: "",
  phone: "",
  policyTypes: "",
  notes: "",
};

export default function AddBrokerModal({ onClose, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  const change = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Required";
    if (!form.company.trim()) next.company = "Required";
    if (!form.email.trim()) next.email = "Required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      next.email = "Enter a valid email";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const policyTypes = form.policyTypes
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    onSave({
      id: makeId("broker"),
      name: form.name.trim(),
      company: form.company.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      policyTypes,
      notes: form.notes.trim(),
    });
  };

  return (
    <Modal
      title="Add insurance review partner"
      subtitle="Save trusted advisors, brokers, or partner contacts for renewal, coverage, and savings reviews."
      onClose={onClose}
    >
      <div className="ss-field-grid">
        <FormField
          label="Advisor name"
          value={form.name}
          onChange={change("name")}
          placeholder="Avery Brooks"
          error={errors.name}
        />
        <FormField
          label="Partner organization"
          value={form.company}
          onChange={change("company")}
          placeholder="Lighthouse Construction Risk"
          error={errors.company}
        />
        <FormField
          label="Email"
          value={form.email}
          onChange={change("email")}
          type="email"
          placeholder="avery@partner.com"
          error={errors.email}
        />
        <FormField
          label="Phone"
          value={form.phone}
          onChange={change("phone")}
          placeholder="(512) 555-0182"
        />
      </div>

      <FormField
        label="Policy types handled (comma separated)"
        value={form.policyTypes}
        onChange={change("policyTypes")}
        placeholder="workers, liability, auto, umbrella"
      />

      <FormField
        label="Notes"
        value={form.notes}
        onChange={change("notes")}
        placeholder="Primary contact for urgent renewal and savings review requests."
        multiline
      />

      <footer className="ss-footer">
        <span className="ss-footer-info">Partner records are private to your company.</span>
        <button type="button" className="ss-button" onClick={handleSave}>
          <BriefcaseBusiness size={16} /> Save partner
        </button>
      </footer>
    </Modal>
  );
}

function FormField({ label, value, onChange, placeholder, type = "text", error, multiline }) {
  const errorId = useId();
  const describedBy = error ? errorId : undefined;
  return (
    <label className="ss-field">
      <span className="ss-field-label">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
      ) : (
        <input
          value={value}
          onChange={onChange}
          type={type}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
      )}
      {error && (
        <span className="ss-field-error" id={errorId} role="alert">
          {error}
        </span>
      )}
    </label>
  );
}
