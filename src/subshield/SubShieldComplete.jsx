import { useEffect, useMemo, useState } from "react";
import {
  countDocuments,
  dateFromToday,
  formatMoney,
  getComplianceScore,
  getNextRecommendedAction,
  getOpenQuoteRequests,
  getRenewalReminders,
  getUpcomingRenewals,
  makeId,
  normalizePolicies,
  normalizePolicy,
  normalizeQuoteRequest,
  normalizeSavingsOpportunity,
  packagePolicies,
  readStoredData,
  totalTrackedPremium,
  writeStoredData,
} from "./utils.js";
import { initialData } from "./data.js";
import { Header, Sidebar } from "./components/Layout.jsx";
import CommandCenterView from "./components/CommandCenterView.jsx";
import VaultView from "./components/VaultView.jsx";
import SavingsView from "./components/SavingsView.jsx";
import ContractorsView from "./components/ContractorsView.jsx";
import BrokersView from "./components/BrokersView.jsx";
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

function updateOpportunityStatus(opportunities, matcher, nextStatus, notes) {
  return opportunities.map((opportunity) => {
    if (!matcher(opportunity)) return opportunity;
    return {
      ...opportunity,
      status: nextStatus,
      notes: notes || opportunity.notes,
      updatedAt: new Date().toISOString(),
    };
  });
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
  const [lastSent, setLastSent] = useState(null);
  const [renewingId, setRenewingId] = useState(null);
  const [shoppingId, setShoppingId] = useState(null);
  const [toast, setToast] = useState(null);

  const company = data.company || initialData.company;
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
  const openQuoteRequests = useMemo(
    () => getOpenQuoteRequests(quoteRequests),
    [quoteRequests]
  );
  const settings = data.settings || initialData.settings;

  const score = useMemo(() => getComplianceScore(policies), [policies]);
  const docs = useMemo(() => countDocuments(policies), [policies]);
  const totalPremium = useMemo(() => totalTrackedPremium(policies), [policies]);
  const critical = useMemo(
    () => policies.filter((policy) => policy.daysRemaining <= 10),
    [policies]
  );
  const upcoming = useMemo(
    () => getUpcomingRenewals(policies, 5),
    [policies]
  );
  const reminders = useMemo(
    () => getRenewalReminders(policies),
    [policies]
  );
  const recommendedAction = useMemo(
    () =>
      getNextRecommendedAction({
        reminders,
        opportunities,
        openQuoteRequests,
      }),
    [reminders, opportunities, openQuoteRequests]
  );

  const selectedPolicy = policies.find((policy) => policy.id === policyId) || policies[0];
  const selectedContractor =
    data.contractors.find((contractor) => contractor.id === contractorId) ||
    data.contractors[0];

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
              statusNote: "Renewed and ready for routing.",
              updatedAt: new Date().toISOString(),
            }
          : item
      );

      const next = {
        ...data,
        policies: nextPolicies,
        savingsOpportunities: updateOpportunityStatus(
          opportunities,
          (opportunity) => opportunity.policyId === id,
          "monitoring",
          "Policy renewed. Continue monitoring market rates."
        ),
        activity: prependActivity(
          data.activity,
          `${policy.name} renewed`,
          `${policy.carrier} - active through ${renewalDate}.`
        ),
      };
      commit(next);
      setRenewingId(null);
      fireToast("Policy renewed", `${policy.name} is active for 365 days.`);
    }, 850);
  }

  function shopPolicy(id) {
    const policy = policies.find((item) => item.id === id);
    if (!policy || shoppingId) return;
    setShoppingId(id);
    setTimeout(() => {
      const savings = Math.min(520, Math.round((policy.premiumAmount || 0) * 0.18));
      const updatedPremium = Math.max(350, (policy.premiumAmount || 0) - savings);
      const nextPolicies = data.policies.map((item) =>
        item.id === id
          ? {
              ...item,
              carrier: "NEXT Insurance",
              premiumAmount: updatedPremium,
              premium: updatedPremium,
              statusNote: `Quoted and switched. Estimated savings: ${formatMoney(savings)}/yr.`,
              lastQuotedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : item
      );
      const next = {
        ...data,
        policies: nextPolicies,
        savingsOpportunities: updateOpportunityStatus(
          opportunities,
          (opportunity) => opportunity.policyId === id,
          "accepted",
          "Coverage moved to a lower premium option."
        ),
        activity: prependActivity(
          data.activity,
          `${policy.name} premium lowered`,
          `Switched to NEXT Insurance - saving ${formatMoney(savings)}/yr.`
        ),
      };
      commit(next);
      setShoppingId(null);
      fireToast("Lower rate secured", `Saving ${formatMoney(savings)}/yr on ${policy.name}.`);
    }, 1100);
  }

  function addPolicy(policyInput) {
    const normalized = normalizePolicy(policyInput, company.id);
    const exists = policies.some((policy) => policy.policyNumber === normalized.policyNumber);
    if (exists) {
      fireToast("Policy already exists", "This policy number is already in your wallet.");
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
              estimatedSavings: Math.round(normalized.premiumAmount * 0.1),
              renewalDate: normalized.renewalDate,
              status: normalized.daysRemaining <= 60 ? "available" : "monitoring",
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
        `${normalized.carrier} policy ${normalized.policyNumber} added to insurance wallet.`
      ),
    });
    setPolicyId(normalized.id);
    setModal(null);
    fireToast("Policy saved", `${normalized.name} added to your command center.`);
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
              statusNote: "Re-vaulted from a fresh carrier document.",
            }
          : policy
      );

      commit({
        ...data,
        policies: nextPolicies,
        activity: prependActivity(
          data.activity,
          `${normalizedDetected.name} re-vaulted`,
          `Updated ${normalizedDetected.carrier} documents for current compliance records.`
        ),
      });
      setPolicyId(existing.id);
      fireToast("Policy updated", `${normalizedDetected.name} refreshed from uploaded document.`);
    } else {
      const policy = { ...normalizedDetected, id: makeId(normalizedDetected.policyType) };
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
                  estimatedSavings: Math.round(policy.premiumAmount * 0.1),
                  renewalDate: policy.renewalDate,
                  status: policy.daysRemaining <= 60 ? "available" : "monitoring",
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
        activity: prependActivity(
          data.activity,
          `${policy.name} vaulted`,
          `Original ${policy.carrier} document added to verified insurance wallet.`
        ),
      });
      setPolicyId(policy.id);
      fireToast("Document vaulted", `${policy.name} added to your policy vault.`);
    }
    setModal(null);
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
    const nextOpportunities = updateOpportunityStatus(
      opportunities,
      (opportunity) =>
        opportunity.id === request.opportunityId || opportunity.policyId === request.policyId,
      request.routeType === "partner" ? "sent_to_partner" : "requested",
      `Quote request submitted to ${routeLabel}.`
    );

    commit({
      ...data,
      quoteRequests: [normalizedRequest, ...quoteRequests],
      savingsOpportunities: nextOpportunities,
      activity: prependActivity(
        data.activity,
        "Quote request submitted",
        `${policy?.name || "Policy"} routed to ${routeLabel} for rate review.`
      ),
    });

    setModal(null);
    setQuoteDefaults({});
    fireToast("Request submitted", `Coverage details sent to ${routeLabel}.`);
  }

  function updateOpportunity(opportunity, status, notes, toastTitle, toastBody) {
    const next = {
      ...data,
      savingsOpportunities: updateOpportunityStatus(
        opportunities,
        (item) => item.id === opportunity.id,
        status,
        notes
      ),
      activity: prependActivity(
        data.activity,
        `${opportunity.policyType} savings ${status.replace(/_/g, " ")}`,
        notes
      ),
    };
    commit(next);
    fireToast(toastTitle, toastBody);
  }

  function dismissOpportunity(opportunity) {
    updateOpportunity(
      opportunity,
      "dismissed",
      "User marked this opportunity as not interested.",
      "Opportunity dismissed",
      "SubShield will stop prompting this item."
    );
  }

  function remindLaterOpportunity(opportunity) {
    updateOpportunity(
      opportunity,
      "remind_later",
      "Reminder snoozed. SubShield will surface this again closer to renewal.",
      "Reminder snoozed",
      "This savings opportunity will reappear later."
    );
  }

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
      activity: prependActivity(
        data.activity,
        `COI sent to ${selectedContractor.name}`,
        `${finalProject} - ${packageDocCount} verified files routed to ${selectedContractor.email}.`
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
      fireToast(
        "Duplicate compliance email",
        "A GC with that email already exists. Edit the existing entry instead."
      );
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
        `${normalized.name} added to directory`,
        `${normalized.contact} - ${normalized.email}`
      ),
    });
    setContractorId(normalized.id);
    setProject(normalized.projects[0] || "");
    setModal(null);
    fireToast("GC saved", `${normalized.name} added to your directory.`);
  }

  function updateContractor(updated) {
    const email = updated.email.trim().toLowerCase();
    const emailConflict = data.contractors.some(
      (existing) =>
        existing.id !== updated.id && existing.email.trim().toLowerCase() === email
    );
    if (emailConflict) {
      fireToast("Duplicate compliance email", "That email is already used by another GC.");
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
        "Certificate holder and delivery details saved."
      ),
    });
    setEditingContractor(null);
    setModal(null);
    fireToast("GC updated", `${normalized.name} details saved.`);
  }

  function deleteContractor(id) {
    const removed = data.contractors.find((contractor) => contractor.id === id);
    commit({
      ...data,
      contractors: data.contractors.filter((contractor) => contractor.id !== id),
      activity: prependActivity(
        data.activity,
        `${removed?.name || "GC"} removed`,
        "Contractor removed from directory."
      ),
    });
    setEditingContractor(null);
    setModal(null);
    fireToast("GC removed", `${removed?.name || "Contractor"} removed.`);
  }

  function addBroker(broker) {
    const email = broker.email.trim().toLowerCase();
    const exists = (data.brokers || []).some(
      (item) => item.email.trim().toLowerCase() === email
    );
    if (exists) {
      fireToast("Duplicate partner email", "A review partner with that email already exists.");
      return;
    }

    const normalized = { ...broker, companyId: company.id };
    commit({
      ...data,
      brokers: [normalized, ...(data.brokers || [])],
      activity: prependActivity(
        data.activity,
        "Insurance review partner added",
        `${normalized.name} (${normalized.company}) added to the coverage and savings network.`
      ),
    });
    setModal(null);
    fireToast("Partner added", `${normalized.name} is ready for coverage review requests.`);
  }

  function saveSettingsSection(sectionKey, value, meta = {}) {
    const mergedSettings = {
      ...settings,
      [sectionKey]: value,
    };

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

    fireToast(
      meta.toastTitle || "Settings saved",
      meta.toastBody || "Your changes are now live."
    );
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

  function openSend(contractor) {
    if (!data.contractors.length) {
      setView("contractors");
      fireToast("No recipients saved", "Add a recipient before sending a COI package.");
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

  const existingTypes = policies.map((policy) => policy.policyType || policy.type);
  const availableSavingsCount = opportunities.filter((item) => item.status === "available").length;

  return (
    <div className="ss-app">
      <div className="ss-layout">
        <Sidebar
          view={view}
          setView={setView}
          docCount={docs}
          upcoming={upcoming}
          criticalCount={critical.length}
          savingsCount={availableSavingsCount}
          openQuoteCount={openQuoteRequests.length}
          onSend={() => openSend()}
        />

        <main className="ss-main">
          <Header
            view={view}
            onScan={() => setModal("scan")}
            onActivity={() => setView("activity")}
            unread={critical.length + reminders.length}
          />

          {view === "dashboard" && (
            <CommandCenterView
              score={score}
              policies={policies}
              docs={docs}
              contractors={data.contractors}
              upcoming={upcoming}
              reminders={reminders}
              opportunities={opportunities}
              openQuoteRequests={openQuoteRequests}
              coiSends={data.coiSends || []}
              totalPremium={totalPremium}
              recommendedAction={recommendedAction}
              onOpenSend={() => openSend()}
              onOpenQuote={(opportunity, routeType) => openQuoteModal(opportunity, routeType)}
              onOpenSavings={() => setView("savings")}
              onOpenVault={() => setView("vault")}
            />
          )}

          {view === "vault" && (
            <VaultView
              score={score}
              docs={docs}
              critical={critical}
              policies={policies}
              selectedPolicy={selectedPolicy}
              onSelectPolicy={setPolicyId}
              onRenew={renewPolicy}
              onShop={shopPolicy}
              onSend={() => openSend()}
              onScan={() => setModal("scan")}
              onAddPolicy={() => setModal("add-policy")}
              renewingId={renewingId}
              shoppingId={shoppingId}
            />
          )}

          {view === "savings" && (
            <SavingsView
              opportunities={opportunities}
              policies={policies}
              quoteRequests={quoteRequests}
              partners={data.partners || []}
              brokers={data.brokers || []}
              onCompareRates={(opportunity) => openQuoteModal(opportunity, "partner")}
              onSendToBroker={(opportunity) => openQuoteModal(opportunity, "broker")}
              onDismiss={dismissOpportunity}
              onRemindLater={remindLaterOpportunity}
            />
          )}

          {view === "contractors" && (
            <ContractorsView
              contractors={data.contractors}
              onSend={openSend}
              onAdd={() => setModal("add-gc")}
              onEdit={openEdit}
            />
          )}

          {view === "brokers" && (
            <BrokersView
              brokers={data.brokers || []}
              partners={data.partners || []}
              onAddBroker={() => setModal("add-broker")}
              onRequestBrokerQuote={(broker) =>
                openQuoteModal(
                  null,
                  "broker",
                  { defaultBrokerId: broker.id, defaultPolicyId: selectedPolicy?.id }
                )
              }
              onRequestPartnerQuote={(partner) =>
                openQuoteModal(
                  null,
                  "partner",
                  { defaultPartnerId: partner.id, defaultPolicyId: selectedPolicy?.id }
                )
              }
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
          onClose={() => setModal(null)}
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
