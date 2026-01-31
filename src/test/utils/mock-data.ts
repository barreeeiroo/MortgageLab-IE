import type { BerRating } from "@/lib/constants/ber";
import type { BuyerType } from "@/lib/schemas/buyer";
import type { Lender } from "@/lib/schemas/lender";
import type { MortgageRate } from "@/lib/schemas/rate";

/**
 * Create a mock MortgageRate with sensible defaults
 */
export function createMockRate(
    overrides: Partial<MortgageRate> = {},
): MortgageRate {
    return {
        id: "test-rate-1",
        name: "Test Fixed 3 Year",
        lenderId: "test-lender",
        type: "fixed",
        rate: 3.5,
        apr: 3.6,
        fixedTerm: 3,
        minLtv: 0,
        maxLtv: 90,
        buyerTypes: ["ftb", "mover"] as BuyerType[],
        perks: [],
        ...overrides,
    };
}

/**
 * Create a mock Lender with sensible defaults
 */
export function createMockLender(overrides: Partial<Lender> = {}): Lender {
    return {
        id: "test-lender",
        name: "Test Bank",
        shortName: "TEST",
        mortgagesUrl: "https://example.com/mortgages",
        perks: [],
        ...overrides,
    };
}

/**
 * Create a set of mock rates covering common scenarios
 */
export function createMockRatesSet(): MortgageRate[] {
    return [
        createMockRate({
            id: "aib-fixed-3yr-90",
            name: "3 Year Fixed",
            lenderId: "aib",
            type: "fixed",
            rate: 3.45,
            apr: 3.52,
            fixedTerm: 3,
            minLtv: 80,
            maxLtv: 90,
            buyerTypes: ["ftb", "mover"],
        }),
        createMockRate({
            id: "aib-fixed-3yr-80",
            name: "3 Year Fixed",
            lenderId: "aib",
            type: "fixed",
            rate: 3.25,
            apr: 3.32,
            fixedTerm: 3,
            minLtv: 50,
            maxLtv: 80,
            buyerTypes: ["ftb", "mover"],
        }),
        createMockRate({
            id: "aib-variable",
            name: "Variable Rate",
            lenderId: "aib",
            type: "variable",
            rate: 4.15,
            apr: 4.22,
            minLtv: 0,
            maxLtv: 90,
            buyerTypes: ["ftb", "mover", "switcher-pdh"],
        }),
        createMockRate({
            id: "boi-green-3yr-90",
            name: "Green 3 Year Fixed",
            lenderId: "boi",
            type: "fixed",
            rate: 3.15,
            apr: 3.22,
            fixedTerm: 3,
            minLtv: 80,
            maxLtv: 90,
            buyerTypes: ["ftb", "mover"],
            berEligible: ["A1", "A2", "A3", "B1", "B2", "B3"] as BerRating[],
        }),
        createMockRate({
            id: "boi-btl-5yr-70",
            name: "BTL 5 Year Fixed",
            lenderId: "boi",
            type: "fixed",
            rate: 4.25,
            apr: 4.35,
            fixedTerm: 5,
            minLtv: 0,
            maxLtv: 70,
            buyerTypes: ["btl", "switcher-btl"],
        }),
    ];
}

/**
 * Create a set of mock lenders
 */
export function createMockLendersSet(): Lender[] {
    return [
        createMockLender({
            id: "aib",
            name: "AIB",
            shortName: "AIB",
            mortgagesUrl: "https://aib.ie/mortgages",
            perks: ["cashback-2pct"],
        }),
        createMockLender({
            id: "boi",
            name: "Bank of Ireland",
            shortName: "BOI",
            mortgagesUrl: "https://boi.ie/mortgages",
            perks: ["cashback-3pct"],
        }),
        createMockLender({
            id: "ptsb",
            name: "Permanent TSB",
            shortName: "PTSB",
            mortgagesUrl: "https://ptsb.ie/mortgages",
        }),
    ];
}

/**
 * Create a localStorage mock that can be used in tests
 */
export function createLocalStorageMock() {
    const store: Record<string, string> = {};

    return {
        store,
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            for (const key in store) {
                delete store[key];
            }
        }),
    };
}
