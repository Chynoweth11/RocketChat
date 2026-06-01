import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import SubShieldComplete from "../SubShieldComplete.jsx";
import { initialData } from "../data.js";
import { sampleData } from "../sampleData.js";

describe("SubShieldComplete (empty-by-default app)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    cleanup();
  });

  it("renders the dashboard onboarding state with no seeded user data", () => {
    render(<SubShieldComplete />);
    // The empty-state onboarding headline should be present since there are
    // no policies in the default data.
    expect(screen.getByText(/Your insurance command center/i)).toBeTruthy();
  });

  it("ships with no fabricated user content", () => {
    expect(initialData.policies).toHaveLength(0);
    expect(initialData.contractors).toHaveLength(0);
    expect(initialData.documents).toHaveLength(0);
    expect(initialData.savingsOpportunities).toHaveLength(0);
    expect(initialData.quoteRequests).toHaveLength(0);
    expect(initialData.coiSends).toHaveLength(0);
    expect(initialData.activity).toHaveLength(0);
    expect(initialData.settings.invoices).toHaveLength(0);
    expect(initialData.settings.teamMembers).toHaveLength(0);
  });

  it("keeps the platform partner marketplace available", () => {
    expect(initialData.partners.length).toBeGreaterThan(0);
    expect(initialData.partners.every((p) => p.active !== undefined)).toBe(true);
  });

  it("offers a populated sample dataset for demos/reviews", () => {
    // The "Load sample data" control in Settings applies this dataset.
    expect(sampleData.policies.length).toBeGreaterThan(0);
    expect(sampleData.contractors.length).toBeGreaterThan(0);
    expect(sampleData.savingsOpportunities.length).toBeGreaterThan(0);
    expect(sampleData.activity.length).toBeGreaterThan(0);
  });
});
