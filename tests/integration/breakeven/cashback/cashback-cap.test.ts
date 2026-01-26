/**
 * Cashback cap scenarios for cashback breakeven.
 *
 * Tests percentage caps on cashback amounts.
 */

import { describe, expect, it } from "vitest";
import {
	type CashbackBreakevenInputs,
	calculateCashbackBreakeven,
} from "@/lib/mortgage/breakeven";

describe("Cashback cap scenarios", () => {
	it("applies percentage cap correctly", () => {
		const inputs: CashbackBreakevenInputs = {
			mortgageAmount: 600000,
			mortgageTermMonths: 300,
			options: [
				{
					label: "Capped Cashback",
					rate: 3.9,
					cashbackType: "percentage",
					cashbackValue: 2, // Would be €12,000 but capped
					cashbackCap: 10000,
					fixedPeriodYears: 3,
				},
			],
		};

		const result = calculateCashbackBreakeven(inputs);

		// 2% of €600k = €12,000, but capped at €10,000
		expect(result.options[0].cashbackAmount).toBe(10000);
	});

	it("cap not applied when under limit", () => {
		const inputs: CashbackBreakevenInputs = {
			mortgageAmount: 300000,
			mortgageTermMonths: 300,
			options: [
				{
					label: "Under Cap",
					rate: 3.9,
					cashbackType: "percentage",
					cashbackValue: 2, // €6,000
					cashbackCap: 10000, // Cap higher than earned
					fixedPeriodYears: 3,
				},
			],
		};

		const result = calculateCashbackBreakeven(inputs);

		expect(result.options[0].cashbackAmount).toBe(6000);
	});

	it("compares capped vs uncapped options fairly", () => {
		const inputs: CashbackBreakevenInputs = {
			mortgageAmount: 500000,
			mortgageTermMonths: 300,
			options: [
				{
					label: "2% Capped at €8k",
					rate: 3.8,
					cashbackType: "percentage",
					cashbackValue: 2,
					cashbackCap: 8000,
					fixedPeriodYears: 4,
				},
				{
					label: "1.5% No Cap",
					rate: 3.75,
					cashbackType: "percentage",
					cashbackValue: 1.5, // €7,500
					fixedPeriodYears: 4,
				},
			],
		};

		const result = calculateCashbackBreakeven(inputs);

		// 2% capped = €8,000
		expect(result.options[0].cashbackAmount).toBe(8000);
		// 1.5% uncapped = €7,500
		expect(result.options[1].cashbackAmount).toBe(7500);

		// Higher cashback but higher rate - which wins?
		expect(result.cheapestNetCostIndex).toBeDefined();
	});
});
