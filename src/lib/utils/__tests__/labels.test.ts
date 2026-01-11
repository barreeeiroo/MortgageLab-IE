import { describe, expect, it } from "vitest";
import type { MortgageRate } from "@/lib/schemas/rate";
import { generateRateLabel, generateVariableBufferLabel } from "../labels";

describe("generateRateLabel", () => {
	const fixedRate: MortgageRate = {
		id: "fixed-3yr",
		name: "3 Year Fixed",
		lenderId: "aib",
		type: "fixed",
		rate: 3.45,
		fixedTerm: 3,
		minLtv: 0,
		maxLtv: 90,
		buyerTypes: ["ftb", "mover"],
		perks: [],
	};

	const variableRate: MortgageRate = {
		id: "variable",
		name: "Variable Rate",
		lenderId: "aib",
		type: "variable",
		rate: 4.5,
		minLtv: 0,
		maxLtv: 90,
		buyerTypes: ["ftb", "mover"],
		perks: [],
	};

	describe("basic labels without cycle info", () => {
		it("generates label for fixed rate", () => {
			const result = generateRateLabel("AIB", fixedRate);
			expect(result).toBe("AIB 3-Year Fixed @ 3.45%");
		});

		it("generates label for variable rate", () => {
			const result = generateRateLabel("AIB", variableRate);
			expect(result).toBe("AIB Variable @ 4.50%");
		});

		it("formats rate with two decimal places", () => {
			const rate: MortgageRate = { ...fixedRate, rate: 3.5 };
			const result = generateRateLabel("AIB", rate);
			expect(result).toBe("AIB 3-Year Fixed @ 3.50%");
		});

		it("handles different fixed terms", () => {
			const rate5yr: MortgageRate = { ...fixedRate, fixedTerm: 5 };
			expect(generateRateLabel("BOI", rate5yr)).toBe(
				"BOI 5-Year Fixed @ 3.45%",
			);

			const rate10yr: MortgageRate = { ...fixedRate, fixedTerm: 10 };
			expect(generateRateLabel("PTSB", rate10yr)).toBe(
				"PTSB 10-Year Fixed @ 3.45%",
			);
		});
	});

	describe("labels with cycle info", () => {
		it("adds cycle number for fixed rate", () => {
			const result = generateRateLabel("AIB", fixedRate, { cycle: 1 });
			expect(result).toBe("AIB 3-Year Fixed @ 3.45% (Cycle 1)");
		});

		it("adds cycle number for subsequent cycles", () => {
			const result = generateRateLabel("AIB", fixedRate, { cycle: 3 });
			expect(result).toBe("AIB 3-Year Fixed @ 3.45% (Cycle 3)");
		});

		it("adds variable buffer indicator with cycle", () => {
			const result = generateRateLabel("AIB", variableRate, {
				cycle: 2,
				isBuffer: true,
			});
			expect(result).toBe("AIB Variable @ 4.50% (Variable Buffer, Cycle 2)");
		});
	});
});

describe("generateVariableBufferLabel", () => {
	const variableRate: MortgageRate = {
		id: "variable",
		name: "Variable Rate",
		lenderId: "aib",
		type: "variable",
		rate: 4.5,
		minLtv: 0,
		maxLtv: 90,
		buyerTypes: ["ftb", "mover"],
		perks: [],
	};

	it("generates buffer label without cycle number", () => {
		const result = generateVariableBufferLabel("AIB", variableRate);
		expect(result).toBe("AIB Variable @ 4.50% (Variable Buffer)");
	});

	it("formats rate with two decimal places", () => {
		const rate: MortgageRate = { ...variableRate, rate: 4.8 };
		const result = generateVariableBufferLabel("BOI", rate);
		expect(result).toBe("BOI Variable @ 4.80% (Variable Buffer)");
	});
});
