import type { OverpaymentPolicy } from "@/lib/schemas/overpayment-policy";
import type { ResolvedRatePeriod } from "@/lib/schemas/simulate";
import { formatNumber } from "@/lib/utils/currency";
import { calculateMonthlyPayment } from "./calculations";

/**
 * Represents a yearly overpayment plan for maximum fee-free overpayments
 */
export interface YearlyOverpaymentPlan {
	year: number;
	startMonth: number;
	endMonth: number;
	monthlyAmount: number;
	estimatedBalance: number;
}

/**
 * Calculate maximum monthly overpayment for a single year based on policy
 */
export function calculateMaxMonthlyOverpaymentForYear(
	policy: OverpaymentPolicy,
	balance: number,
	monthlyPayment: number,
): number {
	let amount = 0;

	switch (policy.allowanceType) {
		case "percentage":
			if (policy.allowanceBasis === "balance") {
				// e.g., 10% of balance per year → divide by 12 for monthly
				const yearlyAmount = (balance * policy.allowanceValue) / 100;
				amount = Math.floor(yearlyAmount / 12);
			} else if (policy.allowanceBasis === "monthly") {
				// e.g., 10% of monthly payment per month
				amount = Math.floor((monthlyPayment * policy.allowanceValue) / 100);
			}
			break;
		case "flat":
			// e.g., €5,000 per year → convert to cents and divide by 12 for monthly
			amount = Math.floor((policy.allowanceValue * 100) / 12);
			break;
	}

	// Apply minimum amount if specified (e.g., BOI's €65 minimum)
	// minAmount is in euros, convert to cents
	if (policy.minAmount !== undefined && policy.minAmount > 0) {
		const minAmountCents = policy.minAmount * 100;
		amount = Math.max(amount, minAmountCents);
	}

	return amount;
}

/**
 * Check if a policy has a constant allowance (doesn't depend on balance)
 */
export function isConstantAllowancePolicy(policy: OverpaymentPolicy): boolean {
	// Monthly-payment-based policies: amount is constant since monthly payment is fixed
	if (
		policy.allowanceType === "percentage" &&
		policy.allowanceBasis === "monthly"
	) {
		return true;
	}
	// Flat policies: amount is always the same
	if (policy.allowanceType === "flat") {
		return true;
	}
	return false;
}

/**
 * Get calendar year boundaries for a mortgage month range
 * Returns array of {startMonth, endMonth, calendarYear} for each calendar year in the range
 */
function getCalendarYearBoundaries(
	startDate: string | undefined,
	periodStartMonth: number,
	periodEndMonth: number,
): Array<{ startMonth: number; endMonth: number; calendarYear: number }> {
	// If no startDate, fall back to mortgage year boundaries
	if (!startDate) {
		const boundaries: Array<{
			startMonth: number;
			endMonth: number;
			calendarYear: number;
		}> = [];
		let currentStart = periodStartMonth;
		let yearIndex = 1;

		while (currentStart <= periodEndMonth) {
			const yearEndMonth = Math.min(currentStart + 11, periodEndMonth);
			boundaries.push({
				startMonth: currentStart,
				endMonth: yearEndMonth,
				calendarYear: yearIndex,
			});
			currentStart = yearEndMonth + 1;
			yearIndex++;
		}
		return boundaries;
	}

	// Parse start date to get calendar alignment
	const [startYear, startMonthOfYear] = startDate.split("-").map(Number);

	const boundaries: Array<{
		startMonth: number;
		endMonth: number;
		calendarYear: number;
	}> = [];

	let currentMortgageMonth = periodStartMonth;

	while (currentMortgageMonth <= periodEndMonth) {
		// Calculate which calendar month this mortgage month falls in
		// mortgageMonth 1 = startMonthOfYear of startYear
		const totalMonthsFromEpoch =
			startYear * 12 + (startMonthOfYear - 1) + (currentMortgageMonth - 1);
		const calendarYear = Math.floor(totalMonthsFromEpoch / 12);
		const calendarMonth = (totalMonthsFromEpoch % 12) + 1;

		// Find the end of this calendar year (December)
		// Months remaining until end of year = 12 - calendarMonth
		const monthsUntilYearEnd = 12 - calendarMonth;
		const yearEndMortgageMonth = Math.min(
			currentMortgageMonth + monthsUntilYearEnd,
			periodEndMonth,
		);

		boundaries.push({
			startMonth: currentMortgageMonth,
			endMonth: yearEndMortgageMonth,
			calendarYear,
		});

		currentMortgageMonth = yearEndMortgageMonth + 1;
	}

	return boundaries;
}

/**
 * Calculate yearly overpayment plans for a fixed rate period
 * Returns plans that maximize fee-free overpayments
 * When startDate is provided, aligns to calendar years (Jan-Dec)
 */
export function calculateYearlyOverpaymentPlans(
	policy: OverpaymentPolicy,
	period: ResolvedRatePeriod,
	mortgageAmount: number,
	totalMonths: number,
	startDate?: string,
	constructionEndMonth?: number,
): YearlyOverpaymentPlan[] {
	const plans: YearlyOverpaymentPlan[] = [];
	const periodDurationMonths =
		period.durationMonths || totalMonths - period.startMonth + 1;
	const periodEndMonth = period.startMonth + periodDurationMonths - 1;

	// For self-build: delay overpayments until after full drawdown
	// This avoids issues with overpayment policy allowances while not fully drawn down
	const effectiveStartMonth =
		constructionEndMonth && period.startMonth <= constructionEndMonth
			? constructionEndMonth + 1
			: period.startMonth;

	// If the effective start is after the period ends, no plans can be created
	if (effectiveStartMonth > periodEndMonth) {
		return plans;
	}

	// Calculate monthly payment ONCE at start of period (same as actual amortization)
	const remainingMonthsAtStart = totalMonths - period.startMonth + 1;
	const fixedMonthlyPayment =
		calculateMonthlyPayment(
			mortgageAmount / 100, // Convert cents to euros
			period.rate,
			remainingMonthsAtStart,
		) * 100; // Convert back to cents

	// For constant-allowance policies (monthly-based or flat), create a single plan
	// for the entire period since the amount doesn't change
	if (isConstantAllowancePolicy(policy)) {
		const monthlyAmount = calculateMaxMonthlyOverpaymentForYear(
			policy,
			mortgageAmount, // Balance doesn't matter for these policies
			fixedMonthlyPayment,
		);

		if (monthlyAmount > 0) {
			plans.push({
				year: 1,
				startMonth: effectiveStartMonth,
				endMonth: periodEndMonth,
				monthlyAmount,
				estimatedBalance: mortgageAmount,
			});
		}
		return plans;
	}

	// For balance-based policies, calculate per-year since amount decreases
	// Use calendar year boundaries when startDate is provided
	const yearBoundaries = getCalendarYearBoundaries(
		startDate,
		effectiveStartMonth,
		periodEndMonth,
	);

	let estimatedBalance = mortgageAmount;
	const monthlyRate = period.rate / 100 / 12;

	for (let yearIndex = 0; yearIndex < yearBoundaries.length; yearIndex++) {
		const boundary = yearBoundaries[yearIndex];

		// Calculate max monthly overpayment for this year based on balance at year start
		const monthlyAmount = calculateMaxMonthlyOverpaymentForYear(
			policy,
			estimatedBalance,
			fixedMonthlyPayment,
		);

		if (monthlyAmount > 0) {
			plans.push({
				year: yearIndex + 1,
				startMonth: boundary.startMonth,
				endMonth: boundary.endMonth,
				monthlyAmount,
				estimatedBalance,
			});
		}

		// Estimate balance at start of next year
		const monthsInThisYear = boundary.endMonth - boundary.startMonth + 1;

		for (let m = 0; m < monthsInThisYear; m++) {
			const interestPortion = estimatedBalance * monthlyRate;
			const principalPortion = fixedMonthlyPayment - interestPortion;
			const overpayment = monthlyAmount;
			estimatedBalance = Math.max(
				0,
				estimatedBalance - principalPortion - overpayment,
			);
		}

		if (estimatedBalance <= 0) break;
	}

	return plans;
}

/**
 * Format policy description for display
 */
export function formatPolicyDescription(
	policy: OverpaymentPolicy | undefined,
): string {
	if (!policy) return "No allowance";

	if (policy.allowanceType === "percentage") {
		if (policy.allowanceBasis === "balance") {
			return `${policy.allowanceValue}% of balance per year`;
		}
		if (policy.allowanceBasis === "monthly") {
			return `${policy.allowanceValue}% of monthly payment`;
		}
	}

	if (policy.allowanceType === "flat") {
		return `€${formatNumber(policy.allowanceValue)} per year`;
	}

	return "No allowance";
}

/**
 * Create maps of overpayments by month, split by type (one-time vs recurring).
 * Used by chart components to display overpayment breakdown.
 *
 * @param appliedOverpayments - Array of applied overpayments from amortization calculation
 * @returns Object with two maps: oneTimeByMonth and recurringByMonth (amounts in cents)
 */
export function createOverpaymentMaps(
	appliedOverpayments: Array<{
		month: number;
		amount: number;
		isRecurring: boolean;
	}>,
): {
	oneTimeByMonth: Map<number, number>;
	recurringByMonth: Map<number, number>;
} {
	const oneTimeByMonth = new Map<number, number>();
	const recurringByMonth = new Map<number, number>();

	for (const op of appliedOverpayments) {
		if (op.isRecurring) {
			recurringByMonth.set(
				op.month,
				(recurringByMonth.get(op.month) ?? 0) + op.amount,
			);
		} else {
			oneTimeByMonth.set(
				op.month,
				(oneTimeByMonth.get(op.month) ?? 0) + op.amount,
			);
		}
	}

	return { oneTimeByMonth, recurringByMonth };
}
