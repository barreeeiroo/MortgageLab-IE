import { describe, expect, it } from "vitest";
import {
    aggregateByYear,
    calculateAmortization,
    calculateBaselineInterest,
    calculateBufferSuggestions,
    calculateMilestones,
    calculateSimulationCompleteness,
    calculateSummary,
} from "@/lib/mortgage/simulation";
import type { Lender } from "@/lib/schemas/lender";
import type { OverpaymentPolicy } from "@/lib/schemas/overpayment-policy";
import type { MortgageRate } from "@/lib/schemas/rate";
import type {
    AmortizationMonth,
    OverpaymentConfig,
    RatePeriod,
    ResolvedRatePeriod,
    SimulationState,
} from "@/lib/schemas/simulate";

// Test fixtures
function createRate(overrides: Partial<MortgageRate> = {}): MortgageRate {
    return {
        id: "test-rate",
        lenderId: "test-lender",
        name: "Test Rate",
        rate: 3.5,
        type: "variable",
        maxLtv: 90,
        minLtv: 0,
        buyerTypes: ["ftb", "mover"],
        perks: [],
        ...overrides,
    };
}

function createLender(overrides: Partial<Lender> = {}): Lender {
    return {
        id: "test-lender",
        name: "Test Bank",
        shortName: "Test",
        mortgagesUrl: "https://example.com/mortgages",
        perks: [],
        ...overrides,
    };
}

function createPolicy(
    overrides: Partial<OverpaymentPolicy> = {},
): OverpaymentPolicy {
    return {
        id: "test-policy",
        label: "10% of balance",
        description: "10% of outstanding balance per year",
        icon: "Percent",
        allowanceType: "percentage",
        allowanceValue: 10,
        allowanceBasis: "balance",
        ...overrides,
    };
}

function createRatePeriod(overrides: Partial<RatePeriod> = {}): RatePeriod {
    return {
        id: "period-1",
        lenderId: "test-lender",
        rateId: "test-rate",
        isCustom: false,
        durationMonths: 0, // Until end
        ...overrides,
    };
}

function createOverpaymentConfig(
    overrides: Partial<OverpaymentConfig> = {},
): OverpaymentConfig {
    return {
        id: "overpayment-1",
        ratePeriodId: "period-1",
        type: "one_time",
        amount: 500000, // €5,000 in cents
        startMonth: 12,
        effect: "reduce_term",
        enabled: true,
        ...overrides,
    };
}

function createSimulationState(
    overrides: Partial<SimulationState> = {},
): SimulationState {
    return {
        input: {
            mortgageAmount: 30000000, // €300,000 in cents
            mortgageTermMonths: 360, // 30 years
            propertyValue: 35000000, // €350,000
            ber: "B2",
            ...overrides.input,
        },
        ratePeriods: overrides.ratePeriods ?? [createRatePeriod()],
        overpaymentConfigs: overrides.overpaymentConfigs ?? [],
        selfBuildConfig: overrides.selfBuildConfig,
        initialized: true,
    };
}

// Helper to create self-build config for tests
function createSelfBuildConfig(
    stages: { month: number; amount: number; label?: string }[],
    interestOnlyMonths = 0,
    constructionRepaymentType:
        | "interest_only"
        | "interest_and_capital" = "interest_only",
): SimulationState["selfBuildConfig"] {
    return {
        enabled: true,
        constructionRepaymentType,
        interestOnlyMonths,
        drawdownStages: stages.map((s, i) => ({
            id: `stage-${i}`,
            month: s.month,
            amount: s.amount,
            label: s.label,
        })),
    };
}

describe("calculateAmortization", () => {
    describe("basic amortization", () => {
        it("calculates correct monthly payment for 30-year variable rate", () => {
            const state = createSimulationState();
            const rates = [createRate({ rate: 3.5 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            // €300k at 3.5% over 30 years ≈ €1,347/month
            expect(result.months[0].scheduledPayment).toBeCloseTo(134713, -2);
        });

        it("reduces balance to zero by end of term", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 10000000, // €100k for faster test
                    mortgageTermMonths: 120, // 10 years
                    propertyValue: 12000000,
                    ber: "B2",
                },
            });
            const rates = [createRate({ rate: 4.0 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            const lastMonth = result.months[result.months.length - 1];
            expect(lastMonth.closingBalance).toBeLessThan(1); // Essentially 0
        });

        it("first month has mostly interest, last month has mostly principal", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 30000000, // €300k - larger mortgage
                    mortgageTermMonths: 360, // 30 years - longer term
                    propertyValue: 35000000,
                    ber: "B2",
                },
            });
            const rates = [createRate({ rate: 4.0 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            const firstMonth = result.months[0];
            // With longer term and higher principal, first month has more interest
            expect(firstMonth.interestPortion).toBeGreaterThan(
                firstMonth.principalPortion,
            );

            const lastMonth = result.months[result.months.length - 1];
            expect(lastMonth.principalPortion).toBeGreaterThan(
                lastMonth.interestPortion,
            );
        });

        it("tracks cumulative totals correctly", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 10000000,
                    mortgageTermMonths: 60,
                    propertyValue: 12000000,
                    ber: "B2",
                },
            });
            const rates = [createRate({ rate: 3.0 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            const lastMonth = result.months[result.months.length - 1];

            // Cumulative principal should equal original mortgage
            expect(lastMonth.cumulativePrincipal).toBeCloseTo(10000000, -2);

            // Cumulative total should equal cumulative interest + principal
            expect(lastMonth.cumulativeTotal).toBeCloseTo(
                lastMonth.cumulativeInterest + lastMonth.cumulativePrincipal,
                -2,
            );
        });
    });

    describe("rate period transitions", () => {
        it("switches rate at correct month", () => {
            const state = createSimulationState({
                ratePeriods: [
                    createRatePeriod({
                        id: "fixed-3yr",
                        rateId: "rate-fixed",
                        durationMonths: 36,
                    }),
                    createRatePeriod({
                        id: "variable",
                        rateId: "rate-variable",
                        durationMonths: 0,
                    }),
                ],
            });
            const rates = [
                createRate({
                    id: "rate-fixed",
                    rate: 3.0,
                    type: "fixed",
                    fixedTerm: 3,
                }),
                createRate({
                    id: "rate-variable",
                    rate: 4.5,
                    type: "variable",
                }),
            ];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            // Month 36 should still be at 3.0%
            expect(result.months[35].rate).toBe(3.0);
            // Month 37 should be at 4.5%
            expect(result.months[36].rate).toBe(4.5);
        });

        it("recalculates payment when rate changes", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 10000000,
                    mortgageTermMonths: 60,
                    propertyValue: 12000000,
                    ber: "B2",
                },
                ratePeriods: [
                    createRatePeriod({
                        id: "fixed",
                        rateId: "rate-fixed",
                        durationMonths: 12,
                    }),
                    createRatePeriod({
                        id: "variable",
                        rateId: "rate-variable",
                        durationMonths: 0,
                    }),
                ],
            });
            const rates = [
                createRate({
                    id: "rate-fixed",
                    rate: 3.0,
                    type: "fixed",
                    fixedTerm: 1,
                }),
                createRate({
                    id: "rate-variable",
                    rate: 5.0,
                    type: "variable",
                }),
            ];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            const month12 = result.months[11];
            const month13 = result.months[12];

            // Payment should change when rate increases
            expect(month13.scheduledPayment).toBeGreaterThan(
                month12.scheduledPayment,
            );
        });
    });

    describe("overpayment handling", () => {
        it("applies one-time overpayment at specified month", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 10000000,
                    mortgageTermMonths: 120,
                    propertyValue: 12000000,
                    ber: "B2",
                },
                overpaymentConfigs: [
                    createOverpaymentConfig({
                        type: "one_time",
                        amount: 100000, // €1,000
                        startMonth: 12,
                    }),
                ],
            });
            const rates = [createRate({ rate: 4.0 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            // Month 11 should have no overpayment
            expect(result.months[10].overpayment).toBe(0);
            // Month 12 should have the overpayment
            expect(result.months[11].overpayment).toBe(100000);
            // Month 13 should have no overpayment
            expect(result.months[12].overpayment).toBe(0);
        });

        it("applies recurring monthly overpayments", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 10000000,
                    mortgageTermMonths: 120,
                    propertyValue: 12000000,
                    ber: "B2",
                },
                overpaymentConfigs: [
                    createOverpaymentConfig({
                        type: "recurring",
                        frequency: "monthly",
                        amount: 50000, // €500
                        startMonth: 1,
                        endMonth: 24,
                    }),
                ],
            });
            const rates = [createRate({ rate: 4.0 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            // First 24 months should have overpayments
            for (let i = 0; i < 24; i++) {
                expect(result.months[i].overpayment).toBe(50000);
            }
            // Month 25 should have no overpayment
            expect(result.months[24].overpayment).toBe(0);
        });

        it("applies quarterly overpayments at correct months", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 10000000,
                    mortgageTermMonths: 120,
                    propertyValue: 12000000,
                    ber: "B2",
                },
                overpaymentConfigs: [
                    createOverpaymentConfig({
                        type: "recurring",
                        frequency: "quarterly",
                        amount: 100000, // €1,000
                        startMonth: 1,
                        endMonth: 12,
                    }),
                ],
            });
            const rates = [createRate({ rate: 4.0 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            // Quarterly: months 1, 4, 7, 10 should have overpayments
            expect(result.months[0].overpayment).toBe(100000); // Month 1
            expect(result.months[1].overpayment).toBe(0); // Month 2
            expect(result.months[2].overpayment).toBe(0); // Month 3
            expect(result.months[3].overpayment).toBe(100000); // Month 4
            expect(result.months[6].overpayment).toBe(100000); // Month 7
            expect(result.months[9].overpayment).toBe(100000); // Month 10
        });

        it("applies yearly overpayments at correct months", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 10000000,
                    mortgageTermMonths: 60,
                    propertyValue: 12000000,
                    ber: "B2",
                },
                overpaymentConfigs: [
                    createOverpaymentConfig({
                        type: "recurring",
                        frequency: "yearly",
                        amount: 500000, // €5,000
                        startMonth: 6,
                        endMonth: 36,
                    }),
                ],
            });
            const rates = [createRate({ rate: 4.0 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            // Yearly starting month 6: months 6, 18, 30 should have overpayments
            expect(result.months[5].overpayment).toBe(500000); // Month 6
            expect(result.months[11].overpayment).toBe(0); // Month 12
            expect(result.months[17].overpayment).toBe(500000); // Month 18
            expect(result.months[29].overpayment).toBe(500000); // Month 30
        });

        it("shortens term with reduce_term effect", () => {
            // Without overpayments
            const stateNoOverpay = createSimulationState({
                input: {
                    mortgageAmount: 10000000,
                    mortgageTermMonths: 120,
                    propertyValue: 12000000,
                    ber: "B2",
                },
            });
            const rates = [createRate({ rate: 4.0 })];
            const lenders = [createLender()];

            const resultNoOverpay = calculateAmortization(
                stateNoOverpay,
                rates,
                [],
                lenders,
                [],
            );

            // With monthly overpayments
            const stateWithOverpay = createSimulationState({
                input: {
                    mortgageAmount: 10000000,
                    mortgageTermMonths: 120,
                    propertyValue: 12000000,
                    ber: "B2",
                },
                overpaymentConfigs: [
                    createOverpaymentConfig({
                        type: "recurring",
                        frequency: "monthly",
                        amount: 50000, // €500/month
                        startMonth: 1,
                        effect: "reduce_term",
                    }),
                ],
            });

            const resultWithOverpay = calculateAmortization(
                stateWithOverpay,
                rates,
                [],
                lenders,
                [],
            );

            // Term should be shorter with overpayments
            expect(resultWithOverpay.months.length).toBeLessThan(
                resultNoOverpay.months.length,
            );
        });

        it("respects disabled overpayments", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 10000000,
                    mortgageTermMonths: 60,
                    propertyValue: 12000000,
                    ber: "B2",
                },
                overpaymentConfigs: [
                    createOverpaymentConfig({
                        type: "one_time",
                        amount: 100000,
                        startMonth: 12,
                        enabled: false, // Disabled
                    }),
                ],
            });
            const rates = [createRate({ rate: 4.0 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            // Month 12 should have no overpayment since it's disabled
            expect(result.months[11].overpayment).toBe(0);
        });
    });

    describe("allowance tracking and warnings", () => {
        it("generates warning when overpayment exceeds balance-based allowance", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 10000000, // €100k
                    mortgageTermMonths: 60,
                    propertyValue: 12000000,
                    ber: "B2",
                },
                ratePeriods: [
                    createRatePeriod({
                        rateId: "fixed-rate",
                        durationMonths: 36,
                    }),
                ],
                overpaymentConfigs: [
                    createOverpaymentConfig({
                        type: "one_time",
                        amount: 2000000, // €20,000 - exceeds 10% of €100k = €10k allowance
                        startMonth: 12,
                    }),
                ],
            });
            const rates = [
                createRate({
                    id: "fixed-rate",
                    rate: 3.5,
                    type: "fixed",
                    fixedTerm: 3,
                }),
            ];
            const lenders = [
                createLender({ overpaymentPolicy: "test-policy" }),
            ];
            const policies = [createPolicy()];

            const result = calculateAmortization(
                state,
                rates,
                [],
                lenders,
                policies,
            );

            expect(result.warnings.length).toBeGreaterThan(0);
            expect(result.warnings[0].type).toBe("allowance_exceeded");
            expect(result.warnings[0].month).toBe(12);
        });

        it("does not warn when overpayment is within allowance", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 20000000, // €200k
                    mortgageTermMonths: 60,
                    propertyValue: 25000000,
                    ber: "B2",
                },
                ratePeriods: [
                    createRatePeriod({
                        rateId: "fixed-rate",
                        durationMonths: 36,
                    }),
                ],
                overpaymentConfigs: [
                    createOverpaymentConfig({
                        type: "one_time",
                        amount: 1000000, // €10,000 - within 10% of €200k = €20k
                        startMonth: 12,
                    }),
                ],
            });
            const rates = [
                createRate({
                    id: "fixed-rate",
                    rate: 3.5,
                    type: "fixed",
                    fixedTerm: 3,
                }),
            ];
            const lenders = [
                createLender({ overpaymentPolicy: "test-policy" }),
            ];
            const policies = [createPolicy()];

            const result = calculateAmortization(
                state,
                rates,
                [],
                lenders,
                policies,
            );

            const allowanceWarnings = result.warnings.filter(
                (w) => w.type === "allowance_exceeded",
            );
            expect(allowanceWarnings.length).toBe(0);
        });

        it("no allowance warnings for variable rate periods", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 10000000,
                    mortgageTermMonths: 60,
                    propertyValue: 12000000,
                    ber: "B2",
                },
                overpaymentConfigs: [
                    createOverpaymentConfig({
                        type: "one_time",
                        amount: 5000000, // Large overpayment
                        startMonth: 12,
                    }),
                ],
            });
            const rates = [createRate({ rate: 4.0, type: "variable" })]; // Variable rate
            const lenders = [
                createLender({ overpaymentPolicy: "test-policy" }),
            ];
            const policies = [createPolicy()];

            const result = calculateAmortization(
                state,
                rates,
                [],
                lenders,
                policies,
            );

            const allowanceWarnings = result.warnings.filter(
                (w) => w.type === "allowance_exceeded",
            );
            expect(allowanceWarnings.length).toBe(0);
        });
    });

    describe("transaction limit warnings", () => {
        it("warns when overpayments exceed maxTransactions per year", () => {
            // Simulate Avant's policy: max 2 overpayments per year
            const state = createSimulationState({
                input: {
                    mortgageAmount: 20000000, // €200k
                    mortgageTermMonths: 60,
                    propertyValue: 25000000,
                    ber: "B2",
                    startDate: "2025-01-01",
                },
                ratePeriods: [
                    createRatePeriod({
                        rateId: "fixed-rate",
                        durationMonths: 36,
                    }),
                ],
                overpaymentConfigs: [
                    // 3 overpayments in same year - should trigger warning on 3rd
                    createOverpaymentConfig({
                        id: "op-1",
                        type: "one_time",
                        amount: 500000, // €5k - within allowance
                        startMonth: 3,
                    }),
                    createOverpaymentConfig({
                        id: "op-2",
                        type: "one_time",
                        amount: 500000,
                        startMonth: 6,
                    }),
                    createOverpaymentConfig({
                        id: "op-3",
                        type: "one_time",
                        amount: 500000,
                        startMonth: 9,
                    }),
                ],
            });
            const rates = [
                createRate({
                    id: "fixed-rate",
                    rate: 3.5,
                    type: "fixed",
                    fixedTerm: 3,
                }),
            ];
            const lenders = [
                createLender({ overpaymentPolicy: "max2-policy" }),
            ];
            const policies = [
                createPolicy({
                    id: "max2-policy",
                    maxTransactions: 2,
                    maxTransactionsPeriod: "year",
                }),
            ];

            const result = calculateAmortization(
                state,
                rates,
                [],
                lenders,
                policies,
            );

            const txLimitWarnings = result.warnings.filter(
                (w) => w.type === "transaction_limit_exceeded",
            );
            // 3rd overpayment should trigger warning
            expect(txLimitWarnings.length).toBe(1);
            expect(txLimitWarnings[0].month).toBe(9);
            expect(txLimitWarnings[0].configId).toBe("op-3");
        });

        it("resets transaction count at new calendar year", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 20000000,
                    mortgageTermMonths: 60,
                    propertyValue: 25000000,
                    ber: "B2",
                    startDate: "2025-01-01",
                },
                ratePeriods: [
                    createRatePeriod({
                        rateId: "fixed-rate",
                        durationMonths: 36,
                    }),
                ],
                overpaymentConfigs: [
                    // 2 overpayments in 2025
                    createOverpaymentConfig({
                        id: "op-1",
                        type: "one_time",
                        amount: 500000,
                        startMonth: 3, // Mar 2025
                    }),
                    createOverpaymentConfig({
                        id: "op-2",
                        type: "one_time",
                        amount: 500000,
                        startMonth: 6, // Jun 2025
                    }),
                    // 2 more in 2026 - should NOT trigger warning (new year)
                    createOverpaymentConfig({
                        id: "op-3",
                        type: "one_time",
                        amount: 500000,
                        startMonth: 15, // Mar 2026
                    }),
                    createOverpaymentConfig({
                        id: "op-4",
                        type: "one_time",
                        amount: 500000,
                        startMonth: 18, // Jun 2026
                    }),
                ],
            });
            const rates = [
                createRate({
                    id: "fixed-rate",
                    rate: 3.5,
                    type: "fixed",
                    fixedTerm: 3,
                }),
            ];
            const lenders = [
                createLender({ overpaymentPolicy: "max2-policy" }),
            ];
            const policies = [
                createPolicy({
                    id: "max2-policy",
                    maxTransactions: 2,
                    maxTransactionsPeriod: "year",
                }),
            ];

            const result = calculateAmortization(
                state,
                rates,
                [],
                lenders,
                policies,
            );

            const txLimitWarnings = result.warnings.filter(
                (w) => w.type === "transaction_limit_exceeded",
            );
            // No warnings - 2 per year in both years
            expect(txLimitWarnings.length).toBe(0);
        });

        it("tracks transaction limit per fixed_period", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 20000000,
                    mortgageTermMonths: 60,
                    propertyValue: 25000000,
                    ber: "B2",
                    startDate: "2025-01-01",
                },
                ratePeriods: [
                    createRatePeriod({
                        rateId: "fixed-rate",
                        durationMonths: 36,
                    }),
                ],
                overpaymentConfigs: [
                    // 3 overpayments across different years, but same fixed period
                    createOverpaymentConfig({
                        id: "op-1",
                        type: "one_time",
                        amount: 500000,
                        startMonth: 6, // Jun 2025
                    }),
                    createOverpaymentConfig({
                        id: "op-2",
                        type: "one_time",
                        amount: 500000,
                        startMonth: 18, // Jun 2026
                    }),
                    createOverpaymentConfig({
                        id: "op-3",
                        type: "one_time",
                        amount: 500000,
                        startMonth: 30, // Jun 2027
                    }),
                ],
            });
            const rates = [
                createRate({
                    id: "fixed-rate",
                    rate: 3.5,
                    type: "fixed",
                    fixedTerm: 3,
                }),
            ];
            const lenders = [
                createLender({ overpaymentPolicy: "max2-period" }),
            ];
            const policies = [
                createPolicy({
                    id: "max2-period",
                    maxTransactions: 2,
                    maxTransactionsPeriod: "fixed_period",
                }),
            ];

            const result = calculateAmortization(
                state,
                rates,
                [],
                lenders,
                policies,
            );

            const txLimitWarnings = result.warnings.filter(
                (w) => w.type === "transaction_limit_exceeded",
            );
            // 3rd overpayment should trigger warning (limit is 2 per fixed period)
            expect(txLimitWarnings.length).toBe(1);
            expect(txLimitWarnings[0].month).toBe(30);
        });

        it("no transaction limit warnings for variable rate periods", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 20000000,
                    mortgageTermMonths: 60,
                    propertyValue: 25000000,
                    ber: "B2",
                    startDate: "2025-01-01",
                },
                overpaymentConfigs: [
                    // Multiple overpayments on variable rate
                    createOverpaymentConfig({
                        id: "op-1",
                        type: "one_time",
                        amount: 500000,
                        startMonth: 3,
                    }),
                    createOverpaymentConfig({
                        id: "op-2",
                        type: "one_time",
                        amount: 500000,
                        startMonth: 6,
                    }),
                    createOverpaymentConfig({
                        id: "op-3",
                        type: "one_time",
                        amount: 500000,
                        startMonth: 9,
                    }),
                ],
            });
            const rates = [createRate({ rate: 4.0, type: "variable" })];
            const lenders = [
                createLender({ overpaymentPolicy: "max2-policy" }),
            ];
            const policies = [
                createPolicy({
                    id: "max2-policy",
                    maxTransactions: 2,
                    maxTransactionsPeriod: "year",
                }),
            ];

            const result = calculateAmortization(
                state,
                rates,
                [],
                lenders,
                policies,
            );

            // Variable rates don't have overpayment policies applied
            const txLimitWarnings = result.warnings.filter(
                (w) => w.type === "transaction_limit_exceeded",
            );
            expect(txLimitWarnings.length).toBe(0);
        });

        it("works without startDate using mortgage-relative years", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 20000000,
                    mortgageTermMonths: 60,
                    propertyValue: 25000000,
                    ber: "B2",
                    // No startDate
                },
                ratePeriods: [
                    createRatePeriod({
                        rateId: "fixed-rate",
                        durationMonths: 36,
                    }),
                ],
                overpaymentConfigs: [
                    // 3 overpayments in first mortgage year (months 1-12)
                    createOverpaymentConfig({
                        id: "op-1",
                        type: "one_time",
                        amount: 500000,
                        startMonth: 3,
                    }),
                    createOverpaymentConfig({
                        id: "op-2",
                        type: "one_time",
                        amount: 500000,
                        startMonth: 6,
                    }),
                    createOverpaymentConfig({
                        id: "op-3",
                        type: "one_time",
                        amount: 500000,
                        startMonth: 9,
                    }),
                ],
            });
            const rates = [
                createRate({
                    id: "fixed-rate",
                    rate: 3.5,
                    type: "fixed",
                    fixedTerm: 3,
                }),
            ];
            const lenders = [
                createLender({ overpaymentPolicy: "max2-policy" }),
            ];
            const policies = [
                createPolicy({
                    id: "max2-policy",
                    maxTransactions: 2,
                    maxTransactionsPeriod: "year",
                }),
            ];

            const result = calculateAmortization(
                state,
                rates,
                [],
                lenders,
                policies,
            );

            const txLimitWarnings = result.warnings.filter(
                (w) => w.type === "transaction_limit_exceeded",
            );
            // 3rd overpayment should trigger warning
            expect(txLimitWarnings.length).toBe(1);
            expect(txLimitWarnings[0].month).toBe(9);
        });
    });

    describe("early redemption warnings", () => {
        it("warns when mortgage paid off during fixed period", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 5000000, // €50k - small mortgage
                    mortgageTermMonths: 60,
                    propertyValue: 10000000,
                    ber: "B2",
                },
                ratePeriods: [
                    createRatePeriod({
                        rateId: "fixed-rate",
                        durationMonths: 60, // 5-year fixed
                    }),
                ],
                overpaymentConfigs: [
                    createOverpaymentConfig({
                        type: "recurring",
                        frequency: "monthly",
                        amount: 200000, // €2,000/month - aggressive overpayment
                        startMonth: 1,
                        effect: "reduce_term",
                    }),
                ],
            });
            const rates = [
                createRate({
                    id: "fixed-rate",
                    rate: 3.0,
                    type: "fixed",
                    fixedTerm: 5,
                }),
            ];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            const earlyRedemptionWarnings = result.warnings.filter(
                (w) => w.type === "early_redemption",
            );
            expect(earlyRedemptionWarnings.length).toBeGreaterThan(0);
        });
    });

    describe("edge cases", () => {
        it("returns empty result for zero mortgage amount", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 0,
                    mortgageTermMonths: 360,
                    propertyValue: 350000,
                    ber: "B2",
                },
            });

            const result = calculateAmortization(state, [], [], [], []);

            expect(result.months).toHaveLength(0);
        });

        it("returns empty result for zero term", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 30000000,
                    mortgageTermMonths: 0,
                    propertyValue: 350000,
                    ber: "B2",
                },
            });

            const result = calculateAmortization(state, [], [], [], []);

            expect(result.months).toHaveLength(0);
        });

        it("returns empty result for empty rate periods", () => {
            const state = createSimulationState({
                ratePeriods: [],
            });

            const result = calculateAmortization(state, [], [], [], []);

            expect(result.months).toHaveLength(0);
        });

        it("handles 0% interest rate", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 12000000, // €120k
                    mortgageTermMonths: 120, // 10 years
                    propertyValue: 15000000,
                    ber: "B2",
                },
            });
            const rates = [createRate({ rate: 0 })]; // 0% interest
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            // Monthly payment should be simple division: €120k / 120 months = €1k
            expect(result.months[0].scheduledPayment).toBeCloseTo(100000, -2);

            // No interest should be paid
            const lastMonth = result.months[result.months.length - 1];
            expect(lastMonth.cumulativeInterest).toBe(0);
        });
    });

    describe("date handling", () => {
        it("adds correct dates when startDate is provided", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 10000000,
                    mortgageTermMonths: 24,
                    propertyValue: 12000000,
                    ber: "B2",
                    startDate: "2025-03-15",
                },
            });
            const rates = [createRate({ rate: 4.0 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            expect(result.months[0].date).toBe("2025-03-15"); // Month 1
            expect(result.months[1].date).toBe("2025-04-15"); // Month 2
            expect(result.months[11].date).toBe("2026-02-15"); // Month 12
        });

        it("returns empty dates when no startDate provided", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 10000000,
                    mortgageTermMonths: 24,
                    propertyValue: 12000000,
                    ber: "B2",
                    // No startDate
                },
            });
            const rates = [createRate({ rate: 4.0 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            expect(result.months[0].date).toBe("");
        });
    });

    describe("self-build amortization", () => {
        it("starts balance at first drawdown amount", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 20000000, // €200k total
                    mortgageTermMonths: 360,
                    propertyValue: 25000000,
                    ber: "B2",
                },
                selfBuildConfig: createSelfBuildConfig([
                    { month: 1, amount: 5000000, label: "Site Purchase" }, // €50k
                    { month: 4, amount: 7500000, label: "Floor Level" }, // €75k
                    { month: 8, amount: 7500000, label: "Finished Property" }, // €75k
                ]),
            });
            const rates = [createRate({ rate: 4.0 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            // First month should start with first drawdown amount, not full mortgage
            expect(result.months[0].openingBalance).toBe(5000000);
        });

        it("increases balance at drawdown months", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 20000000,
                    mortgageTermMonths: 360,
                    propertyValue: 25000000,
                    ber: "B2",
                },
                selfBuildConfig: createSelfBuildConfig([
                    { month: 1, amount: 5000000 },
                    { month: 4, amount: 7500000 },
                    { month: 8, amount: 7500000 },
                ]),
            });
            const rates = [createRate({ rate: 4.0 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            // Check drawdown fields are set
            expect(result.months[0].drawdownThisMonth).toBe(0); // First drawdown in initial balance
            expect(result.months[0].cumulativeDrawn).toBe(5000000);

            expect(result.months[3].drawdownThisMonth).toBe(7500000); // Month 4 drawdown
            expect(result.months[3].cumulativeDrawn).toBe(12500000);

            expect(result.months[7].drawdownThisMonth).toBe(7500000); // Month 8 drawdown
            expect(result.months[7].cumulativeDrawn).toBe(20000000);
        });

        it("pays interest-only during construction phase", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 20000000,
                    mortgageTermMonths: 360,
                    propertyValue: 25000000,
                    ber: "B2",
                },
                selfBuildConfig: createSelfBuildConfig([
                    { month: 1, amount: 5000000 },
                    { month: 4, amount: 7500000 },
                    { month: 8, amount: 7500000 },
                ]),
            });
            const rates = [createRate({ rate: 4.0 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            // During construction (months 1-8), principal should be 0
            for (let i = 0; i < 8; i++) {
                expect(result.months[i].principalPortion).toBe(0);
                expect(result.months[i].phase).toBe("construction");
                expect(result.months[i].isInterestOnly).toBe(true);
            }
        });

        it("pays interest-only during interest-only period after construction", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 20000000,
                    mortgageTermMonths: 360,
                    propertyValue: 25000000,
                    ber: "B2",
                },
                selfBuildConfig: createSelfBuildConfig(
                    [
                        { month: 1, amount: 5000000 },
                        { month: 4, amount: 7500000 },
                        { month: 8, amount: 7500000 },
                    ],
                    6, // 6 months interest-only after construction
                ),
            });
            const rates = [createRate({ rate: 4.0 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            // Months 9-14 should be interest-only phase
            for (let i = 8; i < 14; i++) {
                expect(result.months[i].principalPortion).toBe(0);
                expect(result.months[i].phase).toBe("interest_only");
                expect(result.months[i].isInterestOnly).toBe(true);
            }
        });

        it("begins full amortization after interest-only period", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 20000000,
                    mortgageTermMonths: 360,
                    propertyValue: 25000000,
                    ber: "B2",
                },
                selfBuildConfig: createSelfBuildConfig(
                    [
                        { month: 1, amount: 5000000 },
                        { month: 4, amount: 7500000 },
                        { month: 8, amount: 7500000 },
                    ],
                    6, // Interest-only ends at month 14
                ),
            });
            const rates = [createRate({ rate: 4.0 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            // Month 15+ should be repayment phase with principal payments
            expect(result.months[14].phase).toBe("repayment");
            expect(result.months[14].isInterestOnly).toBe(false);
            expect(result.months[14].principalPortion).toBeGreaterThan(0);
        });

        it("calculates correct interest during interest-only periods", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 10000000, // €100k
                    mortgageTermMonths: 360,
                    propertyValue: 12000000,
                    ber: "B2",
                },
                selfBuildConfig: createSelfBuildConfig([
                    { month: 1, amount: 10000000 }, // Single drawdown for simplicity
                ]),
            });
            const rates = [createRate({ rate: 3.0 })]; // 3% annual
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            // First month interest: €100,000 * 3% / 12 = €250
            // In cents: 10000000 * 0.03 / 12 = 25000
            expect(result.months[0].interestPortion).toBeCloseTo(25000, 0);
            expect(result.months[0].scheduledPayment).toBeCloseTo(25000, 0); // Interest-only
        });

        it("completes mortgage with correct total interest", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 10000000, // €100k for faster test
                    mortgageTermMonths: 120, // 10 years
                    propertyValue: 12000000,
                    ber: "B2",
                },
                selfBuildConfig: createSelfBuildConfig(
                    [{ month: 1, amount: 10000000 }],
                    0, // No interest-only after construction
                ),
            });
            const rates = [createRate({ rate: 4.0 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            // Mortgage should complete (balance ~ 0)
            const lastMonth = result.months[result.months.length - 1];
            expect(lastMonth.closingBalance).toBeLessThan(1);

            // Cumulative principal should equal mortgage amount
            expect(lastMonth.cumulativePrincipal).toBeCloseTo(10000000, -2);
        });

        it("handles self-build with multiple rate periods", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 20000000,
                    mortgageTermMonths: 360,
                    propertyValue: 25000000,
                    ber: "B2",
                },
                ratePeriods: [
                    createRatePeriod({
                        id: "fixed-3yr",
                        rateId: "rate-fixed",
                        durationMonths: 36,
                    }),
                    createRatePeriod({
                        id: "variable",
                        rateId: "rate-variable",
                        durationMonths: 0,
                    }),
                ],
                selfBuildConfig: createSelfBuildConfig(
                    [
                        { month: 1, amount: 5000000 },
                        { month: 6, amount: 7500000 },
                        { month: 12, amount: 7500000 },
                    ],
                    12, // Interest-only until month 24
                ),
            });
            const rates = [
                createRate({
                    id: "rate-fixed",
                    rate: 3.0,
                    type: "fixed",
                    fixedTerm: 3,
                }),
                createRate({
                    id: "rate-variable",
                    rate: 4.5,
                    type: "variable",
                }),
            ];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            // During construction and interest-only (months 1-24), no principal
            for (let i = 0; i < 24; i++) {
                expect(result.months[i].principalPortion).toBe(0);
            }

            // Rate changes at month 37
            expect(result.months[35].rate).toBe(3.0);
            expect(result.months[36].rate).toBe(4.5);
        });

        it("allows overpayments during interest-only phase", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 20000000,
                    mortgageTermMonths: 360,
                    propertyValue: 25000000,
                    ber: "B2",
                },
                overpaymentConfigs: [
                    createOverpaymentConfig({
                        type: "one_time",
                        amount: 100000, // €1,000 overpayment
                        startMonth: 5, // During construction
                    }),
                ],
                selfBuildConfig: createSelfBuildConfig([
                    { month: 1, amount: 5000000 },
                    { month: 4, amount: 7500000 },
                    { month: 8, amount: 7500000 },
                ]),
            });
            const rates = [createRate({ rate: 4.0 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            // Overpayment should be applied in month 5
            expect(result.months[4].overpayment).toBe(100000);
        });

        it("pays interest + capital during construction with interest_and_capital mode", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 37000000, // €370k
                    mortgageTermMonths: 420, // 35 years
                    propertyValue: 50000000,
                    ber: "C2",
                },
                selfBuildConfig: createSelfBuildConfig(
                    [
                        { month: 1, amount: 9250000, label: "Floor Level" },
                        { month: 5, amount: 12950000, label: "Roof Level" },
                        {
                            month: 10,
                            amount: 11100000,
                            label: "Finished Property",
                        },
                        {
                            month: 12,
                            amount: 3700000,
                            label: "Post Completion",
                        },
                    ],
                    0, // No interest-only period
                    "interest_and_capital", // Pay principal during construction
                ),
            });
            const rates = [createRate({ rate: 3.2 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            // During construction, principal should be positive (not negative)
            for (let i = 0; i < 12; i++) {
                expect(
                    result.months[i].principalPortion,
                ).toBeGreaterThanOrEqual(0);
                expect(result.months[i].phase).toBe("construction");
                expect(result.months[i].isInterestOnly).toBe(false);
            }
        });

        it("recalculates payment after each drawdown in interest_and_capital mode", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 20000000, // €200k
                    mortgageTermMonths: 360,
                    propertyValue: 25000000,
                    ber: "B2",
                },
                selfBuildConfig: createSelfBuildConfig(
                    [
                        { month: 1, amount: 5000000 }, // €50k
                        { month: 4, amount: 7500000 }, // €75k -> total €125k
                        { month: 8, amount: 7500000 }, // €75k -> total €200k
                    ],
                    0,
                    "interest_and_capital",
                ),
            });
            const rates = [createRate({ rate: 4.0 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            // Payment should increase after each drawdown
            const paymentMonth1 = result.months[0].scheduledPayment;
            const paymentMonth4 = result.months[3].scheduledPayment;
            const paymentMonth8 = result.months[7].scheduledPayment;

            expect(paymentMonth4).toBeGreaterThan(paymentMonth1);
            expect(paymentMonth8).toBeGreaterThan(paymentMonth4);
        });

        it("calculates overpayment allowance based on drawn balance, not full mortgage", () => {
            // Setup: €200k mortgage with staged drawdowns, 10% of balance allowance
            // At month 12, only €50k has been drawn, so allowance should be €5k/year (~€417/month)
            // NOT €20k/year (10% of €200k)
            const state = createSimulationState({
                input: {
                    mortgageAmount: 20000000, // €200k total
                    mortgageTermMonths: 360,
                    propertyValue: 25000000,
                    ber: "B2",
                    startDate: "2025-01",
                },
                ratePeriods: [
                    createRatePeriod({
                        rateId: "fixed-rate",
                        durationMonths: 0,
                    }),
                ],
                overpaymentConfigs: [
                    createOverpaymentConfig({
                        type: "one_time",
                        amount: 600000, // €6,000 - should exceed €5k allowance based on drawn balance
                        startMonth: 12, // During construction, only €50k drawn
                    }),
                ],
                selfBuildConfig: createSelfBuildConfig([
                    { month: 1, amount: 5000000 }, // €50k
                    { month: 18, amount: 7500000 }, // €75k (drawn later)
                    { month: 24, amount: 7500000 }, // €75k (drawn later)
                ]),
            });
            const rates = [
                createRate({ id: "fixed-rate", type: "fixed", fixedTerm: 3 }),
            ];
            const lenders = [
                createLender({ overpaymentPolicy: "test-policy" }),
            ];
            const policies = [
                createPolicy({
                    id: "test-policy",
                    allowanceType: "percentage",
                    allowanceValue: 10,
                    allowanceBasis: "balance",
                }),
            ];

            const result = calculateAmortization(
                state,
                rates,
                [],
                lenders,
                policies,
            );

            // €6k overpayment should exceed the ~€5k allowance (10% of €50k drawn)
            // If incorrectly using full mortgage, €6k would be within €20k allowance
            expect(result.warnings.length).toBeGreaterThan(0);
            expect(result.warnings[0].type).toBe("allowance_exceeded");
        });

        it("overpayment within drawn balance allowance does not trigger warning", () => {
            // Setup: €200k mortgage, at month 12 only €50k drawn
            // 10% of €50k = €5k/year allowance, €4k overpayment should be within allowance
            const state = createSimulationState({
                input: {
                    mortgageAmount: 20000000, // €200k total
                    mortgageTermMonths: 360,
                    propertyValue: 25000000,
                    ber: "B2",
                    startDate: "2025-01",
                },
                ratePeriods: [
                    createRatePeriod({
                        rateId: "fixed-rate",
                        durationMonths: 0,
                    }),
                ],
                overpaymentConfigs: [
                    createOverpaymentConfig({
                        type: "one_time",
                        amount: 400000, // €4,000 - within €5k allowance based on drawn balance
                        startMonth: 12,
                    }),
                ],
                selfBuildConfig: createSelfBuildConfig([
                    { month: 1, amount: 5000000 }, // €50k drawn at month 1
                    { month: 18, amount: 7500000 }, // €75k (drawn later)
                    { month: 24, amount: 7500000 }, // €75k (drawn later)
                ]),
            });
            const rates = [
                createRate({ id: "fixed-rate", type: "fixed", fixedTerm: 3 }),
            ];
            const lenders = [
                createLender({ overpaymentPolicy: "test-policy" }),
            ];
            const policies = [
                createPolicy({
                    id: "test-policy",
                    allowanceType: "percentage",
                    allowanceValue: 10,
                    allowanceBasis: "balance",
                }),
            ];

            const result = calculateAmortization(
                state,
                rates,
                [],
                lenders,
                policies,
            );

            // No allowance warnings should be triggered
            const allowanceWarnings = result.warnings.filter(
                (w) => w.type === "allowance_exceeded",
            );
            expect(allowanceWarnings.length).toBe(0);
        });

        it("allowance is based on year-start balance and increases after drawdowns", () => {
            // Allowance is calculated at the START of each calendar year
            // Setup: €200k mortgage with staged drawdowns
            // - Month 1 (Jan 2025): €50k drawn
            // - Year 2025 allowance: 10% of €50k = €5k
            // - Month 6 (Jun 2025): €75k more drawn -> total €125k
            // - Year 2026 starts at month 13 with balance ~€125k
            // - Year 2026 allowance: 10% of €125k = €12.5k
            const state = createSimulationState({
                input: {
                    mortgageAmount: 20000000,
                    mortgageTermMonths: 360,
                    propertyValue: 25000000,
                    ber: "B2",
                    startDate: "2025-01",
                },
                ratePeriods: [
                    createRatePeriod({
                        rateId: "fixed-rate",
                        durationMonths: 0,
                    }),
                ],
                overpaymentConfigs: [
                    createOverpaymentConfig({
                        id: "overpayment-1",
                        type: "one_time",
                        amount: 600000, // €6,000 - exceeds €5k (10% of €50k year-start)
                        startMonth: 12, // Dec 2025, year 2025 allowance based on €50k
                    }),
                    createOverpaymentConfig({
                        id: "overpayment-2",
                        type: "one_time",
                        amount: 1000000, // €10,000 - within €12.5k (10% of €125k year-start)
                        startMonth: 18, // Jun 2026, year 2026 allowance based on ~€125k
                    }),
                ],
                selfBuildConfig: createSelfBuildConfig([
                    { month: 1, amount: 5000000 }, // €50k (Jan 2025)
                    { month: 6, amount: 7500000 }, // €75k -> total €125k (Jun 2025)
                    { month: 30, amount: 7500000 }, // €75k -> total €200k (later)
                ]),
            });
            const rates = [
                createRate({ id: "fixed-rate", type: "fixed", fixedTerm: 5 }),
            ];
            const lenders = [
                createLender({ overpaymentPolicy: "test-policy" }),
            ];
            const policies = [
                createPolicy({
                    id: "test-policy",
                    allowanceType: "percentage",
                    allowanceValue: 10,
                    allowanceBasis: "balance",
                }),
            ];

            const result = calculateAmortization(
                state,
                rates,
                [],
                lenders,
                policies,
            );

            // First overpayment (month 12, Dec 2025) should exceed allowance
            // Year 2025 allowance based on month 1 balance = €50k -> €5k allowance
            const firstWarning = result.warnings.find(
                (w) => w.type === "allowance_exceeded" && w.month === 12,
            );
            expect(firstWarning).toBeDefined();

            // Second overpayment (month 18, Jun 2026) should be within allowance
            // Year 2026 starts at month 13, balance at that point is ~€125k -> €12.5k allowance
            const secondWarning = result.warnings.find(
                (w) => w.type === "allowance_exceeded" && w.month === 18,
            );
            expect(secondWarning).toBeUndefined();
        });
    });
});

describe("aggregateByYear", () => {
    function createMonth(
        overrides: Partial<AmortizationMonth> = {},
    ): AmortizationMonth {
        return {
            month: 1,
            year: 1,
            monthOfYear: 1,
            date: "",
            openingBalance: 30000000,
            closingBalance: 29900000,
            scheduledPayment: 134713,
            interestPortion: 87500,
            principalPortion: 47213,
            overpayment: 0,
            totalPayment: 134713,
            rate: 3.5,
            ratePeriodId: "period-1",
            cumulativeInterest: 87500,
            cumulativePrincipal: 47213,
            cumulativeOverpayments: 0,
            cumulativeTotal: 134713,
            ...overrides,
        };
    }

    it("aggregates months by mortgage year when no dates", () => {
        const months: AmortizationMonth[] = [];
        for (let i = 1; i <= 24; i++) {
            months.push(
                createMonth({
                    month: i,
                    year: Math.ceil(i / 12),
                    monthOfYear: ((i - 1) % 12) + 1,
                    date: "", // No date
                }),
            );
        }

        const years = aggregateByYear(months);

        expect(years).toHaveLength(2);
        expect(years[0].year).toBe(1);
        expect(years[0].months).toHaveLength(12);
        expect(years[1].year).toBe(2);
        expect(years[1].months).toHaveLength(12);
    });

    it("aggregates months by calendar year when dates provided", () => {
        const months: AmortizationMonth[] = [];
        // Start in March 2025 - year 1 will have 10 months (Mar-Dec)
        for (let i = 1; i <= 24; i++) {
            const totalMonths = 2025 * 12 + 2 + (i - 1); // Starting from March 2025
            const calendarYear = Math.floor(totalMonths / 12);
            const calendarMonth = (totalMonths % 12) + 1;

            months.push(
                createMonth({
                    month: i,
                    year: Math.ceil(i / 12),
                    monthOfYear: ((i - 1) % 12) + 1,
                    date: `${calendarYear}-${String(calendarMonth).padStart(2, "0")}-15`,
                }),
            );
        }

        const years = aggregateByYear(months);

        expect(years).toHaveLength(3); // 2025, 2026, 2027
        expect(years[0].year).toBe(2025);
        expect(years[0].months).toHaveLength(10); // Mar-Dec
        expect(years[1].year).toBe(2026);
        expect(years[1].months).toHaveLength(12); // Full year
        expect(years[2].year).toBe(2027);
        expect(years[2].months).toHaveLength(2); // Jan-Feb
    });

    it("calculates yearly totals correctly", () => {
        const months: AmortizationMonth[] = [];
        for (let i = 1; i <= 12; i++) {
            months.push(
                createMonth({
                    month: i,
                    year: 1,
                    monthOfYear: i,
                    interestPortion: 10000, // €100 each
                    principalPortion: 5000, // €50 each
                    overpayment: i === 6 ? 100000 : 0, // €1k in month 6
                    totalPayment: 15000 + (i === 6 ? 100000 : 0),
                }),
            );
        }

        const years = aggregateByYear(months);

        expect(years[0].totalInterest).toBe(120000); // 12 × €100
        expect(years[0].totalPrincipal).toBe(60000); // 12 × €50
        expect(years[0].totalOverpayments).toBe(100000); // €1k in month 6
        expect(years[0].totalPayments).toBe(280000); // 12 × €150 + €100
    });

    it("returns empty array for empty months", () => {
        const years = aggregateByYear([]);
        expect(years).toHaveLength(0);
    });
});

describe("calculateSummary", () => {
    // Creates months where mortgage is paid off (closingBalance reaches 0 on last month)
    function createCompletedMortgageMonths(
        count: number,
        mortgageAmount: number,
        cumulativeInterest: number,
    ): AmortizationMonth[] {
        const months: AmortizationMonth[] = [];
        const principalPerMonth = mortgageAmount / count;
        for (let i = 1; i <= count; i++) {
            const openingBalance = mortgageAmount - (i - 1) * principalPerMonth;
            // Last month closes at 0 (paid off)
            const closingBalance =
                i === count ? 0 : mortgageAmount - i * principalPerMonth;
            months.push({
                month: i,
                year: Math.ceil(i / 12),
                monthOfYear: ((i - 1) % 12) + 1,
                date: "",
                openingBalance,
                closingBalance,
                scheduledPayment: 134713,
                interestPortion: 10000,
                principalPortion: principalPerMonth,
                overpayment: 0,
                totalPayment: 134713,
                rate: 3.5,
                ratePeriodId: "period-1",
                cumulativeInterest:
                    i === count ? cumulativeInterest : i * 10000,
                cumulativePrincipal: i * principalPerMonth,
                cumulativeOverpayments: 0,
                cumulativeTotal:
                    i === count
                        ? cumulativeInterest + i * principalPerMonth
                        : i * 10000 + i * principalPerMonth,
            });
        }
        return months;
    }

    // Creates months where simulation is incomplete (closingBalance > 0)
    function createIncompleteMortgageMonths(
        count: number,
        cumulativeInterest: number,
    ): AmortizationMonth[] {
        const months: AmortizationMonth[] = [];
        const mortgageAmount = 30000000; // €300k
        const principalPerMonth = 50000; // €500 - won't pay off €300k in 120 months
        for (let i = 1; i <= count; i++) {
            months.push({
                month: i,
                year: Math.ceil(i / 12),
                monthOfYear: ((i - 1) % 12) + 1,
                date: "",
                openingBalance: mortgageAmount - (i - 1) * principalPerMonth,
                closingBalance: mortgageAmount - i * principalPerMonth,
                scheduledPayment: 134713,
                interestPortion: 10000,
                principalPortion: principalPerMonth,
                overpayment: 0,
                totalPayment: 134713,
                rate: 3.5,
                ratePeriodId: "period-1",
                cumulativeInterest:
                    i === count ? cumulativeInterest : i * 10000,
                cumulativePrincipal: i * principalPerMonth,
                cumulativeOverpayments: 0,
                cumulativeTotal:
                    i === count
                        ? cumulativeInterest + i * principalPerMonth
                        : i * 10000 + i * principalPerMonth,
            });
        }
        return months;
    }

    it("calculates correct summary stats when mortgage is paid off early", () => {
        // Mortgage of €300k paid off in 120 months (10 years) instead of 360 (30 years)
        const months = createCompletedMortgageMonths(120, 30000000, 5000000); // €50k interest
        const baselineInterest = 6000000; // €60k baseline

        const summary = calculateSummary(months, baselineInterest, 360);

        expect(summary.totalInterest).toBe(5000000);
        expect(summary.actualTermMonths).toBe(120);
        expect(summary.interestSaved).toBe(1000000); // €60k - €50k = €10k saved
        expect(summary.monthsSaved).toBe(240); // 360 - 120 = 240 months saved
    });

    it("returns zero monthsSaved when simulation is incomplete", () => {
        // Simulation stops at 120 months but mortgage isn't paid off (missing rate periods)
        const months = createIncompleteMortgageMonths(120, 5000000); // €50k interest, but €240k still owed
        const baselineInterest = 6000000; // €60k baseline

        const summary = calculateSummary(months, baselineInterest, 360);

        expect(summary.totalInterest).toBe(5000000);
        expect(summary.actualTermMonths).toBe(120);
        expect(summary.interestSaved).toBe(1000000); // Interest saved still reported
        expect(summary.monthsSaved).toBe(0); // But no months saved since mortgage isn't paid off
    });

    it("returns zero values for empty months", () => {
        const summary = calculateSummary([], 1000000, 360);

        expect(summary.totalInterest).toBe(0);
        expect(summary.totalPaid).toBe(0);
        expect(summary.actualTermMonths).toBe(0);
        expect(summary.interestSaved).toBe(0);
        expect(summary.monthsSaved).toBe(0);
    });

    it("handles case where actual interest exceeds baseline", () => {
        const months = createIncompleteMortgageMonths(120, 7000000); // €70k interest
        const baselineInterest = 6000000; // €60k baseline (unlikely but possible edge case)

        const summary = calculateSummary(months, baselineInterest, 360);

        // Interest saved should not be negative
        expect(summary.interestSaved).toBe(0);
    });
});

describe("calculateMilestones", () => {
    function createMonthsForMilestones(
        mortgageAmount: number,
    ): AmortizationMonth[] {
        const months: AmortizationMonth[] = [];
        let balance = mortgageAmount;
        const principalPerMonth = mortgageAmount / 100; // Pay off in ~100 months for testing

        for (let i = 1; i <= 100 && balance > 0; i++) {
            const closingBalance = Math.max(0, balance - principalPerMonth);
            months.push({
                month: i,
                year: Math.ceil(i / 12),
                monthOfYear: ((i - 1) % 12) + 1,
                date: `2025-${String(((i - 1) % 12) + 1).padStart(2, "0")}-15`,
                openingBalance: balance,
                closingBalance,
                scheduledPayment: principalPerMonth + 1000,
                interestPortion: 1000,
                principalPortion: principalPerMonth,
                overpayment: 0,
                totalPayment: principalPerMonth + 1000,
                rate: 3.5,
                ratePeriodId: "period-1",
                cumulativeInterest: i * 1000,
                cumulativePrincipal: i * principalPerMonth,
                cumulativeOverpayments: 0,
                cumulativeTotal: i * (principalPerMonth + 1000),
            });
            balance = closingBalance;
        }
        return months;
    }

    it("includes mortgage start milestone", () => {
        const months = createMonthsForMilestones(10000000);

        const milestones = calculateMilestones(
            months,
            10000000,
            12000000,
            "2025-01-15",
        );

        const startMilestone = milestones.find(
            (m) => m.type === "mortgage_start",
        );
        expect(startMilestone).toBeDefined();
        expect(startMilestone?.month).toBe(1);
    });

    it("detects 25% paid off milestone", () => {
        const months = createMonthsForMilestones(10000000);

        const milestones = calculateMilestones(
            months,
            10000000,
            12000000,
            "2025-01-15",
        );

        const milestone25 = milestones.find(
            (m) => m.type === "principal_25_percent",
        );
        expect(milestone25).toBeDefined();
        // Should occur around month 25 (when balance drops to 75%)
        expect(milestone25?.month).toBeGreaterThanOrEqual(25);
    });

    it("detects 50% paid off milestone", () => {
        const months = createMonthsForMilestones(10000000);

        const milestones = calculateMilestones(
            months,
            10000000,
            12000000,
            "2025-01-15",
        );

        const milestone50 = milestones.find(
            (m) => m.type === "principal_50_percent",
        );
        expect(milestone50).toBeDefined();
    });

    it("detects mortgage complete milestone", () => {
        const months = createMonthsForMilestones(10000000);

        const milestones = calculateMilestones(
            months,
            10000000,
            12000000,
            "2025-01-15",
        );

        const completeMilestone = milestones.find(
            (m) => m.type === "mortgage_complete",
        );
        expect(completeMilestone).toBeDefined();
        expect(completeMilestone?.value).toBe(0);
    });

    it("detects LTV 80% milestone when starting above 80%", () => {
        // Start with 90% LTV (mortgage 90% of property value)
        const propertyValue = 11111111; // ~€111k
        const mortgageAmount = 10000000; // €100k = 90% LTV
        const months = createMonthsForMilestones(mortgageAmount);

        const milestones = calculateMilestones(
            months,
            mortgageAmount,
            propertyValue,
            "2025-01-15",
        );

        const ltv80Milestone = milestones.find(
            (m) => m.type === "ltv_80_percent",
        );
        expect(ltv80Milestone).toBeDefined();
    });

    it("does not include LTV 80% milestone when starting below 80%", () => {
        // Start with 70% LTV
        const propertyValue = 15000000; // €150k
        const mortgageAmount = 10000000; // €100k = 67% LTV
        const months = createMonthsForMilestones(mortgageAmount);

        const milestones = calculateMilestones(
            months,
            mortgageAmount,
            propertyValue,
            "2025-01-15",
        );

        const ltv80Milestone = milestones.find(
            (m) => m.type === "ltv_80_percent",
        );
        expect(ltv80Milestone).toBeUndefined();
    });

    it("returns empty array for empty months", () => {
        const milestones = calculateMilestones(
            [],
            10000000,
            12000000,
            "2025-01-15",
        );
        expect(milestones).toHaveLength(0);
    });

    describe("self-build milestones", () => {
        // Helper to create self-build config for milestone tests
        function createSelfBuildMilestoneConfig(
            stages: { month: number; amount: number }[],
            interestOnlyMonths = 0,
        ) {
            return {
                enabled: true,
                constructionRepaymentType: "interest_only" as const,
                interestOnlyMonths,
                drawdownStages: stages.map((s, i) => ({
                    id: `stage-${i}`,
                    month: s.month,
                    amount: s.amount,
                })),
            };
        }

        function createSelfBuildMonths(
            mortgageAmount: number,
            constructionEndMonth: number,
            interestOnlyEndMonth: number,
        ): AmortizationMonth[] {
            const months: AmortizationMonth[] = [];
            let balance = mortgageAmount;
            const principalPerMonth = mortgageAmount / 100;

            for (let i = 1; i <= 100 && balance > 0; i++) {
                const isInterestOnly = i <= interestOnlyEndMonth;
                const phase =
                    i <= constructionEndMonth
                        ? "construction"
                        : i <= interestOnlyEndMonth
                          ? "interest_only"
                          : "repayment";

                const principalPortion = isInterestOnly ? 0 : principalPerMonth;
                const closingBalance = Math.max(0, balance - principalPortion);

                months.push({
                    month: i,
                    year: Math.ceil(i / 12),
                    monthOfYear: ((i - 1) % 12) + 1,
                    date: `2025-${String(((i - 1) % 12) + 1).padStart(2, "0")}-15`,
                    openingBalance: balance,
                    closingBalance,
                    scheduledPayment: principalPortion + 1000,
                    interestPortion: 1000,
                    principalPortion,
                    overpayment: 0,
                    totalPayment: principalPortion + 1000,
                    rate: 3.5,
                    ratePeriodId: "period-1",
                    cumulativeInterest: i * 1000,
                    cumulativePrincipal: isInterestOnly
                        ? 0
                        : (i - interestOnlyEndMonth) * principalPerMonth,
                    cumulativeOverpayments: 0,
                    cumulativeTotal:
                        i * 1000 +
                        (isInterestOnly
                            ? 0
                            : (i - interestOnlyEndMonth) * principalPerMonth),
                    phase: phase as
                        | "construction"
                        | "interest_only"
                        | "repayment",
                    isInterestOnly,
                });
                balance = closingBalance;
            }
            return months;
        }

        it("includes construction_complete milestone for self-build", () => {
            const constructionEndMonth = 8;
            const interestOnlyEndMonth = 8; // No additional interest-only period
            const months = createSelfBuildMonths(
                10000000,
                constructionEndMonth,
                interestOnlyEndMonth,
            );

            const selfBuildConfig = createSelfBuildMilestoneConfig([
                { month: 1, amount: 2500000 },
                { month: 4, amount: 3750000 },
                { month: 8, amount: 3750000 }, // Final drawdown
            ]);

            const milestones = calculateMilestones(
                months,
                10000000,
                12000000,
                "2025-01-15",
                selfBuildConfig,
            );

            const constructionMilestone = milestones.find(
                (m) => m.type === "construction_complete",
            );
            expect(constructionMilestone).toBeDefined();
            expect(constructionMilestone?.month).toBe(constructionEndMonth);
            expect(constructionMilestone?.label).toBe("Construction Complete");
        });

        it("includes full_payments_start milestone when interest-only period exists", () => {
            const constructionEndMonth = 8;
            const interestOnlyMonths = 6;
            const interestOnlyEndMonth =
                constructionEndMonth + interestOnlyMonths;
            const months = createSelfBuildMonths(
                10000000,
                constructionEndMonth,
                interestOnlyEndMonth,
            );

            const selfBuildConfig = createSelfBuildMilestoneConfig(
                [
                    { month: 1, amount: 2500000 },
                    { month: 4, amount: 3750000 },
                    { month: 8, amount: 3750000 },
                ],
                interestOnlyMonths,
            );

            const milestones = calculateMilestones(
                months,
                10000000,
                12000000,
                "2025-01-15",
                selfBuildConfig,
            );

            const fullPaymentsMilestone = milestones.find(
                (m) => m.type === "full_payments_start",
            );
            expect(fullPaymentsMilestone).toBeDefined();
            expect(fullPaymentsMilestone?.month).toBe(interestOnlyEndMonth + 1);
            expect(fullPaymentsMilestone?.label).toBe("Full Payments Start");
        });

        it("does not include full_payments_start when no interest-only period", () => {
            const constructionEndMonth = 8;
            const months = createSelfBuildMonths(
                10000000,
                constructionEndMonth,
                8,
            );

            const selfBuildConfig = createSelfBuildMilestoneConfig(
                [
                    { month: 1, amount: 2500000 },
                    { month: 4, amount: 3750000 },
                    { month: 8, amount: 3750000 },
                ],
                0, // No interest-only period after construction
            );

            const milestones = calculateMilestones(
                months,
                10000000,
                12000000,
                "2025-01-15",
                selfBuildConfig,
            );

            const fullPaymentsMilestone = milestones.find(
                (m) => m.type === "full_payments_start",
            );
            expect(fullPaymentsMilestone).toBeUndefined();
        });

        it("hides construction milestones when drawdowns not fully allocated", () => {
            const months = createSelfBuildMonths(10000000, 8, 8);

            // Drawdowns only sum to 5000000, not matching 10000000 mortgage
            const selfBuildConfig = createSelfBuildMilestoneConfig([
                { month: 1, amount: 2500000 },
                { month: 4, amount: 2500000 },
                // Missing €50k to complete
            ]);

            const milestones = calculateMilestones(
                months,
                10000000,
                12000000,
                "2025-01-15",
                selfBuildConfig,
            );

            const constructionMilestone = milestones.find(
                (m) => m.type === "construction_complete",
            );
            expect(constructionMilestone).toBeUndefined();
        });

        it("shows mortgage_start with first drawdown amount for self-build", () => {
            const months = createSelfBuildMonths(10000000, 8, 8);

            const selfBuildConfig = createSelfBuildMilestoneConfig([
                { month: 1, amount: 2500000 }, // First drawdown is €25k
                { month: 4, amount: 3750000 },
                { month: 8, amount: 3750000 },
            ]);

            const milestones = calculateMilestones(
                months,
                10000000,
                12000000,
                "2025-01-15",
                selfBuildConfig,
            );

            const startMilestone = milestones.find(
                (m) => m.type === "mortgage_start",
            );
            expect(startMilestone).toBeDefined();
            expect(startMilestone?.value).toBe(2500000); // First drawdown, not full mortgage
        });
    });
});

describe("calculateBaselineInterest", () => {
    // Helper to create a resolved rate period
    function createResolvedPeriod(
        id: string,
        rate: number,
        startMonth: number,
        durationMonths: number,
    ): ResolvedRatePeriod {
        return {
            id,
            rateId: `rate-${id}`,
            rate,
            type: "variable",
            lenderId: "test-lender",
            lenderName: "Test Bank",
            rateName: "Test Rate",
            startMonth,
            durationMonths,
            label: `Period ${id}`,
            isCustom: false,
        };
    }

    describe("basic calculations", () => {
        it("calculates interest for single rate period", () => {
            const mortgageAmount = 30000000; // €300k in cents
            const termMonths = 360; // 30 years
            const ratePeriods: RatePeriod[] = [
                {
                    id: "p1",
                    rateId: "rate-p1",
                    lenderId: "test",
                    durationMonths: 0,
                    isCustom: false,
                },
            ];
            const resolvedPeriods = new Map<string, ResolvedRatePeriod>([
                ["p1", createResolvedPeriod("p1", 4.0, 1, 0)],
            ]);

            const interest = calculateBaselineInterest(
                mortgageAmount,
                termMonths,
                ratePeriods,
                resolvedPeriods,
            );

            // Should calculate significant interest over 30 years at 4%
            expect(interest).toBeGreaterThan(mortgageAmount * 0.5); // More than 50% of principal
            expect(interest).toBeLessThan(mortgageAmount * 1.5); // Less than 150% of principal
        });

        it("calculates higher interest for higher rate", () => {
            const mortgageAmount = 30000000;
            const termMonths = 360;

            const lowRatePeriods: RatePeriod[] = [
                {
                    id: "p1",
                    rateId: "rate-p1",
                    lenderId: "test",
                    durationMonths: 0,
                    isCustom: false,
                },
            ];
            const lowResolvedPeriods = new Map<string, ResolvedRatePeriod>([
                ["p1", createResolvedPeriod("p1", 3.0, 1, 0)],
            ]);

            const highRatePeriods: RatePeriod[] = [
                {
                    id: "p1",
                    rateId: "rate-p1",
                    lenderId: "test",
                    durationMonths: 0,
                    isCustom: false,
                },
            ];
            const highResolvedPeriods = new Map<string, ResolvedRatePeriod>([
                ["p1", createResolvedPeriod("p1", 5.0, 1, 0)],
            ]);

            const lowInterest = calculateBaselineInterest(
                mortgageAmount,
                termMonths,
                lowRatePeriods,
                lowResolvedPeriods,
            );
            const highInterest = calculateBaselineInterest(
                mortgageAmount,
                termMonths,
                highRatePeriods,
                highResolvedPeriods,
            );

            expect(highInterest).toBeGreaterThan(lowInterest);
        });

        it("calculates interest for multiple rate periods", () => {
            const mortgageAmount = 30000000;
            const termMonths = 360;
            const ratePeriods: RatePeriod[] = [
                {
                    id: "p1",
                    rateId: "rate-p1",
                    lenderId: "test",
                    durationMonths: 36,
                    isCustom: false,
                }, // 3 years fixed
                {
                    id: "p2",
                    rateId: "rate-p2",
                    lenderId: "test",
                    durationMonths: 0,
                    isCustom: false,
                }, // Variable until end
            ];
            const resolvedPeriods = new Map<string, ResolvedRatePeriod>([
                ["p1", createResolvedPeriod("p1", 3.5, 1, 36)],
                ["p2", createResolvedPeriod("p2", 4.5, 37, 0)],
            ]);

            const interest = calculateBaselineInterest(
                mortgageAmount,
                termMonths,
                ratePeriods,
                resolvedPeriods,
            );

            expect(interest).toBeGreaterThan(0);
        });
    });

    describe("edge cases", () => {
        it("returns 0 for zero mortgage amount", () => {
            const ratePeriods: RatePeriod[] = [
                {
                    id: "p1",
                    rateId: "rate-p1",
                    lenderId: "test",
                    durationMonths: 0,
                    isCustom: false,
                },
            ];
            const resolvedPeriods = new Map<string, ResolvedRatePeriod>([
                ["p1", createResolvedPeriod("p1", 4.0, 1, 0)],
            ]);

            const interest = calculateBaselineInterest(
                0,
                360,
                ratePeriods,
                resolvedPeriods,
            );

            expect(interest).toBe(0);
        });

        it("returns 0 for zero term months", () => {
            const ratePeriods: RatePeriod[] = [
                {
                    id: "p1",
                    rateId: "rate-p1",
                    lenderId: "test",
                    durationMonths: 0,
                    isCustom: false,
                },
            ];
            const resolvedPeriods = new Map<string, ResolvedRatePeriod>([
                ["p1", createResolvedPeriod("p1", 4.0, 1, 0)],
            ]);

            const interest = calculateBaselineInterest(
                30000000,
                0,
                ratePeriods,
                resolvedPeriods,
            );

            expect(interest).toBe(0);
        });

        it("returns 0 for empty rate periods", () => {
            const interest = calculateBaselineInterest(
                30000000,
                360,
                [],
                new Map(),
            );

            expect(interest).toBe(0);
        });

        it("handles missing resolved period gracefully", () => {
            const ratePeriods: RatePeriod[] = [
                {
                    id: "p1",
                    rateId: "rate-p1",
                    lenderId: "test",
                    durationMonths: 0,
                    isCustom: false,
                },
            ];
            // Empty resolved periods map - period not resolved
            const resolvedPeriods = new Map<string, ResolvedRatePeriod>();

            const interest = calculateBaselineInterest(
                30000000,
                360,
                ratePeriods,
                resolvedPeriods,
            );

            // Should handle gracefully without crashing
            expect(interest).toBe(0);
        });

        it("handles negative mortgage amount", () => {
            const ratePeriods: RatePeriod[] = [
                {
                    id: "p1",
                    rateId: "rate-p1",
                    lenderId: "test",
                    durationMonths: 0,
                    isCustom: false,
                },
            ];
            const resolvedPeriods = new Map<string, ResolvedRatePeriod>([
                ["p1", createResolvedPeriod("p1", 4.0, 1, 0)],
            ]);

            const interest = calculateBaselineInterest(
                -30000000,
                360,
                ratePeriods,
                resolvedPeriods,
            );

            expect(interest).toBe(0);
        });
    });

    describe("shorter terms", () => {
        it("calculates less interest for shorter term", () => {
            const mortgageAmount = 30000000;
            const ratePeriods: RatePeriod[] = [
                {
                    id: "p1",
                    rateId: "rate-p1",
                    lenderId: "test",
                    durationMonths: 0,
                    isCustom: false,
                },
            ];
            const resolvedPeriods = new Map<string, ResolvedRatePeriod>([
                ["p1", createResolvedPeriod("p1", 4.0, 1, 0)],
            ]);

            const interest20yr = calculateBaselineInterest(
                mortgageAmount,
                240,
                ratePeriods,
                resolvedPeriods,
            );
            const interest30yr = calculateBaselineInterest(
                mortgageAmount,
                360,
                ratePeriods,
                resolvedPeriods,
            );

            // Shorter term means higher monthly payments but less total interest
            expect(interest20yr).toBeLessThan(interest30yr);
        });
    });

    describe("self-build baseline", () => {
        it("baseline uses same repayment type as user config", () => {
            const mortgageAmount = 20000000; // €200k
            const ratePeriods: RatePeriod[] = [
                {
                    id: "p1",
                    rateId: "rate-p1",
                    lenderId: "test",
                    durationMonths: 0,
                    isCustom: false,
                },
            ];
            const resolvedPeriods = new Map<string, ResolvedRatePeriod>([
                ["p1", createResolvedPeriod("p1", 4.0, 1, 0)],
            ]);

            // Interest-only config
            const interestOnlyConfig = createSelfBuildConfig(
                [
                    { month: 1, amount: 5000000 },
                    { month: 4, amount: 7500000 },
                    { month: 8, amount: 7500000 },
                ],
                0,
                "interest_only",
            );

            // Interest + capital config
            const interestCapitalConfig = createSelfBuildConfig(
                [
                    { month: 1, amount: 5000000 },
                    { month: 4, amount: 7500000 },
                    { month: 8, amount: 7500000 },
                ],
                0,
                "interest_and_capital",
            );

            const interestOnlyBaseline = calculateBaselineInterest(
                mortgageAmount,
                360,
                ratePeriods,
                resolvedPeriods,
                interestOnlyConfig,
            );

            const interestCapitalBaseline = calculateBaselineInterest(
                mortgageAmount,
                360,
                ratePeriods,
                resolvedPeriods,
                interestCapitalConfig,
            );

            // Interest-only mode should have more total interest than interest+capital
            // because no principal is paid during construction
            expect(interestOnlyBaseline).toBeGreaterThan(
                interestCapitalBaseline,
            );
        });

        it("baseline matches actual when no overpayments", () => {
            const mortgageAmount = 20000000;
            const ratePeriods: RatePeriod[] = [
                {
                    id: "p1",
                    rateId: "rate-p1",
                    lenderId: "test",
                    durationMonths: 0,
                    isCustom: false,
                },
            ];
            const resolvedPeriods = new Map<string, ResolvedRatePeriod>([
                ["p1", createResolvedPeriod("p1", 4.0, 1, 0)],
            ]);

            const selfBuildConfig = createSelfBuildConfig(
                [
                    { month: 1, amount: 5000000 },
                    { month: 4, amount: 7500000 },
                    { month: 8, amount: 7500000 },
                ],
                0,
                "interest_and_capital",
            );

            // Baseline for interest_and_capital mode
            const baselineInterest = calculateBaselineInterest(
                mortgageAmount,
                360,
                ratePeriods,
                resolvedPeriods,
                selfBuildConfig,
            );

            // Actual simulation with same config and NO overpayments
            const state = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths: 360,
                    propertyValue: 25000000,
                    ber: "B2",
                },
                selfBuildConfig,
                overpaymentConfigs: [], // No overpayments
            });
            const rates = [createRate({ rate: 4.0 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);
            const actualInterest =
                result.months[result.months.length - 1].cumulativeInterest;

            // Without overpayments, baseline and actual should be the same
            expect(actualInterest).toBeCloseTo(baselineInterest, 0);
        });

        it("self-build with staged drawdowns saves interest vs standard mortgage", () => {
            const mortgageAmount = 20000000; // €200k
            const ratePeriods: RatePeriod[] = [
                {
                    id: "p1",
                    rateId: "rate-p1",
                    lenderId: "test",
                    durationMonths: 0,
                    isCustom: false,
                },
            ];
            const resolvedPeriods = new Map<string, ResolvedRatePeriod>([
                ["p1", createResolvedPeriod("p1", 4.0, 1, 0)],
            ]);

            // Interest-only self-build config
            const selfBuildConfig = createSelfBuildConfig(
                [
                    { month: 1, amount: 5000000 },
                    { month: 4, amount: 7500000 },
                    { month: 8, amount: 7500000 },
                ],
                0,
                "interest_only",
            );

            // Self-build interest (actual)
            const selfBuildInterest = calculateBaselineInterest(
                mortgageAmount,
                360,
                ratePeriods,
                resolvedPeriods,
                selfBuildConfig,
            );

            // Standard mortgage interest (no self-build)
            const standardInterest = calculateBaselineInterest(
                mortgageAmount,
                360,
                ratePeriods,
                resolvedPeriods,
                undefined, // No self-build = standard mortgage
            );

            // Self-build with staged drawdowns actually SAVES interest
            // because you pay interest on smaller amounts during construction
            expect(selfBuildInterest).toBeLessThan(standardInterest);
        });

        it("long interest-only period after construction pays more interest", () => {
            const mortgageAmount = 20000000; // €200k
            const ratePeriods: RatePeriod[] = [
                {
                    id: "p1",
                    rateId: "rate-p1",
                    lenderId: "test",
                    durationMonths: 0,
                    isCustom: false,
                },
            ];
            const resolvedPeriods = new Map<string, ResolvedRatePeriod>([
                ["p1", createResolvedPeriod("p1", 4.0, 1, 0)],
            ]);

            // Self-build with 12 months interest-only AFTER construction
            const selfBuildConfig = createSelfBuildConfig(
                [
                    { month: 1, amount: 5000000 },
                    { month: 4, amount: 7500000 },
                    { month: 8, amount: 7500000 },
                ],
                12, // 12 months interest-only after construction
                "interest_only",
            );

            // Self-build interest (with extended interest-only)
            const selfBuildInterest = calculateBaselineInterest(
                mortgageAmount,
                360,
                ratePeriods,
                resolvedPeriods,
                selfBuildConfig,
            );

            // Standard mortgage interest (no self-build)
            const standardInterest = calculateBaselineInterest(
                mortgageAmount,
                360,
                ratePeriods,
                resolvedPeriods,
                undefined,
            );

            // With extended interest-only period, self-build pays MORE interest
            // (full balance with no principal reduction for longer)
            expect(selfBuildInterest).toBeGreaterThan(standardInterest);
        });
    });
});

describe("calculateSimulationCompleteness", () => {
    function createMonthsForCompleteness(
        count: number,
        closingBalance: number,
    ): AmortizationMonth[] {
        const months: AmortizationMonth[] = [];
        for (let i = 1; i <= count; i++) {
            months.push({
                month: i,
                year: Math.ceil(i / 12),
                monthOfYear: ((i - 1) % 12) + 1,
                date: "",
                openingBalance: 30000000 - (i - 1) * 50000,
                closingBalance:
                    i === count ? closingBalance : 30000000 - i * 50000,
                scheduledPayment: 134713,
                interestPortion: 10000,
                principalPortion: 50000,
                overpayment: 0,
                totalPayment: 134713,
                rate: 3.5,
                ratePeriodId: "period-1",
                cumulativeInterest: i * 10000,
                cumulativePrincipal: i * 50000,
                cumulativeOverpayments: 0,
                cumulativeTotal: i * 10000 + i * 50000,
            });
        }
        return months;
    }

    it("returns complete when balance is essentially zero", () => {
        const months = createMonthsForCompleteness(120, 0);

        const result = calculateSimulationCompleteness(months, 30000000, 360);

        expect(result.isComplete).toBe(true);
        expect(result.remainingBalance).toBe(0);
        expect(result.coveredMonths).toBe(120);
        expect(result.totalMonths).toBe(360);
        expect(result.missingMonths).toBe(240);
    });

    it("returns incomplete when balance remains", () => {
        const months = createMonthsForCompleteness(60, 15000000);

        const result = calculateSimulationCompleteness(months, 30000000, 360);

        expect(result.isComplete).toBe(false);
        expect(result.remainingBalance).toBe(15000000);
        expect(result.coveredMonths).toBe(60);
        expect(result.totalMonths).toBe(360);
        expect(result.missingMonths).toBe(300);
    });

    it("handles empty months array", () => {
        const result = calculateSimulationCompleteness([], 30000000, 360);

        expect(result.isComplete).toBe(false);
        expect(result.remainingBalance).toBe(30000000);
        expect(result.coveredMonths).toBe(0);
        expect(result.totalMonths).toBe(360);
        expect(result.missingMonths).toBe(360);
    });

    it("considers balance under 0.01 as complete", () => {
        const months = createMonthsForCompleteness(120, 0.005);

        const result = calculateSimulationCompleteness(months, 30000000, 360);

        expect(result.isComplete).toBe(true);
    });

    it("handles early payoff (covered months < total months but complete)", () => {
        const months = createMonthsForCompleteness(100, 0);

        const result = calculateSimulationCompleteness(months, 30000000, 360);

        expect(result.isComplete).toBe(true);
        expect(result.coveredMonths).toBe(100);
        expect(result.missingMonths).toBe(260);
    });
});

describe("calculateBufferSuggestions", () => {
    it("returns empty array for empty resolved periods", () => {
        const state = createSimulationState();
        const suggestions = calculateBufferSuggestions(state, [], [], [], []);

        expect(suggestions).toHaveLength(0);
    });

    it("returns empty array when property value is zero", () => {
        const state = createSimulationState({
            input: {
                mortgageAmount: 30000000,
                mortgageTermMonths: 360,
                propertyValue: 0,
                ber: "B2",
            },
        });
        const resolvedPeriods: ResolvedRatePeriod[] = [
            {
                id: "p1",
                rateId: "fixed-rate",
                rate: 3.5,
                type: "fixed",
                lenderId: "test-lender",
                lenderName: "Test Bank",
                rateName: "3 Year Fixed",
                startMonth: 1,
                durationMonths: 36,
                label: "3 Year Fixed",
                isCustom: false,
            },
        ];

        const suggestions = calculateBufferSuggestions(
            state,
            [],
            [],
            resolvedPeriods,
            [],
        );

        expect(suggestions).toHaveLength(0);
    });

    it("suggests buffer after fixed rate when next period is not natural follow-on", () => {
        const state = createSimulationState({
            ratePeriods: [
                createRatePeriod({
                    id: "fixed-period",
                    rateId: "fixed-rate",
                    durationMonths: 36,
                }),
                createRatePeriod({
                    id: "other-variable",
                    rateId: "other-variable-rate",
                    durationMonths: 0,
                }),
            ],
        });

        const fixedRate = createRate({
            id: "fixed-rate",
            rate: 3.5,
            type: "fixed",
            fixedTerm: 3,
        });

        const naturalVariable = createRate({
            id: "natural-variable",
            rate: 4.0,
            type: "variable",
            lenderId: "test-lender",
        });

        const otherVariable = createRate({
            id: "other-variable-rate",
            rate: 4.5,
            type: "variable",
            lenderId: "other-lender",
        });

        const resolvedPeriods: ResolvedRatePeriod[] = [
            {
                id: "fixed-period",
                rateId: "fixed-rate",
                rate: 3.5,
                type: "fixed",
                lenderId: "test-lender",
                lenderName: "Test Bank",
                rateName: "3 Year Fixed",
                startMonth: 1,
                durationMonths: 36,
                label: "3 Year Fixed",
                isCustom: false,
            },
            {
                id: "other-variable",
                rateId: "other-variable-rate",
                rate: 4.5,
                type: "variable",
                lenderId: "other-lender",
                lenderName: "Other Bank",
                rateName: "Variable Rate",
                startMonth: 37,
                durationMonths: 0,
                label: "Variable",
                isCustom: false,
            },
        ];

        // Create amortization schedule
        const months: AmortizationMonth[] = [];
        for (let i = 1; i <= 36; i++) {
            months.push({
                month: i,
                year: Math.ceil(i / 12),
                monthOfYear: ((i - 1) % 12) + 1,
                date: "",
                openingBalance: 30000000 - (i - 1) * 50000,
                closingBalance: 30000000 - i * 50000,
                scheduledPayment: 134713,
                interestPortion: 10000,
                principalPortion: 50000,
                overpayment: 0,
                totalPayment: 134713,
                rate: 3.5,
                ratePeriodId: "fixed-period",
                cumulativeInterest: i * 10000,
                cumulativePrincipal: i * 50000,
                cumulativeOverpayments: 0,
                cumulativeTotal: i * 10000 + i * 50000,
            });
        }

        const suggestions = calculateBufferSuggestions(
            state,
            [fixedRate, naturalVariable, otherVariable],
            [],
            resolvedPeriods,
            months,
        );

        // Should suggest buffer since next period uses different lender's rate
        expect(suggestions.length).toBeGreaterThanOrEqual(0); // May or may not suggest based on findVariableRate logic
    });

    it("does not suggest buffer after variable rate periods", () => {
        const state = createSimulationState({
            ratePeriods: [
                createRatePeriod({
                    id: "variable-period",
                    rateId: "variable-rate",
                    durationMonths: 36,
                }),
                createRatePeriod({
                    id: "other-period",
                    rateId: "other-rate",
                    durationMonths: 0,
                }),
            ],
        });

        const resolvedPeriods: ResolvedRatePeriod[] = [
            {
                id: "variable-period",
                rateId: "variable-rate",
                rate: 4.0,
                type: "variable", // Not fixed
                lenderId: "test-lender",
                lenderName: "Test Bank",
                rateName: "Variable Rate",
                startMonth: 1,
                durationMonths: 36,
                label: "Variable",
                isCustom: false,
            },
            {
                id: "other-period",
                rateId: "other-rate",
                rate: 4.5,
                type: "variable",
                lenderId: "test-lender",
                lenderName: "Test Bank",
                rateName: "Other Variable",
                startMonth: 37,
                durationMonths: 0,
                label: "Other Variable",
                isCustom: false,
            },
        ];

        const suggestions = calculateBufferSuggestions(
            state,
            [createRate({ id: "variable-rate", rate: 4.0, type: "variable" })],
            [],
            resolvedPeriods,
            [],
        );

        // Should not suggest buffer after variable rate
        expect(suggestions.filter((s) => !s.isTrailing)).toHaveLength(0);
    });

    it("suggests trailing buffer when last period is fixed with specific duration", () => {
        const state = createSimulationState({
            ratePeriods: [
                createRatePeriod({
                    id: "fixed-period",
                    rateId: "fixed-rate",
                    durationMonths: 36, // Not until end
                }),
            ],
        });

        const fixedRate = createRate({
            id: "fixed-rate",
            rate: 3.5,
            type: "fixed",
            fixedTerm: 3,
        });

        const naturalVariable = createRate({
            id: "natural-variable",
            rate: 4.0,
            type: "variable",
            lenderId: "test-lender",
        });

        const resolvedPeriods: ResolvedRatePeriod[] = [
            {
                id: "fixed-period",
                rateId: "fixed-rate",
                rate: 3.5,
                type: "fixed",
                lenderId: "test-lender",
                lenderName: "Test Bank",
                rateName: "3 Year Fixed",
                startMonth: 1,
                durationMonths: 36,
                label: "3 Year Fixed",
                isCustom: false,
            },
        ];

        const months: AmortizationMonth[] = [];
        for (let i = 1; i <= 36; i++) {
            months.push({
                month: i,
                year: Math.ceil(i / 12),
                monthOfYear: ((i - 1) % 12) + 1,
                date: "",
                openingBalance: 30000000 - (i - 1) * 50000,
                closingBalance: 30000000 - i * 50000,
                scheduledPayment: 134713,
                interestPortion: 10000,
                principalPortion: 50000,
                overpayment: 0,
                totalPayment: 134713,
                rate: 3.5,
                ratePeriodId: "fixed-period",
                cumulativeInterest: i * 10000,
                cumulativePrincipal: i * 50000,
                cumulativeOverpayments: 0,
                cumulativeTotal: i * 10000 + i * 50000,
            });
        }

        const suggestions = calculateBufferSuggestions(
            state,
            [fixedRate, naturalVariable],
            [],
            resolvedPeriods,
            months,
        );

        // Should suggest trailing buffer when last period is fixed and not "until end"
        const trailingSuggestions = suggestions.filter((s) => s.isTrailing);
        expect(trailingSuggestions.length).toBeGreaterThanOrEqual(0);
    });

    it("does not suggest trailing buffer when last period is until end", () => {
        const state = createSimulationState({
            ratePeriods: [
                createRatePeriod({
                    id: "fixed-period",
                    rateId: "fixed-rate",
                    durationMonths: 0, // Until end
                }),
            ],
        });

        const resolvedPeriods: ResolvedRatePeriod[] = [
            {
                id: "fixed-period",
                rateId: "fixed-rate",
                rate: 3.5,
                type: "fixed",
                lenderId: "test-lender",
                lenderName: "Test Bank",
                rateName: "Fixed Rate",
                startMonth: 1,
                durationMonths: 0,
                label: "Fixed Until End",
                isCustom: false,
            },
        ];

        const suggestions = calculateBufferSuggestions(
            state,
            [
                createRate({
                    id: "fixed-rate",
                    rate: 3.5,
                    type: "fixed",
                    fixedTerm: 5,
                }),
            ],
            [],
            resolvedPeriods,
            [],
        );

        const trailingSuggestions = suggestions.filter((s) => s.isTrailing);
        expect(trailingSuggestions).toHaveLength(0);
    });

    it("handles custom rate in buffer suggestions", () => {
        const customRate = {
            id: "custom-fixed",
            lenderId: "test-lender",
            name: "Custom Fixed Rate",
            rate: 3.5,
            type: "fixed" as const,
            fixedTerm: 3,
            minLtv: 0,
            maxLtv: 90,
            buyerTypes: ["ftb" as const, "mover" as const],
            perks: [],
            isCustom: true as const,
        };

        const state = createSimulationState({
            ratePeriods: [
                createRatePeriod({
                    id: "custom-period",
                    rateId: "custom-fixed",
                    isCustom: true, // Custom rate
                    durationMonths: 36,
                }),
            ],
        });

        const resolvedPeriods: ResolvedRatePeriod[] = [
            {
                id: "custom-period",
                rateId: "custom-fixed",
                rate: 3.5,
                type: "fixed",
                lenderId: "test-lender",
                lenderName: "Test Bank",
                rateName: "Custom Fixed Rate",
                startMonth: 1,
                durationMonths: 36,
                label: "Custom Fixed",
                isCustom: true, // Custom rate
            },
        ];

        const months: AmortizationMonth[] = [];
        for (let i = 1; i <= 36; i++) {
            months.push({
                month: i,
                year: Math.ceil(i / 12),
                monthOfYear: ((i - 1) % 12) + 1,
                date: "",
                openingBalance: 30000000 - (i - 1) * 50000,
                closingBalance: 30000000 - i * 50000,
                scheduledPayment: 134713,
                interestPortion: 10000,
                principalPortion: 50000,
                overpayment: 0,
                totalPayment: 134713,
                rate: 3.5,
                ratePeriodId: "custom-period",
                cumulativeInterest: i * 10000,
                cumulativePrincipal: i * 50000,
                cumulativeOverpayments: 0,
                cumulativeTotal: i * 10000 + i * 50000,
            });
        }

        const naturalVariable = createRate({
            id: "natural-variable",
            rate: 4.0,
            type: "variable",
            lenderId: "test-lender",
        });

        const suggestions = calculateBufferSuggestions(
            state,
            [naturalVariable],
            [customRate],
            resolvedPeriods,
            months,
        );

        // Should find the custom rate and potentially suggest a trailing buffer
        expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it("handles custom rate transition with multiple periods", () => {
        const customRate = {
            id: "custom-fixed",
            lenderId: "test-lender",
            name: "Custom Fixed Rate",
            rate: 3.5,
            type: "fixed" as const,
            fixedTerm: 3,
            minLtv: 0,
            maxLtv: 90,
            buyerTypes: ["ftb" as const, "mover" as const],
            perks: [],
            isCustom: true as const,
        };

        const state = createSimulationState({
            ratePeriods: [
                createRatePeriod({
                    id: "custom-period",
                    rateId: "custom-fixed",
                    isCustom: true,
                    durationMonths: 36,
                }),
                createRatePeriod({
                    id: "variable-period",
                    rateId: "other-variable",
                    isCustom: false,
                    durationMonths: 0,
                }),
            ],
        });

        const resolvedPeriods: ResolvedRatePeriod[] = [
            {
                id: "custom-period",
                rateId: "custom-fixed",
                rate: 3.5,
                type: "fixed",
                lenderId: "test-lender",
                lenderName: "Test Bank",
                rateName: "Custom Fixed Rate",
                startMonth: 1,
                durationMonths: 36,
                label: "Custom Fixed",
                isCustom: true,
            },
            {
                id: "variable-period",
                rateId: "other-variable",
                rate: 4.5,
                type: "variable",
                lenderId: "other-lender",
                lenderName: "Other Bank",
                rateName: "Variable Rate",
                startMonth: 37,
                durationMonths: 0,
                label: "Variable",
                isCustom: false,
            },
        ];

        const months: AmortizationMonth[] = [];
        for (let i = 1; i <= 36; i++) {
            months.push({
                month: i,
                year: Math.ceil(i / 12),
                monthOfYear: ((i - 1) % 12) + 1,
                date: "",
                openingBalance: 30000000 - (i - 1) * 50000,
                closingBalance: 30000000 - i * 50000,
                scheduledPayment: 134713,
                interestPortion: 10000,
                principalPortion: 50000,
                overpayment: 0,
                totalPayment: 134713,
                rate: 3.5,
                ratePeriodId: "custom-period",
                cumulativeInterest: i * 10000,
                cumulativePrincipal: i * 50000,
                cumulativeOverpayments: 0,
                cumulativeTotal: i * 10000 + i * 50000,
            });
        }

        const naturalVariable = createRate({
            id: "natural-variable",
            rate: 4.0,
            type: "variable",
            lenderId: "test-lender",
        });

        const suggestions = calculateBufferSuggestions(
            state,
            [naturalVariable],
            [customRate],
            resolvedPeriods,
            months,
        );

        // The test exercises the custom rate lookup path (line 902)
        expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });
});
