/**
 * Income-constrained scenarios for Buy to Let.
 *
 * BTL rules (Central Bank of Ireland):
 * - LTI limit: 3.5x gross income
 */

import { describe, expect, it } from "vitest";
import {
	calculateMaxMortgageByLTI,
	INCOME_SCENARIOS,
	LTI_LIMITS,
} from "../fixtures";

describe("BTL income-constrained scenarios", () => {
	const BTL_LTI = LTI_LIMITS.BTL; // 3.5x

	it("single earner €80k can borrow up to €280k", () => {
		const { income1 } = INCOME_SCENARIOS.single80k;
		const totalIncome = income1;

		const maxMortgage = calculateMaxMortgageByLTI(totalIncome, BTL_LTI);

		expect(maxMortgage).toBe(280000);
	});

	it("joint earners €130k can borrow up to €455k", () => {
		const { income1, income2 } = INCOME_SCENARIOS.joint130k;
		const totalIncome = income1 + income2;

		const maxMortgage = calculateMaxMortgageByLTI(totalIncome, BTL_LTI);

		expect(maxMortgage).toBe(455000);
	});
});
