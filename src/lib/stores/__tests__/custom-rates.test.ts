import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MortgageRate } from "@/lib/schemas/rate";
import {
    $storedCustomRates,
    addCustomRate,
    type CustomRate,
    clearCustomRates,
    hydrateCustomRates,
    isCustomRate,
    mergeCustomRates,
    removeCustomRate,
    type StoredCustomRate,
    updateCustomRate,
} from "../custom-rates";

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: () => {
            store = {};
        },
        get store() {
            return store;
        },
    };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock });

// Helper to create a minimal rate
function createStoredRate(
    overrides: Partial<StoredCustomRate> = {},
): StoredCustomRate {
    return {
        id: "custom-rate-1",
        name: "Custom Rate",
        lenderId: "custom-lender",
        type: "fixed",
        rate: 3.5,
        minLtv: 0,
        maxLtv: 90,
        buyerTypes: ["ftb"],
        perks: [],
        ...overrides,
    };
}

describe("isCustomRate", () => {
    it("returns true for rate with isCustom: true", () => {
        const customRate: CustomRate = {
            ...createStoredRate(),
            isCustom: true,
        };

        expect(isCustomRate(customRate)).toBe(true);
    });

    it("returns false for rate without isCustom property", () => {
        const regularRate: MortgageRate = {
            id: "regular-rate",
            name: "Regular Rate",
            lenderId: "aib",
            type: "fixed",
            rate: 3.5,
            minLtv: 0,
            maxLtv: 90,
            buyerTypes: ["ftb"],
            perks: [],
        };

        expect(isCustomRate(regularRate)).toBe(false);
    });

    it("returns false for rate with isCustom: false", () => {
        const rate = {
            ...createStoredRate(),
            isCustom: false as unknown as true, // Type hack for testing
        };

        expect(isCustomRate(rate as unknown as CustomRate)).toBe(false);
    });
});

describe("hydrateCustomRates", () => {
    it("adds isCustom: true to all rates", () => {
        const stored: StoredCustomRate[] = [
            createStoredRate({ id: "rate-1" }),
            createStoredRate({ id: "rate-2" }),
        ];

        const result = hydrateCustomRates(stored);

        expect(result).toHaveLength(2);
        expect(result[0].isCustom).toBe(true);
        expect(result[1].isCustom).toBe(true);
    });

    it("preserves all other properties", () => {
        const stored: StoredCustomRate[] = [
            createStoredRate({
                id: "rate-1",
                name: "My Rate",
                rate: 4.5,
                customLenderName: "My Bank",
            }),
        ];

        const result = hydrateCustomRates(stored);

        expect(result[0].id).toBe("rate-1");
        expect(result[0].name).toBe("My Rate");
        expect(result[0].rate).toBe(4.5);
        expect(result[0].customLenderName).toBe("My Bank");
    });

    it("returns empty array for empty input", () => {
        const result = hydrateCustomRates([]);

        expect(result).toEqual([]);
    });

    it("preserves timestamps", () => {
        const stored: StoredCustomRate[] = [
            createStoredRate({
                createdAt: "2025-01-01T00:00:00.000Z",
                lastUpdatedAt: "2025-01-15T00:00:00.000Z",
            }),
        ];

        const result = hydrateCustomRates(stored);

        expect(result[0].createdAt).toBe("2025-01-01T00:00:00.000Z");
        expect(result[0].lastUpdatedAt).toBe("2025-01-15T00:00:00.000Z");
    });
});

describe("custom rates store actions", () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
        $storedCustomRates.set([]);
    });

    describe("addCustomRate", () => {
        it("adds rate to store", () => {
            const rate = createStoredRate({ id: "new-rate" });

            addCustomRate(rate);

            const stored = $storedCustomRates.get();
            expect(stored).toHaveLength(1);
            expect(stored[0].id).toBe("new-rate");
        });

        it("adds timestamps to rate", () => {
            const rate = createStoredRate({ id: "new-rate" });

            addCustomRate(rate);

            const stored = $storedCustomRates.get();
            expect(stored[0].createdAt).toBeDefined();
            expect(stored[0].lastUpdatedAt).toBeDefined();
        });

        it("persists to localStorage", () => {
            const rate = createStoredRate({ id: "new-rate" });

            addCustomRate(rate);

            expect(localStorageMock.setItem).toHaveBeenCalled();
        });
    });

    describe("removeCustomRate", () => {
        it("removes rate from store", () => {
            $storedCustomRates.set([
                createStoredRate({ id: "rate-1" }),
                createStoredRate({ id: "rate-2" }),
            ]);

            removeCustomRate("rate-1");

            const stored = $storedCustomRates.get();
            expect(stored).toHaveLength(1);
            expect(stored[0].id).toBe("rate-2");
        });

        it("does nothing for non-existent rate", () => {
            $storedCustomRates.set([createStoredRate({ id: "rate-1" })]);

            removeCustomRate("non-existent");

            const stored = $storedCustomRates.get();
            expect(stored).toHaveLength(1);
        });
    });

    describe("updateCustomRate", () => {
        it("updates existing rate", () => {
            $storedCustomRates.set([
                createStoredRate({ id: "rate-1", rate: 3.5 }),
            ]);

            updateCustomRate(createStoredRate({ id: "rate-1", rate: 4.0 }));

            const stored = $storedCustomRates.get();
            expect(stored[0].rate).toBe(4.0);
        });

        it("preserves createdAt but updates lastUpdatedAt", () => {
            $storedCustomRates.set([
                createStoredRate({
                    id: "rate-1",
                    createdAt: "2025-01-01T00:00:00.000Z",
                    lastUpdatedAt: "2025-01-01T00:00:00.000Z",
                }),
            ]);

            updateCustomRate(createStoredRate({ id: "rate-1", rate: 4.0 }));

            const stored = $storedCustomRates.get();
            expect(stored[0].createdAt).toBe("2025-01-01T00:00:00.000Z");
            expect(stored[0].lastUpdatedAt).not.toBe(
                "2025-01-01T00:00:00.000Z",
            );
        });
    });

    describe("clearCustomRates", () => {
        it("removes all rates", () => {
            $storedCustomRates.set([
                createStoredRate({ id: "rate-1" }),
                createStoredRate({ id: "rate-2" }),
            ]);

            clearCustomRates();

            expect($storedCustomRates.get()).toEqual([]);
        });
    });

    describe("mergeCustomRates", () => {
        it("adds new rates to existing ones", () => {
            $storedCustomRates.set([createStoredRate({ id: "existing" })]);

            mergeCustomRates([createStoredRate({ id: "new" })]);

            const stored = $storedCustomRates.get();
            expect(stored).toHaveLength(2);
        });

        it("overwrites rates with same ID", () => {
            $storedCustomRates.set([
                createStoredRate({ id: "rate-1", rate: 3.5 }),
            ]);

            mergeCustomRates([createStoredRate({ id: "rate-1", rate: 4.0 })]);

            const stored = $storedCustomRates.get();
            expect(stored).toHaveLength(1);
            expect(stored[0].rate).toBe(4.0);
        });
    });
});
