import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SimulationState } from "@/lib/schemas/simulate";
import type { StoredCustomRate } from "@/lib/stores/custom-rates";
import {
    clearSimulateShareParam,
    generateSimulateShareUrl,
    hasSimulateShareParam,
    parseSimulateShareState,
    SIMULATE_SHARE_PARAM,
} from "../simulate";

// Helper to create mock window
function createMockWindow(search = "") {
    const href = `https://example.com/simulate${search}`;
    return {
        location: {
            href,
            search,
            origin: "https://example.com",
            pathname: "/simulate",
        },
        history: {
            replaceState: vi.fn(),
        },
    };
}

function setWindowSearch(search: string) {
    vi.stubGlobal("window", createMockWindow(search));
}

// Mock crypto.randomUUID for consistent IDs
let uuidCounter = 0;
const mockRandomUUID = () => `test-uuid-${++uuidCounter}`;

beforeEach(() => {
    uuidCounter = 0;
    vi.stubGlobal("window", createMockWindow());
    vi.stubGlobal("crypto", { randomUUID: mockRandomUUID });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("simulate share", () => {
    describe("basic simulation state", () => {
        const basicState: SimulationState = {
            input: {
                mortgageAmount: 30000000,
                mortgageTermMonths: 360,
                propertyValue: 35000000,
                startDate: "2025-01-15",
                ber: "B2",
            },
            ratePeriods: [
                {
                    id: "period-1",
                    lenderId: "aib",
                    rateId: "aib-fixed-3",
                    isCustom: false,
                    durationMonths: 36,
                    label: "3 Year Fixed",
                },
            ],
            overpaymentConfigs: [],
            initialized: true,
        };

        it("generates shareable URL", () => {
            const url = generateSimulateShareUrl(basicState);
            expect(url).toContain(SIMULATE_SHARE_PARAM);
            expect(url).toContain("https://example.com");
        });

        it("roundtrips basic state", () => {
            const url = generateSimulateShareUrl(basicState);
            const params = new URL(url).searchParams;
            const encoded = params.get(SIMULATE_SHARE_PARAM);

            setWindowSearch(`?${SIMULATE_SHARE_PARAM}=${encoded}`);
            const parsed = parseSimulateShareState();

            expect(parsed).not.toBeNull();
            expect(parsed?.state.input.mortgageAmount).toBe(
                basicState.input.mortgageAmount,
            );
            expect(parsed?.state.input.mortgageTermMonths).toBe(
                basicState.input.mortgageTermMonths,
            );
            expect(parsed?.state.input.propertyValue).toBe(
                basicState.input.propertyValue,
            );
            expect(parsed?.state.input.startDate).toBe(
                basicState.input.startDate,
            );
            expect(parsed?.state.input.ber).toBe(basicState.input.ber);
            expect(parsed?.state.initialized).toBe(true);
        });

        it("generates new UUIDs for rate periods on parse", () => {
            const url = generateSimulateShareUrl(basicState);
            const params = new URL(url).searchParams;
            const encoded = params.get(SIMULATE_SHARE_PARAM);

            setWindowSearch(`?${SIMULATE_SHARE_PARAM}=${encoded}`);
            const parsed = parseSimulateShareState();

            expect(parsed?.state.ratePeriods[0].id).not.toBe(
                basicState.ratePeriods[0].id,
            );
            expect(parsed?.state.ratePeriods[0].id).toMatch(/^test-uuid-/);
        });

        it("preserves rate period properties except id", () => {
            const url = generateSimulateShareUrl(basicState);
            const params = new URL(url).searchParams;
            const encoded = params.get(SIMULATE_SHARE_PARAM);

            setWindowSearch(`?${SIMULATE_SHARE_PARAM}=${encoded}`);
            const parsed = parseSimulateShareState();

            const originalPeriod = basicState.ratePeriods[0];
            const parsedPeriod = parsed?.state.ratePeriods[0];

            expect(parsedPeriod?.lenderId).toBe(originalPeriod.lenderId);
            expect(parsedPeriod?.rateId).toBe(originalPeriod.rateId);
            expect(parsedPeriod?.isCustom).toBe(originalPeriod.isCustom);
            expect(parsedPeriod?.durationMonths).toBe(
                originalPeriod.durationMonths,
            );
            expect(parsedPeriod?.label).toBe(originalPeriod.label);
        });
    });

    describe("multiple rate periods", () => {
        const multiPeriodState: SimulationState = {
            input: {
                mortgageAmount: 25000000,
                mortgageTermMonths: 300,
                propertyValue: 30000000,
                startDate: "2025-03-01",
                ber: "A2",
            },
            ratePeriods: [
                {
                    id: "period-1",
                    lenderId: "aib",
                    rateId: "aib-fixed-2",
                    isCustom: false,
                    durationMonths: 24,
                    label: "2 Year Fixed",
                },
                {
                    id: "period-2",
                    lenderId: "boi",
                    rateId: "boi-fixed-5",
                    isCustom: false,
                    durationMonths: 60,
                    label: "5 Year Fixed",
                },
                {
                    id: "period-3",
                    lenderId: "ptsb",
                    rateId: "ptsb-variable",
                    isCustom: false,
                    durationMonths: 0,
                },
            ],
            overpaymentConfigs: [],
            initialized: true,
        };

        it("roundtrips multiple rate periods", () => {
            const url = generateSimulateShareUrl(multiPeriodState);
            const params = new URL(url).searchParams;
            const encoded = params.get(SIMULATE_SHARE_PARAM);

            setWindowSearch(`?${SIMULATE_SHARE_PARAM}=${encoded}`);
            const parsed = parseSimulateShareState();

            expect(parsed?.state.ratePeriods).toHaveLength(3);
            expect(parsed?.state.ratePeriods[0].durationMonths).toBe(24);
            expect(parsed?.state.ratePeriods[1].durationMonths).toBe(60);
            expect(parsed?.state.ratePeriods[2].durationMonths).toBe(0);
        });

        it("preserves rate period order", () => {
            const url = generateSimulateShareUrl(multiPeriodState);
            const params = new URL(url).searchParams;
            const encoded = params.get(SIMULATE_SHARE_PARAM);

            setWindowSearch(`?${SIMULATE_SHARE_PARAM}=${encoded}`);
            const parsed = parseSimulateShareState();

            expect(parsed?.state.ratePeriods[0].lenderId).toBe("aib");
            expect(parsed?.state.ratePeriods[1].lenderId).toBe("boi");
            expect(parsed?.state.ratePeriods[2].lenderId).toBe("ptsb");
        });
    });

    describe("overpayment configs", () => {
        const baseState: SimulationState = {
            input: {
                mortgageAmount: 30000000,
                mortgageTermMonths: 360,
                propertyValue: 35000000,
                startDate: "2025-01-15",
                ber: "B2",
            },
            ratePeriods: [
                {
                    id: "period-1",
                    lenderId: "aib",
                    rateId: "aib-fixed-3",
                    isCustom: false,
                    durationMonths: 36,
                },
            ],
            overpaymentConfigs: [],
            initialized: true,
        };

        it("roundtrips one-time overpayment", () => {
            const stateWithOp: SimulationState = {
                ...baseState,
                overpaymentConfigs: [
                    {
                        id: "op-1",
                        ratePeriodId: "period-1",
                        type: "one_time",
                        frequency: "monthly",
                        amount: 500000,
                        startMonth: 12,
                        effect: "reduce_term",
                        label: "Year 1 Bonus",
                        enabled: true,
                    },
                ],
            };

            const url = generateSimulateShareUrl(stateWithOp);
            const params = new URL(url).searchParams;
            const encoded = params.get(SIMULATE_SHARE_PARAM);

            setWindowSearch(`?${SIMULATE_SHARE_PARAM}=${encoded}`);
            const parsed = parseSimulateShareState();

            expect(parsed?.state.overpaymentConfigs).toHaveLength(1);
            const op = parsed?.state.overpaymentConfigs[0];
            expect(op?.type).toBe("one_time");
            expect(op?.amount).toBe(500000);
            expect(op?.startMonth).toBe(12);
            expect(op?.effect).toBe("reduce_term");
            expect(op?.label).toBe("Year 1 Bonus");
            expect(op?.enabled).toBe(true);
        });

        it("roundtrips recurring overpayment with quarterly frequency", () => {
            const stateWithOp: SimulationState = {
                ...baseState,
                overpaymentConfigs: [
                    {
                        id: "op-1",
                        ratePeriodId: "period-1",
                        type: "recurring",
                        frequency: "quarterly",
                        amount: 100000,
                        startMonth: 3,
                        endMonth: 36,
                        effect: "reduce_term",
                        enabled: true,
                    },
                ],
            };

            const url = generateSimulateShareUrl(stateWithOp);
            const params = new URL(url).searchParams;
            const encoded = params.get(SIMULATE_SHARE_PARAM);

            setWindowSearch(`?${SIMULATE_SHARE_PARAM}=${encoded}`);
            const parsed = parseSimulateShareState();

            expect(parsed?.state.overpaymentConfigs[0]?.frequency).toBe(
                "quarterly",
            );
        });

        it("handles disabled overpayment", () => {
            const stateWithOp: SimulationState = {
                ...baseState,
                overpaymentConfigs: [
                    {
                        id: "op-1",
                        ratePeriodId: "period-1",
                        type: "one_time",
                        frequency: "monthly",
                        amount: 500000,
                        startMonth: 12,
                        effect: "reduce_term",
                        enabled: false,
                    },
                ],
            };

            const url = generateSimulateShareUrl(stateWithOp);
            const params = new URL(url).searchParams;
            const encoded = params.get(SIMULATE_SHARE_PARAM);

            setWindowSearch(`?${SIMULATE_SHARE_PARAM}=${encoded}`);
            const parsed = parseSimulateShareState();

            expect(parsed?.state.overpaymentConfigs[0]?.enabled).toBe(false);
        });
    });

    describe("custom rates", () => {
        const customRate: StoredCustomRate = {
            id: "custom-rate-1",
            lenderId: "aib",
            name: "My Custom Fixed Rate",
            rate: 3.25,
            type: "fixed",
            fixedTerm: 3,
            minLtv: 0,
            maxLtv: 80,
            buyerTypes: ["ftb", "mover"],
            perks: [],
        };

        const stateWithCustomRate: SimulationState = {
            input: {
                mortgageAmount: 30000000,
                mortgageTermMonths: 360,
                propertyValue: 35000000,
                startDate: "2025-01-15",
                ber: "B2",
            },
            ratePeriods: [
                {
                    id: "period-1",
                    lenderId: "aib",
                    rateId: "custom-rate-1",
                    isCustom: true,
                    durationMonths: 36,
                    label: "Custom Rate",
                },
            ],
            overpaymentConfigs: [],
            initialized: true,
        };

        it("embeds used custom rates in URL", () => {
            const url = generateSimulateShareUrl(stateWithCustomRate, [
                customRate,
            ]);
            const params = new URL(url).searchParams;
            const encoded = params.get(SIMULATE_SHARE_PARAM);

            setWindowSearch(`?${SIMULATE_SHARE_PARAM}=${encoded}`);
            const parsed = parseSimulateShareState();

            expect(parsed?.embeddedCustomRates).toHaveLength(1);
            expect(parsed?.embeddedCustomRates[0].name).toBe(
                "My Custom Fixed Rate",
            );
            expect(parsed?.embeddedCustomRates[0].rate).toBe(3.25);
        });

        it("only embeds custom rates that are used", () => {
            const unusedRate: StoredCustomRate = {
                ...customRate,
                id: "unused-rate",
                name: "Unused Rate",
            };

            const url = generateSimulateShareUrl(stateWithCustomRate, [
                customRate,
                unusedRate,
            ]);
            const params = new URL(url).searchParams;
            const encoded = params.get(SIMULATE_SHARE_PARAM);

            setWindowSearch(`?${SIMULATE_SHARE_PARAM}=${encoded}`);
            const parsed = parseSimulateShareState();

            expect(parsed?.embeddedCustomRates).toHaveLength(1);
            expect(parsed?.embeddedCustomRates[0].name).toBe(
                "My Custom Fixed Rate",
            );
        });

        it("handles state with no custom rates", () => {
            const basicState: SimulationState = {
                input: {
                    mortgageAmount: 30000000,
                    mortgageTermMonths: 360,
                    propertyValue: 35000000,
                    startDate: "2025-01-15",
                    ber: "B2",
                },
                ratePeriods: [
                    {
                        id: "period-1",
                        lenderId: "aib",
                        rateId: "aib-fixed-3",
                        isCustom: false,
                        durationMonths: 36,
                    },
                ],
                overpaymentConfigs: [],
                initialized: true,
            };

            const url = generateSimulateShareUrl(basicState, []);
            const params = new URL(url).searchParams;
            const encoded = params.get(SIMULATE_SHARE_PARAM);

            setWindowSearch(`?${SIMULATE_SHARE_PARAM}=${encoded}`);
            const parsed = parseSimulateShareState();

            expect(parsed?.embeddedCustomRates).toHaveLength(0);
        });
    });

    describe("parseSimulateShareState", () => {
        it("returns null when no share param present", () => {
            setWindowSearch("");
            const parsed = parseSimulateShareState();
            expect(parsed).toBeNull();
        });

        it("returns null for invalid compressed data", () => {
            setWindowSearch(`?${SIMULATE_SHARE_PARAM}=invalid-data`);
            const parsed = parseSimulateShareState();
            expect(parsed).toBeNull();
        });

        it("returns null for empty param value", () => {
            setWindowSearch(`?${SIMULATE_SHARE_PARAM}=`);
            const parsed = parseSimulateShareState();
            expect(parsed).toBeNull();
        });
    });

    describe("hasSimulateShareParam", () => {
        it("returns true when param is present", () => {
            setWindowSearch(`?${SIMULATE_SHARE_PARAM}=somevalue`);
            expect(hasSimulateShareParam()).toBe(true);
        });

        it("returns false when param is not present", () => {
            setWindowSearch("?other=value");
            expect(hasSimulateShareParam()).toBe(false);
        });

        it("returns false when window is undefined", () => {
            vi.stubGlobal("window", undefined);
            expect(hasSimulateShareParam()).toBe(false);
        });
    });

    describe("clearSimulateShareParam", () => {
        it("removes the share param from URL", () => {
            setWindowSearch(`?${SIMULATE_SHARE_PARAM}=value&other=keep`);
            clearSimulateShareParam();
            expect(window.history.replaceState).toHaveBeenCalled();
        });
    });

    describe("optional start date", () => {
        it("handles state without start date", () => {
            const stateNoDate: SimulationState = {
                input: {
                    mortgageAmount: 30000000,
                    mortgageTermMonths: 360,
                    propertyValue: 35000000,
                    startDate: undefined,
                    ber: "B2",
                },
                ratePeriods: [
                    {
                        id: "period-1",
                        lenderId: "aib",
                        rateId: "aib-fixed-3",
                        isCustom: false,
                        durationMonths: 36,
                    },
                ],
                overpaymentConfigs: [],
                initialized: true,
            };

            const url = generateSimulateShareUrl(stateNoDate);
            const params = new URL(url).searchParams;
            const encoded = params.get(SIMULATE_SHARE_PARAM);

            setWindowSearch(`?${SIMULATE_SHARE_PARAM}=${encoded}`);
            const parsed = parseSimulateShareState();

            expect(parsed?.state.input.startDate).toBeUndefined();
        });
    });

    describe("self-build config", () => {
        const baseState: SimulationState = {
            input: {
                mortgageAmount: 20000000,
                mortgageTermMonths: 360,
                propertyValue: 25000000,
                startDate: "2025-01-15",
                ber: "B2",
            },
            ratePeriods: [
                {
                    id: "period-1",
                    lenderId: "aib",
                    rateId: "aib-fixed-3",
                    isCustom: false,
                    durationMonths: 0,
                },
            ],
            overpaymentConfigs: [],
            initialized: true,
        };

        it("roundtrips self-build config with interest_only mode (default)", () => {
            const stateWithSelfBuild: SimulationState = {
                ...baseState,
                selfBuildConfig: {
                    enabled: true,
                    constructionRepaymentType: "interest_only",
                    interestOnlyMonths: 9,
                    drawdownStages: [
                        {
                            id: "stage-1",
                            month: 1,
                            amount: 5000000,
                            label: "Site Purchase",
                        },
                        {
                            id: "stage-2",
                            month: 4,
                            amount: 7500000,
                            label: "Floor Level",
                        },
                        {
                            id: "stage-3",
                            month: 8,
                            amount: 7500000,
                            label: "Roof Level",
                        },
                    ],
                },
            };

            const url = generateSimulateShareUrl(stateWithSelfBuild);
            const params = new URL(url).searchParams;
            const encoded = params.get(SIMULATE_SHARE_PARAM);

            setWindowSearch(`?${SIMULATE_SHARE_PARAM}=${encoded}`);
            const parsed = parseSimulateShareState();

            expect(parsed?.state.selfBuildConfig).toBeDefined();
            expect(parsed?.state.selfBuildConfig?.enabled).toBe(true);
            expect(
                parsed?.state.selfBuildConfig?.constructionRepaymentType,
            ).toBe("interest_only");
            expect(parsed?.state.selfBuildConfig?.interestOnlyMonths).toBe(9);
            expect(parsed?.state.selfBuildConfig?.drawdownStages).toHaveLength(
                3,
            );
        });

        it("roundtrips self-build config with interest_and_capital mode", () => {
            const stateWithSelfBuild: SimulationState = {
                ...baseState,
                selfBuildConfig: {
                    enabled: true,
                    constructionRepaymentType: "interest_and_capital",
                    interestOnlyMonths: 0,
                    drawdownStages: [
                        {
                            id: "stage-1",
                            month: 1,
                            amount: 10000000,
                            label: "Site",
                        },
                        {
                            id: "stage-2",
                            month: 6,
                            amount: 10000000,
                            label: "Completion",
                        },
                    ],
                },
            };

            const url = generateSimulateShareUrl(stateWithSelfBuild);
            const params = new URL(url).searchParams;
            const encoded = params.get(SIMULATE_SHARE_PARAM);

            setWindowSearch(`?${SIMULATE_SHARE_PARAM}=${encoded}`);
            const parsed = parseSimulateShareState();

            expect(
                parsed?.state.selfBuildConfig?.constructionRepaymentType,
            ).toBe("interest_and_capital");
            expect(parsed?.state.selfBuildConfig?.interestOnlyMonths).toBe(0);
        });

        it("preserves drawdown stage labels", () => {
            const stateWithSelfBuild: SimulationState = {
                ...baseState,
                selfBuildConfig: {
                    enabled: true,
                    constructionRepaymentType: "interest_only",
                    interestOnlyMonths: 0,
                    drawdownStages: [
                        {
                            id: "stage-1",
                            month: 1,
                            amount: 20000000,
                            label: "Full Drawdown",
                        },
                    ],
                },
            };

            const url = generateSimulateShareUrl(stateWithSelfBuild);
            const params = new URL(url).searchParams;
            const encoded = params.get(SIMULATE_SHARE_PARAM);

            setWindowSearch(`?${SIMULATE_SHARE_PARAM}=${encoded}`);
            const parsed = parseSimulateShareState();

            expect(parsed?.state.selfBuildConfig?.drawdownStages[0].label).toBe(
                "Full Drawdown",
            );
        });

        it("handles state without self-build config", () => {
            const url = generateSimulateShareUrl(baseState);
            const params = new URL(url).searchParams;
            const encoded = params.get(SIMULATE_SHARE_PARAM);

            setWindowSearch(`?${SIMULATE_SHARE_PARAM}=${encoded}`);
            const parsed = parseSimulateShareState();

            expect(parsed?.state.selfBuildConfig).toBeUndefined();
        });
    });
});
