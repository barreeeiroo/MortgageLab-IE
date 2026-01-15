import { computed } from "nanostores";
import { createOverpaymentMaps } from "@/lib/mortgage/overpayments";
import {
	aggregateByYear,
	calculateAmortization,
} from "@/lib/mortgage/simulation";
import type {
	AmortizationMonth,
	AmortizationYear,
	AppliedOverpayment,
	OverpaymentConfig,
	RatePeriod,
	ResolvedRatePeriod,
	SelfBuildConfig,
	SimulateInputValues,
	SimulationSummary,
} from "@/lib/schemas/simulate";
import { formatShortMonthYear } from "@/lib/utils/date";
import { $customRates } from "../custom-rates";
import { $lenders } from "../lenders";
import { $overpaymentPolicies } from "../overpayment-policies";
import { $rates } from "../rates/rates-state";
import {
	computeResolvedRatePeriods,
	computeSummary,
} from "./simulate-calculations";
import {
	$compareSimulations,
	$compareState,
	$compareValidation,
} from "./simulate-compare";

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
	appliedOverpayments: AppliedOverpayment[]; // Overpayments with type info
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
		$compareState,
		$rates,
		$customRates,
		$lenders,
		$overpaymentPolicies,
	],
	(
		sims,
		validation,
		compareState,
		allRates,
		customRates,
		lenders,
		policies,
	): CompareSimulationData[] => {
		// Don't compute if validation fails
		if (!validation.isValid) return [];

		// Get the display start date if set
		// When undefined, clear individual start dates so all simulations use relative years
		const displayStartDate = compareState.displayStartDate;

		return sims.map((sim, index) => {
			// Create a simulation state object for the calculation
			// Use display start date for all simulations (or undefined for relative years)
			const simulationState = {
				...sim.state,
				input: {
					...sim.state.input,
					startDate: displayStartDate,
				},
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

			// Compute summary (use overridden input for consistency)
			const summary = computeSummary(
				result.months,
				simulationState.input,
				sim.state.ratePeriods,
				resolvedRatePeriods,
				sim.state.selfBuildConfig,
			);

			return {
				id: sim.id,
				name: sim.name,
				color: COMPARE_COLORS[index] ?? COMPARE_COLORS[0],
				isCurrentView: sim.isCurrentView,
				input: simulationState.input, // Use overridden input with display start date
				ratePeriods: sim.state.ratePeriods,
				resolvedRatePeriods,
				overpaymentConfigs: sim.state.overpaymentConfigs,
				selfBuildConfig: sim.state.selfBuildConfig,
				amortizationSchedule: result.months,
				appliedOverpayments: result.appliedOverpayments,
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

		// Find the longest simulation (most years) to use as reference for dates
		const longestSim = simulations.reduce(
			(longest, sim) =>
				sim.yearlySchedule.length > longest.yearlySchedule.length
					? sim
					: longest,
			simulations[0],
		);

		// Check if we have calendar dates by looking at the longest simulation's first month
		const firstMonth = longestSim?.yearlySchedule[0]?.months[0];
		const hasCalendarDates =
			firstMonth?.date !== undefined && firstMonth?.date !== "";

		// Create overpayment maps for each simulation
		const overpaymentMaps = new Map(
			simulations.map((sim) => [
				sim.id,
				createOverpaymentMaps(sim.appliedOverpayments),
			]),
		);

		const data: CompareChartDataPoint[] = [];

		for (let yearIndex = 0; yearIndex < maxYears; yearIndex++) {
			// Get actual year from longest simulation's yearly schedule (or any sim that has this year)
			const yearData =
				longestSim?.yearlySchedule[yearIndex] ??
				simulations.find((s) => s.yearlySchedule[yearIndex])?.yearlySchedule[
					yearIndex
				];
			const actualYear = yearData?.year ?? yearIndex + 1;
			// Format period label: "2026" for calendar dates, "Year 1" for relative
			const periodLabel = hasCalendarDates
				? String(actualYear)
				: `Year ${actualYear}`;

			const point: CompareChartDataPoint = {
				period: periodLabel,
				month: (yearIndex + 1) * 12,
			};

			for (const sim of simulations) {
				const yearData = sim.yearlySchedule[yearIndex];
				const prefix = sim.id;
				const maps = overpaymentMaps.get(sim.id);

				if (yearData) {
					point[`${prefix}_balance`] = yearData.closingBalance;
					point[`${prefix}_interest`] = yearData.cumulativeInterest;
					point[`${prefix}_principal`] = yearData.cumulativePrincipal;
					point[`${prefix}_total`] = yearData.cumulativeTotal;
					point[`${prefix}_payment`] = yearData.totalPayments;
					point[`${prefix}_overpayment`] = yearData.totalOverpayments;
					point[`${prefix}_interestPortion`] = yearData.totalInterest;
					point[`${prefix}_principalPortion`] = yearData.totalPrincipal;

					// Calculate one-time and recurring overpayments for this year
					let yearOneTime = 0;
					let yearRecurring = 0;
					if (maps) {
						const startMonth = yearIndex * 12 + 1;
						const endMonth = (yearIndex + 1) * 12;
						for (let m = startMonth; m <= endMonth; m++) {
							yearOneTime += maps.oneTimeByMonth.get(m) ?? 0;
							yearRecurring += maps.recurringByMonth.get(m) ?? 0;
						}
					}
					point[`${prefix}_oneTimeOverpayment`] = yearOneTime;
					point[`${prefix}_recurringOverpayment`] = yearRecurring;

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

		// Find the longest simulation (most months) to use as reference for dates
		const longestSim = simulations.reduce(
			(longest, sim) =>
				sim.amortizationSchedule.length > longest.amortizationSchedule.length
					? sim
					: longest,
			simulations[0],
		);

		// Check if we have calendar dates by looking at the longest simulation's first month
		const firstMonthData = longestSim?.amortizationSchedule[0];
		const hasCalendarDates =
			firstMonthData?.date !== undefined && firstMonthData?.date !== "";

		// Create overpayment maps for each simulation
		const overpaymentMaps = new Map(
			simulations.map((sim) => [
				sim.id,
				createOverpaymentMaps(sim.appliedOverpayments),
			]),
		);

		const data: CompareChartDataPoint[] = [];

		for (let monthIndex = 0; monthIndex < maxMonths; monthIndex++) {
			const monthNum = monthIndex + 1;
			// Get date from longest simulation (or any sim that has this month)
			const monthData =
				longestSim?.amortizationSchedule[monthIndex] ??
				simulations.find((s) => s.amortizationSchedule[monthIndex])
					?.amortizationSchedule[monthIndex];
			// Format period label: "Feb '26" for calendar dates, "Month 1" for relative
			const periodLabel =
				hasCalendarDates && monthData?.date
					? formatShortMonthYear(new Date(monthData.date))
					: `Month ${monthNum}`;

			const point: CompareChartDataPoint = {
				period: periodLabel,
				month: monthNum,
			};

			for (const sim of simulations) {
				const monthData = sim.amortizationSchedule[monthIndex];
				const prefix = sim.id;
				const maps = overpaymentMaps.get(sim.id);

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

					// One-time and recurring overpayments for this month
					point[`${prefix}_oneTimeOverpayment`] =
						maps?.oneTimeByMonth.get(monthNum) ?? 0;
					point[`${prefix}_recurringOverpayment`] =
						maps?.recurringByMonth.get(monthNum) ?? 0;

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

		// Find the longest simulation (most months) to use as reference for dates
		const longestSim = simulations.reduce(
			(longest, sim) =>
				sim.amortizationSchedule.length > longest.amortizationSchedule.length
					? sim
					: longest,
			simulations[0],
		);

		// Check if we have calendar dates by looking at the longest simulation's first month
		const firstMonthData = longestSim?.amortizationSchedule[0];
		const hasCalendarDates =
			firstMonthData?.date !== undefined && firstMonthData?.date !== "";

		// Create overpayment maps for each simulation
		const overpaymentMaps = new Map(
			simulations.map((sim) => [
				sim.id,
				createOverpaymentMaps(sim.appliedOverpayments),
			]),
		);

		const data: CompareChartDataPoint[] = [];

		for (let quarterIndex = 0; quarterIndex < maxQuarters; quarterIndex++) {
			const quarterNum = quarterIndex + 1;
			const endMonth = (quarterIndex + 1) * 3; // End of quarter (month 3, 6, 9, etc.)

			// Get date from longest simulation's quarter-end month (or any sim that has it)
			const quarterEndIndex = endMonth - 1;
			const quarterEndData =
				longestSim?.amortizationSchedule[quarterEndIndex] ??
				simulations.find((s) => s.amortizationSchedule[quarterEndIndex])
					?.amortizationSchedule[quarterEndIndex];
			// Format period label: "Q1 '26" for calendar dates, "Q1" for relative
			let periodLabel = `Q${quarterNum}`;
			if (hasCalendarDates && quarterEndData?.date) {
				const date = new Date(quarterEndData.date);
				const calendarQuarter = Math.ceil((date.getMonth() + 1) / 3);
				const year = date.getFullYear().toString().slice(-2);
				periodLabel = `Q${calendarQuarter} '${year}`;
			}

			const point: CompareChartDataPoint = {
				period: periodLabel,
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

					// Calculate one-time and recurring overpayments for this quarter
					const maps = overpaymentMaps.get(sim.id);
					let quarterOneTime = 0;
					let quarterRecurring = 0;
					if (maps) {
						const startMonth = quarterIndex * 3 + 1;
						const endMonthOp = (quarterIndex + 1) * 3;
						for (let m = startMonth; m <= endMonthOp; m++) {
							quarterOneTime += maps.oneTimeByMonth.get(m) ?? 0;
							quarterRecurring += maps.recurringByMonth.get(m) ?? 0;
						}
					}
					point[`${prefix}_oneTimeOverpayment`] = quarterOneTime;
					point[`${prefix}_recurringOverpayment`] = quarterRecurring;

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
