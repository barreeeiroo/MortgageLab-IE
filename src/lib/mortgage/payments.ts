/**
 * Mortgage payment calculations
 */

import type { BerRating } from "@/lib/constants";
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
 * Matches by lender, overlapping LTV range, and BER eligibility.
 * Prefers follow-on rates (newBusiness: false) over new business rates,
 * since customers rolling off fixed terms typically get the follow-on rate.
 *
 * @param fixedRate - The fixed rate to find a follow-on for
 * @param allRates - All available rates to search through
 * @param ltv - The LTV to match against (optional)
 * @param ber - The BER rating to match against (optional)
 * @returns The matching variable rate, or undefined if none found
 */
export function findVariableRate(
	fixedRate: MortgageRate,
	allRates: MortgageRate[],
	ltv?: number,
	ber?: BerRating,
): MortgageRate | undefined {
	const matchingVariables = allRates.filter((r) => {
		if (r.type !== "variable" || r.lenderId !== fixedRate.lenderId) {
			return false;
		}
		// Filter by BER eligibility if provided
		if (ber !== undefined && r.berEligible !== undefined) {
			if (!r.berEligible.includes(ber)) {
				return false;
			}
		}
		if (ltv !== undefined) {
			return ltv >= r.minLtv && ltv <= r.maxLtv;
		}
		return r.minLtv <= fixedRate.maxLtv && r.maxLtv >= fixedRate.minLtv;
	});

	if (matchingVariables.length === 0) return undefined;

	// Prefer follow-on rates (newBusiness: false) for existing customers
	const followOnRate = matchingVariables.find((r) => r.newBusiness === false);
	if (followOnRate) return followOnRate;

	// Fall back to any matching variable rate
	return matchingVariables[0];
}

/**
 * Calculate the monthly payment for the follow-on period after a fixed term ends.
 *
 * @param rate - The fixed rate
 * @param variableRate - The variable rate to use after fixed term
 * @param principal - Original loan amount
 * @param totalTermMonths - Total mortgage term in months
 * @returns Monthly payment for the follow-on period, or undefined if not applicable
 */
export function calculateMonthlyFollowOn(
	rate: MortgageRate,
	variableRate: MortgageRate | undefined,
	principal: number,
	totalTermMonths: number,
): number | undefined {
	if (rate.type !== "fixed" || !rate.fixedTerm) return undefined;
	if (!variableRate) return undefined;

	const fixedMonths = rate.fixedTerm * 12;
	const remainingMonths = totalTermMonths - fixedMonths;

	if (remainingMonths <= 0) return undefined;

	const remainingBalance = calculateRemainingBalance(
		principal,
		rate.rate,
		totalTermMonths,
		fixedMonths,
	);

	return calculateMonthlyPayment(
		remainingBalance,
		variableRate.rate,
		remainingMonths,
	);
}

/**
 * Calculate the total amount repayable over the full mortgage term.
 * For fixed rates, includes both the fixed period and follow-on variable period.
 *
 * @param rate - The mortgage rate
 * @param monthlyPayment - Monthly payment during initial period
 * @param monthlyFollowOn - Monthly payment during follow-on period (for fixed rates)
 * @param totalTermMonths - Total mortgage term in months
 * @returns Total amount repayable over the full term
 */
export function calculateTotalRepayable(
	rate: MortgageRate,
	monthlyPayment: number,
	monthlyFollowOn: number | undefined,
	totalTermMonths: number,
): number {
	if (rate.type === "fixed" && rate.fixedTerm && monthlyFollowOn) {
		const fixedMonths = rate.fixedTerm * 12;
		const remainingMonths = totalTermMonths - fixedMonths;
		return monthlyPayment * fixedMonths + monthlyFollowOn * remainingMonths;
	}

	return monthlyPayment * totalTermMonths;
}

/**
 * Calculate the LTV after a fixed term ends, accounting for principal paid down.
 *
 * @param principal - Original loan amount
 * @param annualRate - Annual interest rate as a percentage (e.g., 3.5 for 3.5%)
 * @param totalMonths - Total loan term in months
 * @param fixedMonths - Duration of fixed rate period in months
 * @param originalLtv - Original LTV at mortgage start
 * @returns LTV after the fixed term ends
 */
export function calculateFollowOnLtv(
	principal: number,
	annualRate: number,
	totalMonths: number,
	fixedMonths: number,
	originalLtv: number,
): number {
	const remainingBalance = calculateRemainingBalance(
		principal,
		annualRate,
		totalMonths,
		fixedMonths,
	);
	return (remainingBalance / principal) * originalLtv;
}

/**
 * Calculate the cost of credit as a percentage of the loan amount.
 *
 * @param totalRepayable - Total amount repayable over the mortgage term
 * @param principal - Original loan amount
 * @returns Cost of credit as a percentage, or undefined if totalRepayable is undefined
 */
export function calculateCostOfCreditPercent(
	totalRepayable: number | undefined,
	principal: number,
): number | undefined {
	if (totalRepayable === undefined) return undefined;
	return ((totalRepayable - principal) / principal) * 100;
}
