import { describe, expect, it } from "vitest";
import {
    calculateAmortization,
    calculateMilestones,
} from "@/lib/mortgage/simulation";
import type { SelfBuildConfig } from "@/lib/schemas/simulate";
import {
    createLender,
    createOverpaymentConfig,
    createRate,
    createSimulationState,
} from "./fixtures";

/**
 * Helper to create a self-build config with staged drawdowns.
 */
function createSelfBuildConfig(
    mortgageAmount: number,
    overrides: Partial<SelfBuildConfig> = {},
): SelfBuildConfig {
    const defaultStages = [
        { id: "d1", month: 1, amount: mortgageAmount * 0.25, label: "Site" },
        {
            id: "d2",
            month: 4,
            amount: mortgageAmount * 0.35,
            label: "Roof Level",
        },
        {
            id: "d3",
            month: 8,
            amount: mortgageAmount * 0.4,
            label: "Completion",
        },
    ];

    return {
        enabled: true,
        constructionRepaymentType: "interest_only",
        interestOnlyMonths: 0,
        drawdownStages: defaultStages,
        ...overrides,
    };
}

describe("Milestone Calculation Integration Tests", () => {
    describe("standard mortgage milestones", () => {
        it("includes mortgage_start milestone at month 1", () => {
            const mortgageAmount = 30000000; // €300k
            const propertyValue = 35000000; // €350k
            const state = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths: 360,
                    propertyValue,
                    ber: "B2",
                    startDate: "2025-01-01",
                },
            });
            const rates = [createRate({ rate: 3.5 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);
            const milestones = calculateMilestones(
                result.months,
                mortgageAmount,
                propertyValue,
                "2025-01-01",
            );

            const startMilestone = milestones.find(
                (m) => m.type === "mortgage_start",
            );
            expect(startMilestone).toBeDefined();
            expect(startMilestone?.month).toBe(1);
            expect(startMilestone?.date).toBe("2025-01-01");
            expect(startMilestone?.value).toBe(mortgageAmount);
        });

        it("calculates 25% paid off milestone", () => {
            const mortgageAmount = 20000000; // €200k (shorter for faster test)
            const propertyValue = 25000000;
            const state = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths: 240, // 20 years
                    propertyValue,
                    ber: "B2",
                    startDate: "2025-01-01",
                },
            });
            const rates = [createRate({ rate: 3.5 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);
            const milestones = calculateMilestones(
                result.months,
                mortgageAmount,
                propertyValue,
                "2025-01-01",
            );

            const milestone25 = milestones.find(
                (m) => m.type === "principal_25_percent",
            );
            expect(milestone25).toBeDefined();
            expect(milestone25?.label).toBe("25% Paid Off");
            // Balance should be at or below 75% of original
            expect(milestone25?.value).toBeLessThanOrEqual(
                mortgageAmount * 0.75,
            );
        });

        it("calculates 50% paid off milestone", () => {
            const mortgageAmount = 20000000;
            const propertyValue = 25000000;
            const state = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths: 240,
                    propertyValue,
                    ber: "B2",
                },
            });
            const rates = [createRate({ rate: 3.5 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);
            const milestones = calculateMilestones(
                result.months,
                mortgageAmount,
                propertyValue,
                undefined,
            );

            const milestone50 = milestones.find(
                (m) => m.type === "principal_50_percent",
            );
            expect(milestone50).toBeDefined();
            // 50% milestone should come after 25%
            const milestone25 = milestones.find(
                (m) => m.type === "principal_25_percent",
            );
            expect(milestone25).toBeDefined();
            expect(milestone50?.month).toBeGreaterThan(milestone25?.month ?? 0);
        });

        it("calculates 75% paid off milestone", () => {
            const mortgageAmount = 15000000; // €150k
            const propertyValue = 20000000;
            const state = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths: 180, // 15 years
                    propertyValue,
                    ber: "B2",
                },
            });
            const rates = [createRate({ rate: 3.0 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);
            const milestones = calculateMilestones(
                result.months,
                mortgageAmount,
                propertyValue,
                undefined,
            );

            const milestone75 = milestones.find(
                (m) => m.type === "principal_75_percent",
            );
            expect(milestone75).toBeDefined();
            // Balance should be at or below 25% of original
            expect(milestone75?.value).toBeLessThanOrEqual(
                mortgageAmount * 0.25,
            );
        });

        it("includes mortgage_complete milestone when paid off", () => {
            const mortgageAmount = 10000000; // €100k for faster test
            const propertyValue = 15000000;
            const state = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths: 120, // 10 years
                    propertyValue,
                    ber: "B2",
                    startDate: "2025-06-01",
                },
            });
            const rates = [createRate({ rate: 3.5 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);
            const milestones = calculateMilestones(
                result.months,
                mortgageAmount,
                propertyValue,
                "2025-06-01",
            );

            const completeMilestone = milestones.find(
                (m) => m.type === "mortgage_complete",
            );
            expect(completeMilestone).toBeDefined();
            expect(completeMilestone?.month).toBe(120);
            expect(completeMilestone?.value).toBe(0);
        });

        it("returns milestones in chronological order", () => {
            const mortgageAmount = 15000000;
            const propertyValue = 20000000;
            const state = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths: 180,
                    propertyValue,
                    ber: "B2",
                },
            });
            const rates = [createRate({ rate: 3.5 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);
            const milestones = calculateMilestones(
                result.months,
                mortgageAmount,
                propertyValue,
                undefined,
            );

            // Verify order: start, 25%, 50%, 75%, complete
            const types = milestones.map((m) => m.type);
            expect(types).toEqual([
                "mortgage_start",
                "principal_25_percent",
                "principal_50_percent",
                "principal_75_percent",
                "mortgage_complete",
            ]);

            // Verify months are ascending
            for (let i = 1; i < milestones.length; i++) {
                expect(milestones[i].month).toBeGreaterThanOrEqual(
                    milestones[i - 1].month,
                );
            }
        });
    });

    describe("LTV 80% milestone", () => {
        it("includes LTV 80% milestone when starting above 80% LTV", () => {
            const mortgageAmount = 27000000; // €270k
            const propertyValue = 30000000; // €300k → 90% LTV
            const state = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths: 300,
                    propertyValue,
                    ber: "B2",
                },
            });
            const rates = [createRate({ rate: 3.5 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);
            const milestones = calculateMilestones(
                result.months,
                mortgageAmount,
                propertyValue,
                undefined,
            );

            const ltv80Milestone = milestones.find(
                (m) => m.type === "ltv_80_percent",
            );
            expect(ltv80Milestone).toBeDefined();
            expect(ltv80Milestone?.label).toBe("LTV Below 80%");
            // Balance should be at or below 80% of property value
            expect(ltv80Milestone?.value).toBeLessThanOrEqual(
                propertyValue * 0.8,
            );
        });

        it("excludes LTV 80% milestone when starting below 80% LTV", () => {
            const mortgageAmount = 20000000; // €200k
            const propertyValue = 30000000; // €300k → 67% LTV
            const state = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths: 240,
                    propertyValue,
                    ber: "B2",
                },
            });
            const rates = [createRate({ rate: 3.5 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);
            const milestones = calculateMilestones(
                result.months,
                mortgageAmount,
                propertyValue,
                undefined,
            );

            const ltv80Milestone = milestones.find(
                (m) => m.type === "ltv_80_percent",
            );
            expect(ltv80Milestone).toBeUndefined();
        });
    });

    describe("early payoff milestones", () => {
        it("shows fewer milestones when overpayments cause early payoff", () => {
            const mortgageAmount = 15000000; // €150k
            const propertyValue = 20000000;
            const state = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths: 300,
                    propertyValue,
                    ber: "B2",
                },
                overpaymentConfigs: [
                    createOverpaymentConfig({
                        type: "recurring",
                        frequency: "monthly",
                        amount: 100000, // €1,000/month extra
                        startMonth: 1,
                        effect: "reduce_term",
                    }),
                ],
            });
            const rates = [createRate({ rate: 3.5, type: "variable" })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);
            const milestones = calculateMilestones(
                result.months,
                mortgageAmount,
                propertyValue,
                undefined,
            );

            // Should still have all milestones (paid off much faster)
            expect(
                milestones.find((m) => m.type === "mortgage_complete"),
            ).toBeDefined();

            // The mortgage_complete should be much earlier than 300 months
            const completeMilestone = milestones.find(
                (m) => m.type === "mortgage_complete",
            );
            expect(completeMilestone).toBeDefined();
            expect(completeMilestone?.month).toBeLessThan(200);
        });

        it("calculates earlier milestones with large overpayments", () => {
            const mortgageAmount = 20000000; // €200k
            const propertyValue = 25000000;

            // Without overpayments
            const stateNoOverpay = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths: 240,
                    propertyValue,
                    ber: "B2",
                },
            });
            const rates = [createRate({ rate: 3.5, type: "variable" })];
            const lenders = [createLender()];

            const resultNoOverpay = calculateAmortization(
                stateNoOverpay,
                rates,
                [],
                lenders,
                [],
            );
            const milestonesNoOverpay = calculateMilestones(
                resultNoOverpay.months,
                mortgageAmount,
                propertyValue,
                undefined,
            );

            // With overpayments
            const stateWithOverpay = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths: 240,
                    propertyValue,
                    ber: "B2",
                },
                overpaymentConfigs: [
                    createOverpaymentConfig({
                        type: "recurring",
                        frequency: "monthly",
                        amount: 50000, // €500/month extra
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
            const milestonesWithOverpay = calculateMilestones(
                resultWithOverpay.months,
                mortgageAmount,
                propertyValue,
                undefined,
            );

            // 25% milestone should be reached earlier with overpayments
            const noOverpay25 = milestonesNoOverpay.find(
                (m) => m.type === "principal_25_percent",
            );
            const withOverpay25 = milestonesWithOverpay.find(
                (m) => m.type === "principal_25_percent",
            );
            expect(noOverpay25).toBeDefined();
            expect(withOverpay25).toBeDefined();
            expect(withOverpay25?.month).toBeLessThan(noOverpay25?.month ?? 0);
        });
    });

    describe("self-build milestones", () => {
        it("includes construction_complete milestone", () => {
            const mortgageAmount = 30000000; // €300k
            const propertyValue = 40000000;
            const selfBuildConfig = createSelfBuildConfig(mortgageAmount);

            const state = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths: 360,
                    propertyValue,
                    ber: "B2",
                    startDate: "2025-01-01",
                },
                selfBuildConfig,
            });
            const rates = [createRate({ rate: 3.5 })];
            const lenders = [createLender({ allowsSelfBuild: true })];

            const result = calculateAmortization(state, rates, [], lenders, []);
            const milestones = calculateMilestones(
                result.months,
                mortgageAmount,
                propertyValue,
                "2025-01-01",
                selfBuildConfig,
            );

            const constructionComplete = milestones.find(
                (m) => m.type === "construction_complete",
            );
            expect(constructionComplete).toBeDefined();
            expect(constructionComplete?.month).toBe(8); // Final drawdown at month 8
            expect(constructionComplete?.label).toBe("Construction Complete");
        });

        it("includes full_payments_start milestone when interest-only extends past construction", () => {
            const mortgageAmount = 30000000;
            const propertyValue = 40000000;
            const selfBuildConfig = createSelfBuildConfig(mortgageAmount, {
                interestOnlyMonths: 6, // 6 months interest-only after construction
            });

            const state = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths: 360,
                    propertyValue,
                    ber: "B2",
                    startDate: "2025-01-01",
                },
                selfBuildConfig,
            });
            const rates = [createRate({ rate: 3.5 })];
            const lenders = [createLender({ allowsSelfBuild: true })];

            const result = calculateAmortization(state, rates, [], lenders, []);
            const milestones = calculateMilestones(
                result.months,
                mortgageAmount,
                propertyValue,
                "2025-01-01",
                selfBuildConfig,
            );

            const fullPaymentsStart = milestones.find(
                (m) => m.type === "full_payments_start",
            );
            expect(fullPaymentsStart).toBeDefined();
            // Construction ends at month 8, interest-only ends at 8+6=14
            // Full payments start at month 15
            expect(fullPaymentsStart?.month).toBe(15);
            expect(fullPaymentsStart?.label).toBe("Full Payments Start");
        });

        it("excludes full_payments_start when no extra interest-only period", () => {
            const mortgageAmount = 30000000;
            const propertyValue = 40000000;
            const selfBuildConfig = createSelfBuildConfig(mortgageAmount, {
                interestOnlyMonths: 0, // No extra interest-only
            });

            const state = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths: 360,
                    propertyValue,
                    ber: "B2",
                },
                selfBuildConfig,
            });
            const rates = [createRate({ rate: 3.5 })];
            const lenders = [createLender({ allowsSelfBuild: true })];

            const result = calculateAmortization(state, rates, [], lenders, []);
            const milestones = calculateMilestones(
                result.months,
                mortgageAmount,
                propertyValue,
                undefined,
                selfBuildConfig,
            );

            const fullPaymentsStart = milestones.find(
                (m) => m.type === "full_payments_start",
            );
            expect(fullPaymentsStart).toBeUndefined();
        });

        it("hides construction milestones when drawdowns are incomplete", () => {
            const mortgageAmount = 30000000;
            const propertyValue = 40000000;
            // Drawdowns only total 50% of mortgage amount
            const incompleteConfig: SelfBuildConfig = {
                enabled: true,
                constructionRepaymentType: "interest_only",
                interestOnlyMonths: 0,
                drawdownStages: [
                    { id: "d1", month: 1, amount: mortgageAmount * 0.25 },
                    { id: "d2", month: 4, amount: mortgageAmount * 0.25 },
                    // Missing remaining 50%
                ],
            };

            const state = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths: 360,
                    propertyValue,
                    ber: "B2",
                },
                selfBuildConfig: incompleteConfig,
            });
            const rates = [createRate({ rate: 3.5 })];
            const lenders = [createLender({ allowsSelfBuild: true })];

            const result = calculateAmortization(state, rates, [], lenders, []);
            const milestones = calculateMilestones(
                result.months,
                mortgageAmount,
                propertyValue,
                undefined,
                incompleteConfig,
            );

            // Construction milestones should be hidden
            expect(
                milestones.find((m) => m.type === "construction_complete"),
            ).toBeUndefined();
            expect(
                milestones.find((m) => m.type === "full_payments_start"),
            ).toBeUndefined();
        });

        it("delays principal milestones until after interest-only period", () => {
            const mortgageAmount = 30000000;
            const propertyValue = 40000000;
            const selfBuildConfig = createSelfBuildConfig(mortgageAmount, {
                interestOnlyMonths: 6,
            });

            const state = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths: 360,
                    propertyValue,
                    ber: "B2",
                },
                selfBuildConfig,
            });
            const rates = [createRate({ rate: 3.5 })];
            const lenders = [createLender({ allowsSelfBuild: true })];

            const result = calculateAmortization(state, rates, [], lenders, []);
            const milestones = calculateMilestones(
                result.months,
                mortgageAmount,
                propertyValue,
                undefined,
                selfBuildConfig,
            );

            // Interest-only ends at month 14 (8 + 6)
            const interestOnlyEnd = 14;

            // 25% milestone should come after interest-only period
            const milestone25 = milestones.find(
                (m) => m.type === "principal_25_percent",
            );
            expect(milestone25).toBeDefined();
            expect(milestone25?.month).toBeGreaterThan(interestOnlyEnd);
        });

        it("uses initial drawdown amount as mortgage_start value", () => {
            const mortgageAmount = 30000000;
            const propertyValue = 40000000;
            const selfBuildConfig = createSelfBuildConfig(mortgageAmount);

            const state = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths: 360,
                    propertyValue,
                    ber: "B2",
                },
                selfBuildConfig,
            });
            const rates = [createRate({ rate: 3.5 })];
            const lenders = [createLender({ allowsSelfBuild: true })];

            const result = calculateAmortization(state, rates, [], lenders, []);
            const milestones = calculateMilestones(
                result.months,
                mortgageAmount,
                propertyValue,
                undefined,
                selfBuildConfig,
            );

            const startMilestone = milestones.find(
                (m) => m.type === "mortgage_start",
            );
            // Value should be first drawdown (25% of mortgage)
            expect(startMilestone?.value).toBe(mortgageAmount * 0.25);
        });
    });

    describe("edge cases", () => {
        it("returns empty array for empty months", () => {
            const milestones = calculateMilestones(
                [],
                30000000,
                35000000,
                undefined,
            );
            expect(milestones).toEqual([]);
        });

        it("handles dates correctly without startDate", () => {
            const mortgageAmount = 10000000;
            const propertyValue = 15000000;
            const state = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths: 120,
                    propertyValue,
                    ber: "B2",
                    // No startDate
                },
            });
            const rates = [createRate({ rate: 3.5 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);
            const milestones = calculateMilestones(
                result.months,
                mortgageAmount,
                propertyValue,
                undefined,
            );

            // Milestone dates should be empty strings
            expect(milestones[0].date).toBe("");
        });
    });
});
