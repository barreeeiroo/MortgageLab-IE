import { describe, expect, it } from "vitest";
import {
    calculateAmortization,
    calculateSimulationCompleteness,
} from "@/lib/mortgage/simulation";
import {
    createLender,
    createOverpaymentConfig,
    createRate,
    createRatePeriod,
    createSimulationState,
} from "./fixtures";

describe("Simulation Completeness Integration Tests", () => {
    describe("complete simulations", () => {
        it("detects complete simulation when balance reaches 0", () => {
            const mortgageAmount = 15000000; // €150k
            const mortgageTermMonths = 180; // 15 years
            const state = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths,
                    propertyValue: 20000000,
                    ber: "B2",
                },
            });
            const rates = [createRate({ rate: 3.5 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);
            const completeness = calculateSimulationCompleteness(
                result.months,
                mortgageAmount,
                mortgageTermMonths,
            );

            expect(completeness.isComplete).toBe(true);
            expect(completeness.remainingBalance).toBeLessThan(1);
            expect(completeness.coveredMonths).toBe(180);
            expect(completeness.totalMonths).toBe(180);
            expect(completeness.missingMonths).toBe(0);
        });

        it("detects early payoff as complete", () => {
            const mortgageAmount = 15000000;
            const mortgageTermMonths = 300; // 25 years
            const state = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths,
                    propertyValue: 20000000,
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
            const completeness = calculateSimulationCompleteness(
                result.months,
                mortgageAmount,
                mortgageTermMonths,
            );

            expect(completeness.isComplete).toBe(true);
            // Early payoff - fewer months than term
            expect(completeness.coveredMonths).toBeLessThan(mortgageTermMonths);
            expect(completeness.remainingBalance).toBeLessThan(1);
        });
    });

    describe("incomplete simulations", () => {
        it("detects incomplete simulation when rate periods end early", () => {
            const mortgageAmount = 20000000; // €200k
            const mortgageTermMonths = 360; // 30 years
            const state = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths,
                    propertyValue: 25000000,
                    ber: "B2",
                },
                ratePeriods: [
                    createRatePeriod({
                        id: "period-1",
                        rateId: "fixed-3yr",
                        durationMonths: 36, // Only 3 years defined
                        // No follow-on period!
                    }),
                ],
            });
            const rates = [
                createRate({
                    id: "fixed-3yr",
                    rate: 3.5,
                    type: "fixed",
                    fixedTerm: 3,
                }),
            ];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);
            const completeness = calculateSimulationCompleteness(
                result.months,
                mortgageAmount,
                mortgageTermMonths,
            );

            expect(completeness.isComplete).toBe(false);
            expect(completeness.coveredMonths).toBe(36);
            expect(completeness.totalMonths).toBe(360);
            expect(completeness.missingMonths).toBe(324); // 360 - 36
            expect(completeness.remainingBalance).toBeGreaterThan(0);
        });

        it("calculates remaining balance for incomplete simulation", () => {
            const mortgageAmount = 30000000; // €300k
            const mortgageTermMonths = 360;
            const state = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths,
                    propertyValue: 35000000,
                    ber: "B2",
                },
                ratePeriods: [
                    createRatePeriod({
                        id: "period-1",
                        rateId: "test-rate",
                        durationMonths: 60, // 5 years only
                    }),
                ],
            });
            const rates = [createRate({ id: "test-rate", rate: 3.5 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);
            const completeness = calculateSimulationCompleteness(
                result.months,
                mortgageAmount,
                mortgageTermMonths,
            );

            // After 5 years at 3.5%, balance should be significantly less than original
            // but still substantial
            expect(completeness.remainingBalance).toBeLessThan(mortgageAmount);
            expect(completeness.remainingBalance).toBeGreaterThan(
                mortgageAmount * 0.7,
            );
        });
    });

    describe("empty simulations", () => {
        it("handles empty months array", () => {
            const mortgageAmount = 20000000;
            const mortgageTermMonths = 240;

            const completeness = calculateSimulationCompleteness(
                [],
                mortgageAmount,
                mortgageTermMonths,
            );

            expect(completeness.isComplete).toBe(false);
            expect(completeness.remainingBalance).toBe(mortgageAmount);
            expect(completeness.coveredMonths).toBe(0);
            expect(completeness.totalMonths).toBe(mortgageTermMonths);
            expect(completeness.missingMonths).toBe(mortgageTermMonths);
        });
    });

    describe("edge cases", () => {
        it("considers balance under 1 cent as complete", () => {
            const mortgageAmount = 10000000; // €100k
            const mortgageTermMonths = 120;
            const state = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths,
                    propertyValue: 15000000,
                    ber: "B2",
                },
            });
            const rates = [createRate({ rate: 3.5 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            // Verify the last month has essentially zero balance
            const lastMonth = result.months[result.months.length - 1];
            expect(lastMonth.closingBalance).toBeLessThan(1);

            const completeness = calculateSimulationCompleteness(
                result.months,
                mortgageAmount,
                mortgageTermMonths,
            );

            expect(completeness.isComplete).toBe(true);
        });

        it("handles simulation with multiple rate periods", () => {
            const mortgageAmount = 25000000;
            const mortgageTermMonths = 300;
            const state = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths,
                    propertyValue: 30000000,
                    ber: "B2",
                },
                ratePeriods: [
                    createRatePeriod({
                        id: "period-1",
                        rateId: "fixed-3yr",
                        durationMonths: 36,
                    }),
                    createRatePeriod({
                        id: "period-2",
                        rateId: "variable",
                        durationMonths: 0, // Until end
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
                createRate({ id: "variable", rate: 3.5, type: "variable" }),
            ];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);
            const completeness = calculateSimulationCompleteness(
                result.months,
                mortgageAmount,
                mortgageTermMonths,
            );

            expect(completeness.isComplete).toBe(true);
            expect(completeness.coveredMonths).toBe(300);
        });

        it("accurately calculates missing months", () => {
            const mortgageAmount = 20000000;
            const mortgageTermMonths = 240;
            const coveredMonths = 84; // 7 years

            const state = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths,
                    propertyValue: 25000000,
                    ber: "B2",
                },
                ratePeriods: [
                    createRatePeriod({
                        id: "period-1",
                        rateId: "test-rate",
                        durationMonths: coveredMonths,
                    }),
                ],
            });
            const rates = [createRate({ id: "test-rate", rate: 3.5 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);
            const completeness = calculateSimulationCompleteness(
                result.months,
                mortgageAmount,
                mortgageTermMonths,
            );

            expect(completeness.coveredMonths).toBe(coveredMonths);
            expect(completeness.missingMonths).toBe(
                mortgageTermMonths - coveredMonths,
            );
        });
    });
});
