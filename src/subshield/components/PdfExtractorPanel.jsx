import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Database,
  Eye,
  FileSearch,
  FileText,
  Save,
  ScanText,
  Trash2,
  Upload,
} from "lucide-react";
import {
  extractPdfFile,
  makeFailedExtraction,
  ocrPdfFile,
} from "../pdfExtraction.js";
import { Info, Section, Spinner } from "./Layout.jsx";

// ACORD certificate fields, mapped from their correct sections.
const ACORD_FIELDS = [
  { key: "carrier", label: "Carrier (Insurer A)" },
  { key: "naic", label: "NAIC #" },
  { key: "insuredName", label: "Named insured" },
  { key: "certificateHolder", label: "Certificate holder" },
  { key: "policyNumber", label: "Policy number" },
  { key: "effectiveDate", label: "Policy effective" },
  { key: "expirationDate", label: "Policy expiration" },
  { key: "certificateDate", label: "Certificate date" },
  { key: "producer", label: "Producer / broker" },
  { key: "producerPhone", label: "Producer phone" },
];

// Generic fields for declarations / quotes / other documents.
const GENERIC_FIELDS = [
  { key: "carrier", label: "Carrier" },
  { key: "policyNumber", label: "Policy number" },
  { key: "insuredName", label: "Named insured" },
  { key: "effectiveDate", label: "Effective date" },
  { key: "expirationDate", label: "Expiration date" },
  { key: "premium", label: "Premium / amount" },
  { key: "deductible", label: "Deductible" },
  { key: "coverageLimit", label: "Coverage limit" },
  { key: "invoiceNumber", label: "Invoice number" },
];

const ACORD_FIELD_GROUPS = [
  { id: "policy", title: "Policy information", keys: ["carrier", "naic", "policyNumber"] },
  {
    id: "parties",
    title: "Parties",
    keys: ["insuredName", "certificateHolder", "producer", "producerPhone"],
  },
  { id: "dates", title: "Dates", keys: ["effectiveDate", "expirationDate", "certificateDate"] },
];

const GENERIC_FIELD_GROUPS = [
  {
    id: "policy",
    title: "Policy information",
    keys: ["carrier", "policyNumber", "premium", "deductible", "coverageLimit", "invoiceNumber"],
  },
  { id: "parties", title: "Parties", keys: ["insuredName"] },
  { id: "dates", title: "Dates", keys: ["effectiveDate", "expirationDate"] },
];

// Every key the editor manages, so address/array extras still route to the
// "Additional extracted data" section instead of duplicating.
const ALL_REVIEW_KEYS = new Set(
  [...ACORD_FIELDS, ...GENERIC_FIELDS].map((field) => field.key)
);

function formatBytes(bytes = 0) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function safeFileName(name = "pdf-extraction") {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function fieldDefsFor(item) {
  return item?.docKind === "acord25" ? ACORD_FIELDS : GENERIC_FIELDS;
}

function fieldGroupsFor(item) {
  const fieldsByKey = new Map(fieldDefsFor(item).map((field) => [field.key, field]));
  const groups = item?.docKind === "acord25" ? ACORD_FIELD_GROUPS : GENERIC_FIELD_GROUPS;

  return groups
    .map((group) => ({
      ...group,
      fields: group.keys.map((key) => fieldsByKey.get(key)).filter(Boolean),
    }))
    .filter((group) => group.fields.length > 0);
}

function Disclosure({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`ss-coi-disclosure${open ? " open" : ""}`}>
      <div className="ss-coi-disclosure-head">
        <button
          type="button"
          className="ss-coi-disclosure-toggle"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          <span>{title}</span>
        </button>
      </div>
      {open && <div className="ss-coi-disclosure-body">{children}</div>}
    </div>
  );
}

function humanizeKey(key = "") {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function formatValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value || "");
}

function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = formatValue(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function buildCsv(extractions) {
  // One row per coverage limit so every amount is exported, not just one.
  const headers = [
    "File",
    "Document Type",
    "Carrier",
    "NAIC",
    "Named Insured",
    "Certificate Holder",
    "Certificate Date",
    "Coverage Type",
    "Limit",
    "Amount",
    "Effective Date",
    "Expiration Date",
    "Policy Number",
  ];

  const rows = [];
  extractions.forEach((item) => {
    const f = item.fields || {};
    const base = [
      item.fileName,
      item.docTypeLabel || item.docType,
      f.carrier,
      f.naic,
      f.insuredName,
      f.certificateHolder,
      f.certificateDate,
    ];

    if (item.coverages?.length) {
      item.coverages.forEach((cov) => {
        const limits = cov.limits?.length ? cov.limits : [{ name: "", amount: "" }];
        limits.forEach((limit) => {
          rows.push([
            ...base,
            cov.type,
            limit.name,
            limit.amount,
            cov.effectiveDate,
            cov.expirationDate,
            cov.policyNumber,
          ]);
        });
      });
    } else {
      rows.push([...base, "", f.coverageLimit, f.premium, f.effectiveDate, f.expirationDate, f.policyNumber]);
    }
  });

  return [headers, ...rows]
    .map((row) => row.map((cell) => csvEscape(cell)).join(","))
    .join("\n");
}

function statusClass(status) {
  if (["extracted", "ocr_extracted"].includes(status)) return "success";
  if (status === "needs_ocr") return "warning";
  return "danger";
}

function statusLabel(status) {
  if (status === "ocr_extracted") return "OCR extracted";
  if (status === "needs_ocr") return "Needs OCR";
  return status || "unknown";
}

function confidenceLabel(value) {
  if (!value) return "Needs review";
  if (value >= 95) return "Reviewed";
  if (value >= 80) return "High";
  if (value >= 60) return "Medium";
  return "Low";
}

function confidenceTone(value) {
  if (!value) return "needs";
  if (value >= 80) return "ok";
  if (value >= 60) return "mid";
  return "low";
}

function buildText(item) {
  const f = item.fields || {};
  const lines = [
    item.title || item.fileName,
    `File: ${item.fileName}`,
    `Document type: ${item.docTypeLabel || item.docType}`,
    "",
  ];
  lines.push("FIELDS");
  [
    ["Certificate date", "certificateDate"],
    ["Carrier (Insurer A)", "carrier"],
    ["NAIC", "naic"],
    ["Named insured", "insuredName"],
    ["Insured address", "insuredAddress"],
    ["Certificate holder", "certificateHolder"],
    ["Holder address", "holderAddress"],
    ["Producer", "producer"],
    ["Producer phone", "producerPhone"],
    ["Policy number", "policyNumber"],
    ["Policy effective", "effectiveDate"],
    ["Policy expiration", "expirationDate"],
    ["Premium", "premium"],
    ["Deductible", "deductible"],
  ].forEach(([label, key]) => {
    if (f[key]) lines.push(`  ${label}: ${formatValue(f[key])}`);
  });

  if (item.coverages?.length) {
    lines.push("", "COVERAGES");
    item.coverages.forEach((cov) => {
      lines.push(
        `  ${cov.type}  (Policy ${cov.policyNumber || "—"}, ${cov.effectiveDate || "—"} to ${
          cov.expirationDate || "—"
        })`
      );
      cov.limits.forEach((limit) => lines.push(`    - ${limit.name}: ${limit.amount}`));
    });
  }

  if (item.missingCoverages?.length) {
    lines.push("", "MISSING / NOT FOUND");
    item.missingCoverages.forEach((name) => lines.push(`  - ${name}: Not found`));
  }

  lines.push("", "RAW TEXT", item.text || "");
  return lines.join("\n");
}

export default function PdfExtractorPanel({
  extractions = [],
  onExtracted,
  onUpdateExtraction,
  onDeleteExtraction,
}) {
  const inputRef = useRef(null);
  const fileByIdRef = useRef(new Map());
  const previewUrlsRef = useRef({});
  const [previewUrls, setPreviewUrls] = useState({});
  const [activeId, setActiveId] = useState("");
  const [activeTab, setActiveTab] = useState("fields");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, fileName: "" });
  const [ocrState, setOcrState] = useState(null);
  const [reviewFields, setReviewFields] = useState({});
  const [reviewDirty, setReviewDirty] = useState(false);
  const [error, setError] = useState("");

  const sorted = useMemo(
    () =>
      [...extractions].sort(
        (a, b) => new Date(b.extractedAt) - new Date(a.extractedAt)
      ),
    [extractions]
  );
  const selected = sorted.find((item) => item.id === activeId) || sorted[0] || null;
  const fieldRows = selected?.fields ? Object.entries(selected.fields) : [];
  const additionalRows = fieldRows.filter(([key]) => !ALL_REVIEW_KEYS.has(key));
  const reviewFieldGroups = selected ? fieldGroupsFor(selected) : [];
  const selectedPreviewUrl = selected ? previewUrls[selected.id] : "";
  const selectedFile = selected ? fileByIdRef.current.get(selected.id) : null;
  const selectedOcrRunning = ocrState?.id === selected?.id;
  const totalFields = sorted.reduce(
    (sum, item) => sum + Object.keys(item.fields || {}).length,
    0
  );
  const readableCount = sorted.filter((item) =>
    ["extracted", "ocr_extracted"].includes(item.status)
  ).length;
  const needsOcrCount = sorted.filter((item) => item.status === "needs_ocr").length;
  const reviewedCount = sorted.filter((item) => item.reviewedAt).length;

  useEffect(() => {
    return () => {
      Object.values(previewUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (!selected) {
      setReviewFields({});
      setReviewDirty(false);
      return;
    }

    const fields = selected.fields || {};
    setReviewFields(
      Object.fromEntries(
        fieldDefsFor(selected).map((field) => [field.key, formatValue(fields[field.key])])
      )
    );
    setReviewDirty(false);
  }, [selected]);

  function rememberPreview(result, file) {
    const url = URL.createObjectURL(file);
    fileByIdRef.current.set(result.id, file);
    previewUrlsRef.current = {
      ...previewUrlsRef.current,
      [result.id]: url,
    };
    setPreviewUrls({ ...previewUrlsRef.current });
  }

  async function processFiles(fileList) {
    const files = Array.from(fileList || []).filter(
      (file) =>
        file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    );

    if (!files.length) {
      setError("Choose at least one PDF file.");
      return;
    }

    setError("");
    setIsProcessing(true);
    setProgress({ done: 0, total: files.length, fileName: files[0].name });

    const results = [];
    for (const [index, file] of files.entries()) {
      setProgress({ done: index, total: files.length, fileName: file.name });
      let result;
      try {
        result = await extractPdfFile(file);
      } catch (err) {
        result = makeFailedExtraction(file, err);
      }
      results.push(result);
      rememberPreview(result, file);
      setProgress({ done: index + 1, total: files.length, fileName: file.name });
    }

    onExtracted(results);
    setActiveId(results[0]?.id || "");
    setActiveTab("fields");
    setIsProcessing(false);
    setProgress({ done: 0, total: 0, fileName: "" });

    if (inputRef.current) inputRef.current.value = "";
  }

  function onDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    processFiles(event.dataTransfer.files);
  }

  async function runOcr() {
    if (!selected || !selectedFile) {
      setError("Re-upload this PDF to run OCR in this session.");
      return;
    }

    setError("");
    setOcrState({
      id: selected.id,
      label: "Preparing OCR",
      percent: 0,
    });

    try {
      const result = await ocrPdfFile(selectedFile, (message) => {
        const totalPages = message.totalPages || selected.pages || 1;
        const pageNumber = message.pageNumber || 1;
        const pageBase = (pageNumber - 1) / totalPages;
        const pageProgress =
          message.phase === "recognizing" ? Number(message.progress || 0) / totalPages : 0;
        const percent = Math.max(
          0,
          Math.min(99, Math.round((pageBase + pageProgress) * 100))
        );

        setOcrState({
          id: selected.id,
          label:
            message.status === "recognizing text"
              ? "Reading page"
              : humanizeKey(message.status || "Running OCR"),
          percent,
          pageNumber,
          totalPages,
        });
      });

      onUpdateExtraction(selected.id, {
        ...result,
        id: selected.id,
        fileName: selected.fileName,
        fileSize: selected.fileSize,
        extractedAt: selected.extractedAt,
        ocrAt: new Date().toISOString(),
      });
      setActiveTab("fields");
    } catch (err) {
      setError(err?.message || "OCR could not finish for this PDF.");
    } finally {
      setOcrState(null);
    }
  }

  function updateReviewField(key, value) {
    setReviewFields((current) => ({ ...current, [key]: value }));
    setReviewDirty(true);
  }

  function saveReviewedFields() {
    if (!selected) return;

    const nextFields = Object.fromEntries(
      Object.entries(selected.fields || {}).filter(([key]) => !ALL_REVIEW_KEYS.has(key))
    );
    const nextConfidence = { ...(selected.fieldConfidence || {}) };

    fieldDefsFor(selected).forEach((field) => {
      const value = String(reviewFields[field.key] || "").trim();
      if (!value) {
        delete nextFields[field.key];
        delete nextConfidence[field.key];
        return;
      }
      nextFields[field.key] = value;
      nextConfidence[field.key] = 98;
    });

    onUpdateExtraction(selected.id, {
      fields: nextFields,
      fieldConfidence: nextConfidence,
      reviewedAt: new Date().toISOString(),
    });
    setReviewDirty(false);
  }

  function deleteSelectedExtraction(id) {
    const url = previewUrlsRef.current[id];
    if (url) URL.revokeObjectURL(url);
    delete previewUrlsRef.current[id];
    fileByIdRef.current.delete(id);
    setPreviewUrls({ ...previewUrlsRef.current });
    onDeleteExtraction(id);
  }

  function exportSelectedJson() {
    if (!selected) return;
    downloadBlob(
      `${safeFileName(selected.fileName)}-extraction.json`,
      JSON.stringify(selected, null, 2),
      "application/json"
    );
  }

  function exportSelectedText() {
    if (!selected) return;
    downloadBlob(
      `${safeFileName(selected.fileName)}-extraction.txt`,
      buildText(selected),
      "text/plain;charset=utf-8"
    );
  }

  function exportAllCsv() {
    if (!sorted.length) return;
    downloadBlob(
      "pdf-extractions.csv",
      buildCsv(sorted),
      "text/csv;charset=utf-8"
    );
  }

  return (
    <>
      <section className={`ss-card ss-span ss-pdf-intake-card${sorted.length ? " has-results" : ""}`}>
        <Section
          title="PDF Extraction Studio"
          sub="Scan, OCR, review, and export insurance document data."
          extra={
            <button
              type="button"
              className="ss-button"
              onClick={() => inputRef.current?.click()}
              disabled={isProcessing || Boolean(ocrState)}
            >
              {isProcessing ? <Spinner /> : <Upload size={15} />}
              Choose PDFs
            </button>
          }
        />

        <input
          ref={inputRef}
          className="ss-file-input"
          type="file"
          accept="application/pdf,.pdf"
          multiple
          onChange={(event) => processFiles(event.target.files)}
        />

        <div
          className={`ss-pdf-dropzone ${isDragging ? "active" : ""}`}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
        >
          <span className="ss-pdf-drop-icon" aria-hidden="true">
            <ScanText size={24} />
          </span>
          <div>
            <h3>{isProcessing ? "Scanning PDFs..." : "Drop PDFs here"}</h3>
            <p>Digital PDFs extract immediately. Scanned PDFs can run OCR after upload.</p>
          </div>
          {isProcessing ? (
            <div className="ss-pdf-progress" role="status" aria-live="polite">
              <span>
                {progress.done}/{progress.total}
              </span>
              <b>{progress.fileName}</b>
            </div>
          ) : (
            <button
              type="button"
              className="ss-button soft"
              onClick={() => inputRef.current?.click()}
              disabled={Boolean(ocrState)}
            >
              <FileSearch size={15} /> Select files
            </button>
          )}
        </div>

        {error && (
          <div className="ss-note danger">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="ss-pdf-metrics">
          <Info label="PDFs scanned" value={sorted.length} />
          <Info label="Readable" value={readableCount} />
          <Info label="Reviewed" value={reviewedCount} />
          <Info label="Fields found" value={totalFields} />
        </div>

        {needsOcrCount > 0 && (
          <div className="ss-note warning">
            <AlertTriangle size={16} />
            <span>
              {needsOcrCount} file{needsOcrCount === 1 ? "" : "s"} need OCR.
            </span>
          </div>
        )}
      </section>

      {sorted.length > 0 && (
        <section className="ss-card ss-span ss-pdf-results-card">
          <Section
            title="Review Queue"
            sub="Validate extracted data against the source PDF."
          />

          <div className={`ss-pdf-workspace${sorted.length === 1 ? " is-single" : ""}`}>
            <div className="ss-pdf-list" aria-label="Extracted PDFs">
              {sorted.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`ss-pdf-result ${selected?.id === item.id ? "active" : ""}`}
                  onClick={() => {
                    setActiveId(item.id);
                    setActiveTab("fields");
                  }}
                >
                  <span className="ss-doc-icon" aria-hidden="true">
                    <FileText size={17} />
                  </span>
                  <span className="ss-pdf-result-copy">
                    <b>{item.fileName}</b>
                    <small>
                      {item.pages} page{item.pages === 1 ? "" : "s"} -{" "}
                      {formatBytes(item.fileSize)} - {item.source || "embedded"}
                    </small>
                  </span>
                  <em className={`ss-status ${statusClass(item.status)}`}>
                    {statusLabel(item.status)}
                  </em>
                </button>
              ))}
            </div>

            {selected && (
              <div className="ss-pdf-detail">
                <div className="ss-pdf-detail-head">
                  <div>
                    <span className="ss-eyebrow">{selected.docTypeLabel}</span>
                    <h3>{selected.title || selected.fileName}</h3>
                  </div>
                  <div className="ss-pdf-detail-actions">
                    <button
                      type="button"
                      className="ss-mini-btn"
                      onClick={() => deleteSelectedExtraction(selected.id)}
                      aria-label={`Delete extraction for ${selected.fileName}`}
                      title="Delete extraction"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {selected.warnings?.length > 0 && (
                  <div className={`ss-note ${selected.status === "failed" ? "danger" : "warning"}`}>
                    <AlertTriangle size={16} />
                    <span>{selected.warnings.join(" ")}</span>
                  </div>
                )}

                {selected.status === "failed" && selected.errorDetail && (
                  <Disclosure title="Technical details">
                    <pre className="ss-pdf-error-detail">{selected.errorDetail}</pre>
                  </Disclosure>
                )}

                <div className="ss-pdf-review-shell">
                  <aside className="ss-pdf-preview-pane">
                    <div className="ss-pdf-pane-head">
                      <span>
                        <Eye size={14} /> Source PDF
                      </span>
                    </div>
                    {selectedPreviewUrl ? (
                      <iframe
                        className="ss-pdf-frame"
                        src={`${selectedPreviewUrl}#toolbar=0&navpanes=0`}
                        title={`Preview of ${selected.fileName}`}
                      />
                    ) : (
                      <div className="ss-pdf-preview-empty">
                        <FileText size={28} />
                        <b>Preview unavailable</b>
                        <span>Re-upload the PDF to preview or OCR it in this session.</span>
                      </div>
                    )}
                  </aside>

                  <div className="ss-pdf-review-pane">
                    {activeTab === "fields" && (
                      <div className="ss-pdf-field-editor">
                        <div className="ss-pdf-editor-head">
                          <b>Verified fields</b>
                          <button
                            type="button"
                            className="ss-button soft ss-button-sm"
                            onClick={saveReviewedFields}
                            disabled={!reviewDirty}
                          >
                            <Save size={14} /> Save
                          </button>
                        </div>
                        <div className="ss-pdf-field-groups">
                          {reviewFieldGroups.map((group) => (
                            <section
                              className={`ss-pdf-field-group ss-pdf-field-group--${group.id}`}
                              key={group.id}
                            >
                              <div className="ss-pdf-field-group-head">
                                <b>{group.title}</b>
                              </div>
                              <div className="ss-pdf-edit-grid">
                                {group.fields.map((field) => {
                                  const hasValue = Boolean(reviewFields[field.key]);
                                  const confidence =
                                    selected.fieldConfidence?.[field.key] || (hasValue ? 50 : 0);
                                  return (
                                    <label className="ss-pdf-edit-field" key={field.key}>
                                      <span>
                                        {field.label}
                                        <em className={`ss-conf ${confidenceTone(confidence)}`}>
                                          {confidenceLabel(confidence)}
                                        </em>
                                      </span>
                                      <input
                                        value={reviewFields[field.key] || ""}
                                        placeholder="Not found - review"
                                        onChange={(event) =>
                                          updateReviewField(field.key, event.target.value)
                                        }
                                      />
                                    </label>
                                  );
                                })}
                              </div>
                            </section>
                          ))}
                        </div>

                        {selected.coverages?.length > 0 && (
                          <div className="ss-cov-section">
                            <b>Coverage lines</b>
                            <div className="ss-cov-groups">
                              {selected.coverages.map((cov) => {
                                const term = [cov.effectiveDate, cov.expirationDate]
                                  .filter(Boolean)
                                  .join(" – ");
                                const meta = [
                                  cov.policyNumber ? `Policy ${cov.policyNumber}` : "",
                                  term,
                                ]
                                  .filter(Boolean)
                                  .join(" · ");
                                return (
                                  <div className="ss-cov-block" key={cov.type}>
                                    <div className="ss-cov-block-head">
                                      <b>{cov.type}</b>
                                      {meta && <small>{meta}</small>}
                                    </div>
                                    {cov.limits?.length ? (
                                      <dl className="ss-cov-limits">
                                        {cov.limits.map((limit, index) => (
                                          <div key={`${limit.name}-${index}`}>
                                            <dt>{limit.name}</dt>
                                            <dd>{limit.amount}</dd>
                                          </div>
                                        ))}
                                      </dl>
                                    ) : (
                                      <p className="ss-cov-nolimit">No limits detected on this document.</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {selected.missingCoverages?.length > 0 && (
                          <div className="ss-cov-missing">
                            <b>Not listed on this document</b>
                            <p className="ss-cov-missing-note">
                              These coverage types weren't found on this document. They may be
                              carried on a separate policy — this isn't a confirmation that coverage
                              is missing.
                            </p>
                            <div className="ss-cov-missing-list">
                              {selected.missingCoverages.map((name) => (
                                <span className="ss-cov-missing-item" key={name}>
                                  <AlertTriangle size={13} aria-hidden="true" /> {name}
                                  <em>Not on this document</em>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {additionalRows.length > 0 && (
                          <Disclosure title="Additional extracted data">
                            <div className="ss-pdf-kv">
                              {additionalRows.map(([key, value]) => (
                                <div key={key} className="ss-pdf-kv-row">
                                  <b>{humanizeKey(key)}</b>
                                  <span>{formatValue(value)}</span>
                                </div>
                              ))}
                            </div>
                          </Disclosure>
                        )}

                        {fieldRows.length === 0 && (
                          <div className="ss-empty compact">
                            <Database size={24} />
                            <h2>No structured fields found</h2>
                            <p>Re-upload a readable PDF to review its fields.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
