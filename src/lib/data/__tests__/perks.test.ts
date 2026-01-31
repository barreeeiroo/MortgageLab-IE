import { describe, expect, it } from "vitest";
import type { Perk } from "@/lib/schemas/perk";
import { getPerk, resolvePerks } from "../perks";

// Helper to create a minimal perk
function createPerk(overrides: Partial<Perk> = {}): Perk {
    return {
        id: "test-perk",
        label: "Test Perk",
        description: "A test perk",
        icon: "Gift",
        ...overrides,
    };
}

describe("getPerk", () => {
    const perks = [
        createPerk({ id: "cashback-2pct", label: "2% Cashback" }),
        createPerk({ id: "free-valuation", label: "Free Valuation" }),
        createPerk({ id: "legal-contribution", label: "Legal Contribution" }),
    ];

    it("returns perk when found", () => {
        const result = getPerk(perks, "cashback-2pct");

        expect(result).toBeDefined();
        expect(result?.id).toBe("cashback-2pct");
        expect(result?.label).toBe("2% Cashback");
    });

    it("returns undefined when perk not found", () => {
        const result = getPerk(perks, "non-existent");

        expect(result).toBeUndefined();
    });

    it("returns undefined for empty perks array", () => {
        const result = getPerk([], "cashback-2pct");

        expect(result).toBeUndefined();
    });

    it("handles case-sensitive matching", () => {
        const result = getPerk(perks, "CASHBACK-2PCT");

        expect(result).toBeUndefined();
    });
});

describe("resolvePerks", () => {
    const perks = [
        createPerk({ id: "cashback-2pct", label: "2% Cashback" }),
        createPerk({ id: "free-valuation", label: "Free Valuation" }),
        createPerk({ id: "legal-contribution", label: "Legal Contribution" }),
    ];

    it("returns array of perks matching provided IDs", () => {
        const result = resolvePerks(perks, ["cashback-2pct", "free-valuation"]);

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe("cashback-2pct");
        expect(result[1].id).toBe("free-valuation");
    });

    it("filters out non-existent perk IDs", () => {
        const result = resolvePerks(perks, ["cashback-2pct", "non-existent"]);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("cashback-2pct");
    });

    it("returns empty array for empty perk IDs", () => {
        const result = resolvePerks(perks, []);

        expect(result).toEqual([]);
    });

    it("returns empty array when no IDs match", () => {
        const result = resolvePerks(perks, ["unknown-1", "unknown-2"]);

        expect(result).toEqual([]);
    });

    it("preserves order of input perk IDs", () => {
        const result = resolvePerks(perks, [
            "legal-contribution",
            "cashback-2pct",
            "free-valuation",
        ]);

        expect(result).toHaveLength(3);
        expect(result[0].id).toBe("legal-contribution");
        expect(result[1].id).toBe("cashback-2pct");
        expect(result[2].id).toBe("free-valuation");
    });

    it("handles duplicate IDs in input", () => {
        const result = resolvePerks(perks, [
            "cashback-2pct",
            "cashback-2pct",
            "free-valuation",
        ]);

        // Duplicates are resolved multiple times
        expect(result).toHaveLength(3);
        expect(result[0].id).toBe("cashback-2pct");
        expect(result[1].id).toBe("cashback-2pct");
        expect(result[2].id).toBe("free-valuation");
    });

    it("works with single perk ID", () => {
        const result = resolvePerks(perks, ["free-valuation"]);

        expect(result).toHaveLength(1);
        expect(result[0].label).toBe("Free Valuation");
    });
});
