import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ClipboardCheck,
  Database,
  Download,
  Eye,
  FileJson,
  FileSearch,
  FileText,
  RefreshCcw,
  Rows3,
  Save,
  ScanText,
  Table2,
  Trash2,
  Upload,
} from "lucide-react";
import {
  extractPdfFile,
  makeFailedExtraction,
  ocrPdfFile,
} from "../pdfExtraction.js";
import { formatShortDate } from "../utils.js";
import { Info, Section, Spinner } from "./Layout.jsx";

const TABS = [
  { id: "fields", label: "Review", icon: ClipboardCheck },
  { id: "text", label: "Text", icon: FileText },
  { id: "tables", label: "Tables", icon: Table2 },
  { id: "metadata", label: "Metadata", icon: Rows3 },
];

const REVIEW_FIELDS = [
  { key: "carrier", label: "Carrier" },
  { key: "policyNumber", label: "Policy number" },
  { key: "insuredName", label: "Named insured" },
  { key: "certificateHolder", label: "Certificate holder" },
  { key: "effectiveDate", label: "Effective date" },
  { key: "expirationDate", label: "Expiration date" },
  { key: "premium", label: "Premium / amount" },
  { key: "deductible", label: "Deductible" },
  { key: "coverageLimit", label: "Coverage limit" },
  { key: "invoiceNumber", label: "Invoice number" },
];

const REVIEW_FIELD_KEYS = new Set(REVIEW_FIELDS.map((field) => field.key));

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
  const headers = [
    "File",
    "Status",
    "Source",
    "Document Type",
    "Pages",
    "Words",
    "Carrier",
    "Policy Number",
    "Insured",
    "Premium",
    "Expiration Date",
    "Reviewed At",
    "Extracted At",
  ];
  const rows = extractions.map((item) => [
    item.fileName,
    item.status,
    item.source || "embedded",
    item.docTypeLabel || item.docType,
    item.pages,
    item.words,
    item.fields?.carrier,
    item.fields?.policyNumber,
    item.fields?.insuredName,
    item.fields?.premium,
    item.fields?.expirationDate,
    item.reviewedAt,
    item.extractedAt,
  ]);

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
  if (!value) return "Empty";
  if (value >= 95) return "Reviewed";
  if (value >= 80) return "High";
  if (value >= 60) return "Medium";
  return "Low";
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
  const metadataRows = selected?.metadata ? Object.entries(selected.metadata) : [];
  const additionalRows = fieldRows.filter(([key]) => !REVIEW_FIELD_KEYS.has(key));
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
        REVIEW_FIELDS.map((field) => [field.key, formatValue(fields[field.key])])
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
      Object.entries(selected.fields || {}).filter(([key]) => !REVIEW_FIELD_KEYS.has(key))
    );
    const nextConfidence = { ...(selected.fieldConfidence || {}) };

    REVIEW_FIELDS.forEach((field) => {
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
      `${safeFileName(selected.fileName)}-text.txt`,
      selected.text || selected.warnings?.join("\n") || "",
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
      <section className="ss-card ss-span ss-pdf-intake-card">
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
            sub="Validate extracted data against the source PDF before exporting."
            extra={
              <div className="ss-pdf-actions">
                <button
                  type="button"
                  className="ss-button soft"
                  onClick={exportSelectedJson}
                  disabled={!selected}
                  title="Download selected result as JSON"
                >
                  <FileJson size={15} /> JSON
                </button>
                <button
                  type="button"
                  className="ss-button soft"
                  onClick={exportSelectedText}
                  disabled={!selected}
                  title="Download selected raw text"
                >
                  <Download size={15} /> Text
                </button>
                <button
                  type="button"
                  className="ss-button soft"
                  onClick={exportAllCsv}
                  title="Download all extraction summaries as CSV"
                >
                  <Download size={15} /> CSV
                </button>
              </div>
            }
          />

          <div className="ss-pdf-workspace">
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
                    <h3>{selected.fileName}</h3>
                    <p>
                      {selected.words.toLocaleString()} words - {selected.confidence}%
                      type confidence - {formatShortDate(selected.extractedAt)}
                    </p>
                  </div>
                  <div className="ss-pdf-detail-actions">
                    <button
                      type="button"
                      className="ss-button soft ss-button-sm"
                      onClick={runOcr}
                      disabled={!selectedFile || selectedOcrRunning || isProcessing}
                      title={
                        selectedFile
                          ? "Run OCR on this PDF"
                          : "Re-upload this PDF to run OCR"
                      }
                    >
                      {selectedOcrRunning ? <Spinner /> : <RefreshCcw size={14} />}
                      {selectedOcrRunning ? `${ocrState.percent}%` : "OCR"}
                    </button>
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

                {selectedOcrRunning && (
                  <div className="ss-pdf-ocr-progress" role="status" aria-live="polite">
                    <span style={{ width: `${ocrState.percent}%` }} />
                    <b>
                      {ocrState.label}
                      {ocrState.pageNumber
                        ? ` - page ${ocrState.pageNumber}/${ocrState.totalPages}`
                        : ""}
                    </b>
                  </div>
                )}

                {selected.warnings?.length > 0 && (
                  <div className={`ss-note ${selected.status === "failed" ? "danger" : "warning"}`}>
                    <AlertTriangle size={16} />
                    <span>{selected.warnings.join(" ")}</span>
                  </div>
                )}

                <div className="ss-pdf-review-shell">
                  <aside className="ss-pdf-preview-pane">
                    <div className="ss-pdf-pane-head">
                      <span>
                        <Eye size={14} /> Source PDF
                      </span>
                      <em className={`ss-status ${statusClass(selected.status)}`}>
                        {statusLabel(selected.status)}
                      </em>
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
                    <div className="ss-chip-group" role="tablist" aria-label="Extraction detail">
                      {TABS.map((tab) => {
                        const Icon = tab.icon;
                        return (
                          <button
                            type="button"
                            key={tab.id}
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            className={`ss-chip ${activeTab === tab.id ? "active" : ""}`}
                            onClick={() => setActiveTab(tab.id)}
                          >
                            <Icon size={14} /> {tab.label}
                          </button>
                        );
                      })}
                    </div>

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
                        <div className="ss-pdf-edit-grid">
                          {REVIEW_FIELDS.map((field) => {
                            const confidence =
                              selected.fieldConfidence?.[field.key] ||
                              (reviewFields[field.key] ? 50 : 0);
                            return (
                              <label className="ss-pdf-edit-field" key={field.key}>
                                <span>
                                  {field.label}
                                  <em>{confidenceLabel(confidence)}</em>
                                </span>
                                <input
                                  value={reviewFields[field.key] || ""}
                                  onChange={(event) =>
                                    updateReviewField(field.key, event.target.value)
                                  }
                                />
                              </label>
                            );
                          })}
                        </div>

                        {additionalRows.length > 0 && (
                          <div className="ss-pdf-extra-data">
                            <b>Additional extracted data</b>
                            <div className="ss-pdf-kv">
                              {additionalRows.map(([key, value]) => (
                                <div key={key} className="ss-pdf-kv-row">
                                  <b>{humanizeKey(key)}</b>
                                  <span>{formatValue(value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {fieldRows.length === 0 && (
                          <div className="ss-empty compact">
                            <Database size={24} />
                            <h2>No structured fields found</h2>
                            <p>Run OCR or review the raw text tab.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "text" && (
                      <pre className="ss-pdf-text">
                        {selected.text || "No embedded text was extracted from this PDF."}
                      </pre>
                    )}

                    {activeTab === "tables" && (
                      <div className="ss-pdf-tables">
                        {!selected.tables?.length ? (
                          <div className="ss-empty compact">
                            <Table2 size={24} />
                            <h2>No table-like rows detected</h2>
                            <p>Readable text columns appear here.</p>
                          </div>
                        ) : (
                          selected.tables.map((table) => (
                            <div className="ss-pdf-table" key={table.pageNumber}>
                              <b>Page {table.pageNumber}</b>
                              <div className="ss-pdf-table-scroll">
                                <table>
                                  <tbody>
                                    {table.rows.map((row, rowIndex) => (
                                      <tr key={`${table.pageNumber}-${rowIndex}`}>
                                        {row.map((cell, cellIndex) => (
                                          <td key={`${table.pageNumber}-${rowIndex}-${cellIndex}`}>
                                            {cell}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {activeTab === "metadata" && (
                      <div className="ss-pdf-kv">
                        {metadataRows.length === 0 ? (
                          <div className="ss-empty compact">
                            <Rows3 size={24} />
                            <h2>No metadata embedded</h2>
                            <p>This PDF did not expose title, author, producer, or dates.</p>
                          </div>
                        ) : (
                          metadataRows.map(([key, value]) => (
                            <div key={key} className="ss-pdf-kv-row">
                              <b>{humanizeKey(key)}</b>
                              <span>{formatValue(value)}</span>
                            </div>
                          ))
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
