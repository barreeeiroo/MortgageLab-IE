/**
 * Mortgage payment calculations
 */

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
