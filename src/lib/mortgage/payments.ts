/**
 * Mortgage payment calculations
 */

import type { MortgageRate } from "@/lib/schemas";

/**
 * Calculate monthly payment for a loan using the standard amortization formula.
 *
 * @param principal - The loan amount
 * @param annualRate - Annual interest rate as a percentage (e.g., 3.5 for 3.5%)
 * @param months - Total number of monthly payments
 * @returns Monthly payment amount
 */
export function calculateMonthlyPayment(
	principal: number,
	annualRate: number,
	months: number,
): number {
	if (annualRate === 0) return principal / months;
	const monthlyRate = annualRate / 100 / 12;
	return (
		(principal * monthlyRate * (1 + monthlyRate) ** months) /
		((1 + monthlyRate) ** months - 1)
	);
}

/**
 * Calculate remaining balance after a number of payments.
 *
 * @param principal - Original loan amount
 * @param annualRate - Annual interest rate as a percentage (e.g., 3.5 for 3.5%)
 * @param totalMonths - Total loan term in months
 * @param paidMonths - Number of payments already made
 * @returns Remaining balance
 */
export function calculateRemainingBalance(
	principal: number,
	annualRate: number,
	totalMonths: number,
	paidMonths: number,
): number {
	if (paidMonths >= totalMonths) return 0;
	if (annualRate === 0) return principal * (1 - paidMonths / totalMonths);

	const monthlyRate = annualRate / 100 / 12;
	const payment = calculateMonthlyPayment(principal, annualRate, totalMonths);
	return (
		principal * (1 + monthlyRate) ** paidMonths -
		(payment * ((1 + monthlyRate) ** paidMonths - 1)) / monthlyRate
	);
}

/**
 * Find the best matching variable rate for a fixed rate.
 * Matches by lender and overlapping LTV range.
 *
 * @param fixedRate - The fixed rate to find a follow-up for
 * @param allRates - All available rates to search through
 * @returns The matching variable rate, or undefined if none found
 */
export function findVariableRate(
	fixedRate: MortgageRate,
	allRates: MortgageRate[],
): MortgageRate | undefined {
	return allRates.find(
		(r) =>
			r.type === "variable" &&
			r.lenderId === fixedRate.lenderId &&
			r.minLtv <= fixedRate.maxLtv &&
			r.maxLtv >= fixedRate.minLtv,
	);
}

/**
 * Calculate the monthly payment for the follow-up period after a fixed term ends.
 *
 * @param rate - The fixed rate
 * @param variableRate - The variable rate to use after fixed term
 * @param principal - Original loan amount
 * @param totalTermYears - Total mortgage term in years
 * @returns Monthly payment for the follow-up period, or undefined if not applicable
 */
export function calculateMonthlyFollowUp(
	rate: MortgageRate,
	variableRate: MortgageRate | undefined,
	principal: number,
	totalTermYears: number,
): number | undefined {
	if (rate.type !== "fixed" || !rate.fixedTerm) return undefined;
	if (!variableRate) return undefined;

	const totalMonths = totalTermYears * 12;
	const fixedMonths = rate.fixedTerm * 12;
	const remainingMonths = totalMonths - fixedMonths;

	if (remainingMonths <= 0) return undefined;

	const remainingBalance = calculateRemainingBalance(
		principal,
		rate.rate,
		totalMonths,
		fixedMonths,
	);

	return calculateMonthlyPayment(
		remainingBalance,
		variableRate.rate,
		remainingMonths,
	);
}
