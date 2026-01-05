import type { OverpaymentPolicy } from "@/lib/schemas/overpayment-policy";
import type { ResolvedRatePeriod } from "@/lib/schemas/simulate";
import { calculateMonthlyPayment } from "./payments";

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
 * Calculate yearly overpayment plans for a fixed rate period
 * Returns plans that maximize fee-free overpayments
 */
export function calculateYearlyOverpaymentPlans(
	policy: OverpaymentPolicy,
	period: ResolvedRatePeriod,
	mortgageAmount: number,
	totalMonths: number,
): YearlyOverpaymentPlan[] {
	const plans: YearlyOverpaymentPlan[] = [];
	const periodDurationMonths =
		period.durationMonths || totalMonths - period.startMonth + 1;
	const periodEndMonth = period.startMonth + periodDurationMonths - 1;

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
				startMonth: period.startMonth,
				endMonth: periodEndMonth,
				monthlyAmount,
				estimatedBalance: mortgageAmount,
			});
		}
		return plans;
	}

	// For balance-based policies, calculate per-year since amount decreases
	const numYears = Math.ceil(periodDurationMonths / 12);
	let estimatedBalance = mortgageAmount;
	const monthlyRate = period.rate / 100 / 12;

	for (let yearIndex = 0; yearIndex < numYears; yearIndex++) {
		const yearStartMonth = period.startMonth + yearIndex * 12;
		const yearEndMonth = Math.min(yearStartMonth + 11, periodEndMonth);

		// Calculate max monthly overpayment for this year based on balance at year start
		const monthlyAmount = calculateMaxMonthlyOverpaymentForYear(
			policy,
			estimatedBalance,
			fixedMonthlyPayment,
		);

		if (monthlyAmount > 0) {
			plans.push({
				year: yearIndex + 1,
				startMonth: yearStartMonth,
				endMonth: yearEndMonth,
				monthlyAmount,
				estimatedBalance,
			});
		}

		// Estimate balance at start of next year
		const monthsInThisYear = yearEndMonth - yearStartMonth + 1;

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
		return `€${policy.allowanceValue.toLocaleString()} per year`;
	}

	return "No allowance";
}
