import { describe, expect, it } from "vitest";
import { calculateAmortization } from "@/lib/mortgage/simulation";
import {
	createLender,
	createRate,
	createRatePeriod,
	createSimulationState,
} from "./fixtures";

describe("Rate Transitions Integration Tests", () => {
	describe("3-year fixed → variable", () => {
		it("switches rate at the correct month (month 37)", () => {
			const state = createSimulationState({
				ratePeriods: [
					createRatePeriod({
						id: "fixed-3yr",
						rateId: "rate-fixed-3yr",
						durationMonths: 36, // 3-year fixed
					}),
					createRatePeriod({
						id: "variable-after",
						rateId: "rate-variable",
						durationMonths: 0, // Until end
					}),
				],
			});
			const rates = [
				createRate({
					id: "rate-fixed-3yr",
					rate: 3.0,
					type: "fixed",
					fixedTerm: 3,
				}),
				createRate({ id: "rate-variable", rate: 4.5, type: "variable" }),
			];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Month 36 should still be at 3.0%
			expect(result.months[35].rate).toBe(3.0);
			expect(result.months[35].ratePeriodId).toBe("fixed-3yr");

			// Month 37 should be at 4.5%
			expect(result.months[36].rate).toBe(4.5);
			expect(result.months[36].ratePeriodId).toBe("variable-after");
		});

		it("recalculates payment when rate increases", () => {
			const state = createSimulationState({
				ratePeriods: [
					createRatePeriod({
						id: "fixed-3yr",
						rateId: "rate-fixed-3yr",
						durationMonths: 36,
					}),
					createRatePeriod({
						id: "variable-after",
						rateId: "rate-variable",
						durationMonths: 0,
					}),
				],
			});
			const rates = [
				createRate({
					id: "rate-fixed-3yr",
					rate: 3.0,
					type: "fixed",
					fixedTerm: 3,
				}),
				createRate({ id: "rate-variable", rate: 4.5, type: "variable" }),
			];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			const month36Payment = result.months[35].scheduledPayment;
			const month37Payment = result.months[36].scheduledPayment;

			// Payment should increase when rate goes up
			expect(month37Payment).toBeGreaterThan(month36Payment);
		});

		it("recalculates payment when rate decreases", () => {
			const state = createSimulationState({
				ratePeriods: [
					createRatePeriod({
						id: "fixed-3yr",
						rateId: "rate-fixed-3yr",
						durationMonths: 36,
					}),
					createRatePeriod({
						id: "variable-after",
						rateId: "rate-variable",
						durationMonths: 0,
					}),
				],
			});
			const rates = [
				createRate({
					id: "rate-fixed-3yr",
					rate: 4.5,
					type: "fixed",
					fixedTerm: 3,
				}),
				createRate({ id: "rate-variable", rate: 3.0, type: "variable" }),
			];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			const month36Payment = result.months[35].scheduledPayment;
			const month37Payment = result.months[36].scheduledPayment;

			// Payment should decrease when rate goes down
			expect(month37Payment).toBeLessThan(month36Payment);
		});
	});

	describe("3-year fixed → 5-year fixed → variable", () => {
		it("handles multiple rate transitions correctly", () => {
			const state = createSimulationState({
				ratePeriods: [
					createRatePeriod({
						id: "fixed-3yr",
						rateId: "rate-fixed-3yr",
						durationMonths: 36,
					}),
					createRatePeriod({
						id: "fixed-5yr",
						rateId: "rate-fixed-5yr",
						durationMonths: 60,
					}),
					createRatePeriod({
						id: "variable-final",
						rateId: "rate-variable",
						durationMonths: 0,
					}),
				],
			});
			const rates = [
				createRate({
					id: "rate-fixed-3yr",
					rate: 3.0,
					type: "fixed",
					fixedTerm: 3,
				}),
				createRate({
					id: "rate-fixed-5yr",
					rate: 3.5,
					type: "fixed",
					fixedTerm: 5,
				}),
				createRate({ id: "rate-variable", rate: 4.0, type: "variable" }),
			];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Month 36: end of first fixed period
			expect(result.months[35].rate).toBe(3.0);
			expect(result.months[35].ratePeriodId).toBe("fixed-3yr");

			// Month 37: start of second fixed period
			expect(result.months[36].rate).toBe(3.5);
			expect(result.months[36].ratePeriodId).toBe("fixed-5yr");

			// Month 96: end of second fixed period (36 + 60 = 96)
			expect(result.months[95].rate).toBe(3.5);
			expect(result.months[95].ratePeriodId).toBe("fixed-5yr");

			// Month 97: start of variable period
			expect(result.months[96].rate).toBe(4.0);
			expect(result.months[96].ratePeriodId).toBe("variable-final");
		});

		it("payment recalculates at each transition", () => {
			const state = createSimulationState({
				ratePeriods: [
					createRatePeriod({
						id: "fixed-3yr",
						rateId: "rate-fixed-3yr",
						durationMonths: 36,
					}),
					createRatePeriod({
						id: "fixed-5yr",
						rateId: "rate-fixed-5yr",
						durationMonths: 60,
					}),
					createRatePeriod({
						id: "variable-final",
						rateId: "rate-variable",
						durationMonths: 0,
					}),
				],
			});
			const rates = [
				createRate({
					id: "rate-fixed-3yr",
					rate: 3.0,
					type: "fixed",
					fixedTerm: 3,
				}),
				createRate({
					id: "rate-fixed-5yr",
					rate: 4.0,
					type: "fixed",
					fixedTerm: 5,
				}),
				createRate({ id: "rate-variable", rate: 3.5, type: "variable" }),
			];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			const firstPeriodPayment = result.months[0].scheduledPayment;
			const secondPeriodPayment = result.months[36].scheduledPayment;
			const thirdPeriodPayment = result.months[96].scheduledPayment;

			// Second period (4.0%) should have higher payment than first (3.0%)
			expect(secondPeriodPayment).toBeGreaterThan(firstPeriodPayment);

			// Third period (3.5%) should have lower payment than second (4.0%)
			expect(thirdPeriodPayment).toBeLessThan(secondPeriodPayment);
		});
	});

	describe("short fixed periods", () => {
		it("handles 1-year fixed correctly", () => {
			const state = createSimulationState({
				ratePeriods: [
					createRatePeriod({
						id: "fixed-1yr",
						rateId: "rate-fixed-1yr",
						durationMonths: 12,
					}),
					createRatePeriod({
						id: "variable-after",
						rateId: "rate-variable",
						durationMonths: 0,
					}),
				],
			});
			const rates = [
				createRate({
					id: "rate-fixed-1yr",
					rate: 2.5,
					type: "fixed",
					fixedTerm: 1,
				}),
				createRate({ id: "rate-variable", rate: 4.0, type: "variable" }),
			];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Month 12 should still be at 2.5%
			expect(result.months[11].rate).toBe(2.5);

			// Month 13 should be at 4.0%
			expect(result.months[12].rate).toBe(4.0);
		});

		it("handles 2-year fixed correctly", () => {
			const state = createSimulationState({
				ratePeriods: [
					createRatePeriod({
						id: "fixed-2yr",
						rateId: "rate-fixed-2yr",
						durationMonths: 24,
					}),
					createRatePeriod({
						id: "variable-after",
						rateId: "rate-variable",
						durationMonths: 0,
					}),
				],
			});
			const rates = [
				createRate({
					id: "rate-fixed-2yr",
					rate: 2.8,
					type: "fixed",
					fixedTerm: 2,
				}),
				createRate({ id: "rate-variable", rate: 4.0, type: "variable" }),
			];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			expect(result.months[23].rate).toBe(2.8);
			expect(result.months[24].rate).toBe(4.0);
		});
	});

	describe("variable-only scenarios", () => {
		it("handles single variable rate for entire term", () => {
			const state = createSimulationState({
				ratePeriods: [
					createRatePeriod({
						id: "variable",
						rateId: "rate-variable",
						durationMonths: 0, // Until end
					}),
				],
			});
			const rates = [
				createRate({ id: "rate-variable", rate: 4.0, type: "variable" }),
			];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// All months should have the same rate
			for (const month of result.months) {
				expect(month.rate).toBe(4.0);
				expect(month.ratePeriodId).toBe("variable");
			}
		});

		it("handles variable → different variable transition", () => {
			const state = createSimulationState({
				ratePeriods: [
					createRatePeriod({
						id: "variable-1",
						rateId: "rate-variable-1",
						durationMonths: 60, // 5 years
					}),
					createRatePeriod({
						id: "variable-2",
						rateId: "rate-variable-2",
						durationMonths: 0,
					}),
				],
			});
			const rates = [
				createRate({ id: "rate-variable-1", rate: 3.5, type: "variable" }),
				createRate({ id: "rate-variable-2", rate: 4.5, type: "variable" }),
			];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			expect(result.months[59].rate).toBe(3.5);
			expect(result.months[60].rate).toBe(4.5);
		});
	});

	describe("payment consistency during rate periods", () => {
		it("payment stays constant within a fixed rate period", () => {
			const state = createSimulationState({
				ratePeriods: [
					createRatePeriod({
						id: "fixed-5yr",
						rateId: "rate-fixed-5yr",
						durationMonths: 60,
					}),
					createRatePeriod({
						id: "variable-after",
						rateId: "rate-variable",
						durationMonths: 0,
					}),
				],
			});
			const rates = [
				createRate({
					id: "rate-fixed-5yr",
					rate: 3.5,
					type: "fixed",
					fixedTerm: 5,
				}),
				createRate({ id: "rate-variable", rate: 4.5, type: "variable" }),
			];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// All payments in fixed period should be the same
			const firstPayment = result.months[0].scheduledPayment;
			for (let i = 1; i < 60; i++) {
				expect(result.months[i].scheduledPayment).toBeCloseTo(firstPayment, -2);
			}
		});

		it("payment stays constant within a variable rate period", () => {
			const state = createSimulationState({
				ratePeriods: [
					createRatePeriod({
						id: "fixed-3yr",
						rateId: "rate-fixed-3yr",
						durationMonths: 36,
					}),
					createRatePeriod({
						id: "variable-after",
						rateId: "rate-variable",
						durationMonths: 0,
					}),
				],
			});
			const rates = [
				createRate({
					id: "rate-fixed-3yr",
					rate: 3.0,
					type: "fixed",
					fixedTerm: 3,
				}),
				createRate({ id: "rate-variable", rate: 4.0, type: "variable" }),
			];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// All payments in variable period should be the same (no overpayments)
			const variableStartPayment = result.months[36].scheduledPayment;
			for (let i = 37; i < result.months.length; i++) {
				expect(result.months[i].scheduledPayment).toBeCloseTo(
					variableStartPayment,
					-2,
				);
			}
		});
	});

	describe("balance at transition", () => {
		it("uses remaining balance for payment recalculation", () => {
			const state = createSimulationState({
				input: {
					mortgageAmount: 30000000,
					mortgageTermMonths: 360,
					propertyValue: 35000000,
					ber: "B2",
				},
				ratePeriods: [
					createRatePeriod({
						id: "fixed-3yr",
						rateId: "rate-fixed-3yr",
						durationMonths: 36,
					}),
					createRatePeriod({
						id: "variable-after",
						rateId: "rate-variable",
						durationMonths: 0,
					}),
				],
			});
			const rates = [
				createRate({
					id: "rate-fixed-3yr",
					rate: 3.0,
					type: "fixed",
					fixedTerm: 3,
				}),
				createRate({ id: "rate-variable", rate: 3.0, type: "variable" }), // Same rate
			];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// When rate stays the same, payment should still be recalculated
			// based on remaining balance and remaining term
			const month36Balance = result.months[35].closingBalance;
			const month37Payment = result.months[36].scheduledPayment;

			// Verify the balance has been reduced after 3 years
			expect(month36Balance).toBeLessThan(30000000);
			expect(month36Balance).toBeGreaterThan(25000000);

			// The payment for month 37 should be based on remaining balance and term
			expect(month37Payment).toBeGreaterThan(0);
		});
	});
});
