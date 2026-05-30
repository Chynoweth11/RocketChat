import { useEffect, useMemo, useState } from "react";
import {
  countDocuments,
  dateFromToday,
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
  readStoredData,
  savingsForOpportunity,
  totalTrackedPremium,
  writeStoredData,
} from "./utils.js";
import { initialData } from "./data.js";
import { Header, Sidebar } from "./components/Layout.jsx";
import DashboardView from "./components/DashboardView.jsx";
import PoliciesView from "./components/PoliciesView.jsx";
import SavingsView from "./components/SavingsView.jsx";
import CertificatesView from "./components/CertificatesView.jsx";
import DocumentsView from "./components/DocumentsView.jsx";
import ActivityView from "./components/ActivityView.jsx";
import SettingsView from "./components/SettingsView.jsx";
import SendModal from "./components/SendModal.jsx";
import ScanModal from "./components/ScanModal.jsx";
import SuccessModal from "./components/SuccessModal.jsx";
import AddGCModal from "./components/AddGCModal.jsx";
import EditHolderModal from "./components/EditHolderModal.jsx";
import AddPolicyModal from "./components/AddPolicyModal.jsx";
import AddBrokerModal from "./components/AddBrokerModal.jsx";
import QuoteRequestModal from "./components/QuoteRequestModal.jsx";
import "./styles.css";

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

export default function SubShieldComplete() {
  const [data, setData] = useState(() => readStoredData(initialData));
  const [view, setView] = useState("dashboard");
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

  const company = data.company || initialData.company;
  const settings = data.settings || initialData.settings;
  const firstName = settings.userProfile?.firstName || "";

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
  const openQuoteRequests = useMemo(
    () => getOpenQuoteRequests(quoteRequests),
    [quoteRequests]
  );

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

  function commit(next) {
    setData(next);
    writeStoredData(next);
  }

  function fireToast(title, body) {
    setToast({ title, body });
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
          `${policy.carrier} — active through ${renewalDate}.`
        ),
      });
      setRenewingId(null);
      fireToast("Policy renewed", `${policy.name} is active for 365 days.`);
    }, 850);
  }

  function addPolicy(policyInput) {
    const normalized = normalizePolicy(policyInput, company.id);
    const exists = policies.some((policy) => policy.policyNumber === normalized.policyNumber);
    if (exists) {
      fireToast("Policy already exists", "This policy number is already tracked.");
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
              estimatedSavings: Math.round(normalized.premiumAmount * 0.12),
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
    fireToast("Policy saved", `${normalized.name} added. We'll watch it for savings.`);
  }

  function vaultDocument(detected) {
    const existing = policies.find((policy) => policy.policyType === detected.policyType);
    const normalizedDetected = normalizePolicy(
      {
        ...detected,
        renewalDate: detected.renewalDate || dateFromToday(detected.daysRemaining || 365),
      },
      company.id
    );

    const targetId = existing ? existing.id : normalizedDetected.id;
    const documentRecord = normalizeDocument({
      name: `${normalizedDetected.name} Declarations`,
      docType: "declaration",
      policyId: targetId,
      policyType: normalizedDetected.policyType,
      carrier: normalizedDetected.carrier,
      status: "verified",
      addedBy: firstName || "You",
    });

    if (existing) {
      const nextPolicies = data.policies.map((policy) =>
        policy.id === existing.id
          ? {
              ...policy,
              ...normalizedDetected,
              id: existing.id,
              documents: Array.from(
                new Set([...(policy.documents || []), ...normalizedDetected.documents])
              ),
              statusNote: "Refreshed from a new carrier document.",
            }
          : policy
      );

      commit({
        ...data,
        policies: nextPolicies,
        documents: [documentRecord, ...(data.documents || [])],
        activity: prependActivity(
          data.activity,
          `${normalizedDetected.name} updated`,
          `Refreshed ${normalizedDetected.carrier} documents.`
        ),
      });
      setPolicyId(existing.id);
      fireToast("Policy updated", `${normalizedDetected.name} refreshed from your upload.`);
    } else {
      const policy = { ...normalizedDetected, id: targetId };
      const nextPolicies = [...data.policies, policy];
      const nextOpportunities =
        policy.policyType === "license"
          ? opportunities
          : [
              normalizeSavingsOpportunity(
                {
                  policyId: policy.id,
                  policyType: policy.policyType,
                  currentCarrier: policy.carrier,
                  currentPremium: policy.premiumAmount,
                  estimatedSavings: Math.round(policy.premiumAmount * 0.12),
                  renewalDate: policy.renewalDate,
                  status: policy.daysRemaining <= 90 ? "available" : "monitoring",
                },
                nextPolicies,
                company.id
              ),
              ...opportunities,
            ];

      commit({
        ...data,
        policies: nextPolicies,
        savingsOpportunities: nextOpportunities,
        documents: [documentRecord, ...(data.documents || [])],
        activity: prependActivity(
          data.activity,
          `${policy.name} uploaded`,
          `${policy.carrier} document added and filed in your document center.`
        ),
      });
      setPolicyId(policy.id);
      fireToast("Insurance uploaded", `${policy.name} added — checking for savings.`);
    }
    setModal(null);
  }

  /* ---------- Savings ---------- */

  function findBetterRate(opportunity) {
    if (findingId) return;
    setFindingId(opportunity.id);
    setTimeout(() => {
      const policy = policies.find((item) => item.id === opportunity.policyId);
      const base = opportunity.currentPremium || policy?.premiumAmount || 0;
      const est = opportunity.estimatedSavings || Math.round(base * 0.12);
      const newPremium = Math.max(200, base - est);
      const savings = base - newPremium;
      const partner =
        data.partners.find((p) => p.id === opportunity.partnerId && p.active) ||
        data.partners.find(
          (p) => p.active && p.policyTypes?.includes(opportunity.policyType)
        ) ||
        data.partners.find((p) => p.active);

      const alternateQuote = {
        partnerId: partner?.id || null,
        partnerName: partner?.name || "Licensed partner",
        carrier: partner?.name || "Licensed partner",
        premium: newPremium,
        deductible: policy?.deductible ?? null,
        coverageLimits: policy?.coverageLimits || "",
        amRating: partner?.amRating || "A (Excellent)",
        bindableUntil: dateFromToday(14),
        highlights: [
          "Comparable coverage and limits",
          `${formatMoney(savings)}/yr lower premium`,
          "No coverage gap when you switch",
        ],
      };

      const quoteDoc = normalizeDocument({
        name: `${policy?.name || policyLabelFromType(opportunity.policyType)} Quote — ${alternateQuote.carrier}`,
        docType: "quote",
        policyId: opportunity.policyId,
        policyType: opportunity.policyType,
        carrier: alternateQuote.carrier,
        status: "pending",
        addedBy: "SubShield",
      });

      const quoteRequest = normalizeQuoteRequest(
        {
          policyId: opportunity.policyId,
          partnerId: partner?.id || null,
          routeType: "partner",
          status: "quote_received",
          submittedAt: new Date().toISOString(),
          respondedAt: new Date().toISOString(),
          notes: `Auto-shopped — ${formatMoney(savings)}/yr below current premium.`,
        },
        company.id
      );

      commit({
        ...data,
        savingsOpportunities: patchOpportunity(opportunities, opportunity.id, {
          status: "quote_received",
          alternateQuote,
          partnerId: partner?.id || opportunity.partnerId,
        }),
        quoteRequests: [quoteRequest, ...quoteRequests],
        documents: [quoteDoc, ...(data.documents || [])],
        activity: prependActivity(
          data.activity,
          `Better ${policyLabelFromType(opportunity.policyType)} rate found`,
          `${alternateQuote.carrier} quoted ${formatMoney(newPremium)}/yr — saving ${formatMoney(savings)}/yr.`
        ),
      });
      setFindingId(null);
      fireToast("Better rate found", `Save ${formatMoney(savings)}/yr — review the comparison.`);
    }, 1100);
  }

  function acceptQuote(opportunity) {
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
            statusNote: `Switched to ${quote.carrier} — saving ${formatMoney(savings)}/yr.`,
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
        `Switched ${policy?.name || "policy"} to ${quote.carrier}`,
        `Now saving ${formatMoney(savings)}/yr. SubShield is handling the paperwork.`
      ),
    });
    fireToast("Coverage switched", `You're saving ${formatMoney(savings)}/yr.`);
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
            status: request.routeType === "partner" ? "sent_to_partner" : "requested",
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
      fireToast("Project name required", "Pick or type a project before sending.");
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
      name: `COI — ${finalProject} (${selectedContractor.name})`,
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
        `${finalProject} — ${packageDocCount} verified files to ${selectedContractor.email}.`
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
      fireToast("Duplicate email", "A holder with that email already exists. Edit it instead.");
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
        `${normalized.contact} — ${normalized.email}`
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
      fireToast("Duplicate email", "That email is already used by another holder.");
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
      fireToast("Duplicate advisor", "An advisor with that email already exists.");
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

  function resetDemo() {
    commit(initialData);
    setView("dashboard");
    setPolicyId(initialData.policies[0].id);
    setContractorId(initialData.contractors[0].id);
    setProject(initialData.contractors[0].projects[0]);
    setNewProject("");
    setModal(null);
    setEditingContractor(null);
    setQuoteDefaults({});
    fireToast("Demo reset", "Local data restored to the seed state.");
  }

  /* ---------- Navigation helpers ---------- */

  function openSend(contractor) {
    if (!data.contractors.length) {
      setView("certificates");
      fireToast("No holders saved", "Add a certificate holder before sending.");
      return;
    }
    if (contractor) {
      setContractorId(contractor.id);
      setProject(contractor.projects[0] || "");
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
      findBetterRate(opportunity);
    }
  }

  const existingTypes = policies.map((policy) => policy.policyType || policy.type);

  return (
    <div className="ss-app">
      <div className="ss-layout">
        <Sidebar
          view={view}
          setView={setView}
          upcoming={upcoming}
          potentialSavings={potentialSavings}
          savingsCount={availableSavingsCount}
          onReviewSavings={() => setView("savings")}
        />

        <main className="ss-main">
          <Header
            view={view}
            onUpload={() => setModal("scan")}
            onActivity={() => setView("activity")}
            unread={critical.length + reminders.length}
          />

          {view === "dashboard" && (
            <DashboardView
              firstName={firstName}
              totalPremium={totalPremium}
              potentialSavings={potentialSavings}
              realizedSavings={realizedSavings}
              policies={policies}
              docsCount={docs}
              upcoming={upcoming}
              reminders={reminders}
              opportunities={opportunities}
              openQuoteRequests={openQuoteRequests}
              coiSends={data.coiSends || []}
              coverageGaps={coverageGaps}
              missingDocuments={missingDocuments}
              recommendedAction={recommendedAction}
              onReviewSavings={() => setView("savings")}
              onOpenPolicies={() => setView("policies")}
              onAddCoverage={openAddPolicy}
              onUpload={() => setModal("scan")}
              onQueueAction={(target) => setView(target)}
            />
          )}

          {view === "policies" && (
            <PoliciesView
              score={score}
              docs={docs}
              critical={critical}
              policies={policies}
              totalPremium={totalPremium}
              selectedPolicy={selectedPolicy}
              onSelectPolicy={setPolicyId}
              onRenew={renewPolicy}
              onSend={() => openSend()}
              onUpload={() => setModal("scan")}
              onAddPolicy={() => openAddPolicy()}
              onFindSavings={findSavingsForPolicy}
              renewingId={renewingId}
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
              onFindBetterRate={findBetterRate}
              onAcceptQuote={acceptQuote}
              onKeepCurrent={keepCurrentOpportunity}
              onTalkToAdvisor={(opportunity) => openQuoteModal(opportunity, "broker")}
              onRemindLater={remindLaterOpportunity}
              onReactivate={reactivateOpportunity}
              onAddAdvisor={() => setModal("add-broker")}
            />
          )}

          {view === "certificates" && (
            <CertificatesView
              contractors={data.contractors}
              coiSends={data.coiSends || []}
              onSend={openSend}
              onAdd={() => setModal("add-gc")}
              onEdit={openEdit}
            />
          )}

          {view === "documents" && (
            <DocumentsView
              documents={documents}
              policies={policies}
              onUpload={() => setModal("scan")}
              onDelete={deleteDocument}
            />
          )}

          {view === "activity" && <ActivityView activity={data.activity} />}

          {view === "settings" && (
            <SettingsView
              company={company}
              data={data}
              settings={settings}
              totalPremium={totalPremium}
              onSaveSection={saveSettingsSection}
              onReset={resetDemo}
              onLogout={logoutUser}
            />
          )}
        </main>
      </div>

      {modal === "scan" && (
        <ScanModal
          onClose={() => setModal(null)}
          onVault={vaultDocument}
          existingTypes={existingTypes}
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

      {toast && (
        <div className="ss-toast" role="status" aria-live="polite">
          <div>
            <b>{toast.title}</b>
            {toast.body && <small>{toast.body}</small>}
          </div>
        </div>
      )}
    </div>
  );
}
