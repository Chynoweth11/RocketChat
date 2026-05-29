import { useState } from "react";
import { SquarePen, Trash2 } from "lucide-react";
import Modal from "./Modal.jsx";
import { deriveInitials } from "../utils.js";

export default function EditHolderModal({ contractor, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({
    name: contractor.name,
    contact: contractor.contact,
    email: contractor.email,
    delivery: contractor.delivery,
    holder: contractor.holder,
    requirements: contractor.requirements,
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
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
    onSave({
      ...contractor,
      name: form.name.trim(),
      initials: deriveInitials(form.name),
      contact: form.contact.trim(),
      email: form.email.trim(),
      delivery: form.delivery.trim() || "Compliance inbox",
      holder: form.holder.trim(),
      requirements:
        form.requirements.trim() || "Standard verified COI package accepted.",
    });
  };

  return (
    <Modal
      title={`Edit ${contractor.name}`}
      subtitle="Update certificate holder details, requirements, and delivery method."
      onClose={onClose}
    >
      <div className="ss-field-grid">
        <FormField
          label="GC name"
          value={form.name}
          onChange={change("name")}
          error={errors.name}
        />
        <FormField
          label="Primary contact"
          value={form.contact}
          onChange={change("contact")}
          error={errors.contact}
        />
        <FormField
          label="Compliance email"
          value={form.email}
          onChange={change("email")}
          type="email"
          error={errors.email}
        />
        <FormField
          label="Delivery method"
          value={form.delivery}
          onChange={change("delivery")}
        />
      </div>

      <FormField
        label="Certificate holder"
        value={form.holder}
        onChange={change("holder")}
        multiline
        error={errors.holder}
      />

      <FormField
        label="Requirements"
        value={form.requirements}
        onChange={change("requirements")}
        multiline
      />

      <footer className="ss-footer">
        {!confirmDelete ? (
          <button
            type="button"
            className="ss-button soft"
            onClick={() => setConfirmDelete(true)}
            style={{ color: "var(--red)" }}
          >
            <Trash2 size={15} /> Remove GC
          </button>
        ) : (
          <div className="ss-row" style={{ margin: 0 }}>
            <button
              type="button"
              className="ss-button danger"
              onClick={() => onDelete(contractor.id)}
            >
              Confirm remove
            </button>
            <button
              type="button"
              className="ss-button soft"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </button>
          </div>
        )}

        <button type="button" className="ss-button" onClick={handleSave}>
          <SquarePen size={15} /> Save changes
        </button>
      </footer>
    </Modal>
  );
}

function FormField({ label, value, onChange, type = "text", error, multiline }) {
  return (
    <label className="ss-field">
      <span className="ss-field-label">{label}</span>
      {multiline ? (
        <textarea value={value} onChange={onChange} />
      ) : (
        <input value={value} onChange={onChange} type={type} />
      )}
      {error && <span className="ss-field-error">{error}</span>}
    </label>
  );
}
