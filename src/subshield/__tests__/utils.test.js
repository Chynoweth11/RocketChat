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
  policyLabelFromType,
  deriveInitials,
  makeId,
  daysUntil,
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
  it("success at 85+", () => expect(scoreClass(85)).toBe("success"));
  it("warning at 65-84", () => expect(scoreClass(70)).toBe("warning"));
  it("danger below 65", () => expect(scoreClass(50)).toBe("danger"));
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

describe("getPotentialSavings", () => {
  it("sums available opportunities", () => {
    const opps = [
      { status: "available", estimatedSavings: 500 },
      { status: "quote_received", estimatedSavings: 300 },
      { status: "accepted", estimatedSavings: 200 },
    ];
    expect(getPotentialSavings(opps)).toBe(800);
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

describe("daysUntil", () => {
  it("returns 0 for invalid date", () => expect(daysUntil("not-a-date")).toBe(0));
  it("returns positive for future date", () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    expect(daysUntil(future.toISOString().slice(0, 10))).toBe(10);
  });
});
