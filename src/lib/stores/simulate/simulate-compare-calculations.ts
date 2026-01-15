import { computed } from "nanostores";
import {
	aggregateByYear,
	calculateAmortization,
} from "@/lib/mortgage/simulation";
import type {
	AmortizationMonth,
	AmortizationYear,
	OverpaymentConfig,
	RatePeriod,
	ResolvedRatePeriod,
	SelfBuildConfig,
	SimulateInputValues,
	SimulationSummary,
} from "@/lib/schemas/simulate";
import { $customRates } from "../custom-rates";
import { $lenders } from "../lenders";
import { $overpaymentPolicies } from "../overpayment-policies";
import { $rates } from "../rates";
import {
	computeResolvedRatePeriods,
	computeSummary,
} from "./simulate-calculations";
import { $compareSimulations, $compareValidation } from "./simulate-compare";

// Color palette for up to 5 simulations
export const COMPARE_COLORS = [
	"#3b82f6", // Blue
	"#10b981", // Emerald
	"#f59e0b", // Amber
	"#8b5cf6", // Violet
	"#ec4899", // Pink
] as const;

/**
 * Full computed data for a simulation in comparison
 */
export interface CompareSimulationData {
	id: string;
	name: string;
	color: string;
	isCurrentView: boolean;
	input: SimulateInputValues;
	ratePeriods: RatePeriod[];
	resolvedRatePeriods: ResolvedRatePeriod[];
	overpaymentConfigs: OverpaymentConfig[];
	selfBuildConfig?: SelfBuildConfig;
	amortizationSchedule: AmortizationMonth[];
	baselineSchedule: AmortizationMonth[]; // Schedule without overpayments
	yearlySchedule: AmortizationYear[];
	summary: SimulationSummary;
}

/**
 * Chart data point for comparison charts
 * Each point has values for all simulations keyed by simulation ID
 */
export interface CompareChartDataPoint {
	period: string; // "Year 1" or "Month 1"
	month: number; // Absolute month number
	// Dynamic keys for each simulation, prefixed with sim ID
	[key: string]: string | number | undefined;
}

/**
 * Main computed store - calculates amortization for each compared simulation
 */
export const $compareSimulationData = computed(
	[
		$compareSimulations,
		$compareValidation,
		$rates,
		$customRates,
		$lenders,
		$overpaymentPolicies,
	],
	(
		sims,
		validation,
		allRates,
		customRates,
		lenders,
		policies,
	): CompareSimulationData[] => {
		// Don't compute if validation fails
		if (!validation.isValid) return [];

		return sims.map((sim, index) => {
			// Create a simulation state object for the calculation
			const simulationState = {
				...sim.state,
				initialized: true,
			};

			// Run amortization calculation for this simulation
			const result = calculateAmortization(
				simulationState,
				allRates,
				customRates,
				lenders,
				policies,
			);

			// Calculate baseline (without overpayments) for impact comparison
			const stateWithoutOverpayments = {
				...simulationState,
				overpaymentConfigs: [],
			};
			const baselineResult = calculateAmortization(
				stateWithoutOverpayments,
				allRates,
				customRates,
				lenders,
				policies,
			);

			// Compute resolved rate periods
			const resolvedRatePeriods = computeResolvedRatePeriods(
				sim.state.ratePeriods,
				allRates,
				customRates,
				lenders,
			);

			// Compute summary
			const summary = computeSummary(
				result.months,
				sim.state.input,
				sim.state.ratePeriods,
				resolvedRatePeriods,
				sim.state.selfBuildConfig,
			);

			return {
				id: sim.id,
				name: sim.name,
				color: COMPARE_COLORS[index] ?? COMPARE_COLORS[0],
				isCurrentView: sim.isCurrentView,
				input: sim.state.input,
				ratePeriods: sim.state.ratePeriods,
				resolvedRatePeriods,
				overpaymentConfigs: sim.state.overpaymentConfigs,
				selfBuildConfig: sim.state.selfBuildConfig,
				amortizationSchedule: result.months,
				baselineSchedule: baselineResult.months,
				yearlySchedule: aggregateByYear(result.months),
				summary,
			};
		});
	},
);

/**
 * Computed: maximum term across all compared simulations (in months)
 */
export const $compareMaxTermMonths = computed(
	$compareSimulationData,
	(simulations): number => {
		if (simulations.length === 0) return 0;
		return Math.max(...simulations.map((s) => s.amortizationSchedule.length));
	},
);

/**
 * Computed: maximum actual term (accounting for early payoff)
 */
export const $compareMaxActualTermMonths = computed(
	$compareSimulationData,
	(simulations): number => {
		if (simulations.length === 0) return 0;
		return Math.max(...simulations.map((s) => s.summary.actualTermMonths));
	},
);

/**
 * Generate yearly comparison chart data
 */
export const $compareYearlyChartData = computed(
	$compareSimulationData,
	(simulations): CompareChartDataPoint[] => {
		if (simulations.length === 0) return [];

		// Find max years (including baseline for impact chart)
		const maxYears = Math.max(
			...simulations.map((s) => s.yearlySchedule.length),
			...simulations.map((s) => Math.ceil(s.baselineSchedule.length / 12)),
		);

		const data: CompareChartDataPoint[] = [];

		for (let yearIndex = 0; yearIndex < maxYears; yearIndex++) {
			const point: CompareChartDataPoint = {
				period: `Year ${yearIndex + 1}`,
				month: (yearIndex + 1) * 12,
			};

			for (const sim of simulations) {
				const yearData = sim.yearlySchedule[yearIndex];
				const prefix = sim.id;

				if (yearData) {
					point[`${prefix}_balance`] = yearData.closingBalance;
					point[`${prefix}_interest`] = yearData.cumulativeInterest;
					point[`${prefix}_principal`] = yearData.cumulativePrincipal;
					point[`${prefix}_total`] = yearData.cumulativeTotal;
					point[`${prefix}_payment`] = yearData.totalPayments;
					point[`${prefix}_overpayment`] = yearData.totalOverpayments;
					point[`${prefix}_interestPortion`] = yearData.totalInterest;
					point[`${prefix}_principalPortion`] = yearData.totalPrincipal;

					// Calculate LTV and Equity
					const propertyValue = sim.input.propertyValue;
					if (propertyValue > 0) {
						point[`${prefix}_ltv`] =
							(yearData.closingBalance / propertyValue) * 100;
						point[`${prefix}_equity`] = propertyValue - yearData.closingBalance;
					}

					// Get the rate at year end from the last month of the year
					const yearEndMonth = (yearIndex + 1) * 12;
					const lastMonthOfYear =
						sim.amortizationSchedule[
							Math.min(yearEndMonth - 1, sim.amortizationSchedule.length - 1)
						];
					if (lastMonthOfYear) {
						point[`${prefix}_rate`] = lastMonthOfYear.rate;
					}

					// Add baseline balance (without overpayments) for impact chart
					const baselineMonth = sim.baselineSchedule[yearEndMonth - 1];
					if (baselineMonth) {
						point[`${prefix}_baseline`] = baselineMonth.closingBalance;
					}
				} else {
					// Simulation ended before this year
					point[`${prefix}_balance`] = 0;

					// Equity is full property value when mortgage is paid off
					const propertyValue = sim.input.propertyValue;
					if (propertyValue > 0) {
						point[`${prefix}_equity`] = propertyValue;
					}

					// Still add baseline if it exists (for impact chart)
					const yearEndMonth = (yearIndex + 1) * 12;
					const baselineMonth = sim.baselineSchedule[yearEndMonth - 1];
					if (baselineMonth) {
						point[`${prefix}_baseline`] = baselineMonth.closingBalance;
					}
				}
			}

			data.push(point);
		}

		return data;
	},
);

/**
 * Generate monthly comparison chart data
 */
export const $compareMonthlyChartData = computed(
	$compareSimulationData,
	(simulations): CompareChartDataPoint[] => {
		if (simulations.length === 0) return [];

		// Find max months (including baseline for impact chart)
		const maxMonths = Math.max(
			...simulations.map((s) => s.amortizationSchedule.length),
			...simulations.map((s) => s.baselineSchedule.length),
		);

		const data: CompareChartDataPoint[] = [];

		for (let monthIndex = 0; monthIndex < maxMonths; monthIndex++) {
			const monthNum = monthIndex + 1;
			const point: CompareChartDataPoint = {
				period: `Month ${monthNum}`,
				month: monthNum,
			};

			for (const sim of simulations) {
				const monthData = sim.amortizationSchedule[monthIndex];
				const prefix = sim.id;

				if (monthData) {
					point[`${prefix}_balance`] = monthData.closingBalance;
					point[`${prefix}_interest`] = monthData.cumulativeInterest;
					point[`${prefix}_principal`] = monthData.cumulativePrincipal;
					point[`${prefix}_total`] = monthData.cumulativeTotal;
					point[`${prefix}_payment`] = monthData.totalPayment;
					point[`${prefix}_interestPortion`] = monthData.interestPortion;
					point[`${prefix}_principalPortion`] = monthData.principalPortion;
					point[`${prefix}_overpayment`] = monthData.overpayment;
					point[`${prefix}_rate`] = monthData.rate;

					// Calculate LTV and Equity
					const propertyValue = sim.input.propertyValue;
					if (propertyValue > 0) {
						point[`${prefix}_ltv`] =
							(monthData.closingBalance / propertyValue) * 100;
						point[`${prefix}_equity`] =
							propertyValue - monthData.closingBalance;
					}

					// Add baseline balance (without overpayments) for impact chart
					const baselineMonth = sim.baselineSchedule[monthIndex];
					if (baselineMonth) {
						point[`${prefix}_baseline`] = baselineMonth.closingBalance;
					}
				} else {
					// Simulation ended before this month
					point[`${prefix}_balance`] = 0;

					// Equity is full property value when mortgage is paid off
					const propertyValue = sim.input.propertyValue;
					if (propertyValue > 0) {
						point[`${prefix}_equity`] = propertyValue;
					}

					// Still add baseline if it exists (for impact chart)
					const baselineMonth = sim.baselineSchedule[monthIndex];
					if (baselineMonth) {
						point[`${prefix}_baseline`] = baselineMonth.closingBalance;
					}
				}
			}

			data.push(point);
		}

		return data;
	},
);

/**
 * Generate quarterly comparison chart data
 */
export const $compareQuarterlyChartData = computed(
	$compareSimulationData,
	(simulations): CompareChartDataPoint[] => {
		if (simulations.length === 0) return [];

		// Find max months (including baseline), then calculate max quarters
		const maxMonths = Math.max(
			...simulations.map((s) => s.amortizationSchedule.length),
			...simulations.map((s) => s.baselineSchedule.length),
		);
		const maxQuarters = Math.ceil(maxMonths / 3);

		const data: CompareChartDataPoint[] = [];

		for (let quarterIndex = 0; quarterIndex < maxQuarters; quarterIndex++) {
			const quarterNum = quarterIndex + 1;
			const endMonth = (quarterIndex + 1) * 3; // End of quarter (month 3, 6, 9, etc.)
			const point: CompareChartDataPoint = {
				period: `Q${quarterNum}`,
				month: endMonth,
			};

			for (const sim of simulations) {
				const prefix = sim.id;

				// Get the last month of the quarter (or last available month)
				const quarterEndIndex = Math.min(
					endMonth - 1,
					sim.amortizationSchedule.length - 1,
				);
				const monthData =
					quarterEndIndex >= 0
						? sim.amortizationSchedule[quarterEndIndex]
						: null;

				if (monthData) {
					point[`${prefix}_balance`] = monthData.closingBalance;
					point[`${prefix}_interest`] = monthData.cumulativeInterest;
					point[`${prefix}_principal`] = monthData.cumulativePrincipal;
					point[`${prefix}_total`] = monthData.cumulativeTotal;
					point[`${prefix}_rate`] = monthData.rate;

					// Calculate LTV and Equity
					const propertyValue = sim.input.propertyValue;
					if (propertyValue > 0) {
						point[`${prefix}_ltv`] =
							(monthData.closingBalance / propertyValue) * 100;
						point[`${prefix}_equity`] =
							propertyValue - monthData.closingBalance;
					}

					// Sum payments and overpayments for the quarter
					let quarterPayment = 0;
					let quarterOverpayment = 0;
					let quarterInterestPortion = 0;
					let quarterPrincipalPortion = 0;

					const startIndex = quarterIndex * 3;
					for (let i = startIndex; i <= quarterEndIndex; i++) {
						const m = sim.amortizationSchedule[i];
						if (m) {
							quarterPayment += m.totalPayment;
							quarterOverpayment += m.overpayment;
							quarterInterestPortion += m.interestPortion;
							quarterPrincipalPortion += m.principalPortion;
						}
					}

					point[`${prefix}_payment`] = quarterPayment;
					point[`${prefix}_overpayment`] = quarterOverpayment;
					point[`${prefix}_interestPortion`] = quarterInterestPortion;
					point[`${prefix}_principalPortion`] = quarterPrincipalPortion;

					// Add baseline balance (without overpayments) for impact chart
					const baselineEndIndex = Math.min(
						endMonth - 1,
						sim.baselineSchedule.length - 1,
					);
					const baselineMonth =
						baselineEndIndex >= 0
							? sim.baselineSchedule[baselineEndIndex]
							: null;
					if (baselineMonth) {
						point[`${prefix}_baseline`] = baselineMonth.closingBalance;
					}
				} else {
					// Simulation ended before this quarter
					point[`${prefix}_balance`] = 0;

					// Equity is full property value when mortgage is paid off
					const propertyValue = sim.input.propertyValue;
					if (propertyValue > 0) {
						point[`${prefix}_equity`] = propertyValue;
					}

					// Still add baseline if it exists (for impact chart)
					const baselineEndIndex = Math.min(
						endMonth - 1,
						sim.baselineSchedule.length - 1,
					);
					const baselineMonth =
						baselineEndIndex >= 0
							? sim.baselineSchedule[baselineEndIndex]
							: null;
					if (baselineMonth) {
						point[`${prefix}_baseline`] = baselineMonth.closingBalance;
					}
				}
			}

			data.push(point);
		}

		return data;
	},
);

/**
 * Computed: summary comparison metrics with best/worst highlighting
 */
export interface CompareSummaryMetric {
	key: string;
	label: string;
	values: Array<{
		simulationId: string;
		value: number;
		formatted: string;
		isBest: boolean;
		isWorst: boolean;
	}>;
}

export const $compareSummaryMetrics = computed(
	$compareSimulationData,
	(simulations): CompareSummaryMetric[] => {
		if (simulations.length === 0) return [];

		const metrics: CompareSummaryMetric[] = [];

		// Helper to create a metric
		const createMetric = (
			key: string,
			label: string,
			getValue: (s: CompareSimulationData) => number,
			formatValue: (v: number) => string,
			lowerIsBetter = true,
		): CompareSummaryMetric => {
			const values = simulations.map((s) => ({
				simulationId: s.id,
				value: getValue(s),
				formatted: formatValue(getValue(s)),
				isBest: false,
				isWorst: false,
			}));

			// Find best and worst
			const numericValues = values.map((v) => v.value);
			const best = lowerIsBetter
				? Math.min(...numericValues)
				: Math.max(...numericValues);
			const worst = lowerIsBetter
				? Math.max(...numericValues)
				: Math.min(...numericValues);

			// Mark best and worst (only if values differ)
			if (best !== worst) {
				for (const v of values) {
					v.isBest = v.value === best;
					v.isWorst = v.value === worst;
				}
			}

			return { key, label, values };
		};

		// Currency formatter
		const formatCurrency = (v: number) =>
			new Intl.NumberFormat("en-IE", {
				style: "currency",
				currency: "EUR",
				maximumFractionDigits: 0,
			}).format(v / 100);

		// Term formatter
		const formatTerm = (months: number) => {
			const years = Math.floor(months / 12);
			const remainingMonths = months % 12;
			if (remainingMonths === 0) return `${years} years`;
			return `${years}y ${remainingMonths}m`;
		};

		// Add metrics
		metrics.push(
			createMetric(
				"totalInterest",
				"Total Interest",
				(s) => s.summary.totalInterest,
				formatCurrency,
				true,
			),
		);

		metrics.push(
			createMetric(
				"totalPaid",
				"Total Paid",
				(s) => s.summary.totalPaid,
				formatCurrency,
				true,
			),
		);

		metrics.push(
			createMetric(
				"actualTerm",
				"Actual Term",
				(s) => s.summary.actualTermMonths,
				formatTerm,
				true,
			),
		);

		metrics.push(
			createMetric(
				"interestSaved",
				"Interest Saved (Overpayments)",
				(s) => s.summary.interestSaved,
				formatCurrency,
				false, // Higher is better
			),
		);

		metrics.push(
			createMetric(
				"monthsSaved",
				"Term Reduced (Overpayments)",
				(s) => s.summary.monthsSaved,
				(v) => `${v} months`,
				false, // Higher is better
			),
		);

		return metrics;
	},
);
