/**
 * Deposit-constrained scenarios for First Time Buyer.
 *
 * FTB rules (Central Bank of Ireland):
 * - LTV limit: 90% (10% minimum deposit)
 */

import { describe, expect, it } from "vitest";
import {
	calculateMaxMortgageByLTI,
	calculateMaxMortgageByLTV,
	calculateRequiredDeposit,
	INCOME_SCENARIOS,
	LTI_LIMITS,
	LTV_LIMITS,
	PROPERTY_VALUES,
} from "../fixtures";

describe("FTB deposit-constrained scenarios", () => {
	const FTB_LTI = LTI_LIMITS.FTB; // 4x
	const FTB_LTV = LTV_LIMITS.FTB; // 90%

	it("calculates minimum 10% deposit for FTB", () => {
		const propertyValue = PROPERTY_VALUES.average; // €400k

		const minDeposit = calculateRequiredDeposit(propertyValue, FTB_LTV);
		const maxMortgage = calculateMaxMortgageByLTV(propertyValue, FTB_LTV);

		// 10% of €400k = €40k deposit
		// 90% of €400k = €360k mortgage
		expect(minDeposit).toBeCloseTo(40000, 0);
		expect(maxMortgage).toBeCloseTo(360000, 0);
	});

	it("buyer with savings can afford expensive property but limited by income", () => {
		const { income1, income2 } = INCOME_SCENARIOS.joint90k;
		const totalIncome = income1 + income2; // €90k
		const savings = 100000; // Has €100k saved

		const maxMortgageByIncome = calculateMaxMortgageByLTI(totalIncome, FTB_LTI);
		// €360k max mortgage, plus €100k deposit = €460k max property by income

		const targetProperty = PROPERTY_VALUES.dublin; // €500k
		const requiredDeposit = calculateRequiredDeposit(targetProperty, FTB_LTV);
		// €50k deposit needed for €500k property

		const requiredMortgage = targetProperty - savings;
		// Would need €400k mortgage

		// Income limits them to €360k mortgage
		expect(maxMortgageByIncome).toBeLessThan(requiredMortgage);
		expect(savings).toBeGreaterThan(requiredDeposit);
		// They have enough deposit but not enough income
	});

	it("buyer limited by savings despite adequate income", () => {
		const { income1 } = INCOME_SCENARIOS.single120k;
		const totalIncome = income1; // €120k
		const savings = 30000; // Only €30k saved

		const maxMortgageByIncome = calculateMaxMortgageByLTI(totalIncome, FTB_LTI);
		// €480k max mortgage

		// Max property they can buy with €30k deposit (10% deposit rule)
		const maxPropertyBySavings = savings / (1 - FTB_LTV / 100);
		// €30k / 0.1 = €300k max property

		const maxMortgageBySavings = maxPropertyBySavings - savings;
		// €270k mortgage

		expect(maxMortgageBySavings).toBeLessThan(maxMortgageByIncome);
		// Savings constrain them to €270k mortgage despite €480k income capacity
	});
});
