import { useStore } from "@nanostores/react";
import { $hasRequiredData, $input } from "@/lib/stores/simulate";
import {
	$amortizationSchedule,
	$appliedOverpayments,
	$baselineSchedule,
	$milestones,
	$resolvedRatePeriods,
	$yearlySchedule,
} from "@/lib/stores/simulate/simulate-calculations";
import {
	$chartSettings,
	type ChartType,
	type ChartVisibilitySettings,
	setActiveChart,
	setGranularity,
	toggleChartVisibility,
} from "@/lib/stores/simulate/simulate-chart";
import { SimulateChartsContainer } from "./SimulateChartsContainer";
import type { ChartDataPoint } from "./types";

export function SimulateChartIsland() {
	const hasRequiredData = useStore($hasRequiredData);
	const input = useStore($input);
	const yearlySchedule = useStore($yearlySchedule);
	const monthlySchedule = useStore($amortizationSchedule);
	const baselineSchedule = useStore($baselineSchedule);
	const appliedOverpayments = useStore($appliedOverpayments);
	const resolvedRatePeriods = useStore($resolvedRatePeriods);
	const milestones = useStore($milestones);
	const settings = useStore($chartSettings);

	if (!hasRequiredData) {
		return null;
	}

	const { granularity } = settings;

	// Check if there are overpayments configured
	const hasOverpayments = monthlySchedule.some((m) => m.overpayment > 0);

	// Create a map of baseline data by month for quick lookup
	const baselineByMonth = new Map(baselineSchedule.map((m) => [m.month, m]));

	// Create maps for overpayments by month (split by type)
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

	// Transform schedule data for charts
	const chartData: ChartDataPoint[] = (() => {
		if (granularity === "yearly") {
			return yearlySchedule.map((row) => {
				// Get calendar year from the first month of this year
				const firstMonthDate = row.months[0]?.date;
				const calendarYear = firstMonthDate
					? new Date(firstMonthDate).getFullYear()
					: undefined;

				// Get baseline data for the last month of this year
				const lastMonthNum = row.months[row.months.length - 1]?.month;
				const baselineMonth = lastMonthNum
					? baselineByMonth.get(lastMonthNum)
					: undefined;

				// Calculate average rate and collect all rates for this year
				let totalRate = 0;
				let rateCount = 0;
				const rateMonthCounts = new Map<
					string,
					{ label: string; rate: number; months: number }
				>();
				for (const m of row.months) {
					const rp = resolvedRatePeriods.find((p) => p.id === m.ratePeriodId);
					if (rp) {
						totalRate += rp.rate;
						rateCount++;
						const existing = rateMonthCounts.get(rp.id);
						if (existing) {
							existing.months++;
						} else {
							rateMonthCounts.set(rp.id, {
								label: rp.label,
								rate: rp.rate,
								months: 1,
							});
						}
					}
				}
				const avgRate = rateCount > 0 ? totalRate / rateCount : undefined;
				const ratesInPeriod = Array.from(rateMonthCounts.values());

				// Get rate period info from the last month (for label/id)
				const lastMonth = row.months[row.months.length - 1];
				const ratePeriod = resolvedRatePeriods.find(
					(p) => p.id === lastMonth?.ratePeriodId,
				);

				// Sum overpayments by type for this year (totals, not averages)
				let yearOneTime = 0;
				let yearRecurring = 0;
				for (const m of row.months) {
					yearOneTime += oneTimeByMonth.get(m.month) ?? 0;
					yearRecurring += recurringByMonth.get(m.month) ?? 0;
				}

				return {
					period: row.year,
					year: row.year,
					calendarYear,
					principalRemaining: row.closingBalance / 100,
					cumulativeInterest: row.cumulativeInterest / 100,
					cumulativePrincipal: row.cumulativePrincipal / 100,
					totalPaid: row.cumulativeTotal / 100,
					// Totals for the period (not averages)
					monthlyPrincipal: row.totalPrincipal / 100,
					monthlyInterest: row.totalInterest / 100,
					oneTimeOverpayment: yearOneTime / 100,
					recurringOverpayment: yearRecurring / 100,
					baselineBalance: baselineMonth
						? baselineMonth.closingBalance / 100
						: undefined,
					baselineCumulativeInterest: baselineMonth
						? baselineMonth.cumulativeInterest / 100
						: undefined,
					rate: avgRate,
					ratePeriodId: ratePeriod?.id,
					ratePeriodLabel: ratePeriod?.label,
					ratesInPeriod: ratesInPeriod.length > 1 ? ratesInPeriod : undefined,
					ltv:
						input.propertyValue > 0
							? (row.closingBalance / input.propertyValue) * 100
							: undefined,
				};
			});
		}

		if (granularity === "quarterly") {
			const quarters: ChartDataPoint[] = [];
			let quarterIndex = 0;

			for (let i = 0; i < monthlySchedule.length; i += 3) {
				const quarterMonths = monthlySchedule.slice(
					i,
					Math.min(i + 3, monthlySchedule.length),
				);
				if (quarterMonths.length === 0) break;

				const lastMonth = quarterMonths[quarterMonths.length - 1];
				const lastDate = lastMonth.date ? new Date(lastMonth.date) : undefined;

				const calendarMonth = lastDate ? lastDate.getMonth() + 1 : undefined;
				const calendarQuarter = calendarMonth
					? Math.ceil(calendarMonth / 3)
					: undefined;

				quarterIndex++;

				const totalPrincipal = quarterMonths.reduce(
					(sum, m) => sum + m.principalPortion,
					0,
				);
				const totalInterest = quarterMonths.reduce(
					(sum, m) => sum + m.interestPortion,
					0,
				);

				// Sum overpayments by type for this quarter (totals, not averages)
				let qtrOneTime = 0;
				let qtrRecurring = 0;
				for (const m of quarterMonths) {
					qtrOneTime += oneTimeByMonth.get(m.month) ?? 0;
					qtrRecurring += recurringByMonth.get(m.month) ?? 0;
				}

				// Get baseline data
				const baselineMonth = baselineByMonth.get(lastMonth.month);

				// Calculate average rate and collect all rates for this quarter
				let totalRate = 0;
				let rateCount = 0;
				const rateMonthCounts = new Map<
					string,
					{ label: string; rate: number; months: number }
				>();
				for (const m of quarterMonths) {
					const rp = resolvedRatePeriods.find((p) => p.id === m.ratePeriodId);
					if (rp) {
						totalRate += rp.rate;
						rateCount++;
						const existing = rateMonthCounts.get(rp.id);
						if (existing) {
							existing.months++;
						} else {
							rateMonthCounts.set(rp.id, {
								label: rp.label,
								rate: rp.rate,
								months: 1,
							});
						}
					}
				}
				const avgRate = rateCount > 0 ? totalRate / rateCount : undefined;
				const ratesInPeriod = Array.from(rateMonthCounts.values());

				// Get rate period info from the last month (for label/id)
				const ratePeriod = resolvedRatePeriods.find(
					(p) => p.id === lastMonth.ratePeriodId,
				);

				quarters.push({
					period: quarterIndex,
					year: lastMonth.year,
					quarter: ((quarterIndex - 1) % 4) + 1,
					calendarYear: lastDate?.getFullYear(),
					calendarQuarter,
					principalRemaining: lastMonth.closingBalance / 100,
					cumulativeInterest: lastMonth.cumulativeInterest / 100,
					cumulativePrincipal: lastMonth.cumulativePrincipal / 100,
					totalPaid: lastMonth.cumulativeTotal / 100,
					// Totals for the period (not averages)
					monthlyPrincipal: totalPrincipal / 100,
					monthlyInterest: totalInterest / 100,
					oneTimeOverpayment: qtrOneTime / 100,
					recurringOverpayment: qtrRecurring / 100,
					baselineBalance: baselineMonth
						? baselineMonth.closingBalance / 100
						: undefined,
					baselineCumulativeInterest: baselineMonth
						? baselineMonth.cumulativeInterest / 100
						: undefined,
					rate: avgRate,
					ratePeriodId: ratePeriod?.id,
					ratePeriodLabel: ratePeriod?.label,
					ratesInPeriod: ratesInPeriod.length > 1 ? ratesInPeriod : undefined,
					ltv:
						input.propertyValue > 0
							? (lastMonth.closingBalance / input.propertyValue) * 100
							: undefined,
				});
			}

			return quarters;
		}

		// Monthly view (default)
		return monthlySchedule.map((row) => {
			const date = row.date ? new Date(row.date) : undefined;
			const baselineMonth = baselineByMonth.get(row.month);
			const ratePeriod = resolvedRatePeriods.find(
				(p) => p.id === row.ratePeriodId,
			);

			return {
				period: row.month,
				year: row.year,
				month: row.monthOfYear,
				calendarYear: date?.getFullYear(),
				calendarMonth: date ? date.getMonth() + 1 : undefined,
				principalRemaining: row.closingBalance / 100,
				cumulativeInterest: row.cumulativeInterest / 100,
				cumulativePrincipal: row.cumulativePrincipal / 100,
				totalPaid: row.cumulativeTotal / 100,
				monthlyPrincipal: row.principalPortion / 100,
				monthlyInterest: row.interestPortion / 100,
				oneTimeOverpayment: (oneTimeByMonth.get(row.month) ?? 0) / 100,
				recurringOverpayment: (recurringByMonth.get(row.month) ?? 0) / 100,
				baselineBalance: baselineMonth
					? baselineMonth.closingBalance / 100
					: undefined,
				baselineCumulativeInterest: baselineMonth
					? baselineMonth.cumulativeInterest / 100
					: undefined,
				rate: ratePeriod?.rate,
				ratePeriodId: ratePeriod?.id,
				ratePeriodLabel: ratePeriod?.label,
				ltv:
					input.propertyValue > 0
						? (row.closingBalance / input.propertyValue) * 100
						: undefined,
			};
		});
	})();

	// Calculate deposit (property value - mortgage amount)
	const deposit = Math.max(
		0,
		(input.propertyValue - input.mortgageAmount) / 100,
	);

	// Create extended chart data for Overpayment Impact that covers the full baseline term
	// This is needed because overpayments can reduce the term, but we want to show the full baseline range
	const overpaymentImpactData: ChartDataPoint[] = (() => {
		if (!hasOverpayments) return chartData;

		const actualLastMonth =
			monthlySchedule[monthlySchedule.length - 1]?.month ?? 0;
		const baselineLastMonth =
			baselineSchedule[baselineSchedule.length - 1]?.month ?? 0;

		// If actual term is same or longer than baseline, no extension needed
		if (actualLastMonth >= baselineLastMonth) return chartData;

		// Get remaining baseline months after actual mortgage ends
		const remainingBaseline = baselineSchedule.filter(
			(m) => m.month > actualLastMonth,
		);
		if (remainingBaseline.length === 0) return chartData;

		// Get the last actual data point values for continuation
		const lastActualMonth = monthlySchedule[monthlySchedule.length - 1];
		const lastActualInterest = lastActualMonth?.cumulativeInterest ?? 0;

		// Create additional data points for remaining baseline
		const extensionData: ChartDataPoint[] = [];

		if (granularity === "yearly") {
			// Get the actual year end
			const actualLastYear = Math.ceil(actualLastMonth / 12);
			const baselineLastYear = Math.ceil(baselineLastMonth / 12);

			for (let year = actualLastYear + 1; year <= baselineLastYear; year++) {
				// Find baseline months for this year
				const yearMonths = remainingBaseline.filter(
					(m) => Math.ceil(m.month / 12) === year,
				);
				if (yearMonths.length === 0) continue;

				const lastMonthData = yearMonths[yearMonths.length - 1];
				const firstMonthDate = yearMonths[0].date;
				const calendarYear = firstMonthDate
					? new Date(firstMonthDate).getFullYear()
					: undefined;

				extensionData.push({
					period: year,
					year,
					calendarYear,
					principalRemaining: 0, // Mortgage is paid off
					cumulativeInterest: lastActualInterest / 100,
					cumulativePrincipal: input.mortgageAmount / 100,
					totalPaid: (lastActualInterest + input.mortgageAmount) / 100,
					monthlyPrincipal: 0,
					monthlyInterest: 0,
					oneTimeOverpayment: 0,
					recurringOverpayment: 0,
					baselineBalance: lastMonthData.closingBalance / 100,
					baselineCumulativeInterest: lastMonthData.cumulativeInterest / 100,
				});
			}
		} else if (granularity === "quarterly") {
			const actualLastQuarter = Math.ceil(actualLastMonth / 3);
			const baselineLastQuarter = Math.ceil(baselineLastMonth / 3);

			for (let qtr = actualLastQuarter + 1; qtr <= baselineLastQuarter; qtr++) {
				// Find baseline months for this quarter
				const qtrMonths = remainingBaseline.filter(
					(m) => Math.ceil(m.month / 3) === qtr,
				);
				if (qtrMonths.length === 0) continue;

				const lastMonthData = qtrMonths[qtrMonths.length - 1];
				const lastDate = lastMonthData.date
					? new Date(lastMonthData.date)
					: undefined;
				const calendarMonth = lastDate ? lastDate.getMonth() + 1 : undefined;
				const calendarQuarter = calendarMonth
					? Math.ceil(calendarMonth / 3)
					: undefined;

				extensionData.push({
					period: qtr,
					year: lastMonthData.year,
					quarter: ((qtr - 1) % 4) + 1,
					calendarYear: lastDate?.getFullYear(),
					calendarQuarter,
					principalRemaining: 0,
					cumulativeInterest: lastActualInterest / 100,
					cumulativePrincipal: input.mortgageAmount / 100,
					totalPaid: (lastActualInterest + input.mortgageAmount) / 100,
					monthlyPrincipal: 0,
					monthlyInterest: 0,
					oneTimeOverpayment: 0,
					recurringOverpayment: 0,
					baselineBalance: lastMonthData.closingBalance / 100,
					baselineCumulativeInterest: lastMonthData.cumulativeInterest / 100,
				});
			}
		} else {
			// Monthly view
			for (const baselineMonth of remainingBaseline) {
				const date = baselineMonth.date
					? new Date(baselineMonth.date)
					: undefined;

				extensionData.push({
					period: baselineMonth.month,
					year: baselineMonth.year,
					month: baselineMonth.monthOfYear,
					calendarYear: date?.getFullYear(),
					calendarMonth: date ? date.getMonth() + 1 : undefined,
					principalRemaining: 0,
					cumulativeInterest: lastActualInterest / 100,
					cumulativePrincipal: input.mortgageAmount / 100,
					totalPaid: (lastActualInterest + input.mortgageAmount) / 100,
					monthlyPrincipal: 0,
					monthlyInterest: 0,
					oneTimeOverpayment: 0,
					recurringOverpayment: 0,
					baselineBalance: baselineMonth.closingBalance / 100,
					baselineCumulativeInterest: baselineMonth.cumulativeInterest / 100,
				});
			}
		}

		return [...chartData, ...extensionData];
	})();

	// Prepare rate periods for the rate timeline chart
	const ratePeriodInfos = resolvedRatePeriods.map((period) => {
		// Calculate start and end periods based on granularity
		let startPeriod: number;
		let endPeriod: number;

		if (granularity === "yearly") {
			startPeriod = Math.ceil(period.startMonth / 12);
			const periodEnd =
				period.durationMonths === 0
					? input.mortgageTermMonths
					: period.startMonth + period.durationMonths - 1;
			endPeriod = Math.ceil(periodEnd / 12);
		} else if (granularity === "quarterly") {
			startPeriod = Math.ceil(period.startMonth / 3);
			const periodEnd =
				period.durationMonths === 0
					? input.mortgageTermMonths
					: period.startMonth + period.durationMonths - 1;
			endPeriod = Math.ceil(periodEnd / 3);
		} else {
			startPeriod = period.startMonth;
			endPeriod =
				period.durationMonths === 0
					? input.mortgageTermMonths
					: period.startMonth + period.durationMonths - 1;
		}

		return {
			id: period.id,
			label: period.label,
			startPeriod,
			endPeriod,
			rate: period.rate,
			type: period.type,
		};
	});

	const handleToggleVisibility = <T extends ChartType>(
		chartType: T,
		key: keyof ChartVisibilitySettings[T],
	) => {
		toggleChartVisibility(chartType, key);
	};

	return (
		<SimulateChartsContainer
			data={chartData}
			overpaymentImpactData={overpaymentImpactData}
			settings={settings}
			onChartChange={setActiveChart}
			onGranularityChange={setGranularity}
			onToggleVisibility={handleToggleVisibility}
			hasOverpayments={hasOverpayments}
			ratePeriods={ratePeriodInfos}
			milestones={milestones}
			deposit={deposit}
			startDate={input.startDate ? new Date(input.startDate) : undefined}
		/>
	);
}
