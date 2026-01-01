/**
 * Mortgage payment calculations
 */

import type { BerRating, MortgageRate } from "@/lib/schemas";

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
 * @param fixedRate - The fixed rate to find a follow-up for
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

/**
 * Calculate the total amount repayable over the full mortgage term.
 * For fixed rates, includes both the fixed period and follow-up variable period.
 *
 * @param rate - The mortgage rate
 * @param monthlyPayment - Monthly payment during initial period
 * @param monthlyFollowUp - Monthly payment during follow-up period (for fixed rates)
 * @param totalTermYears - Total mortgage term in years
 * @returns Total amount repayable over the full term
 */
export function calculateTotalRepayable(
	rate: MortgageRate,
	monthlyPayment: number,
	monthlyFollowUp: number | undefined,
	totalTermYears: number,
): number {
	const totalMonths = totalTermYears * 12;

	if (rate.type === "fixed" && rate.fixedTerm && monthlyFollowUp) {
		const fixedMonths = rate.fixedTerm * 12;
		const remainingMonths = totalMonths - fixedMonths;
		return monthlyPayment * fixedMonths + monthlyFollowUp * remainingMonths;
	}

	return monthlyPayment * totalMonths;
}
