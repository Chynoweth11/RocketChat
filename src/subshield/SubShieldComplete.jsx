import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  countDocuments,
  dateFromToday,
  estimateSavings,
  formatMoney,
  getComplianceScore,
  getCoverageGaps,
  getMissingDocuments,
  getNextRecommendedAction,
  getOpenQuoteRequests,
  getPotentialSavings,
  getRealizedSavings,
  getRenewalReminders,
  getUpcomingRenewals,
  makeId,
  normalizeDocument,
  normalizePolicies,
  normalizePolicy,
  normalizeQuoteRequest,
  normalizeSavingsOpportunity,
  packagePolicies,
  policyLabelFromType,
  policyTypeFromLabel,
  readStoredData,
  savingsForOpportunity,
  totalTrackedPremium,
  writeStoredData,
} from "./utils.js";
import { initialData } from "./data.js";
import { sampleData } from "./sampleData.js";
import { Header, Sidebar } from "./components/Layout.jsx";
// Dashboard is the initial view, so it loads eagerly. Every other view and
// all modals are code-split with React.lazy so they download only when first
// opened - keeping the initial bundle small.
import DashboardView from "./components/DashboardView.jsx";
const PoliciesView = lazy(() => import("./components/PoliciesView.jsx"));
const SavingsView = lazy(() => import("./components/SavingsView.jsx"));
const CertificatesView = lazy(() => import("./components/CertificatesView.jsx"));
const DocumentsView = lazy(() => import("./components/DocumentsView.jsx"));
const SettingsView = lazy(() => import("./components/SettingsView.jsx"));
const ConnectionsView = lazy(() => import("./components/ConnectionsView.jsx"));
const SendModal = lazy(() => import("./components/SendModal.jsx"));
const ScanModal = lazy(() => import("./components/ScanModal.jsx"));
const SuccessModal = lazy(() => import("./components/SuccessModal.jsx"));
const AddGCModal = lazy(() => import("./components/AddGCModal.jsx"));
const EditHolderModal = lazy(() => import("./components/EditHolderModal.jsx"));
const AddPolicyModal = lazy(() => import("./components/AddPolicyModal.jsx"));
const AddBrokerModal = lazy(() => import("./components/AddBrokerModal.jsx"));
const QuoteRequestModal = lazy(() => import("./components/QuoteRequestModal.jsx"));
const CommandPalette = lazy(() => import("./components/CommandPalette.jsx"));
import "./styles.css";

// Lightweight placeholder shown while a lazily-loaded view chunk downloads.
function ViewLoading() {
  return (
    <div className="ss-view-loading" role="status" aria-live="polite">
      <span className="ss-view-spinner" aria-hidden="true" />
      <span>Loading…</span>
    </div>
  );
}

function prependActivity(activity, title, body) {
  return [
    {
      id: makeId("act"),
      title,
      body,
      time: "Just now",
      createdAt: new Date().toISOString(),
    },
    ...activity,
  ].slice(0, 60);
}

function normalizeProjectName(value) {
  return (value || "").trim().replace(/\s+/g, " ");
}

function normalizeProjects(projects = []) {
  const seen = new Set();
  const cleaned = [];
  projects.forEach((project) => {
    const normalized = normalizeProjectName(project);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    cleaned.push(normalized);
  });
  return cleaned;
}

function addProjectIfMissing(projects, project) {
  const normalized = normalizeProjectName(project);
  if (!normalized) return normalizeProjects(projects);
  const current = normalizeProjects(projects);
  const exists = current.some((item) => item.toLowerCase() === normalized.toLowerCase());
  return exists ? current : [normalized, ...current];
}

function patchOpportunity(opportunities, id, patch) {
  return opportunities.map((opportunity) =>
    opportunity.id === id
      ? { ...opportunity, ...patch, updatedAt: new Date().toISOString() }
      : opportunity
  );
}

// Document labels for a scanned policy: a declarations/certificate page plus a
// line per detected endorsement, so the COI package lists them and the
// compliance engine can infer coverage from the file names too.
function scannedDocumentLabels(raw) {
  const base = policyLabelFromType(raw.policyType);
  const labels = [`${base} ${raw.kind === "coi" ? "certificate" : "declarations page"}`];
  if (raw.endorsements?.additionalInsured) labels.push("Additional Insured");
  if (raw.endorsements?.waiverOfSubrogation) labels.push("Waiver of Subrogation");
  if (raw.endorsements?.primaryNonContributory) labels.push("Primary & Non-Contributory");
  return labels;
}

const COVERAGE_APPLICATION_STAGES = ["start", "coverage", "application", "quote", "purchase"];

// Representative annual premiums used when a connected provider retrieves a
// coverage line the user is not yet tracking (illustrative, editable later).
const CONNECT_PREMIUM = {
  workers: 3120,
  liability: 1840,
  auto: 2460,
  umbrella: 980,
  property: 2150,
  cyber: 1200,
  professional: 1600,
  epl: 1100,
  directors: 1400,
  crime: 700,
  pollution: 1300,
  builders_risk: 1500,
  equipment: 600,
  bonding: 900,
};

function defaultCoverageApplication(company, partners = []) {
  return {
    status: "draft",
    stage: "coverage",
    policyType: "workers",
    currentCarrier: "",
    renewalMonth: "",
    renewalYear: String(new Date().getFullYear()),
    tradeType: company?.tradeType || "",
    state: company?.state || "",
    contactEmail: company?.contactEmail || "",
    revenueRange: company?.revenueRange || "",
    employees: company?.employees || "",
    requestType: "renewal_review",
    certificateSupportType: "none",
    recurringCertificateEmails: true,
    preferredPartnerId: partners.find((item) => item.active)?.id || "",
    notes: "",
    updatedAt: new Date().toISOString(),
  };
}

function normalizeCoverageApplication(application, company, partners = []) {
  const base = defaultCoverageApplication(company, partners);
  const stage = COVERAGE_APPLICATION_STAGES.includes(application?.stage)
    ? application.stage
    : base.stage;
  return {
    ...base,
    ...(application || {}),
    stage,
    renewalYear: String(application?.renewalYear || base.renewalYear),
    recurringCertificateEmails:
      application?.recurringCertificateEmails ?? base.recurringCertificateEmails,
  };
}

function renewalDateFromMonthYear(monthName, yearValue) {
  if (!monthName || !yearValue) return "";
  const monthIndex = new Date(`${monthName} 1, ${yearValue}`).getMonth();
  if (!Number.isFinite(monthIndex)) return "";
  const renewal = new Date(Number(yearValue), monthIndex + 1, 0);
  return renewal.toISOString().slice(0, 10);
}

// The navigable top-level views, used to drive hash-based routing so views are
// deep-linkable, survive a refresh, and respond to the browser's back/forward.
const VIEWS = [
  "dashboard",
  "policies",
  "savings",
  "certificates",
  "documents",
  "connections",
  "settings",
];

function viewFromHash() {
  if (typeof window === "undefined") return "dashboard";
  const raw = window.location.hash.replace(/^#\/?/, "");
  return VIEWS.includes(raw) ? raw : "dashboard";
}

export default function SubShieldComplete() {
  const [data, setData] = useState(() => readStoredData(initialData));
  const [view, setView] = useState(viewFromHash);
  const [policyId, setPolicyId] = useState(() => data.policies[0]?.id || null);
  const [contractorId, setContractorId] = useState(
    () => data.contractors[0]?.id || null
  );
  const [project, setProject] = useState(
    () => data.contractors[0]?.projects[0] || ""
  );
  const [newProject, setNewProject] = useState("");
  const [modal, setModal] = useState(null);
  const [editingContractor, setEditingContractor] = useState(null);
  const [quoteDefaults, setQuoteDefaults] = useState({});
  const [addPolicyType, setAddPolicyType] = useState(null);
  const [lastSent, setLastSent] = useState(null);
  const [renewingId, setRenewingId] = useState(null);
  const [findingId, setFindingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [carrierConnections, setCarrierConnections] = useState(
    () => JSON.parse(window.localStorage.getItem("subshield.connections") || "{}")
  );

  const company = data.company || initialData.company;
  const settings = data.settings || initialData.settings;
  const firstName = settings.userProfile?.firstName || "";
  const accountSummary = useMemo(() => {
    const profile = settings.userProfile || {};
    const fullName =
      [profile.firstName, profile.lastName].filter(Boolean).join(" ") || company.name;
    const initials =
      [profile.firstName, profile.lastName]
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase())
        .join("") ||
      company.name?.slice(0, 2).toUpperCase() ||
      "SS";
    return {
      name: fullName,
      initials,
      workspace: settings.account?.workspaceName || company.name,
      plan: settings.billing?.planName || "",
      avatarColor: profile.avatarColor || "",
    };
  }, [settings, company]);
  const coverageApplication = useMemo(
    () => normalizeCoverageApplication(data.coverageApplication, company, data.partners || []),
    [data.coverageApplication, company, data.partners]
  );

  const policies = useMemo(
    () => normalizePolicies(data.policies, company.id),
    [data.policies, company.id]
  );
  const opportunities = useMemo(
    () =>
      (data.savingsOpportunities || []).map((item) =>
        normalizeSavingsOpportunity(item, policies, company.id)
      ),
    [data.savingsOpportunities, policies, company.id]
  );
  const quoteRequests = useMemo(
    () => (data.quoteRequests || []).map((item) => normalizeQuoteRequest(item, company.id)),
    [data.quoteRequests, company.id]
  );
  const documents = useMemo(
    () => (data.documents || []).map((item) => normalizeDocument(item)),
    [data.documents]
  );
  const pdfExtractions = useMemo(
    () => (Array.isArray(data.pdfExtractions) ? data.pdfExtractions : []),
    [data.pdfExtractions]
  );
  const openQuoteRequests = useMemo(
    () => getOpenQuoteRequests(quoteRequests),
    [quoteRequests]
  );
  const pendingCertificates = useMemo(() => {
    const holders = data.contractors?.length || 0;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentSends = (data.coiSends || []).filter((item) => {
      const sentAt = new Date(item.sentAt).getTime();
      return Number.isFinite(sentAt) && sentAt >= thirtyDaysAgo;
    }).length;
    return Math.max(0, holders - recentSends);
  }, [data.contractors, data.coiSends]);

  const score = useMemo(() => getComplianceScore(policies), [policies]);
  const docs = useMemo(() => countDocuments(policies), [policies]);
  const totalPremium = useMemo(() => totalTrackedPremium(policies), [policies]);
  const potentialSavings = useMemo(() => getPotentialSavings(opportunities), [opportunities]);
  const realizedSavings = useMemo(() => getRealizedSavings(opportunities), [opportunities]);
  const coverageGaps = useMemo(() => getCoverageGaps(policies), [policies]);
  const missingDocuments = useMemo(
    () => getMissingDocuments(policies, documents),
    [policies, documents]
  );
  const critical = useMemo(
    () => policies.filter((policy) => policy.daysRemaining <= 10),
    [policies]
  );
  const upcoming = useMemo(() => getUpcomingRenewals(policies, 5), [policies]);
  const reminders = useMemo(() => getRenewalReminders(policies), [policies]);
  const recommendedAction = useMemo(
    () => getNextRecommendedAction({ reminders, opportunities, openQuoteRequests }),
    [reminders, opportunities, openQuoteRequests]
  );

  const selectedPolicy = policies.find((policy) => policy.id === policyId) || policies[0];
  const selectedContractor =
    data.contractors.find((contractor) => contractor.id === contractorId) ||
    data.contractors[0];

  const availableSavingsCount = opportunities.filter((item) =>
    ["available", "quote_received"].includes(item.status)
  ).length;

  useEffect(() => {
    if (!policies.find((policy) => policy.id === policyId) && policies[0]) {
      setPolicyId(policies[0].id);
    }
  }, [policies, policyId]);

  useEffect(() => {
    if (
      !data.contractors.find((contractor) => contractor.id === contractorId) &&
      data.contractors[0]
    ) {
      setContractorId(data.contractors[0].id);
      setProject(data.contractors[0].projects[0] || "");
    }
  }, [data.contractors, contractorId]);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    function onKey(event) {
      const key = event.key?.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const titles = {
      dashboard: "Dashboard",
      policies: "Policies",
      savings: "Savings",
      certificates: "Certificates",
      connections: "Connections",
      documents: "Documents",
      settings: "Settings",
    };
    const label = titles[view] || "SubShield";
    document.title = `${label} | SubShield`;
  }, [view]);

  // Reflect the active view in the URL hash so views are deep-linkable and
  // survive a refresh. Writing a new hash also pushes a history entry, which is
  // what makes the browser back/forward buttons move between views.
  useEffect(() => {
    if (viewFromHash() !== view) {
      window.location.hash = `#/${view}`;
    }
  }, [view]);

  // Respond to back/forward navigation (and manual hash edits).
  useEffect(() => {
    function onHashChange() {
      setView(viewFromHash());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function commit(next) {
    setData(next);
    writeStoredData(next);
  }

  function fireToast(title, body, type = "default") {
    setToast({ title, body, type });
  }

  /* ---------- Carrier connections ---------- */

  function saveConnections(next) {
    setCarrierConnections(next);
    window.localStorage.setItem("subshield.connections", JSON.stringify(next));
  }

  // Plaid-style retrieval: connecting a provider pulls its policies and
  // documents straight into SubShield. Coverage lines the user doesn't have
  // yet are imported as new policies (gap-fill); each import lands a
  // declarations page, and the connection lands a refreshed COI package.
  function connectCarrier(carrierId, creds, carrierMeta) {
    const carrierName = carrierMeta?.name || "Insurance provider";
    const types = (carrierMeta?.policyTypes || []).filter((t) => t && t !== "license");

    let workingPolicies = [...data.policies];
    let workingOpportunities = [...opportunities];
    const newDocuments = [];
    let importedPolicies = 0;

    types.forEach((policyType) => {
      const existing = workingPolicies.find(
        (p) => (p.policyType || p.type) === policyType && (p.policyType || p.type) !== "license"
      );

      if (existing) {
        // Already tracked — mark it verified through this connection.
        workingPolicies = workingPolicies.map((p) =>
          p.id === existing.id
            ? { ...p, carrierConnected: carrierId, statusNote: `Synced from ${carrierName}.`, updatedAt: new Date().toISOString() }
            : p
        );
        return;
      }

      // Gap-fill: retrieve this coverage line as a new policy.
      const premium = CONNECT_PREMIUM[policyType] || 1500;
      const renewal = dateFromToday(45 + importedPolicies * 60);
      const policy = normalizePolicy(
        {
          policyType,
          carrier: carrierName,
          premiumAmount: premium,
          premium,
          policyNumber: `${(carrierMeta?.logoMark || "POL").toUpperCase()}-${Math.floor(100000 + Math.random() * 899999)}`,
          renewalDate: renewal,
          expirationDate: renewal,
          carrierConnected: carrierId,
          source: "connection",
          statusNote: `Imported from ${carrierName}.`,
        },
        company.id
      );
      workingPolicies = [...workingPolicies, policy];
      importedPolicies += 1;

      newDocuments.push(
        normalizeDocument({
          name: `${policy.name} Declarations`,
          docType: "declaration",
          policyId: policy.id,
          policyType,
          carrier: carrierName,
          fileType: "PDF",
          sizeKb: 180,
          status: "verified",
          addedBy: carrierName,
          source: "connection",
        })
      );

      if (renewal && policy.daysRemaining <= 120) {
        workingOpportunities = [
          normalizeSavingsOpportunity(
            {
              policyId: policy.id,
              policyType,
              currentCarrier: carrierName,
              currentPremium: premium,
              estimatedSavings: estimateSavings(premium),
              renewalDate: renewal,
              status: policy.daysRemaining <= 90 ? "available" : "monitoring",
            },
            workingPolicies,
            company.id
          ),
          ...workingOpportunities,
        ];
      }
    });

    // The connection always lands a refreshed certificate package.
    newDocuments.push(
      normalizeDocument({
        name: `${carrierName} Certificate of Insurance`,
        docType: "certificate",
        policyType: null,
        carrier: carrierName,
        fileType: "PDF",
        sizeKb: 210,
        status: "verified",
        addedBy: carrierName,
        source: "connection",
      })
    );

    const next = {
      ...carrierConnections,
      [carrierId]: {
        carrierId,
        connectedAt: new Date().toISOString(),
        syncedAt: new Date().toISOString(),
        policyCount: types.length,
        importedPolicies,
        importedDocuments: newDocuments.length,
        capabilities: carrierMeta?.capabilities || [],
        accountId: creds.accountId,
      },
    };
    saveConnections(next);

    commit({
      ...data,
      policies: workingPolicies,
      savingsOpportunities: workingOpportunities,
      documents: [...newDocuments, ...(data.documents || [])],
      activity: prependActivity(
        data.activity,
        `${carrierName} connected`,
        `Retrieved ${importedPolicies} ${importedPolicies === 1 ? "policy" : "policies"} and ${newDocuments.length} document${newDocuments.length === 1 ? "" : "s"} automatically.`
      ),
    });

    fireToast(
      `${carrierName} connected`,
      importedPolicies > 0
        ? `Retrieved ${importedPolicies} ${importedPolicies === 1 ? "policy" : "policies"} and ${newDocuments.length} documents automatically.`
        : `Synced your coverage and imported ${newDocuments.length} document${newDocuments.length === 1 ? "" : "s"}.`,
      "success"
    );
  }

  function disconnectCarrier(carrierId) {
    const next = { ...carrierConnections };
    delete next[carrierId];
    saveConnections(next);
    fireToast("Carrier disconnected", "Coverage verification disabled for this carrier.");
  }

  function syncCarrier(carrierId) {
    const next = {
      ...carrierConnections,
      [carrierId]: { ...carrierConnections[carrierId], syncing: true },
    };
    saveConnections(next);
    setTimeout(() => {
      setCarrierConnections((prev) => {
        const updated = {
          ...prev,
          [carrierId]: { ...prev[carrierId], syncing: false, syncedAt: new Date().toISOString() },
        };
        window.localStorage.setItem("subshield.connections", JSON.stringify(updated));
        return updated;
      });
      fireToast("Sync complete", "Policies and coverage status are up to date.", "success");
    }, 2000);
  }

  /* ---------- Policies ---------- */

  function renewPolicy(id) {
    const policy = policies.find((item) => item.id === id);
    if (!policy || renewingId) return;
    setRenewingId(id);
    setTimeout(() => {
      const renewalDate = dateFromToday(365);
      const nextPolicies = data.policies.map((item) =>
        item.id === id
          ? {
              ...item,
              renewalDate,
              expirationDate: renewalDate,
              expires: renewalDate,
              daysRemaining: 365,
              status: "active",
              statusNote: "Renewed and ready for certificates.",
              updatedAt: new Date().toISOString(),
            }
          : item
      );

      commit({
        ...data,
        policies: nextPolicies,
        savingsOpportunities: patchOpportunity(
          opportunities,
          opportunities.find((o) => o.policyId === id)?.id,
          { status: "monitoring", notes: "Policy renewed. Monitoring market rates." }
        ),
        activity: prependActivity(
          data.activity,
          `${policy.name} renewed`,
          `${policy.carrier} | active through ${renewalDate}.`
        ),
      });
      setRenewingId(null);
      fireToast("Policy renewed", `${policy.name} is active for 365 days.`, "success");
    }, 850);
  }

  function addPolicy(policyInput) {
    const normalized = normalizePolicy(policyInput, company.id);
    const exists = policies.some((policy) => policy.policyNumber === normalized.policyNumber);
    if (exists) {
      fireToast("Policy already exists", "This policy number is already tracked.", "warning");
      return;
    }

    const nextPolicies = [normalized, ...data.policies];
    const hasSavings = normalized.policyType !== "license";
    const nextOpportunities = hasSavings
      ? [
          normalizeSavingsOpportunity(
            {
              policyId: normalized.id,
              policyType: normalized.policyType,
              currentCarrier: normalized.carrier,
              currentPremium: normalized.premiumAmount,
              estimatedSavings: estimateSavings(normalized.premiumAmount),
              renewalDate: normalized.renewalDate,
              status: normalized.daysRemaining <= 90 ? "available" : "monitoring",
            },
            nextPolicies,
            company.id
          ),
          ...opportunities,
        ]
      : opportunities;

    commit({
      ...data,
      policies: nextPolicies,
      savingsOpportunities: nextOpportunities,
      activity: prependActivity(
        data.activity,
        `${normalized.name} added`,
        `${normalized.carrier} policy ${normalized.policyNumber} is now tracked.`
      ),
    });
    setPolicyId(normalized.id);
    setAddPolicyType(null);
    setModal(null);
    fireToast("Policy saved", `${normalized.name} added. We'll watch it for savings.`, "success");
  }

  // Save one or more policies read from a scanned PDF. A single declarations
  // page yields one policy; an ACORD 25 certificate can yield several at once.
  // Each detected coverage updates the matching policy in place or is added,
  // the real file is stored as a document, and savings tracking is started for
  // new non-license coverages.
  function saveScannedDocument(scan) {
    const scanned = scan?.policies || [];
    if (!scanned.length) return;

    const meta = scan.documentMeta || {};
    let workingPolicies = [...data.policies];
    let workingOpportunities = [...opportunities];
    let firstSavedId = null;
    let primaryPolicy = null;
    let added = 0;
    let updated = 0;

    scanned.forEach((raw) => {
      const normalized = normalizePolicy(
        {
          ...raw,
          renewalDate: raw.renewalDate || raw.expirationDate || dateFromToday(365),
        },
        company.id
      );
      const existing = workingPolicies.find(
        (policy) => (policy.policyType || policy.type) === normalized.policyType
      );
      const targetId = existing ? existing.id : normalized.id;
      if (!firstSavedId) firstSavedId = targetId;
      if (!primaryPolicy) primaryPolicy = normalized;

      const docLabels = scannedDocumentLabels({ ...raw, kind: meta.kind });

      if (existing) {
        updated += 1;
        workingPolicies = workingPolicies.map((policy) =>
          policy.id === existing.id
            ? {
                ...policy,
                ...normalized,
                id: existing.id,
                premiumAmount: normalized.premiumAmount || policy.premiumAmount,
                premium: normalized.premiumAmount || policy.premium,
                documents: Array.from(new Set([...(policy.documents || []), ...docLabels])),
                statusNote: "Refreshed from a scanned document.",
              }
            : policy
        );
      } else {
        added += 1;
        const policyRecord = { ...normalized, id: targetId, documents: docLabels };
        workingPolicies = [...workingPolicies, policyRecord];
        if (policyRecord.policyType !== "license") {
          workingOpportunities = [
            normalizeSavingsOpportunity(
              {
                policyId: policyRecord.id,
                policyType: policyRecord.policyType,
                currentCarrier: policyRecord.carrier,
                currentPremium: policyRecord.premiumAmount,
                estimatedSavings: estimateSavings(policyRecord.premiumAmount),
                renewalDate: policyRecord.renewalDate,
                status: policyRecord.daysRemaining <= 90 ? "available" : "monitoring",
              },
              workingPolicies,
              company.id
            ),
            ...workingOpportunities,
          ];
        }
      }
    });

    const summary =
      [added ? `${added} added` : "", updated ? `${updated} updated` : ""]
        .filter(Boolean)
        .join(", ") || "saved";

    // One uploaded file = one library document. A certificate that lists
    // several coverage lines is filed once as a COI package (not duplicated
    // across each policy type); a declarations page files under its policy.
    const isCoi = meta.kind === "coi" || scanned.length > 1;
    const fileBase = (meta.fileName || "").replace(/\.pdf$/i, "").trim();
    const newDocuments = [
      normalizeDocument({
        name: fileBase || (primaryPolicy ? `${primaryPolicy.name} document` : "Insurance document"),
        docType: isCoi ? "certificate" : "declaration",
        policyId: firstSavedId,
        policyType: isCoi ? null : primaryPolicy?.policyType || null,
        carrier: primaryPolicy?.carrier || "",
        fileType: meta.fileType || "PDF",
        sizeKb: meta.sizeKb || 160,
        status: "verified",
        addedBy: firstName || "You",
      }),
    ];

    commit({
      ...data,
      policies: workingPolicies,
      savingsOpportunities: workingOpportunities,
      documents: [...newDocuments, ...(data.documents || [])],
      activity: prependActivity(
        data.activity,
        `Scanned ${meta.kind === "coi" ? "certificate" : "document"} - ${summary}`,
        `${scanned.map((policy) => policyLabelFromType(policy.policyType)).join(", ")} filed from ${
          meta.fileName || "your upload"
        }.`
      ),
    });

    if (firstSavedId) setPolicyId(firstSavedId);
    setModal(null);
    fireToast(
      "Insurance saved",
      `${scanned.length} ${scanned.length === 1 ? "policy" : "policies"} filed from your scan.`,
      "success"
    );
  }

  /* ---------- Savings ---------- */

  function requestPartnerQuote(opportunity) {
    // Step 1: mark pending immediately so the UI shows "Awaiting partner response".
    // In production this triggers an API call to the partner; here we simulate
    // the partner responding after a short delay with their actual offer.
    if (findingId) return;

    const partnerForOpportunity =
      data.partners.find((p) => p.id === opportunity.partnerId && p.active) ||
      data.partners.find((p) => p.active && p.policyTypes?.includes(opportunity.policyType)) ||
      data.partners.find((p) => p.active);

    const quoteRequest = normalizeQuoteRequest(
      {
        policyId: opportunity.policyId,
        partnerId: partnerForOpportunity?.id || null,
        routeType: "partner",
        status: "pending_partner",
        submittedAt: new Date().toISOString(),
        notes: "Coverage review request submitted - awaiting partner response.",
      },
      company.id
    );

    // Immediately persist pending state so UI reflects "awaiting" on reload
    commit({
      ...data,
      savingsOpportunities: patchOpportunity(opportunities, opportunity.id, {
        status: "pending_partner",
        partnerId: partnerForOpportunity?.id || opportunity.partnerId,
      }),
      quoteRequests: [quoteRequest, ...quoteRequests],
      activity: prependActivity(
        data.activity,
        `Quote request sent for ${policyLabelFromType(opportunity.policyType)}`,
        `Submitted to ${partnerForOpportunity?.name || "licensed partner"} for review.`
      ),
    });
    setFindingId(opportunity.id);
    fireToast("Submitted to partner", `${partnerForOpportunity?.name || "Partner"} is reviewing your request.`);

    // Simulate the partner sending back their actual offer (in production this
    // arrives via webhook / polling; here we resolve it after a brief delay).
    setTimeout(() => {
      const policy = policies.find((item) => item.id === opportunity.policyId);
      const base = opportunity.currentPremium || policy?.premiumAmount || 0;
      const partnerSavings = opportunity.estimatedSavings || estimateSavings(base);
      const partnerPremium = Math.max(200, base - partnerSavings);
      const partner = partnerForOpportunity;

      // The quote object is flagged source:"partner" so the UI can make clear
      // these numbers came from the licensed partner, not from SubShield.
      const alternateQuote = {
        partnerId: partner?.id || null,
        partnerName: partner?.name || "Licensed partner",
        carrier: partner?.name || "Licensed partner",
        premium: partnerPremium,
        deductible: policy?.deductible ?? null,
        coverageLimits: policy?.coverageLimits || policy?.limit || "",
        amRating: partner?.amRating || "A (Excellent)",
        bindableUntil: dateFromToday(14),
        source: "partner",
        quoteUrl: partner?.quoteUrl || null,
        highlights: [
          "Comparable coverage and limits",
          `${formatMoney(base - partnerPremium)}/yr lower than current premium`,
          "Review and documents completed through the partner",
        ],
      };

      commit({
        ...data,
        savingsOpportunities: patchOpportunity(opportunities, opportunity.id, {
          status: "quote_received",
          alternateQuote,
          partnerId: partner?.id || opportunity.partnerId,
        }),
        quoteRequests: quoteRequests.map((req) =>
          req.partnerId === (partner?.id || null) && req.status === "pending_partner"
            ? { ...req, status: "quote_received", respondedAt: new Date().toISOString() }
            : req
        ),
        activity: prependActivity(
          data.activity,
          `${partner?.name || "Partner"} returned an offer for ${policyLabelFromType(opportunity.policyType)}`,
          `${formatMoney(partnerPremium)}/yr - est. ${formatMoney(base - partnerPremium)}/yr below your current premium.`
        ),
      });
      setFindingId(null);
      fireToast(
        "Partner offer received",
        `${partner?.name || "Partner"} has returned a quote. Review and go to their site to purchase.`
      );
    }, 1800);
  }

  // Step 2: user reviews partner's offer and clicks "Review options at [Partner]".
  // We open the partner's URL in a new tab and mark the opportunity so the
  // user can come back to SubShield and confirm once they've completed purchase.
  function goToPurchaseAtPartner(opportunity) {
    const quote = opportunity.alternateQuote;
    if (!quote) return;
    const partner = data.partners.find((p) => p.id === quote.partnerId);
    const url = quote.quoteUrl || partner?.quoteUrl;

    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }

    commit({
      ...data,
      savingsOpportunities: patchOpportunity(opportunities, opportunity.id, {
        status: "at_partner",
      }),
      activity: prependActivity(
        data.activity,
        `Sent to ${quote.carrier} to review options`,
        `Opened ${quote.carrier} in a new tab. Return here to upload your new policy once you've switched.`
      ),
    });
    fireToast(
      `Opened ${quote.carrier}`,
      "Review your options there. Come back to upload your new policy document."
    );
  }

  // Step 3: user returns after switching coverage at the partner. We update SubShield's
  // policy record with the partner's numbers and open the upload/scan modal so
  // they can store the new declarations page directly in their vault.
  function confirmPurchaseAtPartner(opportunity) {
    const quote = opportunity.alternateQuote;
    if (!quote) return;
    const policy = policies.find((item) => item.id === opportunity.policyId);
    const savings = savingsForOpportunity(opportunity);

    const nextPolicies = data.policies.map((item) =>
      item.id === opportunity.policyId
        ? {
            ...item,
            carrier: quote.carrier,
            premiumAmount: quote.premium,
            premium: quote.premium,
            deductible: quote.deductible ?? item.deductible,
            coverageLimits: quote.coverageLimits || item.coverageLimits,
            limit: quote.coverageLimits || item.limit,
            statusNote: `Switched to ${quote.carrier} | saving ${formatMoney(savings)}/yr. Upload your new declarations page.`,
            lastQuotedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : item
    );

    commit({
      ...data,
      policies: nextPolicies,
      savingsOpportunities: patchOpportunity(opportunities, opportunity.id, {
        status: "accepted",
        currentCarrier: quote.carrier,
      }),
      activity: prependActivity(
        data.activity,
        `${policy?.name || "Policy"} switched to ${quote.carrier}`,
        `Saving ${formatMoney(savings)}/yr. Upload your new declarations page to keep SubShield current.`
      ),
    });

    // Open the scan/upload modal so the user can save their new policy document
    setModal("scan");
    fireToast(
      "Coverage switched - upload your policy",
      "SubShield is ready to store your new declarations page."
    );
  }

  function keepCurrentOpportunity(opportunity) {
    commit({
      ...data,
      savingsOpportunities: patchOpportunity(opportunities, opportunity.id, {
        status: "dismissed",
        notes: "Marked not interested.",
      }),
      activity: prependActivity(
        data.activity,
        `${policyLabelFromType(opportunity.policyType)} savings dismissed`,
        "You chose to keep your current coverage."
      ),
    });
    fireToast("Kept current coverage", "We'll stop prompting this one.");
  }

  function remindLaterOpportunity(opportunity) {
    commit({
      ...data,
      savingsOpportunities: patchOpportunity(opportunities, opportunity.id, {
        status: "remind_later",
        notes: "Snoozed until closer to renewal.",
      }),
      activity: prependActivity(
        data.activity,
        `${policyLabelFromType(opportunity.policyType)} savings snoozed`,
        "SubShield will resurface this near renewal."
      ),
    });
    fireToast("Snoozed", "We'll resurface this opportunity later.");
  }

  function reactivateOpportunity(opportunity) {
    commit({
      ...data,
      savingsOpportunities: patchOpportunity(opportunities, opportunity.id, {
        status: opportunity.alternateQuote ? "quote_received" : "available",
      }),
    });
    fireToast("Reopened", "This savings opportunity is active again.");
  }

  /* ---------- Quote requests ---------- */

  function saveCoverageApplication(nextDraft, options = {}) {
    const normalizedDraft = normalizeCoverageApplication(
      {
        ...coverageApplication,
        ...nextDraft,
        status: "draft",
        updatedAt: new Date().toISOString(),
      },
      company,
      data.partners || []
    );

    const shouldLog = options.logActivity !== false;
    commit({
      ...data,
      coverageApplication: normalizedDraft,
      activity: shouldLog
        ? prependActivity(
            data.activity,
            "Coverage application saved",
            `${policyLabelFromType(normalizedDraft.policyType)} review draft updated.`
          )
        : data.activity,
    });

    if (options.toast !== false) {
      fireToast("Draft saved", "Continue your coverage review anytime.");
    }
  }

  function submitCoverageApplication(applicationDraft) {
    const normalizedDraft = normalizeCoverageApplication(
      {
        ...coverageApplication,
        ...applicationDraft,
        status: "submitted",
        stage: "quote",
        updatedAt: new Date().toISOString(),
      },
      company,
      data.partners || []
    );

    const policyMatch = policies.find(
      (policy) => (policy.policyType || policy.type) === normalizedDraft.policyType
    );
    const preferredPartner =
      (data.partners || []).find((item) => item.id === normalizedDraft.preferredPartnerId) ||
      (data.partners || []).find((item) => item.active) ||
      null;
    const renewalDate =
      renewalDateFromMonthYear(normalizedDraft.renewalMonth, normalizedDraft.renewalYear) ||
      policyMatch?.renewalDate ||
      dateFromToday(45);

    const request = normalizeQuoteRequest(
      {
        policyId: policyMatch?.id || null,
        policyType: normalizedDraft.policyType,
        routeType: preferredPartner ? "partner" : "broker",
        partnerId: preferredPartner?.id || null,
        brokerId: null,
        requestedBy: "owner",
        status: preferredPartner ? "sent_to_partner" : "submitted",
        businessInfo: {
          companyName: company.name,
          tradeType: normalizedDraft.tradeType,
          state: normalizedDraft.state,
          revenueRange: normalizedDraft.revenueRange,
          employees: normalizedDraft.employees,
          contactEmail: normalizedDraft.contactEmail,
        },
        currentCoverageInfo: {
          currentCarrier: normalizedDraft.currentCarrier || policyMatch?.carrier || "",
          currentPremium: policyMatch?.premiumAmount || 0,
          renewalDate,
        },
        notes: normalizedDraft.notes || "Coverage review submitted from guided application.",
      },
      company.id
    );

    let nextOpportunities = opportunities;
    if (policyMatch) {
      const existingOpportunity = opportunities.find(
        (item) => item.policyId === policyMatch.id
      );
      if (existingOpportunity) {
        nextOpportunities = patchOpportunity(opportunities, existingOpportunity.id, {
          status: "pending_partner",
          partnerId: preferredPartner?.id || existingOpportunity.partnerId,
          currentCarrier: normalizedDraft.currentCarrier || existingOpportunity.currentCarrier,
          renewalDate,
          notes: "Submitted through guided coverage review workflow.",
        });
      } else if ((policyMatch.policyType || policyMatch.type) !== "license") {
        nextOpportunities = [
          normalizeSavingsOpportunity(
            {
              policyId: policyMatch.id,
              policyType: policyMatch.policyType || policyMatch.type,
              currentCarrier: normalizedDraft.currentCarrier || policyMatch.carrier,
              currentPremium: policyMatch.premiumAmount || 0,
              estimatedSavings: estimateSavings(policyMatch.premiumAmount || 0),
              renewalDate,
              status: "pending_partner",
              partnerId: preferredPartner?.id || null,
              notes: "Created from guided coverage review workflow.",
            },
            policies,
            company.id
          ),
          ...opportunities,
        ];
      }
    }

    commit({
      ...data,
      coverageApplication: normalizedDraft,
      quoteRequests: [request, ...quoteRequests],
      savingsOpportunities: nextOpportunities,
      activity: prependActivity(
        data.activity,
        "Coverage review submitted",
        `${policyLabelFromType(normalizedDraft.policyType)} routed to ${
          preferredPartner?.name || "a licensed review partner"
        }.`
      ),
    });

    fireToast(
      "Coverage review submitted",
      `We'll notify you when partner quotes are ready.`
    );
  }

  function openQuoteModal(opportunity, defaultRouteType = "partner", extra = {}) {
    const defaultPolicyId = extra.defaultPolicyId || opportunity?.policyId || selectedPolicy?.id;
    setQuoteDefaults({
      opportunity: opportunity || null,
      defaultPolicyId,
      defaultRouteType,
      defaultPartnerId: extra.defaultPartnerId || opportunity?.partnerId || "",
      defaultBrokerId: extra.defaultBrokerId || "",
    });
    setModal("quote");
  }

  function submitQuoteRequest(request) {
    const normalizedRequest = normalizeQuoteRequest(
      {
        ...request,
        companyId: company.id,
        status: request.routeType === "partner" ? "sent_to_partner" : "submitted",
      },
      company.id
    );

    const policy = policies.find((item) => item.id === request.policyId);
    const routeLabel =
      request.routeType === "partner"
        ? data.partners.find((item) => item.id === request.partnerId)?.name || "partner"
        : data.brokers.find((item) => item.id === request.brokerId)?.name || "advisor";

    commit({
      ...data,
      quoteRequests: [normalizedRequest, ...quoteRequests],
      savingsOpportunities: request.opportunityId
        ? patchOpportunity(opportunities, request.opportunityId, {
            status: "pending_partner",
            notes: `Quote request submitted to ${routeLabel}.`,
          })
        : opportunities,
      activity: prependActivity(
        data.activity,
        "Quote request submitted",
        `${policy?.name || "Policy"} routed to ${routeLabel} for review.`
      ),
    });

    setModal(null);
    setQuoteDefaults({});
    fireToast("Request submitted", `Coverage details sent to ${routeLabel}.`);
  }

  /* ---------- Certificates ---------- */

  function sendPackage() {
    if (!selectedContractor) return;
    const finalProject = normalizeProjectName(newProject) || normalizeProjectName(project);
    if (!finalProject) {
      fireToast("Project name required", "Pick or type a project before sending.", "warning");
      return;
    }

    const packageDocCount = countDocuments(packagePolicies(policies));
    const sentAt = new Date().toISOString();
    const sendRecord = {
      id: makeId("coi"),
      contractorId: selectedContractor.id,
      project: finalProject,
      sentAt,
      docCount: packageDocCount,
      email: selectedContractor.email,
      status: "delivered",
    };

    const certificateDoc = normalizeDocument({
      name: `COI | ${finalProject} (${selectedContractor.name})`,
      docType: "certificate",
      carrier: company.name,
      status: "verified",
      addedBy: firstName || "You",
    });

    const contractors = data.contractors.map((contractor) => {
      if (contractor.id !== selectedContractor.id) {
        return { ...contractor, projects: normalizeProjects(contractor.projects) };
      }
      return {
        ...contractor,
        projects: addProjectIfMissing(contractor.projects, finalProject),
        pastSends: [sendRecord, ...(contractor.pastSends || [])].slice(0, 25),
      };
    });

    commit({
      ...data,
      contractors,
      coiSends: [sendRecord, ...(data.coiSends || [])].slice(0, 50),
      documents: [certificateDoc, ...(data.documents || [])],
      activity: prependActivity(
        data.activity,
        `Certificate sent to ${selectedContractor.name}`,
        `${finalProject} | ${packageDocCount} verified files to ${selectedContractor.email}.`
      ),
    });

    setLastSent({ contractor: selectedContractor, project: finalProject });
    setNewProject("");
    setProject(finalProject);
    setModal("sent");
  }

  function addContractor(contractor) {
    const email = contractor.email.trim().toLowerCase();
    const emailExists = data.contractors.some(
      (existing) => existing.email.trim().toLowerCase() === email
    );
    if (emailExists) {
      fireToast("Duplicate email", "A holder with that email already exists. Edit it instead.", "warning");
      return;
    }

    const normalized = {
      ...contractor,
      projects: normalizeProjects(contractor.projects),
      pastSends: contractor.pastSends || [],
      phone: contractor.phone || "",
      notes: contractor.notes || "",
      portalInstructions: contractor.portalInstructions || "",
    };

    commit({
      ...data,
      contractors: [normalized, ...data.contractors],
      activity: prependActivity(
        data.activity,
        `${normalized.name} added`,
        `${normalized.contact} | ${normalized.email}`
      ),
    });
    setContractorId(normalized.id);
    setProject(normalized.projects[0] || "");
    setModal(null);
    fireToast("Holder saved", `${normalized.name} added to your certificates.`);
  }

  function updateContractor(updated) {
    const email = updated.email.trim().toLowerCase();
    const emailConflict = data.contractors.some(
      (existing) => existing.id !== updated.id && existing.email.trim().toLowerCase() === email
    );
    if (emailConflict) {
      fireToast("Duplicate email", "That email is already used by another holder.", "warning");
      return;
    }

    const normalized = {
      ...updated,
      projects: normalizeProjects(updated.projects),
      pastSends: updated.pastSends || [],
      phone: updated.phone || "",
      notes: updated.notes || "",
      portalInstructions: updated.portalInstructions || "",
    };

    commit({
      ...data,
      contractors: data.contractors.map((contractor) =>
        contractor.id === normalized.id ? { ...contractor, ...normalized } : contractor
      ),
      activity: prependActivity(
        data.activity,
        `${normalized.name} updated`,
        "Certificate holder details saved."
      ),
    });
    setEditingContractor(null);
    setModal(null);
    fireToast("Holder updated", `${normalized.name} details saved.`);
  }

  function deleteContractor(id) {
    const removed = data.contractors.find((contractor) => contractor.id === id);
    commit({
      ...data,
      contractors: data.contractors.filter((contractor) => contractor.id !== id),
      activity: prependActivity(
        data.activity,
        `${removed?.name || "Holder"} removed`,
        "Certificate holder removed."
      ),
    });
    setEditingContractor(null);
    setModal(null);
    fireToast("Holder removed", `${removed?.name || "Holder"} removed.`);
  }

  /* ---------- Advisors ---------- */

  function addBroker(broker) {
    const email = broker.email.trim().toLowerCase();
    const exists = (data.brokers || []).some(
      (item) => item.email.trim().toLowerCase() === email
    );
    if (exists) {
      fireToast("Duplicate advisor", "An advisor with that email already exists.", "warning");
      return;
    }

    const normalized = { ...broker, companyId: company.id };
    commit({
      ...data,
      brokers: [normalized, ...(data.brokers || [])],
      activity: prependActivity(
        data.activity,
        "Advisor added",
        `${normalized.name} (${normalized.company}) is ready for coverage reviews.`
      ),
    });
    setModal(null);
    fireToast("Advisor added", `${normalized.name} saved.`);
  }

  /* ---------- Documents ---------- */

  function deleteDocument(id) {
    const removed = documents.find((doc) => doc.id === id);
    commit({
      ...data,
      documents: (data.documents || []).filter((doc) => doc.id !== id),
      activity: prependActivity(
        data.activity,
        "Document removed",
        `${removed?.name || "A document"} was deleted from the document center.`
      ),
    });
    fireToast("Document removed", `${removed?.name || "Document"} deleted.`);
  }

  function savePdfExtractions(results) {
    const cleanResults = Array.isArray(results) ? results : [];
    if (!cleanResults.length) return;

    const documentRecords = cleanResults
      .filter((result) => result.status !== "failed")
      .map((result) =>
        normalizeDocument({
          name: result.title || result.fileName,
          docType: result.docType,
          // A certificate covering several lines files once as a COI package;
          // a single-line declaration files under its policy type.
          policyType:
            result.docType === "certificate"
              ? null
              : policyTypeFromLabel(result.coverages?.[0]?.type),
          carrier: result.fields?.carrier || "",
          fileType: "PDF",
          sizeKb: Math.max(1, Math.round((result.fileSize || 0) / 1024)),
          status: ["extracted", "ocr_extracted"].includes(result.status)
            ? "verified"
            : "pending",
          addedBy: firstName || "You",
          uploadedAt: result.extractedAt,
          extractionId: result.id,
          extractedWords: result.words,
        })
      );

    const extracted = cleanResults.filter((item) => item.status === "extracted").length;
    const needsOcr = cleanResults.filter((item) => item.status === "needs_ocr").length;
    const failed = cleanResults.filter((item) => item.status === "failed").length;
    const plural = cleanResults.length === 1 ? "" : "s";

    commit({
      ...data,
      pdfExtractions: [...cleanResults, ...(data.pdfExtractions || [])].slice(0, 100),
      documents: [...documentRecords, ...(data.documents || [])],
      activity: prependActivity(
        data.activity,
        `${cleanResults.length} PDF${plural} scanned`,
        `${extracted} extracted, ${needsOcr} need OCR, ${failed} failed.`
      ),
    });

    fireToast(
      "PDF scan complete",
      `${extracted} extracted, ${needsOcr} need OCR, ${failed} failed.`
    );
  }

  function updatePdfExtraction(id, patch) {
    const previous = pdfExtractions.find((item) => item.id === id);
    const nextExtraction = {
      ...(previous || {}),
      ...patch,
      id,
      updatedAt: new Date().toISOString(),
    };
    const verifiedStatus = ["extracted", "ocr_extracted"].includes(nextExtraction.status)
      ? "verified"
      : "pending";

    commit({
      ...data,
      pdfExtractions: (data.pdfExtractions || []).map((item) =>
        item.id === id ? nextExtraction : item
      ),
      documents: (data.documents || []).map((doc) =>
        doc.extractionId === id
          ? normalizeDocument({
              ...doc,
              name: nextExtraction.title || doc.name,
              docType: nextExtraction.docType || doc.docType,
              policyType:
                nextExtraction.docType === "certificate"
                  ? null
                  : policyTypeFromLabel(nextExtraction.coverages?.[0]?.type) || doc.policyType,
              carrier: nextExtraction.fields?.carrier || doc.carrier,
              status: verifiedStatus,
              extractedWords: nextExtraction.words || doc.extractedWords,
            })
          : doc
      ),
      activity: prependActivity(
        data.activity,
        "PDF extraction updated",
        `${nextExtraction.fileName || "PDF result"} reviewed and saved.`
      ),
    });

    fireToast("Extraction updated", `${nextExtraction.fileName || "PDF result"} saved.`);
  }

  function deletePdfExtraction(id) {
    const removed = pdfExtractions.find((item) => item.id === id);
    commit({
      ...data,
      pdfExtractions: (data.pdfExtractions || []).filter((item) => item.id !== id),
      // Keep the library in lock-step: drop the document this extraction filed.
      documents: (data.documents || []).filter((doc) => doc.extractionId !== id),
      activity: prependActivity(
        data.activity,
        "PDF extraction deleted",
        `${removed?.fileName || "A parsed PDF"} was removed from extraction history.`
      ),
    });
    fireToast("Extraction deleted", `${removed?.fileName || "PDF result"} removed.`);
  }

  /* ---------- Settings ---------- */

  function saveSettingsSection(sectionKey, value, meta = {}) {
    const mergedSettings = { ...settings, [sectionKey]: value };

    const nextCompany =
      sectionKey === "companyProfile"
        ? {
            ...company,
            name: value.legalName || company.name,
            tradeType: value.tradeType || company.tradeType,
            state: value.state || company.state,
            revenueRange: value.revenueRange || company.revenueRange,
            employees: value.employees || company.employees,
            contactEmail: mergedSettings.account?.loginEmail || company.contactEmail,
          }
        : sectionKey === "account"
        ? {
            ...company,
            name: value.workspaceName || company.name,
            contactEmail: value.loginEmail || company.contactEmail,
          }
        : company;

    commit({
      ...data,
      company: nextCompany,
      settings: mergedSettings,
      activity: prependActivity(
        data.activity,
        meta.activityTitle || "Settings updated",
        meta.activityBody || "Account settings were updated."
      ),
    });

    fireToast(meta.toastTitle || "Settings saved", meta.toastBody || "Your changes are live.");
  }

  function logoutUser() {
    commit({
      ...data,
      activity: prependActivity(
        data.activity,
        "User logged out",
        "Session closed from the settings page."
      ),
    });
    setView("dashboard");
    setModal(null);
    fireToast("Logged out", "Current session closed successfully.");
  }

  // Applies a fresh dataset (empty or sample) and resets all transient UI
  // state. Selection state is guarded so it works whether or not the dataset
  // contains policies/contractors.
  function applyDataset(dataset, { demoMode = false } = {}) {
    // `demoMode` is persisted so the app can show a global "demo data" banner
    // and offer a one-click toggle anywhere. Real accounts never set it.
    commit({ ...dataset, demoMode });
    setView("dashboard");
    setPolicyId(dataset.policies[0]?.id || null);
    setContractorId(dataset.contractors[0]?.id || null);
    setProject(dataset.contractors[0]?.projects?.[0] || "");
    setNewProject("");
    setModal(null);
    setEditingContractor(null);
    setQuoteDefaults({});
  }

  function resetDemo() {
    applyDataset(initialData, { demoMode: false });
    fireToast("Account reset", "Local data cleared back to an empty account.");
  }

  function loadSampleData() {
    applyDataset(sampleData, { demoMode: true });
    fireToast("Sample data loaded", "A realistic example account is ready to explore.");
  }

  /* ---------- Navigation helpers ---------- */

  function openSend(contractor, presetProject) {
    if (!data.contractors.length) {
      setView("certificates");
      fireToast("No holders saved", "Add a certificate holder before sending.");
      return;
    }
    if (contractor) {
      setContractorId(contractor.id);
      setProject(presetProject || contractor.projects[0] || "");
    } else if (!selectedContractor && data.contractors[0]) {
      setContractorId(data.contractors[0].id);
      setProject(data.contractors[0].projects[0] || "");
    }
    setNewProject("");
    setModal("send");
  }

  function openEdit(contractor) {
    setEditingContractor(contractor);
    setModal("edit");
  }

  function openAddPolicy(type) {
    setAddPolicyType(type || null);
    setModal("add-policy");
  }

  function findSavingsForPolicy(id) {
    setView("savings");
    const opportunity = opportunities.find(
      (o) => o.policyId === id && ["available", "monitoring"].includes(o.status)
    );
    if (opportunity && opportunity.status === "available") {
      requestPartnerQuote(opportunity);
    }
  }

  function runPaletteAction(action, payload) {
    switch (action) {
      case "upload":
        setModal("scan");
        break;
      case "add-policy":
        openAddPolicy();
        break;
      case "add-gc":
        setModal("add-gc");
        break;
      case "open-policy":
        setPolicyId(payload);
        setView("policies");
        break;
      case "open-holder":
        setContractorId(payload);
        setView("certificates");
        break;
      case "open-documents":
        setView("documents");
        break;
      default:
        break;
    }
  }

  // Any open overlay (a modal or the command palette) makes the underlying
  // app inert so screen readers and keyboard tabbing stay within the overlay.
  const overlayOpen = modal !== null || paletteOpen;

  return (
    <div className="ss-app">
      <div className="ss-layout" inert={overlayOpen ? true : undefined}>
        <Sidebar
          view={view}
          setView={setView}
          upcoming={upcoming}
          potentialSavings={potentialSavings}
          savingsCount={availableSavingsCount}
          onReviewSavings={() => setView("savings")}
          account={accountSummary}
        />

        <main className="ss-main">
          <Header
            view={view}
            onUpload={() => setModal("scan")}
            onSearch={() => setPaletteOpen(true)}
            unread={critical.length + reminders.length}
            demoMode={Boolean(data.demoMode)}
            onLoadSample={loadSampleData}
            onClearDemo={resetDemo}
          />

          <Suspense fallback={<ViewLoading />}>
          {view === "dashboard" && (
            <DashboardView
              firstName={firstName}
              totalPremium={totalPremium}
              potentialSavings={potentialSavings}
              realizedSavings={realizedSavings}
              policies={policies}
              docsCount={docs}
              upcoming={upcoming}
              opportunities={opportunities}
              openQuoteRequests={openQuoteRequests}
              coiSends={data.coiSends || []}
              contractors={data.contractors || []}
              coverageGaps={coverageGaps}
              missingDocuments={missingDocuments}
              recommendedAction={recommendedAction}
              onReviewSavings={() => setView("savings")}
              onOpenPolicies={() => setView("policies")}
              onOpenCertificates={() => setView("certificates")}
              onUpload={() => setModal("scan")}
              activity={data.activity}
              pendingCertificates={pendingCertificates}
            />
          )}

          {view === "policies" && (
            <PoliciesView
              score={score}
              docs={docs}
              critical={critical}
              policies={policies}
              totalPremium={totalPremium}
              upcoming={upcoming}
              reminders={reminders}
              selectedPolicy={selectedPolicy}
              onSelectPolicy={setPolicyId}
              onRenew={renewPolicy}
              onSend={() => openSend()}
              onUpload={() => setModal("scan")}
              onAddPolicy={() => openAddPolicy()}
              onFindSavings={findSavingsForPolicy}
              renewingId={renewingId}
              carrierConnections={carrierConnections}
              onManageConnections={() => setView("connections")}
            />
          )}

          {view === "savings" && (
            <SavingsView
              opportunities={opportunities}
              policies={policies}
              quoteRequests={quoteRequests}
              partners={data.partners || []}
              brokers={data.brokers || []}
              potentialSavings={potentialSavings}
              realizedSavings={realizedSavings}
              findingId={findingId}
              onRequestQuote={requestPartnerQuote}
              onGoToPurchase={goToPurchaseAtPartner}
              onConfirmPurchase={confirmPurchaseAtPartner}
              onKeepCurrent={keepCurrentOpportunity}
              onTalkToAdvisor={(opportunity) => openQuoteModal(opportunity, "broker")}
              onRemindLater={remindLaterOpportunity}
              onReactivate={reactivateOpportunity}
              onAddAdvisor={() => setModal("add-broker")}
              onStartReview={() => openQuoteModal(null, "partner")}
            />
          )}

          {view === "certificates" && (
            <CertificatesView
              contractors={data.contractors}
              coiSends={data.coiSends || []}
              policies={policies}
              onSend={openSend}
              onAdd={() => setModal("add-gc")}
              onEdit={openEdit}
            />
          )}

          {view === "documents" && (
            <DocumentsView
              documents={documents}
              policies={policies}
              extractions={pdfExtractions}
              onUpload={() => setModal("scan")}
              onDelete={deleteDocument}
              onExtracted={savePdfExtractions}
              onUpdateExtraction={updatePdfExtraction}
              onDeleteExtraction={deletePdfExtraction}
            />
          )}

          {view === "settings" && (
            <SettingsView
              company={company}
              data={data}
              settings={settings}
              totalPremium={totalPremium}
              onSaveSection={saveSettingsSection}
              onReset={resetDemo}
              onLoadSample={loadSampleData}
              onLogout={logoutUser}
            />
          )}
          {view === "connections" && (
            <ConnectionsView
              connections={carrierConnections}
              onConnect={connectCarrier}
              onDisconnect={disconnectCarrier}
              onSync={syncCarrier}
              onViewDocuments={() => setView("documents")}
            />
          )}
          </Suspense>
        </main>
      </div>

      <Suspense fallback={null}>
      {modal === "scan" && (
        <ScanModal
          onClose={() => setModal(null)}
          onSave={saveScannedDocument}
          existingPolicies={policies}
        />
      )}

      {modal === "add-policy" && (
        <AddPolicyModal
          brokers={data.brokers || []}
          defaultType={addPolicyType}
          onClose={() => {
            setModal(null);
            setAddPolicyType(null);
          }}
          onSave={addPolicy}
        />
      )}

      {modal === "send" && selectedContractor && (
        <SendModal
          contractors={data.contractors}
          policies={packagePolicies(policies)}
          allPolicies={policies}
          contractor={selectedContractor}
          project={project}
          newProject={newProject}
          onContractorChange={(id) => {
            const contractor = data.contractors.find((item) => item.id === id);
            setContractorId(id);
            setProject(contractor?.projects[0] || "");
          }}
          onProjectChange={setProject}
          onNewProjectChange={setNewProject}
          onClose={() => setModal(null)}
          onSend={sendPackage}
        />
      )}

      {modal === "quote" && (
        <QuoteRequestModal
          company={company}
          policies={policies}
          partners={data.partners || []}
          brokers={data.brokers || []}
          opportunity={quoteDefaults.opportunity}
          defaultPolicyId={quoteDefaults.defaultPolicyId}
          defaultRouteType={quoteDefaults.defaultRouteType}
          defaultPartnerId={quoteDefaults.defaultPartnerId}
          defaultBrokerId={quoteDefaults.defaultBrokerId}
          onClose={() => {
            setModal(null);
            setQuoteDefaults({});
          }}
          onSubmit={submitQuoteRequest}
        />
      )}

      {modal === "sent" && (
        <SuccessModal
          onClose={() => setModal(null)}
          contractor={lastSent?.contractor}
          project={lastSent?.project}
          onSendAnother={() => openSend(lastSent?.contractor)}
        />
      )}

      {modal === "add-gc" && (
        <AddGCModal onClose={() => setModal(null)} onSave={addContractor} />
      )}

      {modal === "add-broker" && (
        <AddBrokerModal onClose={() => setModal(null)} onSave={addBroker} />
      )}

      {modal === "edit" && editingContractor && (
        <EditHolderModal
          contractor={editingContractor}
          onClose={() => {
            setEditingContractor(null);
            setModal(null);
          }}
          onSave={updateContractor}
          onDelete={deleteContractor}
        />
      )}

      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          onNavigate={(target) => setView(target)}
          onAction={runPaletteAction}
          policies={policies}
          contractors={data.contractors}
          documents={documents}
        />
      )}
      </Suspense>

      {toast && (
        <div className={`ss-toast${toast.type && toast.type !== "default" ? ` ${toast.type}` : ""}`} role="status" aria-live="polite">
          <div>
            <b>{toast.title}</b>
            {toast.body && <small>{toast.body}</small>}
          </div>
        </div>
      )}
    </div>
  );
}

