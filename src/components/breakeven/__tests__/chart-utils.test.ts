import { formatPeriodLabel, limitChartData } from "../chart-utils";

describe("limitChartData", () => {
	const yearlyData = Array.from({ length: 30 }, (_, i) => ({
		year: i + 1,
		value: i * 10000,
	}));

	const monthlyData = Array.from({ length: 360 }, (_, i) => ({
		month: i + 1,
		value: i * 1000,
	}));

	describe("yearly view", () => {
		it("uses yearly view when no monthly data", () => {
			const result = limitChartData({
				yearlyData,
				breakevenYear: 5,
			});

			expect(result.useMonthlyView).toBe(false);
			expect(result.dataKey).toBe("year");
		});

		it("limits yearly data to 2x breakeven point", () => {
			const result = limitChartData({
				yearlyData,
				breakevenYear: 5,
			});

			// 2x breakeven = 10, plus 1 = 11 items
			expect(result.chartData.length).toBe(11);
		});

		it("uses all yearly data when breakeven is more than half the data", () => {
			const result = limitChartData({
				yearlyData,
				breakevenYear: 20,
			});

			expect(result.chartData.length).toBe(30);
		});

		it("uses all yearly data when no breakeven", () => {
			const result = limitChartData({
				yearlyData,
				breakevenYear: null,
			});

			expect(result.chartData.length).toBe(30);
		});

		it("returns breakeven year as reference line", () => {
			const result = limitChartData({
				yearlyData,
				breakevenYear: 5,
			});

			expect(result.referenceLineValue).toBe(5);
		});

		it("returns null reference line when no breakeven", () => {
			const result = limitChartData({
				yearlyData,
				breakevenYear: null,
			});

			expect(result.referenceLineValue).toBeNull();
		});
	});

	describe("monthly view", () => {
		it("uses monthly view when breakeven is under 2 years", () => {
			const result = limitChartData({
				yearlyData,
				monthlyData,
				breakevenYear: 1,
				breakevenMonth: 12,
			});

			expect(result.useMonthlyView).toBe(true);
			expect(result.dataKey).toBe("month");
		});

		it("uses yearly view when breakeven is 2+ years", () => {
			const result = limitChartData({
				yearlyData,
				monthlyData,
				breakevenYear: 5,
				breakevenMonth: 60,
			});

			expect(result.useMonthlyView).toBe(false);
			expect(result.dataKey).toBe("year");
		});

		it("limits monthly data to 2x breakeven point", () => {
			const result = limitChartData({
				yearlyData,
				monthlyData,
				breakevenYear: 1,
				breakevenMonth: 12,
			});

			// 2x breakeven = 24, plus 1 = 25 items
			expect(result.chartData.length).toBe(25);
		});

		it("returns breakeven month as reference line", () => {
			const result = limitChartData({
				yearlyData,
				monthlyData,
				breakevenYear: 1,
				breakevenMonth: 12,
			});

			expect(result.referenceLineValue).toBe(12);
		});

		it("falls back to yearly when monthly data is empty", () => {
			const result = limitChartData({
				yearlyData,
				monthlyData: [],
				breakevenYear: 1,
				breakevenMonth: 12,
			});

			expect(result.useMonthlyView).toBe(false);
		});

		it("falls back to yearly when monthly data is undefined", () => {
			const result = limitChartData({
				yearlyData,
				breakevenYear: 1,
				breakevenMonth: 12,
			});

			expect(result.useMonthlyView).toBe(false);
		});
	});
});

describe("formatPeriodLabel", () => {
	it("returns 'Year X' for yearly data points", () => {
		expect(formatPeriodLabel({ year: 5 }, false)).toBe("Year 5");
	});

	it("returns 'Month X' for monthly data points in monthly view", () => {
		expect(formatPeriodLabel({ month: 12 }, true)).toBe("Month 12");
	});

	it("returns 'Year X' for yearly data points even in monthly view", () => {
		expect(formatPeriodLabel({ year: 3 }, true)).toBe("Year 3");
	});

	it("returns empty string for invalid data", () => {
		expect(formatPeriodLabel({} as { year: number }, false)).toBe("");
	});
});
