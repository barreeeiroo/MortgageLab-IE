import { describe, expect, it } from "vitest";
import type { Lender } from "@/lib/schemas/lender";
import type { MortgageRate } from "@/lib/schemas/rate";
import { getLender, getLenderForRate } from "../lenders";

// Helper to create a minimal lender
function createLender(overrides: Partial<Lender> = {}): Lender {
    return {
        id: "test-lender",
        name: "Test Lender",
        shortName: "Test",
        mortgagesUrl: "https://example.com/mortgages",
        perks: [],
        logo: "/logos/test.webp",
        ratesUrl: "https://example.com/rates",
        ...overrides,
    };
}

// Helper to create a minimal rate
function createRate(overrides: Partial<MortgageRate> = {}): MortgageRate {
    return {
        id: "test-rate",
        name: "Test Rate",
        lenderId: "test-lender",
        type: "fixed",
        rate: 3.5,
        minLtv: 0,
        maxLtv: 90,
        buyerTypes: ["ftb"],
        perks: [],
        ...overrides,
    };
}

describe("getLender", () => {
    const lenders = [
        createLender({ id: "aib", name: "AIB" }),
        createLender({ id: "boi", name: "Bank of Ireland" }),
        createLender({ id: "ptsb", name: "Permanent TSB" }),
    ];

    it("returns lender when found", () => {
        const result = getLender(lenders, "aib");

        expect(result).toBeDefined();
        expect(result?.id).toBe("aib");
        expect(result?.name).toBe("AIB");
    });

    it("returns undefined when lender not found", () => {
        const result = getLender(lenders, "non-existent");

        expect(result).toBeUndefined();
    });

    it("returns first match when multiple lenders have same ID", () => {
        const duplicateLenders = [
            createLender({ id: "aib", name: "First AIB" }),
            createLender({ id: "aib", name: "Second AIB" }),
        ];

        const result = getLender(duplicateLenders, "aib");

        expect(result?.name).toBe("First AIB");
    });

    it("returns undefined for empty lenders array", () => {
        const result = getLender([], "aib");

        expect(result).toBeUndefined();
    });

    it("handles case-sensitive matching", () => {
        const result = getLender(lenders, "AIB");

        expect(result).toBeUndefined();
    });
});

describe("getLenderForRate", () => {
    const lenders = [
        createLender({ id: "aib", name: "AIB" }),
        createLender({ id: "boi", name: "Bank of Ireland" }),
    ];

    it("returns lender matching rate's lenderId", () => {
        const rate = createRate({ lenderId: "aib" });

        const result = getLenderForRate(lenders, rate);

        expect(result?.id).toBe("aib");
    });

    it("returns undefined when lender not found for rate", () => {
        const rate = createRate({ lenderId: "unknown" });

        const result = getLenderForRate(lenders, rate);

        expect(result).toBeUndefined();
    });

    it("works with different lenderIds", () => {
        const aibRate = createRate({ id: "aib-rate", lenderId: "aib" });
        const boiRate = createRate({ id: "boi-rate", lenderId: "boi" });

        expect(getLenderForRate(lenders, aibRate)?.name).toBe("AIB");
        expect(getLenderForRate(lenders, boiRate)?.name).toBe(
            "Bank of Ireland",
        );
    });
});
