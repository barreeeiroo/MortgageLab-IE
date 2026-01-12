import { describe, expect, it } from "vitest";
import type { DrawdownStage, SelfBuildConfig } from "@/lib/schemas/simulate";
import {
	calculateInterestOnlyPayment,
	determinePhase,
	getConstructionEndMonth,
	getCumulativeDrawn,
	getDrawdownForMonth,
	getDrawdownStagesWithCumulative,
	getFinalDrawdownMonth,
	getInitialSelfBuildBalance,
	getInterestOnlyEndMonth,
	getRemainingTermFromRepayment,
	isInterestOnlyMonth,
	isSelfBuildActive,
	validateDrawdownTotal,
} from "../self-build";

// Helper to create test drawdown stages
function createDrawdownStages(
	stages: Array<{ month: number; amount: number; label?: string }>,
): DrawdownStage[] {
	return stages.map((s, i) => ({
		id: `stage-${i}`,
		month: s.month,
		amount: s.amount,
		label: s.label,
	}));
}

// Helper to create test config
function createSelfBuildConfig(
	interestOnlyMonths: number,
	stages: DrawdownStage[],
): SelfBuildConfig {
	return {
		enabled: true,
		interestOnlyMonths,
		drawdownStages: stages,
	};
}

describe("getDrawdownForMonth", () => {
	const stages = createDrawdownStages([
		{ month: 1, amount: 5000000 },
		{ month: 4, amount: 7500000 },
		{ month: 8, amount: 7500000 },
	]);

	it("returns drawdown amount for month with drawdown", () => {
		expect(getDrawdownForMonth(1, stages)).toBe(5000000);
		expect(getDrawdownForMonth(4, stages)).toBe(7500000);
		expect(getDrawdownForMonth(8, stages)).toBe(7500000);
	});

	it("returns 0 for months without drawdown", () => {
		expect(getDrawdownForMonth(2, stages)).toBe(0);
		expect(getDrawdownForMonth(3, stages)).toBe(0);
		expect(getDrawdownForMonth(5, stages)).toBe(0);
		expect(getDrawdownForMonth(10, stages)).toBe(0);
	});

	it("returns 0 for empty stages", () => {
		expect(getDrawdownForMonth(1, [])).toBe(0);
	});
});

describe("getCumulativeDrawn", () => {
	const stages = createDrawdownStages([
		{ month: 1, amount: 5000000 },
		{ month: 4, amount: 7500000 },
		{ month: 8, amount: 7500000 },
	]);

	it("returns cumulative amount up to and including month", () => {
		expect(getCumulativeDrawn(1, stages)).toBe(5000000);
		expect(getCumulativeDrawn(3, stages)).toBe(5000000); // Only month 1 drawdown
		expect(getCumulativeDrawn(4, stages)).toBe(12500000);
		expect(getCumulativeDrawn(7, stages)).toBe(12500000);
		expect(getCumulativeDrawn(8, stages)).toBe(20000000);
		expect(getCumulativeDrawn(12, stages)).toBe(20000000); // All drawn by month 8
	});

	it("returns 0 before first drawdown", () => {
		const laterStages = createDrawdownStages([
			{ month: 3, amount: 5000000 },
			{ month: 6, amount: 5000000 },
		]);
		expect(getCumulativeDrawn(1, laterStages)).toBe(0);
		expect(getCumulativeDrawn(2, laterStages)).toBe(0);
	});

	it("returns 0 for empty stages", () => {
		expect(getCumulativeDrawn(1, [])).toBe(0);
	});
});

describe("getFinalDrawdownMonth", () => {
	it("returns the month of the last drawdown", () => {
		const stages = createDrawdownStages([
			{ month: 1, amount: 5000000 },
			{ month: 4, amount: 7500000 },
			{ month: 8, amount: 7500000 },
		]);
		expect(getFinalDrawdownMonth(stages)).toBe(8);
	});

	it("returns correct month even if stages are not in order", () => {
		const stages = createDrawdownStages([
			{ month: 8, amount: 7500000 },
			{ month: 1, amount: 5000000 },
			{ month: 4, amount: 7500000 },
		]);
		expect(getFinalDrawdownMonth(stages)).toBe(8);
	});

	it("returns 0 for empty stages", () => {
		expect(getFinalDrawdownMonth([])).toBe(0);
	});
});

describe("getConstructionEndMonth", () => {
	it("returns the final drawdown month", () => {
		const config = createSelfBuildConfig(
			9,
			createDrawdownStages([
				{ month: 1, amount: 5000000 },
				{ month: 4, amount: 7500000 },
				{ month: 8, amount: 7500000 },
			]),
		);
		expect(getConstructionEndMonth(config)).toBe(8);
	});
});

describe("getInterestOnlyEndMonth", () => {
	it("returns final drawdown month plus interest-only months", () => {
		const config = createSelfBuildConfig(
			9,
			createDrawdownStages([
				{ month: 1, amount: 5000000 },
				{ month: 4, amount: 7500000 },
				{ month: 8, amount: 7500000 },
			]),
		);
		expect(getInterestOnlyEndMonth(config)).toBe(17); // 8 + 9
	});

	it("returns final drawdown month when no interest-only period", () => {
		const config = createSelfBuildConfig(
			0,
			createDrawdownStages([
				{ month: 1, amount: 5000000 },
				{ month: 8, amount: 15000000 },
			]),
		);
		expect(getInterestOnlyEndMonth(config)).toBe(8);
	});
});

describe("determinePhase", () => {
	const config = createSelfBuildConfig(
		9,
		createDrawdownStages([
			{ month: 1, amount: 5000000 },
			{ month: 4, amount: 7500000 },
			{ month: 8, amount: 7500000 },
		]),
	);

	it("returns construction during drawdown period", () => {
		expect(determinePhase(1, config)).toBe("construction");
		expect(determinePhase(4, config)).toBe("construction");
		expect(determinePhase(7, config)).toBe("construction");
		expect(determinePhase(8, config)).toBe("construction"); // Final drawdown month is still construction
	});

	it("returns interest_only after construction until interest-only period ends", () => {
		expect(determinePhase(9, config)).toBe("interest_only");
		expect(determinePhase(12, config)).toBe("interest_only");
		expect(determinePhase(17, config)).toBe("interest_only"); // Last month of interest-only
	});

	it("returns repayment after interest-only period ends", () => {
		expect(determinePhase(18, config)).toBe("repayment");
		expect(determinePhase(24, config)).toBe("repayment");
		expect(determinePhase(100, config)).toBe("repayment");
	});

	it("handles no interest-only period", () => {
		const noInterestOnlyConfig = createSelfBuildConfig(
			0,
			createDrawdownStages([
				{ month: 1, amount: 5000000 },
				{ month: 8, amount: 15000000 },
			]),
		);
		expect(determinePhase(8, noInterestOnlyConfig)).toBe("construction");
		expect(determinePhase(9, noInterestOnlyConfig)).toBe("repayment");
	});
});

describe("isInterestOnlyMonth", () => {
	const config = createSelfBuildConfig(
		9,
		createDrawdownStages([
			{ month: 1, amount: 5000000 },
			{ month: 8, amount: 15000000 },
		]),
	);

	it("returns true during construction phase", () => {
		expect(isInterestOnlyMonth(1, config)).toBe(true);
		expect(isInterestOnlyMonth(5, config)).toBe(true);
		expect(isInterestOnlyMonth(8, config)).toBe(true);
	});

	it("returns true during interest-only phase", () => {
		expect(isInterestOnlyMonth(9, config)).toBe(true);
		expect(isInterestOnlyMonth(12, config)).toBe(true);
		expect(isInterestOnlyMonth(17, config)).toBe(true);
	});

	it("returns false during repayment phase", () => {
		expect(isInterestOnlyMonth(18, config)).toBe(false);
		expect(isInterestOnlyMonth(24, config)).toBe(false);
	});
});

describe("calculateInterestOnlyPayment", () => {
	it("calculates monthly interest payment correctly", () => {
		// €200,000 balance at 3.0% annual rate
		// Monthly rate = 3.0 / 100 / 12 = 0.0025
		// Interest = 20000000 * 0.0025 = 50000 cents = €500
		const payment = calculateInterestOnlyPayment(20000000, 3.0);
		expect(payment).toBeCloseTo(50000, 0);
	});

	it("returns 0 for 0 balance", () => {
		expect(calculateInterestOnlyPayment(0, 3.5)).toBe(0);
	});

	it("returns 0 for 0 rate", () => {
		expect(calculateInterestOnlyPayment(20000000, 0)).toBe(0);
	});

	it("scales linearly with balance", () => {
		const payment100k = calculateInterestOnlyPayment(10000000, 3.0);
		const payment200k = calculateInterestOnlyPayment(20000000, 3.0);
		expect(payment200k).toBeCloseTo(payment100k * 2, 0);
	});

	it("scales linearly with rate", () => {
		const payment3pct = calculateInterestOnlyPayment(20000000, 3.0);
		const payment6pct = calculateInterestOnlyPayment(20000000, 6.0);
		expect(payment6pct).toBeCloseTo(payment3pct * 2, 0);
	});
});

describe("getRemainingTermFromRepayment", () => {
	it("calculates remaining term correctly", () => {
		// 30 year mortgage (360 months), interest-only ends at month 17
		// Remaining = 360 - 17 = 343 months
		expect(getRemainingTermFromRepayment(360, 17)).toBe(343);
	});

	it("returns full term when no interest-only period", () => {
		expect(getRemainingTermFromRepayment(360, 0)).toBe(360);
	});
});

describe("validateDrawdownTotal", () => {
	it("returns valid when drawdowns equal mortgage amount", () => {
		const config = createSelfBuildConfig(
			9,
			createDrawdownStages([
				{ month: 1, amount: 5000000 },
				{ month: 4, amount: 7500000 },
				{ month: 8, amount: 7500000 },
			]),
		);
		const result = validateDrawdownTotal(config, 20000000);
		expect(result.isValid).toBe(true);
		expect(result.totalDrawn).toBe(20000000);
		expect(result.difference).toBe(0);
	});

	it("returns invalid when under-drawn", () => {
		const config = createSelfBuildConfig(
			9,
			createDrawdownStages([
				{ month: 1, amount: 5000000 },
				{ month: 4, amount: 7500000 },
			]),
		);
		const result = validateDrawdownTotal(config, 20000000);
		expect(result.isValid).toBe(false);
		expect(result.totalDrawn).toBe(12500000);
		expect(result.difference).toBe(7500000); // Under by €75,000
	});

	it("returns invalid when over-drawn", () => {
		const config = createSelfBuildConfig(
			9,
			createDrawdownStages([
				{ month: 1, amount: 5000000 },
				{ month: 4, amount: 7500000 },
				{ month: 8, amount: 7500000 },
			]),
		);
		const result = validateDrawdownTotal(config, 15000000);
		expect(result.isValid).toBe(false);
		expect(result.totalDrawn).toBe(20000000);
		expect(result.difference).toBe(-5000000); // Over by €50,000
	});

	it("handles empty drawdown stages", () => {
		const config = createSelfBuildConfig(9, []);
		const result = validateDrawdownTotal(config, 20000000);
		expect(result.isValid).toBe(false);
		expect(result.totalDrawn).toBe(0);
		expect(result.difference).toBe(20000000);
	});
});

describe("isSelfBuildActive", () => {
	it("returns true when enabled with drawdown stages", () => {
		const config = createSelfBuildConfig(
			9,
			createDrawdownStages([{ month: 1, amount: 20000000 }]),
		);
		expect(isSelfBuildActive(config)).toBe(true);
	});

	it("returns false when not enabled", () => {
		const config: SelfBuildConfig = {
			enabled: false,
			interestOnlyMonths: 9,
			drawdownStages: createDrawdownStages([{ month: 1, amount: 20000000 }]),
		};
		expect(isSelfBuildActive(config)).toBe(false);
	});

	it("returns false when enabled but no drawdown stages", () => {
		const config = createSelfBuildConfig(9, []);
		expect(isSelfBuildActive(config)).toBe(false);
	});

	it("returns false for undefined config", () => {
		expect(isSelfBuildActive(undefined)).toBe(false);
	});
});

describe("getInitialSelfBuildBalance", () => {
	it("returns the first drawdown amount", () => {
		const config = createSelfBuildConfig(
			9,
			createDrawdownStages([
				{ month: 1, amount: 5000000 },
				{ month: 4, amount: 7500000 },
				{ month: 8, amount: 7500000 },
			]),
		);
		expect(getInitialSelfBuildBalance(config)).toBe(5000000);
	});

	it("handles stages not in order", () => {
		const stages = createDrawdownStages([
			{ month: 8, amount: 7500000 },
			{ month: 1, amount: 5000000 },
			{ month: 4, amount: 7500000 },
		]);
		const config = createSelfBuildConfig(9, stages);
		expect(getInitialSelfBuildBalance(config)).toBe(5000000); // Month 1 stage
	});

	it("returns 0 for empty stages", () => {
		const config = createSelfBuildConfig(9, []);
		expect(getInitialSelfBuildBalance(config)).toBe(0);
	});
});

describe("getDrawdownStagesWithCumulative", () => {
	it("adds cumulative amounts to stages", () => {
		const stages = createDrawdownStages([
			{ month: 1, amount: 5000000, label: "Site Purchase" },
			{ month: 4, amount: 7500000, label: "Floor Level" },
			{ month: 8, amount: 7500000, label: "Finished Property" },
		]);

		const result = getDrawdownStagesWithCumulative(stages);

		expect(result).toHaveLength(3);

		// First stage
		expect(result[0].cumulativeDrawn).toBe(5000000);
		expect(result[0].remainingToDrawn).toBe(15000000);
		expect(result[0].totalApproved).toBe(20000000);

		// Second stage
		expect(result[1].cumulativeDrawn).toBe(12500000);
		expect(result[1].remainingToDrawn).toBe(7500000);
		expect(result[1].totalApproved).toBe(20000000);

		// Third stage
		expect(result[2].cumulativeDrawn).toBe(20000000);
		expect(result[2].remainingToDrawn).toBe(0);
		expect(result[2].totalApproved).toBe(20000000);
	});

	it("sorts stages by month", () => {
		const stages = createDrawdownStages([
			{ month: 8, amount: 7500000 },
			{ month: 1, amount: 5000000 },
			{ month: 4, amount: 7500000 },
		]);

		const result = getDrawdownStagesWithCumulative(stages);

		expect(result[0].month).toBe(1);
		expect(result[1].month).toBe(4);
		expect(result[2].month).toBe(8);
	});

	it("preserves original stage properties", () => {
		const stages = createDrawdownStages([
			{ month: 1, amount: 5000000, label: "Site Purchase" },
		]);

		const result = getDrawdownStagesWithCumulative(stages);

		expect(result[0].id).toBe(stages[0].id);
		expect(result[0].month).toBe(1);
		expect(result[0].amount).toBe(5000000);
		expect(result[0].label).toBe("Site Purchase");
	});

	it("handles empty stages", () => {
		const result = getDrawdownStagesWithCumulative([]);
		expect(result).toHaveLength(0);
	});
});
