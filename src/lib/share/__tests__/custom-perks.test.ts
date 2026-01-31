import { describe, expect, it } from "vitest";
import type { StoredCustomPerk } from "@/lib/stores/custom-perks";
import {
    compressCustomPerk,
    compressCustomPerks,
    decompressCustomPerk,
    decompressCustomPerks,
} from "../custom-perks";

// Helper to create a test custom perk
function createCustomPerk(
    overrides: Partial<StoredCustomPerk> = {},
): StoredCustomPerk {
    return {
        id: "custom-perk-1",
        label: "Free Valuation",
        description: "Complimentary property valuation worth €150",
        icon: "home",
        ...overrides,
    };
}

describe("compressCustomPerk", () => {
    it("compresses all fields correctly", () => {
        const perk = createCustomPerk();
        const compressed = compressCustomPerk(perk);

        expect(compressed.id).toBe("custom-perk-1");
        expect(compressed.l).toBe("Free Valuation");
        expect(compressed.d).toBe(
            "Complimentary property valuation worth €150",
        );
        expect(compressed.i).toBe("home");
    });

    it("handles undefined description", () => {
        const perk = createCustomPerk({ description: undefined });
        const compressed = compressCustomPerk(perk);

        expect(compressed.d).toBeUndefined();
    });

    it("handles empty description", () => {
        const perk = createCustomPerk({ description: "" });
        const compressed = compressCustomPerk(perk);

        expect(compressed.d).toBe("");
    });

    it("handles various icon types", () => {
        const icons = ["home", "cash", "percent", "star", "check"];

        for (const icon of icons) {
            const perk = createCustomPerk({ icon });
            const compressed = compressCustomPerk(perk);
            expect(compressed.i).toBe(icon);
        }
    });
});

describe("decompressCustomPerk", () => {
    it("decompresses all fields correctly", () => {
        const perk = createCustomPerk();
        const compressed = compressCustomPerk(perk);
        const decompressed = decompressCustomPerk(compressed);

        expect(decompressed.id).toBe("custom-perk-1");
        expect(decompressed.label).toBe("Free Valuation");
        expect(decompressed.description).toBe(
            "Complimentary property valuation worth €150",
        );
        expect(decompressed.icon).toBe("home");
    });

    it("handles missing description", () => {
        const compressed = {
            id: "test",
            l: "Test Perk",
            i: "star",
        };
        const decompressed = decompressCustomPerk(compressed);

        expect(decompressed.description).toBeUndefined();
    });
});

describe("compressCustomPerks", () => {
    it("compresses an array of perks", () => {
        const perks = [
            createCustomPerk({ id: "perk-1", label: "Perk 1" }),
            createCustomPerk({ id: "perk-2", label: "Perk 2" }),
            createCustomPerk({ id: "perk-3", label: "Perk 3" }),
        ];
        const compressed = compressCustomPerks(perks);

        expect(compressed).toHaveLength(3);
        expect(compressed[0].l).toBe("Perk 1");
        expect(compressed[1].l).toBe("Perk 2");
        expect(compressed[2].l).toBe("Perk 3");
    });

    it("returns empty array for empty input", () => {
        const compressed = compressCustomPerks([]);
        expect(compressed).toEqual([]);
    });
});

describe("decompressCustomPerks", () => {
    it("decompresses an array of perks", () => {
        const perks = [
            createCustomPerk({ id: "perk-1", label: "Perk 1" }),
            createCustomPerk({ id: "perk-2", label: "Perk 2" }),
            createCustomPerk({ id: "perk-3", label: "Perk 3" }),
        ];
        const compressed = compressCustomPerks(perks);
        const decompressed = decompressCustomPerks(compressed);

        expect(decompressed).toHaveLength(3);
        expect(decompressed[0].label).toBe("Perk 1");
        expect(decompressed[1].label).toBe("Perk 2");
        expect(decompressed[2].label).toBe("Perk 3");
    });

    it("returns empty array for empty input", () => {
        const decompressed = decompressCustomPerks([]);
        expect(decompressed).toEqual([]);
    });
});

describe("roundtrip compression", () => {
    it("preserves single perk through compression/decompression", () => {
        const original = createCustomPerk();
        const compressed = compressCustomPerk(original);
        const decompressed = decompressCustomPerk(compressed);

        expect(decompressed).toEqual(original);
    });

    it("preserves array of perks through compression/decompression", () => {
        const original = [
            createCustomPerk({ id: "perk-1", label: "Cashback", icon: "cash" }),
            createCustomPerk({
                id: "perk-2",
                label: "Rate Discount",
                icon: "percent",
            }),
            createCustomPerk({
                id: "perk-3",
                label: "Free Legal",
                description: "Free legal fees up to €1,500",
                icon: "file",
            }),
        ];
        const compressed = compressCustomPerks(original);
        const decompressed = decompressCustomPerks(compressed);

        expect(decompressed).toEqual(original);
    });

    it("preserves special characters in label and description", () => {
        const original = createCustomPerk({
            label: "€500 Cashback",
            description: "Get €500 back after 6 months (T&C's apply)",
        });
        const compressed = compressCustomPerk(original);
        const decompressed = decompressCustomPerk(compressed);

        expect(decompressed.label).toBe("€500 Cashback");
        expect(decompressed.description).toBe(
            "Get €500 back after 6 months (T&C's apply)",
        );
    });

    it("preserves unicode in description", () => {
        const original = createCustomPerk({
            label: "Green Mortgage",
            description: "🌱 Eco-friendly rate for A-rated homes",
        });
        const compressed = compressCustomPerk(original);
        const decompressed = decompressCustomPerk(compressed);

        expect(decompressed.description).toBe(
            "🌱 Eco-friendly rate for A-rated homes",
        );
    });

    it("preserves order in array compression", () => {
        const original = [
            createCustomPerk({ id: "1", label: "First" }),
            createCustomPerk({ id: "2", label: "Second" }),
            createCustomPerk({ id: "3", label: "Third" }),
        ];
        const compressed = compressCustomPerks(original);
        const decompressed = decompressCustomPerks(compressed);

        expect(decompressed[0].id).toBe("1");
        expect(decompressed[1].id).toBe("2");
        expect(decompressed[2].id).toBe("3");
    });
});
