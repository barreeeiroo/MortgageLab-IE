import { describe, expect, it } from "vitest";
import {
	calculateMonthlyPayment,
	calculateRemainingBalance,
} from "../calculations";

describe("calculateMonthlyPayment", () => {
	describe("standard calculations", () => {
		const testCases = [
			{ principal: 300000, rate: 3.5, months: 360, expected: 1347.13 },
			{ principal: 300000, rate: 4.0, months: 300, expected: 1583.51 },
			{ principal: 250000, rate: 5.5, months: 240, expected: 1719.72 },
			{ principal: 100000, rate: 3.0, months: 180, expected: 690.58 },
		];

		it.each(
			testCases,
		)("calculates €$principal at $rate% over $months months = €$expected", ({
			principal,
			rate,
			months,
			expected,
		}) => {
			const result = calculateMonthlyPayment(principal, rate, months);
			expect(result).toBeCloseTo(expected, 2);
		});
	});

	describe("zero interest rate", () => {
		it("divides principal evenly when rate is 0%", () => {
			expect(calculateMonthlyPayment(120000, 0, 120)).toBe(1000);
			expect(calculateMonthlyPayment(240000, 0, 240)).toBe(1000);
		});
	});

	describe("edge cases", () => {
		it("handles very small loan amounts", () => {
			const result = calculateMonthlyPayment(1000, 5, 12);
			expect(result).toBeGreaterThan(0);
			expect(result * 12).toBeGreaterThan(1000);
		});

		it("handles very high interest rates", () => {
			const result = calculateMonthlyPayment(100000, 15, 360);
			expect(result).toBeGreaterThan(0);
			expect(result).toBeCloseTo(1264.44, 2);
		});

		it("handles short terms", () => {
			const result = calculateMonthlyPayment(50000, 4, 12);
			expect(result).toBeCloseTo(4257.5, 2);
		});
	});
});

describe("calculateRemainingBalance", () => {
	describe("boundary conditions", () => {
		it("returns 0 when loan is fully paid", () => {
			expect(calculateRemainingBalance(300000, 3.5, 360, 360)).toBe(0);
		});

		it("returns 0 when paidMonths exceeds totalMonths", () => {
			expect(calculateRemainingBalance(300000, 3.5, 360, 400)).toBe(0);
		});

		it("returns approximately principal when no payments made", () => {
			const result = calculateRemainingBalance(300000, 3.5, 360, 0);
			expect(result).toBeCloseTo(300000, 0);
		});
	});

	describe("balance progression", () => {
		it("reduces balance over time", () => {
			const year5 = calculateRemainingBalance(300000, 3.5, 360, 60);
			const year10 = calculateRemainingBalance(300000, 3.5, 360, 120);
			const year15 = calculateRemainingBalance(300000, 3.5, 360, 180);

			expect(year5).toBeLessThan(300000);
			expect(year10).toBeLessThan(year5);
			expect(year15).toBeLessThan(year10);
		});

		it("calculates halfway balance correctly", () => {
			const halfwayBalance = calculateRemainingBalance(300000, 3.5, 360, 180);
			// At 15 years of a 30-year mortgage at 3.5%, balance is roughly 63%
			expect(halfwayBalance).toBeCloseTo(188441, -2);
		});
	});

	describe("zero interest rate", () => {
		it("decreases linearly with 0% interest", () => {
			const result = calculateRemainingBalance(120000, 0, 120, 60);
			expect(result).toBe(60000); // Half paid
		});
	});
});
