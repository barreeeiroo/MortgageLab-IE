import { describe, expect, it } from "vitest";
import {
	calculatePropertyVAT,
	calculateStampDuty,
	ESTIMATED_LEGAL_FEES,
	ESTIMATED_REMORTGAGE_LEGAL_FEES,
	VAT_RATE_EXISTING,
	VAT_RATE_NEW_APARTMENT,
	VAT_RATE_NEW_BUILD,
} from "../fees";

describe("calculateStampDuty", () => {
	describe("tier 1: up to €1,000,000 (1%)", () => {
		it.each([
			{ value: 0, expected: 0 },
			{ value: 100000, expected: 1000 },
			{ value: 350000, expected: 3500 },
			{ value: 400000, expected: 4000 },
			{ value: 500000, expected: 5000 },
			{ value: 750000, expected: 7500 },
			{ value: 1000000, expected: 10000 },
		])("calculates €$value => €$expected", ({ value, expected }) => {
			expect(calculateStampDuty(value)).toBe(expected);
		});
	});

	describe("tier 2: €1,000,001 to €1,500,000 (+2%)", () => {
		it("calculates €1,100,000 correctly", () => {
			// 1% of 1M + 2% of 100k = 10000 + 2000 = 12000
			expect(calculateStampDuty(1100000)).toBe(12000);
		});

		it("calculates €1,250,000 correctly", () => {
			// 1% of 1M + 2% of 250k = 10000 + 5000 = 15000
			expect(calculateStampDuty(1250000)).toBe(15000);
		});

		it("calculates €1,500,000 correctly", () => {
			// 1% of 1M + 2% of 500k = 10000 + 10000 = 20000
			expect(calculateStampDuty(1500000)).toBe(20000);
		});
	});

	describe("tier 3: above €1,500,000 (+6%)", () => {
		it("calculates €1,600,000 correctly", () => {
			// 1% of 1M + 2% of 500k + 6% of 100k = 10000 + 10000 + 6000 = 26000
			expect(calculateStampDuty(1600000)).toBe(26000);
		});

		it("calculates €2,000,000 correctly", () => {
			// 1% of 1M + 2% of 500k + 6% of 500k = 10000 + 10000 + 30000 = 50000
			expect(calculateStampDuty(2000000)).toBe(50000);
		});

		it("calculates €3,000,000 correctly", () => {
			// 1% of 1M + 2% of 500k + 6% of 1.5M = 10000 + 10000 + 90000 = 110000
			expect(calculateStampDuty(3000000)).toBe(110000);
		});

		it("calculates €5,000,000 correctly", () => {
			// 1% of 1M + 2% of 500k + 6% of 3.5M = 10000 + 10000 + 210000 = 230000
			expect(calculateStampDuty(5000000)).toBe(230000);
		});
	});

	describe("edge cases", () => {
		it("returns 0 for negative values", () => {
			expect(calculateStampDuty(-100000)).toBe(0);
		});

		it("returns 0 for zero value", () => {
			expect(calculateStampDuty(0)).toBe(0);
		});

		it("handles boundary at exactly €1,000,000", () => {
			expect(calculateStampDuty(1000000)).toBe(10000);
		});

		it("handles €1 over first tier boundary", () => {
			// 1% of 1M + 2% of 1 = 10000 + 0.02 = 10000.02
			expect(calculateStampDuty(1000001)).toBeCloseTo(10000.02, 2);
		});

		it("handles boundary at exactly €1,500,000", () => {
			expect(calculateStampDuty(1500000)).toBe(20000);
		});

		it("handles €1 over second tier boundary", () => {
			// 1% of 1M + 2% of 500k + 6% of 1 = 10000 + 10000 + 0.06 = 20000.06
			expect(calculateStampDuty(1500001)).toBeCloseTo(20000.06, 2);
		});

		it("handles decimal values", () => {
			const result = calculateStampDuty(350500.5);
			expect(result).toBeCloseTo(3505.005, 2);
		});
	});
});

describe("calculatePropertyVAT", () => {
	describe("existing properties (0% VAT)", () => {
		it("returns zero VAT for existing properties (inclusive)", () => {
			const result = calculatePropertyVAT(400000, "existing", true);
			expect(result.vatRate).toBe(0);
			expect(result.vatAmount).toBe(0);
			expect(result.netPrice).toBe(400000);
			expect(result.grossPrice).toBe(400000);
		});

		it("returns zero VAT for existing properties (exclusive)", () => {
			const result = calculatePropertyVAT(400000, "existing", false);
			expect(result.vatRate).toBe(0);
			expect(result.vatAmount).toBe(0);
			expect(result.netPrice).toBe(400000);
			expect(result.grossPrice).toBe(400000);
		});
	});

	describe("new builds (13.5% VAT)", () => {
		it("extracts VAT from inclusive price", () => {
			const result = calculatePropertyVAT(400000, "new-build", true);
			expect(result.vatRate).toBe(13.5);
			expect(result.grossPrice).toBe(400000);
			// Net = 400000 / 1.135 = 352422.91
			expect(result.netPrice).toBeCloseTo(352422.91, 2);
			// VAT = 400000 - 352422.91 = 47577.09
			expect(result.vatAmount).toBeCloseTo(47577.09, 2);
		});

		it("adds VAT to exclusive price", () => {
			const result = calculatePropertyVAT(400000, "new-build", false);
			expect(result.vatRate).toBe(13.5);
			expect(result.netPrice).toBe(400000);
			// VAT = 400000 * 0.135 = 54000
			expect(result.vatAmount).toBe(54000);
			// Gross = 400000 + 54000 = 454000
			expect(result.grossPrice).toBe(454000);
		});

		it("calculates correctly for €500,000 new build", () => {
			const result = calculatePropertyVAT(500000, "new-build", true);
			// Net = 500000 / 1.135 = 440528.63
			expect(result.netPrice).toBeCloseTo(440528.63, 2);
			// VAT = 500000 - 440528.63 = 59471.37
			expect(result.vatAmount).toBeCloseTo(59471.37, 2);
		});
	});

	describe("new apartments (9% VAT)", () => {
		it("extracts VAT from inclusive price", () => {
			const result = calculatePropertyVAT(350000, "new-apartment", true);
			expect(result.vatRate).toBe(9);
			expect(result.grossPrice).toBe(350000);
			// Net = 350000 / 1.09 = 321100.92
			expect(result.netPrice).toBeCloseTo(321100.92, 2);
			// VAT = 350000 - 321100.92 = 28899.08
			expect(result.vatAmount).toBeCloseTo(28899.08, 2);
		});

		it("adds VAT to exclusive price", () => {
			const result = calculatePropertyVAT(350000, "new-apartment", false);
			expect(result.vatRate).toBe(9);
			expect(result.netPrice).toBe(350000);
			// VAT = 350000 * 0.09 = 31500
			expect(result.vatAmount).toBe(31500);
			// Gross = 350000 + 31500 = 381500
			expect(result.grossPrice).toBe(381500);
		});
	});

	describe("edge cases", () => {
		it("handles zero property value", () => {
			const result = calculatePropertyVAT(0, "new-build", true);
			expect(result.vatAmount).toBe(0);
			expect(result.netPrice).toBe(0);
			expect(result.grossPrice).toBe(0);
		});

		it("handles negative property value", () => {
			const result = calculatePropertyVAT(-100000, "new-build", true);
			expect(result.vatAmount).toBe(0);
			expect(result.netPrice).toBe(-100000);
			expect(result.grossPrice).toBe(-100000);
		});

		it("handles very large property values", () => {
			const result = calculatePropertyVAT(10000000, "new-build", true);
			expect(result.vatRate).toBe(13.5);
			// Net = 10000000 / 1.135 = 8810572.69
			expect(result.netPrice).toBeCloseTo(8810572.69, 0);
		});
	});
});

describe("constants", () => {
	it("exports correct legal fees estimate", () => {
		expect(ESTIMATED_LEGAL_FEES).toBe(4000);
	});

	it("exports correct remortgage legal fees estimate", () => {
		expect(ESTIMATED_REMORTGAGE_LEGAL_FEES).toBe(1350);
	});

	it("exports correct VAT rates", () => {
		expect(VAT_RATE_NEW_BUILD).toBe(13.5);
		expect(VAT_RATE_NEW_APARTMENT).toBe(9);
		expect(VAT_RATE_EXISTING).toBe(0);
	});
});
