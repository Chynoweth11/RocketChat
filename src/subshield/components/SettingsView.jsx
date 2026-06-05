import { useMemo, useState } from "react";
import {
  Bell,
  Building2,
  Database,
  FileText,
  HelpCircle,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Search,
  ShieldCheck,
  Users,
  UserCircle2,
} from "lucide-react";
import { formatLongDate, formatMoney, makeId } from "../utils.js";
import { Section } from "./Layout.jsx";

const SETTINGS_GROUPS = [
  {
    label: "Profile and workspace",
    tabs: [
      {
        id: "profile",
        label: "User Profile",
        icon: UserCircle2,
        description: "Identity, role, and profile details used across the app.",
      },
      {
        id: "account",
        label: "Account Settings",
        icon: Lock,
        description: "Workspace defaults, formatting, and account preferences.",
      },
      {
        id: "company",
        label: "Company Profile",
        icon: Building2,
        description: "Business details used in insurance documents and requests.",
      },
    ],
  },
  {
    label: "Communication",
    tabs: [
      {
        id: "notifications",
        label: "Notifications",
        icon: Bell,
        description: "Renewal, compliance, and activity alert controls.",
      },
      {
        id: "email",
        label: "Email Preferences",
        icon: Mail,
        description: "Delivery behavior, signatures, and digest settings.",
      },
      {
        id: "templates",
        label: "Email Templates",
        icon: Mail,
        description: "Default COI and coverage review message templates.",
      },
      {
        id: "support",
        label: "Support / Help",
        icon: HelpCircle,
        description: "Preferred support channels and help resources.",
      },
    ],
  },
  {
    label: "Security and access",
    tabs: [
      {
        id: "security",
        label: "Security & Password",
        icon: ShieldCheck,
        description: "MFA, session, and password protection settings.",
      },
      {
        id: "team",
        label: "Team Members",
        icon: Users,
        description: "Invite and manage internal users.",
      },
      {
        id: "roles",
        label: "Roles & Permissions",
        icon: KeyRound,
        description: "Role access for policies, sends, documents, and settings.",
      },
      {
        id: "privacy",
        label: "Privacy",
        icon: ShieldCheck,
        description: "Data sharing and analytics consent options.",
      },
      {
        id: "data",
        label: "Data & Storage",
        icon: Database,
        description: "Storage quotas, retention, and backup preferences.",
      },
    ],
  },
  {
    label: "Workspace operations",
    tabs: [
      {
        id: "subscription",
        label: "Subscription",
        icon: FileText,
        description: "Workspace plan, seats, and renewal settings.",
      },
      {
        id: "documents",
        label: "Document Preferences",
        icon: FileText,
        description: "Verification requirements and default filing behavior.",
      },
      {
        id: "logout",
        label: "Logout",
        icon: LogOut,
        description: "Sign out or reset sandbox data safely.",
      },
    ],
  },
];
const SETTINGS_TABS = SETTINGS_GROUPS.flatMap((group) => group.tabs);

const PERMISSION_LABELS = {
  vault: "Manage policy vault",
  sendCoi: "Send COI packages",
  manageSettings: "Edit settings",
  manageUsers: "Manage users",
  manageSubscription: "Manage subscription",
  requestQuotes: "Request quotes",
};

const TZ_OPTIONS = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
];

const DIGEST_OPTIONS = ["daily", "weekly", "monthly", "off"];

const DIGEST_LABELS = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  off: "Off",
};

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function isHttpUrl(value) {
  if (!value) return true;
  return /^https?:\/\/[\w.-]+(?:\/[\w\-./?%&=]*)?$/i.test(String(value).trim());
}

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinCsv(list = []) {
  return Array.isArray(list) ? list.join(", ") : "";
}

function summaryData(data, totalPremium) {
  return {
    policies: data.policies?.length || 0,
    docs: data.policies?.reduce((sum, policy) => sum + (policy.documents?.length || 0), 0) || 0,
    contractors: data.contractors?.length || 0,
    teamMembers: data.settings?.teamMembers?.length || 0,
    totalPremium,
  };
}

export default function SettingsView({
  company,
  settings,
  data,
  totalPremium,
  onSaveSection,
  onReset,
  onLogout,
}) {
  const [activeTab, setActiveTab] = useState("profile");
  const [tabQuery, setTabQuery] = useState("");
  const summary = useMemo(() => summaryData(data, totalPremium), [data, totalPremium]);
  const activeTabMeta = SETTINGS_TABS.find((tab) => tab.id === activeTab) || SETTINGS_TABS[0];
  const filteredGroups = useMemo(() => {
    const query = tabQuery.trim().toLowerCase();
    if (!query) return SETTINGS_GROUPS;
    return SETTINGS_GROUPS.map((group) => ({
      ...group,
      tabs: group.tabs.filter(
        (tab) =>
          tab.label.toLowerCase().includes(query) ||
          tab.description.toLowerCase().includes(query)
      ),
    })).filter((group) => group.tabs.length > 0);
  }, [tabQuery]);

  return (
    <div className="ss-settings-layout">
      <aside className="ss-card ss-settings-nav-card">
        <div className="ss-settings-identity">
          <div
            className="ss-avatar"
            style={{ background: settings.userProfile.avatarColor || "#2563eb", color: "#fff" }}
          >
            {`${settings.userProfile.firstName?.[0] || ""}${settings.userProfile.lastName?.[0] || ""}`.toUpperCase() || "SS"}
          </div>
          <h2>{company?.name || "SubShield Company"}</h2>
          <p className="ss-muted">
            {settings.userProfile.jobTitle || "Account Owner"} - {company?.state || "N/A"}
          </p>
        </div>

        <div className="ss-settings-summary">
          <Stat label="Policies" value={summary.policies} />
          <Stat label="Documents" value={summary.docs} />
          <Stat label="Recipients" value={summary.contractors} />
          <Stat label="Users" value={summary.teamMembers} />
          <Stat label="Tracked Premium" value={`${formatMoney(summary.totalPremium)}/yr`} />
        </div>

        <label className="ss-settings-search">
          <Search size={15} />
          <input
            type="search"
            value={tabQuery}
            onChange={(event) => setTabQuery(event.target.value)}
            placeholder="Jump to a setting..."
            aria-label="Search settings sections"
          />
        </label>

        <nav className="ss-settings-nav-groups" aria-label="Settings tabs">
          {filteredGroups.map((group) => (
            <div key={group.label} className="ss-settings-group">
              <p className="ss-settings-group-label">{group.label}</p>
              <div className="ss-settings-tabs">
                {group.tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      type="button"
                      key={tab.id}
                      className={`ss-settings-tab ${activeTab === tab.id ? "active" : ""}`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <Icon size={16} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {filteredGroups.length === 0 && (
            <p className="ss-muted" style={{ margin: 0 }}>
              No settings match your search.
            </p>
          )}
        </nav>
      </aside>

      <div className="ss-settings-main">
        <section className="ss-card ss-settings-context">
          <span className="ss-eyebrow">Current section</span>
          <h2>{activeTabMeta.label}</h2>
          <p>{activeTabMeta.description}</p>
        </section>

        {activeTab === "profile" && (
          <ProfileSettings
            initial={settings.userProfile}
            onSave={(next, info) => onSaveSection("userProfile", next, info)}
          />
        )}

        {activeTab === "account" && (
          <AccountSettings
            initial={settings.account}
            onSave={(next, info) => onSaveSection("account", next, info)}
          />
        )}

        {activeTab === "company" && (
          <CompanyProfileSettings
            initial={settings.companyProfile}
            onSave={(next, info) => onSaveSection("companyProfile", next, info)}
          />
        )}

        {activeTab === "notifications" && (
          <NotificationSettings
            initial={settings.notifications}
            onSave={(next, info) => onSaveSection("notifications", next, info)}
          />
        )}

        {activeTab === "email" && (
          <EmailSettings
            initial={settings.emailPreferences}
            onSave={(next, info) => onSaveSection("emailPreferences", next, info)}
          />
        )}

        {activeTab === "security" && (
          <SecuritySettings
            security={settings.security}
            password={settings.password}
            onSaveSecurity={(next, info) => onSaveSection("security", next, info)}
            onUpdatePassword={(next, info) => onSaveSection("password", next, info)}
          />
        )}

        {activeTab === "team" && (
          <TeamSettings
            initial={settings.teamMembers}
            roleOptions={settings.roles}
            onSave={(next, info) => onSaveSection("teamMembers", next, info)}
          />
        )}

        {activeTab === "roles" && (
          <RoleSettings
            initial={settings.roles}
            onSave={(next, info) => onSaveSection("roles", next, info)}
          />
        )}

        {activeTab === "subscription" && (
          <SubscriptionSettings
            subscription={settings.subscription}
            onSaveSubscription={(next, info) => onSaveSection("subscription", next, info)}
          />
        )}

        {activeTab === "documents" && (
          <DocumentSettings
            initial={settings.documentPreferences}
            onSave={(next, info) => onSaveSection("documentPreferences", next, info)}
          />
        )}

        {activeTab === "templates" && (
          <TemplateSettings
            initial={settings.emailTemplates}
            onSave={(next, info) => onSaveSection("emailTemplates", next, info)}
          />
        )}

        {activeTab === "privacy" && (
          <PrivacySettings
            initial={settings.privacy}
            onSave={(next, info) => onSaveSection("privacy", next, info)}
          />
        )}

        {activeTab === "data" && (
          <DataSettings
            initial={settings.dataStorage}
            onSave={(next, info) => onSaveSection("dataStorage", next, info)}
          />
        )}

        {activeTab === "support" && (
          <SupportSettings
            initial={settings.support}
            onSave={(next, info) => onSaveSection("support", next, info)}
          />
        )}

        {activeTab === "logout" && <LogoutSettings onLogout={onLogout} onReset={onReset} />}
      </div>
    </div>
  );
}

function ProfileSettings({ initial, onSave }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});

  function submit() {
    const nextErrors = {};
    if (!form.firstName?.trim()) nextErrors.firstName = "First name is required.";
    if (!form.lastName?.trim()) nextErrors.lastName = "Last name is required.";
    if (!form.timezone?.trim()) nextErrors.timezone = "Timezone is required.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    onSave(form, {
      activityTitle: "User profile updated",
      activityBody: "User identity and contact details were saved.",
      toastTitle: "Profile saved",
      toastBody: "Your user profile changes are live.",
    });
  }

  return (
    <section className="ss-card">
      <Section title="User Profile" sub="Manage your personal identity, role, and contact details." />
      <div className="ss-field-grid">
        <Field
          label="First Name"
          value={form.firstName}
          error={errors.firstName}
          onChange={(value) => setForm((prev) => ({ ...prev, firstName: value }))}
        />
        <Field
          label="Last Name"
          value={form.lastName}
          error={errors.lastName}
          onChange={(value) => setForm((prev) => ({ ...prev, lastName: value }))}
        />
      </div>
      <div className="ss-field-grid">
        <Field
          label="Job Title"
          value={form.jobTitle}
          onChange={(value) => setForm((prev) => ({ ...prev, jobTitle: value }))}
        />
        <Field
          label="Phone"
          value={form.phone}
          onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))}
        />
      </div>
      <div className="ss-field-grid">
        <SelectField
          label="Timezone"
          value={form.timezone}
          error={errors.timezone}
          options={TZ_OPTIONS.map((option) => ({ value: option, label: option }))}
          onChange={(value) => setForm((prev) => ({ ...prev, timezone: value }))}
        />
        <Field
          label="Avatar Accent Color"
          value={form.avatarColor}
          placeholder="#2563eb"
          onChange={(value) => setForm((prev) => ({ ...prev, avatarColor: value }))}
        />
      </div>
      <div className="ss-footer">
        <span className="ss-footer-info">Used in activity trails, approvals, and emails.</span>
        <button type="button" className="ss-button" onClick={submit}>
          Save profile
        </button>
      </div>
    </section>
  );
}

function AccountSettings({ initial, onSave }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});

  function submit() {
    const nextErrors = {};
    if (!form.workspaceName?.trim()) nextErrors.workspaceName = "Workspace name is required.";
    if (!isEmail(form.loginEmail)) nextErrors.loginEmail = "Enter a valid login email.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    onSave(form, {
      activityTitle: "Account settings updated",
      activityBody: "Workspace settings and account defaults were saved.",
      toastTitle: "Account saved",
      toastBody: "Account settings updated successfully.",
    });
  }

  return (
    <section className="ss-card">
      <Section title="Account Settings" sub="Control workspace defaults and regional formatting." />
      <Field
        label="Workspace Name"
        value={form.workspaceName}
        error={errors.workspaceName}
        onChange={(value) => setForm((prev) => ({ ...prev, workspaceName: value }))}
      />
      <Field
        label="Login Email"
        value={form.loginEmail}
        error={errors.loginEmail}
        onChange={(value) => setForm((prev) => ({ ...prev, loginEmail: value }))}
      />
      <div className="ss-field-grid">
        <SelectField
          label="Language"
          value={form.language}
          options={[
            { value: "en-US", label: "English (US)" },
            { value: "en-CA", label: "English (Canada)" },
            { value: "es-US", label: "Spanish (US)" },
          ]}
          onChange={(value) => setForm((prev) => ({ ...prev, language: value }))}
        />
        <SelectField
          label="Date Format"
          value={form.dateFormat}
          options={[
            { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
            { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
            { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
          ]}
          onChange={(value) => setForm((prev) => ({ ...prev, dateFormat: value }))}
        />
      </div>
      <SelectField
        label="Time Format"
        value={form.timeFormat}
        options={[
          { value: "12h", label: "12-hour" },
          { value: "24h", label: "24-hour" },
        ]}
        onChange={(value) => setForm((prev) => ({ ...prev, timeFormat: value }))}
      />
      <div className="ss-footer">
        <span className="ss-footer-info">These defaults affect reminders, exports, and dashboards.</span>
        <button type="button" className="ss-button" onClick={submit}>
          Save account
        </button>
      </div>
    </section>
  );
}

function CompanyProfileSettings({ initial, onSave }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});

  function submit() {
    const nextErrors = {};
    if (!form.legalName?.trim()) nextErrors.legalName = "Legal name is required.";
    if (!form.tradeType?.trim()) nextErrors.tradeType = "Trade type is required.";
    if (!form.state?.trim()) nextErrors.state = "State is required.";
    if (!isHttpUrl(form.website)) nextErrors.website = "Website must be a valid URL.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    onSave(form, {
      activityTitle: "Company profile updated",
      activityBody: "Business profile data used in COI and quote workflows was updated.",
      toastTitle: "Company saved",
      toastBody: "Company profile is now up to date.",
    });
  }

  return (
    <section className="ss-card">
      <Section title="Company Profile" sub="Keep legal identity, trade details, and compliance identity accurate." />
      <div className="ss-field-grid">
        <Field
          label="Legal Name"
          value={form.legalName}
          error={errors.legalName}
          onChange={(value) => setForm((prev) => ({ ...prev, legalName: value }))}
        />
        <Field
          label="DBA Name"
          value={form.dbaName}
          onChange={(value) => setForm((prev) => ({ ...prev, dbaName: value }))}
        />
      </div>
      <div className="ss-field-grid">
        <Field
          label="Trade Type"
          value={form.tradeType}
          error={errors.tradeType}
          onChange={(value) => setForm((prev) => ({ ...prev, tradeType: value }))}
        />
        <Field
          label="State"
          value={form.state}
          error={errors.state}
          onChange={(value) => setForm((prev) => ({ ...prev, state: value }))}
        />
      </div>
      <Field
        label="Headquarters Address"
        value={form.headquartersAddress}
        onChange={(value) => setForm((prev) => ({ ...prev, headquartersAddress: value }))}
      />
      <div className="ss-field-grid">
        <Field
          label="Website"
          value={form.website}
          error={errors.website}
          onChange={(value) => setForm((prev) => ({ ...prev, website: value }))}
        />
        <Field
          label="License Number"
          value={form.licenseNumber}
          onChange={(value) => setForm((prev) => ({ ...prev, licenseNumber: value }))}
        />
      </div>
      <div className="ss-field-grid">
        <Field
          label="Tax ID"
          value={form.taxId}
          onChange={(value) => setForm((prev) => ({ ...prev, taxId: value }))}
        />
        <Field
          label="Revenue Range"
          value={form.revenueRange}
          onChange={(value) => setForm((prev) => ({ ...prev, revenueRange: value }))}
        />
      </div>
      <Field
        label="Employees"
        value={form.employees}
        onChange={(value) => setForm((prev) => ({ ...prev, employees: value }))}
      />
      <div className="ss-footer">
        <span className="ss-footer-info">Used in quote requests and insurance partner routing.</span>
        <button type="button" className="ss-button" onClick={submit}>
          Save company profile
        </button>
      </div>
    </section>
  );
}

function NotificationSettings({ initial, onSave }) {
  const [form, setForm] = useState(initial);

  const items = [
    ["renewal90Day", "90-day renewal reminder"],
    ["renewal60Day", "60-day renewal reminder"],
    ["renewal30Day", "30-day renewal reminder"],
    ["renewal10Day", "10-day renewal reminder"],
    ["expirationDay", "Expiration day alert"],
    ["expiredNotice", "Expired policy alert"],
    ["gcSendDelivery", "COI send confirmations"],
    ["quoteRequestUpdates", "Quote request status updates"],
    ["weeklyComplianceSnapshot", "Weekly compliance snapshot"],
    ["pushEnabled", "Browser push notifications"],
  ];

  return (
    <section className="ss-card">
      <Section title="Notifications" sub="Choose exactly which alerts your team receives." />
      <div className="ss-settings-list">
        {items.map(([key, label]) => (
          <SettingToggle
            key={key}
            label={label}
            on={Boolean(form[key])}
            onToggle={() => setForm((prev) => ({ ...prev, [key]: !prev[key] }))}
          />
        ))}
      </div>
      <div className="ss-footer">
        <span className="ss-footer-info">Renewal and compliance alerts are configurable at any time.</span>
        <button
          type="button"
          className="ss-button"
          onClick={() =>
            onSave(form, {
              activityTitle: "Notification settings updated",
              activityBody: "Notification channels and reminder preferences were updated.",
              toastTitle: "Notifications saved",
              toastBody: "Alert preferences are updated.",
            })
          }
        >
          Save notifications
        </button>
      </div>
    </section>
  );
}

function EmailSettings({ initial, onSave }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});

  function submit() {
    const nextErrors = {};
    if (!isEmail(form.defaultReplyTo)) nextErrors.defaultReplyTo = "Enter a valid reply-to email.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSave(form, {
      activityTitle: "Email preferences updated",
      activityBody: "Outbound messaging preferences and digest cadence were updated.",
      toastTitle: "Email preferences saved",
      toastBody: "Email settings are now active.",
    });
  }

  return (
    <section className="ss-card">
      <Section title="Email Preferences" sub="Control email behavior, signatures, and digest schedule." />
      <div className="ss-field-grid">
        <SettingToggle
          label="Compliance alerts"
          on={form.complianceAlerts}
          onToggle={() => setForm((prev) => ({ ...prev, complianceAlerts: !prev.complianceAlerts }))}
        />
        <SettingToggle
          label="Quote updates"
          on={form.quoteUpdates}
          onToggle={() => setForm((prev) => ({ ...prev, quoteUpdates: !prev.quoteUpdates }))}
        />
      </div>
      <div className="ss-field-grid">
        <SettingToggle
          label="Subscription notices"
          on={form.subscriptionNotices}
          onToggle={() => setForm((prev) => ({ ...prev, subscriptionNotices: !prev.subscriptionNotices }))}
        />
        <SettingToggle
          label="Product updates"
          on={form.productUpdates}
          onToggle={() => setForm((prev) => ({ ...prev, productUpdates: !prev.productUpdates }))}
        />
      </div>
      <SettingToggle
        label="Marketing messages"
        on={form.marketingMessages}
        onToggle={() => setForm((prev) => ({ ...prev, marketingMessages: !prev.marketingMessages }))}
      />
      <div className="ss-field-grid">
        <Field
          label="Default Reply-To"
          value={form.defaultReplyTo}
          error={errors.defaultReplyTo}
          onChange={(value) => setForm((prev) => ({ ...prev, defaultReplyTo: value }))}
        />
        <SelectField
          label="Digest Frequency"
          value={form.digestFrequency}
          options={DIGEST_OPTIONS.map((value) => ({ value, label: DIGEST_LABELS[value] }))}
          onChange={(value) => setForm((prev) => ({ ...prev, digestFrequency: value }))}
        />
      </div>
      <TextAreaField
        label="Email Signature"
        value={form.signature}
        onChange={(value) => setForm((prev) => ({ ...prev, signature: value }))}
      />
      <div className="ss-footer">
        <span className="ss-footer-info">Signatures are appended to outbound broker and GC emails.</span>
        <button type="button" className="ss-button" onClick={submit}>
          Save email preferences
        </button>
      </div>
    </section>
  );
}

function SecuritySettings({ security, password, onSaveSecurity, onUpdatePassword }) {
  const [securityForm, setSecurityForm] = useState({
    ...security,
    allowedDomainsCsv: joinCsv(security.allowedDomains),
    ipAllowlistCsv: joinCsv(security.ipAllowlist),
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [securityErrors, setSecurityErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});

  function saveSecurity() {
    const nextErrors = {};
    if (Number(securityForm.sessionTimeoutMinutes) < 15) {
      nextErrors.sessionTimeoutMinutes = "Session timeout must be at least 15 minutes.";
    }
    setSecurityErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    onSaveSecurity(
      {
        mfaEnabled: Boolean(securityForm.mfaEnabled),
        ssoEnabled: Boolean(securityForm.ssoEnabled),
        sessionTimeoutMinutes: Number(securityForm.sessionTimeoutMinutes) || 60,
        requireDeviceVerification: Boolean(securityForm.requireDeviceVerification),
        allowPasswordLogin: Boolean(securityForm.allowPasswordLogin),
        allowedDomains: splitCsv(securityForm.allowedDomainsCsv),
        ipAllowlist: splitCsv(securityForm.ipAllowlistCsv),
      },
      {
        activityTitle: "Security settings updated",
        activityBody: "Authentication and session security preferences were updated.",
        toastTitle: "Security saved",
        toastBody: "Security settings are now active.",
      }
    );
  }

  function updatePassword() {
    const nextErrors = {};
    if (!passwordForm.currentPassword) nextErrors.currentPassword = "Current password is required.";
    if (!passwordForm.newPassword || passwordForm.newPassword.length < password.minLength) {
      nextErrors.newPassword = `Password must be at least ${password.minLength} characters.`;
    }
    if (password.requireNumbers && !/\d/.test(passwordForm.newPassword)) {
      nextErrors.newPassword = "Password must include at least one number.";
    }
    if (password.requireSymbols && !/[^\w\s]/.test(passwordForm.newPassword)) {
      nextErrors.newPassword = "Password must include at least one symbol.";
    }
    if (password.requireMixedCase && !(/[a-z]/.test(passwordForm.newPassword) && /[A-Z]/.test(passwordForm.newPassword))) {
      nextErrors.newPassword = "Password must include upper and lower case letters.";
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      nextErrors.confirmPassword = "Confirmation does not match.";
    }
    setPasswordErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    onUpdatePassword(
      {
        ...password,
        lastUpdatedAt: new Date().toISOString(),
      },
      {
        activityTitle: "Password updated",
        activityBody: "Account password and password policy status were updated.",
        toastTitle: "Password changed",
        toastBody: "Your password was updated successfully.",
      }
    );
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
  }

  return (
    <div className="ss-settings-stack">
      <section className="ss-card">
        <Section title="Security Settings" sub="Protect account access, sessions, and policy data." />
        <div className="ss-field-grid">
          <SettingToggle
            label="Require multi-factor authentication"
            on={securityForm.mfaEnabled}
            onToggle={() => setSecurityForm((prev) => ({ ...prev, mfaEnabled: !prev.mfaEnabled }))}
          />
          <SettingToggle
            label="Enable SSO"
            on={securityForm.ssoEnabled}
            onToggle={() => setSecurityForm((prev) => ({ ...prev, ssoEnabled: !prev.ssoEnabled }))}
          />
        </div>
        <div className="ss-field-grid">
          <SettingToggle
            label="Require device verification"
            on={securityForm.requireDeviceVerification}
            onToggle={() =>
              setSecurityForm((prev) => ({
                ...prev,
                requireDeviceVerification: !prev.requireDeviceVerification,
              }))
            }
          />
          <SettingToggle
            label="Allow password login"
            on={securityForm.allowPasswordLogin}
            onToggle={() =>
              setSecurityForm((prev) => ({ ...prev, allowPasswordLogin: !prev.allowPasswordLogin }))
            }
          />
        </div>
        <div className="ss-field-grid">
          <Field
            label="Session Timeout (minutes)"
            value={String(securityForm.sessionTimeoutMinutes ?? "")}
            error={securityErrors.sessionTimeoutMinutes}
            onChange={(value) =>
              setSecurityForm((prev) => ({ ...prev, sessionTimeoutMinutes: value.replace(/[^\d]/g, "") }))
            }
          />
          <Field
            label="Allowed Email Domains (comma-separated)"
            value={securityForm.allowedDomainsCsv}
            onChange={(value) => setSecurityForm((prev) => ({ ...prev, allowedDomainsCsv: value }))}
          />
        </div>
        <Field
          label="IP Allowlist (comma-separated)"
          value={securityForm.ipAllowlistCsv}
          onChange={(value) => setSecurityForm((prev) => ({ ...prev, ipAllowlistCsv: value }))}
        />
        <div className="ss-footer">
          <span className="ss-footer-info">Last password update: {formatLongDate(password.lastUpdatedAt)}</span>
          <button type="button" className="ss-button" onClick={saveSecurity}>
            Save security
          </button>
        </div>
      </section>

      <section className="ss-card">
        <Section title="Password Management" sub="Update your password with current policy enforcement." />
        <Field
          label="Current Password"
          type="password"
          value={passwordForm.currentPassword}
          error={passwordErrors.currentPassword}
          onChange={(value) => setPasswordForm((prev) => ({ ...prev, currentPassword: value }))}
        />
        <div className="ss-field-grid">
          <Field
            label="New Password"
            type="password"
            value={passwordForm.newPassword}
            error={passwordErrors.newPassword}
            onChange={(value) => setPasswordForm((prev) => ({ ...prev, newPassword: value }))}
          />
          <Field
            label="Confirm Password"
            type="password"
            value={passwordForm.confirmPassword}
            error={passwordErrors.confirmPassword}
            onChange={(value) => setPasswordForm((prev) => ({ ...prev, confirmPassword: value }))}
          />
        </div>
        <p className="ss-muted">
          Minimum {password.minLength} characters. Mixed case: {password.requireMixedCase ? "Required" : "Optional"}. Symbols: {password.requireSymbols ? "Required" : "Optional"}.
        </p>
        <div className="ss-footer">
          <span className="ss-footer-info">Password changes are logged in activity history.</span>
          <button type="button" className="ss-button" onClick={updatePassword}>
            Change password
          </button>
        </div>
      </section>
    </div>
  );
}

function TeamSettings({ initial, roleOptions, onSave }) {
  const [members, setMembers] = useState(initial);
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    role: roleOptions[0]?.name || "Owner",
  });
  const [errors, setErrors] = useState({});

  function saveMembers(nextMembers, activityBody = "Team membership was updated.") {
    const normalized = nextMembers.map((member) => ({
      ...member,
      id: member.id || makeId("tm"),
      name: String(member.name || "").trim(),
      email: String(member.email || "").trim().toLowerCase(),
      role: String(member.role || "").trim(),
      status: member.status || "active",
      lastActiveAt: member.lastActiveAt || new Date().toISOString(),
    }));
    setMembers(normalized);
    onSave(normalized, {
      activityTitle: "Team users updated",
      activityBody,
      toastTitle: "Team updated",
      toastBody: "Team member settings saved.",
    });
  }

  function addMember() {
    const nextErrors = {};
    if (!newMember.name.trim()) nextErrors.name = "Name is required.";
    if (!isEmail(newMember.email)) nextErrors.email = "Valid email is required.";
    const duplicate = members.some(
      (member) => member.email.toLowerCase() === newMember.email.trim().toLowerCase()
    );
    if (duplicate) nextErrors.email = "A user with this email already exists.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    saveMembers(
      [
        {
          id: makeId("tm"),
          name: newMember.name.trim(),
          email: newMember.email.trim().toLowerCase(),
          role: newMember.role,
          status: "invited",
          lastActiveAt: new Date().toISOString(),
        },
        ...members,
      ],
      `Team member ${newMember.name.trim()} invited.`
    );
    setNewMember({ name: "", email: "", role: roleOptions[0]?.name || "Owner" });
    setErrors({});
  }

  function setStatus(memberId, status) {
    saveMembers(
      members.map((member) => (member.id === memberId ? { ...member, status } : member)),
      "Team member status updated."
    );
  }

  function removeMember(memberId) {
    const target = members.find((member) => member.id === memberId);
    saveMembers(
      members.filter((member) => member.id !== memberId),
      `${target?.name || "Member"} removed from team.`
    );
  }

  return (
    <div className="ss-settings-stack">
      <section className="ss-card">
        <Section title="Team Members / Users" sub="Invite users, manage seats, and maintain account access." />
        <div className="ss-settings-table-wrap">
          <table className="ss-settings-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>{member.name}</td>
                  <td>{member.email}</td>
                  <td>{member.role}</td>
                  <td>
                    <span className={`ss-status ${member.status === "active" ? "success" : member.status === "invited" ? "warning" : "danger"}`}>
                      {member.status}
                    </span>
                  </td>
                  <td>{formatLongDate(member.lastActiveAt)}</td>
                  <td className="ss-settings-table-actions">
                    {member.status !== "active" ? (
                      <button type="button" className="ss-mini-btn" onClick={() => setStatus(member.id, "active")} title="Activate user">
                        <ShieldCheck size={14} />
                      </button>
                    ) : (
                      <button type="button" className="ss-mini-btn" onClick={() => setStatus(member.id, "disabled")} title="Disable user">
                        <Lock size={14} />
                      </button>
                    )}
                    <button type="button" className="ss-mini-btn" onClick={() => removeMember(member.id)} title="Remove user">
                      <LogOut size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ss-card">
        <Section title="Invite User" sub="Add a teammate with predefined role access." />
        <div className="ss-field-grid">
          <Field
            label="Full Name"
            value={newMember.name}
            error={errors.name}
            onChange={(value) => setNewMember((prev) => ({ ...prev, name: value }))}
          />
          <Field
            label="Email"
            value={newMember.email}
            error={errors.email}
            onChange={(value) => setNewMember((prev) => ({ ...prev, email: value }))}
          />
        </div>
        <SelectField
          label="Role"
          value={newMember.role}
          options={roleOptions.map((role) => ({ value: role.name, label: role.name }))}
          onChange={(value) => setNewMember((prev) => ({ ...prev, role: value }))}
        />
        <div className="ss-footer">
          <span className="ss-footer-info">New users start as invited until they join.</span>
          <button type="button" className="ss-button" onClick={addMember}>
            Invite user
          </button>
        </div>
      </section>
    </div>
  );
}

function RoleSettings({ initial, onSave }) {
  const [roles, setRoles] = useState(initial);
  const [selectedRoleId, setSelectedRoleId] = useState(initial[0]?.id || "");
  const [newRole, setNewRole] = useState({ name: "", description: "" });
  const [errors, setErrors] = useState({});

  const selectedRole = roles.find((role) => role.id === selectedRoleId);

  function saveRoles(nextRoles, body = "Role settings updated.") {
    const normalized = nextRoles.map((role) => ({
      ...role,
      name: String(role.name || "").trim(),
      description: String(role.description || "").trim(),
    }));
    setRoles(normalized);
    onSave(normalized, {
      activityTitle: "Roles and permissions updated",
      activityBody: body,
      toastTitle: "Roles saved",
      toastBody: "Role permissions are updated.",
    });
  }

  function togglePermission(permissionKey) {
    if (!selectedRole) return;
    const nextRoles = roles.map((role) =>
      role.id === selectedRole.id
        ? {
            ...role,
            permissions: {
              ...role.permissions,
              [permissionKey]: !role.permissions[permissionKey],
            },
          }
        : role
    );
    saveRoles(nextRoles, `${selectedRole.name} permissions updated.`);
  }

  function addRole() {
    const nextErrors = {};
    if (!newRole.name.trim()) nextErrors.name = "Role name is required.";
    if (roles.some((role) => role.name.toLowerCase() === newRole.name.trim().toLowerCase())) {
      nextErrors.name = "Role name already exists.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const role = {
      id: makeId("role"),
      name: newRole.name.trim(),
      description: newRole.description.trim(),
      permissions: {
        vault: true,
        sendCoi: false,
        manageSettings: false,
        manageUsers: false,
        manageSubscription: false,
        requestQuotes: false,
      },
    };
    const nextRoles = [...roles, role];
    setSelectedRoleId(role.id);
    setNewRole({ name: "", description: "" });
    setErrors({});
    saveRoles(nextRoles, `${role.name} role created.`);
  }

  return (
    <div className="ss-settings-stack">
      <section className="ss-card">
        <Section title="Roles and Permissions" sub="Set access controls for team users." />
        <SelectField
          label="Selected Role"
          value={selectedRoleId}
          options={roles.map((role) => ({ value: role.id, label: role.name }))}
          onChange={setSelectedRoleId}
        />
        {selectedRole && (
          <div className="ss-role-panel">
            <b>{selectedRole.name}</b>
            <p className="ss-muted">{selectedRole.description || "No description yet."}</p>
            <div className="ss-settings-list">
              {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                <SettingToggle
                  key={key}
                  label={label}
                  on={Boolean(selectedRole.permissions[key])}
                  onToggle={() => togglePermission(key)}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="ss-card">
        <Section title="Create Role" sub="Add a custom role for your workflow." />
        <Field
          label="Role Name"
          value={newRole.name}
          error={errors.name}
          onChange={(value) => setNewRole((prev) => ({ ...prev, name: value }))}
        />
        <TextAreaField
          label="Description"
          value={newRole.description}
          onChange={(value) => setNewRole((prev) => ({ ...prev, description: value }))}
        />
        <div className="ss-footer">
          <span className="ss-footer-info">You can refine permissions after creating the role.</span>
          <button type="button" className="ss-button" onClick={addRole}>
            Create role
          </button>
        </div>
      </section>
    </div>
  );
}

function SubscriptionSettings({ subscription, onSaveSubscription }) {
  const [subscriptionForm, setSubscriptionForm] = useState(subscription);
  const [subscriptionErrors, setSubscriptionErrors] = useState({});

  const monthlyTotal = useMemo(() => {
    const seats = Number(subscriptionForm.seatCount) || 0;
    const seatPrice = Number(subscriptionForm.seatPrice) || 0;
    const base = Number(subscriptionForm.basePrice) || 0;
    return base + seats * seatPrice;
  }, [subscriptionForm.basePrice, subscriptionForm.seatCount, subscriptionForm.seatPrice]);

  function saveSubscription() {
    const nextErrors = {};
    if (!subscriptionForm.planName?.trim()) nextErrors.planName = "Plan name is required.";
    if (!isEmail(subscriptionForm.adminEmail)) nextErrors.adminEmail = "Valid admin email is required.";
    if (Number(subscriptionForm.seatCount) < 1) nextErrors.seatCount = "Seat count must be at least 1.";
    setSubscriptionErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSaveSubscription(
      {
        ...subscriptionForm,
        seatCount: Number(subscriptionForm.seatCount),
        seatPrice: Number(subscriptionForm.seatPrice),
        basePrice: Number(subscriptionForm.basePrice),
      },
      {
        activityTitle: "Subscription settings updated",
        activityBody: "Workspace plan details were updated.",
        toastTitle: "Subscription saved",
        toastBody: "Workspace subscription settings updated.",
      }
    );
  }

  return (
    <div className="ss-settings-stack">
      <section className="ss-card">
        <Section
          title="Subscription"
          sub="Manage workspace plan, seat count, cycle, and renewal settings."
        />
        <div className="ss-field-grid">
          <Field
            label="Plan Name"
            value={subscriptionForm.planName}
            error={subscriptionErrors.planName}
            onChange={(value) => setSubscriptionForm((prev) => ({ ...prev, planName: value }))}
          />
          <SelectField
            label="Plan Cycle"
            value={subscriptionForm.planCycle}
            options={[
              { value: "monthly", label: "Monthly" },
              { value: "annual", label: "Annual" },
            ]}
            onChange={(value) => setSubscriptionForm((prev) => ({ ...prev, planCycle: value }))}
          />
        </div>
        <div className="ss-field-grid">
          <Field
            label="Seats"
            value={String(subscriptionForm.seatCount)}
            error={subscriptionErrors.seatCount}
            onChange={(value) => setSubscriptionForm((prev) => ({ ...prev, seatCount: value.replace(/[^\d]/g, "") }))}
          />
          <Field
            label="Seat Price (USD)"
            value={String(subscriptionForm.seatPrice)}
            onChange={(value) => setSubscriptionForm((prev) => ({ ...prev, seatPrice: value.replace(/[^\d.]/g, "") }))}
          />
        </div>
        <div className="ss-field-grid">
          <Field
            label="Base Price (USD)"
            value={String(subscriptionForm.basePrice)}
            onChange={(value) => setSubscriptionForm((prev) => ({ ...prev, basePrice: value.replace(/[^\d.]/g, "") }))}
          />
          <Field
            label="Renewal Date"
            type="date"
            value={subscriptionForm.renewalDate}
            onChange={(value) => setSubscriptionForm((prev) => ({ ...prev, renewalDate: value }))}
          />
        </div>
        <Field
          label="Workspace Admin Email"
          value={subscriptionForm.adminEmail}
          error={subscriptionErrors.adminEmail}
          onChange={(value) => setSubscriptionForm((prev) => ({ ...prev, adminEmail: value }))}
        />
        <SettingToggle
          label="Auto renew subscription"
          on={subscriptionForm.autoRenew}
          onToggle={() => setSubscriptionForm((prev) => ({ ...prev, autoRenew: !prev.autoRenew }))}
        />
        <div className="ss-info-grid">
          <Stat label="Estimated monthly total" value={formatMoney(monthlyTotal)} />
          <Stat label="Next renewal" value={formatLongDate(subscriptionForm.renewalDate)} />
        </div>
        <div className="ss-footer">
          <span className="ss-footer-info">Plan management updates apply immediately.</span>
          <button type="button" className="ss-button" onClick={saveSubscription}>
            Save subscription
          </button>
        </div>
      </section>
    </div>
  );
}

function DocumentSettings({ initial, onSave }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});

  function submit() {
    const nextErrors = {};
    if (Number(form.retentionMonths) < 1) nextErrors.retentionMonths = "Retention must be at least 1 month.";
    if (!form.namingTemplate?.trim()) nextErrors.namingTemplate = "Naming template is required.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSave(
      { ...form, retentionMonths: Number(form.retentionMonths) || 1 },
      {
        activityTitle: "Document preferences updated",
        activityBody: "Document controls and default storage behavior were updated.",
        toastTitle: "Document settings saved",
        toastBody: "Document preferences are updated.",
      }
    );
  }

  return (
    <section className="ss-card">
      <Section title="Document Preferences" sub="Define retention rules, visibility defaults, and naming standards." />
      <div className="ss-field-grid">
        <SelectField
          label="Default Visibility"
          value={form.defaultVisibility}
          options={[
            { value: "owner_only", label: "Owner only" },
            { value: "team", label: "Team" },
            { value: "team_and_broker", label: "Team + Broker" },
          ]}
          onChange={(value) => setForm((prev) => ({ ...prev, defaultVisibility: value }))}
        />
        <Field
          label="Default Folder"
          value={form.defaultFolder}
          onChange={(value) => setForm((prev) => ({ ...prev, defaultFolder: value }))}
        />
      </div>
      <div className="ss-field-grid">
        <SettingToggle
          label="Require verification before send"
          on={form.requireVerificationBeforeSend}
          onToggle={() =>
            setForm((prev) => ({
              ...prev,
              requireVerificationBeforeSend: !prev.requireVerificationBeforeSend,
            }))
          }
        />
        <SettingToggle
          label="Retain version history"
          on={form.retainVersionHistory}
          onToggle={() =>
            setForm((prev) => ({
              ...prev,
              retainVersionHistory: !prev.retainVersionHistory,
            }))
          }
        />
      </div>
      <div className="ss-field-grid">
        <Field
          label="Retention (Months)"
          value={String(form.retentionMonths)}
          error={errors.retentionMonths}
          onChange={(value) => setForm((prev) => ({ ...prev, retentionMonths: value.replace(/[^\d]/g, "") }))}
        />
        <Field
          label="Naming Template"
          value={form.namingTemplate}
          error={errors.namingTemplate}
          onChange={(value) => setForm((prev) => ({ ...prev, namingTemplate: value }))}
        />
      </div>
      <div className="ss-footer">
        <span className="ss-footer-info">Templates can use placeholders like {"{policyType}"} and {"{renewalDate}"}.</span>
        <button type="button" className="ss-button" onClick={submit}>
          Save document preferences
        </button>
      </div>
    </section>
  );
}

function TemplateSettings({ initial, onSave }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});

  function submit() {
    const nextErrors = {};
    ["coiSubject", "coiBody", "brokerRequestSubject", "brokerRequestBody"].forEach((field) => {
      if (!form[field]?.trim()) nextErrors[field] = "This field is required.";
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    onSave(form, {
      activityTitle: "Email templates updated",
      activityBody: "Default outbound templates for COI and broker requests were updated.",
      toastTitle: "Templates saved",
      toastBody: "Email templates are now active.",
    });
  }

  return (
    <section className="ss-card">
      <Section title="Default Email Templates" sub="Standardize outbound messaging with reusable templates." />
      <Field
        label="COI Subject"
        value={form.coiSubject}
        error={errors.coiSubject}
        onChange={(value) => setForm((prev) => ({ ...prev, coiSubject: value }))}
      />
      <TextAreaField
        label="COI Body"
        value={form.coiBody}
        error={errors.coiBody}
        onChange={(value) => setForm((prev) => ({ ...prev, coiBody: value }))}
      />
      <Field
        label="Broker Request Subject"
        value={form.brokerRequestSubject}
        error={errors.brokerRequestSubject}
        onChange={(value) => setForm((prev) => ({ ...prev, brokerRequestSubject: value }))}
      />
      <TextAreaField
        label="Broker Request Body"
        value={form.brokerRequestBody}
        error={errors.brokerRequestBody}
        onChange={(value) => setForm((prev) => ({ ...prev, brokerRequestBody: value }))}
      />
      <Field
        label="Quote Follow-up Subject"
        value={form.quoteFollowupSubject}
        onChange={(value) => setForm((prev) => ({ ...prev, quoteFollowupSubject: value }))}
      />
      <TextAreaField
        label="Quote Follow-up Body"
        value={form.quoteFollowupBody}
        onChange={(value) => setForm((prev) => ({ ...prev, quoteFollowupBody: value }))}
      />
      <div className="ss-footer">
        <span className="ss-footer-info">Use placeholders like {"{{gcName}}"}, {"{{projectName}}"}, {"{{policyType}}"}.</span>
        <button type="button" className="ss-button" onClick={submit}>
          Save templates
        </button>
      </div>
    </section>
  );
}

function PrivacySettings({ initial, onSave }) {
  const [form, setForm] = useState(initial);
  return (
    <section className="ss-card">
      <Section title="Privacy Settings" sub="Control privacy scope, analytics, and partner sharing behavior." />
      <SelectField
        label="Profile Visibility"
        value={form.profileVisibility}
        options={[
          { value: "private", label: "Private" },
          { value: "team_only", label: "Team only" },
          { value: "broker_visible", label: "Team + broker contacts" },
        ]}
        onChange={(value) => setForm((prev) => ({ ...prev, profileVisibility: value }))}
      />
      <div className="ss-settings-list">
        <SettingToggle
          label="Allow anonymized benchmark sharing"
          on={form.shareAnonymizedBenchmarks}
          onToggle={() =>
            setForm((prev) => ({
              ...prev,
              shareAnonymizedBenchmarks: !prev.shareAnonymizedBenchmarks,
            }))
          }
        />
        <SettingToggle
          label="Allow partner lead sharing for quote requests"
          on={form.partnerLeadSharing}
          onToggle={() =>
            setForm((prev) => ({ ...prev, partnerLeadSharing: !prev.partnerLeadSharing }))
          }
        />
        <SettingToggle
          label="Enable product analytics"
          on={form.allowAnalytics}
          onToggle={() => setForm((prev) => ({ ...prev, allowAnalytics: !prev.allowAnalytics }))}
        />
        <SettingToggle
          label="Enable cookie tracking"
          on={form.cookieTracking}
          onToggle={() => setForm((prev) => ({ ...prev, cookieTracking: !prev.cookieTracking }))}
        />
      </div>
      <div className="ss-footer">
        <span className="ss-footer-info">Privacy changes are reflected across all workspaces immediately.</span>
        <button
          type="button"
          className="ss-button"
          onClick={() =>
            onSave(form, {
              activityTitle: "Privacy settings updated",
              activityBody: "Privacy controls and analytics settings were updated.",
              toastTitle: "Privacy saved",
              toastBody: "Privacy settings updated.",
            })
          }
        >
          Save privacy settings
        </button>
      </div>
    </section>
  );
}

function DataSettings({ initial, onSave }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const usedPercent = Math.min(100, Math.round((Number(form.storageUsedGb) / Number(form.storageLimitGb || 1)) * 100));

  function submit() {
    const nextErrors = {};
    if (Number(form.storageLimitGb) < Number(form.storageUsedGb)) {
      nextErrors.storageLimitGb = "Storage limit cannot be lower than used storage.";
    }
    if (Number(form.retentionDays) < 30) nextErrors.retentionDays = "Retention must be at least 30 days.";
    if (Number(form.auditLogRetentionDays) < 30) {
      nextErrors.auditLogRetentionDays = "Audit retention must be at least 30 days.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    onSave(
      {
        ...form,
        storageUsedGb: Number(form.storageUsedGb),
        storageLimitGb: Number(form.storageLimitGb),
        retentionDays: Number(form.retentionDays),
        auditLogRetentionDays: Number(form.auditLogRetentionDays),
      },
      {
        activityTitle: "Data and storage settings updated",
        activityBody: "Storage quotas, backup, and retention controls were updated.",
        toastTitle: "Data settings saved",
        toastBody: "Data and storage preferences updated.",
      }
    );
  }

  return (
    <section className="ss-card">
      <Section title="Data and Storage Settings" sub="Configure storage, export defaults, backup, and retention." />
      <div className="ss-info-grid">
        <Stat label="Storage Used" value={`${form.storageUsedGb} GB`} />
        <Stat label="Storage Limit" value={`${form.storageLimitGb} GB`} />
      </div>
      <div className="ss-bar">
        <span className={usedPercent > 80 ? "warning" : "success"} style={{ width: `${usedPercent}%` }} />
      </div>
      <div className="ss-field-grid">
        <Field
          label="Storage Used (GB)"
          value={String(form.storageUsedGb)}
          onChange={(value) => setForm((prev) => ({ ...prev, storageUsedGb: value.replace(/[^\d.]/g, "") }))}
        />
        <Field
          label="Storage Limit (GB)"
          value={String(form.storageLimitGb)}
          error={errors.storageLimitGb}
          onChange={(value) => setForm((prev) => ({ ...prev, storageLimitGb: value.replace(/[^\d.]/g, "") }))}
        />
      </div>
      <div className="ss-field-grid">
        <SelectField
          label="Backup Frequency"
          value={form.backupFrequency}
          options={[
            { value: "daily", label: "Daily" },
            { value: "weekly", label: "Weekly" },
            { value: "monthly", label: "Monthly" },
          ]}
          onChange={(value) => setForm((prev) => ({ ...prev, backupFrequency: value }))}
        />
        <SelectField
          label="Export Format"
          value={form.exportFormat}
          options={[
            { value: "zip_pdf_csv", label: "ZIP (PDF + CSV)" },
            { value: "json", label: "JSON" },
            { value: "csv", label: "CSV" },
          ]}
          onChange={(value) => setForm((prev) => ({ ...prev, exportFormat: value }))}
        />
      </div>
      <div className="ss-field-grid">
        <Field
          label="Data Retention (Days)"
          value={String(form.retentionDays)}
          error={errors.retentionDays}
          onChange={(value) => setForm((prev) => ({ ...prev, retentionDays: value.replace(/[^\d]/g, "") }))}
        />
        <Field
          label="Audit Log Retention (Days)"
          value={String(form.auditLogRetentionDays)}
          error={errors.auditLogRetentionDays}
          onChange={(value) =>
            setForm((prev) => ({ ...prev, auditLogRetentionDays: value.replace(/[^\d]/g, "") }))
          }
        />
      </div>
      <div className="ss-footer">
        <span className="ss-footer-info">Retention controls affect exports and audit history visibility.</span>
        <button type="button" className="ss-button" onClick={submit}>
          Save data settings
        </button>
      </div>
    </section>
  );
}

function SupportSettings({ initial, onSave }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});

  function submit() {
    const nextErrors = {};
    if (!isEmail(form.supportEmail)) nextErrors.supportEmail = "Support email must be valid.";
    if (!isHttpUrl(form.helpCenterUrl)) nextErrors.helpCenterUrl = "Help Center URL must be valid.";
    if (!isHttpUrl(form.statusPageUrl)) nextErrors.statusPageUrl = "Status URL must be valid.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSave(form, {
      activityTitle: "Support settings updated",
      activityBody: "Support channels and help center preferences were updated.",
      toastTitle: "Support settings saved",
      toastBody: "Support and help settings are updated.",
    });
  }

  return (
    <section className="ss-card">
      <Section title="Support / Help" sub="Set preferred support channels and self-serve resources." />
      <SelectField
        label="Preferred Contact Method"
        value={form.preferredContactMethod}
        options={[
          { value: "email", label: "Email" },
          { value: "phone", label: "Phone" },
          { value: "chat", label: "In-app chat" },
        ]}
        onChange={(value) => setForm((prev) => ({ ...prev, preferredContactMethod: value }))}
      />
      <div className="ss-field-grid">
        <Field
          label="Support Email"
          value={form.supportEmail}
          error={errors.supportEmail}
          onChange={(value) => setForm((prev) => ({ ...prev, supportEmail: value }))}
        />
        <Field
          label="Support Phone"
          value={form.supportPhone}
          onChange={(value) => setForm((prev) => ({ ...prev, supportPhone: value }))}
        />
      </div>
      <div className="ss-field-grid">
        <Field
          label="Help Center URL"
          value={form.helpCenterUrl}
          error={errors.helpCenterUrl}
          onChange={(value) => setForm((prev) => ({ ...prev, helpCenterUrl: value }))}
        />
        <Field
          label="Status Page URL"
          value={form.statusPageUrl}
          error={errors.statusPageUrl}
          onChange={(value) => setForm((prev) => ({ ...prev, statusPageUrl: value }))}
        />
      </div>
      <SettingToggle
        label="Allow onboarding call booking"
        on={form.onboardingCallEnabled}
        onToggle={() =>
          setForm((prev) => ({ ...prev, onboardingCallEnabled: !prev.onboardingCallEnabled }))
        }
      />
      <div className="ss-footer">
        <span className="ss-footer-info">Used in support routing and help links across the product.</span>
        <button type="button" className="ss-button" onClick={submit}>
          Save support settings
        </button>
      </div>
    </section>
  );
}

function LogoutSettings({ onLogout, onReset }) {
  return (
    <div className="ss-settings-stack">
      <section className="ss-card">
        <Section title="Logout" sub="Sign out of the active session securely." />
        <p className="ss-muted">
          Logging out will close your current session and require sign-in again for protected actions.
        </p>
        <div className="ss-footer">
          <span className="ss-footer-info">Recommended for shared or temporary devices.</span>
          <button type="button" className="ss-button danger" onClick={onLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </section>

      <section className="ss-card">
        <Section title="Support Actions" sub="Use with caution in demo or sandbox environments." />
        <p className="ss-muted">
          Reset clears local demo data including policies, settings, team members, and activity history.
        </p>
        <div className="ss-footer">
          <span className="ss-footer-info">This action is irreversible for local demo storage.</span>
          <button type="button" className="ss-button soft" onClick={onReset}>
            Reset local data
          </button>
        </div>
      </section>
    </div>
  );
}

function SettingToggle({ label, on, onToggle }) {
  return (
    <button type="button" className="ss-setting" onClick={onToggle} aria-pressed={on}>
      <span>{label}</span>
      <span className={`ss-toggle ${on ? "on" : ""}`} aria-hidden="true">
        <i />
      </span>
    </button>
  );
}

function Field({ label, value, onChange, placeholder, error, type = "text" }) {
  return (
    <label className="ss-field">
      <span className="ss-field-label">{label}</span>
      <input
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <span className="ss-field-error">{error}</span>}
    </label>
  );
}

function TextAreaField({ label, value, onChange, placeholder, error }) {
  return (
    <label className="ss-field">
      <span className="ss-field-label">{label}</span>
      <textarea
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <span className="ss-field-error">{error}</span>}
    </label>
  );
}

function SelectField({ label, value, onChange, options, error }) {
  return (
    <label className="ss-field">
      <span className="ss-field-label">{label}</span>
      <select value={value ?? ""} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="ss-field-error">{error}</span>}
    </label>
  );
}

function Stat({ label, value }) {
  return (
    <div className="ss-info">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
