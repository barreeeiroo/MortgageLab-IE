import { describe, expect, it } from "vitest";
import type { MortgageRate } from "@/lib/schemas/rate";
import {
	calculateCostOfCreditPercent,
	calculateFollowOnLtv,
	calculateMonthlyFollowOn,
	calculateMonthlyPayment,
	calculateRemainingBalance,
	calculateTotalRepayable,
	findVariableRate,
} from "../payments";

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

describe("calculateMonthlyFollowOn", () => {
	const fixedRate: MortgageRate = {
		id: "fixed-3yr",
		name: "3 Year Fixed",
		lenderId: "test",
		type: "fixed",
		rate: 3.5,
		fixedTerm: 3,
		minLtv: 0,
		maxLtv: 90,
		buyerTypes: ["ftb", "mover"],
		perks: [],
	};

	const variableRate: MortgageRate = {
		id: "variable",
		name: "Variable Rate",
		lenderId: "test",
		type: "variable",
		rate: 4.5,
		minLtv: 0,
		maxLtv: 90,
		buyerTypes: ["ftb", "mover"],
		perks: [],
	};

	it("calculates follow-on payment after fixed term", () => {
		const result = calculateMonthlyFollowOn(
			fixedRate,
			variableRate,
			300000,
			360,
		);
		expect(result).toBeDefined();
		expect(result).toBeGreaterThan(0);
	});

	it("returns undefined for variable rates", () => {
		const result = calculateMonthlyFollowOn(
			variableRate,
			variableRate,
			300000,
			360,
		);
		expect(result).toBeUndefined();
	});

	it("returns undefined when no variable rate provided", () => {
		const result = calculateMonthlyFollowOn(fixedRate, undefined, 300000, 360);
		expect(result).toBeUndefined();
	});

	it("returns undefined when remaining term is 0 or less", () => {
		const shortTermFixed: MortgageRate = {
			...fixedRate,
			fixedTerm: 30, // 30 years fixed = no follow-on
		};
		const result = calculateMonthlyFollowOn(
			shortTermFixed,
			variableRate,
			300000,
			360,
		);
		expect(result).toBeUndefined();
	});
});

describe("calculateTotalRepayable", () => {
	const fixedRate: MortgageRate = {
		id: "fixed-3yr",
		name: "3 Year Fixed",
		lenderId: "test",
		type: "fixed",
		rate: 3.5,
		fixedTerm: 3,
		minLtv: 0,
		maxLtv: 90,
		buyerTypes: ["ftb", "mover"],
		perks: [],
	};

	const variableRate: MortgageRate = {
		id: "variable",
		name: "Variable Rate",
		lenderId: "test",
		type: "variable",
		rate: 4.5,
		minLtv: 0,
		maxLtv: 90,
		buyerTypes: ["ftb", "mover"],
		perks: [],
	};

	it("calculates total for fixed rate with follow-on", () => {
		const monthlyPayment = 1347.13;
		const monthlyFollowOn = 1500;
		const result = calculateTotalRepayable(
			fixedRate,
			monthlyPayment,
			monthlyFollowOn,
			360,
		);

		// 36 months at 1347.13 + 324 months at 1500
		const expected = monthlyPayment * 36 + monthlyFollowOn * 324;
		expect(result).toBeCloseTo(expected, 0);
	});

	it("calculates total for variable rate (no follow-on)", () => {
		const monthlyPayment = 1500;
		const result = calculateTotalRepayable(
			variableRate,
			monthlyPayment,
			undefined,
			360,
		);

		expect(result).toBe(monthlyPayment * 360);
	});
});

describe("calculateFollowOnLtv", () => {
	it("calculates reduced LTV after fixed term", () => {
		// After 3 years (36 months) of a 30-year mortgage, LTV should decrease
		const originalLtv = 90;
		const result = calculateFollowOnLtv(300000, 3.5, 360, 36, originalLtv);

		expect(result).toBeLessThan(originalLtv);
		expect(result).toBeGreaterThan(0);
	});

	it("LTV decreases more with higher rate (more principal paid)", () => {
		const originalLtv = 90;
		const ltvLowRate = calculateFollowOnLtv(300000, 2.0, 360, 36, originalLtv);
		const ltvHighRate = calculateFollowOnLtv(300000, 5.0, 360, 36, originalLtv);

		// Higher rate = less principal paid = higher remaining LTV
		expect(ltvHighRate).toBeGreaterThan(ltvLowRate);
	});
});

describe("calculateCostOfCreditPercent", () => {
	it("calculates cost as percentage of principal", () => {
		const totalRepayable = 500000;
		const principal = 300000;
		const result = calculateCostOfCreditPercent(totalRepayable, principal);

		// (500000 - 300000) / 300000 * 100 = 66.67%
		expect(result).toBeCloseTo(66.67, 2);
	});

	it("returns 0 when no interest paid", () => {
		const result = calculateCostOfCreditPercent(300000, 300000);
		expect(result).toBe(0);
	});

	it("returns undefined when totalRepayable is undefined", () => {
		const result = calculateCostOfCreditPercent(undefined, 300000);
		expect(result).toBeUndefined();
	});
});

describe("findVariableRate", () => {
	const fixedRate: MortgageRate = {
		id: "fixed-3yr",
		name: "3 Year Fixed",
		lenderId: "aib",
		type: "fixed",
		rate: 3.5,
		fixedTerm: 3,
		minLtv: 0,
		maxLtv: 80,
		buyerTypes: ["ftb", "mover"],
		perks: [],
	};

	const variableRates: MortgageRate[] = [
		{
			id: "var-1",
			name: "Variable Rate",
			lenderId: "aib",
			type: "variable",
			rate: 4.5,
			minLtv: 0,
			maxLtv: 60,
			buyerTypes: ["ftb", "mover"],
			newBusiness: true,
			perks: [],
		},
		{
			id: "var-2",
			name: "Follow-on Variable",
			lenderId: "aib",
			type: "variable",
			rate: 4.8,
			minLtv: 0,
			maxLtv: 90,
			buyerTypes: ["ftb", "mover"],
			newBusiness: false, // Follow-on rate
			perks: [],
		},
		{
			id: "var-3",
			name: "Other Lender Variable",
			lenderId: "boi",
			type: "variable",
			rate: 4.0,
			minLtv: 0,
			maxLtv: 90,
			buyerTypes: ["ftb", "mover"],
			perks: [],
		},
	];

	it("finds matching variable rate from same lender", () => {
		const result = findVariableRate(fixedRate, variableRates);
		expect(result).toBeDefined();
		expect(result?.lenderId).toBe("aib");
	});

	it("prefers follow-on rates (newBusiness: false)", () => {
		const result = findVariableRate(fixedRate, variableRates);
		expect(result?.id).toBe("var-2");
		expect(result?.newBusiness).toBe(false);
	});

	it("filters by LTV when provided", () => {
		const result = findVariableRate(fixedRate, variableRates, 50);
		expect(result).toBeDefined();
		// Should match var-1 (0-60 LTV) or var-2 (0-90 LTV), prefers follow-on
		expect(result?.maxLtv).toBeGreaterThanOrEqual(50);
	});

	it("returns undefined when no matching variable rate", () => {
		const result = findVariableRate(fixedRate, [variableRates[2]]); // Only BOI rate
		expect(result).toBeUndefined();
	});

	it("filters by BER eligibility when provided", () => {
		const berVariableRate: MortgageRate = {
			id: "var-ber",
			name: "Green Variable",
			lenderId: "aib",
			type: "variable",
			rate: 4.2,
			minLtv: 0,
			maxLtv: 90,
			buyerTypes: ["ftb", "mover"],
			berEligible: ["A1", "A2", "A3", "B1", "B2", "B3"],
			perks: [],
		};

		const rates = [...variableRates, berVariableRate];

		// With BER A1 should find the BER-eligible rate
		const resultA1 = findVariableRate(fixedRate, rates, undefined, "A1");
		expect(resultA1).toBeDefined();

		// With BER D1 should not match BER-restricted rate
		const resultD1 = findVariableRate(
			fixedRate,
			[berVariableRate],
			undefined,
			"D1",
		);
		expect(resultD1).toBeUndefined();
	});
});
