/**
 * Fixed period comparison logic for cashback breakeven.
 *
 * Tests how comparison periods are determined.
 */

import { describe, expect, it } from "vitest";
import {
	type CashbackBreakevenInputs,
	calculateCashbackBreakeven,
} from "@/lib/mortgage/breakeven";

describe("Cashback fixed period comparison logic", () => {
	it("uses max fixed period when options differ", () => {
		const inputs: CashbackBreakevenInputs = {
			mortgageAmount: 350000,
			mortgageTermMonths: 300,
			options: [
				{
					label: "2 Year Fixed",
					rate: 3.8,
					cashbackType: "percentage",
					cashbackValue: 1,
					fixedPeriodYears: 2,
				},
				{
					label: "5 Year Fixed",
					rate: 4.0,
					cashbackType: "percentage",
					cashbackValue: 2,
					fixedPeriodYears: 5,
				},
			],
		};

		const result = calculateCashbackBreakeven(inputs);

		// Compare over longest fixed period
		expect(result.comparisonPeriodMonths).toBe(60);
		expect(result.allVariable).toBe(false);
	});

	it("uses full term when all options are variable", () => {
		const inputs: CashbackBreakevenInputs = {
			mortgageAmount: 300000,
			mortgageTermMonths: 240, // 20 years
			options: [
				{
					label: "Variable A",
					rate: 3.8,
					cashbackType: "percentage",
					cashbackValue: 1,
					// No fixedPeriodYears = variable
				},
				{
					label: "Variable B",
					rate: 3.6,
					cashbackType: "flat",
					cashbackValue: 2000,
				},
			],
		};

		const result = calculateCashbackBreakeven(inputs);

		expect(result.allVariable).toBe(true);
		expect(result.comparisonPeriodMonths).toBe(240);
	});

	it("mixed fixed and variable uses fixed period", () => {
		const inputs: CashbackBreakevenInputs = {
			mortgageAmount: 350000,
			mortgageTermMonths: 300,
			options: [
				{
					label: "3 Year Fixed",
					rate: 3.7,
					cashbackType: "percentage",
					cashbackValue: 1.5,
					fixedPeriodYears: 3,
				},
				{
					label: "Variable",
					rate: 4.2,
					cashbackType: "flat",
					cashbackValue: 3000,
					fixedPeriodYears: 0, // Explicitly variable
				},
			],
		};

		const result = calculateCashbackBreakeven(inputs);

		expect(result.allVariable).toBe(false);
		expect(result.comparisonPeriodMonths).toBe(36);
	});
});
