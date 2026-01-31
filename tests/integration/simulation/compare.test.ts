import { describe, expect, it } from "vitest";
import {
    aggregateByYear,
    calculateAmortization,
} from "@/lib/mortgage/simulation";
import {
    computeResolvedRatePeriods,
    computeSummary,
} from "@/lib/stores/simulate/simulate-calculations";
import {
    createLender,
    createOverpaymentConfig,
    createRate,
    createRatePeriod,
    createSimulationState,
} from "./fixtures";

describe("Compare Simulations Integration Tests", () => {
    describe("two complete simulations with same term", () => {
        it("calculates correct metrics for simulations with different rates", () => {
            const mortgageAmount = 25000000; // €250k
            const mortgageTermMonths = 300; // 25 years
            const propertyValue = 30000000;
            const lenders = [createLender()];

            // Simulation 1: 3% rate
            const lowRateState = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths,
                    propertyValue,
                    ber: "B2",
                },
            });
            const lowRates = [createRate({ rate: 3.0 })];
            const lowRateResult = calculateAmortization(
                lowRateState,
                lowRates,
                [],
                lenders,
                [],
            );
            const lowRateResolved = computeResolvedRatePeriods(
                lowRateState.ratePeriods,
                lowRates,
                [],
                lenders,
            );
            const lowRateSummary = computeSummary(
                lowRateResult.months,
                lowRateState.input,
                lowRateState.ratePeriods,
                lowRateResolved,
            );

            // Simulation 2: 5% rate
            const highRateState = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths,
                    propertyValue,
                    ber: "B2",
                },
            });
            const highRates = [createRate({ rate: 5.0 })];
            const highRateResult = calculateAmortization(
                highRateState,
                highRates,
                [],
                lenders,
                [],
            );
            const highRateResolved = computeResolvedRatePeriods(
                highRateState.ratePeriods,
                highRates,
                [],
                lenders,
            );
            const highRateSummary = computeSummary(
                highRateResult.months,
                highRateState.input,
                highRateState.ratePeriods,
                highRateResolved,
            );

            // Lower rate should have less total interest
            expect(lowRateSummary.totalInterest).toBeLessThan(
                highRateSummary.totalInterest,
            );

            // Both should have same actual term (no overpayments)
            expect(lowRateSummary.actualTermMonths).toBe(mortgageTermMonths);
            expect(highRateSummary.actualTermMonths).toBe(mortgageTermMonths);

            // No months saved without overpayments
            expect(lowRateSummary.monthsSaved).toBe(0);
            expect(highRateSummary.monthsSaved).toBe(0);
        });

        it("calculates correct metrics for simulations with and without overpayments", () => {
            const mortgageAmount = 20000000;
            const mortgageTermMonths = 240;
            const propertyValue = 25000000;
            const rates = [createRate({ rate: 3.5, type: "variable" })];
            const lenders = [createLender()];

            // Simulation 1: No overpayments
            const noOverpayState = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths,
                    propertyValue,
                    ber: "B2",
                },
            });
            const noOverpayResult = calculateAmortization(
                noOverpayState,
                rates,
                [],
                lenders,
                [],
            );
            const noOverpayResolved = computeResolvedRatePeriods(
                noOverpayState.ratePeriods,
                rates,
                [],
                lenders,
            );
            const noOverpaySummary = computeSummary(
                noOverpayResult.months,
                noOverpayState.input,
                noOverpayState.ratePeriods,
                noOverpayResolved,
            );

            // Simulation 2: With overpayments
            const withOverpayState = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths,
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
            const withOverpayResult = calculateAmortization(
                withOverpayState,
                rates,
                [],
                lenders,
                [],
            );
            const withOverpayResolved = computeResolvedRatePeriods(
                withOverpayState.ratePeriods,
                rates,
                [],
                lenders,
            );
            const withOverpaySummary = computeSummary(
                withOverpayResult.months,
                withOverpayState.input,
                withOverpayState.ratePeriods,
                withOverpayResolved,
            );

            // With overpayments should pay less interest
            expect(withOverpaySummary.totalInterest).toBeLessThan(
                noOverpaySummary.totalInterest,
            );

            // With overpayments should have shorter actual term
            expect(withOverpaySummary.actualTermMonths).toBeLessThan(
                noOverpaySummary.actualTermMonths,
            );

            // With overpayments should have positive months saved
            expect(withOverpaySummary.monthsSaved).toBeGreaterThan(0);

            // With overpayments should have interest saved
            expect(withOverpaySummary.interestSaved).toBeGreaterThan(0);
        });
    });

    describe("complete and incomplete simulation comparison", () => {
        it("calculates monthsSaved as 0 for incomplete simulation", () => {
            const mortgageAmount = 30000000;
            const mortgageTermMonths = 360;
            const propertyValue = 35000000;
            const lenders = [createLender()];

            // Incomplete simulation: rate period ends at 36 months
            const incompleteState = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths,
                    propertyValue,
                    ber: "B2",
                },
                ratePeriods: [
                    createRatePeriod({
                        id: "period-1",
                        rateId: "fixed-3yr",
                        durationMonths: 36, // Only 3 years defined
                    }),
                ],
            });
            const rates = [
                createRate({
                    id: "fixed-3yr",
                    rate: 3.0,
                    type: "fixed",
                    fixedTerm: 3,
                }),
            ];
            const incompleteResult = calculateAmortization(
                incompleteState,
                rates,
                [],
                lenders,
                [],
            );
            const incompleteResolved = computeResolvedRatePeriods(
                incompleteState.ratePeriods,
                rates,
                [],
                lenders,
            );
            const incompleteSummary = computeSummary(
                incompleteResult.months,
                incompleteState.input,
                incompleteState.ratePeriods,
                incompleteResolved,
            );

            // Incomplete simulation should report 0 months saved
            expect(incompleteSummary.monthsSaved).toBe(0);

            // Actual term should only be 36 months (what was calculated)
            expect(incompleteSummary.actualTermMonths).toBe(36);
        });

        it("calculates correct remaining balance for incomplete simulation", () => {
            const mortgageAmount = 25000000;
            const mortgageTermMonths = 300;
            const propertyValue = 30000000;
            const lenders = [createLender()];

            // 5-year fixed only
            const state = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths,
                    propertyValue,
                    ber: "B2",
                },
                ratePeriods: [
                    createRatePeriod({
                        id: "period-1",
                        rateId: "fixed-5yr",
                        durationMonths: 60,
                    }),
                ],
            });
            const rates = [
                createRate({
                    id: "fixed-5yr",
                    rate: 3.5,
                    type: "fixed",
                    fixedTerm: 5,
                }),
            ];

            const result = calculateAmortization(state, rates, [], lenders, []);

            // Should have 60 months calculated
            expect(result.months.length).toBe(60);

            // Should have remaining balance
            const lastMonth = result.months[result.months.length - 1];
            expect(lastMonth.closingBalance).toBeGreaterThan(0);
        });
    });

    describe("chart data generation for different-length simulations", () => {
        it("generates yearly schedule for both simulations", () => {
            const mortgageAmount = 20000000;
            const propertyValue = 25000000;
            const rates = [createRate({ rate: 3.5, type: "variable" })];
            const lenders = [createLender()];

            // Simulation 1: 20-year term
            const state1 = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths: 240,
                    propertyValue,
                    ber: "B2",
                },
            });
            const result1 = calculateAmortization(
                state1,
                rates,
                [],
                lenders,
                [],
            );
            const yearly1 = aggregateByYear(result1.months);

            // Simulation 2: 25-year term
            const state2 = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths: 300,
                    propertyValue,
                    ber: "B2",
                },
            });
            const result2 = calculateAmortization(
                state2,
                rates,
                [],
                lenders,
                [],
            );
            const yearly2 = aggregateByYear(result2.months);

            // Should have correct number of years
            expect(yearly1.length).toBe(20);
            expect(yearly2.length).toBe(25);

            // Each year should have proper aggregations
            const lastYear1 = yearly1[yearly1.length - 1];
            expect(lastYear1.closingBalance).toBeLessThan(1);
            expect(lastYear1.cumulativeTotal).toBeGreaterThan(mortgageAmount);
        });

        it("handles simulations with different start dates", () => {
            const mortgageAmount = 15000000;
            const mortgageTermMonths = 180;
            const propertyValue = 20000000;
            const rates = [createRate({ rate: 3.5 })];
            const lenders = [createLender()];

            // Simulation 1: Start date 2025-01
            const state1 = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths,
                    propertyValue,
                    ber: "B2",
                    startDate: "2025-01-01",
                },
            });
            const result1 = calculateAmortization(
                state1,
                rates,
                [],
                lenders,
                [],
            );
            const yearly1 = aggregateByYear(result1.months);

            // Simulation 2: Start date 2026-06 (mid-year)
            const state2 = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths,
                    propertyValue,
                    ber: "B2",
                    startDate: "2026-06-01",
                },
            });
            const result2 = calculateAmortization(
                state2,
                rates,
                [],
                lenders,
                [],
            );
            const yearly2 = aggregateByYear(result2.months);

            // First should start in 2025, second in 2026
            expect(yearly1[0].year).toBe(2025);
            expect(yearly2[0].year).toBe(2026);

            // Mid-year start means first "year" has fewer months
            expect(yearly2[0].months.length).toBe(7); // Jun-Dec
        });
    });

    describe("summary metrics best/worst determination", () => {
        it("identifies best and worst for total interest", () => {
            const mortgageAmount = 25000000;
            const mortgageTermMonths = 300;
            const propertyValue = 30000000;
            const lenders = [createLender()];

            // Low rate simulation
            const lowRateResult = calculateAmortization(
                createSimulationState({
                    input: {
                        mortgageAmount,
                        mortgageTermMonths,
                        propertyValue,
                        ber: "B2",
                    },
                }),
                [createRate({ rate: 2.5 })],
                [],
                lenders,
                [],
            );
            const lowRateInterest =
                lowRateResult.months[lowRateResult.months.length - 1]
                    .cumulativeInterest;

            // Medium rate simulation
            const medRateResult = calculateAmortization(
                createSimulationState({
                    input: {
                        mortgageAmount,
                        mortgageTermMonths,
                        propertyValue,
                        ber: "B2",
                    },
                }),
                [createRate({ rate: 3.5 })],
                [],
                lenders,
                [],
            );
            const medRateInterest =
                medRateResult.months[medRateResult.months.length - 1]
                    .cumulativeInterest;

            // High rate simulation
            const highRateResult = calculateAmortization(
                createSimulationState({
                    input: {
                        mortgageAmount,
                        mortgageTermMonths,
                        propertyValue,
                        ber: "B2",
                    },
                }),
                [createRate({ rate: 5.0 })],
                [],
                lenders,
                [],
            );
            const highRateInterest =
                highRateResult.months[highRateResult.months.length - 1]
                    .cumulativeInterest;

            // Lower rate should have lowest interest (best)
            expect(lowRateInterest).toBeLessThan(medRateInterest);
            expect(medRateInterest).toBeLessThan(highRateInterest);
        });

        it("identifies best and worst for months saved with overpayments", () => {
            const mortgageAmount = 20000000;
            const mortgageTermMonths = 240;
            const propertyValue = 25000000;
            const rates = [createRate({ rate: 3.5, type: "variable" })];
            const lenders = [createLender()];

            // No overpayments
            const noOverpayState = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths,
                    propertyValue,
                    ber: "B2",
                },
            });
            const noOverpayResult = calculateAmortization(
                noOverpayState,
                rates,
                [],
                lenders,
                [],
            );
            const noOverpayResolved = computeResolvedRatePeriods(
                noOverpayState.ratePeriods,
                rates,
                [],
                lenders,
            );
            const noOverpaySummary = computeSummary(
                noOverpayResult.months,
                noOverpayState.input,
                noOverpayState.ratePeriods,
                noOverpayResolved,
            );

            // Small overpayments
            const smallOverpayState = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths,
                    propertyValue,
                    ber: "B2",
                },
                overpaymentConfigs: [
                    createOverpaymentConfig({
                        type: "recurring",
                        frequency: "monthly",
                        amount: 25000, // €250/month
                        startMonth: 1,
                        effect: "reduce_term",
                    }),
                ],
            });
            const smallOverpayResult = calculateAmortization(
                smallOverpayState,
                rates,
                [],
                lenders,
                [],
            );
            const smallOverpayResolved = computeResolvedRatePeriods(
                smallOverpayState.ratePeriods,
                rates,
                [],
                lenders,
            );
            const smallOverpaySummary = computeSummary(
                smallOverpayResult.months,
                smallOverpayState.input,
                smallOverpayState.ratePeriods,
                smallOverpayResolved,
            );

            // Large overpayments
            const largeOverpayState = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths,
                    propertyValue,
                    ber: "B2",
                },
                overpaymentConfigs: [
                    createOverpaymentConfig({
                        type: "recurring",
                        frequency: "monthly",
                        amount: 100000, // €1,000/month
                        startMonth: 1,
                        effect: "reduce_term",
                    }),
                ],
            });
            const largeOverpayResult = calculateAmortization(
                largeOverpayState,
                rates,
                [],
                lenders,
                [],
            );
            const largeOverpayResolved = computeResolvedRatePeriods(
                largeOverpayState.ratePeriods,
                rates,
                [],
                lenders,
            );
            const largeOverpaySummary = computeSummary(
                largeOverpayResult.months,
                largeOverpayState.input,
                largeOverpayState.ratePeriods,
                largeOverpayResolved,
            );

            // More overpayments = more months saved (higher is better)
            expect(noOverpaySummary.monthsSaved).toBe(0);
            expect(smallOverpaySummary.monthsSaved).toBeGreaterThan(0);
            expect(largeOverpaySummary.monthsSaved).toBeGreaterThan(
                smallOverpaySummary.monthsSaved,
            );
        });
    });

    describe("edge cases", () => {
        it("handles comparing identical simulations", () => {
            const mortgageAmount = 20000000;
            const mortgageTermMonths = 240;
            const propertyValue = 25000000;
            const rates = [createRate({ rate: 3.5 })];
            const lenders = [createLender()];

            const state = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths,
                    propertyValue,
                    ber: "B2",
                },
            });
            const resolved = computeResolvedRatePeriods(
                state.ratePeriods,
                rates,
                [],
                lenders,
            );

            // Run same simulation twice
            const result1 = calculateAmortization(
                state,
                rates,
                [],
                lenders,
                [],
            );
            const result2 = calculateAmortization(
                state,
                rates,
                [],
                lenders,
                [],
            );

            const summary1 = computeSummary(
                result1.months,
                state.input,
                state.ratePeriods,
                resolved,
            );
            const summary2 = computeSummary(
                result2.months,
                state.input,
                state.ratePeriods,
                resolved,
            );

            // Should have identical metrics
            expect(summary1.totalInterest).toBe(summary2.totalInterest);
            expect(summary1.totalPaid).toBe(summary2.totalPaid);
            expect(summary1.actualTermMonths).toBe(summary2.actualTermMonths);
            expect(summary1.monthsSaved).toBe(summary2.monthsSaved);
            expect(summary1.interestSaved).toBe(summary2.interestSaved);
        });

        it("handles simulation with early payoff vs full term", () => {
            const mortgageAmount = 15000000;
            const mortgageTermMonths = 240;
            const propertyValue = 20000000;
            const rates = [createRate({ rate: 3.5, type: "variable" })];
            const lenders = [createLender()];

            // Full term simulation
            const fullTermState = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths,
                    propertyValue,
                    ber: "B2",
                },
            });
            const fullTermResult = calculateAmortization(
                fullTermState,
                rates,
                [],
                lenders,
                [],
            );
            const fullTermResolved = computeResolvedRatePeriods(
                fullTermState.ratePeriods,
                rates,
                [],
                lenders,
            );
            const fullTermSummary = computeSummary(
                fullTermResult.months,
                fullTermState.input,
                fullTermState.ratePeriods,
                fullTermResolved,
            );

            // Early payoff simulation (aggressive overpayments)
            const earlyPayoffState = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths,
                    propertyValue,
                    ber: "B2",
                },
                overpaymentConfigs: [
                    createOverpaymentConfig({
                        type: "recurring",
                        frequency: "monthly",
                        amount: 200000, // €2,000/month - very aggressive
                        startMonth: 1,
                        effect: "reduce_term",
                    }),
                ],
            });
            const earlyPayoffResult = calculateAmortization(
                earlyPayoffState,
                rates,
                [],
                lenders,
                [],
            );
            const earlyPayoffResolved = computeResolvedRatePeriods(
                earlyPayoffState.ratePeriods,
                rates,
                [],
                lenders,
            );
            const earlyPayoffSummary = computeSummary(
                earlyPayoffResult.months,
                earlyPayoffState.input,
                earlyPayoffState.ratePeriods,
                earlyPayoffResolved,
            );

            // Early payoff should have much shorter term
            expect(earlyPayoffSummary.actualTermMonths).toBeLessThan(
                fullTermSummary.actualTermMonths / 2,
            );

            // Early payoff should save significant months
            expect(earlyPayoffSummary.monthsSaved).toBeGreaterThan(100);

            // Early payoff should save significant interest
            expect(earlyPayoffSummary.interestSaved).toBeGreaterThan(
                fullTermSummary.totalInterest / 2,
            );
        });
    });
});
