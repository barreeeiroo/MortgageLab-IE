/**
 * Lending ratio calculations for First Time Buyer.
 *
 * Tests LTV and LTI calculation accuracy.
 */

import { describe, expect, it } from "vitest";
import { calculateMortgageMetrics } from "@/lib/utils/borrowing";
import {
	calculateMaxMortgageByLTI,
	INCOME_SCENARIOS,
	LTI_LIMITS,
	LTV_LIMITS,
	PROPERTY_VALUES,
} from "../fixtures";

describe("FTB lending ratio calculations", () => {
	const FTB_LTI = LTI_LIMITS.FTB; // 4x
	const FTB_LTV = LTV_LIMITS.FTB; // 90%

	it("calculates LTV and LTI correctly for typical purchase", () => {
		const { income1, income2 } = INCOME_SCENARIOS.joint90k;
		const totalIncome = income1 + income2; // €90k
		const propertyValue = PROPERTY_VALUES.average; // €400k
		const deposit = 50000; // €50k deposit
		const mortgageAmount = propertyValue - deposit; // €350k

		const metrics = calculateMortgageMetrics(
			mortgageAmount,
			propertyValue,
			totalIncome,
		);

		expect(metrics.ltv).toBeCloseTo(87.5, 1); // 350k/400k = 87.5%
		expect(metrics.lti).toBeCloseTo(3.89, 1); // 350k/90k = 3.89x
	});

	it("rejects purchase that exceeds LTI limit", () => {
		const { income1 } = INCOME_SCENARIOS.single50k;
		const totalIncome = income1; // €50k
		const propertyValue = PROPERTY_VALUES.dublin; // €500k
		const deposit = 50000;
		const mortgageAmount = propertyValue - deposit; // €450k

		const metrics = calculateMortgageMetrics(
			mortgageAmount,
			propertyValue,
			totalIncome,
		);

		expect(metrics.lti).toBe(9); // 450k/50k = 9x - way over 4x limit
		expect(metrics.lti).toBeGreaterThan(FTB_LTI);
	});

	it("accepts purchase at exactly LTI limit", () => {
		const { income1 } = INCOME_SCENARIOS.single80k;
		const totalIncome = income1; // €80k
		const mortgageAmount = calculateMaxMortgageByLTI(totalIncome, FTB_LTI); // €320k
		const deposit = mortgageAmount / (FTB_LTV / 100) - mortgageAmount;
		const propertyValue = mortgageAmount + deposit;

		const metrics = calculateMortgageMetrics(
			mortgageAmount,
			propertyValue,
			totalIncome,
		);

		expect(metrics.lti).toBeCloseTo(FTB_LTI, 1);
		expect(metrics.ltv).toBeCloseTo(FTB_LTV, 1);
	});
});
