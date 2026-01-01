/**
 * APRC (Annual Percentage Rate of Charge) calculations
 *
 * APRC allows comparison of mortgages from different lenders by considering
 * all costs over the term including setup charges and interest rates.
 */

import { calculateMonthlyPayment, calculateRemainingBalance } from "./payments";

/**
 * Configuration for APRC calculation, varies by lender
 */
export interface AprcConfig {
	/** Loan amount used for APRC calculation (e.g., €100,000 or €250,000) */
	loanAmount: number;
	/** Total mortgage term in years (typically 20) */
	termYears: number;
	/** Valuation fee paid upfront (deducted from loan) */
	valuationFee: number;
	/** Security release fee paid at end of loan term */
	securityReleaseFee: number;
}

/**
 * Calculate APRC for a fixed rate mortgage that reverts to a variable rate.
 *
 * Uses Newton-Raphson method to find the effective annual rate where NPV = 0.
 * Per EU Consumer Credit Directive, APRC is calculated such that:
 * Sum of drawdowns = Sum of (repayments / (1 + APRC)^t)
 *
 * @param fixedRate - The fixed interest rate as a percentage (e.g., 3.5 for 3.5%)
 * @param fixedTermMonths - Duration of fixed rate period in months
 * @param followOnRate - The variable rate after fixed period ends (percentage)
 * @param config - Lender-specific APRC calculation parameters
 * @returns APRC as a percentage, rounded to 2 decimal places
 */
export function calculateAprc(
	fixedRate: number,
	fixedTermMonths: number,
	followOnRate: number,
	config: AprcConfig,
): number {
	const totalMonths = config.termYears * 12;
	const variableMonths = totalMonths - fixedTermMonths;

	// Calculate payment schedule (rounded to cents as in practice)
	const fixedPayment =
		Math.round(
			calculateMonthlyPayment(config.loanAmount, fixedRate, totalMonths) * 100,
		) / 100;

	// Build cash flows: drawdown (negative), then repayments (positive)
	// Per EU directive: net amount = loan amount - fees deducted at drawdown
	const netLoanAmount = config.loanAmount - config.valuationFee;
	const cashFlows: number[] = [-netLoanAmount];

	if (variableMonths <= 0) {
		// Pure fixed/variable rate for entire term - no rate change
		for (let i = 0; i < totalMonths - 1; i++) {
			cashFlows.push(fixedPayment);
		}
		// Final payment includes the security release fee
		cashFlows.push(fixedPayment + config.securityReleaseFee);
	} else {
		// Fixed period followed by variable period
		const balanceAfterFixed = calculateRemainingBalance(
			config.loanAmount,
			fixedRate,
			totalMonths,
			fixedTermMonths,
		);

		const variablePayment =
			Math.round(
				calculateMonthlyPayment(balanceAfterFixed, followOnRate, variableMonths) *
					100,
			) / 100;

		for (let i = 0; i < fixedTermMonths; i++) {
			cashFlows.push(fixedPayment);
		}

		for (let i = 0; i < variableMonths - 1; i++) {
			cashFlows.push(variablePayment);
		}

		// Final payment includes the security release fee
		cashFlows.push(variablePayment + config.securityReleaseFee);
	}

	// Newton-Raphson to find monthly rate where NPV = 0
	let monthlyRate = fixedRate / 100 / 12; // Initial guess
	const tolerance = 1e-12;
	const maxIterations = 200;

	for (let iter = 0; iter < maxIterations; iter++) {
		let npv = 0;
		let npvDerivative = 0;

		for (let i = 0; i < cashFlows.length; i++) {
			const discountFactor = (1 + monthlyRate) ** i;
			npv += cashFlows[i] / discountFactor;
			if (i > 0) {
				npvDerivative -= (i * cashFlows[i]) / (1 + monthlyRate) ** (i + 1);
			}
		}

		if (Math.abs(npv) < tolerance) break;
		if (Math.abs(npvDerivative) < tolerance) break;

		monthlyRate = monthlyRate - npv / npvDerivative;
	}

	// Convert to effective annual rate (compounded) per EU directive
	const effectiveAnnualRate = (1 + monthlyRate) ** 12 - 1;

	// Convert to percentage and round to 2 decimal places
	return Math.round(effectiveAnnualRate * 10000) / 100;
}

/**
 * Infer the follow-on (variable) rate from a fixed rate product's observed APRC.
 *
 * Uses bisection method to find the variable rate that produces the observed APRC.
 * Useful when lenders don't publicly disclose their SVR but provide APRC figures.
 *
 * @param fixedRate - The fixed interest rate as a percentage
 * @param fixedTermYears - Duration of fixed rate period in years
 * @param observedAprc - The APRC published by the lender
 * @param config - Lender-specific APRC calculation parameters
 * @returns Inferred follow-on rate as a percentage, rounded to 2 decimal places
 */
export function inferFollowOnRate(
	fixedRate: number,
	fixedTermYears: number,
	observedAprc: number,
	config: AprcConfig,
): number {
	const fixedTermMonths = fixedTermYears * 12;
	let low = 0.01;
	let high = 15.0;
	const tolerance = 0.001;
	const maxIterations = 100;

	for (let i = 0; i < maxIterations; i++) {
		const mid = (low + high) / 2;
		const calculatedAprc = calculateAprc(
			fixedRate,
			fixedTermMonths,
			mid,
			config,
		);

		if (Math.abs(calculatedAprc - observedAprc) < tolerance) {
			return Math.round(mid * 100) / 100;
		}

		if (calculatedAprc < observedAprc) {
			low = mid;
		} else {
			high = mid;
		}
	}

	return Math.round(((low + high) / 2) * 100) / 100;
}
