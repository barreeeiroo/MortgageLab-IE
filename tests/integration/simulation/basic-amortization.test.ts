import { describe, expect, it } from "vitest";
import { calculateAmortization } from "@/lib/mortgage/simulation";
import { createLender, createRate, createSimulationState } from "./fixtures";

describe("Basic Amortization Integration Tests", () => {
    describe("standard mortgage scenarios", () => {
        it("calculates €300k @ 3.5% for 30 years correctly", () => {
            const state = createSimulationState();
            const rates = [createRate({ rate: 3.5 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            // €300k at 3.5% over 30 years ≈ €1,347/month
            expect(result.months[0].scheduledPayment).toBeCloseTo(134713, -2);
            expect(result.months).toHaveLength(360);
        });

        it("calculates €500k @ 4.0% for 25 years correctly", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 50000000, // €500,000
                    mortgageTermMonths: 300, // 25 years
                    propertyValue: 60000000,
                    ber: "B2",
                },
            });
            const rates = [createRate({ rate: 4.0 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            // €500k at 4.0% over 25 years ≈ €2,639/month
            expect(result.months[0].scheduledPayment).toBeCloseTo(263948, -2);
            expect(result.months).toHaveLength(300);
        });

        it("calculates €400k @ 3.0% for 35 years correctly", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 40000000, // €400,000
                    mortgageTermMonths: 420, // 35 years
                    propertyValue: 50000000,
                    ber: "B2",
                },
            });
            const rates = [createRate({ rate: 3.0 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            // €400k at 3.0% over 35 years ≈ €1,539/month
            expect(result.months[0].scheduledPayment).toBeCloseTo(153940, -2);
            expect(result.months).toHaveLength(420);
        });
    });

    describe("balance reduction", () => {
        it("reduces balance to zero by end of term", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 20000000, // €200k for faster verification
                    mortgageTermMonths: 240, // 20 years
                    propertyValue: 25000000,
                    ber: "B2",
                },
            });
            const rates = [createRate({ rate: 3.5 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            const lastMonth = result.months[result.months.length - 1];
            expect(lastMonth.closingBalance).toBeLessThan(1); // Essentially zero
        });

        it("balance decreases monotonically", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 15000000,
                    mortgageTermMonths: 180,
                    propertyValue: 20000000,
                    ber: "B2",
                },
            });
            const rates = [createRate({ rate: 4.0 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            for (let i = 1; i < result.months.length; i++) {
                expect(result.months[i].openingBalance).toBeLessThan(
                    result.months[i - 1].openingBalance,
                );
            }
        });
    });

    describe("interest vs principal split", () => {
        it("first month has more interest than principal for long-term mortgage", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 30000000, // €300k
                    mortgageTermMonths: 360, // 30 years
                    propertyValue: 35000000,
                    ber: "B2",
                },
            });
            const rates = [createRate({ rate: 4.0 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            const firstMonth = result.months[0];
            expect(firstMonth.interestPortion).toBeGreaterThan(
                firstMonth.principalPortion,
            );
        });

        it("last month has more principal than interest", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 30000000,
                    mortgageTermMonths: 360,
                    propertyValue: 35000000,
                    ber: "B2",
                },
            });
            const rates = [createRate({ rate: 4.0 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            const lastMonth = result.months[result.months.length - 1];
            expect(lastMonth.principalPortion).toBeGreaterThan(
                lastMonth.interestPortion,
            );
        });

        it("interest portion decreases over time", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 20000000,
                    mortgageTermMonths: 240,
                    propertyValue: 25000000,
                    ber: "B2",
                },
            });
            const rates = [createRate({ rate: 3.5 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            // Compare first year to last year
            const firstYearInterest = result.months[0].interestPortion;
            const lastYearInterest =
                result.months[result.months.length - 1].interestPortion;
            expect(lastYearInterest).toBeLessThan(firstYearInterest);
        });
    });

    describe("cumulative totals", () => {
        it("cumulative principal equals original mortgage at end", () => {
            const mortgageAmount = 25000000; // €250k
            const state = createSimulationState({
                input: {
                    mortgageAmount,
                    mortgageTermMonths: 300,
                    propertyValue: 30000000,
                    ber: "B2",
                },
            });
            const rates = [createRate({ rate: 3.5 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            const lastMonth = result.months[result.months.length - 1];
            expect(lastMonth.cumulativePrincipal).toBeCloseTo(
                mortgageAmount,
                -2,
            );
        });

        it("cumulative total equals cumulative interest + principal", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 20000000,
                    mortgageTermMonths: 240,
                    propertyValue: 25000000,
                    ber: "B2",
                },
            });
            const rates = [createRate({ rate: 4.0 })];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            const lastMonth = result.months[result.months.length - 1];
            expect(lastMonth.cumulativeTotal).toBeCloseTo(
                lastMonth.cumulativeInterest + lastMonth.cumulativePrincipal,
                -2,
            );
        });

        it("total interest increases with higher rate", () => {
            const baseState = createSimulationState({
                input: {
                    mortgageAmount: 30000000,
                    mortgageTermMonths: 360,
                    propertyValue: 35000000,
                    ber: "B2",
                },
            });
            const lenders = [createLender()];

            // Calculate with 3.0% rate
            const lowRateResult = calculateAmortization(
                baseState,
                [createRate({ rate: 3.0 })],
                [],
                lenders,
                [],
            );

            // Calculate with 5.0% rate
            const highRateResult = calculateAmortization(
                baseState,
                [createRate({ rate: 5.0 })],
                [],
                lenders,
                [],
            );

            const lowRateInterest =
                lowRateResult.months[lowRateResult.months.length - 1]
                    .cumulativeInterest;
            const highRateInterest =
                highRateResult.months[highRateResult.months.length - 1]
                    .cumulativeInterest;

            expect(highRateInterest).toBeGreaterThan(lowRateInterest);
        });

        it("total interest decreases with shorter term", () => {
            const lenders = [createLender()];
            const rates = [createRate({ rate: 3.5 })];

            // 30-year term
            const longTermState = createSimulationState({
                input: {
                    mortgageAmount: 30000000,
                    mortgageTermMonths: 360,
                    propertyValue: 35000000,
                    ber: "B2",
                },
            });
            const longTermResult = calculateAmortization(
                longTermState,
                rates,
                [],
                lenders,
                [],
            );

            // 20-year term
            const shortTermState = createSimulationState({
                input: {
                    mortgageAmount: 30000000,
                    mortgageTermMonths: 240,
                    propertyValue: 35000000,
                    ber: "B2",
                },
            });
            const shortTermResult = calculateAmortization(
                shortTermState,
                rates,
                [],
                lenders,
                [],
            );

            const longTermInterest =
                longTermResult.months[longTermResult.months.length - 1]
                    .cumulativeInterest;
            const shortTermInterest =
                shortTermResult.months[shortTermResult.months.length - 1]
                    .cumulativeInterest;

            expect(shortTermInterest).toBeLessThan(longTermInterest);
        });
    });

    describe("date handling", () => {
        it("adds correct dates when startDate is provided", () => {
            const state = createSimulationState({
                input: {
                    mortgageAmount: 10000000,
                    mortgageTermMonths: 60,
                    propertyValue: 12000000,
                    startDate: "2025-03-01",
                    ber: "B2",
                },
            });
            const rates = [createRate()];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            expect(result.months[0].date).toBe("2025-03-01");
            expect(result.months[1].date).toBe("2025-04-01");
            expect(result.months[11].date).toBe("2026-02-01"); // One year later
        });

        it("returns empty dates when startDate is not provided", () => {
            const state = createSimulationState();
            const rates = [createRate()];
            const lenders = [createLender()];

            const result = calculateAmortization(state, rates, [], lenders, []);

            expect(result.months[0].date).toBe("");
        });
    });
});
