/**
 * Edge cases for cashback comparison.
 *
 * Tests boundary conditions and unusual scenarios.
 */

import { describe, expect, it } from "vitest";
import {
	type CashbackBreakevenInputs,
	calculateCashbackBreakeven,
} from "@/lib/mortgage/breakeven";

describe("Cashback edge cases", () => {
	it("handles zero cashback for all options", () => {
		const inputs: CashbackBreakevenInputs = {
			mortgageAmount: 300000,
			mortgageTermMonths: 300,
			options: [
				{
					label: "Rate A",
					rate: 3.5,
					cashbackType: "flat",
					cashbackValue: 0,
					fixedPeriodYears: 3,
				},
				{
					label: "Rate B",
					rate: 3.7,
					cashbackType: "flat",
					cashbackValue: 0,
					fixedPeriodYears: 3,
				},
			],
		};

		const result = calculateCashbackBreakeven(inputs);

		// Pure rate comparison
		expect(result.options[0].cashbackAmount).toBe(0);
		expect(result.options[1].cashbackAmount).toBe(0);

		// Lower rate always wins
		expect(result.cheapestNetCostIndex).toBe(0);
	});

	it("handles same rate different cashback", () => {
		const inputs: CashbackBreakevenInputs = {
			mortgageAmount: 350000,
			mortgageTermMonths: 300,
			options: [
				{
					label: "High Cashback",
					rate: 3.8,
					cashbackType: "percentage",
					cashbackValue: 2,
					fixedPeriodYears: 3,
				},
				{
					label: "Low Cashback",
					rate: 3.8,
					cashbackType: "percentage",
					cashbackValue: 1,
					fixedPeriodYears: 3,
				},
			],
		};

		const result = calculateCashbackBreakeven(inputs);

		// Same rate means same payment
		expect(result.options[0].monthlyPayment).toBe(
			result.options[1].monthlyPayment,
		);

		// More cashback = better deal (lower net cost)
		expect(result.cheapestNetCostIndex).toBe(0);
	});

	it("handles very short mortgage term", () => {
		const inputs: CashbackBreakevenInputs = {
			mortgageAmount: 200000,
			mortgageTermMonths: 60, // 5 years
			options: [
				{
					label: "5yr Fixed",
					rate: 3.7,
					cashbackType: "percentage",
					cashbackValue: 1,
					fixedPeriodYears: 5,
				},
			],
		};

		const result = calculateCashbackBreakeven(inputs);

		expect(result.comparisonPeriodMonths).toBe(60);
		expect(result.yearlyBreakdown).toHaveLength(5);

		// Balance should be 0 at end
		expect(result.options[0].balanceAtEnd).toBe(0);
	});

	it("handles up to 5 options", () => {
		const inputs: CashbackBreakevenInputs = {
			mortgageAmount: 300000,
			mortgageTermMonths: 300,
			options: [
				{
					label: "A",
					rate: 3.5,
					cashbackType: "flat",
					cashbackValue: 0,
					fixedPeriodYears: 3,
				},
				{
					label: "B",
					rate: 3.6,
					cashbackType: "percentage",
					cashbackValue: 0.5,
					fixedPeriodYears: 3,
				},
				{
					label: "C",
					rate: 3.7,
					cashbackType: "percentage",
					cashbackValue: 1,
					fixedPeriodYears: 3,
				},
				{
					label: "D",
					rate: 3.8,
					cashbackType: "percentage",
					cashbackValue: 1.5,
					fixedPeriodYears: 3,
				},
				{
					label: "E",
					rate: 3.9,
					cashbackType: "percentage",
					cashbackValue: 2,
					fixedPeriodYears: 3,
				},
			],
		};

		const result = calculateCashbackBreakeven(inputs);

		expect(result.options).toHaveLength(5);
		// 5 choose 2 = 10 pairwise breakevens
		expect(result.breakevens).toHaveLength(10);
	});
});
