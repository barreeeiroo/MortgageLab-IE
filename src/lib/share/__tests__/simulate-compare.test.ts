import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SaveableSimulationState } from "@/lib/schemas/simulate";
import type { StoredCustomRate } from "@/lib/stores/custom-rates";
import type { ResolvedCompareSimulation } from "@/lib/stores/simulate/simulate-compare";
import {
    COMPARE_SHARE_PARAM,
    clearCompareShareParam,
    generateCompareShareUrl,
    hasCompareShareParam,
    parseCompareShareState,
} from "../simulate-compare";

// Helper to create mock window
function createMockWindow(search = "") {
    const href = `https://example.com/simulate/compare${search}`;
    return {
        location: {
            href,
            search,
            origin: "https://example.com",
            pathname: "/simulate/compare",
        },
        history: {
            replaceState: vi.fn(),
        },
    };
}

function setWindowSearch(search: string) {
    vi.stubGlobal("window", createMockWindow(search));
}

beforeEach(() => {
    vi.stubGlobal("window", createMockWindow());
});

afterEach(() => {
    vi.unstubAllGlobals();
});

// Helper to create a basic simulation state
function createSimulationState(
    overrides: Partial<SaveableSimulationState> = {},
): SaveableSimulationState {
    return {
        input: {
            mortgageAmount: 30000000,
            mortgageTermMonths: 300,
            propertyValue: 40000000,
            ber: "C1",
        },
        ratePeriods: [
            {
                id: "period-1",
                lenderId: "aib",
                rateId: "aib-fixed-3yr",
                isCustom: false,
                durationMonths: 36,
            },
        ],
        overpaymentConfigs: [],
        ...overrides,
    };
}

// Helper to create a resolved compare simulation
function createCompareSimulation(
    id: string,
    name: string,
    isCurrentView = false,
    stateOverrides: Partial<SaveableSimulationState> = {},
): ResolvedCompareSimulation {
    return {
        id,
        name,
        isCurrentView,
        state: createSimulationState(stateOverrides),
    };
}

describe("simulate-compare share", () => {
    describe("COMPARE_SHARE_PARAM", () => {
        it("uses 'sc' as the param key", () => {
            expect(COMPARE_SHARE_PARAM).toBe("sc");
        });
    });

    describe("generateCompareShareUrl", () => {
        it("generates shareable URL with compare param", () => {
            const simulations = [
                createCompareSimulation("sim-1", "Mortgage A"),
                createCompareSimulation("sim-2", "Mortgage B"),
            ];

            const url = generateCompareShareUrl(simulations, []);

            expect(url).toContain(COMPARE_SHARE_PARAM);
            expect(url).toContain("https://example.com");
        });

        it("includes all simulations in the URL", () => {
            const simulations = [
                createCompareSimulation("sim-1", "Mortgage A"),
                createCompareSimulation("sim-2", "Mortgage B"),
                createCompareSimulation("sim-3", "Mortgage C"),
            ];

            const url = generateCompareShareUrl(simulations, []);
            const params = new URL(url).searchParams;
            const encoded = params.get(COMPARE_SHARE_PARAM);

            setWindowSearch(`?${COMPARE_SHARE_PARAM}=${encoded}`);
            const parsed = parseCompareShareState();

            expect(parsed).not.toBeNull();
            expect(parsed?.simulations).toHaveLength(3);
        });
    });

    describe("roundtrip encoding/decoding", () => {
        it("preserves simulation input values", () => {
            const simulations = [
                createCompareSimulation("sim-1", "Test Mortgage", false, {
                    input: {
                        mortgageAmount: 35000000,
                        mortgageTermMonths: 360,
                        propertyValue: 45000000,
                        startDate: "2026-01-15",
                        ber: "B2",
                    },
                }),
            ];

            const url = generateCompareShareUrl(simulations, []);
            const params = new URL(url).searchParams;
            const encoded = params.get(COMPARE_SHARE_PARAM);

            setWindowSearch(`?${COMPARE_SHARE_PARAM}=${encoded}`);
            const parsed = parseCompareShareState();

            expect(parsed?.simulations[0].state.input.mortgageAmount).toBe(
                35000000,
            );
            expect(parsed?.simulations[0].state.input.mortgageTermMonths).toBe(
                360,
            );
            expect(parsed?.simulations[0].state.input.propertyValue).toBe(
                45000000,
            );
            expect(parsed?.simulations[0].state.input.startDate).toBe(
                "2026-01-15",
            );
            expect(parsed?.simulations[0].state.input.ber).toBe("B2");
        });

        it("preserves simulation names", () => {
            const simulations = [
                createCompareSimulation("sim-1", "My Custom Name"),
                createCompareSimulation("sim-2", "Another Mortgage"),
            ];

            const url = generateCompareShareUrl(simulations, []);
            const params = new URL(url).searchParams;
            const encoded = params.get(COMPARE_SHARE_PARAM);

            setWindowSearch(`?${COMPARE_SHARE_PARAM}=${encoded}`);
            const parsed = parseCompareShareState();

            expect(parsed?.simulations[0].name).toBe("My Custom Name");
            expect(parsed?.simulations[1].name).toBe("Another Mortgage");
        });

        it("preserves rate periods", () => {
            const simulations = [
                createCompareSimulation("sim-1", "Test", false, {
                    ratePeriods: [
                        {
                            id: "period-1",
                            lenderId: "boi",
                            rateId: "boi-fixed-5yr",
                            isCustom: false,
                            durationMonths: 60,
                        },
                        {
                            id: "period-2",
                            lenderId: "boi",
                            rateId: "boi-variable",
                            isCustom: false,
                            durationMonths: 0,
                        },
                    ],
                }),
            ];

            const url = generateCompareShareUrl(simulations, []);
            const params = new URL(url).searchParams;
            const encoded = params.get(COMPARE_SHARE_PARAM);

            setWindowSearch(`?${COMPARE_SHARE_PARAM}=${encoded}`);
            const parsed = parseCompareShareState();

            expect(parsed?.simulations[0].state.ratePeriods).toHaveLength(2);
            expect(parsed?.simulations[0].state.ratePeriods[0].lenderId).toBe(
                "boi",
            );
            expect(
                parsed?.simulations[0].state.ratePeriods[0].durationMonths,
            ).toBe(60);
            expect(
                parsed?.simulations[0].state.ratePeriods[1].durationMonths,
            ).toBe(0);
        });

        it("preserves overpayment configs", () => {
            const simulations = [
                createCompareSimulation("sim-1", "With Overpayments", false, {
                    overpaymentConfigs: [
                        {
                            id: "op-1",
                            ratePeriodId: "period-1",
                            type: "one_time",
                            amount: 500000,
                            startMonth: 12,
                            effect: "reduce_term",
                            enabled: true,
                        },
                    ],
                }),
            ];

            const url = generateCompareShareUrl(simulations, []);
            const params = new URL(url).searchParams;
            const encoded = params.get(COMPARE_SHARE_PARAM);

            setWindowSearch(`?${COMPARE_SHARE_PARAM}=${encoded}`);
            const parsed = parseCompareShareState();

            expect(
                parsed?.simulations[0].state.overpaymentConfigs,
            ).toHaveLength(1);
            expect(
                parsed?.simulations[0].state.overpaymentConfigs[0].amount,
            ).toBe(500000);
            expect(
                parsed?.simulations[0].state.overpaymentConfigs[0].type,
            ).toBe("one_time");
        });

        it("handles current view simulations with generated ID", () => {
            const simulations = [
                createCompareSimulation("__current__", "Current", true),
                createCompareSimulation("sim-1", "Saved"),
            ];

            const url = generateCompareShareUrl(simulations, []);
            const params = new URL(url).searchParams;
            const encoded = params.get(COMPARE_SHARE_PARAM);

            setWindowSearch(`?${COMPARE_SHARE_PARAM}=${encoded}`);
            const parsed = parseCompareShareState();

            // Current view should get a new generated ID
            expect(parsed?.simulations[0].id).not.toBe("__current__");
            expect(parsed?.simulations[0].id).toMatch(/^sim-shared-/);
            expect(parsed?.simulations[0].name).toBe("Shared Simulation");
            expect(parsed?.simulations[0].isCurrentView).toBe(true);
        });

        it("embeds custom rates used by simulations", () => {
            const customRate: StoredCustomRate = {
                id: "custom-1",
                name: "My Custom Rate",
                rate: 3.5,
                type: "fixed",
                fixedTerm: 5,
                lenderId: "other",
                perks: [],
                minLtv: 0,
                maxLtv: 90,
                buyerTypes: ["ftb", "mover"],
                createdAt: "2026-01-01T00:00:00.000Z",
            };

            const simulations = [
                createCompareSimulation("sim-1", "With Custom Rate", false, {
                    ratePeriods: [
                        {
                            id: "period-1",
                            lenderId: "other",
                            rateId: "custom-1",
                            isCustom: true,
                            durationMonths: 60,
                        },
                    ],
                }),
            ];

            const url = generateCompareShareUrl(simulations, [customRate]);
            const params = new URL(url).searchParams;
            const encoded = params.get(COMPARE_SHARE_PARAM);

            setWindowSearch(`?${COMPARE_SHARE_PARAM}=${encoded}`);
            const parsed = parseCompareShareState();

            expect(parsed?.simulations[0].customRates).toHaveLength(1);
            expect(parsed?.simulations[0].customRates[0].name).toBe(
                "My Custom Rate",
            );
            expect(parsed?.simulations[0].customRates[0].rate).toBe(3.5);
        });

        it("only embeds custom rates used by each simulation", () => {
            const customRate1: StoredCustomRate = {
                id: "custom-1",
                name: "Rate 1",
                rate: 3.0,
                type: "fixed",
                fixedTerm: 3,
                lenderId: "other",
                perks: [],
                minLtv: 0,
                maxLtv: 90,
                buyerTypes: ["ftb"],
                createdAt: "2026-01-01T00:00:00.000Z",
            };

            const customRate2: StoredCustomRate = {
                id: "custom-2",
                name: "Rate 2",
                rate: 4.0,
                type: "variable",
                lenderId: "other",
                perks: [],
                minLtv: 0,
                maxLtv: 90,
                buyerTypes: ["ftb"],
                createdAt: "2026-01-01T00:00:00.000Z",
            };

            const simulations = [
                createCompareSimulation("sim-1", "Uses Rate 1", false, {
                    ratePeriods: [
                        {
                            id: "p1",
                            lenderId: "other",
                            rateId: "custom-1",
                            isCustom: true,
                            durationMonths: 36,
                        },
                    ],
                }),
                createCompareSimulation("sim-2", "Uses Rate 2", false, {
                    ratePeriods: [
                        {
                            id: "p2",
                            lenderId: "other",
                            rateId: "custom-2",
                            isCustom: true,
                            durationMonths: 0,
                        },
                    ],
                }),
            ];

            const url = generateCompareShareUrl(simulations, [
                customRate1,
                customRate2,
            ]);
            const params = new URL(url).searchParams;
            const encoded = params.get(COMPARE_SHARE_PARAM);

            setWindowSearch(`?${COMPARE_SHARE_PARAM}=${encoded}`);
            const parsed = parseCompareShareState();

            // Each simulation should only have its own custom rate
            expect(parsed?.simulations[0].customRates).toHaveLength(1);
            expect(parsed?.simulations[0].customRates[0].name).toBe("Rate 1");
            expect(parsed?.simulations[1].customRates).toHaveLength(1);
            expect(parsed?.simulations[1].customRates[0].name).toBe("Rate 2");
        });
    });

    describe("hasCompareShareParam", () => {
        it("returns true when param exists", () => {
            setWindowSearch(`?${COMPARE_SHARE_PARAM}=somevalue`);
            expect(hasCompareShareParam()).toBe(true);
        });

        it("returns false when param does not exist", () => {
            setWindowSearch("?other=value");
            expect(hasCompareShareParam()).toBe(false);
        });

        it("returns false for empty search", () => {
            setWindowSearch("");
            expect(hasCompareShareParam()).toBe(false);
        });
    });

    describe("clearCompareShareParam", () => {
        it("removes the compare param from URL", () => {
            const mockWindow = createMockWindow(`?${COMPARE_SHARE_PARAM}=test`);
            vi.stubGlobal("window", mockWindow);

            clearCompareShareParam();

            expect(mockWindow.history.replaceState).toHaveBeenCalled();
        });
    });

    describe("parseCompareShareState", () => {
        it("returns null when param is missing", () => {
            setWindowSearch("");
            expect(parseCompareShareState()).toBeNull();
        });

        it("returns null for invalid encoded data", () => {
            setWindowSearch(`?${COMPARE_SHARE_PARAM}=invalid-data`);
            expect(parseCompareShareState()).toBeNull();
        });
    });
});
