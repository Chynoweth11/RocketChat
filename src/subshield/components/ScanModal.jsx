import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  FileSearch,
  FileText,
  Hash,
  Pencil,
  Plus,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import Modal from "./Modal.jsx";
import { extractPdfText, fileSizeKb, looksLikeScannedImage } from "../pdfText.js";
import { parseInsuranceDocument } from "../insuranceParser.js";
import {
  ENDORSEMENT_TYPES,
  daysUntil,
  formatLongDate,
  policyLabelFromType,
} from "../utils.js";

const SCAN_POLICY_TYPES = [
  "liability",
  "workers",
  "auto",
  "umbrella",
  "property",
  "cyber",
  "builders_risk",
  "professional",
  "bonding",
  "license",
];

const KIND_LABEL = {
  coi: "Certificate of Insurance (ACORD 25)",
  declaration: "Policy declarations page",
  policy: "Insurance policy document",
  unknown: "Insurance document",
};

let scanKeySeq = 0;

// Convert a freshly parsed candidate into the editable shape this modal drives.
function toEditable(candidate) {
  return {
    key: candidate.key || `scan-${candidate.policyType}-${(scanKeySeq += 1)}`,
    selected: candidate.selected !== false,
    policyType: candidate.policyType || "liability",
    carrier: candidate.carrier || "",
    policyNumber: candidate.policyNumber || "",
    effectiveDate: candidate.effectiveDate || "",
    expirationDate: candidate.expirationDate || "",
    coverageLimits: candidate.coverageLimits || "",
    deductible: candidate.deductible ?? "",
    premiumAmount: candidate.premiumAmount ?? "",
    endorsements: {
      additionalInsured: Boolean(candidate.endorsements?.additionalInsured),
      waiverOfSubrogation: Boolean(candidate.endorsements?.waiverOfSubrogation),
      primaryNonContributory: Boolean(candidate.endorsements?.primaryNonContributory),
    },
    confidence: candidate.confidence || {},
  };
}

function blankEditable(policyType = "liability") {
  return toEditable({
    key: `manual-${(scanKeySeq += 1)}`,
    policyType,
    confidence: { policyType: "high", carrier: "high", policyNumber: "high", dates: "high", limits: "high" },
  });
}

export default function ScanModal({ onClose, onSave, existingPolicies = [] }) {
  const [phase, setPhase] = useState("upload"); // upload | scanning | review | error
  const [statusText, setStatusText] = useState("");
  const [fileMeta, setFileMeta] = useState(null);
  const [result, setResult] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const runScan = useCallback(async (file) => {
    setFileMeta({ name: file.name, sizeKb: fileSizeKb(file), pageCount: 0 });
    setPhase("scanning");
    setError("");
    setStatusText("Reading your PDF…");
    try {
      const { text, pageCount } = await extractPdfText(file);
      if (!mounted.current) return;
      setFileMeta((meta) => ({ ...meta, pageCount }));

      if (looksLikeScannedImage(text)) {
        setError(
          "We couldn't find readable text in this PDF. It looks like a scan or photo. You can still enter the details by hand."
        );
        setPhase("error");
        return;
      }

      setStatusText("Detecting coverages, limits, and dates…");
      const parsed = parseInsuranceDocument(text);
      if (!mounted.current) return;

      if (!parsed.policies.length) {
        setError(
          "We read the file but couldn't recognize any insurance coverages. You can add the details manually."
        );
        setResult(parsed);
        setPhase("error");
        return;
      }

      setResult(parsed);
      setPolicies(parsed.policies.map(toEditable));
      setPhase("review");
    } catch (err) {
      if (!mounted.current) return;
      setError(err?.message || "Something went wrong reading this PDF.");
      setPhase("error");
    }
  }, []);

  const onFiles = useCallback(
    (files) => {
      const file = files?.[0];
      if (!file) return;
      const isPdf =
        file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");
      if (!isPdf) {
        setFileMeta({ name: file.name, sizeKb: fileSizeKb(file) });
        setError("That file isn't a PDF. Upload a PDF certificate or declarations page.");
        setPhase("error");
        return;
      }
      runScan(file);
    },
    [runScan]
  );

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    onFiles(event.dataTransfer?.files);
  };

  const updatePolicy = (key, patch) =>
    setPolicies((list) => list.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  const editField = (key, field, value) =>
    setPolicies((list) =>
      list.map((p) =>
        p.key === key
          ? { ...p, [field]: value, confidence: { ...p.confidence, [confidenceKey(field)]: "high" } }
          : p
      )
    );

  const removePolicy = (key) =>
    setPolicies((list) => list.filter((p) => p.key !== key));

  const addManual = () => setPolicies((list) => [...list, blankEditable()]);

  const startOver = () => {
    setPhase("upload");
    setResult(null);
    setPolicies([]);
    setError("");
    setFileMeta(null);
  };

  const selected = policies.filter((p) => p.selected);

  const handleSave = () => {
    if (!selected.length) return;
    onSave({
      documentMeta: {
        fileName: fileMeta?.name || "Scanned document.pdf",
        sizeKb: fileMeta?.sizeKb || 120,
        fileType: "PDF",
        pageCount: fileMeta?.pageCount || 1,
        kind: result?.kind || "policy",
      },
      namedInsured: result?.namedInsured || "",
      certificateHolder: result?.certificateHolder || "",
      policies: selected.map(toVaultPolicy),
    });
  };

  return (
    <Modal
      title="Upload & scan your insurance"
      subtitle="Drop a PDF certificate or declarations page. SubShield reads the carrier, policy number, limits, dates, and endorsements. Then you confirm."
      onClose={onClose}
      className={phase === "review" || phase === "error" ? "ss-modal--wide" : ""}
    >
      {phase === "upload" && (
        <Dropzone
          dragging={dragging}
          inputRef={inputRef}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onPick={() => inputRef.current?.click()}
          onChange={(e) => onFiles(e.target.files)}
        />
      )}

      {phase === "scanning" && <Scanning fileMeta={fileMeta} statusText={statusText} />}

      {phase === "error" && (
        <ErrorState
          fileMeta={fileMeta}
          error={error}
          onRetry={startOver}
          onManual={() => {
            setPolicies([blankEditable()]);
            setResult((prev) => prev || { kind: "policy", namedInsured: "", certificateHolder: "" });
            setPhase("review");
          }}
        />
      )}

      {phase === "review" && (
        <div className="ss-scan-review">
          <ScanSummary result={result} fileMeta={fileMeta} count={selected.length} />

          <div className="ss-scan-policies">
            {policies.map((policy) => (
              <PolicyEditor
                key={policy.key}
                policy={policy}
                existing={existingPolicies.find(
                  (item) => (item.policyType || item.type) === policy.policyType
                )}
                onToggle={() => updatePolicy(policy.key, { selected: !policy.selected })}
                onField={(field, value) => editField(policy.key, field, value)}
                onEndorsement={(endorsementKey, on) =>
                  updatePolicy(policy.key, {
                    endorsements: { ...policy.endorsements, [endorsementKey]: on },
                  })
                }
                onRemove={() => removePolicy(policy.key)}
                canRemove={policies.length > 1}
              />
            ))}
          </div>

          <button type="button" className="ss-button soft ss-scan-add" onClick={addManual}>
            <Plus size={15} /> Add another coverage manually
          </button>

          <footer className="ss-footer">
            <button type="button" className="ss-link-btn" onClick={startOver}>
              <RefreshCw size={14} /> Scan a different file
            </button>
            <button
              type="button"
              className="ss-button"
              onClick={handleSave}
              disabled={!selected.length}
            >
              <CheckCircle2 size={16} />
              {selected.length > 1
                ? `Save ${selected.length} policies & file`
                : "Save policy & file"}
            </button>
          </footer>
        </div>
      )}
    </Modal>
  );
}

function confidenceKey(field) {
  if (field === "effectiveDate" || field === "expirationDate") return "dates";
  if (field === "coverageLimits") return "limits";
  if (field === "carrier") return "carrier";
  if (field === "policyNumber") return "policyNumber";
  return field;
}

function toVaultPolicy(policy) {
  const deductible =
    policy.deductible === "" || policy.deductible === null
      ? null
      : Number(String(policy.deductible).replace(/[^\d.]/g, ""));
  const premiumAmount =
    policy.premiumAmount === "" || policy.premiumAmount === null
      ? 0
      : Number(String(policy.premiumAmount).replace(/[^\d.]/g, ""));
  return {
    policyType: policy.policyType,
    type: policy.policyType,
    name: policyLabelFromType(policy.policyType),
    carrier: policy.carrier.trim(),
    policyNumber: policy.policyNumber.trim(),
    coverageLimits: policy.coverageLimits.trim(),
    limit: policy.coverageLimits.trim(),
    effectiveDate: policy.effectiveDate || "",
    expirationDate: policy.expirationDate || "",
    renewalDate: policy.expirationDate || "",
    deductible,
    premiumAmount,
    premium: premiumAmount,
    endorsements: { ...policy.endorsements },
  };
}

/* ---------- Phase: upload ---------- */

function Dropzone({ dragging, inputRef, onDragOver, onDragLeave, onDrop, onPick, onChange }) {
  return (
    <div>
      <div
        className={`ss-dropzone${dragging ? " is-dragging" : ""}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onPick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onPick()}
        aria-label="Upload a PDF"
      >
        <span className="ss-dropzone-icon" aria-hidden="true">
          <Upload size={26} />
        </span>
        <b>Drop a PDF here, or click to choose</b>
        <small>Certificates of insurance (ACORD 25) and carrier declarations pages work best.</small>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="ss-dropzone-input"
          onChange={onChange}
        />
      </div>
      <ul className="ss-scan-points">
        <li>
          <ScanLine size={15} /> Reads carrier, policy number, limits, and dates
        </li>
        <li>
          <ShieldCheck size={15} /> Detects Additional Insured, Waiver, and Primary &amp; Non-Contributory
        </li>
        <li>
          <FileText size={15} /> Splits multi-policy certificates into separate policies
        </li>
      </ul>
      <p className="ss-scan-privacy">
        Your file is read in your browser. Nothing is uploaded to a server.
      </p>
    </div>
  );
}

/* ---------- Phase: scanning ---------- */

function Scanning({ fileMeta, statusText }) {
  return (
    <div className="ss-scan-loading">
      <span className="ss-scan-radar" aria-hidden="true">
        <FileSearch size={30} />
      </span>
      <b>{statusText || "Scanning…"}</b>
      {fileMeta?.name && (
        <small className="ss-muted">
          {fileMeta.name}
          {fileMeta.sizeKb ? ` · ${fileMeta.sizeKb} KB` : ""}
        </small>
      )}
      <div className="ss-scan-bar" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}

/* ---------- Phase: error ---------- */

function ErrorState({ fileMeta, error, onRetry, onManual }) {
  return (
    <div className="ss-scan-error">
      <span className="ss-scan-error-icon" aria-hidden="true">
        <AlertTriangle size={26} />
      </span>
      <b>Couldn't auto-read this file</b>
      <p className="ss-muted">{error}</p>
      {fileMeta?.name && <small className="ss-muted">{fileMeta.name}</small>}
      <div className="ss-scan-error-actions">
        <button type="button" className="ss-button soft" onClick={onRetry}>
          <RefreshCw size={15} /> Choose another file
        </button>
        <button type="button" className="ss-button" onClick={onManual}>
          <Pencil size={15} /> Enter details manually
        </button>
      </div>
    </div>
  );
}

/* ---------- Phase: review ---------- */

function ScanSummary({ result, fileMeta, count }) {
  const pct = Math.round((result?.confidence || 0) * 100);
  const tone = pct >= 80 ? "ok" : pct >= 55 ? "med" : "low";
  return (
    <div className={`ss-scan-summary ${tone}`}>
      <div className="ss-scan-summary-head">
        <span className="ss-scan-summary-icon" aria-hidden="true">
          <CheckCircle2 size={18} />
        </span>
        <div>
          <b>
            {count} {count === 1 ? "policy" : "policies"} detected ·{" "}
            {KIND_LABEL[result?.kind] || KIND_LABEL.unknown}
          </b>
          <small className="ss-muted">
            {fileMeta?.name}
            {fileMeta?.pageCount ? ` · ${fileMeta.pageCount} page${fileMeta.pageCount !== 1 ? "s" : ""}` : ""}
            {" · "}
            {pct}% auto-read confidence
          </small>
        </div>
      </div>
      {(result?.namedInsured || result?.certificateHolder) && (
        <div className="ss-scan-summary-meta">
          {result.namedInsured && (
            <span>
              <b>Insured:</b> {result.namedInsured}
            </span>
          )}
          {result.certificateHolder && (
            <span>
              <b>Holder:</b> {result.certificateHolder}
            </span>
          )}
        </div>
      )}
      <p className="ss-scan-summary-note">
        Check the highlighted fields, then save. Anything you edit is marked confirmed.
      </p>
    </div>
  );
}

function ConfidenceDot({ level }) {
  const map = { high: "ok", med: "med", low: "low" };
  const label = { high: "High confidence", med: "Double-check this", low: "Please confirm" };
  const tone = map[level] || "low";
  return (
    <span
      className={`ss-conf-dot ${tone}`}
      title={label[level] || label.low}
      aria-label={label[level] || label.low}
    />
  );
}

function PolicyEditor({
  policy,
  existing,
  onToggle,
  onField,
  onEndorsement,
  onRemove,
  canRemove,
}) {
  const renews = policy.expirationDate ? daysUntil(policy.expirationDate) : null;
  const dateProblem =
    policy.effectiveDate &&
    policy.expirationDate &&
    policy.expirationDate <= policy.effectiveDate;

  return (
    <div className={`ss-policy-editor${policy.selected ? "" : " is-off"}`}>
      <div className="ss-policy-editor-head">
        <label className="ss-policy-editor-toggle">
          <input type="checkbox" checked={policy.selected} onChange={onToggle} />
          <span className="ss-policy-editor-title">
            {policyLabelFromType(policy.policyType)}
          </span>
        </label>
        {existing && (
          <span className="ss-policy-editor-existing" title={`Updates your existing ${existing.carrier} policy`}>
            <RefreshCw size={12} /> Updates existing
          </span>
        )}
        {canRemove && (
          <button
            type="button"
            className="ss-mini-btn"
            onClick={onRemove}
            aria-label="Remove this coverage"
            title="Remove this coverage"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <div className="ss-policy-editor-grid">
        <Field label="Coverage type">
          <select
            value={policy.policyType}
            onChange={(e) => onField("policyType", e.target.value)}
          >
            {SCAN_POLICY_TYPES.map((type) => (
              <option key={type} value={type}>
                {policyLabelFromType(type)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Carrier" icon={Building2} conf={policy.confidence.carrier}>
          <input
            value={policy.carrier}
            onChange={(e) => onField("carrier", e.target.value)}
            placeholder="Carrier name"
          />
        </Field>

        <Field label="Policy number" icon={Hash} conf={policy.confidence.policyNumber}>
          <input
            value={policy.policyNumber}
            onChange={(e) => onField("policyNumber", e.target.value)}
            placeholder="e.g. GL-44827193"
          />
        </Field>

        <Field label="Coverage limits" conf={policy.confidence.limits}>
          <input
            value={policy.coverageLimits}
            onChange={(e) => onField("coverageLimits", e.target.value)}
            placeholder="$2M aggregate / $1M occurrence"
          />
        </Field>

        <Field label="Effective date" icon={Calendar} conf={policy.confidence.dates}>
          <input
            type="date"
            value={policy.effectiveDate}
            onChange={(e) => onField("effectiveDate", e.target.value)}
          />
        </Field>

        <Field label="Expiration date" icon={Calendar} conf={policy.confidence.dates}>
          <input
            type="date"
            value={policy.expirationDate}
            onChange={(e) => onField("expirationDate", e.target.value)}
          />
        </Field>

        <Field label="Deductible (optional)">
          <input
            value={policy.deductible}
            onChange={(e) => onField("deductible", e.target.value)}
            placeholder="1000"
            inputMode="numeric"
          />
        </Field>

        <Field label="Annual premium (optional)">
          <input
            value={policy.premiumAmount}
            onChange={(e) => onField("premiumAmount", e.target.value)}
            placeholder="1840"
            inputMode="numeric"
          />
        </Field>
      </div>

      {policy.policyType !== "license" && (
        <div className="ss-policy-editor-endorsements">
          <span className="ss-policy-editor-endorsements-label">Endorsements on this policy</span>
          <div className="ss-endorsement-row">
            {ENDORSEMENT_TYPES.map((endorsement) => (
              <label key={endorsement.key} className="ss-endorsement-chip">
                <input
                  type="checkbox"
                  checked={Boolean(policy.endorsements[endorsement.key])}
                  onChange={(e) => onEndorsement(endorsement.key, e.target.checked)}
                />
                <span>{endorsement.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="ss-policy-editor-foot">
        {dateProblem ? (
          <span className="ss-policy-editor-warn">
            <AlertTriangle size={13} /> Expiration is on or before the effective date. Check the dates.
          </span>
        ) : renews !== null ? (
          <span className="ss-muted">
            Renews {formatLongDate(policy.expirationDate)}
            {renews >= 0 ? ` · ${renews} day${renews !== 1 ? "s" : ""} out` : " · expired"}
          </span>
        ) : (
          <span className="ss-muted">Add an expiration date to track renewals.</span>
        )}
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, conf, children }) {
  return (
    <label className="ss-field ss-scan-field">
      <span className="ss-field-label">
        {Icon && <Icon size={12} aria-hidden="true" />}
        {label}
        {conf && <ConfidenceDot level={conf} />}
      </span>
      {children}
    </label>
  );
}
