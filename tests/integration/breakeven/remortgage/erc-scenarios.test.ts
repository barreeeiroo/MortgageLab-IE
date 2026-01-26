/**
 * Early repayment charge scenarios for remortgage.
 *
 * Tests impact of ERC on switching decision.
 */

import { describe, expect, it } from "vitest";
import {
	calculateRemortgageBreakeven,
	type RemortgageInputs,
} from "@/lib/mortgage/breakeven";
import { REMORTGAGE_SCENARIOS } from "../fixtures";

describe("Remortgage early repayment charge scenarios", () => {
	it("ERC delays breakeven significantly", () => {
		const scenario = REMORTGAGE_SCENARIOS.lenderSwitch;

		const withoutErc = calculateRemortgageBreakeven(scenario);
		const withErc = calculateRemortgageBreakeven({
			...scenario,
			erc: 5000, // €5k ERC
		});

		// ERC adds to switching costs
		expect(withErc.switchingCosts).toBe(withoutErc.switchingCosts + 5000);

		// Much longer to break even
		expect(withErc.breakevenMonths).toBeGreaterThan(
			withoutErc.breakevenMonths + 24,
		);
	});

	it("high ERC may make switching not worthwhile", () => {
		const inputs: RemortgageInputs = {
			outstandingBalance: 200000,
			currentRate: 4.0,
			newRate: 3.7, // 0.3% improvement
			remainingTermMonths: 120, // Only 10 years left
			erc: 6000, // €6k ERC
		};

		const result = calculateRemortgageBreakeven(inputs);

		// Small rate improvement + high ERC + short remaining term
		// May take most of the remaining term to break even
		expect(result.breakevenMonths).toBeGreaterThan(60);

		// Net benefit may be minimal or negative
		expect(result.interestSavingsDetails.netBenefit).toBeLessThan(5000);
	});

	it("ERC vs cashback tradeoff", () => {
		const baseInputs: RemortgageInputs = {
			outstandingBalance: 300000,
			currentRate: 4.2,
			newRate: 3.5,
			remainingTermMonths: 240,
			erc: 3000,
		};

		const withErcOnly = calculateRemortgageBreakeven(baseInputs);
		const withCashbackToo = calculateRemortgageBreakeven({
			...baseInputs,
			cashback: 2000, // Cashback partially offsets ERC
		});

		// Cashback offsets some of the ERC
		expect(withCashbackToo.switchingCosts).toBe(
			withErcOnly.switchingCosts - 2000,
		);

		// Still worthwhile overall
		expect(withCashbackToo.interestSavingsDetails.netBenefit).toBeGreaterThan(
			0,
		);
	});
});
