import { computed } from "nanostores";
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
import type { ResolvedRatePeriod } from "@/lib/schemas/simulate";
import { $customRates } from "../custom-rates";
import { $lenders } from "../lenders";
import { $overpaymentPolicies } from "../overpayment-policies";
import { $rates } from "../rates";
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
