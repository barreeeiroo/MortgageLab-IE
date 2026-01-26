/**
 * Income-constrained scenarios for Home Mover.
 *
 * Home Mover rules (Central Bank of Ireland):
 * - LTI limit: 3.5x gross income
 */

import { describe, expect, it } from "vitest";
import {
	calculateMaxMortgageByLTI,
	INCOME_SCENARIOS,
	LTI_LIMITS,
} from "../fixtures";

describe("Home Mover income-constrained scenarios", () => {
	const MOVER_LTI = LTI_LIMITS.MOVER; // 3.5x

	it("single earner €80k can borrow up to €280k", () => {
		const { income1 } = INCOME_SCENARIOS.single80k;
		const totalIncome = income1;

		const maxMortgage = calculateMaxMortgageByLTI(totalIncome, MOVER_LTI);

		expect(maxMortgage).toBe(280000);
	});

	it("joint earners €130k can borrow up to €455k", () => {
		const { income1, income2 } = INCOME_SCENARIOS.joint130k;
		const totalIncome = income1 + income2;

		const maxMortgage = calculateMaxMortgageByLTI(totalIncome, MOVER_LTI);

		expect(maxMortgage).toBe(455000);
	});

	it("mover gets lower LTI than FTB for same income", () => {
		const totalIncome = 100000;

		const ftbMax = totalIncome * LTI_LIMITS.FTB;
		const moverMax = totalIncome * MOVER_LTI;

		expect(ftbMax).toBe(400000);
		expect(moverMax).toBe(350000);
		expect(moverMax).toBeLessThan(ftbMax);
	});
});
