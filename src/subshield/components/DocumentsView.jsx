import { useMemo, useState } from "react";
import {
  FileBadge,
  FileCheck2,
  FileSignature,
  FileText,
  ScrollText,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { Section, Info } from "./Layout.jsx";
import { documentTypeLabel, formatShortDate } from "../utils.js";
import PdfExtractorPanel from "./PdfExtractorPanel.jsx";

const TYPE_ICONS = {
  declaration: ScrollText,
  certificate: FileCheck2,
  endorsement: FileSignature,
  quote: FileBadge,
  policy: FileText,
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "declaration", label: "Declarations" },
  { id: "certificate", label: "Certificates" },
  { id: "endorsement", label: "Endorsements" },
  { id: "quote", label: "Quotes" },
];

export default function DocumentsView({
  documents,
  policies,
  extractions,
  onUpload,
  onDelete,
  onExtracted,
  onUpdateExtraction,
  onDeleteExtraction,
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const policyById = useMemo(
    () => new Map((policies || []).map((p) => [p.id, p])),
    [policies]
  );

  const sorted = useMemo(
    () => [...documents].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)),
    [documents]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter((doc) => {
      const matchesType = typeFilter === "all" || doc.docType === typeFilter;
      const matchesQuery =
        !q ||
        doc.name.toLowerCase().includes(q) ||
        (doc.carrier || "").toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [sorted, query, typeFilter]);

  const verified = documents.filter((doc) => doc.status === "verified").length;
  const pending = documents.filter((doc) => doc.status === "pending").length;
  const totalMb = (documents.reduce((sum, doc) => sum + (doc.sizeKb || 0), 0) / 1024).toFixed(1);

  return (
    <div className="ss-grid">
      <PdfExtractorPanel
        extractions={extractions}
        onExtracted={onExtracted}
        onUpdateExtraction={onUpdateExtraction}
        onDeleteExtraction={onDeleteExtraction}
      />

      <section className="ss-card ss-span">
        <Section
          title="Document Center"
          sub="Declarations, certificates, endorsements, extracted PDFs, renewal quotes, and compliance files in one organized place."
          extra={
            <button type="button" className="ss-button" onClick={onUpload}>
              <Upload size={15} /> Upload document
            </button>
          }
        />
        <div className="ss-command-metrics">
          <Info label="Total documents" value={documents.length} />
          <Info label="Verified" value={verified} />
          <Info label="Pending review" value={pending} />
          <Info label="Storage used" value={`${totalMb} MB`} />
        </div>
      </section>

      <section className="ss-card ss-span">
        {documents.length > 0 && (
          <>
            <div className="ss-search">
              <Search size={16} className="ss-search-icon" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by document name or carrier..."
                aria-label="Search documents"
              />
            </div>
            <div className="ss-chip-group">
              {FILTERS.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`ss-chip ${typeFilter === item.id ? "active" : ""}`}
                  onClick={() => setTypeFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </>
        )}

        {documents.length === 0 && (
          <div className="ss-empty">
            <FileText size={32} />
            <h2>No documents yet</h2>
            <p>Upload your insurance paperwork and we'll keep it organized and searchable.</p>
            <button className="ss-button" onClick={onUpload}>
              <Upload size={15} /> Upload first document
            </button>
          </div>
        )}

        {documents.length > 0 && filtered.length === 0 && (
          <div className="ss-empty" style={{ minHeight: 160 }}>
            <Search size={28} />
            <h2>No matching documents</h2>
            <p>Try a different filter or search term.</p>
          </div>
        )}

        {filtered.map((doc) => {
          const Icon = TYPE_ICONS[doc.docType] || FileText;
          const policy = doc.policyId ? policyById.get(doc.policyId) : null;
          return (
            <div className="ss-doc-row" key={doc.id}>
              <span className="ss-doc-icon" aria-hidden="true">
                <Icon size={18} />
              </span>
              <div className="ss-doc-row-body">
                <b>{doc.name}</b>
                <small>
                  {documentTypeLabel(doc.docType)}
                  {doc.carrier ? ` - ${doc.carrier}` : ""}
                  {policy ? ` - ${policy.name}` : ""}
                </small>
              </div>
              <div className="ss-doc-meta">
                <span className="ss-doc-size">
                  {doc.fileType} - {doc.sizeKb} KB
                </span>
                <span className="ss-doc-date">{formatShortDate(doc.uploadedAt)}</span>
              </div>
              <em className={`ss-status ${doc.status === "verified" ? "success" : "warning"}`}>
                {doc.status}
              </em>
              <button
                type="button"
                className="ss-mini-btn"
                onClick={() => onDelete(doc.id)}
                aria-label={`Delete ${doc.name}`}
                title="Delete document"
              >
                <Trash2 size={15} />
              </button>
            </div>
          );
        })}
      </section>
    </div>
  );
}
