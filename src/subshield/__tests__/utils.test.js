import { describe, it, expect } from "vitest";
import {
  formatMoney,
  formatDeductible,
  getStatus,
  scoreClass,
  getComplianceScore,
  totalTrackedPremium,
  getCoverageGaps,
  getPotentialSavings,
  getRealizedSavings,
  savingsForOpportunity,
  estimateSavings,
  estimateLowerPremium,
  ESTIMATED_SAVINGS_RATE,
  policyLabelFromType,
  deriveInitials,
  makeId,
  daysUntil,
  timeAgo,
  STORAGE_KEY,
  writeStoredData,
  readStoredData,
  clearStoredData,
  policyHealthScore,
  parseLimitToNumber,
  formatLimitShort,
  policyHasEndorsement,
  normalizeRequirements,
  checkCompliance,
} from "../utils.js";

describe("formatMoney", () => {
  it("formats zero", () => expect(formatMoney(0)).toBe("$0"));
  it("formats thousands", () => expect(formatMoney(1500)).toBe("$1,500"));
  it("formats null as zero", () => expect(formatMoney(null)).toBe("$0"));
  it("formats large numbers", () => expect(formatMoney(12000)).toBe("$12,000"));
});

describe("formatDeductible", () => {
  it("returns N/A for null", () => expect(formatDeductible(null)).toBe("N/A"));
  it("returns N/A for undefined", () => expect(formatDeductible(undefined)).toBe("N/A"));
  it("returns $0 for zero", () => expect(formatDeductible(0)).toBe("$0"));
  it("formats a value", () => expect(formatDeductible(1000)).toBe("$1,000"));
});

describe("getStatus", () => {
  it("critical when <= 10 days", () => expect(getStatus(5).label).toBe("Critical"));
  it("expiring when <= 30 days", () => expect(getStatus(20).label).toBe("Expiring"));
  it("active when > 30 days", () => expect(getStatus(60).label).toBe("Active"));
  it("returns correct className", () => {
    expect(getStatus(5).className).toBe("danger");
    expect(getStatus(20).className).toBe("warning");
    expect(getStatus(60).className).toBe("success");
  });
});

describe("scoreClass", () => {
  it("success at 80+", () => expect(scoreClass(85)).toBe("success"));
  it("warning at 60-79", () => expect(scoreClass(70)).toBe("warning"));
  it("danger below 60", () => expect(scoreClass(50)).toBe("danger"));
});

describe("getComplianceScore", () => {
  it("returns 0 for empty list", () => expect(getComplianceScore([])).toBe(0));
  it("returns 100 for policy expiring in 90+ days", () => {
    const policies = [{ daysRemaining: 120 }];
    expect(getComplianceScore(policies)).toBe(100);
  });
  it("averages multiple policies", () => {
    const policies = [{ daysRemaining: 120 }, { daysRemaining: 5 }];
    expect(getComplianceScore(policies)).toBe(Math.round((100 + 18) / 2));
  });
});

describe("totalTrackedPremium", () => {
  it("sums premiumAmount", () => {
    const policies = [{ premiumAmount: 1000 }, { premiumAmount: 2000 }];
    expect(totalTrackedPremium(policies)).toBe(3000);
  });
  it("falls back to premium field", () => {
    const policies = [{ premium: 500 }];
    expect(totalTrackedPremium(policies)).toBe(500);
  });
  it("handles empty array", () => expect(totalTrackedPremium([])).toBe(0));
  it("excludes trade license (a fee, not a premium)", () => {
    const policies = [
      { policyType: "liability", premiumAmount: 1840 },
      { policyType: "license", premiumAmount: 295 },
    ];
    expect(totalTrackedPremium(policies)).toBe(1840);
  });
});

describe("getCoverageGaps", () => {
  it("returns all recommended types when no policies", () => {
    const gaps = getCoverageGaps([]);
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps.every((g) => g.type && g.label && g.reason)).toBe(true);
  });
  it("excludes types already covered", () => {
    const policies = [{ policyType: "liability" }, { policyType: "workers" }];
    const gaps = getCoverageGaps(policies);
    expect(gaps.find((g) => g.type === "liability")).toBeUndefined();
    expect(gaps.find((g) => g.type === "workers")).toBeUndefined();
  });
});

describe("savingsForOpportunity", () => {
  it("computes delta when alternateQuote present", () => {
    const opp = { currentPremium: 5000, alternateQuote: { premium: 4000 } };
    expect(savingsForOpportunity(opp)).toBe(1000);
  });
  it("returns 0 if delta is negative", () => {
    const opp = { currentPremium: 3000, alternateQuote: { premium: 4000 } };
    expect(savingsForOpportunity(opp)).toBe(0);
  });
  it("falls back to estimatedSavings", () => {
    const opp = { estimatedSavings: 750 };
    expect(savingsForOpportunity(opp)).toBe(750);
  });
  it("returns 0 for null input", () => {
    expect(savingsForOpportunity(null)).toBe(0);
  });
});

describe("estimateSavings / estimateLowerPremium", () => {
  it("uses the shared rate", () => {
    expect(estimateSavings(10000)).toBe(Math.round(10000 * ESTIMATED_SAVINGS_RATE));
  });
  it("lower premium is the complement of savings", () => {
    const premium = 10000;
    expect(estimateLowerPremium(premium)).toBe(
      Math.round(premium * (1 - ESTIMATED_SAVINGS_RATE))
    );
  });
  it("savings + lower premium reconstructs the original within rounding", () => {
    const premium = 8543;
    expect(Math.abs(estimateSavings(premium) + estimateLowerPremium(premium) - premium)).toBeLessThanOrEqual(1);
  });
  it("handles non-numeric input as zero", () => {
    expect(estimateSavings(undefined)).toBe(0);
    expect(estimateLowerPremium(null)).toBe(0);
  });
});

describe("getPotentialSavings", () => {
  it("sums available opportunities", () => {
    const opps = [
      { status: "available", estimatedSavings: 500 },
      { status: "quote_received", estimatedSavings: 300 },
      { status: "accepted", estimatedSavings: 200 },
    ];
    expect(getPotentialSavings(opps)).toBe(800);
  });
  it("keeps in-flight opportunities counted so pursuing one doesn't drop the total", () => {
    const opps = [
      { status: "requested", estimatedSavings: 295 },
      { status: "sent_to_partner", estimatedSavings: 360 },
    ];
    expect(getPotentialSavings(opps)).toBe(655);
  });
  it("excludes terminal states (accepted/dismissed)", () => {
    const opps = [
      { status: "accepted", estimatedSavings: 400 },
      { status: "dismissed", estimatedSavings: 100 },
    ];
    expect(getPotentialSavings(opps)).toBe(0);
  });
});

describe("getRealizedSavings", () => {
  it("sums only accepted opportunities", () => {
    const opps = [
      { status: "accepted", estimatedSavings: 400 },
      { status: "available", estimatedSavings: 600 },
    ];
    expect(getRealizedSavings(opps)).toBe(400);
  });
});

describe("policyLabelFromType", () => {
  it("returns known label", () => expect(policyLabelFromType("liability")).toBe("General Liability"));
  it("returns fallback for unknown", () => expect(policyLabelFromType("unknown")).toBe("Insurance Policy"));
});

describe("deriveInitials", () => {
  it("returns two chars for single word", () => expect(deriveInitials("Alpha")).toBe("AL"));
  it("returns first letters for two words", () => expect(deriveInitials("John Doe")).toBe("JD"));
  it("returns ?? for empty string", () => expect(deriveInitials("")).toBe("??"));
});

describe("makeId", () => {
  it("includes prefix", () => expect(makeId("pol")).toMatch(/^pol-/));
  it("is unique each call", () => expect(makeId()).not.toBe(makeId()));
});

describe("storage helpers", () => {
  it("clearStoredData removes the current storage key", () => {
    const shape = { policies: [], contractors: [], activity: [], marker: 1 };
    writeStoredData(shape);
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    clearStoredData();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("readStoredData returns the fallback when nothing is stored", () => {
    clearStoredData();
    const fallback = { policies: [], contractors: [], activity: [], from: "fallback" };
    expect(readStoredData(fallback)).toBe(fallback);
  });
});

describe("policyHealthScore", () => {
  it("returns 0 and Critical for null policy", () => {
    const h = policyHealthScore(null);
    expect(h.score).toBe(0);
    expect(h.grade).toBe("Critical");
  });
  it("penalizes critical renewal window", () => {
    const h = policyHealthScore({ daysRemaining: 5, documents: ["dec.pdf"], coverageLimits: "1M", deductible: 1000, effectiveDate: "2024-01-01" });
    expect(h.score).toBeLessThan(70);
    expect(h.issues.some((i) => /critical/i.test(i))).toBe(true);
  });
  it("penalizes missing documents", () => {
    const h = policyHealthScore({ daysRemaining: 200, documents: [], coverageLimits: "1M", deductible: 1000, effectiveDate: "2024-01-01" });
    expect(h.score).toBeLessThan(100);
    expect(h.issues.some((i) => /declaration/i.test(i))).toBe(true);
  });
  it("gives 100 for a fully complete policy", () => {
    const h = policyHealthScore({ daysRemaining: 200, documents: ["dec.pdf"], coverageLimits: "2M", deductible: 500, effectiveDate: "2024-01-01" });
    expect(h.score).toBe(100);
    expect(h.grade).toBe("Good");
  });
});

describe("daysUntil", () => {
  it("returns 0 for invalid date", () => expect(daysUntil("not-a-date")).toBe(0));
  it("returns positive for future date", () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    const futureDate = [
      future.getFullYear(),
      String(future.getMonth() + 1).padStart(2, "0"),
      String(future.getDate()).padStart(2, "0"),
    ].join("-");
    expect(daysUntil(futureDate)).toBe(10);
  });
});

describe("timeAgo", () => {
  it('returns "Just now" for timestamps under a minute old', () => {
    const recent = new Date(Date.now() - 30 * 1000).toISOString();
    expect(timeAgo(recent)).toBe("Just now");
  });

  it("returns minutes ago for timestamps under an hour", () => {
    const fifteenMin = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    expect(timeAgo(fifteenMin)).toBe("15m ago");
  });

  it("returns hours ago for same-day timestamps", () => {
    const threeHours = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(threeHours)).toBe("3h ago");
  });

  it('returns "Yesterday" for ~24h old timestamps', () => {
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(yesterday)).toBe("Yesterday");
  });

  it("returns empty string for null input", () => {
    expect(timeAgo(null)).toBe("");
  });
});

describe("parseLimitToNumber", () => {
  it("extracts the largest figure from a compound limit", () => {
    expect(parseLimitToNumber("$2M aggregate / $1M occurrence")).toBe(2_000_000);
  });
  it("handles K suffixes", () => {
    expect(parseLimitToNumber("$750k building / $250k contents")).toBe(750_000);
  });
  it("returns 0 for non-numeric limits like Statutory", () => {
    expect(parseLimitToNumber("Statutory")).toBe(0);
  });
  it("passes numbers through unchanged", () => {
    expect(parseLimitToNumber(1_000_000)).toBe(1_000_000);
  });
  it("returns 0 for empty input", () => {
    expect(parseLimitToNumber("")).toBe(0);
  });
});

describe("formatLimitShort", () => {
  it("formats millions", () => expect(formatLimitShort(2_000_000)).toBe("$2M"));
  it("formats fractional millions", () => expect(formatLimitShort(1_500_000)).toBe("$1.5M"));
  it("formats thousands", () => expect(formatLimitShort(750_000)).toBe("$750K"));
});

describe("policyHasEndorsement", () => {
  it("detects an endorsement from document names", () => {
    const policy = { documents: ["GL declarations page", "Additional Insured"] };
    expect(policyHasEndorsement(policy, "additionalInsured")).toBe(true);
  });
  it("honors an explicit endorsement flag", () => {
    const policy = { documents: [], endorsements: { waiverOfSubrogation: true } };
    expect(policyHasEndorsement(policy, "waiverOfSubrogation")).toBe(true);
  });
  it("returns false when the endorsement is absent", () => {
    const policy = { documents: ["GL declarations page"] };
    expect(policyHasEndorsement(policy, "primaryNonContributory")).toBe(false);
  });
});

describe("normalizeRequirements", () => {
  it("drops unknown coverage types and dedupes", () => {
    const result = normalizeRequirements([
      { policyType: "liability", minLimit: 1000000 },
      { policyType: "liability", minLimit: 2000000 },
      { policyType: "nonsense", minLimit: 5 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].minLimit).toBe(1000000);
  });
  it("coerces endorsement flags to booleans", () => {
    const [req] = normalizeRequirements([{ policyType: "workers", additionalInsured: 1 }]);
    expect(req.additionalInsured).toBe(true);
  });
  it("returns an empty array for non-array input", () => {
    expect(normalizeRequirements(null)).toEqual([]);
  });
});

describe("checkCompliance", () => {
  const policies = [
    {
      policyType: "liability",
      coverageLimits: "$2M aggregate / $1M occurrence",
      documents: ["GL declarations page", "Additional Insured"],
      daysRemaining: 45,
    },
    {
      policyType: "umbrella",
      coverageLimits: "$2M excess liability",
      documents: ["Umbrella declarations page"],
      daysRemaining: 300,
    },
  ];

  it("reports compliant when every requirement is met", () => {
    const result = checkCompliance(
      [{ policyType: "liability", minLimit: 2000000, additionalInsured: true }],
      policies
    );
    expect(result.compliant).toBe(true);
    expect(result.unmetCount).toBe(0);
  });

  it("flags a limit that falls short", () => {
    const result = checkCompliance([{ policyType: "umbrella", minLimit: 5000000 }], policies);
    expect(result.compliant).toBe(false);
    expect(result.unmetCount).toBe(1);
    expect(result.results[0].status).toBe("unmet");
  });

  it("flags a missing endorsement", () => {
    const result = checkCompliance(
      [{ policyType: "liability", minLimit: 1000000, primaryNonContributory: true }],
      policies
    );
    expect(result.compliant).toBe(false);
    expect(result.results[0].checks.some((c) => !c.ok)).toBe(true);
  });

  it("marks a required coverage with no policy as missing", () => {
    const result = checkCompliance([{ policyType: "workers", minLimit: 0 }], policies);
    expect(result.results[0].status).toBe("missing");
    expect(result.compliant).toBe(false);
  });

  it("reports no requirements when the list is empty", () => {
    const result = checkCompliance([], policies);
    expect(result.hasRequirements).toBe(false);
    expect(result.compliant).toBe(false);
  });
});

