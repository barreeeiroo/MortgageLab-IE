import { describe, expect, it } from "vitest";
import { calculateYearlyOverpaymentPlans } from "@/lib/mortgage/overpayments";
import {
	determinePhase,
	getConstructionEndMonth,
	getInterestOnlyEndMonth,
	isSelfBuildActive,
} from "@/lib/mortgage/self-build";
import {
	calculateAmortization,
	calculateBaselineInterest,
	calculateSummary,
	resolveRatePeriod,
} from "@/lib/mortgage/simulation";
import type { SelfBuildConfig } from "@/lib/schemas/simulate";
import {
	createLender,
	createPolicy,
	createRate,
	createRatePeriod,
	createSimulationState,
} from "./fixtures";

/**
 * Helper to create a self-build config with staged drawdowns.
 * Default: 3 stages over 8 months totaling the mortgage amount.
 */
function createSelfBuildConfig(
	mortgageAmount: number,
	overrides: Partial<SelfBuildConfig> = {},
): SelfBuildConfig {
	// Default: 3 drawdowns at months 1, 4, 8
	const defaultStages = [
		{ id: "d1", month: 1, amount: mortgageAmount * 0.25, label: "Site" },
		{ id: "d2", month: 4, amount: mortgageAmount * 0.35, label: "Roof Level" },
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

describe("Self-Build Mortgage Integration Tests", () => {
	describe("basic self-build scenarios", () => {
		it("starts with first drawdown amount, not full mortgage", () => {
			const mortgageAmount = 30000000; // €300k
			const selfBuildConfig = createSelfBuildConfig(mortgageAmount);

			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 360,
					propertyValue: 40000000,
					ber: "B2",
				},
				selfBuildConfig,
			});
			const rates = [createRate({ rate: 3.5 })];
			const lenders = [createLender({ allowsSelfBuild: true })];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// First month should start with 25% of mortgage (first drawdown)
			expect(result.months[0].openingBalance).toBe(mortgageAmount * 0.25);
		});

		it("balance increases at each drawdown month", () => {
			const mortgageAmount = 20000000; // €200k
			const selfBuildConfig = createSelfBuildConfig(mortgageAmount);

			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 300,
					propertyValue: 25000000,
					ber: "B2",
				},
				selfBuildConfig,
			});
			const rates = [createRate({ rate: 3.0 })];
			const lenders = [createLender({ allowsSelfBuild: true })];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Month 1: 25% drawn
			expect(result.months[0].openingBalance).toBe(mortgageAmount * 0.25);

			// Month 4: additional 35% drawn (now 60% total)
			// Opening balance should be ~25% + interest, then drawdown happens
			expect(result.months[3].drawdownThisMonth).toBe(mortgageAmount * 0.35);

			// Month 8: final 40% drawn (now 100% total)
			expect(result.months[7].drawdownThisMonth).toBe(mortgageAmount * 0.4);
		});

		it("tracks cumulative drawn amount correctly", () => {
			const mortgageAmount = 30000000;
			const selfBuildConfig = createSelfBuildConfig(mortgageAmount);

			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 360,
					propertyValue: 40000000,
					ber: "B2",
				},
				selfBuildConfig,
			});
			const rates = [createRate({ rate: 3.5 })];
			const lenders = [createLender({ allowsSelfBuild: true })];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// After month 1: 25% drawn
			expect(result.months[0].cumulativeDrawn).toBe(mortgageAmount * 0.25);

			// After month 4: 60% drawn
			expect(result.months[3].cumulativeDrawn).toBe(mortgageAmount * 0.6);

			// After month 8: 100% drawn
			expect(result.months[7].cumulativeDrawn).toBe(mortgageAmount);
		});

		it("single drawdown at month 1 behaves like immediate full mortgage", () => {
			const mortgageAmount = 25000000;
			const selfBuildConfig: SelfBuildConfig = {
				enabled: true,
				constructionRepaymentType: "interest_only",
				interestOnlyMonths: 0,
				drawdownStages: [
					{ id: "d1", month: 1, amount: mortgageAmount, label: "Full" },
				],
			};

			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 300,
					propertyValue: 30000000,
					ber: "B2",
				},
				selfBuildConfig,
			});
			const rates = [createRate({ rate: 3.5 })];
			const lenders = [createLender({ allowsSelfBuild: true })];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Balance should be full amount from month 1
			expect(result.months[0].openingBalance).toBe(mortgageAmount);
			// No further drawdowns (0 means no drawdown this month)
			expect(result.months[1].drawdownThisMonth).toBe(0);
		});
	});

	describe("interest-only during construction", () => {
		it("pays only interest during construction phase", () => {
			const mortgageAmount = 30000000;
			const selfBuildConfig = createSelfBuildConfig(mortgageAmount);

			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 360,
					propertyValue: 40000000,
					ber: "B2",
				},
				selfBuildConfig,
			});
			const rates = [createRate({ rate: 3.6 })]; // 0.3% monthly
			const lenders = [createLender({ allowsSelfBuild: true })];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// During construction (months 1-8), payments should be interest-only
			for (let i = 0; i < 8; i++) {
				const month = result.months[i];
				expect(month.isInterestOnly).toBe(true);
				expect(month.phase).toBe("construction");
				// Principal portion should be 0 during interest-only
				expect(month.principalPortion).toBe(0);
			}
		});

		it("interest payment grows as balance increases from drawdowns", () => {
			const mortgageAmount = 24000000; // €240k for easy math
			const selfBuildConfig: SelfBuildConfig = {
				enabled: true,
				constructionRepaymentType: "interest_only",
				interestOnlyMonths: 0,
				drawdownStages: [
					{ id: "d1", month: 1, amount: 8000000, label: "Stage 1" }, // €80k
					{ id: "d2", month: 3, amount: 8000000, label: "Stage 2" }, // €80k
					{ id: "d3", month: 5, amount: 8000000, label: "Stage 3" }, // €80k
				],
			};

			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 300,
					propertyValue: 30000000,
					ber: "B2",
				},
				selfBuildConfig,
			});
			const rates = [createRate({ rate: 3.6 })]; // 0.3% monthly
			const lenders = [createLender({ allowsSelfBuild: true })];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Month 1-2: €80k balance → interest ≈ €240/month
			const month1Interest = result.months[0].interestPortion;

			// Month 3-4: €160k balance → interest ≈ €480/month
			const month3Interest = result.months[2].interestPortion;
			expect(month3Interest).toBeGreaterThan(month1Interest);

			// Month 5+: €240k balance → interest ≈ €720/month
			const month5Interest = result.months[4].interestPortion;
			expect(month5Interest).toBeGreaterThan(month3Interest);
		});

		it("no principal reduction during construction", () => {
			const mortgageAmount = 30000000;
			const selfBuildConfig = createSelfBuildConfig(mortgageAmount);

			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 360,
					propertyValue: 40000000,
					ber: "B2",
				},
				selfBuildConfig,
			});
			const rates = [createRate({ rate: 3.5 })];
			const lenders = [createLender({ allowsSelfBuild: true })];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Cumulative principal should be 0 throughout construction
			for (let i = 0; i < 8; i++) {
				expect(result.months[i].cumulativePrincipal).toBe(0);
			}
		});
	});

	describe("interest and capital during construction", () => {
		it("pays principal during construction when configured", () => {
			const mortgageAmount = 30000000;
			const selfBuildConfig = createSelfBuildConfig(mortgageAmount, {
				constructionRepaymentType: "interest_and_capital",
			});

			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 360,
					propertyValue: 40000000,
					ber: "B2",
				},
				selfBuildConfig,
			});
			const rates = [createRate({ rate: 3.5 })];
			const lenders = [createLender({ allowsSelfBuild: true })];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// During construction, should NOT be interest-only
			expect(result.months[0].isInterestOnly).toBe(false);
			expect(result.months[0].principalPortion).toBeGreaterThan(0);
		});

		it("results in less total interest than interest-only mode", () => {
			const mortgageAmount = 30000000;
			const lenders = [createLender({ allowsSelfBuild: true })];
			const rates = [createRate({ rate: 3.5 })];

			// Interest-only during construction
			const interestOnlyConfig = createSelfBuildConfig(mortgageAmount, {
				constructionRepaymentType: "interest_only",
			});
			const interestOnlyState = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 360,
					propertyValue: 40000000,
					ber: "B2",
				},
				selfBuildConfig: interestOnlyConfig,
			});
			const interestOnlyResult = calculateAmortization(
				interestOnlyState,
				rates,
				[],
				lenders,
				[],
			);

			// Interest + capital during construction
			const interestCapitalConfig = createSelfBuildConfig(mortgageAmount, {
				constructionRepaymentType: "interest_and_capital",
			});
			const interestCapitalState = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 360,
					propertyValue: 40000000,
					ber: "B2",
				},
				selfBuildConfig: interestCapitalConfig,
			});
			const interestCapitalResult = calculateAmortization(
				interestCapitalState,
				rates,
				[],
				lenders,
				[],
			);

			const interestOnlyTotal =
				interestOnlyResult.months[interestOnlyResult.months.length - 1]
					.cumulativeInterest;
			const interestCapitalTotal =
				interestCapitalResult.months[interestCapitalResult.months.length - 1]
					.cumulativeInterest;

			expect(interestCapitalTotal).toBeLessThan(interestOnlyTotal);
		});
	});

	describe("interest-only period after construction", () => {
		it("extends interest-only phase after final drawdown", () => {
			const mortgageAmount = 30000000;
			const selfBuildConfig = createSelfBuildConfig(mortgageAmount, {
				interestOnlyMonths: 6, // 6 months interest-only after construction
			});

			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 360,
					propertyValue: 40000000,
					ber: "B2",
				},
				selfBuildConfig,
			});
			const rates = [createRate({ rate: 3.5 })];
			const lenders = [createLender({ allowsSelfBuild: true })];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Construction ends at month 8
			// Interest-only continues through month 14 (8 + 6)
			expect(result.months[7].phase).toBe("construction");
			expect(result.months[8].phase).toBe("interest_only");
			expect(result.months[13].phase).toBe("interest_only");

			// Month 15 (index 14) should start repayment
			expect(result.months[14].phase).toBe("repayment");
			expect(result.months[14].isInterestOnly).toBe(false);
		});

		it("calculates shorter remaining term for repayment phase", () => {
			const mortgageAmount = 30000000;
			const interestOnlyMonths = 12;
			const selfBuildConfig = createSelfBuildConfig(mortgageAmount, {
				interestOnlyMonths,
			});

			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 360,
					propertyValue: 40000000,
					ber: "B2",
				},
				selfBuildConfig,
			});
			const rates = [createRate({ rate: 3.5 })];
			const lenders = [createLender({ allowsSelfBuild: true })];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Construction ends at month 8, plus 12 months interest-only = 20 months
			// Repayment starts at month 21, with 360 - 20 = 340 months remaining
			// Higher payment due to shorter term
			const repaymentStartIndex = 20; // Month 21
			const repaymentPayment =
				result.months[repaymentStartIndex].scheduledPayment;

			// Compare to a standard mortgage (no self-build)
			const standardState = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 360,
					propertyValue: 40000000,
					ber: "B2",
				},
			});
			const standardResult = calculateAmortization(
				standardState,
				rates,
				[],
				lenders,
				[],
			);

			// Self-build repayment should be higher due to shorter term
			expect(repaymentPayment).toBeGreaterThan(
				standardResult.months[0].scheduledPayment,
			);
		});
	});

	describe("phase transitions", () => {
		it("correctly identifies all three phases", () => {
			const mortgageAmount = 30000000;
			const selfBuildConfig = createSelfBuildConfig(mortgageAmount, {
				interestOnlyMonths: 4,
			});

			// Construction: months 1-8
			// Interest-only: months 9-12
			// Repayment: month 13+

			expect(determinePhase(1, selfBuildConfig)).toBe("construction");
			expect(determinePhase(8, selfBuildConfig)).toBe("construction");
			expect(determinePhase(9, selfBuildConfig)).toBe("interest_only");
			expect(determinePhase(12, selfBuildConfig)).toBe("interest_only");
			expect(determinePhase(13, selfBuildConfig)).toBe("repayment");
			expect(determinePhase(100, selfBuildConfig)).toBe("repayment");
		});

		it("skips interest_only phase when interestOnlyMonths is 0", () => {
			const mortgageAmount = 30000000;
			const selfBuildConfig = createSelfBuildConfig(mortgageAmount, {
				interestOnlyMonths: 0,
			});

			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 360,
					propertyValue: 40000000,
					ber: "B2",
				},
				selfBuildConfig,
			});
			const rates = [createRate({ rate: 3.5 })];
			const lenders = [createLender({ allowsSelfBuild: true })];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Month 8 is last construction month
			expect(result.months[7].phase).toBe("construction");
			// Month 9 goes directly to repayment
			expect(result.months[8].phase).toBe("repayment");
		});

		it("payment changes at repayment phase start", () => {
			const mortgageAmount = 30000000;
			const selfBuildConfig = createSelfBuildConfig(mortgageAmount, {
				interestOnlyMonths: 0,
			});

			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 360,
					propertyValue: 40000000,
					ber: "B2",
				},
				selfBuildConfig,
			});
			const rates = [createRate({ rate: 3.5 })];
			const lenders = [createLender({ allowsSelfBuild: true })];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Last construction month (interest-only on full balance)
			const lastConstructionPayment = result.months[7].scheduledPayment;
			// First repayment month (full amortization)
			const firstRepaymentPayment = result.months[8].scheduledPayment;

			// Repayment should be significantly higher (includes principal)
			expect(firstRepaymentPayment).toBeGreaterThan(lastConstructionPayment);
		});
	});

	describe("mortgage completion", () => {
		it("pays off mortgage by end of term", () => {
			const mortgageAmount = 20000000;
			const selfBuildConfig = createSelfBuildConfig(mortgageAmount);

			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 300,
					propertyValue: 25000000,
					ber: "B2",
				},
				selfBuildConfig,
			});
			const rates = [createRate({ rate: 3.5 })];
			const lenders = [createLender({ allowsSelfBuild: true })];

			const result = calculateAmortization(state, rates, [], lenders, []);

			const lastMonth = result.months[result.months.length - 1];
			expect(lastMonth.closingBalance).toBeLessThan(1); // Essentially zero
		});

		it("cumulative principal equals mortgage amount at end", () => {
			const mortgageAmount = 25000000;
			const selfBuildConfig = createSelfBuildConfig(mortgageAmount);

			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 300,
					propertyValue: 30000000,
					ber: "B2",
				},
				selfBuildConfig,
			});
			const rates = [createRate({ rate: 3.5 })];
			const lenders = [createLender({ allowsSelfBuild: true })];

			const result = calculateAmortization(state, rates, [], lenders, []);

			const lastMonth = result.months[result.months.length - 1];
			expect(lastMonth.cumulativePrincipal).toBeCloseTo(mortgageAmount, -2);
		});
	});

	describe("overpayments with self-build", () => {
		it("applies overpayments during construction", () => {
			const mortgageAmount = 30000000;
			const selfBuildConfig = createSelfBuildConfig(mortgageAmount);

			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 360,
					propertyValue: 40000000,
					ber: "B2",
				},
				selfBuildConfig,
				overpaymentConfigs: [
					{
						id: "op1",
						ratePeriodId: "period-1",
						type: "one_time",
						amount: 500000, // €5,000
						startMonth: 5, // During construction
						effect: "reduce_term",
						enabled: true,
					},
				],
			});
			const rates = [createRate({ rate: 3.5 })];
			const lenders = [createLender({ allowsSelfBuild: true })];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Overpayment should be applied in month 5
			expect(result.months[4].overpayment).toBe(500000);
		});

		it("reduces term with overpayments", () => {
			const mortgageAmount = 30000000;
			const selfBuildConfig = createSelfBuildConfig(mortgageAmount);
			const lenders = [createLender({ allowsSelfBuild: true })];
			const rates = [createRate({ rate: 3.5 })];

			// Without overpayments
			const stateNoOverpay = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 360,
					propertyValue: 40000000,
					ber: "B2",
				},
				selfBuildConfig,
			});
			const resultNoOverpay = calculateAmortization(
				stateNoOverpay,
				rates,
				[],
				lenders,
				[],
			);

			// With overpayments
			const stateWithOverpay = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 360,
					propertyValue: 40000000,
					ber: "B2",
				},
				selfBuildConfig,
				overpaymentConfigs: [
					{
						id: "op1",
						ratePeriodId: "period-1",
						type: "recurring",
						frequency: "monthly",
						amount: 50000, // €500/month
						startMonth: 9, // After construction
						effect: "reduce_term",
						enabled: true,
					},
				],
			});
			const resultWithOverpay = calculateAmortization(
				stateWithOverpay,
				rates,
				[],
				lenders,
				[],
			);

			expect(resultWithOverpay.months.length).toBeLessThan(
				resultNoOverpay.months.length,
			);
		});
	});

	describe("maximize overpayment with self-build", () => {
		it("delays max overpayments until after construction", () => {
			const mortgageAmount = 30000000;
			const selfBuildConfig = createSelfBuildConfig(mortgageAmount);
			const constructionEndMonth = getConstructionEndMonth(selfBuildConfig);

			const rate = createRate({
				id: "fixed-3yr",
				type: "fixed",
				fixedTerm: 3,
				rate: 3.5,
			});
			const lender = createLender({
				allowsSelfBuild: true,
				overpaymentPolicy: "test-policy",
			});
			const policy = createPolicy({
				allowanceType: "percentage",
				allowanceValue: 10,
				allowanceBasis: "balance",
			});

			const ratePeriod = createRatePeriod({
				id: "period-1",
				rateId: "fixed-3yr",
				durationMonths: 36,
			});

			const resolvedPeriod = resolveRatePeriod(
				ratePeriod,
				1, // startMonth
				[rate],
				[],
				[lender],
			);
			expect(resolvedPeriod).toBeDefined();
			if (!resolvedPeriod) return;

			const plans = calculateYearlyOverpaymentPlans(
				policy,
				resolvedPeriod,
				mortgageAmount,
				360,
				"2025-01-01",
				constructionEndMonth, // Pass construction end month
			);

			// Plans should start after construction (month 8), not month 1
			expect(plans.length).toBeGreaterThan(0);
			expect(plans[0].startMonth).toBe(constructionEndMonth + 1);
		});

		it("starts overpayments at month 1 when no construction", () => {
			const mortgageAmount = 30000000;

			const rate = createRate({
				id: "fixed-3yr",
				type: "fixed",
				fixedTerm: 3,
				rate: 3.5,
			});
			const lender = createLender({
				overpaymentPolicy: "test-policy",
			});
			const policy = createPolicy({
				allowanceType: "percentage",
				allowanceValue: 10,
				allowanceBasis: "balance",
			});

			const ratePeriod = createRatePeriod({
				id: "period-1",
				rateId: "fixed-3yr",
				durationMonths: 36,
			});

			const resolvedPeriod = resolveRatePeriod(
				ratePeriod,
				1,
				[rate],
				[],
				[lender],
			);
			expect(resolvedPeriod).toBeDefined();
			if (!resolvedPeriod) return;

			// No constructionEndMonth passed
			const plans = calculateYearlyOverpaymentPlans(
				policy,
				resolvedPeriod,
				mortgageAmount,
				360,
				"2025-01-01",
			);

			// Plans should start at month 1
			expect(plans[0].startMonth).toBe(1);
		});
	});

	describe("extra interest calculation", () => {
		it("calculates extra interest from interest-only vs interest-and-capital", () => {
			const mortgageAmount = 30000000;
			const lenders = [createLender({ allowsSelfBuild: true })];
			const rates = [createRate({ rate: 3.5 })];
			const ratePeriods = [createRatePeriod()];

			// Build resolved periods map
			const resolvedPeriods = new Map();
			const resolved = resolveRatePeriod(ratePeriods[0], 1, rates, [], lenders);
			if (resolved) {
				resolvedPeriods.set(ratePeriods[0].id, resolved);
			}

			// Interest-only baseline
			const interestOnlyConfig = createSelfBuildConfig(mortgageAmount, {
				constructionRepaymentType: "interest_only",
			});
			const interestOnlyBaseline = calculateBaselineInterest(
				mortgageAmount,
				360,
				ratePeriods,
				resolvedPeriods,
				interestOnlyConfig,
			);

			// Interest + capital baseline
			const interestCapitalConfig = createSelfBuildConfig(mortgageAmount, {
				constructionRepaymentType: "interest_and_capital",
			});
			const interestCapitalBaseline = calculateBaselineInterest(
				mortgageAmount,
				360,
				ratePeriods,
				resolvedPeriods,
				interestCapitalConfig,
			);

			// Interest-only should cost more
			expect(interestOnlyBaseline).toBeGreaterThan(interestCapitalBaseline);

			// Calculate summary with extra interest
			const interestOnlyState = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 360,
					propertyValue: 40000000,
					ber: "B2",
				},
				selfBuildConfig: interestOnlyConfig,
			});
			const result = calculateAmortization(
				interestOnlyState,
				rates,
				[],
				lenders,
				[],
			);

			const summary = calculateSummary(
				result.months,
				interestOnlyBaseline,
				360,
				interestCapitalBaseline,
			);

			// Extra interest should be positive (interest_only costs more)
			expect(summary.extraInterestFromSelfBuild).toBeGreaterThan(0);
		});
	});

	describe("edge cases", () => {
		it("handles drawdown in same month as rate change", () => {
			const mortgageAmount = 30000000;
			const selfBuildConfig: SelfBuildConfig = {
				enabled: true,
				constructionRepaymentType: "interest_only",
				interestOnlyMonths: 0,
				drawdownStages: [
					{ id: "d1", month: 1, amount: mortgageAmount * 0.5 },
					{ id: "d2", month: 36, amount: mortgageAmount * 0.5 }, // Same month as rate change
				],
			};

			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 360,
					propertyValue: 40000000,
					ber: "B2",
				},
				selfBuildConfig,
				ratePeriods: [
					createRatePeriod({
						id: "period-1",
						rateId: "fixed-3yr",
						durationMonths: 36,
					}),
					createRatePeriod({
						id: "period-2",
						rateId: "variable",
						durationMonths: 0,
					}),
				],
			});
			const rates = [
				createRate({ id: "fixed-3yr", rate: 3.0, type: "fixed", fixedTerm: 3 }),
				createRate({ id: "variable", rate: 4.0, type: "variable" }),
			];
			const lenders = [createLender({ allowsSelfBuild: true })];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Should handle both events in month 36
			expect(result.months[35].drawdownThisMonth).toBe(mortgageAmount * 0.5);
			expect(result.months.length).toBeGreaterThan(36);
		});

		it("handles very long construction period", () => {
			const mortgageAmount = 30000000;
			const selfBuildConfig: SelfBuildConfig = {
				enabled: true,
				constructionRepaymentType: "interest_only",
				interestOnlyMonths: 0,
				drawdownStages: [
					{ id: "d1", month: 1, amount: mortgageAmount * 0.2 },
					{ id: "d2", month: 12, amount: mortgageAmount * 0.3 },
					{ id: "d3", month: 24, amount: mortgageAmount * 0.5 }, // 2 years construction
				],
			};

			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 360,
					propertyValue: 40000000,
					ber: "B2",
				},
				selfBuildConfig,
			});
			const rates = [createRate({ rate: 3.5 })];
			const lenders = [createLender({ allowsSelfBuild: true })];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// Should complete without errors
			expect(result.months.length).toBe(360);
			// Should be in construction for 24 months
			expect(result.months[23].phase).toBe("construction");
			expect(result.months[24].phase).toBe("repayment");
		});

		it("validates isSelfBuildActive correctly", () => {
			expect(isSelfBuildActive(undefined)).toBe(false);
			expect(
				isSelfBuildActive({
					enabled: false,
					constructionRepaymentType: "interest_only",
					interestOnlyMonths: 0,
					drawdownStages: [],
				}),
			).toBe(false);
			expect(
				isSelfBuildActive({
					enabled: true,
					constructionRepaymentType: "interest_only",
					interestOnlyMonths: 0,
					drawdownStages: [], // No stages
				}),
			).toBe(false);
			expect(
				isSelfBuildActive({
					enabled: true,
					constructionRepaymentType: "interest_only",
					interestOnlyMonths: 0,
					drawdownStages: [{ id: "d1", month: 1, amount: 100000 }],
				}),
			).toBe(true);
		});

		it("handles interest-only months with interest_and_capital construction type", () => {
			const mortgageAmount = 30000000;
			const selfBuildConfig = createSelfBuildConfig(mortgageAmount, {
				constructionRepaymentType: "interest_and_capital",
				interestOnlyMonths: 6, // Still have interest-only AFTER construction
			});

			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 360,
					propertyValue: 40000000,
					ber: "B2",
				},
				selfBuildConfig,
			});
			const rates = [createRate({ rate: 3.5 })];
			const lenders = [createLender({ allowsSelfBuild: true })];

			const result = calculateAmortization(state, rates, [], lenders, []);

			// During construction: NOT interest-only (interest_and_capital)
			expect(result.months[0].isInterestOnly).toBe(false);
			expect(result.months[0].phase).toBe("construction");

			// After construction, during interest-only period: IS interest-only
			expect(result.months[8].isInterestOnly).toBe(true);
			expect(result.months[8].phase).toBe("interest_only");

			// After interest-only period: NOT interest-only
			expect(result.months[14].isInterestOnly).toBe(false);
			expect(result.months[14].phase).toBe("repayment");
		});
	});

	describe("helper functions", () => {
		it("getConstructionEndMonth returns final drawdown month", () => {
			const config: SelfBuildConfig = {
				enabled: true,
				constructionRepaymentType: "interest_only",
				interestOnlyMonths: 0,
				drawdownStages: [
					{ id: "d1", month: 1, amount: 100000 },
					{ id: "d2", month: 5, amount: 100000 },
					{ id: "d3", month: 10, amount: 100000 },
				],
			};

			expect(getConstructionEndMonth(config)).toBe(10);
		});

		it("getInterestOnlyEndMonth includes interest-only months", () => {
			const config: SelfBuildConfig = {
				enabled: true,
				constructionRepaymentType: "interest_only",
				interestOnlyMonths: 6,
				drawdownStages: [
					{ id: "d1", month: 1, amount: 100000 },
					{ id: "d2", month: 8, amount: 100000 },
				],
			};

			// Final drawdown at month 8 + 6 interest-only = 14
			expect(getInterestOnlyEndMonth(config)).toBe(14);
		});
	});
});
