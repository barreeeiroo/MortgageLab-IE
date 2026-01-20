import { describe, expect, it } from "vitest";
import {
	type CashbackBreakevenInputs,
	calculateCashbackBreakeven,
	calculateRemortgageBreakeven,
	calculateRentVsBuyBreakeven,
	DEFAULT_HOME_APPRECIATION,
	DEFAULT_MAINTENANCE_RATE,
	DEFAULT_OPPORTUNITY_COST_RATE,
	DEFAULT_RENT_INFLATION,
	DEFAULT_SALE_COST_RATE,
	formatBreakevenPeriod,
	type RemortgageInputs,
	type RentVsBuyInputs,
} from "../breakeven";

describe("calculateRentVsBuyBreakeven", () => {
	const baseInputs: RentVsBuyInputs = {
		propertyValue: 400000,
		deposit: 40000,
		mortgageTermMonths: 360,
		mortgageRate: 3.5,
		currentMonthlyRent: 2000,
	};

	describe("upfront cost calculation", () => {
		it("calculates stamp duty, legal fees, and total upfront costs", () => {
			const result = calculateRentVsBuyBreakeven(baseInputs);

			// Stamp duty: 1% of €400k = €4,000
			expect(result.stampDuty).toBe(4000);
			// Default legal fees = €4,000
			expect(result.legalFees).toBe(4000);
			// Deposit = €40,000
			expect(result.deposit).toBe(40000);
			// Purchase costs = stamp duty + legal fees = €8,000
			expect(result.purchaseCosts).toBe(8000);
			// Upfront costs = deposit + purchase costs = €48,000
			expect(result.upfrontCosts).toBe(48000);
		});

		it("handles custom legal fees", () => {
			const result = calculateRentVsBuyBreakeven({
				...baseInputs,
				legalFees: 5000,
			});

			expect(result.legalFees).toBe(5000);
			expect(result.purchaseCosts).toBe(9000); // 4000 stamp duty + 5000 legal
		});

		it("handles VAT for new builds (13.5%)", () => {
			const result = calculateRentVsBuyBreakeven({
				...baseInputs,
				propertyType: "new-build",
				priceIncludesVAT: true,
			});

			// Net price = 400000 / 1.135 = ~352,423
			// Stamp duty = 1% of net = ~3,524
			expect(result.stampDuty).toBeCloseTo(3524, 0);
		});

		it("handles VAT for new apartments (9%)", () => {
			const result = calculateRentVsBuyBreakeven({
				...baseInputs,
				propertyType: "new-apartment",
				priceIncludesVAT: true,
			});

			// Net price = 400000 / 1.09 = ~366,972
			// Stamp duty = 1% of net = ~3,670
			expect(result.stampDuty).toBeCloseTo(3670, 0);
		});

		it("adds VAT to upfront costs when price is VAT-exclusive", () => {
			const result = calculateRentVsBuyBreakeven({
				...baseInputs,
				propertyType: "new-build",
				priceIncludesVAT: false,
			});

			// VAT = 400000 * 0.135 = 54000
			// Stamp duty = 1% of 400000 = 4000
			// Purchase costs = 4000 + 4000 + 54000 = 62000
			expect(result.purchaseCosts).toBe(62000);
		});
	});

	describe("mortgage calculation", () => {
		it("calculates mortgage amount correctly", () => {
			const result = calculateRentVsBuyBreakeven(baseInputs);
			expect(result.mortgageAmount).toBe(360000); // 400000 - 40000
		});

		it("calculates monthly mortgage payment", () => {
			const result = calculateRentVsBuyBreakeven(baseInputs);
			// €360k at 3.5% over 30 years ≈ €1,617
			expect(result.monthlyMortgagePayment).toBeCloseTo(1617, 0);
		});
	});

	describe("breakeven point detection", () => {
		it("finds net worth breakeven", () => {
			const result = calculateRentVsBuyBreakeven(baseInputs);

			expect(result.breakevenMonth).not.toBeNull();
			expect(result.breakevenMonth).toBeGreaterThan(0);
			expect(result.breakevenDetails).not.toBeNull();
		});

		it("finds sale breakeven (sale proceeds > upfront costs)", () => {
			const result = calculateRentVsBuyBreakeven(baseInputs);

			expect(result.breakEvenOnSaleMonth).not.toBeNull();
			expect(result.breakEvenOnSaleDetails).not.toBeNull();
		});

		it("finds equity recovery (equity > upfront costs)", () => {
			const result = calculateRentVsBuyBreakeven(baseInputs);

			expect(result.equityRecoveryMonth).not.toBeNull();
			expect(result.equityRecoveryDetails).not.toBeNull();
		});

		it("returns null when breakeven never occurs (0% appreciation, low rent)", () => {
			const result = calculateRentVsBuyBreakeven({
				...baseInputs,
				currentMonthlyRent: 500, // Very low rent
				homeAppreciationRate: 0,
				opportunityCostRate: 8,
			});

			// May never break even with 0% appreciation and low rent
			// This tests the null case
			expect(
				result.breakevenMonth === null || result.breakevenMonth > 300,
			).toBe(true);
		});
	});

	describe("simulation accuracy", () => {
		it("provides yearly breakdown for full term", () => {
			const result = calculateRentVsBuyBreakeven(baseInputs);

			expect(result.yearlyBreakdown.length).toBe(30); // 30 years
			expect(result.yearlyBreakdown[0].year).toBe(1);
			expect(result.yearlyBreakdown[29].year).toBe(30);
		});

		it("provides monthly breakdown for first 48 months", () => {
			const result = calculateRentVsBuyBreakeven(baseInputs);

			expect(result.monthlyBreakdown.length).toBe(48);
			expect(result.monthlyBreakdown[0].month).toBe(1);
			expect(result.monthlyBreakdown[47].month).toBe(48);
		});

		it("accumulates cumulative rent correctly", () => {
			const result = calculateRentVsBuyBreakeven(baseInputs);

			// After 12 months at €2000/month (no inflation first year)
			// Rent should be approximately 12 * 2000 = 24000
			const year1 = result.yearlyBreakdown[0];
			expect(year1.cumulativeRent).toBeCloseTo(24000, -2);
		});

		it("increases home value over time", () => {
			const result = calculateRentVsBuyBreakeven(baseInputs);

			// With 4% appreciation, home should be worth more after a year
			const year1 = result.yearlyBreakdown[0];
			const year5 = result.yearlyBreakdown[4];

			expect(year5.homeValue).toBeGreaterThan(year1.homeValue);
		});

		it("reduces mortgage balance over time", () => {
			const result = calculateRentVsBuyBreakeven(baseInputs);

			const year1 = result.yearlyBreakdown[0];
			const year10 = result.yearlyBreakdown[9];

			expect(year10.mortgageBalance).toBeLessThan(year1.mortgageBalance);
		});

		it("builds equity over time", () => {
			const result = calculateRentVsBuyBreakeven(baseInputs);

			const year1 = result.yearlyBreakdown[0];
			const year10 = result.yearlyBreakdown[9];

			expect(year10.equity).toBeGreaterThan(year1.equity);
		});
	});

	describe("sensitivity to assumptions", () => {
		it("breaks even faster with higher appreciation", () => {
			const lowAppreciation = calculateRentVsBuyBreakeven({
				...baseInputs,
				homeAppreciationRate: 2,
			});
			const highAppreciation = calculateRentVsBuyBreakeven({
				...baseInputs,
				homeAppreciationRate: 6,
			});

			if (lowAppreciation.breakevenMonth && highAppreciation.breakevenMonth) {
				expect(highAppreciation.breakevenMonth).toBeLessThan(
					lowAppreciation.breakevenMonth,
				);
			}
		});

		it("breaks even faster with higher rent", () => {
			const lowRent = calculateRentVsBuyBreakeven({
				...baseInputs,
				currentMonthlyRent: 1500,
			});
			const highRent = calculateRentVsBuyBreakeven({
				...baseInputs,
				currentMonthlyRent: 2500,
			});

			if (lowRent.breakevenMonth && highRent.breakevenMonth) {
				expect(highRent.breakevenMonth).toBeLessThan(lowRent.breakevenMonth);
			}
		});
	});

	describe("edge cases", () => {
		it("handles 0% interest rate", () => {
			const result = calculateRentVsBuyBreakeven({
				...baseInputs,
				mortgageRate: 0,
			});

			// Should still calculate without errors
			expect(result.monthlyMortgagePayment).toBe(1000); // 360000 / 360
		});

		it("handles short mortgage term", () => {
			const result = calculateRentVsBuyBreakeven({
				...baseInputs,
				mortgageTermMonths: 60, // 5 years
			});

			expect(result.yearlyBreakdown.length).toBe(5);
		});

		it("handles 100% LTV (0 deposit)", () => {
			const result = calculateRentVsBuyBreakeven({
				...baseInputs,
				deposit: 0,
			});

			expect(result.mortgageAmount).toBe(400000);
			expect(result.deposit).toBe(0);
		});
	});
});

describe("calculateRemortgageBreakeven", () => {
	const baseInputs: RemortgageInputs = {
		outstandingBalance: 250000,
		currentRate: 4.5,
		newRate: 3.5,
		remainingTermMonths: 240,
	};

	describe("basic breakeven", () => {
		it("calculates monthly savings from rate reduction", () => {
			const result = calculateRemortgageBreakeven(baseInputs);

			expect(result.monthlySavings).toBeGreaterThan(0);
			expect(result.newMonthlyPayment).toBeLessThan(
				result.currentMonthlyPayment,
			);
		});

		it("finds breakeven when cumulative savings > switching costs", () => {
			const result = calculateRemortgageBreakeven(baseInputs);

			expect(result.breakevenMonths).toBeGreaterThan(0);
			expect(result.breakevenMonths).toBeLessThan(
				result.monthlySavings > 0 ? Infinity : 0,
			);
		});

		it("returns Infinity when new rate is higher", () => {
			const result = calculateRemortgageBreakeven({
				...baseInputs,
				newRate: 5.0, // Higher than current
			});

			expect(result.monthlySavings).toBeLessThan(0);
			expect(result.breakevenMonths).toBe(Infinity);
		});
	});

	describe("cost factors", () => {
		it("subtracts cashback from switching costs", () => {
			const withoutCashback = calculateRemortgageBreakeven(baseInputs);
			const withCashback = calculateRemortgageBreakeven({
				...baseInputs,
				cashback: 1000,
			});

			expect(withCashback.switchingCosts).toBeLessThan(
				withoutCashback.switchingCosts,
			);
			expect(withCashback.breakevenMonths).toBeLessThan(
				withoutCashback.breakevenMonths,
			);
		});

		it("adds early redemption charge to costs", () => {
			const withoutErc = calculateRemortgageBreakeven(baseInputs);
			const withErc = calculateRemortgageBreakeven({
				...baseInputs,
				erc: 2000,
			});

			expect(withErc.switchingCosts).toBeGreaterThan(withoutErc.switchingCosts);
			expect(withErc.breakevenMonths).toBeGreaterThan(
				withoutErc.breakevenMonths,
			);
		});

		it("uses default legal fees when not specified", () => {
			const result = calculateRemortgageBreakeven(baseInputs);

			expect(result.legalFees).toBe(1350); // ESTIMATED_REMORTGAGE_LEGAL_FEES
		});

		it("uses custom legal fees when specified", () => {
			const result = calculateRemortgageBreakeven({
				...baseInputs,
				legalFees: 2000,
			});

			expect(result.legalFees).toBe(2000);
		});
	});

	describe("interest savings", () => {
		it("tracks cumulative interest on both paths", () => {
			const result = calculateRemortgageBreakeven(baseInputs);

			expect(
				result.interestSavingsDetails.totalInterestCurrent,
			).toBeGreaterThan(0);
			expect(result.interestSavingsDetails.totalInterestNew).toBeGreaterThan(0);
		});

		it("calculates total interest saved over term", () => {
			const result = calculateRemortgageBreakeven(baseInputs);

			expect(result.interestSavingsDetails.interestSaved).toBeGreaterThan(0);
			expect(
				result.interestSavingsDetails.totalInterestCurrent,
			).toBeGreaterThan(result.interestSavingsDetails.totalInterestNew);
		});

		it("calculates net benefit (interest saved - switching costs)", () => {
			const result = calculateRemortgageBreakeven(baseInputs);

			const expectedNetBenefit =
				result.interestSavingsDetails.interestSaved -
				result.interestSavingsDetails.switchingCosts;

			expect(result.interestSavingsDetails.netBenefit).toBe(
				Math.round(expectedNetBenefit),
			);
		});
	});

	describe("breakdown data", () => {
		it("provides yearly breakdown", () => {
			const result = calculateRemortgageBreakeven(baseInputs);

			expect(result.yearlyBreakdown.length).toBe(20); // 240 months / 12
			expect(result.yearlyBreakdown[0].year).toBe(1);
		});

		it("provides monthly breakdown for first 48 months", () => {
			const result = calculateRemortgageBreakeven(baseInputs);

			expect(result.monthlyBreakdown.length).toBe(48);
			expect(result.monthlyBreakdown[0].month).toBe(1);
		});

		it("tracks cumulative savings in breakdown", () => {
			const result = calculateRemortgageBreakeven(baseInputs);

			// Cumulative savings should increase over time
			expect(result.monthlyBreakdown[11].cumulativeSavings).toBeGreaterThan(
				result.monthlyBreakdown[0].cumulativeSavings,
			);
		});

		it("tracks net savings (cumulative - switching costs)", () => {
			const result = calculateRemortgageBreakeven(baseInputs);

			const month12 = result.monthlyBreakdown[11];
			expect(month12.netSavings).toBe(
				month12.cumulativeSavings - result.switchingCosts,
			);
		});
	});

	describe("edge cases", () => {
		it("handles same rate (no savings)", () => {
			const result = calculateRemortgageBreakeven({
				...baseInputs,
				newRate: 4.5, // Same as current
			});

			expect(result.monthlySavings).toBe(0);
			expect(result.breakevenMonths).toBe(Infinity);
		});

		it("handles very short remaining term", () => {
			const result = calculateRemortgageBreakeven({
				...baseInputs,
				remainingTermMonths: 12,
			});

			expect(result.yearlyBreakdown.length).toBe(1);
		});

		it("handles zero switching costs with cashback", () => {
			const result = calculateRemortgageBreakeven({
				...baseInputs,
				cashback: 1500, // More than legal fees
			});

			expect(result.switchingCosts).toBe(0); // Math.max(0, ...)
			expect(result.breakevenMonths).toBe(1); // Immediate breakeven
		});
	});
});

describe("formatBreakevenPeriod", () => {
	it.each([
		{ months: 1, expected: "1 month" },
		{ months: 2, expected: "2 months" },
		{ months: 11, expected: "11 months" },
		{ months: 12, expected: "1 year" },
		{ months: 13, expected: "1 year 1 month" },
		{ months: 14, expected: "1 year 2 months" },
		{ months: 24, expected: "2 years" },
		{ months: 25, expected: "2 years 1 month" },
		{ months: 30, expected: "2 years 6 months" },
		{ months: 36, expected: "3 years" },
	])("formats $months months as '$expected'", ({ months, expected }) => {
		expect(formatBreakevenPeriod(months)).toBe(expected);
	});

	it("returns 'Never' for null", () => {
		expect(formatBreakevenPeriod(null)).toBe("Never");
	});

	it("returns 'Never' for Infinity", () => {
		expect(formatBreakevenPeriod(Infinity)).toBe("Never");
	});

	it("returns 'Never' for -Infinity", () => {
		expect(formatBreakevenPeriod(-Infinity)).toBe("Never");
	});
});

describe("default values", () => {
	it("exports correct default values", () => {
		expect(DEFAULT_RENT_INFLATION).toBe(2);
		expect(DEFAULT_HOME_APPRECIATION).toBe(4);
		expect(DEFAULT_MAINTENANCE_RATE).toBe(1);
		expect(DEFAULT_OPPORTUNITY_COST_RATE).toBe(6);
		expect(DEFAULT_SALE_COST_RATE).toBe(3);
	});
});

describe("calculateCashbackBreakeven", () => {
	const baseInputs: CashbackBreakevenInputs = {
		mortgageAmount: 300000,
		mortgageTermMonths: 300, // 25 years
		options: [
			{
				label: "Option 1",
				rate: 3.5,
				cashbackType: "percentage",
				cashbackValue: 2,
			},
			{
				label: "Option 2",
				rate: 3.3,
				cashbackType: "flat",
				cashbackValue: 3000,
			},
		],
	};

	describe("comparison period", () => {
		it("uses full term when all options are variable (no fixed period)", () => {
			const result = calculateCashbackBreakeven(baseInputs);

			// No fixedPeriodYears specified = variable, so compare over full term
			expect(result.allVariable).toBe(true);
			expect(result.comparisonPeriodMonths).toBe(300);
			expect(result.comparisonPeriodYears).toBe(25);
		});

		it("uses max fixed period when options have fixed periods", () => {
			const inputs: CashbackBreakevenInputs = {
				...baseInputs,
				options: [
					{
						label: "3 Year Fixed",
						rate: 3.5,
						cashbackType: "percentage",
						cashbackValue: 2,
						fixedPeriodYears: 3,
					},
					{
						label: "5 Year Fixed",
						rate: 3.3,
						cashbackType: "flat",
						cashbackValue: 3000,
						fixedPeriodYears: 5,
					},
				],
			};

			const result = calculateCashbackBreakeven(inputs);

			expect(result.allVariable).toBe(false);
			expect(result.comparisonPeriodMonths).toBe(60); // 5 years * 12
			expect(result.comparisonPeriodYears).toBe(5);
		});

		it("uses max fixed period even when mixed with variable", () => {
			const inputs: CashbackBreakevenInputs = {
				...baseInputs,
				options: [
					{
						label: "Variable",
						rate: 3.5,
						cashbackType: "percentage",
						cashbackValue: 2,
						fixedPeriodYears: 0, // Explicitly variable
					},
					{
						label: "3 Year Fixed",
						rate: 3.3,
						cashbackType: "flat",
						cashbackValue: 3000,
						fixedPeriodYears: 3,
					},
				],
			};

			const result = calculateCashbackBreakeven(inputs);

			expect(result.allVariable).toBe(false);
			expect(result.comparisonPeriodMonths).toBe(36); // 3 years * 12
		});

		it("caps comparison period at mortgage term", () => {
			const inputs: CashbackBreakevenInputs = {
				mortgageAmount: 300000,
				mortgageTermMonths: 24, // 2 year mortgage
				options: [
					{
						label: "5 Year Fixed",
						rate: 3.5,
						cashbackType: "percentage",
						cashbackValue: 2,
						fixedPeriodYears: 5,
					},
				],
			};

			const result = calculateCashbackBreakeven(inputs);

			// Should cap at mortgage term, not 5 years
			expect(result.comparisonPeriodMonths).toBe(24);
		});
	});

	describe("basic calculation", () => {
		it("calculates results for each option", () => {
			const result = calculateCashbackBreakeven(baseInputs);

			expect(result.options).toHaveLength(2);
			expect(result.options[0].label).toBe("Option 1");
			expect(result.options[1].label).toBe("Option 2");
		});

		it("calculates monthly payment correctly", () => {
			const result = calculateCashbackBreakeven(baseInputs);

			// €300k at 3.5% over 25 years ≈ €1,502
			expect(result.options[0].monthlyPayment).toBeCloseTo(1502, 0);
			// €300k at 3.3% over 25 years ≈ €1,470
			expect(result.options[1].monthlyPayment).toBeCloseTo(1470, 0);
		});

		it("calculates percentage cashback correctly", () => {
			const result = calculateCashbackBreakeven(baseInputs);

			// 2% of €300k = €6,000
			expect(result.options[0].cashbackAmount).toBe(6000);
		});

		it("calculates flat cashback correctly", () => {
			const result = calculateCashbackBreakeven(baseInputs);

			// Flat €3,000
			expect(result.options[1].cashbackAmount).toBe(3000);
		});

		it("calculates net cost as interest minus cashback", () => {
			const result = calculateCashbackBreakeven(baseInputs);

			// Net cost = interest paid over comparison period - cashback
			expect(result.options[0].netCost).toBe(
				result.options[0].interestPaid - result.options[0].cashbackAmount,
			);
		});

		it("tracks fixedPeriodYears in results", () => {
			const inputs: CashbackBreakevenInputs = {
				...baseInputs,
				options: [
					{
						label: "Fixed",
						rate: 3.5,
						cashbackType: "percentage",
						cashbackValue: 2,
						fixedPeriodYears: 3,
					},
					{
						label: "Variable",
						rate: 3.3,
						cashbackType: "flat",
						cashbackValue: 3000,
					},
				],
			};

			const result = calculateCashbackBreakeven(inputs);

			expect(result.options[0].fixedPeriodYears).toBe(3);
			expect(result.options[1].fixedPeriodYears).toBe(0);
		});
	});

	describe("monthly payment diff", () => {
		it("calculates monthly payment diff vs cheapest", () => {
			const result = calculateCashbackBreakeven(baseInputs);

			const minPayment = Math.min(
				...result.options.map((o) => o.monthlyPayment),
			);

			// Option with lowest payment should have 0 diff
			const cheapestOption = result.options.find(
				(o) => o.monthlyPayment === minPayment,
			);
			expect(cheapestOption?.monthlyPaymentDiff).toBe(0);

			// Other options should have positive diff
			result.options
				.filter((o) => o.monthlyPayment !== minPayment)
				.forEach((opt) => {
					expect(opt.monthlyPaymentDiff).toBeGreaterThan(0);
					expect(opt.monthlyPaymentDiff).toBeCloseTo(
						opt.monthlyPayment - minPayment,
						2,
					);
				});
		});
	});

	describe("principal and balance tracking", () => {
		it("tracks principal paid over comparison period", () => {
			const result = calculateCashbackBreakeven(baseInputs);

			// Principal paid should be positive
			result.options.forEach((opt) => {
				expect(opt.principalPaid).toBeGreaterThan(0);
			});
		});

		it("calculates balance at end of comparison period", () => {
			const result = calculateCashbackBreakeven(baseInputs);

			// Balance at end should be less than starting amount
			result.options.forEach((opt) => {
				expect(opt.balanceAtEnd).toBeLessThan(baseInputs.mortgageAmount);
				expect(opt.balanceAtEnd).toBeGreaterThanOrEqual(0);
			});
		});

		it("yearly breakdown includes principal and balance", () => {
			const result = calculateCashbackBreakeven(baseInputs);

			const year1 = result.yearlyBreakdown[0];
			expect(year1.principalPaid).toHaveLength(result.options.length);
			expect(year1.balances).toHaveLength(result.options.length);

			// Principal paid should increase over time
			const year5 = result.yearlyBreakdown[4];
			year1.principalPaid.forEach((_, i) => {
				expect(year5.principalPaid[i]).toBeGreaterThan(year1.principalPaid[i]);
			});
		});
	});

	describe("cashback caps", () => {
		it("applies percentage cap correctly", () => {
			const inputsWithCap: CashbackBreakevenInputs = {
				...baseInputs,
				mortgageAmount: 600000, // 2% would be €12,000
				options: [
					{
						label: "Capped Option",
						rate: 3.5,
						cashbackType: "percentage",
						cashbackValue: 2,
						cashbackCap: 10000, // Cap at €10k
					},
				],
			};

			const result = calculateCashbackBreakeven(inputsWithCap);

			// 2% of €600k = €12,000, but capped at €10,000
			expect(result.options[0].cashbackAmount).toBe(10000);
		});

		it("does not cap when under limit", () => {
			const inputsWithCap: CashbackBreakevenInputs = {
				...baseInputs,
				mortgageAmount: 300000, // 2% = €6,000
				options: [
					{
						label: "Under Cap",
						rate: 3.5,
						cashbackType: "percentage",
						cashbackValue: 2,
						cashbackCap: 10000, // Cap at €10k, but only €6k earned
					},
				],
			};

			const result = calculateCashbackBreakeven(inputsWithCap);

			// 2% of €300k = €6,000, under cap
			expect(result.options[0].cashbackAmount).toBe(6000);
		});
	});

	describe("ranking", () => {
		it("identifies cheapest option by monthly payment", () => {
			const result = calculateCashbackBreakeven(baseInputs);

			const minPayment = Math.min(
				...result.options.map((o) => o.monthlyPayment),
			);
			expect(result.options[result.cheapestMonthlyIndex].monthlyPayment).toBe(
				minPayment,
			);
		});

		it("identifies cheapest option by net cost", () => {
			const result = calculateCashbackBreakeven(baseInputs);

			const minNetCost = Math.min(...result.options.map((o) => o.netCost));
			expect(result.options[result.cheapestNetCostIndex].netCost).toBe(
				minNetCost,
			);
		});

		it("calculates savings vs worst option", () => {
			const result = calculateCashbackBreakeven(baseInputs);

			const worstNetCost = Math.max(...result.options.map((o) => o.netCost));
			const bestNetCost = Math.min(...result.options.map((o) => o.netCost));

			expect(result.savingsVsWorst).toBe(worstNetCost - bestNetCost);
		});

		it("high cashback can beat low rate in short comparison period", () => {
			const inputs: CashbackBreakevenInputs = {
				mortgageAmount: 300000,
				mortgageTermMonths: 300,
				options: [
					{
						label: "High Cashback",
						rate: 3.5, // Higher rate
						cashbackType: "percentage",
						cashbackValue: 3, // 3% = €9,000
						fixedPeriodYears: 3,
					},
					{
						label: "Low Rate",
						rate: 3.2, // Lower rate
						cashbackType: "flat",
						cashbackValue: 1000, // Only €1,000
						fixedPeriodYears: 3,
					},
				],
			};

			const result = calculateCashbackBreakeven(inputs);

			// With only 3-year comparison, the high cashback may be cheaper
			// because the interest difference hasn't accumulated enough
			expect(result.comparisonPeriodYears).toBe(3);
		});
	});

	describe("breakdown data", () => {
		it("provides yearly breakdown up to comparison period", () => {
			const inputs: CashbackBreakevenInputs = {
				...baseInputs,
				options: [
					{
						label: "5 Year Fixed",
						rate: 3.5,
						cashbackType: "percentage",
						cashbackValue: 2,
						fixedPeriodYears: 5,
					},
				],
			};

			const result = calculateCashbackBreakeven(inputs);

			// Should only have 5 years of data
			expect(result.yearlyBreakdown.length).toBe(5);
			expect(result.yearlyBreakdown[0].year).toBe(1);
			expect(result.yearlyBreakdown[4].year).toBe(5);
		});

		it("provides monthly breakdown for first 48 months or comparison period", () => {
			const result = calculateCashbackBreakeven(baseInputs);

			// For 25 year term (all variable), should have 48 months
			expect(result.monthlyBreakdown.length).toBe(48);
			expect(result.monthlyBreakdown[0].month).toBe(1);
			expect(result.monthlyBreakdown[47].month).toBe(48);
		});

		it("monthly breakdown respects comparison period", () => {
			const inputs: CashbackBreakevenInputs = {
				...baseInputs,
				options: [
					{
						label: "2 Year Fixed",
						rate: 3.5,
						cashbackType: "percentage",
						cashbackValue: 2,
						fixedPeriodYears: 2,
					},
				],
			};

			const result = calculateCashbackBreakeven(inputs);

			// Should only have 24 months of data (2 years)
			expect(result.monthlyBreakdown.length).toBe(24);
		});

		it("tracks net costs for all options in breakdown", () => {
			const result = calculateCashbackBreakeven(baseInputs);

			const year1 = result.yearlyBreakdown[0];
			expect(year1.netCosts).toHaveLength(2);
		});

		it("provides projection year when not at term end", () => {
			const inputs: CashbackBreakevenInputs = {
				...baseInputs,
				options: [
					{
						label: "3 Year Fixed",
						rate: 3.5,
						cashbackType: "percentage",
						cashbackValue: 2,
						fixedPeriodYears: 3,
					},
				],
			};

			const result = calculateCashbackBreakeven(inputs);

			// Comparison period is 3 years, term is 25 years
			// Should have projection year for year 4
			expect(result.projectionYear).not.toBeNull();
			expect(result.projectionYear?.year).toBe(4);
			expect(result.projectionYear?.netCosts).toHaveLength(1);
		});

		it("does not provide projection year when at term end", () => {
			const inputs: CashbackBreakevenInputs = {
				mortgageAmount: 300000,
				mortgageTermMonths: 60, // 5 year mortgage
				options: [
					{
						label: "5 Year Fixed",
						rate: 3.5,
						cashbackType: "percentage",
						cashbackValue: 2,
						fixedPeriodYears: 5,
					},
				],
			};

			const result = calculateCashbackBreakeven(inputs);

			// Comparison period equals term, no room for projection
			expect(result.projectionYear).toBeNull();
		});

		it("does not provide projection year for all variable (full term)", () => {
			const result = calculateCashbackBreakeven(baseInputs);

			// All variable = full term comparison, no projection needed
			expect(result.projectionYear).toBeNull();
		});
	});

	describe("multiple options", () => {
		it("handles 3 options", () => {
			const inputs: CashbackBreakevenInputs = {
				...baseInputs,
				options: [
					{
						label: "A",
						rate: 3.5,
						cashbackType: "percentage",
						cashbackValue: 2,
					},
					{ label: "B", rate: 3.3, cashbackType: "flat", cashbackValue: 3000 },
					{
						label: "C",
						rate: 3.4,
						cashbackType: "percentage",
						cashbackValue: 1,
					},
				],
			};

			const result = calculateCashbackBreakeven(inputs);

			expect(result.options).toHaveLength(3);
			expect(result.breakevens.length).toBe(3); // A-B, A-C, B-C
		});

		it("handles 5 options", () => {
			const inputs: CashbackBreakevenInputs = {
				...baseInputs,
				options: [
					{
						label: "A",
						rate: 3.5,
						cashbackType: "percentage",
						cashbackValue: 2,
					},
					{ label: "B", rate: 3.3, cashbackType: "flat", cashbackValue: 3000 },
					{
						label: "C",
						rate: 3.4,
						cashbackType: "percentage",
						cashbackValue: 1,
					},
					{ label: "D", rate: 3.6, cashbackType: "flat", cashbackValue: 5000 },
					{
						label: "E",
						rate: 3.2,
						cashbackType: "percentage",
						cashbackValue: 0,
					},
				],
			};

			const result = calculateCashbackBreakeven(inputs);

			expect(result.options).toHaveLength(5);
			// Combinations: A-B, A-C, A-D, A-E, B-C, B-D, B-E, C-D, C-E, D-E = 10
			expect(result.breakevens.length).toBe(10);
		});
	});

	describe("edge cases", () => {
		it("handles same rate different cashback", () => {
			const inputs: CashbackBreakevenInputs = {
				...baseInputs,
				options: [
					{
						label: "More Cashback",
						rate: 3.5,
						cashbackType: "percentage",
						cashbackValue: 2,
					},
					{
						label: "Less Cashback",
						rate: 3.5,
						cashbackType: "percentage",
						cashbackValue: 1,
					},
				],
			};

			const result = calculateCashbackBreakeven(inputs);

			// Same rate, more cashback should always be cheaper
			expect(result.cheapestNetCostIndex).toBe(0);
		});

		it("handles same cashback different rates", () => {
			const inputs: CashbackBreakevenInputs = {
				...baseInputs,
				options: [
					{
						label: "Lower Rate",
						rate: 3.2,
						cashbackType: "flat",
						cashbackValue: 3000,
					},
					{
						label: "Higher Rate",
						rate: 3.5,
						cashbackType: "flat",
						cashbackValue: 3000,
					},
				],
			};

			const result = calculateCashbackBreakeven(inputs);

			// Same cashback, lower rate should always be cheaper
			expect(result.cheapestNetCostIndex).toBe(0);
		});

		it("handles zero cashback", () => {
			const inputs: CashbackBreakevenInputs = {
				...baseInputs,
				options: [
					{
						label: "No Cashback",
						rate: 3.5,
						cashbackType: "flat",
						cashbackValue: 0,
					},
				],
			};

			const result = calculateCashbackBreakeven(inputs);

			expect(result.options[0].cashbackAmount).toBe(0);
			expect(result.options[0].netCost).toBe(result.options[0].interestPaid);
		});

		it("handles short term", () => {
			const inputs: CashbackBreakevenInputs = {
				...baseInputs,
				mortgageTermMonths: 60, // 5 years
			};

			const result = calculateCashbackBreakeven(inputs);

			expect(result.yearlyBreakdown.length).toBe(5);
		});
	});
});
