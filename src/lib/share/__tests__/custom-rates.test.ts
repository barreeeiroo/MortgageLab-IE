import { describe, expect, it } from "vitest";
import type { StoredCustomRate } from "@/lib/stores/custom-rates";
import { compressCustomRate, decompressCustomRate } from "../custom-rates";

// Helper to create a test custom rate
function createCustomRate(
    overrides: Partial<StoredCustomRate> = {},
): StoredCustomRate {
    return {
        id: "custom-rate-1",
        name: "My Custom Rate",
        lenderId: "custom",
        type: "fixed",
        rate: 3.5,
        apr: 3.8,
        fixedTerm: 3,
        minLtv: 0,
        maxLtv: 80,
        minLoan: 100000,
        buyerTypes: ["ftb", "mover"],
        berEligible: ["A1", "A2", "A3"],
        newBusiness: true,
        perks: ["cashback", "free-valuation"],
        warning: "Limited time offer",
        customLenderName: "My Bank",
        ...overrides,
    };
}

describe("compressCustomRate", () => {
    it("compresses all fields correctly", () => {
        const rate = createCustomRate();
        const compressed = compressCustomRate(rate);

        expect(compressed.id).toBe("custom-rate-1");
        expect(compressed.n).toBe("My Custom Rate");
        expect(compressed.li).toBe("custom");
        expect(compressed.ty).toBe("fixed");
        expect(compressed.rt).toBe(3.5);
        expect(compressed.ap).toBe(3.8);
        expect(compressed.ft).toBe(3);
        expect(compressed.mnL).toBe(0);
        expect(compressed.mxL).toBe(80);
        expect(compressed.mnLn).toBe(100000);
        expect(compressed.bt).toEqual(["ftb", "mover"]);
        expect(compressed.be).toEqual(["A1", "A2", "A3"]);
        expect(compressed.nb).toBe(true);
        expect(compressed.pk).toEqual(["cashback", "free-valuation"]);
        expect(compressed.w).toBe("Limited time offer");
        expect(compressed.cln).toBe("My Bank");
    });

    it("excludes perks when empty", () => {
        const rate = createCustomRate({ perks: [] });
        const compressed = compressCustomRate(rate);

        expect(compressed.pk).toBeUndefined();
    });

    it("handles variable rate type", () => {
        const rate = createCustomRate({
            type: "variable",
            fixedTerm: undefined,
        });
        const compressed = compressCustomRate(rate);

        expect(compressed.ty).toBe("variable");
        expect(compressed.ft).toBeUndefined();
    });

    it("handles undefined optional fields", () => {
        const rate = createCustomRate({
            apr: undefined,
            minLoan: undefined,
            berEligible: undefined,
            newBusiness: undefined,
            warning: undefined,
            customLenderName: undefined,
        });
        const compressed = compressCustomRate(rate);

        expect(compressed.ap).toBeUndefined();
        expect(compressed.mnLn).toBeUndefined();
        expect(compressed.be).toBeUndefined();
        expect(compressed.nb).toBeUndefined();
        expect(compressed.w).toBeUndefined();
        expect(compressed.cln).toBeUndefined();
    });
});

describe("decompressCustomRate", () => {
    it("decompresses all fields correctly", () => {
        const rate = createCustomRate();
        const compressed = compressCustomRate(rate);
        const decompressed = decompressCustomRate(compressed);

        expect(decompressed.id).toBe("custom-rate-1");
        expect(decompressed.name).toBe("My Custom Rate");
        expect(decompressed.lenderId).toBe("custom");
        expect(decompressed.type).toBe("fixed");
        expect(decompressed.rate).toBe(3.5);
        expect(decompressed.apr).toBe(3.8);
        expect(decompressed.fixedTerm).toBe(3);
        expect(decompressed.minLtv).toBe(0);
        expect(decompressed.maxLtv).toBe(80);
        expect(decompressed.minLoan).toBe(100000);
        expect(decompressed.buyerTypes).toEqual(["ftb", "mover"]);
        expect(decompressed.berEligible).toEqual(["A1", "A2", "A3"]);
        expect(decompressed.newBusiness).toBe(true);
        expect(decompressed.perks).toEqual(["cashback", "free-valuation"]);
        expect(decompressed.warning).toBe("Limited time offer");
        expect(decompressed.customLenderName).toBe("My Bank");
    });

    it("defaults perks to empty array when undefined", () => {
        const compressed = {
            id: "test",
            n: "Test Rate",
            li: "custom",
            ty: "variable",
            rt: 4.5,
            mnL: 0,
            mxL: 90,
            bt: ["ftb"],
            // pk is undefined
        };
        const decompressed = decompressCustomRate(compressed);

        expect(decompressed.perks).toEqual([]);
    });

    it("handles all buyer types", () => {
        const rate = createCustomRate({
            buyerTypes: ["ftb", "mover", "btl"],
        });
        const compressed = compressCustomRate(rate);
        const decompressed = decompressCustomRate(compressed);

        expect(decompressed.buyerTypes).toEqual(["ftb", "mover", "btl"]);
    });
});

describe("roundtrip compression", () => {
    it("preserves all data through compression/decompression", () => {
        const original = createCustomRate();
        const compressed = compressCustomRate(original);
        const decompressed = decompressCustomRate(compressed);

        expect(decompressed).toEqual(original);
    });

    it("preserves variable rate without fixed term", () => {
        const original = createCustomRate({
            type: "variable",
            fixedTerm: undefined,
        });
        const compressed = compressCustomRate(original);
        const decompressed = decompressCustomRate(compressed);

        expect(decompressed.type).toBe("variable");
        expect(decompressed.fixedTerm).toBeUndefined();
    });

    it("preserves green rate", () => {
        const original = createCustomRate({
            berEligible: ["A1", "A2", "A3", "B1", "B2", "B3"],
        });
        const compressed = compressCustomRate(original);
        const decompressed = decompressCustomRate(compressed);

        expect(decompressed.berEligible).toEqual([
            "A1",
            "A2",
            "A3",
            "B1",
            "B2",
            "B3",
        ]);
    });

    it("preserves numeric precision", () => {
        const original = createCustomRate({
            rate: 3.45,
            apr: 3.67,
            minLtv: 10,
            maxLtv: 85,
            minLoan: 150000,
        });
        const compressed = compressCustomRate(original);
        const decompressed = decompressCustomRate(compressed);

        expect(decompressed.rate).toBe(3.45);
        expect(decompressed.apr).toBe(3.67);
        expect(decompressed.minLtv).toBe(10);
        expect(decompressed.maxLtv).toBe(85);
        expect(decompressed.minLoan).toBe(150000);
    });

    it("preserves empty buyer types array", () => {
        const original = createCustomRate({
            buyerTypes: [],
        });
        const compressed = compressCustomRate(original);
        const decompressed = decompressCustomRate(compressed);

        expect(decompressed.buyerTypes).toEqual([]);
    });

    it("preserves custom lender name with special characters", () => {
        const original = createCustomRate({
            customLenderName: "Bank of Ireland (Green)",
        });
        const compressed = compressCustomRate(original);
        const decompressed = decompressCustomRate(compressed);

        expect(decompressed.customLenderName).toBe("Bank of Ireland (Green)");
    });
});
