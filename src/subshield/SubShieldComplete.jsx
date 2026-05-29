import { useEffect, useMemo, useState } from "react";
import {
  countDocuments,
  dateFromToday,
  formatMoney,
  getComplianceScore,
  getUpcomingRenewals,
  makeId,
  packagePolicies,
  readStoredData,
  writeStoredData,
} from "./utils.js";
import { initialData } from "./data.js";
import { Header, Sidebar } from "./components/Layout.jsx";
import VaultView from "./components/VaultView.jsx";
import ContractorsView from "./components/ContractorsView.jsx";
import ActivityView from "./components/ActivityView.jsx";
import ProfileView from "./components/ProfileView.jsx";
import SendModal from "./components/SendModal.jsx";
import ScanModal from "./components/ScanModal.jsx";
import SuccessModal from "./components/SuccessModal.jsx";
import AddGCModal from "./components/AddGCModal.jsx";
import EditHolderModal from "./components/EditHolderModal.jsx";
import "./styles.css";


/* ---------- Helpers ---------- */

function prependActivity(activity, title, body) {
  return [
    { id: makeId("act"), title, body, time: "Just now", createdAt: new Date().toISOString() },
    ...activity,
  ].slice(0, 30);
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

const DEFAULT_PREFERENCES = {
  alerts: true,
  routing: true,
  autoshop: false,
};


/* ---------- Component ---------- */

export default function SubShieldComplete() {
  const [data, setData] = useState(() => readStoredData(initialData));
  const [view, setView] = useState("vault");
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
  const [lastSent, setLastSent] = useState(null);

  const [renewingId, setRenewingId] = useState(null);
  const [shoppingId, setShoppingId] = useState(null);

  const [toast, setToast] = useState(null);

  // Derived values
  const score = useMemo(() => getComplianceScore(data.policies), [data.policies]);
  const docs = useMemo(() => countDocuments(data.policies), [data.policies]);
  const critical = useMemo(
    () => data.policies.filter((p) => p.daysRemaining <= 10),
    [data.policies]
  );
  const upcoming = useMemo(
    () => getUpcomingRenewals(data.policies, 3),
    [data.policies]
  );
  const selectedPolicy =
    data.policies.find((p) => p.id === policyId) || data.policies[0];
  const selectedContractor =
    data.contractors.find((c) => c.id === contractorId) || data.contractors[0];
  const preferences = { ...DEFAULT_PREFERENCES, ...(data.preferences || {}) };

  // Keep selectors valid as data changes
  useEffect(() => {
    if (!data.policies.find((p) => p.id === policyId) && data.policies[0]) {
      setPolicyId(data.policies[0].id);
    }
  }, [data.policies, policyId]);

  useEffect(() => {
    if (
      !data.contractors.find((c) => c.id === contractorId) &&
      data.contractors[0]
    ) {
      setContractorId(data.contractors[0].id);
      setProject(data.contractors[0].projects[0] || "");
    }
  }, [data.contractors, contractorId]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);


  /* ---------- State commit ---------- */

  function commit(next) {
    setData(next);
    writeStoredData(next);
  }

  function fireToast(title, body) {
    setToast({ title, body });
  }


  /* ---------- Actions ---------- */

  function renewPolicy(id) {
    const policy = data.policies.find((p) => p.id === id);
    if (!policy || renewingId) return;
    setRenewingId(id);
    setTimeout(() => {
      const expires = dateFromToday(365);
      const next = {
        ...data,
        policies: data.policies.map((item) =>
          item.id === id
            ? {
                ...item,
                daysRemaining: 365,
                expires,
                statusNote: "Renewed and ready for routing.",
              }
            : item
        ),
        activity: prependActivity(
          data.activity,
          `${policy.name} renewed`,
          `${policy.carrier} · 365 days of coverage until ${expires}.`
        ),
      };
      commit(next);
      setRenewingId(null);
      fireToast("Policy renewed", `${policy.name} is active for 365 days.`);
    }, 900);
  }

  function shopPolicy(id) {
    const policy = data.policies.find((p) => p.id === id);
    if (!policy || shoppingId) return;
    setShoppingId(id);
    setTimeout(() => {
      const savings = Math.min(520, Math.round(policy.premium * 0.18));
      const expires = dateFromToday(365);
      const next = {
        ...data,
        policies: data.policies.map((item) =>
          item.id === id
            ? {
                ...item,
                carrier: "NEXT Insurance",
                premium: Math.max(350, item.premium - savings),
                daysRemaining: 365,
                expires,
                statusNote: `Quoted and switched. Estimated savings: ${formatMoney(
                  savings
                )}/yr.`,
              }
            : item
        ),
        activity: prependActivity(
          data.activity,
          `${policy.name} premium lowered`,
          `Switched to NEXT Insurance · saving ${formatMoney(savings)}/yr.`
        ),
      };
      commit(next);
      setShoppingId(null);
      fireToast(
        "Lower rate secured",
        `Saving ${formatMoney(savings)}/yr on ${policy.name}.`
      );
    }, 1100);
  }

  function vaultDocument(detected) {
    const existing = data.policies.find((p) => p.type === detected.id);
    const expires = dateFromToday(detected.daysRemaining);

    if (existing) {
      const next = {
        ...data,
        policies: data.policies.map((p) =>
          p.id === existing.id
            ? {
                ...p,
                carrier: detected.carrier,
                policyNumber: detected.policyNumber,
                daysRemaining: detected.daysRemaining,
                expires,
                limit: detected.limit,
                premium: detected.premium,
                statusNote: "Re-vaulted from a fresh carrier PDF.",
                documents: Array.from(
                  new Set([...(p.documents || []), ...detected.documents])
                ),
              }
            : p
        ),
        activity: prependActivity(
          data.activity,
          `${detected.name} re-vaulted`,
          `Replaced existing ${detected.carrier} PDF with the newer document.`
        ),
      };
      commit(next);
      setPolicyId(existing.id);
      fireToast("Policy updated", `${detected.name} replaced with the newer PDF.`);
    } else {
      const policy = {
        id: makeId(detected.id),
        type: detected.id,
        name: detected.name,
        carrier: detected.carrier,
        policyNumber: detected.policyNumber,
        daysRemaining: detected.daysRemaining,
        premium: detected.premium,
        limit: detected.limit,
        expires,
        statusNote: "Newly vaulted from original carrier-issued PDF.",
        documents: [...detected.documents],
      };
      const next = {
        ...data,
        policies: [...data.policies, policy],
        activity: prependActivity(
          data.activity,
          `${detected.name} vaulted`,
          `Original ${detected.carrier} PDF added to the verified vault.`
        ),
      };
      commit(next);
      setPolicyId(policy.id);
      fireToast(
        "Document vaulted",
        `${detected.name} added to your vault.`
      );
    }
    setModal(null);
  }

  function sendPackage() {
    if (!selectedContractor) return;
    const finalProject = normalizeProjectName(newProject) || normalizeProjectName(project);
    if (!finalProject) {
      fireToast("Project name required", "Pick or type a project before sending.");
      return;
    }

    const packageDocCount = countDocuments(packagePolicies(data.policies));
    const contractors = data.contractors.map((contractor) => {
      if (
        contractor.id !== selectedContractor.id
      ) {
        return { ...contractor, projects: normalizeProjects(contractor.projects) };
      }
      return {
        ...contractor,
        projects: addProjectIfMissing(contractor.projects, finalProject),
      };
    });

    const next = {
      ...data,
      contractors,
      activity: prependActivity(
        data.activity,
        `COI sent to ${selectedContractor.name}`,
        `${finalProject} · ${packageDocCount} verified files routed to ${selectedContractor.email}.`
      ),
    };
    commit(next);
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
    };

    const next = {
      ...data,
      contractors: [normalized, ...data.contractors],
      activity: prependActivity(
        data.activity,
        `${normalized.name} added to directory`,
        `${normalized.contact} · ${normalized.email}`
      ),
    };
    commit(next);
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
      fireToast(
        "Duplicate compliance email",
        "That email is already used by another GC."
      );
      return;
    }

    const normalized = {
      ...updated,
      projects: normalizeProjects(updated.projects),
    };

    const next = {
      ...data,
      contractors: data.contractors.map((c) =>
        c.id === normalized.id ? { ...c, ...normalized } : c
      ),
      activity: prependActivity(
        data.activity,
        `${normalized.name} updated`,
        `Certificate holder and details saved.`
      ),
    };
    commit(next);
    setEditingContractor(null);
    setModal(null);
    fireToast("GC updated", `${normalized.name} details saved.`);
  }

  function deleteContractor(id) {
    const removed = data.contractors.find((c) => c.id === id);
    const next = {
      ...data,
      contractors: data.contractors.filter((c) => c.id !== id),
      activity: prependActivity(
        data.activity,
        `${removed?.name || "GC"} removed`,
        "Contractor removed from directory."
      ),
    };
    commit(next);
    setEditingContractor(null);
    setModal(null);
    fireToast("GC removed", `${removed?.name || "Contractor"} removed.`);
  }

  function resetDemo() {
    commit(initialData);
    setPolicyId(initialData.policies[0].id);
    setContractorId(initialData.contractors[0].id);
    setProject(initialData.contractors[0].projects[0]);
    setNewProject("");
    setModal(null);
    setEditingContractor(null);
    fireToast("Demo reset", "Local data restored to the seed state.");
  }

  function togglePreference(key) {
    if (!(key in DEFAULT_PREFERENCES)) return;
    const nextValue = !preferences[key];
    const labels = {
      alerts: "Renewal alerts",
      routing: "Verified COI routing",
      autoshop: "Auto-shop better rates",
    };

    const next = {
      ...data,
      preferences: {
        ...preferences,
        [key]: nextValue,
      },
      activity: prependActivity(
        data.activity,
        `${labels[key]} ${nextValue ? "enabled" : "disabled"}`,
        "Profile settings updated."
      ),
    };
    commit(next);
    fireToast("Setting saved", `${labels[key]} ${nextValue ? "enabled" : "disabled"}.`);
  }


  /* ---------- Modal openers ---------- */

  function openSend(contractor) {
    if (!data.contractors.length) {
      setView("contractors");
      fireToast(
        "No GCs saved",
        "Add a general contractor before sending a COI package."
      );
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


  /* ---------- Render ---------- */

  const existingTypes = data.policies.map((p) => p.type);

  return (
    <div className="ss-app">
      <div className="ss-layout">
        <Sidebar
          view={view}
          setView={setView}
          docCount={docs}
          upcoming={upcoming}
          criticalCount={critical.length}
          onSend={() => openSend()}
        />

        <main className="ss-main">
          <Header
            view={view}
            onScan={() => setModal("scan")}
            onActivity={() => setView("activity")}
            unread={critical.length}
          />

          {view === "vault" && (
            <VaultView
              score={score}
              docs={docs}
              critical={critical}
              policies={data.policies}
              selectedPolicy={selectedPolicy}
              onSelectPolicy={setPolicyId}
              onRenew={renewPolicy}
              onShop={shopPolicy}
              onSend={() => openSend()}
              onScan={() => setModal("scan")}
              renewingId={renewingId}
              shoppingId={shoppingId}
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

          {view === "activity" && <ActivityView activity={data.activity} />}

          {view === "profile" && (
            <ProfileView
              data={data}
              settings={preferences}
              onToggleSetting={togglePreference}
              onReset={resetDemo}
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

      {modal === "send" && selectedContractor && (
        <SendModal
          contractors={data.contractors}
          policies={packagePolicies(data.policies)}
          contractor={selectedContractor}
          project={project}
          newProject={newProject}
          onContractorChange={(id) => {
            const contractor = data.contractors.find((c) => c.id === id);
            setContractorId(id);
            setProject(contractor?.projects[0] || "");
          }}
          onProjectChange={setProject}
          onNewProjectChange={setNewProject}
          onClose={() => setModal(null)}
          onSend={sendPackage}
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
