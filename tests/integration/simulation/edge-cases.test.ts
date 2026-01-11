import { describe, expect, it } from "vitest";
import { calculateAmortization } from "@/lib/mortgage/simulation";
import {
	createLender,
	createOverpaymentConfig,
	createRate,
	createRatePeriod,
	createSimulationState,
} from "./fixtures";

describe("Edge Cases Integration Tests", () => {
	describe("0% interest rate", () => {
		it("calculates equal monthly payments at 0% rate", () => {
			const mortgageAmount = 12000000; // €120,000
			const termMonths = 120; // 10 years
			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: termMonths,
					propertyValue: 15000000,
					ber: "B2",
				},
			});
			const rates = [createRate({ rate: 0 })];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// At 0% interest, monthly payment = principal / months
			const expectedPayment = mortgageAmount / termMonths;
			expect(result.months[0].scheduledPayment).toBeCloseTo(
				expectedPayment,
				-2,
			);
		});

		it("has zero interest portion at 0% rate", () => {
			const state = createSimulationState({
				input: {
					mortgageAmount: 12000000,
					mortgageTermMonths: 120,
					propertyValue: 15000000,
					ber: "B2",
				},
			});
			const rates = [createRate({ rate: 0 })];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Every month should have 0 interest
			for (const month of result.months) {
				expect(month.interestPortion).toBe(0);
			}
		});

		it("total interest is zero at 0% rate", () => {
			const state = createSimulationState({
				input: {
					mortgageAmount: 12000000,
					mortgageTermMonths: 120,
					propertyValue: 15000000,
					ber: "B2",
				},
			});
			const rates = [createRate({ rate: 0 })];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			const lastMonth = result.months[result.months.length - 1];
			expect(lastMonth.cumulativeInterest).toBe(0);
		});
	});

	describe("very high interest rate", () => {
		it("handles 15% interest rate", () => {
			const state = createSimulationState({
				input: {
					mortgageAmount: 20000000, // €200k
					mortgageTermMonths: 300, // 25 years
					propertyValue: 25000000,
					ber: "B2",
				},
			});
			const rates = [createRate({ rate: 15 })];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// At 15%, monthly payment should be high
			// €200k at 15% over 25 years ≈ €2,562/month
			expect(result.months[0].scheduledPayment).toBeCloseTo(256166, -2);

			// Balance should still reach zero
			const lastMonth = result.months[result.months.length - 1];
			expect(lastMonth.closingBalance).toBeLessThan(1);
		});

		it("handles 20% interest rate", () => {
			const state = createSimulationState({
				input: {
					mortgageAmount: 10000000, // €100k
					mortgageTermMonths: 240, // 20 years
					propertyValue: 15000000,
					ber: "B2",
				},
			});
			const rates = [createRate({ rate: 20 })];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Should complete without errors
			expect(result.months.length).toBe(240);
			expect(
				result.months[result.months.length - 1].closingBalance,
			).toBeLessThan(1);
		});
	});

	describe("extended term mortgages", () => {
		it("handles 40-year term", () => {
			const state = createSimulationState({
				input: {
					mortgageAmount: 40000000, // €400k
					mortgageTermMonths: 480, // 40 years
					propertyValue: 50000000,
					ber: "B2",
				},
			});
			const rates = [createRate({ rate: 3.5 })];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			expect(result.months).toHaveLength(480);
			expect(
				result.months[result.months.length - 1].closingBalance,
			).toBeLessThan(1);
		});

		it("handles 35-year term", () => {
			const state = createSimulationState({
				input: {
					mortgageAmount: 35000000, // €350k
					mortgageTermMonths: 420, // 35 years
					propertyValue: 45000000,
					ber: "B2",
				},
			});
			const rates = [createRate({ rate: 4.0 })];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			expect(result.months).toHaveLength(420);
			expect(
				result.months[result.months.length - 1].closingBalance,
			).toBeLessThan(1);
		});
	});

	describe("large property values", () => {
		it("handles €1M+ property", () => {
			const state = createSimulationState({
				input: {
					mortgageAmount: 80000000, // €800k
					mortgageTermMonths: 360,
					propertyValue: 100000000, // €1M
					ber: "B2",
				},
			});
			const rates = [createRate({ rate: 3.5 })];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// €800k at 3.5% over 30 years ≈ €3,592/month
			expect(result.months[0].scheduledPayment).toBeCloseTo(359235, -2);
			expect(result.months).toHaveLength(360);
		});

		it("handles €5M property", () => {
			const state = createSimulationState({
				input: {
					mortgageAmount: 400000000, // €4M mortgage
					mortgageTermMonths: 300, // 25 years
					propertyValue: 500000000, // €5M
					ber: "B2",
				},
			});
			const rates = [createRate({ rate: 3.0 })];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Should handle large amounts correctly
			expect(result.months).toHaveLength(300);
			expect(
				result.months[result.months.length - 1].closingBalance,
			).toBeLessThan(1);
		});
	});

	describe("early redemption during fixed period", () => {
		it("generates warning when mortgage paid off during fixed period", () => {
			const state = createSimulationState({
				input: {
					mortgageAmount: 5000000, // €50,000 small mortgage
					mortgageTermMonths: 60, // 5 years
					propertyValue: 10000000,
					ber: "B2",
				},
				ratePeriods: [
					createRatePeriod({
						id: "fixed-5yr",
						rateId: "rate-fixed",
						durationMonths: 60, // 5-year fixed
					}),
				],
				overpaymentConfigs: [
					createOverpaymentConfig({
						ratePeriodId: "fixed-5yr",
						type: "one_time",
						amount: 5000000, // €50,000 - pays off mortgage
						startMonth: 12,
					}),
				],
			});
			const rates = [
				createRate({
					id: "rate-fixed",
					rate: 3.5,
					type: "fixed",
					fixedTerm: 5,
				}),
			];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Should generate early redemption warning
			const earlyRedemptionWarnings = result.warnings.filter(
				(w) => w.type === "early_redemption",
			);
			expect(earlyRedemptionWarnings.length).toBeGreaterThan(0);
		});
	});

	describe("mortgage paid off before term ends", () => {
		it("handles mortgage paid off early via overpayments", () => {
			const state = createSimulationState({
				input: {
					mortgageAmount: 10000000, // €100k
					mortgageTermMonths: 360, // 30 years
					propertyValue: 15000000,
					ber: "B2",
				},
				overpaymentConfigs: [
					createOverpaymentConfig({
						type: "recurring",
						frequency: "monthly",
						amount: 500000, // €5,000/month
						startMonth: 1,
						endMonth: 360,
						effect: "reduce_term",
					}),
				],
			});
			const rates = [createRate({ rate: 3.5 })];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Mortgage should be paid off much earlier than 360 months
			// €5k/month + regular payment will pay off €100k quickly
			expect(result.months.length).toBeLessThan(60);
			expect(
				result.months[result.months.length - 1].closingBalance,
			).toBeLessThan(1);
		});
	});

	describe("empty or invalid inputs", () => {
		it("returns empty result for zero mortgage amount", () => {
			const state = createSimulationState({
				input: {
					mortgageAmount: 0,
					mortgageTermMonths: 360,
					propertyValue: 35000000,
					ber: "B2",
				},
			});
			const rates = [createRate()];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			expect(result.months).toHaveLength(0);
		});

		it("returns empty result for zero term", () => {
			const state = createSimulationState({
				input: {
					mortgageAmount: 30000000,
					mortgageTermMonths: 0,
					propertyValue: 35000000,
					ber: "B2",
				},
			});
			const rates = [createRate()];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			expect(result.months).toHaveLength(0);
		});

		it("returns empty result for empty rate periods", () => {
			const state = createSimulationState({
				ratePeriods: [],
			});
			const rates = [createRate()];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			expect(result.months).toHaveLength(0);
		});
	});

	describe("short terms", () => {
		it("handles 5-year mortgage correctly", () => {
			const state = createSimulationState({
				input: {
					mortgageAmount: 10000000, // €100k
					mortgageTermMonths: 60, // 5 years
					propertyValue: 15000000,
					ber: "B2",
				},
			});
			const rates = [createRate({ rate: 3.5 })];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			expect(result.months).toHaveLength(60);
			expect(
				result.months[result.months.length - 1].closingBalance,
			).toBeLessThan(1);
		});

		it("handles 1-year mortgage correctly", () => {
			const state = createSimulationState({
				input: {
					mortgageAmount: 2400000, // €24k (€2k/month + interest)
					mortgageTermMonths: 12, // 1 year
					propertyValue: 5000000,
					ber: "B2",
				},
			});
			const rates = [createRate({ rate: 3.5 })];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			expect(result.months).toHaveLength(12);
			expect(
				result.months[result.months.length - 1].closingBalance,
			).toBeLessThan(1);
		});
	});

	describe("very small mortgages", () => {
		it("handles €10,000 mortgage", () => {
			const state = createSimulationState({
				input: {
					mortgageAmount: 1000000, // €10,000
					mortgageTermMonths: 60, // 5 years
					propertyValue: 2000000,
					ber: "B2",
				},
			});
			const rates = [createRate({ rate: 4.0 })];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			expect(result.months).toHaveLength(60);
			expect(
				result.months[result.months.length - 1].closingBalance,
			).toBeLessThan(1);
		});
	});

	describe("precision and rounding", () => {
		it("maintains precision over 30-year term", () => {
			const mortgageAmount = 30000000;
			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 360,
					propertyValue: 35000000,
					ber: "B2",
				},
			});
			const rates = [createRate({ rate: 3.5 })];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			const lastMonth = result.months[result.months.length - 1];

			// Cumulative principal should be very close to original mortgage
			expect(lastMonth.cumulativePrincipal).toBeCloseTo(mortgageAmount, -3);

			// Balance should be essentially zero (allowing for minor rounding)
			expect(Math.abs(lastMonth.closingBalance)).toBeLessThan(100); // Less than €1
		});

		it("payment components sum to total payment each month", () => {
			const state = createSimulationState({
				input: {
					mortgageAmount: 25000000,
					mortgageTermMonths: 300,
					propertyValue: 30000000,
					ber: "B2",
				},
			});
			const rates = [createRate({ rate: 3.5 })];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Check several months
			for (let i = 0; i < Math.min(100, result.months.length); i++) {
				const month = result.months[i];
				const expectedTotal =
					month.interestPortion + month.principalPortion + month.overpayment;
				expect(month.totalPayment).toBeCloseTo(expectedTotal, -2);
			}
		});
	});

	describe("rate boundary values", () => {
		it("handles 0.1% interest rate", () => {
			const state = createSimulationState({
				input: {
					mortgageAmount: 20000000,
					mortgageTermMonths: 240,
					propertyValue: 25000000,
					ber: "B2",
				},
			});
			const rates = [createRate({ rate: 0.1 })];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			expect(result.months).toHaveLength(240);
			expect(
				result.months[result.months.length - 1].closingBalance,
			).toBeLessThan(1);

			// Interest should be very small but non-zero
			expect(result.months[0].interestPortion).toBeGreaterThan(0);
			expect(result.months[0].interestPortion).toBeLessThan(5000); // Less than €50
		});

		it("handles exact 10% interest rate", () => {
			const state = createSimulationState({
				input: {
					mortgageAmount: 20000000,
					mortgageTermMonths: 240,
					propertyValue: 25000000,
					ber: "B2",
				},
			});
			const rates = [createRate({ rate: 10 })];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			expect(result.months).toHaveLength(240);
			expect(
				result.months[result.months.length - 1].closingBalance,
			).toBeLessThan(1);
		});
	});

	describe("single month remaining scenarios", () => {
		it("handles transition to last month correctly", () => {
			const state = createSimulationState({
				input: {
					mortgageAmount: 30000000,
					mortgageTermMonths: 360,
					propertyValue: 35000000,
					ber: "B2",
				},
			});
			const rates = [createRate({ rate: 3.5 })];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			const lastMonth = result.months[result.months.length - 1];
			const secondToLast = result.months[result.months.length - 2];

			// Last month's opening balance should equal second-to-last closing balance
			expect(lastMonth.openingBalance).toBe(secondToLast.closingBalance);

			// Last payment should cover remaining balance
			expect(lastMonth.principalPortion).toBeCloseTo(
				lastMonth.openingBalance,
				-2,
			);
		});
	});
});
