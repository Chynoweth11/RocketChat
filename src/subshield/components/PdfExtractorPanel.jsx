import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Database,
  Download,
  FileJson,
  FileSearch,
  FileText,
  Rows3,
  ScanText,
  Table2,
  Trash2,
  Upload,
} from "lucide-react";
import { extractPdfFile, makeFailedExtraction } from "../pdfExtraction.js";
import { formatShortDate } from "../utils.js";
import { Info, Section, Spinner } from "./Layout.jsx";

const TABS = [
  { id: "fields", label: "Data", icon: Database },
  { id: "text", label: "Text", icon: FileText },
  { id: "tables", label: "Tables", icon: Table2 },
  { id: "metadata", label: "Metadata", icon: Rows3 },
];

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
    "Document Type",
    "Pages",
    "Words",
    "Carrier",
    "Policy Number",
    "Insured",
    "Premium",
    "Expiration Date",
    "Extracted At",
  ];
  const rows = extractions.map((item) => [
    item.fileName,
    item.status,
    item.docTypeLabel || item.docType,
    item.pages,
    item.words,
    item.fields?.carrier,
    item.fields?.policyNumber,
    item.fields?.insuredName,
    item.fields?.premium,
    item.fields?.expirationDate,
    item.extractedAt,
  ]);

  return [headers, ...rows]
    .map((row) => row.map((cell) => csvEscape(cell)).join(","))
    .join("\n");
}

function statusClass(status) {
  if (status === "extracted") return "success";
  if (status === "needs_ocr") return "warning";
  return "danger";
}

export default function PdfExtractorPanel({
  extractions = [],
  onExtracted,
  onDeleteExtraction,
}) {
  const inputRef = useRef(null);
  const [activeId, setActiveId] = useState("");
  const [activeTab, setActiveTab] = useState("fields");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, fileName: "" });
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
  const totalFields = sorted.reduce(
    (sum, item) => sum + Object.keys(item.fields || {}).length,
    0
  );
  const readableCount = sorted.filter((item) => item.status === "extracted").length;
  const needsOcrCount = sorted.filter((item) => item.status === "needs_ocr").length;
  const totalWords = sorted.reduce((sum, item) => sum + (item.words || 0), 0);

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
      try {
        results.push(await extractPdfFile(file));
      } catch (err) {
        results.push(makeFailedExtraction(file, err));
      }
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
      <section className="ss-card ss-span">
        <Section
          title="PDF Extraction Studio"
          sub="Upload one PDF or a whole batch. The app reads embedded text, metadata, fields, table-like rows, and stores the results locally."
          extra={
            <button
              type="button"
              className="ss-button"
              onClick={() => inputRef.current?.click()}
              disabled={isProcessing}
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
            <h3>{isProcessing ? "Scanning PDFs..." : "Drop PDFs here to extract data"}</h3>
            <p>
              Browser-based extraction works best on digital PDFs. Image-only scans are
              flagged for OCR.
            </p>
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
          <Info label="Readable PDFs" value={readableCount} />
          <Info label="Fields found" value={totalFields} />
          <Info label="Words extracted" value={totalWords.toLocaleString()} />
        </div>

        {needsOcrCount > 0 && (
          <div className="ss-note warning">
            <AlertTriangle size={16} />
            <span>
              {needsOcrCount} file{needsOcrCount === 1 ? "" : "s"} look image-only.
              Add OCR later for scanned paper PDFs.
            </span>
          </div>
        )}
      </section>

      {sorted.length > 0 && (
        <section className="ss-card ss-span">
          <Section
            title="Extraction Results"
            sub="Review each PDF, export the raw text, or download structured JSON and CSV."
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
                      {formatBytes(item.fileSize)} - {formatShortDate(item.extractedAt)}
                    </small>
                  </span>
                  <em className={`ss-status ${statusClass(item.status)}`}>
                    {item.status === "needs_ocr" ? "Needs OCR" : item.status}
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
                      {selected.words.toLocaleString()} words - {selected.characters.toLocaleString()} characters - {selected.confidence}% type confidence
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ss-mini-btn"
                    onClick={() => onDeleteExtraction(selected.id)}
                    aria-label={`Delete extraction for ${selected.fileName}`}
                    title="Delete extraction"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {selected.warnings?.length > 0 && (
                  <div className={`ss-note ${selected.status === "failed" ? "danger" : "warning"}`}>
                    <AlertTriangle size={16} />
                    <span>{selected.warnings.join(" ")}</span>
                  </div>
                )}

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
                  <div className="ss-pdf-kv">
                    {fieldRows.length === 0 ? (
                      <div className="ss-empty compact">
                        <Database size={24} />
                        <h2>No structured fields found</h2>
                        <p>Raw text is still available in the Text tab.</p>
                      </div>
                    ) : (
                      fieldRows.map(([key, value]) => (
                        <div key={key} className="ss-pdf-kv-row">
                          <b>{key.replace(/([A-Z])/g, " $1")}</b>
                          <span>{formatValue(value)}</span>
                        </div>
                      ))
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
                        <p>Tables with visible text columns will appear here.</p>
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
                          <b>{key.replace(/([A-Z])/g, " $1")}</b>
                          <span>{formatValue(value)}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
