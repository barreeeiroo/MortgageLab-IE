import { computed } from "nanostores";
import {
	getConstructionEndMonth,
	getDrawdownStagesWithCumulative,
	isSelfBuildActive,
	validateDrawdownTotal,
} from "@/lib/mortgage/self-build";
import {
	aggregateByYear,
	calculateAmortization,
	calculateBaselineInterest,
	calculateBufferSuggestions,
	calculateMilestones,
	calculateSimulationCompleteness,
	calculateSummary,
	resolveRatePeriod,
	type SimulationCompleteness,
} from "@/lib/mortgage/simulation";
import type {
	AmortizationMonth,
	RatePeriod,
	ResolvedRatePeriod,
	SelfBuildConfig,
	SimulateInputValues,
} from "@/lib/schemas/simulate";
import { addMonthsToDateString } from "@/lib/utils/date";
import { $customRates } from "../custom-rates";
import { $lenders } from "../lenders";
import { $overpaymentPolicies } from "../overpayment-policies";
import { $rates } from "../rates/rates-state";
import { $simulationState } from "./simulate-state";

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

// Baseline schedule (without overpayments) - for overpayment impact chart
export const $baselineSchedule = computed(
	[$simulationState, $rates, $customRates, $lenders, $overpaymentPolicies],
	(state, rates, customRates, lenders, policies) => {
		if (!state.initialized) {
			return [];
		}
		// Create a copy of state without overpayments
		const stateWithoutOverpayments = {
			...state,
			overpaymentConfigs: [],
		};
		const result = calculateAmortization(
			stateWithoutOverpayments,
			rates,
			customRates,
			lenders,
			policies,
		);
		return result.months;
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

/**
 * Compute resolved rate periods from raw rate periods (stack-based)
 * Exported for reuse in simulate-compare-calculations
 */
export function computeResolvedRatePeriods(
	ratePeriods: RatePeriod[],
	allRates: typeof $rates extends { get(): infer T } ? T : never,
	customRates: typeof $customRates extends { get(): infer T } ? T : never,
	lenders: typeof $lenders extends { get(): infer T } ? T : never,
): ResolvedRatePeriod[] {
	const resolved: ResolvedRatePeriod[] = [];
	let currentStart = 1;
	for (const period of ratePeriods) {
		const r = resolveRatePeriod(
			period,
			currentStart,
			allRates,
			customRates,
			lenders,
		);
		if (r) resolved.push(r);
		currentStart += period.durationMonths;
	}
	return resolved;
}

/**
 * Compute simulation summary with baseline interest calculation
 * Exported for reuse in simulate-compare-calculations
 */
export function computeSummary(
	months: AmortizationMonth[],
	input: SimulateInputValues,
	ratePeriods: RatePeriod[],
	resolvedPeriods: ResolvedRatePeriod[],
	selfBuildConfig?: SelfBuildConfig,
) {
	// Build resolved periods map for baseline calculation
	const resolvedPeriodsMap = new Map<string, ResolvedRatePeriod>();
	for (const resolved of resolvedPeriods) {
		resolvedPeriodsMap.set(resolved.id, resolved);
	}

	// Calculate baseline interest (without overpayments)
	const baselineInterest = calculateBaselineInterest(
		input.mortgageAmount,
		input.mortgageTermMonths,
		ratePeriods,
		resolvedPeriodsMap,
		selfBuildConfig,
	);

	// For self-build, calculate baseline using interest_and_capital mode
	let interestCapitalBaselineInterest: number | undefined;
	if (
		isSelfBuildActive(selfBuildConfig) &&
		selfBuildConfig?.constructionRepaymentType === "interest_only"
	) {
		interestCapitalBaselineInterest = calculateBaselineInterest(
			input.mortgageAmount,
			input.mortgageTermMonths,
			ratePeriods,
			resolvedPeriodsMap,
			{
				...selfBuildConfig,
				constructionRepaymentType: "interest_and_capital",
			},
		);
	}

	return calculateSummary(
		months,
		baselineInterest,
		input.mortgageTermMonths,
		interestCapitalBaselineInterest,
	);
}

// Resolved rate periods for display (stack-based: compute startMonth from position)
export const $resolvedRatePeriods = computed(
	[$simulationState, $rates, $customRates, $lenders],
	(state, rates, customRates, lenders) =>
		computeResolvedRatePeriods(state.ratePeriods, rates, customRates, lenders),
);

// Summary stats (includes baseline calculation for interest saved)
export const $simulationSummary = computed(
	[$amortizationSchedule, $resolvedRatePeriods, $simulationState],
	(months, resolvedPeriods, state) =>
		computeSummary(
			months,
			state.input,
			state.ratePeriods,
			resolvedPeriods,
			state.selfBuildConfig,
		),
);

// Computed milestones store
export const $milestones = computed(
	[$amortizationSchedule, $simulationState],
	(months, state) =>
		calculateMilestones(
			months,
			state.input.mortgageAmount,
			state.input.propertyValue,
			state.input.startDate,
			state.selfBuildConfig,
		),
);

// Simulation completeness check
export const $simulationCompleteness = computed(
	[$amortizationSchedule, $simulationState],
	(months, state): SimulationCompleteness =>
		calculateSimulationCompleteness(
			months,
			state.input.mortgageAmount,
			state.input.mortgageTermMonths,
		),
);

// Buffer suggestions for rate transitions
export const $bufferSuggestions = computed(
	[
		$simulationState,
		$rates,
		$customRates,
		$resolvedRatePeriods,
		$amortizationSchedule,
	],
	(state, allRates, customRates, resolvedPeriods, amortizationSchedule) =>
		calculateBufferSuggestions(
			state,
			allRates,
			customRates,
			resolvedPeriods,
			amortizationSchedule,
		),
);

// ============================================================================
// Self-Build Computed Stores
// ============================================================================

// Self-build config from state
export const $selfBuildConfig = computed(
	$simulationState,
	(state) => state.selfBuildConfig,
);

// Check if self-build mode is active
export const $isSelfBuildActive = computed($selfBuildConfig, (config) =>
	isSelfBuildActive(config),
);

// Resolved drawdown stages with computed dates and cumulative amounts
export const $resolvedDrawdownStages = computed(
	[$selfBuildConfig, $simulationState],
	(config, state) => {
		if (!config?.enabled || config.drawdownStages.length === 0) {
			return [];
		}

		const stagesWithCumulative = getDrawdownStagesWithCumulative(
			config.drawdownStages,
		);

		// Add dates if start date is available
		return stagesWithCumulative.map((stage) => ({
			...stage,
			date: state.input.startDate
				? addMonthsToDateString(state.input.startDate, stage.month)
				: undefined,
		}));
	},
);

// Construction end month (when final drawdown occurs)
export const $constructionEndMonth = computed($selfBuildConfig, (config) => {
	if (!config?.enabled || config.drawdownStages.length === 0) {
		return 0;
	}
	return getConstructionEndMonth(config);
});

// Validate that total drawdowns equal mortgage amount
export const $drawdownValidation = computed(
	[$selfBuildConfig, $simulationState],
	(config, state) => {
		if (!config?.enabled) {
			return { isValid: true, totalDrawn: 0, difference: 0 };
		}
		return validateDrawdownTotal(config, state.input.mortgageAmount);
	},
);

// Check if all rate periods use lenders that support self-build
export const $canEnableSelfBuild = computed(
	[$simulationState, $lenders],
	(state, lenders) => {
		if (state.ratePeriods.length === 0) {
			return true; // No rate periods yet, can enable
		}

		// Check each rate period's lender
		for (const period of state.ratePeriods) {
			const lender = lenders.find((l) => l.id === period.lenderId);
			if (lender && !lender.allowsSelfBuild) {
				return false;
			}
		}
		return true;
	},
);

// List of lender names that don't support self-build (for error messages)
export const $nonSelfBuildLenders = computed(
	[$simulationState, $lenders],
	(state, lenders) => {
		const nonSelfBuildLenderNames: string[] = [];

		for (const period of state.ratePeriods) {
			const lender = lenders.find((l) => l.id === period.lenderId);
			if (lender && !lender.allowsSelfBuild) {
				if (!nonSelfBuildLenderNames.includes(lender.name)) {
					nonSelfBuildLenderNames.push(lender.name);
				}
			}
		}

		return nonSelfBuildLenderNames;
	},
);

// Check if a specific month is during construction (before final drawdown)
export function isMonthDuringConstruction(
	month: number,
	constructionEndMonth: number,
): boolean {
	return month <= constructionEndMonth;
}
