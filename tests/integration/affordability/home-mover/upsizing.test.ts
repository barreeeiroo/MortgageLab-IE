/**
 * Upsizing scenarios for Home Mover.
 *
 * Tests trading up to larger/more expensive property.
 */

import { describe, expect, it } from "vitest";
import { calculateMortgageMetrics } from "@/lib/utils/borrowing";
import {
	calculateMaxMortgageByLTI,
	calculateRequiredDeposit,
	EQUITY_SCENARIOS,
	INCOME_SCENARIOS,
	LTI_LIMITS,
	LTV_LIMITS,
	PROPERTY_VALUES,
} from "../fixtures";

describe("Home Mover upsizing scenarios", () => {
	const MOVER_LTI = LTI_LIMITS.MOVER; // 3.5x
	const MOVER_LTV = LTV_LIMITS.MOVER; // 90%

	it("trading up with good equity position", () => {
		const { income1, income2 } = INCOME_SCENARIOS.joint130k;
		const totalIncome = income1 + income2; // €130k
		const { equity } = EQUITY_SCENARIOS.goodEquity;
		const targetProperty = PROPERTY_VALUES.premium; // €600k

		const maxMortgageByIncome = calculateMaxMortgageByLTI(
			totalIncome,
			MOVER_LTI,
		);
		const requiredDeposit = calculateRequiredDeposit(targetProperty, MOVER_LTV);
		const mortgageNeeded = targetProperty - equity;

		expect(maxMortgageByIncome).toBe(455000);
		expect(requiredDeposit).toBeCloseTo(60000, 0);
		expect(equity).toBeGreaterThan(requiredDeposit);
		expect(mortgageNeeded).toBe(300000);
		expect(mortgageNeeded).toBeLessThan(maxMortgageByIncome);

		const metrics = calculateMortgageMetrics(
			mortgageNeeded,
			targetProperty,
			totalIncome,
		);
		expect(metrics.ltv).toBe(50); // 300k/600k
		expect(metrics.lti).toBeCloseTo(2.31, 1); // Well under 3.5x
	});

	it("trading up limited by income despite good equity", () => {
		const { income1 } = INCOME_SCENARIOS.single80k;
		const totalIncome = income1; // €80k
		const { equity } = EQUITY_SCENARIOS.noMortgage; // €400k equity
		const targetProperty = PROPERTY_VALUES.luxury; // €800k

		const maxMortgageByIncome = calculateMaxMortgageByLTI(
			totalIncome,
			MOVER_LTI,
		);
		const mortgageNeeded = targetProperty - equity;

		expect(maxMortgageByIncome).toBe(280000);
		expect(mortgageNeeded).toBe(400000);
		expect(mortgageNeeded).toBeGreaterThan(maxMortgageByIncome);
		// Even with €400k equity, income limits the purchase
	});

	it("moderate equity position stretches the budget", () => {
		const { income1, income2 } = INCOME_SCENARIOS.joint90k;
		const totalIncome = income1 + income2; // €90k
		const { equity } = EQUITY_SCENARIOS.moderateEquity; // €150k

		const maxMortgageByIncome = calculateMaxMortgageByLTI(
			totalIncome,
			MOVER_LTI,
		);
		const maxPropertyWithEquity = maxMortgageByIncome + equity;

		expect(maxMortgageByIncome).toBe(315000);
		expect(maxPropertyWithEquity).toBe(465000);
	});
});
