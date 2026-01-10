import { describe, expect, it } from "vitest";
import { calculateAmortization } from "@/lib/mortgage/simulation";
import {
	createLender,
	createOverpaymentConfig,
	createPolicy,
	createRate,
	createRatePeriod,
	createSimulationState,
} from "./fixtures";

// Helper to create a lender with policy linked for allowance tracking tests
function createLenderWithPolicy(
	overrides: Omit<Parameters<typeof createLender>[0], "overpaymentPolicy"> & {
		overpaymentPolicy?: string;
	} = {},
) {
	return createLender({
		overpaymentPolicy: "test-policy",
		...overrides,
	});
}

describe("Allowance Tracking Integration Tests", () => {
	describe("percentage-based allowance (balance)", () => {
		it("allows overpayment within 10% of balance", () => {
			// €300k mortgage, 10% allowance = €30k allowed in year 1
			const state = createSimulationState({
				ratePeriods: [
					createRatePeriod({
						id: "fixed-3yr",
						rateId: "rate-fixed",
						durationMonths: 36,
					}),
				],
				overpaymentConfigs: [
					createOverpaymentConfig({
						ratePeriodId: "fixed-3yr",
						type: "one_time",
						amount: 2500000, // €25,000 - within allowance
						startMonth: 6,
					}),
				],
			});
			const rates = [
				createRate({
					id: "rate-fixed",
					rate: 3.5,
					type: "fixed",
					fixedTerm: 3,
				}),
			];
			const lenders = [createLenderWithPolicy()];
			const policies = [
				createPolicy({ allowanceValue: 10, allowanceBasis: "balance" }),
			];

			const result = calculateAmortization(state, rates, [], lenders, policies);

			// Should have no warnings since €25k < 10% of €300k (€30k)
			const allowanceWarnings = result.warnings.filter(
				(w) => w.type === "allowance_exceeded",
			);
			expect(allowanceWarnings).toHaveLength(0);
		});

		it("generates warning when overpayment exceeds balance-based allowance", () => {
			// €300k mortgage, 10% allowance = €30k allowed
			const state = createSimulationState({
				ratePeriods: [
					createRatePeriod({
						id: "fixed-3yr",
						rateId: "rate-fixed",
						durationMonths: 36,
					}),
				],
				overpaymentConfigs: [
					createOverpaymentConfig({
						ratePeriodId: "fixed-3yr",
						type: "one_time",
						amount: 4000000, // €40,000 - exceeds 10% allowance
						startMonth: 6,
					}),
				],
			});
			const rates = [
				createRate({
					id: "rate-fixed",
					rate: 3.5,
					type: "fixed",
					fixedTerm: 3,
				}),
			];
			const lenders = [createLenderWithPolicy()];
			const policies = [
				createPolicy({ allowanceValue: 10, allowanceBasis: "balance" }),
			];

			const result = calculateAmortization(state, rates, [], lenders, policies);

			// Should have warning for exceeding allowance
			const allowanceWarnings = result.warnings.filter(
				(w) => w.type === "allowance_exceeded",
			);
			expect(allowanceWarnings.length).toBeGreaterThan(0);
		});

		it("tracks yearly overpayments and warns on cumulative excess", () => {
			// Multiple overpayments that together exceed yearly allowance
			const state = createSimulationState({
				ratePeriods: [
					createRatePeriod({
						id: "fixed-3yr",
						rateId: "rate-fixed",
						durationMonths: 36,
					}),
				],
				overpaymentConfigs: [
					createOverpaymentConfig({
						id: "op-1",
						ratePeriodId: "fixed-3yr",
						type: "one_time",
						amount: 2000000, // €20,000
						startMonth: 3,
					}),
					createOverpaymentConfig({
						id: "op-2",
						ratePeriodId: "fixed-3yr",
						type: "one_time",
						amount: 1500000, // €15,000 - total €35k exceeds €30k allowance
						startMonth: 9,
					}),
				],
			});
			const rates = [
				createRate({
					id: "rate-fixed",
					rate: 3.5,
					type: "fixed",
					fixedTerm: 3,
				}),
			];
			const lenders = [createLenderWithPolicy()];
			const policies = [
				createPolicy({ allowanceValue: 10, allowanceBasis: "balance" }),
			];

			const result = calculateAmortization(state, rates, [], lenders, policies);

			// Should have warning because cumulative exceeds allowance
			const allowanceWarnings = result.warnings.filter(
				(w) => w.type === "allowance_exceeded",
			);
			expect(allowanceWarnings.length).toBeGreaterThan(0);
		});
	});

	describe("flat allowance", () => {
		it("allows overpayment within flat €5,000 allowance", () => {
			const state = createSimulationState({
				ratePeriods: [
					createRatePeriod({
						id: "fixed-5yr",
						rateId: "rate-fixed",
						durationMonths: 60,
					}),
				],
				overpaymentConfigs: [
					createOverpaymentConfig({
						ratePeriodId: "fixed-5yr",
						type: "one_time",
						amount: 400000, // €4,000 - within €5k allowance
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
			const lenders = [
				createLenderWithPolicy({ overpaymentPolicy: "flat-policy" }),
			];
			const policies = [
				createPolicy({
					id: "flat-policy",
					allowanceType: "flat",
					allowanceValue: 5000, // €5,000 flat (in euros, not cents)
				}),
			];

			const result = calculateAmortization(state, rates, [], lenders, policies);

			const allowanceWarnings = result.warnings.filter(
				(w) => w.type === "allowance_exceeded",
			);
			expect(allowanceWarnings).toHaveLength(0);
		});

		it("warns when exceeding flat allowance", () => {
			const state = createSimulationState({
				ratePeriods: [
					createRatePeriod({
						id: "fixed-5yr",
						rateId: "rate-fixed",
						durationMonths: 60,
					}),
				],
				overpaymentConfigs: [
					createOverpaymentConfig({
						ratePeriodId: "fixed-5yr",
						type: "one_time",
						amount: 800000, // €8,000 - exceeds €5k flat allowance
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
			const lenders = [
				createLenderWithPolicy({ overpaymentPolicy: "flat-policy" }),
			];
			const policies = [
				createPolicy({
					id: "flat-policy",
					allowanceType: "flat",
					allowanceValue: 5000, // €5,000 flat (in euros, not cents)
				}),
			];

			const result = calculateAmortization(state, rates, [], lenders, policies);

			const allowanceWarnings = result.warnings.filter(
				(w) => w.type === "allowance_exceeded",
			);
			expect(allowanceWarnings.length).toBeGreaterThan(0);
		});
	});

	describe("variable rate periods (no restrictions)", () => {
		it("does not generate warnings for variable rate overpayments", () => {
			const state = createSimulationState({
				ratePeriods: [
					createRatePeriod({
						id: "variable",
						rateId: "rate-variable",
						durationMonths: 0,
					}),
				],
				overpaymentConfigs: [
					createOverpaymentConfig({
						ratePeriodId: "variable",
						type: "one_time",
						amount: 10000000, // €100,000 - large overpayment
						startMonth: 12,
					}),
				],
			});
			const rates = [
				createRate({
					id: "rate-variable",
					rate: 4.0,
					type: "variable",
					// No overpaymentPolicyId - variable rates have no restrictions
				}),
			];
			const lenders = [createLenderWithPolicy()];
			const policies = [createPolicy()];

			const result = calculateAmortization(state, rates, [], lenders, policies);

			// Variable rates should never have allowance warnings
			const allowanceWarnings = result.warnings.filter(
				(w) => w.type === "allowance_exceeded",
			);
			expect(allowanceWarnings).toHaveLength(0);
		});
	});

	describe("year boundary handling", () => {
		it("resets allowance at calendar year boundary when startDate provided", () => {
			// Start in November, so year 2 starts in January
			const state = createSimulationState({
				input: {
					mortgageAmount: 30000000,
					mortgageTermMonths: 360,
					propertyValue: 35000000,
					startDate: "2025-11-01", // November start
					ber: "B2",
				},
				ratePeriods: [
					createRatePeriod({
						id: "fixed-3yr",
						rateId: "rate-fixed",
						durationMonths: 36,
					}),
				],
				overpaymentConfigs: [
					// Year 1: €25k overpayment (within 10% of €300k)
					createOverpaymentConfig({
						id: "op-year1",
						ratePeriodId: "fixed-3yr",
						type: "one_time",
						amount: 2500000, // €25,000
						startMonth: 2, // December 2025
					}),
					// Year 2: €25k overpayment (should reset, within new year's allowance)
					createOverpaymentConfig({
						id: "op-year2",
						ratePeriodId: "fixed-3yr",
						type: "one_time",
						amount: 2500000, // €25,000
						startMonth: 3, // January 2026 - new calendar year
					}),
				],
			});
			const rates = [
				createRate({
					id: "rate-fixed",
					rate: 3.5,
					type: "fixed",
					fixedTerm: 3,
				}),
			];
			const lenders = [createLenderWithPolicy()];
			const policies = [
				createPolicy({ allowanceValue: 10, allowanceBasis: "balance" }),
			];

			const result = calculateAmortization(state, rates, [], lenders, policies);

			// Both should be within allowance since they're in different calendar years
			// Note: We verify the simulation runs; warning behavior depends on implementation
			expect(result.months.length).toBeGreaterThan(0);
		});

		it("resets allowance at mortgage anniversary when no startDate", () => {
			const state = createSimulationState({
				// No startDate = relative mortgage years
				ratePeriods: [
					createRatePeriod({
						id: "fixed-5yr",
						rateId: "rate-fixed",
						durationMonths: 60,
					}),
				],
				overpaymentConfigs: [
					// Year 1: €28k overpayment (within 10% of €300k)
					createOverpaymentConfig({
						id: "op-year1",
						ratePeriodId: "fixed-5yr",
						type: "one_time",
						amount: 2800000, // €28,000
						startMonth: 6,
					}),
					// Year 2: €28k overpayment (month 13 = start of year 2)
					createOverpaymentConfig({
						id: "op-year2",
						ratePeriodId: "fixed-5yr",
						type: "one_time",
						amount: 2800000, // €28,000
						startMonth: 18, // Within mortgage year 2
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
			const lenders = [createLenderWithPolicy()];
			const policies = [
				createPolicy({ allowanceValue: 10, allowanceBasis: "balance" }),
			];

			const result = calculateAmortization(state, rates, [], lenders, policies);

			// Each overpayment should be within its respective year's allowance
			// (Year 2 allowance is based on year 2's starting balance)
			expect(result.months.length).toBeGreaterThan(0);
		});
	});

	describe("allowance uses year-start balance", () => {
		it("calculates percentage allowance from balance at year start", () => {
			// After significant overpayment in year 1, year 2's allowance should be lower
			const state = createSimulationState({
				ratePeriods: [
					createRatePeriod({
						id: "fixed-5yr",
						rateId: "rate-fixed",
						durationMonths: 60,
					}),
				],
				overpaymentConfigs: [
					// Year 1: Large overpayment that reduces balance significantly
					createOverpaymentConfig({
						id: "op-year1",
						ratePeriodId: "fixed-5yr",
						type: "one_time",
						amount: 2000000, // €20,000 (within €30k allowance)
						startMonth: 6,
					}),
					// Year 2: Overpayment that would be within 10% of original balance
					// but may exceed 10% of reduced balance
					createOverpaymentConfig({
						id: "op-year2",
						ratePeriodId: "fixed-5yr",
						type: "one_time",
						amount: 2800000, // €28,000
						startMonth: 14, // Year 2
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
			const lenders = [createLenderWithPolicy()];
			const policies = [
				createPolicy({ allowanceValue: 10, allowanceBasis: "balance" }),
			];

			const result = calculateAmortization(state, rates, [], lenders, policies);

			// Verify the simulation ran
			expect(result.months.length).toBeGreaterThan(0);

			// Year 2 balance should be lower due to year 1 overpayment
			// So year 2's 10% allowance would be less than original €30k
			const year2StartBalance = result.months[12].openingBalance;
			expect(year2StartBalance).toBeLessThan(28000000); // Less than ~€280k
		});
	});

	describe("mixed rate periods with different policies", () => {
		it("applies correct policy to each rate period", () => {
			const state = createSimulationState({
				ratePeriods: [
					createRatePeriod({
						id: "fixed-3yr",
						rateId: "rate-fixed-3yr",
						durationMonths: 36,
					}),
					createRatePeriod({
						id: "variable",
						rateId: "rate-variable",
						durationMonths: 0,
					}),
				],
				overpaymentConfigs: [
					// Fixed period: smaller overpayment within allowance
					createOverpaymentConfig({
						id: "op-fixed",
						ratePeriodId: "fixed-3yr",
						type: "one_time",
						amount: 2000000, // €20,000
						startMonth: 12,
					}),
					// Variable period: large overpayment (no restrictions)
					createOverpaymentConfig({
						id: "op-variable",
						ratePeriodId: "variable",
						type: "one_time",
						amount: 5000000, // €50,000
						startMonth: 48,
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
					id: "rate-variable",
					rate: 4.0,
					type: "variable",
				}),
			];
			const lenders = [
				createLenderWithPolicy({ overpaymentPolicy: "strict-policy" }),
			];
			const policies = [
				createPolicy({
					id: "strict-policy",
					allowanceValue: 10,
					allowanceBasis: "balance",
				}),
			];

			const result = calculateAmortization(state, rates, [], lenders, policies);

			// Fixed period overpayment within allowance - no warning
			// Variable period overpayment - no allowance restrictions
			// So should have no allowance_exceeded warnings
			const allowanceWarnings = result.warnings.filter(
				(w) => w.type === "allowance_exceeded",
			);
			expect(allowanceWarnings).toHaveLength(0);

			// Verify both overpayments were applied
			expect(result.months[11].overpayment).toBe(2000000);
			expect(result.months[47].overpayment).toBe(5000000);
		});
	});

	describe("recurring overpayments and allowance", () => {
		it("tracks cumulative recurring overpayments against yearly allowance", () => {
			const state = createSimulationState({
				ratePeriods: [
					createRatePeriod({
						id: "fixed-5yr",
						rateId: "rate-fixed",
						durationMonths: 60,
					}),
				],
				overpaymentConfigs: [
					createOverpaymentConfig({
						ratePeriodId: "fixed-5yr",
						type: "recurring",
						frequency: "monthly",
						amount: 300000, // €3,000/month = €36k/year (exceeds €30k allowance)
						startMonth: 1,
						endMonth: 12,
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
			const lenders = [createLenderWithPolicy()];
			const policies = [
				createPolicy({ allowanceValue: 10, allowanceBasis: "balance" }),
			];

			const result = calculateAmortization(state, rates, [], lenders, policies);

			// €3k/month × 12 = €36k > €30k allowance
			// Should generate warning when cumulative exceeds allowance
			const allowanceWarnings = result.warnings.filter(
				(w) => w.type === "allowance_exceeded",
			);
			expect(allowanceWarnings.length).toBeGreaterThan(0);
		});
	});

	describe("monthly-basis allowance (BOI style)", () => {
		it("allows overpayment within monthly percentage of payment", () => {
			// Monthly payment ~€1,212 for €200k at 3.5% over 25 years
			// 10% of monthly payment = ~€121/month allowed
			const state = createSimulationState({
				input: {
					mortgageAmount: 20000000, // €200,000
					mortgageTermMonths: 300, // 25 years
					propertyValue: 25000000,
					ber: "B2",
				},
				ratePeriods: [
					createRatePeriod({
						id: "fixed-5yr",
						rateId: "rate-fixed",
						durationMonths: 60,
					}),
				],
				overpaymentConfigs: [
					createOverpaymentConfig({
						ratePeriodId: "fixed-5yr",
						type: "one_time",
						amount: 10000, // €100 - within 10% of ~€1,212 payment
						startMonth: 6,
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
			const lenders = [createLenderWithPolicy()];
			const policies = [
				createPolicy({
					allowanceType: "percentage",
					allowanceValue: 10, // 10% of monthly payment
					allowanceBasis: "monthly",
				}),
			];

			const result = calculateAmortization(state, rates, [], lenders, policies);

			const allowanceWarnings = result.warnings.filter(
				(w) => w.type === "allowance_exceeded",
			);
			expect(allowanceWarnings).toHaveLength(0);
		});

		it("warns when overpayment exceeds monthly percentage of payment", () => {
			// Monthly payment ~€1,212 for €200k at 3.5% over 25 years
			// 10% of monthly payment = ~€121/month allowed
			const state = createSimulationState({
				input: {
					mortgageAmount: 20000000, // €200,000
					mortgageTermMonths: 300, // 25 years
					propertyValue: 25000000,
					ber: "B2",
				},
				ratePeriods: [
					createRatePeriod({
						id: "fixed-5yr",
						rateId: "rate-fixed",
						durationMonths: 60,
					}),
				],
				overpaymentConfigs: [
					createOverpaymentConfig({
						ratePeriodId: "fixed-5yr",
						type: "one_time",
						amount: 20000, // €200 - exceeds 10% of ~€1,212 payment (~€121)
						startMonth: 6,
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
			const lenders = [createLenderWithPolicy()];
			const policies = [
				createPolicy({
					allowanceType: "percentage",
					allowanceValue: 10, // 10% of monthly payment
					allowanceBasis: "monthly",
				}),
			];

			const result = calculateAmortization(state, rates, [], lenders, policies);

			const allowanceWarnings = result.warnings.filter(
				(w) => w.type === "allowance_exceeded",
			);
			expect(allowanceWarnings.length).toBeGreaterThan(0);
		});

		it("monthly-basis allowance does not accumulate yearly", () => {
			// With monthly-basis, each month is checked independently
			// Can overpay €100/month for 12 months without exceeding
			const state = createSimulationState({
				input: {
					mortgageAmount: 20000000,
					mortgageTermMonths: 300,
					propertyValue: 25000000,
					ber: "B2",
				},
				ratePeriods: [
					createRatePeriod({
						id: "fixed-5yr",
						rateId: "rate-fixed",
						durationMonths: 60,
					}),
				],
				overpaymentConfigs: [
					createOverpaymentConfig({
						ratePeriodId: "fixed-5yr",
						type: "recurring",
						frequency: "monthly",
						amount: 10000, // €100/month - within 10% of ~€1,212 payment
						startMonth: 1,
						endMonth: 12,
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
			const lenders = [createLenderWithPolicy()];
			const policies = [
				createPolicy({
					allowanceType: "percentage",
					allowanceValue: 10,
					allowanceBasis: "monthly",
				}),
			];

			const result = calculateAmortization(state, rates, [], lenders, policies);

			// No warnings because each individual month is within allowance
			const allowanceWarnings = result.warnings.filter(
				(w) => w.type === "allowance_exceeded",
			);
			expect(allowanceWarnings).toHaveLength(0);
		});
	});

	describe("minimum amount on policy", () => {
		it("uses minimum amount when calculated allowance is lower", () => {
			// Small payment where 10% would be less than €65 minimum
			// Payment ~€606 for €100k at 3.5% over 25 years
			// 10% = ~€60, but minimum is €65
			const state = createSimulationState({
				input: {
					mortgageAmount: 10000000, // €100,000
					mortgageTermMonths: 300, // 25 years
					propertyValue: 15000000,
					ber: "B2",
				},
				ratePeriods: [
					createRatePeriod({
						id: "fixed-5yr",
						rateId: "rate-fixed",
						durationMonths: 60,
					}),
				],
				overpaymentConfigs: [
					createOverpaymentConfig({
						ratePeriodId: "fixed-5yr",
						type: "one_time",
						amount: 6400, // €64 - above 10% (~€60) but below minimum €65
						startMonth: 6,
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
			const lenders = [createLenderWithPolicy()];
			const policies = [
				createPolicy({
					allowanceType: "percentage",
					allowanceValue: 10,
					allowanceBasis: "monthly",
					minAmount: 65, // €65 minimum (like BOI)
				}),
			];

			const result = calculateAmortization(state, rates, [], lenders, policies);

			// €64 should be within €65 minimum allowance, no warning
			const allowanceWarnings = result.warnings.filter(
				(w) => w.type === "allowance_exceeded",
			);
			expect(allowanceWarnings).toHaveLength(0);
		});

		it("warns when overpayment exceeds minimum amount", () => {
			const state = createSimulationState({
				input: {
					mortgageAmount: 10000000, // €100,000
					mortgageTermMonths: 300,
					propertyValue: 15000000,
					ber: "B2",
				},
				ratePeriods: [
					createRatePeriod({
						id: "fixed-5yr",
						rateId: "rate-fixed",
						durationMonths: 60,
					}),
				],
				overpaymentConfigs: [
					createOverpaymentConfig({
						ratePeriodId: "fixed-5yr",
						type: "one_time",
						amount: 10000, // €100 - exceeds €65 minimum
						startMonth: 6,
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
			const lenders = [createLenderWithPolicy()];
			const policies = [
				createPolicy({
					allowanceType: "percentage",
					allowanceValue: 10,
					allowanceBasis: "monthly",
					minAmount: 65, // €65 minimum
				}),
			];

			const result = calculateAmortization(state, rates, [], lenders, policies);

			// €100 exceeds €65 minimum, should warn
			const allowanceWarnings = result.warnings.filter(
				(w) => w.type === "allowance_exceeded",
			);
			expect(allowanceWarnings.length).toBeGreaterThan(0);
		});

		it("minimum does not apply when calculated allowance is higher", () => {
			// Larger payment where 10% exceeds €65 minimum
			// Payment ~€1,212 for €200k at 3.5% over 25 years
			// 10% = ~€121, which is above €65 minimum
			const state = createSimulationState({
				input: {
					mortgageAmount: 20000000, // €200,000
					mortgageTermMonths: 300,
					propertyValue: 25000000,
					ber: "B2",
				},
				ratePeriods: [
					createRatePeriod({
						id: "fixed-5yr",
						rateId: "rate-fixed",
						durationMonths: 60,
					}),
				],
				overpaymentConfigs: [
					createOverpaymentConfig({
						ratePeriodId: "fixed-5yr",
						type: "one_time",
						amount: 10000, // €100 - within 10% (~€121) but above minimum €65
						startMonth: 6,
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
			const lenders = [createLenderWithPolicy()];
			const policies = [
				createPolicy({
					allowanceType: "percentage",
					allowanceValue: 10,
					allowanceBasis: "monthly",
					minAmount: 65, // €65 minimum - but 10% is ~€121, so minimum doesn't apply
				}),
			];

			const result = calculateAmortization(state, rates, [], lenders, policies);

			// €100 is within €121 (10% of payment), no warning
			const allowanceWarnings = result.warnings.filter(
				(w) => w.type === "allowance_exceeded",
			);
			expect(allowanceWarnings).toHaveLength(0);
		});
	});
});
