/**
 * Timeline analysis for Rent vs Buy breakeven.
 *
 * Tests yearly breakdown and progression over time.
 */

import { describe, expect, it } from "vitest";
import {
	calculateRentVsBuyBreakeven,
	type RentVsBuyInputs,
} from "@/lib/mortgage/breakeven";
import {
	DUBLIN_SCENARIOS,
	RATE_SCENARIOS,
	REGIONAL_SCENARIOS,
} from "../fixtures";

describe("Rent vs Buy timeline analysis", () => {
	it("provides complete yearly breakdown for full term", () => {
		const { propertyValue, monthlyRent, deposit } =
			REGIONAL_SCENARIOS.galwayHouse;
		const termYears = 25;
		const inputs: RentVsBuyInputs = {
			propertyValue,
			deposit,
			mortgageTermMonths: termYears * 12,
			mortgageRate: RATE_SCENARIOS.mid.rate,
			currentMonthlyRent: monthlyRent,
		};

		const result = calculateRentVsBuyBreakeven(inputs);

		expect(result.yearlyBreakdown).toHaveLength(termYears);

		// Verify progression over time
		const year5 = result.yearlyBreakdown[4];
		const year15 = result.yearlyBreakdown[14];
		const year25 = result.yearlyBreakdown[24];

		// Home value should increase
		expect(year15.homeValue).toBeGreaterThan(year5.homeValue);
		expect(year25.homeValue).toBeGreaterThan(year15.homeValue);

		// Mortgage balance should decrease
		expect(year15.mortgageBalance).toBeLessThan(year5.mortgageBalance);
		expect(year25.mortgageBalance).toBeLessThan(year15.mortgageBalance);

		// Equity should grow significantly
		expect(year25.equity).toBeGreaterThan(year15.equity);
	});

	it("cumulative rent grows with inflation", () => {
		const { propertyValue, monthlyRent, deposit } =
			DUBLIN_SCENARIOS.suburban2Bed;
		const inputs: RentVsBuyInputs = {
			propertyValue,
			deposit,
			mortgageTermMonths: 360,
			mortgageRate: RATE_SCENARIOS.mid.rate,
			currentMonthlyRent: monthlyRent,
			rentInflationRate: 3, // 3% annual rent increase
		};

		const result = calculateRentVsBuyBreakeven(inputs);

		const year1 = result.yearlyBreakdown[0];
		const year10 = result.yearlyBreakdown[9];

		// First year rent ≈ €26,400 (€2,200 * 12)
		expect(year1.cumulativeRent).toBeCloseTo(26400, -2);

		// Year 10 cumulative should show compounding effect
		// Much more than 10 * €26,400 due to annual increases
		expect(year10.cumulativeRent).toBeGreaterThan(year1.cumulativeRent * 10);
	});
});
