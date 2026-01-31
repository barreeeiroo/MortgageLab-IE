import { describe, expect, it } from "vitest";
import type { OverpaymentPolicy } from "@/lib/schemas/overpayment-policy";
import { getOverpaymentPolicy } from "../overpayment-policies";

// Helper to create a minimal overpayment policy
function createPolicy(
    overrides: Partial<OverpaymentPolicy> = {},
): OverpaymentPolicy {
    return {
        id: "test-policy",
        label: "Test Policy",
        description: "A test overpayment policy",
        icon: "Percent",
        allowanceType: "percentage",
        allowanceValue: 10,
        allowanceBasis: "balance",
        ...overrides,
    };
}

describe("getOverpaymentPolicy", () => {
    const policies = [
        createPolicy({
            id: "aib-policy",
            label: "AIB Policy",
            allowanceValue: 10,
        }),
        createPolicy({
            id: "boi-policy",
            label: "BOI Policy",
            allowanceValue: 15,
        }),
        createPolicy({
            id: "ptsb-policy",
            label: "PTSB Policy",
            allowanceType: "flat",
            allowanceValue: 5000,
        }),
    ];

    it("returns policy when found", () => {
        const result = getOverpaymentPolicy(policies, "aib-policy");

        expect(result).toBeDefined();
        expect(result?.id).toBe("aib-policy");
        expect(result?.label).toBe("AIB Policy");
        expect(result?.allowanceValue).toBe(10);
    });

    it("returns undefined when policy not found", () => {
        const result = getOverpaymentPolicy(policies, "non-existent");

        expect(result).toBeUndefined();
    });

    it("returns undefined for empty policies array", () => {
        const result = getOverpaymentPolicy([], "aib-policy");

        expect(result).toBeUndefined();
    });

    it("returns correct policy for different IDs", () => {
        const aibResult = getOverpaymentPolicy(policies, "aib-policy");
        const boiResult = getOverpaymentPolicy(policies, "boi-policy");
        const ptsbResult = getOverpaymentPolicy(policies, "ptsb-policy");

        expect(aibResult?.label).toBe("AIB Policy");
        expect(boiResult?.label).toBe("BOI Policy");
        expect(ptsbResult?.label).toBe("PTSB Policy");
    });

    it("returns policy with correct allowanceType", () => {
        const percentagePolicy = getOverpaymentPolicy(policies, "aib-policy");
        const flatPolicy = getOverpaymentPolicy(policies, "ptsb-policy");

        expect(percentagePolicy?.allowanceType).toBe("percentage");
        expect(flatPolicy?.allowanceType).toBe("flat");
    });
});
