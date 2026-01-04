import { useStore } from "@nanostores/react";
import { useState } from "react";
import { $hasRequiredData } from "@/lib/stores/simulate";
import {
	$amortizationSchedule,
	$yearlySchedule,
} from "@/lib/stores/simulate/simulate-calculations";
import { SimulateChart } from "./SimulateChart";

export type ChartGranularity = "monthly" | "quarterly" | "yearly";

export interface ChartVisibility {
	principalRemaining: boolean;
	cumulativeInterest: boolean;
	cumulativePrincipal: boolean;
	totalPaid: boolean;
	monthlyPayment: boolean;
}

export interface ChartDataPoint {
	// Unique identifier for the data point
	period: number;
	year: number;
	month?: number;
	quarter?: number; // 1-4 for quarterly view
	// Actual calendar date (if startDate is set)
	calendarYear?: number;
	calendarMonth?: number;
	calendarQuarter?: number; // 1-4 based on calendar
	principalRemaining: number;
	cumulativeInterest: number;
	cumulativePrincipal: number;
	totalPaid: number;
	// Monthly payment breakdown (for stacked bars)
	monthlyPrincipal: number;
	monthlyInterest: number;
}

export function SimulateChartIsland() {
	const hasRequiredData = useStore($hasRequiredData);
	const yearlySchedule = useStore($yearlySchedule);
	const monthlySchedule = useStore($amortizationSchedule);

	const [granularity, setGranularity] = useState<ChartGranularity>("yearly");
	const [visibility, setVisibility] = useState<ChartVisibility>({
		principalRemaining: true,
		cumulativeInterest: true,
		cumulativePrincipal: false,
		totalPaid: false,
		monthlyPayment: false,
	});

	if (!hasRequiredData) {
		return null;
	}

	// Transform schedule data for chart
	// Use pre-calculated date from the amortization schedule
	const chartData: ChartDataPoint[] = (() => {
		if (granularity === "yearly") {
			return yearlySchedule.map((row) => {
				// Get calendar year from the first month of this year
				const firstMonthDate = row.months[0]?.date;
				const calendarYear = firstMonthDate
					? new Date(firstMonthDate).getFullYear()
					: undefined;
				// Average monthly principal/interest for the year
				const monthCount = row.months.length || 1;
				return {
					period: row.year, // Use year as unique identifier in yearly mode
					year: row.year,
					calendarYear,
					principalRemaining: row.closingBalance / 100,
					cumulativeInterest: row.cumulativeInterest / 100,
					cumulativePrincipal: row.cumulativePrincipal / 100,
					totalPaid: row.cumulativeTotal / 100,
					monthlyPrincipal: row.totalPrincipal / monthCount / 100,
					monthlyInterest: row.totalInterest / monthCount / 100,
				};
			});
		}

		if (granularity === "quarterly") {
			// Group monthly data into quarters
			const quarters: ChartDataPoint[] = [];
			let quarterIndex = 0;

			for (let i = 0; i < monthlySchedule.length; i += 3) {
				// Get up to 3 months for this quarter
				const quarterMonths = monthlySchedule.slice(
					i,
					Math.min(i + 3, monthlySchedule.length),
				);
				if (quarterMonths.length === 0) break;

				// Use the last month of the quarter for cumulative values
				const lastMonth = quarterMonths[quarterMonths.length - 1];
				const lastDate = lastMonth.date ? new Date(lastMonth.date) : undefined;

				// Calculate which quarter (1-4) based on calendar month if available
				const calendarMonth = lastDate ? lastDate.getMonth() + 1 : undefined;
				const calendarQuarter = calendarMonth
					? Math.ceil(calendarMonth / 3)
					: undefined;

				// Calculate incremental quarter number (1, 2, 3, 4, 5, ...)
				quarterIndex++;

				// Average monthly principal/interest for the quarter
				const monthCount = quarterMonths.length;
				const totalPrincipal = quarterMonths.reduce(
					(sum, m) => sum + m.principalPortion,
					0,
				);
				const totalInterest = quarterMonths.reduce(
					(sum, m) => sum + m.interestPortion,
					0,
				);

				quarters.push({
					period: quarterIndex, // Unique identifier for quarterly mode
					year: lastMonth.year,
					quarter: ((quarterIndex - 1) % 4) + 1, // 1-4 repeating
					calendarYear: lastDate?.getFullYear(),
					calendarQuarter,
					principalRemaining: lastMonth.closingBalance / 100,
					cumulativeInterest: lastMonth.cumulativeInterest / 100,
					cumulativePrincipal: lastMonth.cumulativePrincipal / 100,
					totalPaid: lastMonth.cumulativeTotal / 100,
					monthlyPrincipal: totalPrincipal / monthCount / 100,
					monthlyInterest: totalInterest / monthCount / 100,
				});
			}

			return quarters;
		}

		// Monthly view (default)
		return monthlySchedule.map((row) => {
			// Use pre-calculated date from the schedule
			const date = row.date ? new Date(row.date) : undefined;
			return {
				period: row.month, // Use absolute month as unique identifier in monthly mode
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
			};
		});
	})();

	const toggleVisibility = (key: keyof ChartVisibility) => {
		setVisibility((prev) => ({
			...prev,
			[key]: !prev[key],
		}));
	};

	return (
		<SimulateChart
			data={chartData}
			visibility={visibility}
			granularity={granularity}
			onToggleVisibility={toggleVisibility}
			onGranularityChange={setGranularity}
		/>
	);
}
