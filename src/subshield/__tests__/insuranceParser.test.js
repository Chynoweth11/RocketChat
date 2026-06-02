import { describe, it, expect } from "vitest";
import {
  parseInsuranceDocument,
  detectDocumentKind,
  detectCoverageTypes,
  detectEndorsements,
  findDates,
  findAmounts,
  findPolicyNumbers,
} from "../insuranceParser.js";

// A representative ACORD 25 "Certificate of Liability Insurance" as the flat
// text a PDF extractor would yield: insurer letters, four coverage rows, and a
// description-of-operations block carrying the endorsement wording.
const ACORD_25 = `ACORD CERTIFICATE OF LIABILITY INSURANCE DATE (MM/DD/YYYY) 03/15/2025
PRODUCER Lighthouse Risk Advisors, 100 Congress Ave, Austin TX 78701
INSURED SubShield Tile Co., 4411 South Congress Ave, Austin TX 78745
INSURER A : Acme Mutual Insurance Company NAIC# 12345
INSURER B : Progressive Commercial Casualty NAIC# 23456
INSURER C : Hiscox Insurance Company NAIC# 34567
INSURER D : StateFund West Mutual NAIC# 45678
COVERAGES CERTIFICATE NUMBER: 1001 REVISION NUMBER:
TYPE OF INSURANCE ADDL INSD SUBR WVD POLICY NUMBER POLICY EFF POLICY EXP LIMITS
A X COMMERCIAL GENERAL LIABILITY X X GL-44827193 01/01/2025 01/01/2026 EACH OCCURRENCE $1,000,000 GENERAL AGGREGATE $2,000,000
B AUTOMOBILE LIABILITY CA-55120984 02/01/2025 02/01/2026 COMBINED SINGLE LIMIT $1,000,000
C UMBRELLA LIAB X EXCESS LIAB UM-7740921 03/01/2025 03/01/2026 EACH OCCURRENCE $2,000,000
D WORKERS COMPENSATION AND EMPLOYERS' LIABILITY WC-90183321 04/01/2025 04/01/2026 E.L. EACH ACCIDENT $1,000,000
DESCRIPTION OF OPERATIONS / LOCATIONS / VEHICLES
Turner Construction is named as Additional Insured. Primary and Non-Contributory and Waiver of Subrogation apply per written contract.
CERTIFICATE HOLDER Turner Construction Company, 375 Hudson Street, New York NY 10014`;

// A single-policy carrier declarations page with labelled fields.
const DEC_PAGE = `TRAVELERS
COMMERCIAL GENERAL LIABILITY COVERAGE DECLARATIONS
Named Insured: SubShield Tile Co.
Policy Number: GL-44827193
Policy Period: 01/01/2025 to 01/01/2026
Each Occurrence Limit $1,000,000
General Aggregate Limit $2,000,000
Deductible: $1,000`;

describe("detectDocumentKind", () => {
  it("recognizes an ACORD certificate of liability insurance", () => {
    expect(detectDocumentKind(ACORD_25)).toBe("coi");
  });
  it("recognizes a declarations page", () => {
    expect(detectDocumentKind(DEC_PAGE)).toBe("declaration");
  });
  it("returns unknown for unrelated text", () => {
    expect(detectDocumentKind("just a grocery list of apples")).toBe("unknown");
  });
});

describe("detectCoverageTypes", () => {
  it("finds all four coverage lines on a COI", () => {
    const types = detectCoverageTypes(ACORD_25);
    expect(types).toContain("liability");
    expect(types).toContain("auto");
    expect(types).toContain("umbrella");
    expect(types).toContain("workers");
  });
  it("does not mistake automobile liability for general liability", () => {
    expect(detectCoverageTypes("AUTOMOBILE LIABILITY COMBINED SINGLE LIMIT")).toEqual(["auto"]);
  });
});

describe("findDates", () => {
  it("parses MM/DD/YYYY in document order", () => {
    const dates = findDates("eff 01/01/2025 exp 01/01/2026");
    expect(dates.map((d) => d.iso)).toEqual(["2025-01-01", "2026-01-01"]);
  });
  it("parses two-digit years as 2000s", () => {
    expect(findDates("03/15/25")[0].iso).toBe("2025-03-15");
  });
  it("parses month-name dates", () => {
    expect(findDates("January 5, 2026")[0].iso).toBe("2026-01-05");
  });
  it("ignores impossible dates", () => {
    expect(findDates("13/45/2025")).toHaveLength(0);
  });
});

describe("findAmounts", () => {
  it("extracts dollar limits and ignores small numbers", () => {
    const values = findAmounts("EACH OCCURRENCE $1,000,000 page 5 of 12").map((a) => a.value);
    expect(values).toContain(1000000);
    expect(values).not.toContain(5);
    expect(values).not.toContain(12);
  });
});

describe("findPolicyNumbers", () => {
  it("finds carrier-style policy numbers", () => {
    const nums = findPolicyNumbers("GL-44827193 and WC 90183321").map((n) => n.raw);
    expect(nums).toContain("GL-44827193");
    expect(nums.some((n) => n.replace(/\s/g, "") === "WC90183321")).toBe(true);
  });
  it("does not return bare dates as policy numbers", () => {
    expect(findPolicyNumbers("01/01/2025")).toHaveLength(0);
  });
});

describe("detectEndorsements", () => {
  it("detects the three GC-critical endorsements", () => {
    const e = detectEndorsements(ACORD_25);
    expect(e.additionalInsured).toBe(true);
    expect(e.waiverOfSubrogation).toBe(true);
    expect(e.primaryNonContributory).toBe(true);
  });
  it("reports false when wording is absent", () => {
    const e = detectEndorsements("COMMERCIAL GENERAL LIABILITY EACH OCCURRENCE $1,000,000");
    expect(e.additionalInsured).toBe(false);
    expect(e.primaryNonContributory).toBe(false);
  });
});

describe("parseInsuranceDocument — ACORD 25 COI", () => {
  const result = parseInsuranceDocument(ACORD_25);

  it("classifies the document as a COI", () => {
    expect(result.kind).toBe("coi");
  });

  it("detects all four policies", () => {
    expect(result.policies.map((p) => p.policyType).sort()).toEqual(
      ["auto", "liability", "umbrella", "workers"].sort()
    );
  });

  it("maps each coverage row to the correct insurer via the ACORD letter", () => {
    const byType = Object.fromEntries(result.policies.map((p) => [p.policyType, p]));
    expect(byType.liability.carrier).toMatch(/Acme Mutual/);
    expect(byType.auto.carrier).toMatch(/Progressive/);
    expect(byType.umbrella.carrier).toMatch(/Hiscox/);
    expect(byType.workers.carrier).toMatch(/StateFund/);
  });

  it("associates each policy number with its row", () => {
    const byType = Object.fromEntries(result.policies.map((p) => [p.policyType, p]));
    expect(byType.liability.policyNumber).toBe("GL-44827193");
    expect(byType.auto.policyNumber).toBe("CA-55120984");
    expect(byType.umbrella.policyNumber).toBe("UM-7740921");
    expect(byType.workers.policyNumber).toBe("WC-90183321");
  });

  it("reads effective and expiration dates per row", () => {
    const gl = result.policies.find((p) => p.policyType === "liability");
    expect(gl.effectiveDate).toBe("2025-01-01");
    expect(gl.expirationDate).toBe("2026-01-01");
  });

  it("builds the GL limit string from each-occurrence and aggregate", () => {
    const gl = result.policies.find((p) => p.policyType === "liability");
    expect(gl.coverageLimits).toMatch(/2,000,000 aggregate/);
    expect(gl.coverageLimits).toMatch(/1,000,000 occurrence/);
    expect(gl.limitValue).toBe(2000000);
  });

  it("carries the detected endorsements on the liability policy", () => {
    const gl = result.policies.find((p) => p.policyType === "liability");
    expect(gl.endorsements.additionalInsured).toBe(true);
    expect(gl.endorsements.primaryNonContributory).toBe(true);
  });

  it("pulls out the certificate holder", () => {
    expect(result.certificateHolder).toMatch(/Turner Construction/);
  });
});

describe("parseInsuranceDocument — declarations page", () => {
  const result = parseInsuranceDocument(DEC_PAGE);

  it("classifies as a declaration", () => {
    expect(result.kind).toBe("declaration");
  });

  it("detects exactly one policy", () => {
    expect(result.policies).toHaveLength(1);
    expect(result.policies[0].policyType).toBe("liability");
  });

  it("reads the labelled policy number with high confidence", () => {
    const policy = result.policies[0];
    expect(policy.policyNumber).toMatch(/GL-44827193/);
    expect(policy.confidence.policyNumber).toBe("high");
  });

  it("reads the policy period dates", () => {
    const policy = result.policies[0];
    expect(policy.effectiveDate).toBe("2025-01-01");
    expect(policy.expirationDate).toBe("2026-01-01");
  });

  it("identifies the Travelers carrier", () => {
    expect(result.policies[0].carrier).toMatch(/Travelers/);
    expect(result.policies[0].confidence.carrier).toBe("high");
  });

  it("captures the named insured", () => {
    expect(result.namedInsured).toMatch(/SubShield Tile Co/);
  });
});

describe("parseInsuranceDocument — empty and junk input", () => {
  it("returns an empty policy list for blank text", () => {
    const result = parseInsuranceDocument("");
    expect(result.policies).toHaveLength(0);
    expect(result.kind).toBe("unknown");
  });
  it("does not throw on non-string input", () => {
    expect(() => parseInsuranceDocument(null)).not.toThrow();
  });
});
