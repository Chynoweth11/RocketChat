import { useMemo, useState } from "react";
import {
  FileBadge,
  FileCheck2,
  FileSignature,
  FileSpreadsheet,
  FileText,
  MoreHorizontal,
  ScrollText,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { Section, Info } from "./Layout.jsx";
import { documentTypeLabel, formatShortDate, policyLabelFromType } from "../utils.js";
import PdfExtractorPanel from "./PdfExtractorPanel.jsx";

function displayDocument(doc) {
  const legacyInvoice = doc.docType === "invoice" || /invoice/i.test(doc.name || "");
  if (!legacyInvoice) {
    return {
      name: doc.name,
      typeLabel: documentTypeLabel(doc.docType),
    };
  }
  return {
    name: "SubShield compliance record | SUB-2026-004",
    typeLabel: "Compliance File",
  };
}

function exportDocumentsCsv(documents) {
  const header = ["Name", "Type", "Carrier", "Status", "Size (KB)", "Uploaded"];
  const rows = documents.map((doc) => {
    const display = displayDocument(doc);
    return [
      display.name,
      display.typeLabel,
      doc.carrier || "",
      doc.status,
      doc.sizeKb || "",
      formatShortDate(doc.uploadedAt),
    ].map((cell) => `"${String(cell).replace(/"/g, '""')}"`);
  });
  const csv = [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "documents.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const TYPE_ICONS = {
  declaration: ScrollText,
  certificate: FileCheck2,
  endorsement: FileSignature,
  quote: FileBadge,
  policy: FileText,
};

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "verified", label: "Verified" },
  { id: "pending", label: "Needs review" },
];

const GROUP_BY = [
  { id: "policy", label: "Policy type" },
  { id: "carrier", label: "Carrier" },
  { id: "type", label: "Document type" },
];

// Preferred ordering when grouping by policy type.
const POLICY_GROUP_ORDER = [
  "Workers' Compensation",
  "General Liability",
  "Commercial Auto",
  "Umbrella / Excess Liability",
  "Commercial Property",
  "Cyber Liability",
  "Equipment / Inland Marine",
  "Builder's Risk",
  "Surety Bonding",
  "Trade License",
  "COI Packages",
  "Quotes",
  "Other documents",
];

function policyGroupKey(doc, policyById) {
  if (doc.docType === "quote") return "Quotes";
  const policy = doc.policyId ? policyById.get(doc.policyId) : null;
  const policyType = doc.policyType || policy?.policyType || policy?.type;
  if (policyType) return policyLabelFromType(policyType);
  if (doc.docType === "certificate") return "COI Packages";
  return "Other documents";
}

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
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupBy, setGroupBy] = useState("policy");

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
      const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
      const matchesQuery =
        !q ||
        doc.name.toLowerCase().includes(q) ||
        (doc.carrier || "").toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [sorted, query, statusFilter]);

  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach((doc) => {
      const key =
        groupBy === "carrier"
          ? doc.carrier || "No carrier"
          : groupBy === "type"
          ? documentTypeLabel(doc.docType)
          : policyGroupKey(doc, policyById);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(doc);
    });
    const entries = [...map.entries()];
    entries.sort((a, b) => {
      if (groupBy === "policy") {
        const ra = POLICY_GROUP_ORDER.indexOf(a[0]);
        const rb = POLICY_GROUP_ORDER.indexOf(b[0]);
        return (ra === -1 ? 999 : ra) - (rb === -1 ? 999 : rb) || a[0].localeCompare(b[0]);
      }
      const aLast = /^(No carrier|Other)/.test(a[0]) ? 1 : 0;
      const bLast = /^(No carrier|Other)/.test(b[0]) ? 1 : 0;
      return aLast - bLast || a[0].localeCompare(b[0]);
    });
    return entries;
  }, [filtered, groupBy, policyById]);

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
          sub="Every declaration, certificate, endorsement, and quote in one organized place."
          extra={
            <div style={{ display: "flex", gap: 8 }}>
              {documents.length > 0 && (
                <button
                  type="button"
                  className="ss-button soft ss-button-sm"
                  onClick={() => exportDocumentsCsv(documents)}
                  title="Export document list as CSV"
                >
                  <FileSpreadsheet size={14} /> Export
                </button>
              )}
              <button type="button" className="ss-button" onClick={onUpload}>
                <Upload size={15} /> Upload document
              </button>
            </div>
          }
        />
        <div className="ss-command-metrics">
          <Info label="Total documents" value={documents.length} />
          <Info label="Verified" value={verified} />
          <Info label="Needs review" value={pending} />
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
            <div className="ss-dx-toolbar">
              <div className="ss-chip-group" style={{ marginBottom: 0 }}>
                {STATUS_FILTERS.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`ss-chip ${statusFilter === item.id ? "active" : ""}`}
                    aria-pressed={statusFilter === item.id}
                    onClick={() => setStatusFilter(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="ss-dx-groupby">
                <span>Group by</span>
                <div className="ss-seg" role="group" aria-label="Group documents by">
                  {GROUP_BY.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className={`ss-seg-btn ${groupBy === item.id ? "active" : ""}`}
                      aria-pressed={groupBy === item.id}
                      onClick={() => setGroupBy(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {documents.length === 0 && (
          <div className="ss-empty">
            <FileText size={32} />
            <h2>No documents yet</h2>
            <p>Upload your insurance paperwork and we'll keep it organized and searchable.</p>
            <button type="button" className="ss-button" onClick={onUpload}>
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

        {groups.map(([key, docs]) => (
          <div className="ss-dx-group" key={key}>
            <div className="ss-dx-group-head">
              <b>{key}</b>
              <small>
                {docs.length} file{docs.length === 1 ? "" : "s"}
              </small>
            </div>
            <div className="ss-dx-rows">
              {docs.map((doc) => {
                const Icon = TYPE_ICONS[doc.docType] || FileText;
                const policy = doc.policyId ? policyById.get(doc.policyId) : null;
                const display = displayDocument(doc);
                const verifiedDoc = doc.status === "verified";
                const meta = [doc.carrier, groupBy !== "type" ? display.typeLabel : null, policy?.name]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <div className="ss-dx-row" key={doc.id}>
                    <span className="ss-dx-icon" aria-hidden="true">
                      <Icon size={17} />
                    </span>
                    <div className="ss-dx-body">
                      <b>{display.name}</b>
                      <small>{meta}</small>
                    </div>
                    <span className="ss-dx-date">{formatShortDate(doc.uploadedAt)}</span>
                    <span className="ss-dx-size">{doc.sizeKb} KB</span>
                    <span className={`ss-dx-status ${verifiedDoc ? "ok" : "pending"}`}>
                      <span className="ss-dx-dot" aria-hidden="true" />
                      {verifiedDoc ? "Verified" : "Needs review"}
                    </span>
                    <RowMenu onDelete={() => onDelete(doc.id)} name={display.name} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function RowMenu({ onDelete, name }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ss-dx-menu">
      <button
        type="button"
        className="ss-dx-menu-btn"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`More options for ${name}`}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <>
          <div className="ss-dx-menu-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="ss-dx-menu-pop" role="menu">
            <button
              type="button"
              role="menuitem"
              className="ss-dx-menu-item danger"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              <Trash2 size={14} /> Delete document
            </button>
          </div>
        </>
      )}
    </div>
  );
}
