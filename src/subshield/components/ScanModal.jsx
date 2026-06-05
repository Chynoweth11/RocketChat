import { useState } from "react";
import {
  BadgeCheck,
  Building2,
  FileSearch,
  FileText,
  HardHat,
  Lock,
  ShieldCheck,
  Truck,
  Umbrella,
  Upload,
} from "lucide-react";
import Modal from "./Modal.jsx";
import { dateFromToday } from "../utils.js";

const TYPES = [
  {
    id: "umbrella",
    label: "Umbrella",
    icon: Umbrella,
    name: "Umbrella / Excess Liability",
    carrier: "Hiscox Insurance Co.",
    policyNumber: "UM-7740921",
    daysRemaining: 318,
    premiumAmount: 980,
    coverageLimits: "$2M excess liability",
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
    premiumAmount: 1840,
    coverageLimits: "$2M aggregate / $1M occurrence",
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
    premiumAmount: 2460,
    coverageLimits: "$1M combined single limit",
    documents: ["Auto declarations page"],
  },
  {
    id: "property",
    label: "Property",
    icon: Building2,
    name: "Commercial Property",
    carrier: "Travelers",
    policyNumber: "CP-33910477",
    daysRemaining: 200,
    premiumAmount: 2150,
    coverageLimits: "$750k building / $250k contents",
    documents: ["Property declarations page"],
  },
  {
    id: "workers",
    label: "Workers' comp",
    icon: HardHat,
    name: "Workers' Compensation",
    carrier: "StateFund West",
    policyNumber: "WC-90183321",
    daysRemaining: 365,
    premiumAmount: 3210,
    coverageLimits: "Statutory / $1M employer liability",
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
    premiumAmount: 295,
    coverageLimits: "Tile contractor license",
    documents: ["Trade license"],
  },
];

export default function ScanModal({ onClose, onVault, existingTypes = [] }) {
  const [typeId, setTypeId] = useState("umbrella");
  const selected = TYPES.find((t) => t.id === typeId) || TYPES[0];
  const alreadyVaulted = existingTypes.includes(selected.id);

  const renewalDate = dateFromToday(selected.daysRemaining);

  return (
    <Modal
      title="Upload insurance document"
      subtitle="Read carrier paperwork, extract policy details, and file the verified document."
      onClose={onClose}
    >
      <div className="ss-upload-premium">
        <div className="ss-upload-drop">
          <span className="ss-upload-mark" aria-hidden="true">
            <Upload size={22} />
          </span>
          <div>
            <b>Drop a PDF or choose a carrier document</b>
            <p>Certificates, declarations pages, endorsements, and renewal quotes work best.</p>
          </div>
          <button type="button" className="ss-button soft" disabled>
            Preview mode
          </button>
        </div>

        <div className="ss-upload-checks">
          <span>
            <FileSearch size={14} /> Reads carrier, policy number, dates, and limits
          </span>
          <span>
            <ShieldCheck size={14} /> Detects additional insured and waiver language
          </span>
          <span>
            <BadgeCheck size={14} /> Files verified documents into the right policy
          </span>
        </div>
      </div>

      <div className="ss-modal-section-head">
        <span className="ss-field-label">Confirm detected policy type</span>
        <small>Simulation mode lets you preview the filing workflow.</small>
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

      <div className="ss-detected premium">
        <b>Carrier</b>
        <span>{selected.carrier}</span>
        <b>Policy number</b>
        <span>{selected.policyNumber}</span>
        <b>Limit</b>
        <span>{selected.coverageLimits}</span>
        <b>Renewal date</b>
        <span>{renewalDate}</span>
      </div>

      {alreadyVaulted && (
        <div className="ss-note">
          <Lock size={16} />
          <span>
            A {selected.label.toLowerCase()} policy is already on file. Saving will refresh
            the existing policy with this newer document.
          </span>
        </div>
      )}

      <footer className="ss-footer">
        <span className="ss-footer-info">Files are processed locally in this demo workspace.</span>
        <button
          type="button"
          className="ss-button"
          onClick={() =>
            onVault({
              ...selected,
              policyType: selected.id,
              type: selected.id,
              renewalDate,
              expirationDate: renewalDate,
              effectiveDate: dateFromToday(selected.daysRemaining - 365),
              premiumFrequency: "annual",
              status: "active",
              savingsStatus: selected.id === "license" ? "not_applicable" : "monitoring",
            })
          }
        >
          <Lock size={16} />
          {alreadyVaulted ? "Update policy on file" : "Save policy and document"}
        </button>
      </footer>
    </Modal>
  );
}
