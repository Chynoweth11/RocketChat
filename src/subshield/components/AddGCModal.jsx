import { useState } from "react";
import { Building2, Plus } from "lucide-react";
import Modal from "./Modal.jsx";
import { deriveInitials, makeId } from "../utils.js";

const EMPTY = {
  name: "",
  contact: "",
  email: "",
  delivery: "Compliance inbox",
  holder: "",
  requirements: "",
  firstProject: "",
};

export default function AddGCModal({ onClose, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  const change = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Required";
    if (!form.email.trim()) next.email = "Required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim()))
      next.email = "Enter a valid email";
    if (!form.contact.trim()) next.contact = "Required";
    if (!form.holder.trim()) next.holder = "Required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const contractor = {
      id: makeId("gc"),
      name: form.name.trim(),
      initials: deriveInitials(form.name),
      contact: form.contact.trim(),
      email: form.email.trim(),
      delivery: form.delivery.trim() || "Compliance inbox",
      holder: form.holder.trim(),
      requirements:
        form.requirements.trim() || "Standard verified COI package accepted.",
      projects: form.firstProject.trim() ? [form.firstProject.trim()] : [],
    };
    onSave(contractor);
  };

  return (
    <Modal
      title="Add a general contractor"
      subtitle="Saved profiles power 1-tap re-sends with the right certificate holder and delivery details."
      onClose={onClose}
    >
      <div className="ss-field-grid">
        <FormField
          label="GC name"
          value={form.name}
          onChange={change("name")}
          placeholder="Turner Construction"
          error={errors.name}
        />
        <FormField
          label="Primary contact"
          value={form.contact}
          onChange={change("contact")}
          placeholder="Sarah Chen"
          error={errors.contact}
        />
        <FormField
          label="Compliance email"
          value={form.email}
          onChange={change("email")}
          placeholder="bids@example.com"
          type="email"
          error={errors.email}
        />
        <FormField
          label="Delivery method"
          value={form.delivery}
          onChange={change("delivery")}
          placeholder="TrustLayer portal + email copy"
        />
      </div>

      <FormField
        label="Certificate holder (legal name + address)"
        value={form.holder}
        onChange={change("holder")}
        placeholder={"Turner Construction Company\n375 Hudson Street\nNew York, NY 10014"}
        multiline
        error={errors.holder}
      />

      <FormField
        label="Special requirements"
        value={form.requirements}
        onChange={change("requirements")}
        placeholder="Primary non-contributory wording, $2M umbrella, etc."
        multiline
      />

      <FormField
        label="First project (optional)"
        value={form.firstProject}
        onChange={change("firstProject")}
        placeholder="Downtown Marriott Remodel"
      />

      <footer className="ss-footer">
        <span className="ss-footer-info">
          <Building2 size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
          Saved locally to your prototype
        </span>
        <button type="button" className="ss-button" onClick={handleSave}>
          <Plus size={16} /> Save GC
        </button>
      </footer>
    </Modal>
  );
}

function FormField({ label, value, onChange, placeholder, type = "text", error, multiline }) {
  return (
    <label className="ss-field">
      <span className="ss-field-label">{label}</span>
      {multiline ? (
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
