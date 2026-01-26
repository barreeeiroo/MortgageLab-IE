/**
 * Stress testing scenarios for Buy to Let.
 *
 * Tests rental coverage at stress rates.
 */

import { describe, expect, it } from "vitest";
import {
	calculateMaxMortgageByLTV,
	LTV_LIMITS,
	RENTAL_SCENARIOS,
} from "../fixtures";

describe("BTL stress testing", () => {
	const BTL_LTV = LTV_LIMITS.BTL; // 70%

	it("rent should cover mortgage at stress rate", () => {
		const { monthlyRent, propertyValue } = RENTAL_SCENARIOS.dublinSuburbs;
		const mortgageAmount = calculateMaxMortgageByLTV(propertyValue, BTL_LTV);

		// Typical stress test: rent must cover 125% of interest at stress rate (e.g., 5.5%)
		const stressRate = 5.5;
		const monthlyInterestAtStress = (mortgageAmount * (stressRate / 100)) / 12;
		const stressedPayment = monthlyInterestAtStress * 1.25;

		expect(mortgageAmount).toBe(280000);
		expect(monthlyInterestAtStress).toBeCloseTo(1283, 0);
		expect(stressedPayment).toBeCloseTo(1604, 0);
		expect(monthlyRent).toBeGreaterThan(stressedPayment);
	});

	it("lower rent may fail stress test", () => {
		const propertyValue = 500000;
		const monthlyRent = 1800; // Below market rate
		const mortgageAmount = calculateMaxMortgageByLTV(propertyValue, BTL_LTV);

		const stressRate = 5.5;
		const monthlyInterestAtStress = (mortgageAmount * (stressRate / 100)) / 12;
		const stressedPayment = monthlyInterestAtStress * 1.25;

		expect(mortgageAmount).toBe(350000);
		expect(monthlyInterestAtStress).toBeCloseTo(1604, 0);
		expect(stressedPayment).toBeCloseTo(2005, 0);
		expect(monthlyRent).toBeLessThan(stressedPayment);
	});
});
