import { describe, it, expect } from "vitest";
import { parseAcordItems, isAcordCertificate } from "../pdfExtraction.js";

// Positioned text items reproduced from a real ACORD 25 certificate
// (Hartford / LMC Slab & Tile). y increases upward, matching pdf.js.
const ITEMS = [
  { x: 128, y: 754, text: "CERTIFICATE OF LIABILITY INSURANCE" },
  { x: 511, y: 754, text: "09/27/2024" },
  { x: 47, y: 702, text: "IMPORTANT: If the certificate holder is an ADDITIONAL INSURED, the policy(ies) must be endorsed." },
  { x: 40, y: 674, text: "PRODUCER" },
  { x: 40, y: 664, text: "WALL STREET INSURANCE" },
  { x: 291, y: 659, text: "(970) 926-4900" },
  { x: 40, y: 654, text: "34346336" },
  { x: 40, y: 643, text: "PO BOX 20" },
  { x: 40, y: 633, text: "EDWARDS CO 81632" },
  { x: 326, y: 627, text: "INSURER(S) AFFORDING COVERAGE" },
  { x: 536, y: 627, text: "NAIC#" },
  { x: 244, y: 612, text: "INSURER A :" },
  { x: 286, y: 612, text: "Hartford Underwriters Insurance Company" },
  { x: 529, y: 612, text: "30104" },
  { x: 40, y: 600, text: "INSURED" },
  { x: 40, y: 588, text: "LMC SLAB & TILE LLC" },
  { x: 40, y: 577, text: "PO BOX 8911" },
  { x: 40, y: 567, text: "AVON CO 81620-8830" },
  // Commercial General Liability + limits
  { x: 70, y: 468, text: "COMMERCIAL GENERAL LIABILITY" },
  { x: 422, y: 468, text: "EACH OCCURRENCE" },
  { x: 534, y: 468, text: "$1,000,000" },
  { x: 421, y: 455, text: "DAMAGE TO RENTED" },
  { x: 534, y: 455, text: "$1,000,000" },
  { x: 422, y: 440, text: "MED EXP (Any one person)" },
  { x: 545, y: 440, text: "$10,000" },
  { x: 42, y: 429, text: "A" },
  { x: 237, y: 429, text: "34 SBM AY7HMC" },
  { x: 321, y: 429, text: "06/29/2024" },
  { x: 374, y: 429, text: "06/29/2025" },
  { x: 422, y: 429, text: "PERSONAL & ADV INJURY" },
  { x: 534, y: 429, text: "$1,000,000" },
  { x: 422, y: 416, text: "GENERAL AGGREGATE" },
  { x: 534, y: 416, text: "$2,000,000" },
  { x: 422, y: 405, text: "PRODUCTS - COMP/OP AGG" },
  { x: 534, y: 405, text: "$2,000,000" },
  // Empty coverages
  { x: 57, y: 377, text: "AUTOMOBILE LIABILITY" },
  { x: 71, y: 305, text: "UMBRELLA LIAB" },
  { x: 57, y: 268, text: "WORKERS COMPENSATION" },
  { x: 57, y: 220, text: "If yes, describe under" },
  { x: 57, y: 212, text: "DESCRIPTION OF OPERATIONS below" },
  // Employment Practices Liability + limits
  { x: 57, y: 201, text: "Employment Practices Liability" },
  { x: 435, y: 201, text: "Each Claim Limit" },
  { x: 545, y: 201, text: "$25,000" },
  { x: 42, y: 198, text: "A" },
  { x: 237, y: 198, text: "34 SBM AY7HMC" },
  { x: 321, y: 198, text: "06/29/2024" },
  { x: 374, y: 198, text: "06/29/2025" },
  { x: 423, y: 190, text: "Annual Aggregate Limit" },
  { x: 545, y: 190, text: "$25,000" },
  { x: 39, y: 181, text: "DESCRIPTION OF OPERATIONS / LOCATIONS / VEHICLES" },
  // Certificate holder
  { x: 39, y: 157, text: "CERTIFICATE HOLDER" },
  { x: 39, y: 148, text: "MORNINGSTAR MOUNTAIN PROPERTY" },
  { x: 39, y: 138, text: "ATIMA, and/or ISAOA" },
  { x: 39, y: 127, text: "1115 CHAMBERS AVE UNIT A102" },
  { x: 39, y: 117, text: "EAGLE CO 81631" },
];

describe("isAcordCertificate", () => {
  it("detects an ACORD certificate", () => {
    expect(isAcordCertificate("ACORD CERTIFICATE OF LIABILITY INSURANCE ...")).toBe(true);
  });
  it("ignores unrelated text", () => {
    expect(isAcordCertificate("Renewal quote summary")).toBe(false);
  });
});

describe("parseAcordItems", () => {
  const result = parseAcordItems(ITEMS);

  it("maps the carrier from INSURER A (not disclaimer text)", () => {
    expect(result.fields.carrier).toBe("Hartford Underwriters Insurance Company");
    expect(result.fields.carrier).not.toMatch(/authorized representative/i);
  });

  it("extracts the NAIC number", () => {
    expect(result.fields.naic).toBe("30104");
  });

  it("reads the named insured from the INSURED block", () => {
    expect(result.fields.insuredName).toBe("LMC SLAB & TILE LLC");
  });

  it("reads the certificate holder from the holder block, not the disclaimer", () => {
    expect(result.fields.certificateHolder).toBe(
      "MORNINGSTAR MOUNTAIN PROPERTY, ATIMA, and/or ISAOA"
    );
    expect(result.fields.certificateHolder).not.toMatch(/additional insured/i);
  });

  it("reads policy number and dates from the coverage row", () => {
    expect(result.fields.policyNumber).toBe("34 SBM AY7HMC");
    expect(result.fields.effectiveDate).toBe("06/29/2024");
    expect(result.fields.expirationDate).toBe("06/29/2025");
    expect(result.fields.certificateDate).toBe("09/27/2024");
  });

  it("extracts the General Liability coverage with all limits", () => {
    const gl = result.coverages.find((c) => c.type === "Commercial General Liability");
    expect(gl).toBeTruthy();
    expect(gl.policyNumber).toBe("34 SBM AY7HMC");
    expect(gl.limits).toHaveLength(6);
    const byName = Object.fromEntries(gl.limits.map((l) => [l.name, l.amount]));
    expect(byName["Each Occurrence"]).toBe("$1,000,000");
    expect(byName["General Aggregate"]).toBe("$2,000,000");
    expect(byName["Products / Completed Operations Aggregate"]).toBe("$2,000,000");
    expect(byName["Medical Expense"]).toBe("$10,000");
  });

  it("extracts Employment Practices Liability as its own coverage", () => {
    const epli = result.coverages.find((c) => c.type === "Employment Practices Liability");
    expect(epli).toBeTruthy();
    expect(epli.limits).toHaveLength(2);
  });

  it("flags Auto, Umbrella, and Workers' Comp as not found", () => {
    expect(result.missingCoverages).toEqual(
      expect.arrayContaining([
        "Automobile Liability",
        "Umbrella / Excess Liability",
        "Workers' Compensation",
      ])
    );
    expect(result.missingCoverages).not.toContain("Employment Practices Liability");
  });
});
