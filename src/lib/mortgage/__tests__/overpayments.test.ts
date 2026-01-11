import { describe, expect, it } from "vitest";
import type { OverpaymentPolicy } from "@/lib/schemas/overpayment-policy";
import type { ResolvedRatePeriod } from "@/lib/schemas/simulate";
import {
	calculateMaxMonthlyOverpaymentForYear,
	calculateYearlyOverpaymentPlans,
	formatPolicyDescription,
	isConstantAllowancePolicy,
} from "../overpayments";

// Helper to create test policies
function createPolicy(
	overrides: Partial<OverpaymentPolicy> &
		Pick<OverpaymentPolicy, "allowanceType" | "allowanceValue">,
): OverpaymentPolicy {
	return {
		id: "test-policy",
		label: "Test Policy",
		description: "Test description",
		icon: "Percent",
		...overrides,
	};
}

// Helper to create test rate periods
function createPeriod(
	overrides: Partial<ResolvedRatePeriod> = {},
): ResolvedRatePeriod {
	return {
		id: "test-period",
		rateId: "test-rate",
		rate: 3.5,
		type: "fixed",
		fixedTerm: 3,
		lenderId: "test-lender",
		lenderName: "Test Lender",
		rateName: "3 Year Fixed",
		startMonth: 1,
		durationMonths: 36,
		label: "Test Period",
		isCustom: false,
		...overrides,
	};
}

describe("calculateMaxMonthlyOverpaymentForYear", () => {
	describe("percentage of balance policy", () => {
		it("calculates 10% of €300k balance = €30k/year = €2,500/month", () => {
			const policy = createPolicy({
				allowanceType: "percentage",
				allowanceValue: 10,
				allowanceBasis: "balance",
			});
			const balance = 30000000; // €300,000 in cents
			const monthlyPayment = 134713; // ~€1,347

			const result = calculateMaxMonthlyOverpaymentForYear(
				policy,
				balance,
				monthlyPayment,
			);

			// 10% of €300k = €30k/year = €2,500/month = 250,000 cents
			expect(result).toBe(250000);
		});

		it("calculates 10% of €200k balance = €20k/year = €1,666/month", () => {
			const policy = createPolicy({
				allowanceType: "percentage",
				allowanceValue: 10,
				allowanceBasis: "balance",
			});
			const balance = 20000000; // €200,000 in cents

			const result = calculateMaxMonthlyOverpaymentForYear(policy, balance, 0);

			// 10% of €200k = €20k/year = €1,666.66/month = 166,666 cents (floored)
			expect(result).toBe(166666);
		});

		it("calculates 5% of €400k balance", () => {
			const policy = createPolicy({
				allowanceType: "percentage",
				allowanceValue: 5,
				allowanceBasis: "balance",
			});
			const balance = 40000000; // €400,000 in cents

			const result = calculateMaxMonthlyOverpaymentForYear(policy, balance, 0);

			// 5% of €400k = €20k/year = €1,666.66/month = 166,666 cents (floored)
			expect(result).toBe(166666);
		});
	});

	describe("percentage of monthly payment policy", () => {
		it("calculates 10% of €1,500 payment = €150/month", () => {
			const policy = createPolicy({
				allowanceType: "percentage",
				allowanceValue: 10,
				allowanceBasis: "monthly",
			});
			const monthlyPayment = 150000; // €1,500 in cents

			const result = calculateMaxMonthlyOverpaymentForYear(
				policy,
				0,
				monthlyPayment,
			);

			// 10% of €1,500 = €150 = 15,000 cents
			expect(result).toBe(15000);
		});

		it("calculates 20% of €1,200 payment = €240/month", () => {
			const policy = createPolicy({
				allowanceType: "percentage",
				allowanceValue: 20,
				allowanceBasis: "monthly",
			});
			const monthlyPayment = 120000; // €1,200 in cents

			const result = calculateMaxMonthlyOverpaymentForYear(
				policy,
				0,
				monthlyPayment,
			);

			// 20% of €1,200 = €240 = 24,000 cents
			expect(result).toBe(24000);
		});

		it("ignores balance for monthly-based policy", () => {
			const policy = createPolicy({
				allowanceType: "percentage",
				allowanceValue: 10,
				allowanceBasis: "monthly",
			});
			const monthlyPayment = 150000;

			const result1 = calculateMaxMonthlyOverpaymentForYear(
				policy,
				10000000,
				monthlyPayment,
			);
			const result2 = calculateMaxMonthlyOverpaymentForYear(
				policy,
				50000000,
				monthlyPayment,
			);

			expect(result1).toBe(result2);
			expect(result1).toBe(15000);
		});
	});

	describe("flat amount policy", () => {
		it("calculates €5,000/year = €416.67/month", () => {
			const policy = createPolicy({
				allowanceType: "flat",
				allowanceValue: 5000, // €5,000 per year
			});

			const result = calculateMaxMonthlyOverpaymentForYear(policy, 0, 0);

			// €5,000/year = €416.66/month = 41,666 cents (floored)
			expect(result).toBe(41666);
		});

		it("calculates €10,000/year = €833.33/month", () => {
			const policy = createPolicy({
				allowanceType: "flat",
				allowanceValue: 10000, // €10,000 per year
			});

			const result = calculateMaxMonthlyOverpaymentForYear(policy, 0, 0);

			// €10,000/year = €833.33/month = 83,333 cents (floored)
			expect(result).toBe(83333);
		});

		it("ignores balance and payment for flat policy", () => {
			const policy = createPolicy({
				allowanceType: "flat",
				allowanceValue: 5000,
			});

			const result1 = calculateMaxMonthlyOverpaymentForYear(
				policy,
				10000000,
				100000,
			);
			const result2 = calculateMaxMonthlyOverpaymentForYear(
				policy,
				50000000,
				200000,
			);

			expect(result1).toBe(result2);
		});
	});

	describe("minimum amount", () => {
		it("applies minimum amount when calculated amount is lower", () => {
			const policy = createPolicy({
				allowanceType: "percentage",
				allowanceValue: 10,
				allowanceBasis: "monthly",
				minAmount: 65, // €65 minimum (like BOI)
			});
			const monthlyPayment = 50000; // €500 payment

			const result = calculateMaxMonthlyOverpaymentForYear(
				policy,
				0,
				monthlyPayment,
			);

			// 10% of €500 = €50, but minimum is €65
			// €65 = 6,500 cents
			expect(result).toBe(6500);
		});

		it("does not apply minimum when calculated amount is higher", () => {
			const policy = createPolicy({
				allowanceType: "percentage",
				allowanceValue: 10,
				allowanceBasis: "monthly",
				minAmount: 65, // €65 minimum
			});
			const monthlyPayment = 150000; // €1,500 payment

			const result = calculateMaxMonthlyOverpaymentForYear(
				policy,
				0,
				monthlyPayment,
			);

			// 10% of €1,500 = €150 > €65 minimum
			expect(result).toBe(15000);
		});

		it("handles zero minAmount", () => {
			const policy = createPolicy({
				allowanceType: "flat",
				allowanceValue: 5000,
				minAmount: 0,
			});

			const result = calculateMaxMonthlyOverpaymentForYear(policy, 0, 0);

			expect(result).toBe(41666);
		});

		it("handles undefined minAmount", () => {
			const policy = createPolicy({
				allowanceType: "flat",
				allowanceValue: 5000,
			});

			const result = calculateMaxMonthlyOverpaymentForYear(policy, 0, 0);

			expect(result).toBe(41666);
		});
	});
});

describe("isConstantAllowancePolicy", () => {
	it("returns true for monthly-based percentage policy", () => {
		const policy = createPolicy({
			allowanceType: "percentage",
			allowanceValue: 10,
			allowanceBasis: "monthly",
		});

		expect(isConstantAllowancePolicy(policy)).toBe(true);
	});

	it("returns true for flat policy", () => {
		const policy = createPolicy({
			allowanceType: "flat",
			allowanceValue: 5000,
		});

		expect(isConstantAllowancePolicy(policy)).toBe(true);
	});

	it("returns false for balance-based percentage policy", () => {
		const policy = createPolicy({
			allowanceType: "percentage",
			allowanceValue: 10,
			allowanceBasis: "balance",
		});

		expect(isConstantAllowancePolicy(policy)).toBe(false);
	});
});

describe("calculateYearlyOverpaymentPlans", () => {
	describe("constant allowance policies", () => {
		it("returns single plan for entire period with flat policy", () => {
			const policy = createPolicy({
				allowanceType: "flat",
				allowanceValue: 5000,
			});
			const period = createPeriod({
				startMonth: 1,
				durationMonths: 36,
				rate: 3.5,
			});

			const plans = calculateYearlyOverpaymentPlans(
				policy,
				period,
				30000000, // €300k
				360, // 30 year term
			);

			expect(plans).toHaveLength(1);
			expect(plans[0].year).toBe(1);
			expect(plans[0].startMonth).toBe(1);
			expect(plans[0].endMonth).toBe(36);
			expect(plans[0].monthlyAmount).toBe(41666); // €416.66/month
		});

		it("returns single plan for entire period with monthly-based policy", () => {
			const policy = createPolicy({
				allowanceType: "percentage",
				allowanceValue: 10,
				allowanceBasis: "monthly",
			});
			const period = createPeriod({
				startMonth: 1,
				durationMonths: 60,
				rate: 3.5,
			});

			const plans = calculateYearlyOverpaymentPlans(
				policy,
				period,
				30000000,
				360,
			);

			expect(plans).toHaveLength(1);
			expect(plans[0].startMonth).toBe(1);
			expect(plans[0].endMonth).toBe(60);
		});
	});

	describe("balance-based policies without startDate", () => {
		it("creates multiple plans aligned to mortgage years", () => {
			const policy = createPolicy({
				allowanceType: "percentage",
				allowanceValue: 10,
				allowanceBasis: "balance",
			});
			const period = createPeriod({
				startMonth: 1,
				durationMonths: 36, // 3 years
				rate: 3.5,
			});

			const plans = calculateYearlyOverpaymentPlans(
				policy,
				period,
				30000000,
				360,
			);

			expect(plans).toHaveLength(3);
			expect(plans[0].startMonth).toBe(1);
			expect(plans[0].endMonth).toBe(12);
			expect(plans[1].startMonth).toBe(13);
			expect(plans[1].endMonth).toBe(24);
			expect(plans[2].startMonth).toBe(25);
			expect(plans[2].endMonth).toBe(36);
		});

		it("decreases monthly amount as balance decreases", () => {
			const policy = createPolicy({
				allowanceType: "percentage",
				allowanceValue: 10,
				allowanceBasis: "balance",
			});
			const period = createPeriod({
				startMonth: 1,
				durationMonths: 36,
				rate: 3.5,
			});

			const plans = calculateYearlyOverpaymentPlans(
				policy,
				period,
				30000000,
				360,
			);

			// Each year should have lower monthly amount
			expect(plans[0].monthlyAmount).toBeGreaterThan(plans[1].monthlyAmount);
			expect(plans[1].monthlyAmount).toBeGreaterThan(plans[2].monthlyAmount);
		});

		it("tracks estimated balance at start of each year", () => {
			const policy = createPolicy({
				allowanceType: "percentage",
				allowanceValue: 10,
				allowanceBasis: "balance",
			});
			const period = createPeriod({
				startMonth: 1,
				durationMonths: 24,
				rate: 3.5,
			});

			const plans = calculateYearlyOverpaymentPlans(
				policy,
				period,
				30000000,
				360,
			);

			expect(plans[0].estimatedBalance).toBe(30000000);
			expect(plans[1].estimatedBalance).toBeLessThan(30000000);
		});
	});

	describe("balance-based policies with startDate (calendar year alignment)", () => {
		it("aligns to calendar year boundaries", () => {
			const policy = createPolicy({
				allowanceType: "percentage",
				allowanceValue: 10,
				allowanceBasis: "balance",
			});
			const period = createPeriod({
				startMonth: 1,
				durationMonths: 24,
				rate: 3.5,
			});

			// Start in March 2025 - first year is March-Dec (10 months)
			const plans = calculateYearlyOverpaymentPlans(
				policy,
				period,
				30000000,
				360,
				"2025-03-01",
			);

			// First year: months 1-10 (Mar-Dec 2025)
			expect(plans[0].startMonth).toBe(1);
			expect(plans[0].endMonth).toBe(10);

			// Second year: months 11-22 (Jan-Dec 2026)
			expect(plans[1].startMonth).toBe(11);
			expect(plans[1].endMonth).toBe(22);

			// Third year: months 23-24 (Jan-Feb 2027)
			expect(plans[2].startMonth).toBe(23);
			expect(plans[2].endMonth).toBe(24);
		});

		it("handles January start (full calendar year)", () => {
			const policy = createPolicy({
				allowanceType: "percentage",
				allowanceValue: 10,
				allowanceBasis: "balance",
			});
			const period = createPeriod({
				startMonth: 1,
				durationMonths: 24,
				rate: 3.5,
			});

			const plans = calculateYearlyOverpaymentPlans(
				policy,
				period,
				30000000,
				360,
				"2025-01-01",
			);

			// Should align to full calendar years
			expect(plans[0].startMonth).toBe(1);
			expect(plans[0].endMonth).toBe(12);
			expect(plans[1].startMonth).toBe(13);
			expect(plans[1].endMonth).toBe(24);
		});
	});

	describe("edge cases", () => {
		it("handles period starting mid-mortgage", () => {
			const policy = createPolicy({
				allowanceType: "flat",
				allowanceValue: 5000,
			});
			const period = createPeriod({
				startMonth: 37, // Starts at month 37 (year 4)
				durationMonths: 24,
				rate: 4.0,
			});

			const plans = calculateYearlyOverpaymentPlans(
				policy,
				period,
				25000000, // Lower balance
				360,
			);

			expect(plans).toHaveLength(1);
			expect(plans[0].startMonth).toBe(37);
			expect(plans[0].endMonth).toBe(60);
		});

		it("handles durationMonths = 0 (until end of mortgage)", () => {
			const policy = createPolicy({
				allowanceType: "flat",
				allowanceValue: 5000,
			});
			const period = createPeriod({
				startMonth: 37,
				durationMonths: 0, // Until end
				rate: 4.0,
			});

			const plans = calculateYearlyOverpaymentPlans(
				policy,
				period,
				25000000,
				60, // Short term for test
			);

			expect(plans).toHaveLength(1);
			expect(plans[0].startMonth).toBe(37);
			expect(plans[0].endMonth).toBe(60);
		});

		it("stops when balance reaches zero", () => {
			const policy = createPolicy({
				allowanceType: "percentage",
				allowanceValue: 50, // Very aggressive 50% per year
				allowanceBasis: "balance",
			});
			const period = createPeriod({
				startMonth: 1,
				durationMonths: 120,
				rate: 3.5,
			});

			const plans = calculateYearlyOverpaymentPlans(
				policy,
				period,
				10000000, // €100k - small balance
				120,
			);

			// Should stop early when balance hits zero
			const lastPlan = plans[plans.length - 1];
			expect(lastPlan.estimatedBalance).toBeGreaterThan(0);
		});

		it("returns empty array when monthly amount is zero", () => {
			const policy = createPolicy({
				allowanceType: "percentage",
				allowanceValue: 0, // 0% allowance
				allowanceBasis: "balance",
			});
			const period = createPeriod();

			const plans = calculateYearlyOverpaymentPlans(
				policy,
				period,
				30000000,
				360,
			);

			expect(plans).toHaveLength(0);
		});
	});
});

describe("formatPolicyDescription", () => {
	it("formats percentage of balance policy", () => {
		const policy = createPolicy({
			allowanceType: "percentage",
			allowanceValue: 10,
			allowanceBasis: "balance",
		});

		expect(formatPolicyDescription(policy)).toBe("10% of balance per year");
	});

	it("formats percentage of monthly payment policy", () => {
		const policy = createPolicy({
			allowanceType: "percentage",
			allowanceValue: 20,
			allowanceBasis: "monthly",
		});

		expect(formatPolicyDescription(policy)).toBe("20% of monthly payment");
	});

	it("formats flat amount policy", () => {
		const policy = createPolicy({
			allowanceType: "flat",
			allowanceValue: 5000,
		});

		expect(formatPolicyDescription(policy)).toBe("€5,000 per year");
	});

	it("formats large flat amounts with locale string", () => {
		const policy = createPolicy({
			allowanceType: "flat",
			allowanceValue: 50000,
		});

		expect(formatPolicyDescription(policy)).toBe("€50,000 per year");
	});

	it("returns 'No allowance' for undefined policy", () => {
		expect(formatPolicyDescription(undefined)).toBe("No allowance");
	});

	it("returns 'No allowance' for percentage policy without basis", () => {
		const policy = createPolicy({
			allowanceType: "percentage",
			allowanceValue: 10,
			// No allowanceBasis
		});

		expect(formatPolicyDescription(policy)).toBe("No allowance");
	});
});
