import { computed } from "nanostores";
import {
	calculateMonthlyPayment,
	findVariableRate,
} from "@/lib/mortgage/payments";
import type { Lender } from "@/lib/schemas/lender";
import type { OverpaymentPolicy } from "@/lib/schemas/overpayment-policy";
import type { MortgageRate } from "@/lib/schemas/rate";
import type {
	AmortizationMonth,
	AmortizationResult,
	AmortizationYear,
	AppliedOverpayment,
	Milestone,
	MilestoneType,
	OverpaymentConfig,
	RatePeriod,
	ResolvedRatePeriod,
	SimulationState,
	SimulationSummary,
	SimulationWarning,
} from "@/lib/schemas/simulate";
import type { CustomRate } from "@/lib/stores/custom-rates";
import { $customRates } from "../custom-rates";
import { $lenders } from "../lenders";
import { $overpaymentPolicies } from "../overpayment-policies";
import { $rates } from "../rates";
import { $simulationState } from "./simulate-state";

// Helper: Add months to a date string (avoids timezone issues)
// Returns empty string if no start date provided (relative periods mode)
function addMonthsToDate(dateStr: string | undefined, months: number): string {
	if (!dateStr) return "";

	// Parse date components directly to avoid timezone issues
	const [year, month, day] = dateStr.split("-").map(Number);

	// Calculate new date (months - 1 because month 1 = start date)
	const totalMonths = year * 12 + (month - 1) + (months - 1);
	const newYear = Math.floor(totalMonths / 12);
	const newMonth = (totalMonths % 12) + 1;

	return `${newYear}-${String(newMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Helper: Get the calendar year for a given mortgage month
// Returns undefined if no start date (falls back to mortgage year tracking)
function getCalendarYearForMonth(
	startDate: string | undefined,
	mortgageMonth: number,
): number | undefined {
	if (!startDate) return undefined;

	const [startYear, startMonth] = startDate.split("-").map(Number);

	// Calculate total months from year 0
	const totalMonths = startYear * 12 + (startMonth - 1) + (mortgageMonth - 1);
	return Math.floor(totalMonths / 12);
}

// Helper: Check if this month is the first month of a new calendar year
function isFirstMonthOfCalendarYear(
	startDate: string | undefined,
	mortgageMonth: number,
): boolean {
	if (!startDate) return false;
	if (mortgageMonth === 1) return true; // First month is always a "new year" for tracking

	const [startYear, startMonth] = startDate.split("-").map(Number);

	// Calculate the calendar month (1-12) for this mortgage month
	const totalMonths = startYear * 12 + (startMonth - 1) + (mortgageMonth - 1);
	const calendarMonth = (totalMonths % 12) + 1;

	return calendarMonth === 1; // January
}

// Helper: Find rate period for a given month (stack-based model)
// Returns both the period and its computed startMonth
function findRatePeriodForMonth(
	periods: RatePeriod[],
	month: number,
): { period: RatePeriod; startMonth: number } | undefined {
	let currentStart = 1;

	for (const period of periods) {
		const periodEnd =
			period.durationMonths === 0
				? Number.POSITIVE_INFINITY // Until end of mortgage
				: currentStart + period.durationMonths - 1;

		if (month >= currentStart && month <= periodEnd) {
			return { period, startMonth: currentStart };
		}

		currentStart += period.durationMonths;
	}

	return undefined;
}

// Helper: Resolve a rate period to get full rate details
// startMonth is computed from stack position and passed in
function resolveRatePeriod(
	period: RatePeriod,
	startMonth: number,
	allRates: MortgageRate[],
	customRates: CustomRate[],
	lenders: Lender[],
): ResolvedRatePeriod | undefined {
	let rate: MortgageRate | CustomRate | undefined;
	let lenderName = "Unknown";

	if (period.isCustom) {
		rate = customRates.find((r) => r.id === period.rateId);
		if (rate && "customLenderName" in rate) {
			lenderName = rate.customLenderName || "Custom";
		}
	} else {
		rate = allRates.find(
			(r) => r.id === period.rateId && r.lenderId === period.lenderId,
		);
		const lender = lenders.find((l) => l.id === period.lenderId);
		lenderName = lender?.name || "Unknown";
	}

	if (!rate) return undefined;

	// Find overpayment policy for lender (if fixed rate)
	let overpaymentPolicyId: string | undefined;
	if (rate.type === "fixed") {
		const lender = lenders.find((l) => l.id === period.lenderId);
		overpaymentPolicyId = lender?.overpaymentPolicy;
	}

	// Generate label if not provided
	const label =
		period.label ||
		(rate.type === "fixed" && rate.fixedTerm
			? `${lenderName} ${rate.fixedTerm}-Year Fixed @ ${rate.rate}%`
			: `${lenderName} Variable @ ${rate.rate}%`);

	return {
		id: period.id,
		rateId: period.rateId,
		rate: rate.rate,
		type: rate.type,
		fixedTerm: rate.fixedTerm,
		lenderId: period.lenderId,
		lenderName,
		rateName: rate.name,
		startMonth,
		durationMonths: period.durationMonths,
		overpaymentPolicyId,
		label,
		isCustom: period.isCustom,
	};
}

// Helper: Calculate overpayment allowance
function calculateAllowance(
	policy: OverpaymentPolicy | undefined,
	balance: number,
	monthlyPayment: number,
	alreadyPaidThisYear: number,
): number {
	if (!policy) return 0; // No free allowance

	// All values are in cents
	let allowance = 0;

	switch (policy.allowanceType) {
		case "percentage":
			if (policy.allowanceBasis === "balance") {
				// e.g., 10% of balance per year
				allowance = Math.max(
					0,
					(balance * policy.allowanceValue) / 100 - alreadyPaidThisYear,
				);
			} else if (policy.allowanceBasis === "monthly") {
				// e.g., 10% of monthly payment per month (BOI style)
				// This is a per-month allowance, not yearly
				allowance = (monthlyPayment * policy.allowanceValue) / 100;

				// Apply minimum amount if specified (e.g., BOI's €65 minimum)
				// minAmount is in euros, convert to cents
				if (policy.minAmount !== undefined && policy.minAmount > 0) {
					const minAmountCents = policy.minAmount * 100;
					allowance = Math.max(allowance, minAmountCents);
				}
			}
			break;
		case "flat": {
			// e.g., €5,000 per year - allowanceValue is in euros, convert to cents
			const yearlyAllowanceCents = policy.allowanceValue * 100;
			allowance = Math.max(0, yearlyAllowanceCents - alreadyPaidThisYear);
			break;
		}
	}

	return allowance;
}

// Helper: Get overpayments for a specific month
interface OverpaymentResult {
	amount: number;
	applied: AppliedOverpayment[];
	exceededAllowance: boolean;
	excessAmount: number;
}

function getOverpaymentForMonth(
	month: number,
	configs: OverpaymentConfig[],
	maxAmount: number,
	ratePeriod: ResolvedRatePeriod,
	policies: OverpaymentPolicy[],
	yearlyOverpaymentSoFar: number,
	currentBalance: number,
	currentPayment: number,
	yearStartBalance: number,
): OverpaymentResult {
	let totalAmount = 0;
	const applied: AppliedOverpayment[] = [];

	for (const config of configs) {
		// Skip disabled overpayments
		if (config.enabled === false) continue;

		// Check if this config applies to this month
		let applies = false;

		if (config.type === "one_time") {
			applies = config.startMonth === month;
		} else {
			// Recurring overpayment
			const inRange =
				month >= config.startMonth &&
				(!config.endMonth || month <= config.endMonth);

			if (inRange) {
				const frequency = config.frequency ?? "monthly"; // Default to monthly for backwards compatibility
				const monthsSinceStart = month - config.startMonth;

				if (frequency === "monthly") {
					applies = true;
				} else if (frequency === "quarterly") {
					// Quarterly: apply every 3 months from start
					applies = monthsSinceStart % 3 === 0;
				} else {
					// Yearly: only apply on anniversary months (every 12 months)
					applies = monthsSinceStart % 12 === 0;
				}
			}
		}

		if (!applies) continue;

		const amount = Math.min(config.amount, maxAmount - totalAmount);
		if (amount <= 0) continue;

		// Check allowance for fixed rates
		let withinAllowance = true;
		let excessAmount = 0;

		if (ratePeriod.type === "fixed" && ratePeriod.overpaymentPolicyId) {
			const policy = policies.find(
				(p) => p.id === ratePeriod.overpaymentPolicyId,
			);
			// For balance-based yearly policies, use balance at start of year
			// (this matches how lenders typically calculate the allowance)
			const balanceForAllowance =
				policy?.allowanceBasis === "balance"
					? yearStartBalance
					: currentBalance;
			const allowance = calculateAllowance(
				policy,
				balanceForAllowance,
				currentPayment,
				yearlyOverpaymentSoFar,
			);

			// For monthly-basis policies (like BOI), check per-month
			if (policy?.allowanceBasis === "monthly") {
				if (amount > allowance) {
					withinAllowance = false;
					excessAmount = amount - allowance;
				}
			} else {
				// Yearly basis
				const remaining = Math.max(0, allowance);
				if (amount > remaining) {
					withinAllowance = false;
					excessAmount = amount - remaining;
				}
			}
		}

		applied.push({
			month,
			amount,
			configId: config.id,
			isRecurring: config.type === "recurring",
			withinAllowance,
			excessAmount,
		});

		totalAmount += amount;
	}

	return {
		amount: totalAmount,
		applied,
		exceededAllowance: applied.some((a) => !a.withinAllowance),
		excessAmount: applied.reduce((sum, a) => sum + a.excessAmount, 0),
	};
}

// Main calculation function
export function calculateAmortization(
	state: SimulationState,
	allRates: MortgageRate[],
	customRates: CustomRate[],
	lenders: Lender[],
	policies: OverpaymentPolicy[],
): AmortizationResult {
	const { input, ratePeriods, overpaymentConfigs } = state;

	const months: AmortizationMonth[] = [];
	const appliedOverpayments: AppliedOverpayment[] = [];
	const warnings: SimulationWarning[] = [];

	if (
		input.mortgageAmount <= 0 ||
		input.mortgageTermMonths <= 0 ||
		ratePeriods.length === 0
	) {
		return { months, appliedOverpayments, warnings };
	}

	let balance = input.mortgageAmount;
	let cumulativeInterest = 0;
	let cumulativePrincipal = 0;
	let cumulativeOverpayments = 0;
	let month = 1;
	const maxMonths = input.mortgageTermMonths;

	// Track current monthly payment (can change with reduce_payment effect)
	let currentMonthlyPayment: number | null = null;
	let lastRatePeriodId: string | null = null;

	// Track yearly overpayments per rate period for allowance checking
	const yearlyOverpaymentsByPeriod = new Map<string, number>();

	// Track balance at start of each period-year for allowance calculation
	// (For balance-based policies, allowance should be based on balance at start of year)
	const yearStartBalanceByPeriod = new Map<string, number>();

	// Pre-resolve all rate periods (stack-based: compute startMonth from position)
	const resolvedPeriods = new Map<string, ResolvedRatePeriod>();
	let currentStart = 1;
	for (const period of ratePeriods) {
		const resolved = resolveRatePeriod(
			period,
			currentStart,
			allRates,
			customRates,
			lenders,
		);
		if (resolved) {
			resolvedPeriods.set(period.id, resolved);
		}
		currentStart += period.durationMonths;
	}

	// Stack-based model: no gaps to check, periods are sequential

	while (balance > 0.01 && month <= maxMonths) {
		// Find current rate period (stack-based)
		const found = findRatePeriodForMonth(ratePeriods, month);
		if (!found) {
			// No rate period for this month - incomplete simulation
			month++;
			continue;
		}

		const { period: ratePeriod } = found;
		const resolved = resolvedPeriods.get(ratePeriod.id);
		if (!resolved) {
			month++;
			continue;
		}

		const monthlyRate = resolved.rate / 100 / 12;

		// Track yearly overpayments by rate period + year
		// Use calendar year if startDate is provided, otherwise use mortgage year
		const calendarYear = getCalendarYearForMonth(input.startDate, month);
		const yearKey =
			calendarYear !== undefined
				? String(calendarYear) // Calendar year (e.g., "2025")
				: String(Math.ceil(month / 12)); // Mortgage year (e.g., "1", "2")
		const periodYear = `${ratePeriod.id}-${yearKey}`;

		// Check if we need to start tracking a new year
		const isNewYear =
			!yearlyOverpaymentsByPeriod.has(periodYear) ||
			(calendarYear !== undefined && isFirstMonthOfCalendarYear(input.startDate, month));

		if (isNewYear && !yearlyOverpaymentsByPeriod.has(periodYear)) {
			yearlyOverpaymentsByPeriod.set(periodYear, 0);
			// Record balance at start of this year for allowance calculation
			yearStartBalanceByPeriod.set(periodYear, balance);
		}

		// Recalculate monthly payment when rate period changes
		const needsRecalc =
			lastRatePeriodId !== ratePeriod.id || currentMonthlyPayment === null;
		if (needsRecalc) {
			const remainingMonths = maxMonths - month + 1;
			currentMonthlyPayment = calculateMonthlyPayment(
				balance,
				resolved.rate,
				remainingMonths,
			);
			lastRatePeriodId = ratePeriod.id;
		}

		// Calculate interest and principal portions
		const interestPortion = balance * monthlyRate;
		const principalPortion = Math.min(
			currentMonthlyPayment - interestPortion,
			balance,
		);

		// Get overpayment for this month
		const overpaymentResult = getOverpaymentForMonth(
			month,
			overpaymentConfigs,
			balance - principalPortion,
			resolved,
			policies,
			yearlyOverpaymentsByPeriod.get(periodYear) ?? 0,
			balance,
			currentMonthlyPayment,
			yearStartBalanceByPeriod.get(periodYear) ?? balance,
		);

		const overpayment = overpaymentResult.amount;
		appliedOverpayments.push(...overpaymentResult.applied);

		// Track allowance usage
		yearlyOverpaymentsByPeriod.set(
			periodYear,
			(yearlyOverpaymentsByPeriod.get(periodYear) ?? 0) + overpayment,
		);

		// Add warnings for each overpayment that exceeded allowance
		for (const applied of overpaymentResult.applied) {
			if (!applied.withinAllowance) {
				const config = overpaymentConfigs.find(
					(c) => c.id === applied.configId,
				);
				const policy = policies.find(
					(p) => p.id === resolved.overpaymentPolicyId,
				);
				const overpaymentLabel =
					config?.label ||
					(config?.type === "one_time" ? "One-time" : "Recurring");
				const excessFormatted = (applied.excessAmount / 100).toLocaleString(
					"en-IE",
					{ minimumFractionDigits: 2, maximumFractionDigits: 2 },
				);
				const policyLabel = policy?.label ?? "free allowance";
				warnings.push({
					type: "allowance_exceeded",
					month,
					message: `Exceeds ${policyLabel} allowance by €${excessFormatted}`,
					severity: "warning",
					configId: applied.configId,
					overpaymentLabel,
				});
			}
		}

		// Update balances
		const closingBalance = Math.max(
			0,
			balance - principalPortion - overpayment,
		);

		// Check for early redemption during fixed period
		if (closingBalance === 0 && resolved.type === "fixed") {
			const periodEndMonth =
				ratePeriod.durationMonths === 0
					? maxMonths
					: found.startMonth + ratePeriod.durationMonths - 1;
			if (month < periodEndMonth && ratePeriod.durationMonths > 0) {
				warnings.push({
					type: "early_redemption",
					month,
					message: `Mortgage paid off ${periodEndMonth - month} months before fixed period ends. Early redemption fees may apply.`,
					severity: "error",
				});
			}
		}

		// Update cumulatives
		cumulativeInterest += interestPortion;
		cumulativePrincipal += principalPortion + overpayment;
		cumulativeOverpayments += overpayment;

		months.push({
			month,
			year: Math.ceil(month / 12),
			monthOfYear: ((month - 1) % 12) + 1,
			date: addMonthsToDate(input.startDate, month),
			openingBalance: balance,
			closingBalance,
			scheduledPayment: currentMonthlyPayment,
			interestPortion,
			principalPortion,
			overpayment,
			totalPayment: currentMonthlyPayment + overpayment,
			rate: resolved.rate,
			ratePeriodId: ratePeriod.id,
			cumulativeInterest,
			cumulativePrincipal,
			cumulativeOverpayments,
			cumulativeTotal: cumulativeInterest + cumulativePrincipal,
		});

		// Handle reduce_payment effect for variable rates
		// Only recalculate payment based on the "reduce_payment" portion of overpayments
		// "reduce_term" overpayments should NOT affect the monthly payment recalculation
		if (overpayment > 0 && resolved.type === "variable") {
			// Calculate how much of the overpayment has reduce_payment effect
			let reducePaymentAmount = 0;
			for (const applied of overpaymentResult.applied) {
				const config = overpaymentConfigs.find(
					(c) => c.id === applied.configId,
				);
				if (config?.effect === "reduce_payment") {
					reducePaymentAmount += applied.amount;
				}
			}

			if (reducePaymentAmount > 0) {
				// Proportionally reduce payment based on the reduce_payment portion
				// This preserves the term achieved by reduce_term overpayments
				// while still reducing payments from the reduce_payment portion
				const balanceWithoutReducePayment =
					closingBalance + reducePaymentAmount;
				if (balanceWithoutReducePayment > 0) {
					currentMonthlyPayment =
						currentMonthlyPayment *
						(closingBalance / balanceWithoutReducePayment);
				}
			}
		}

		balance = closingBalance;
		month++;
	}

	return { months, appliedOverpayments, warnings };
}

// Extract calendar year from date string "YYYY-MM-DD"
// Returns NaN if date is empty (relative periods mode)
function getCalendarYear(dateStr: string): number {
	if (!dateStr) return NaN;
	return parseInt(dateStr.split("-")[0], 10);
}

// Aggregate months into calendar years (or mortgage years if no start date)
export function aggregateByYear(
	months: AmortizationMonth[],
): AmortizationYear[] {
	if (months.length === 0) return [];

	// Check if we have calendar dates (first month has a date)
	const hasCalendarDates = months[0]?.date && months[0].date !== "";

	const yearMap = new Map<number, AmortizationMonth[]>();
	for (const month of months) {
		// Group by calendar year if dates available, otherwise by mortgage year
		const yearKey = hasCalendarDates ? getCalendarYear(month.date) : month.year;
		const existing = yearMap.get(yearKey) || [];
		existing.push(month);
		yearMap.set(yearKey, existing);
	}

	const years: AmortizationYear[] = [];
	for (const [year, yearMonths] of yearMap) {
		const firstMonth = yearMonths[0];
		const lastMonth = yearMonths[yearMonths.length - 1];

		// Collect rate changes that started this year
		const rateChanges = new Set<string>();
		let prevRatePeriodId: string | null = null;
		for (const m of yearMonths) {
			if (m.ratePeriodId !== prevRatePeriodId) {
				// Find the rate period label
				rateChanges.add(m.ratePeriodId);
				prevRatePeriodId = m.ratePeriodId;
			}
		}

		years.push({
			year,
			openingBalance: firstMonth.openingBalance,
			closingBalance: lastMonth.closingBalance,
			totalInterest: yearMonths.reduce((sum, m) => sum + m.interestPortion, 0),
			totalPrincipal: yearMonths.reduce(
				(sum, m) => sum + m.principalPortion,
				0,
			),
			totalOverpayments: yearMonths.reduce((sum, m) => sum + m.overpayment, 0),
			totalPayments: yearMonths.reduce((sum, m) => sum + m.totalPayment, 0),
			cumulativeInterest: lastMonth.cumulativeInterest,
			cumulativePrincipal: lastMonth.cumulativePrincipal,
			cumulativeTotal: lastMonth.cumulativeTotal,
			months: yearMonths,
			hasWarnings: false, // Will be set by computed
			rateChanges: Array.from(rateChanges),
		});
	}

	// Sort by calendar year
	return years.sort((a, b) => a.year - b.year);
}

/**
 * Calculate baseline total interest (mortgage without any overpayments)
 * This is a simplified calculation that doesn't track all monthly details
 */
export function calculateBaselineInterest(
	mortgageAmount: number,
	mortgageTermMonths: number,
	ratePeriods: RatePeriod[],
	resolvedPeriods: Map<string, ResolvedRatePeriod>,
): number {
	if (
		mortgageAmount <= 0 ||
		mortgageTermMonths <= 0 ||
		ratePeriods.length === 0
	) {
		return 0;
	}

	let balance = mortgageAmount;
	let totalInterest = 0;
	let month = 1;
	const maxMonths = mortgageTermMonths;

	let currentMonthlyPayment: number | null = null;
	let lastRatePeriodId: string | null = null;

	while (balance > 0.01 && month <= maxMonths) {
		// Find current rate period (stack-based)
		const found = findRatePeriodForMonth(ratePeriods, month);
		if (!found) {
			month++;
			continue;
		}

		const { period: ratePeriod } = found;
		const resolved = resolvedPeriods.get(ratePeriod.id);
		if (!resolved) {
			month++;
			continue;
		}

		const monthlyRate = resolved.rate / 100 / 12;

		// Recalculate monthly payment when rate period changes
		if (lastRatePeriodId !== ratePeriod.id || currentMonthlyPayment === null) {
			const remainingMonths = maxMonths - month + 1;
			currentMonthlyPayment = calculateMonthlyPayment(
				balance,
				resolved.rate,
				remainingMonths,
			);
			lastRatePeriodId = ratePeriod.id;
		}

		// Calculate interest portion
		const interestPortion = balance * monthlyRate;
		const principalPortion = Math.min(
			currentMonthlyPayment - interestPortion,
			balance,
		);

		totalInterest += interestPortion;
		balance = Math.max(0, balance - principalPortion);
		month++;
	}

	return totalInterest;
}

// Calculate simulation summary
export function calculateSummary(
	months: AmortizationMonth[],
	baselineInterest: number,
	mortgageTermMonths: number,
): SimulationSummary {
	if (months.length === 0) {
		return {
			totalInterest: 0,
			totalPaid: 0,
			actualTermMonths: 0,
			interestSaved: 0,
			monthsSaved: 0,
		};
	}

	const lastMonth = months[months.length - 1];
	const actualTermMonths = months.length;

	// Calculate interest saved by comparing to baseline (no overpayments)
	const actualInterest = lastMonth.cumulativeInterest;
	const interestSaved = Math.max(0, baselineInterest - actualInterest);

	return {
		totalInterest: actualInterest,
		totalPaid: lastMonth.cumulativeTotal,
		actualTermMonths,
		interestSaved,
		monthsSaved: mortgageTermMonths - actualTermMonths,
	};
}

// Computed stores

// Main amortization schedule
export const $amortizationResult = computed(
	[$simulationState, $rates, $customRates, $lenders, $overpaymentPolicies],
	(state, rates, customRates, lenders, policies) => {
		if (!state.initialized) {
			return { months: [], appliedOverpayments: [], warnings: [] };
		}
		return calculateAmortization(state, rates, customRates, lenders, policies);
	},
);

export const $amortizationSchedule = computed(
	$amortizationResult,
	(result) => result.months,
);

export const $appliedOverpayments = computed(
	$amortizationResult,
	(result) => result.appliedOverpayments,
);

export const $simulationWarnings = computed(
	$amortizationResult,
	(result) => result.warnings,
);

// Yearly aggregation
export const $yearlySchedule = computed($amortizationSchedule, (months) =>
	aggregateByYear(months),
);

// Summary stats (includes baseline calculation for interest saved)
export const $simulationSummary = computed(
	[
		$amortizationSchedule,
		$simulationState,
		$rates,
		$customRates,
		$lenders,
		$overpaymentPolicies,
	],
	(months, state, rates, customRates, lenders, _policies) => {
		// Build resolved periods map for baseline calculation (stack-based)
		const resolvedPeriods = new Map<string, ResolvedRatePeriod>();
		let currentStart = 1;
		for (const period of state.ratePeriods) {
			const resolved = resolveRatePeriod(
				period,
				currentStart,
				rates,
				customRates,
				lenders,
			);
			if (resolved) {
				resolvedPeriods.set(period.id, resolved);
			}
			currentStart += period.durationMonths;
		}

		// Calculate baseline interest (without overpayments)
		const baselineInterest = calculateBaselineInterest(
			state.input.mortgageAmount,
			state.input.mortgageTermMonths,
			state.ratePeriods,
			resolvedPeriods,
		);

		return calculateSummary(
			months,
			baselineInterest,
			state.input.mortgageTermMonths,
		);
	},
);

// Resolved rate periods for display (stack-based: compute startMonth from position)
export const $resolvedRatePeriods = computed(
	[$simulationState, $rates, $customRates, $lenders, $overpaymentPolicies],
	(state, rates, customRates, lenders, _policies) => {
		const resolved: ResolvedRatePeriod[] = [];
		let currentStart = 1;
		for (const period of state.ratePeriods) {
			const r = resolveRatePeriod(
				period,
				currentStart,
				rates,
				customRates,
				lenders,
			);
			if (r) resolved.push(r);
			currentStart += period.durationMonths;
		}
		return resolved;
	},
);

// Milestone labels
const MILESTONE_LABELS: Record<MilestoneType, string> = {
	mortgage_start: "Mortgage Starts",
	principal_25_percent: "25% Paid Off",
	principal_50_percent: "50% Paid Off",
	principal_75_percent: "75% Paid Off",
	ltv_80_percent: "LTV Below 80%",
	mortgage_complete: "Mortgage Complete",
};

// Calculate milestones from amortization schedule
export function calculateMilestones(
	months: AmortizationMonth[],
	mortgageAmount: number,
	propertyValue: number,
	startDate: string | undefined,
): Milestone[] {
	if (months.length === 0) return [];

	const milestones: Milestone[] = [];
	const reachedMilestones = new Set<MilestoneType>();

	// Add mortgage start milestone
	milestones.push({
		type: "mortgage_start",
		month: 1,
		date: startDate || "",
		label: MILESTONE_LABELS.mortgage_start,
		value: mortgageAmount,
	});
	reachedMilestones.add("mortgage_start");

	// Calculate thresholds
	const threshold25 = mortgageAmount * 0.75; // Balance at 25% paid off
	const threshold50 = mortgageAmount * 0.5; // Balance at 50% paid off
	const threshold75 = mortgageAmount * 0.25; // Balance at 75% paid off
	const ltv80Threshold = propertyValue * 0.8; // Balance for 80% LTV

	for (const month of months) {
		// Check 25% paid off
		if (
			!reachedMilestones.has("principal_25_percent") &&
			month.closingBalance <= threshold25
		) {
			milestones.push({
				type: "principal_25_percent",
				month: month.month,
				date: month.date,
				label: MILESTONE_LABELS.principal_25_percent,
				value: month.closingBalance,
			});
			reachedMilestones.add("principal_25_percent");
		}

		// Check 50% paid off
		if (
			!reachedMilestones.has("principal_50_percent") &&
			month.closingBalance <= threshold50
		) {
			milestones.push({
				type: "principal_50_percent",
				month: month.month,
				date: month.date,
				label: MILESTONE_LABELS.principal_50_percent,
				value: month.closingBalance,
			});
			reachedMilestones.add("principal_50_percent");
		}

		// Check 75% paid off
		if (
			!reachedMilestones.has("principal_75_percent") &&
			month.closingBalance <= threshold75
		) {
			milestones.push({
				type: "principal_75_percent",
				month: month.month,
				date: month.date,
				label: MILESTONE_LABELS.principal_75_percent,
				value: month.closingBalance,
			});
			reachedMilestones.add("principal_75_percent");
		}

		// Check LTV below 80% (useful for removing mortgage insurance)
		if (
			!reachedMilestones.has("ltv_80_percent") &&
			month.closingBalance <= ltv80Threshold &&
			mortgageAmount > ltv80Threshold // Only show if we started above 80% LTV
		) {
			milestones.push({
				type: "ltv_80_percent",
				month: month.month,
				date: month.date,
				label: MILESTONE_LABELS.ltv_80_percent,
				value: month.closingBalance,
			});
			reachedMilestones.add("ltv_80_percent");
		}

		// Check mortgage complete
		if (
			!reachedMilestones.has("mortgage_complete") &&
			month.closingBalance <= 0.01
		) {
			milestones.push({
				type: "mortgage_complete",
				month: month.month,
				date: month.date,
				label: MILESTONE_LABELS.mortgage_complete,
				value: 0,
			});
			reachedMilestones.add("mortgage_complete");
			break; // No more milestones after completion
		}
	}

	return milestones;
}

// Computed milestones store
export const $milestones = computed(
	[$amortizationSchedule, $simulationState],
	(months, state) =>
		calculateMilestones(
			months,
			state.input.mortgageAmount,
			state.input.propertyValue,
			state.input.startDate,
		),
);

// Simulation completeness check
export interface SimulationCompleteness {
	isComplete: boolean;
	remainingBalance: number;
	coveredMonths: number;
	totalMonths: number;
	missingMonths: number;
}

export const $simulationCompleteness = computed(
	[$amortizationSchedule, $simulationState],
	(months, state): SimulationCompleteness => {
		const totalMonths = state.input.mortgageTermMonths;

		if (months.length === 0) {
			return {
				isComplete: false,
				remainingBalance: state.input.mortgageAmount,
				coveredMonths: 0,
				totalMonths,
				missingMonths: totalMonths,
			};
		}

		const lastMonth = months[months.length - 1];
		const remainingBalance = lastMonth.closingBalance;
		const isComplete = remainingBalance <= 0.01; // Consider complete if balance is essentially 0

		return {
			isComplete,
			remainingBalance,
			coveredMonths: months.length,
			totalMonths,
			missingMonths: Math.max(0, totalMonths - months.length),
		};
	},
);

/**
 * Buffer suggestion: detected transitions where a 1-month variable buffer is recommended.
 * A buffer is suggested when:
 * - Current period is fixed
 * - Next period is NOT the natural follow-on rate (findVariableRate result)
 *
 * Returns an array of objects with:
 * - afterIndex: index of the fixed period (buffer would be inserted after this)
 * - fixedRate: the MortgageRate of the fixed period
 * - suggestedRate: the natural follow-on variable rate (for the buffer)
 * - ltvAtEnd: LTV at the end of the fixed period (for rate eligibility)
 */
export interface BufferSuggestion {
	afterIndex: number;
	fixedRate: MortgageRate;
	suggestedRate: MortgageRate;
	ltvAtEnd: number;
	lenderName: string; // Name of the lender for the follow-on rate
}

export const $bufferSuggestions = computed(
	[
		$simulationState,
		$rates,
		$customRates,
		$resolvedRatePeriods,
		$amortizationSchedule,
	],
	(state, allRates, customRates, resolvedPeriods, amortizationSchedule) => {
		const suggestions: BufferSuggestion[] = [];
		const propertyValue = state.input.propertyValue;

		if (resolvedPeriods.length < 2 || propertyValue <= 0) {
			return suggestions;
		}

		for (let i = 0; i < resolvedPeriods.length - 1; i++) {
			const current = resolvedPeriods[i];
			const next = resolvedPeriods[i + 1];

			// Only suggest buffer after fixed periods
			if (current.type !== "fixed") continue;

			// Find the actual MortgageRate for the current fixed period
			const currentRate = current.isCustom
				? customRates.find((r) => r.id === current.rateId)
				: allRates.find((r) => r.id === current.rateId);

			if (!currentRate) continue;

			// Calculate LTV at end of fixed period
			const endMonth = current.startMonth + current.durationMonths - 1;
			const monthData = amortizationSchedule.find((m) => m.month === endMonth);
			const balanceAtEnd =
				monthData?.closingBalance ?? state.input.mortgageAmount;
			const ltvAtEnd = (balanceAtEnd / propertyValue) * 100;

			// Find the natural follow-on rate for the current fixed period
			const naturalFollowOn = findVariableRate(
				currentRate as MortgageRate,
				allRates,
				ltvAtEnd,
				state.input.ber,
			);

			// If no natural follow-on found, we can't suggest a buffer
			if (!naturalFollowOn) continue;

			// Check if next period is the natural follow-on
			const isNaturalFollowOn =
				next.rateId === naturalFollowOn.id &&
				next.lenderId === naturalFollowOn.lenderId &&
				!next.isCustom;

			if (!isNaturalFollowOn) {
				suggestions.push({
					afterIndex: i,
					fixedRate: currentRate as MortgageRate,
					suggestedRate: naturalFollowOn,
					ltvAtEnd,
					lenderName: current.lenderName,
				});
			}
		}

		return suggestions;
	},
);
