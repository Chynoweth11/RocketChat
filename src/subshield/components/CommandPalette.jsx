import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Search,
  CornerDownLeft,
  LayoutDashboard,
  ShieldCheck,
  BadgeDollarSign,
  FileCheck2,
  FolderOpen,
  Settings,
  Upload,
  Plus,
} from "lucide-react";

const VIEW_ICONS = {
  dashboard: LayoutDashboard,
  policies: ShieldCheck,
  savings: BadgeDollarSign,
  certificates: FileCheck2,
  documents: FolderOpen,
  settings: Settings,
};

/**
 * Global command palette (Cmd/Ctrl+K). Lets users jump to any page, run key
 * actions, or search across policies, certificate holders, and documents from
 * a single keyboard-driven surface - no clicking through the sidebar.
 */
export default function CommandPalette({
  onClose,
  onNavigate,
  onAction,
  policies = [],
  contractors = [],
  documents = [],
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const listboxId = useId();
  const optionId = (index) => `${listboxId}-opt-${index}`;

  const commands = useMemo(() => {
    const navItems = [
      { id: "nav-dashboard", group: "Go to", label: "Dashboard", view: "dashboard" },
      { id: "nav-policies", group: "Go to", label: "Policies", view: "policies" },
      { id: "nav-savings", group: "Go to", label: "Savings", view: "savings" },
      { id: "nav-certificates", group: "Go to", label: "Certificates", view: "certificates" },
      { id: "nav-documents", group: "Go to", label: "Documents", view: "documents" },
      { id: "nav-settings", group: "Go to", label: "Settings", view: "settings" },
    ].map((item) => ({
      ...item,
      icon: VIEW_ICONS[item.view],
      run: () => onNavigate(item.view),
    }));

    const actionItems = [
      {
        id: "action-upload",
        group: "Actions",
        label: "Upload insurance document",
        icon: Upload,
        run: () => onAction("upload"),
      },
      {
        id: "action-add-policy",
        group: "Actions",
        label: "Add a policy",
        icon: Plus,
        run: () => onAction("add-policy"),
      },
      {
        id: "action-add-holder",
        group: "Actions",
        label: "Add certificate holder",
        icon: Plus,
        run: () => onAction("add-gc"),
      },
    ];

    const policyItems = policies.slice(0, 20).map((policy) => ({
      id: `policy-${policy.id}`,
      group: "Policies",
      label: policy.name,
      hint: policy.carrier,
      icon: ShieldCheck,
      keywords: `${policy.carrier} ${policy.policyNumber || ""} ${policy.policyType || ""}`,
      run: () => onAction("open-policy", policy.id),
    }));

    const holderItems = contractors.slice(0, 20).map((holder) => ({
      id: `holder-${holder.id}`,
      group: "Certificate holders",
      label: holder.name,
      hint: holder.email,
      icon: FileCheck2,
      keywords: `${holder.email} ${holder.contact || ""}`,
      run: () => onAction("open-holder", holder.id),
    }));

    const docItems = documents.slice(0, 20).map((doc) => ({
      id: `doc-${doc.id}`,
      group: "Documents",
      label: doc.name,
      hint: doc.carrier || doc.docType,
      icon: FolderOpen,
      keywords: `${doc.carrier || ""} ${doc.docType || ""}`,
      run: () => onAction("open-documents"),
    }));

    return [...navItems, ...actionItems, ...policyItems, ...holderItems, ...docItems];
  }, [policies, contractors, documents, onNavigate, onAction]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((command) => {
      const haystack = `${command.label} ${command.hint || ""} ${command.keywords || ""} ${command.group}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [commands, query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const node = listRef.current?.querySelector(`[data-index="${active}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      onClose();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((prev) => Math.max(prev - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const command = filtered[active];
      if (command) {
        command.run();
        onClose();
      }
    }
  }

  // Group results in display order while preserving the flat index for arrows.
  let runningIndex = -1;
  const groups = [];
  filtered.forEach((command) => {
    runningIndex += 1;
    const indexed = { ...command, _index: runningIndex };
    const existing = groups.find((group) => group.name === command.group);
    if (existing) existing.items.push(indexed);
    else groups.push({ name: command.group, items: [indexed] });
  });

  return (
    <div
      className="ss-cmd-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="ss-cmd" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="ss-cmd-search">
          <Search size={18} aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, policies, holders, documents..."
            aria-label="Search commands"
            role="combobox"
            aria-expanded={filtered.length > 0}
            aria-controls={listboxId}
            aria-activedescendant={filtered.length > 0 ? optionId(active) : undefined}
            aria-autocomplete="list"
          />
          <kbd className="ss-cmd-kbd">ESC</kbd>
        </div>

        <div className="ss-cmd-list" ref={listRef} role="listbox" id={listboxId} aria-label="Commands">
          {filtered.length === 0 && (
            <div className="ss-cmd-empty">No matches for &ldquo;{query}&rdquo;</div>
          )}

          {groups.map((group) => (
            <div className="ss-cmd-group" key={group.name} role="group" aria-label={group.name}>
              <div className="ss-cmd-group-label" aria-hidden="true">{group.name}</div>
              {group.items.map((command) => {
                const Icon = command.icon;
                return (
                  <button
                    key={command.id}
                    type="button"
                    id={optionId(command._index)}
                    role="option"
                    aria-selected={command._index === active}
                    data-index={command._index}
                    className={`ss-cmd-item ${command._index === active ? "active" : ""}`}
                    onMouseEnter={() => setActive(command._index)}
                    onClick={() => {
                      command.run();
                      onClose();
                    }}
                  >
                    {Icon && <Icon size={16} aria-hidden="true" />}
                    <span className="ss-cmd-item-label">{command.label}</span>
                    {command.hint && <span className="ss-cmd-item-hint">{command.hint}</span>}
                    {command._index === active && (
                      <CornerDownLeft size={14} className="ss-cmd-item-enter" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="ss-cmd-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
