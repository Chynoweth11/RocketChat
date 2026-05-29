import { useState } from "react";
import { FileText, HardHat, Lock, ShieldCheck, Truck, Umbrella, Upload } from "lucide-react";
import Modal from "./Modal.jsx";

const TYPES = [
  {
    id: "umbrella",
    label: "Umbrella",
    icon: Umbrella,
    name: "Umbrella / Excess Liability",
    carrier: "Hiscox Insurance Co.",
    policyNumber: "UM-7740921",
    daysRemaining: 318,
    premium: 980,
    limit: "$2M excess liability",
    documents: ["Umbrella certificate"],
  },
  {
    id: "liability",
    label: "General liability",
    icon: ShieldCheck,
    name: "General Liability",
    carrier: "Acme Mutual",
    policyNumber: "GL-44827193",
    daysRemaining: 365,
    premium: 1840,
    limit: "$2M aggregate / $1M occurrence",
    documents: ["GL certificate", "Additional Insured"],
  },
  {
    id: "auto",
    label: "Commercial auto",
    icon: Truck,
    name: "Commercial Auto",
    carrier: "Progressive Commercial",
    policyNumber: "CA-55120984",
    daysRemaining: 280,
    premium: 2460,
    limit: "$1M combined single limit",
    documents: ["Auto certificate"],
  },
  {
    id: "workers",
    label: "Workers' comp",
    icon: HardHat,
    name: "Workers' Compensation",
    carrier: "StateFund West",
    policyNumber: "WC-90183321",
    daysRemaining: 365,
    premium: 3210,
    limit: "Statutory / $1M employer liability",
    documents: ["WC certificate"],
  },
  {
    id: "license",
    label: "Trade license",
    icon: FileText,
    name: "Trade License",
    carrier: "TX Dept. of Licensing",
    policyNumber: "TL-TILE-0099821",
    daysRemaining: 365,
    premium: 295,
    limit: "Tile contractor license",
    documents: ["Trade license"],
  },
];

export default function ScanModal({ onClose, onVault, existingTypes = [] }) {
  const [typeId, setTypeId] = useState("umbrella");
  const selected = TYPES.find((t) => t.id === typeId) || TYPES[0];
  const alreadyVaulted = existingTypes.includes(selected.id);

  return (
    <Modal
      title="Vault a document"
      subtitle="The original carrier PDF stays untouched. SubShield only reads metadata."
      onClose={onClose}
    >
      <div className="ss-upload">
        <div className="ss-upload-pdf" aria-hidden="true">PDF</div>
        <h3>Upload carrier-issued certificate</h3>
        <p>
          Prototype mode: choose a document type below to simulate metadata
          extraction. In production, drag-and-drop a real PDF.
        </p>
        <button type="button" className="ss-button soft" disabled>
          <Upload size={16} /> Choose file (preview disabled)
        </button>
      </div>

      <div className="ss-field-label" style={{ marginBottom: 8 }}>
        Detected document type
      </div>
      <div className="ss-chip-group" role="radiogroup" aria-label="Document type">
        {TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              type="button"
              role="radio"
              aria-checked={typeId === type.id}
              className={`ss-chip ${typeId === type.id ? "active" : ""}`}
              onClick={() => setTypeId(type.id)}
            >
              <Icon size={14} /> {type.label}
            </button>
          );
        })}
      </div>

      <div className="ss-detected">
        <b>Carrier</b>
        <span>{selected.carrier}</span>
        <b>Policy number</b>
        <span>{selected.policyNumber}</span>
        <b>Limit</b>
        <span>{selected.limit}</span>
        <b>Coverage period</b>
        <span>365 days from today</span>
      </div>

      {alreadyVaulted && (
        <div className="ss-note">
          A {selected.label.toLowerCase()} policy is already vaulted.
          Vaulting will update the existing record with the newer PDF.
        </div>
      )}

      <button type="button" className="ss-button" onClick={() => onVault(selected)}>
        <Lock size={16} />
        {alreadyVaulted ? "Update vaulted policy" : "Vault verified policy"}
      </button>
    </Modal>
  );
}
