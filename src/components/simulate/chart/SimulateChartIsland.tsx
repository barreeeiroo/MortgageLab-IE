import { useStore } from "@nanostores/react";
import { useState } from "react";
import { $hasRequiredData } from "@/lib/stores/simulate";
import {
	$amortizationSchedule,
	$yearlySchedule,
} from "@/lib/stores/simulate/simulate-calculations";
import { SimulateChart } from "./SimulateChart";

export type ChartGranularity = "monthly" | "yearly";

export interface ChartVisibility {
	principalRemaining: boolean;
	cumulativeInterest: boolean;
	cumulativePrincipal: boolean;
	totalPaid: boolean;
	monthlyPayment: boolean;
}

export interface ChartDataPoint {
	// Unique identifier for the data point (absolute month number in monthly mode, year number in yearly mode)
	period: number;
	year: number;
	month?: number;
	// Actual calendar date (if startDate is set)
	calendarYear?: number;
	calendarMonth?: number;
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
	const chartData: ChartDataPoint[] =
		granularity === "yearly"
			? yearlySchedule.map((row) => {
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
				})
			: monthlySchedule.map((row) => {
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
