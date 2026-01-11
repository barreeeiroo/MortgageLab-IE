import { describe, expect, it } from "vitest";
import { calculateAmortization } from "@/lib/mortgage/simulation";
import {
	createLender,
	createOverpaymentConfig,
	createRate,
	createRatePeriod,
	createSimulationState,
} from "./fixtures";

describe("Overpayments Integration Tests", () => {
	describe("one-time overpayments", () => {
		it("applies lump sum at the specified month", () => {
			const state = createSimulationState({
				overpaymentConfigs: [
					createOverpaymentConfig({
						type: "one_time",
						amount: 1000000, // €10,000
						startMonth: 24,
					}),
				],
			});
			const rates = [createRate()];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Month 24 should have the overpayment
			expect(result.months[23].overpayment).toBe(1000000);

			// Other months should have no overpayment
			expect(result.months[22].overpayment).toBe(0);
			expect(result.months[24].overpayment).toBe(0);
		});

		it("reduces balance immediately after overpayment", () => {
			const state = createSimulationState({
				overpaymentConfigs: [
					createOverpaymentConfig({
						type: "one_time",
						amount: 2000000, // €20,000
						startMonth: 12,
					}),
				],
			});
			const rates = [createRate()];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Calculate expected balance drop
			const balanceBeforeOverpayment = result.months[10].closingBalance; // Month 11
			const balanceAfterOverpayment = result.months[11].closingBalance; // Month 12

			// Balance should drop by approximately the overpayment + regular principal
			const principalPaid = result.months[11].principalPortion;
			expect(balanceAfterOverpayment).toBeCloseTo(
				balanceBeforeOverpayment - principalPaid - 2000000,
				-2,
			);
		});

		it("shortens mortgage term with reduce_term effect", () => {
			// Baseline without overpayment
			const baselineState = createSimulationState();
			const rates = [createRate()];
			const lenders = [createLender()];
			const baselineResult = calculateAmortization(
				baselineState,
				rates,
				[],
				lenders,
				[],
			);

			// With overpayment
			const overpaymentState = createSimulationState({
				overpaymentConfigs: [
					createOverpaymentConfig({
						type: "one_time",
						amount: 5000000, // €50,000
						startMonth: 12,
						effect: "reduce_term",
					}),
				],
			});
			const overpaymentResult = calculateAmortization(
				overpaymentState,
				rates,
				[],
				lenders,
				[],
			);

			// Overpayment should result in fewer months
			expect(overpaymentResult.months.length).toBeLessThan(
				baselineResult.months.length,
			);
		});

		it("handles multiple one-time overpayments", () => {
			const state = createSimulationState({
				overpaymentConfigs: [
					createOverpaymentConfig({
						id: "lump-1",
						type: "one_time",
						amount: 500000, // €5,000
						startMonth: 12,
					}),
					createOverpaymentConfig({
						id: "lump-2",
						type: "one_time",
						amount: 1000000, // €10,000
						startMonth: 24,
					}),
					createOverpaymentConfig({
						id: "lump-3",
						type: "one_time",
						amount: 1500000, // €15,000
						startMonth: 36,
					}),
				],
			});
			const rates = [createRate()];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			expect(result.months[11].overpayment).toBe(500000);
			expect(result.months[23].overpayment).toBe(1000000);
			expect(result.months[35].overpayment).toBe(1500000);
		});
	});

	describe("recurring monthly overpayments", () => {
		it("applies monthly overpayment over specified range", () => {
			const state = createSimulationState({
				overpaymentConfigs: [
					createOverpaymentConfig({
						type: "recurring",
						frequency: "monthly",
						amount: 50000, // €500/month
						startMonth: 1,
						endMonth: 24,
					}),
				],
			});
			const rates = [createRate()];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Months 1-24 should have €500 overpayment
			for (let i = 0; i < 24; i++) {
				expect(result.months[i].overpayment).toBe(50000);
			}

			// Month 25 should have no overpayment
			expect(result.months[24].overpayment).toBe(0);
		});

		it("significantly reduces mortgage term with consistent overpayments", () => {
			// Baseline
			const baselineState = createSimulationState();
			const rates = [createRate()];
			const lenders = [createLender()];
			const baselineResult = calculateAmortization(
				baselineState,
				rates,
				[],
				lenders,
				[],
			);

			// With €500/month overpayment for full term
			const overpaymentState = createSimulationState({
				overpaymentConfigs: [
					createOverpaymentConfig({
						type: "recurring",
						frequency: "monthly",
						amount: 50000, // €500/month
						startMonth: 1,
						endMonth: 360, // Full term
						effect: "reduce_term",
					}),
				],
			});
			const overpaymentResult = calculateAmortization(
				overpaymentState,
				rates,
				[],
				lenders,
				[],
			);

			// Should save many years (€500/month on €300k mortgage)
			expect(overpaymentResult.months.length).toBeLessThan(
				baselineResult.months.length - 60,
			);
		});
	});

	describe("recurring quarterly overpayments", () => {
		it("applies overpayment every 3 months from start", () => {
			const state = createSimulationState({
				overpaymentConfigs: [
					createOverpaymentConfig({
						type: "recurring",
						frequency: "quarterly",
						amount: 200000, // €2,000/quarter
						startMonth: 3, // First at month 3
						endMonth: 12, // Last at month 12
					}),
				],
			});
			const rates = [createRate()];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Should apply at months 3, 6, 9, 12
			expect(result.months[2].overpayment).toBe(200000); // Month 3
			expect(result.months[5].overpayment).toBe(200000); // Month 6
			expect(result.months[8].overpayment).toBe(200000); // Month 9
			expect(result.months[11].overpayment).toBe(200000); // Month 12

			// Other months should have no overpayment
			expect(result.months[0].overpayment).toBe(0); // Month 1
			expect(result.months[1].overpayment).toBe(0); // Month 2
			expect(result.months[3].overpayment).toBe(0); // Month 4
		});
	});

	describe("recurring yearly overpayments", () => {
		it("applies overpayment every 12 months from start", () => {
			const state = createSimulationState({
				overpaymentConfigs: [
					createOverpaymentConfig({
						type: "recurring",
						frequency: "yearly",
						amount: 500000, // €5,000/year
						startMonth: 12, // First at month 12
						endMonth: 60, // 5 years
					}),
				],
			});
			const rates = [createRate()];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Should apply at months 12, 24, 36, 48, 60
			expect(result.months[11].overpayment).toBe(500000); // Month 12
			expect(result.months[23].overpayment).toBe(500000); // Month 24
			expect(result.months[35].overpayment).toBe(500000); // Month 36
			expect(result.months[47].overpayment).toBe(500000); // Month 48
			expect(result.months[59].overpayment).toBe(500000); // Month 60

			// Month 72 should have no overpayment (beyond endMonth)
			expect(result.months[71].overpayment).toBe(0);
		});
	});

	describe("mixed overpayment scenarios", () => {
		it("combines one-time and recurring overpayments", () => {
			const state = createSimulationState({
				overpaymentConfigs: [
					createOverpaymentConfig({
						id: "lump-sum",
						type: "one_time",
						amount: 1000000, // €10,000 lump sum
						startMonth: 12,
					}),
					createOverpaymentConfig({
						id: "monthly",
						type: "recurring",
						frequency: "monthly",
						amount: 30000, // €300/month
						startMonth: 1,
						endMonth: 36,
					}),
				],
			});
			const rates = [createRate()];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Month 1: just monthly
			expect(result.months[0].overpayment).toBe(30000);

			// Month 12: monthly + lump sum
			expect(result.months[11].overpayment).toBe(1030000);

			// Month 13: just monthly
			expect(result.months[12].overpayment).toBe(30000);
		});

		it("handles overlapping recurring overpayments", () => {
			const state = createSimulationState({
				overpaymentConfigs: [
					createOverpaymentConfig({
						id: "monthly-1",
						type: "recurring",
						frequency: "monthly",
						amount: 20000, // €200/month
						startMonth: 1,
						endMonth: 24,
					}),
					createOverpaymentConfig({
						id: "monthly-2",
						type: "recurring",
						frequency: "monthly",
						amount: 30000, // €300/month
						startMonth: 12,
						endMonth: 36,
					}),
				],
			});
			const rates = [createRate()];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Month 1-11: first config only (€200)
			expect(result.months[0].overpayment).toBe(20000);

			// Month 12-24: both configs (€500)
			expect(result.months[11].overpayment).toBe(50000);
			expect(result.months[23].overpayment).toBe(50000);

			// Month 25-36: second config only (€300)
			expect(result.months[24].overpayment).toBe(30000);
			expect(result.months[35].overpayment).toBe(30000);

			// Month 37+: no overpayment
			expect(result.months[36].overpayment).toBe(0);
		});
	});

	describe("overpayment effects", () => {
		it("reduce_term shortens the mortgage without changing payment", () => {
			const state = createSimulationState({
				overpaymentConfigs: [
					createOverpaymentConfig({
						type: "recurring",
						frequency: "monthly",
						amount: 50000, // €500/month
						startMonth: 1,
						endMonth: 120, // 10 years of overpayments
						effect: "reduce_term",
					}),
				],
			});
			const rates = [createRate()];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Payment should stay roughly constant (not recalculated)
			const firstPayment = result.months[0].scheduledPayment;
			const midPayment = result.months[60].scheduledPayment;
			expect(midPayment).toBeCloseTo(firstPayment, -2);
		});
	});

	describe("disabled overpayments", () => {
		it("ignores disabled overpayment configs", () => {
			const state = createSimulationState({
				overpaymentConfigs: [
					createOverpaymentConfig({
						type: "one_time",
						amount: 1000000, // €10,000
						startMonth: 12,
						enabled: false, // Disabled
					}),
				],
			});
			const rates = [createRate()];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// No overpayment should be applied
			expect(result.months[11].overpayment).toBe(0);
		});

		it("applies only enabled overpayments when mixed", () => {
			const state = createSimulationState({
				overpaymentConfigs: [
					createOverpaymentConfig({
						id: "enabled",
						type: "one_time",
						amount: 500000, // €5,000
						startMonth: 12,
						enabled: true,
					}),
					createOverpaymentConfig({
						id: "disabled",
						type: "one_time",
						amount: 1000000, // €10,000
						startMonth: 12,
						enabled: false,
					}),
				],
			});
			const rates = [createRate()];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Only enabled overpayment should apply
			expect(result.months[11].overpayment).toBe(500000);
		});
	});

	describe("overpayment capping", () => {
		it("caps overpayment when it exceeds remaining balance", () => {
			const state = createSimulationState({
				input: {
					mortgageAmount: 5000000, // €50,000 small mortgage
					mortgageTermMonths: 60, // 5 years
					propertyValue: 10000000,
					ber: "B2",
				},
				overpaymentConfigs: [
					createOverpaymentConfig({
						type: "one_time",
						amount: 10000000, // €100,000 - more than balance
						startMonth: 24,
					}),
				],
			});
			const rates = [createRate()];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Overpayment should be capped at remaining balance
			const month24 = result.months[23];
			expect(month24.overpayment).toBeLessThanOrEqual(month24.openingBalance);

			// Mortgage should be paid off
			expect(
				result.months[result.months.length - 1].closingBalance,
			).toBeLessThan(1);
		});
	});

	describe("cumulative overpayment tracking", () => {
		it("tracks cumulative overpayments correctly", () => {
			const state = createSimulationState({
				overpaymentConfigs: [
					createOverpaymentConfig({
						type: "recurring",
						frequency: "monthly",
						amount: 50000, // €500/month
						startMonth: 1,
						endMonth: 12,
					}),
				],
			});
			const rates = [createRate()];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// After 12 months, cumulative overpayments should be €6,000
			expect(result.months[11].cumulativeOverpayments).toBe(600000);

			// After month 13, cumulative should still be €6,000 (no more overpayments)
			expect(result.months[12].cumulativeOverpayments).toBe(600000);
		});
	});

	describe("reduce_payment effect", () => {
		it("recalculates monthly payment after overpayment on variable rate", () => {
			const state = createSimulationState({
				input: {
					mortgageAmount: 20000000, // €200,000
					mortgageTermMonths: 240, // 20 years
					propertyValue: 25000000,
					ber: "B2",
				},
				overpaymentConfigs: [
					createOverpaymentConfig({
						type: "one_time",
						amount: 2000000, // €20,000 lump sum
						startMonth: 12,
						effect: "reduce_payment", // Key difference
					}),
				],
			});
			const rates = [createRate({ rate: 4.0, type: "variable" })];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			const paymentBeforeOverpayment = result.months[10].scheduledPayment; // Month 11
			const paymentAfterOverpayment = result.months[12].scheduledPayment; // Month 13

			// Payment should DECREASE after reduce_payment overpayment
			expect(paymentAfterOverpayment).toBeLessThan(paymentBeforeOverpayment);
		});

		it("does not change payment for reduce_term effect", () => {
			const state = createSimulationState({
				input: {
					mortgageAmount: 20000000, // €200,000
					mortgageTermMonths: 240, // 20 years
					propertyValue: 25000000,
					ber: "B2",
				},
				overpaymentConfigs: [
					createOverpaymentConfig({
						type: "one_time",
						amount: 2000000, // €20,000 lump sum
						startMonth: 12,
						effect: "reduce_term", // Keeps payment same
					}),
				],
			});
			const rates = [createRate({ rate: 4.0, type: "variable" })];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			const paymentBeforeOverpayment = result.months[10].scheduledPayment;
			const paymentAfterOverpayment = result.months[12].scheduledPayment;

			// Payment should stay the SAME with reduce_term
			expect(paymentAfterOverpayment).toBeCloseTo(paymentBeforeOverpayment, -2);
		});

		it("reduce_payment only works on variable rates, not fixed", () => {
			const state = createSimulationState({
				input: {
					mortgageAmount: 20000000,
					mortgageTermMonths: 240,
					propertyValue: 25000000,
					ber: "B2",
				},
				ratePeriods: [
					createRatePeriod({
						id: "fixed-5yr",
						rateId: "rate-fixed",
						durationMonths: 60, // 5-year fixed
					}),
					createRatePeriod({
						id: "variable",
						rateId: "rate-variable",
						durationMonths: 0,
					}),
				],
				overpaymentConfigs: [
					createOverpaymentConfig({
						ratePeriodId: "fixed-5yr",
						type: "one_time",
						amount: 2000000,
						startMonth: 12, // During fixed period
						effect: "reduce_payment",
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
				createRate({ id: "rate-variable", rate: 4.0, type: "variable" }),
			];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			const paymentBeforeOverpayment = result.months[10].scheduledPayment;
			const paymentAfterOverpayment = result.months[12].scheduledPayment;

			// Payment should NOT change during fixed period even with reduce_payment
			expect(paymentAfterOverpayment).toBeCloseTo(paymentBeforeOverpayment, -2);
		});

		it("mixed reduce_term and reduce_payment overpayments", () => {
			const state = createSimulationState({
				input: {
					mortgageAmount: 20000000,
					mortgageTermMonths: 240,
					propertyValue: 25000000,
					ber: "B2",
				},
				overpaymentConfigs: [
					createOverpaymentConfig({
						id: "reduce-term",
						type: "one_time",
						amount: 1000000, // €10,000
						startMonth: 12,
						effect: "reduce_term",
					}),
					createOverpaymentConfig({
						id: "reduce-payment",
						type: "one_time",
						amount: 1000000, // €10,000
						startMonth: 12,
						effect: "reduce_payment",
					}),
				],
			});
			const rates = [createRate({ rate: 4.0, type: "variable" })];
			const lenders = [createLender()];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Total overpayment at month 12 should be €20,000
			expect(result.months[11].overpayment).toBe(2000000);

			// Payment should decrease (due to reduce_payment portion)
			const paymentBefore = result.months[10].scheduledPayment;
			const paymentAfter = result.months[12].scheduledPayment;
			expect(paymentAfter).toBeLessThan(paymentBefore);
		});
	});
});
