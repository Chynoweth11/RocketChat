/**
 * Initial data for SubShield.
 *
 * Product model: "Rocket Money for business insurance."
 *
 * A brand-new account starts EMPTY - no policies, contractors, documents,
 * savings opportunities, quote requests, or activity. Users build their own
 * data by uploading policies and using the app, so nothing fabricated is ever
 * presented as if it were real.
 *
 * What is intentionally pre-populated is *platform / configuration* data, not
 * user content:
 *   - `partners`: the licensed insurance marketplace SubShield can route to.
 *   - `settings.roles`: default role-based access presets.
 *   - `settings` defaults: notification, security, email-template, and privacy
 *     defaults a sensible account ships with.
 *
 * Everything is persisted locally for this frontend-only repository.
 */

const COMPANY_ID = "subshield-workspace";

export const initialData = {
  company: {
    id: COMPANY_ID,
    name: "My Company",
    tradeType: "",
    state: "",
    revenueRange: "",
    employees: "",
    contactEmail: "",
  },

  policies: [],

  contractors: [],

  brokers: [],

  // Platform marketplace - the licensed carriers/brokers SubShield routes
  // savings and coverage requests to. Not user content.
  partners: [
    {
      id: "partner-next",
      name: "NEXT Insurance",
      type: "carrier",
      statesServed: ["TX", "CA", "AZ", "NV", "CO"],
      policyTypes: ["liability", "workers", "auto"],
      tradeTypes: ["tile", "drywall", "electrical", "plumbing"],
      contactMethod: "api",
      commissionModel: "referral_fee",
      amRating: "A (Excellent)",
      quoteUrl: "https://www.nextinsurance.com/",
      logoMark: "NX",
      active: true,
    },
    {
      id: "partner-hartford",
      name: "The Hartford",
      type: "carrier",
      statesServed: ["TX", "FL", "GA", "NC", "SC"],
      policyTypes: ["workers", "liability", "umbrella"],
      tradeTypes: ["tile", "roofing", "framing"],
      contactMethod: "email",
      commissionModel: "lead_fee",
      amRating: "A+ (Superior)",
      quoteUrl: "https://www.thehartford.com/",
      logoMark: "HF",
      active: true,
    },
    {
      id: "partner-coalition",
      name: "Coalition Cyber",
      type: "carrier",
      statesServed: ["TX", "CA", "NY", "IL", "WA"],
      policyTypes: ["cyber"],
      tradeTypes: ["tile", "general", "services"],
      contactMethod: "api",
      commissionModel: "referral_fee",
      amRating: "A (Excellent)",
      quoteUrl: "https://www.coalitioninc.com/",
      logoMark: "CC",
      active: true,
    },
    {
      id: "partner-summit-broker",
      name: "Summit Trade Brokers",
      type: "broker",
      statesServed: ["TX", "OK", "LA"],
      policyTypes: ["workers", "auto", "umbrella", "bonding"],
      tradeTypes: ["tile", "hvac", "earthwork"],
      contactMethod: "email",
      commissionModel: "commission_share",
      amRating: "A (Excellent)",
      quoteUrl: "https://www.summittrade.com/",
      logoMark: "ST",
      active: true,
    },
  ],

  savingsOpportunities: [],

  quoteRequests: [],

  coiSends: [],

  documents: [],

  settings: {
    userProfile: {
      firstName: "",
      lastName: "",
      jobTitle: "",
      phone: "",
      timezone: "America/Los_Angeles",
      avatarColor: "#2563eb",
    },
    account: {
      workspaceName: "My Workspace",
      loginEmail: "",
      language: "en-US",
      dateFormat: "MM/DD/YYYY",
      timeFormat: "12h",
    },
    companyProfile: {
      legalName: "",
      dbaName: "",
      tradeType: "",
      state: "",
      headquartersAddress: "",
      website: "",
      licenseNumber: "",
      taxId: "",
      revenueRange: "",
      employees: "",
    },
    notifications: {
      renewal90Day: true,
      renewal60Day: true,
      renewal30Day: true,
      renewal10Day: true,
      expirationDay: true,
      expiredNotice: true,
      gcSendDelivery: true,
      quoteRequestUpdates: true,
      weeklyComplianceSnapshot: true,
      pushEnabled: false,
    },
    emailPreferences: {
      complianceAlerts: true,
      quoteUpdates: true,
      productUpdates: true,
      billingNotices: true,
      marketingMessages: false,
      digestFrequency: "weekly",
      defaultReplyTo: "",
      signature: "",
    },
    security: {
      mfaEnabled: false,
      ssoEnabled: false,
      sessionTimeoutMinutes: 60,
      requireDeviceVerification: false,
      allowPasswordLogin: true,
      allowedDomains: [],
      ipAllowlist: [],
    },
    password: {
      minLength: 10,
      requireSymbols: true,
      requireNumbers: true,
      requireMixedCase: true,
    },
    teamMembers: [],
    roles: [
      {
        id: "role-owner",
        name: "Owner",
        description: "Full account and workspace plan control",
        permissions: {
          vault: true,
          sendCoi: true,
          manageSettings: true,
          manageUsers: true,
          manageBilling: true,
          requestQuotes: true,
        },
      },
      {
        id: "role-project-manager",
        name: "Project Manager",
        description: "Manages sends, directories, and project workflows",
        permissions: {
          vault: true,
          sendCoi: true,
          manageSettings: false,
          manageUsers: false,
          manageBilling: false,
          requestQuotes: true,
        },
      },
      {
        id: "role-compliance-coordinator",
        name: "Compliance Coordinator",
        description: "Tracks renewals and document readiness",
        permissions: {
          vault: true,
          sendCoi: true,
          manageSettings: false,
          manageUsers: false,
          manageBilling: false,
          requestQuotes: false,
        },
      },
    ],
    billing: {
      planName: "Starter",
      billingCycle: "monthly",
      seatCount: 1,
      seatPrice: 0,
      basePrice: 0,
      autoRenew: true,
      billingEmail: "",
    },
    paymentMethod: {
      cardBrand: "",
      last4: "",
      expMonth: "",
      expYear: "",
      nameOnCard: "",
      billingZip: "",
    },
    invoices: [],
    documentPreferences: {
      defaultVisibility: "team",
      requireVerificationBeforeSend: true,
      retainVersionHistory: true,
      retentionMonths: 36,
      namingTemplate: "{policyType}-{carrier}-{renewalDate}",
      defaultFolder: "Active Policies",
    },
    emailTemplates: {
      coiSubject: "Updated COI Package - {{companyName}} - {{projectName}}",
      coiBody:
        "Hi {{recipientName}},\n\nAttached is the updated COI package for {{projectName}} including required endorsements and supporting documents.\n\nPlease confirm receipt.\n\nThanks,\n{{senderName}}",
      brokerRequestSubject: "COI / Endorsement Request - {{projectName}}",
      brokerRequestBody:
        "Hello {{brokerName}},\n\nPlease issue an updated COI for {{gcName}} on {{projectName}}. Required wording: {{requirements}}.\n\nThank you,\n{{senderName}}",
      quoteFollowupSubject: "Insurance Quote Follow-up - {{policyType}}",
      quoteFollowupBody:
        "Hi {{partnerName}},\n\nFollowing up on our quote request for {{policyType}} coverage. Renewal date is {{renewalDate}}.\n\nBest,\n{{senderName}}",
    },
    privacy: {
      profileVisibility: "team_only",
      shareAnonymizedBenchmarks: true,
      partnerLeadSharing: true,
      allowAnalytics: true,
      cookieTracking: true,
    },
    dataStorage: {
      storageUsedGb: 0,
      storageLimitGb: 50,
      backupFrequency: "daily",
      exportFormat: "zip_pdf_csv",
      retentionDays: 2555,
      auditLogRetentionDays: 3650,
    },
    support: {
      preferredContactMethod: "email",
      supportEmail: "support@subshield.app",
      supportPhone: "(800) 555-0199",
      helpCenterUrl: "https://support.subshield.app",
      statusPageUrl: "https://status.subshield.app",
      onboardingCallEnabled: true,
    },
  },

  activity: [],
};
