/**
 * Initial mock data for the SubShield prototype.
 *
 * In a production build this would come from an authenticated API.
 * In prototype mode it loads on first run and is persisted to localStorage
 * after any user action (see utils.js readStoredData / writeStoredData).
 */

export const initialData = {
  policies: [
    {
      id: "wc",
      type: "workers",
      name: "Workers' Compensation",
      carrier: "StateFund West",
      policyNumber: "WC-90183321",
      daysRemaining: 4,
      premium: 3210,
      limit: "Statutory / $1M employer liability",
      expires: "2026-06-01",
      statusNote: "Critical. Renew before sending new COI packages.",
      documents: ["WC certificate", "Waiver of Subrogation"],
    },
    {
      id: "gl",
      type: "liability",
      name: "General Liability",
      carrier: "Acme Mutual",
      policyNumber: "GL-44827193",
      daysRemaining: 45,
      premium: 1840,
      limit: "$2M aggregate / $1M occurrence",
      expires: "2026-07-06",
      statusNote: "Inside the renewal planning window.",
      documents: ["GL certificate", "Additional Insured", "Waiver of Subrogation"],
    },
    {
      id: "auto",
      type: "auto",
      name: "Commercial Auto",
      carrier: "Progressive Commercial",
      policyNumber: "CA-55120984",
      daysRemaining: 120,
      premium: 2460,
      limit: "$1M combined single limit",
      expires: "2026-09-24",
      statusNote: "Active and ready for routing.",
      documents: ["Auto certificate", "Additional Insured"],
    },
    {
      id: "license",
      type: "license",
      name: "Trade License",
      carrier: "TX Dept. of Licensing",
      policyNumber: "TL-TILE-0099821",
      daysRemaining: 60,
      premium: 295,
      limit: "Tile contractor license",
      expires: "2026-08-11",
      statusNote: "Current license on file.",
      documents: ["Trade license"],
    },
  ],

  contractors: [
    {
      id: "turner",
      name: "Turner Construction",
      initials: "TC",
      contact: "Sarah Chen",
      email: "bids@turner.com",
      delivery: "TrustLayer portal + email copy",
      holder: "Turner Construction Company\n375 Hudson Street\nNew York, NY 10014",
      requirements:
        "Requires $2M umbrella and primary non-contributory wording on GL.",
      projects: ["Downtown Marriott Remodel", "Westside School District"],
    },
    {
      id: "suffolk",
      name: "Suffolk",
      initials: "SU",
      contact: "Marcus Patel",
      email: "compliance@suffolk.com",
      delivery: "Compliance inbox",
      holder:
        "Suffolk Construction Company, Inc.\n65 Allerton Street\nBoston, MA 02119",
      requirements:
        "30-day cancellation notice required. Include Waiver of Subrogation when available.",
      projects: ["Seaport Tower Phase II"],
    },
    {
      id: "dpr",
      name: "DPR Construction",
      initials: "DP",
      contact: "Lena Okafor",
      email: "coi@dpr.com",
      delivery: "myCOI inbox",
      holder: "DPR Construction\n1450 Veterans Blvd\nRedwood City, CA 94063",
      requirements: "Standard verified COI package accepted.",
      projects: ["Genentech Lab Buildout"],
    },
  ],

  activity: [
    {
      id: "a1",
      title: "Workers' Comp is critical",
      body: "Expires in 4 days. Renew before routing new packages.",
      time: "Today",
    },
    {
      id: "a2",
      title: "COI package routed",
      body: "Turner Construction · Downtown Marriott Remodel · 6 verified files",
      time: "2 days ago",
    },
    {
      id: "a3",
      title: "GL entered renewal window",
      body: "General Liability has 45 days remaining.",
      time: "12 days ago",
    },
  ],
};
