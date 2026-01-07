import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import type { Milestone } from "@/lib/schemas/simulate";
import {
	CHART_LABELS,
	type ChartGranularity,
	type ChartSettings,
	type ChartType,
	type ChartVisibilitySettings,
} from "@/lib/stores/simulate/simulate-chart";
import {
	BalanceEquityChart,
	CumulativeCostsChart,
	OverpaymentImpactChart,
	PaymentBreakdownChart,
	RateTimelineChart,
} from "./charts";
import { CHART_COLORS } from "./charts/shared/chartConfig";
import type { ChartDataPoint } from "./types";

interface RatePeriodInfo {
	id: string;
	label: string;
	startPeriod: number;
	endPeriod: number;
	rate: number;
	type: "fixed" | "variable";
}

interface SimulateChartsContainerProps {
	data: ChartDataPoint[];
	overpaymentImpactData: ChartDataPoint[];
	settings: ChartSettings;
	onChartChange: (chart: ChartType) => void;
	onGranularityChange: (granularity: ChartGranularity) => void;
	onToggleVisibility: <T extends ChartType>(
		chartType: T,
		key: keyof ChartVisibilitySettings[T],
	) => void;
	hasOverpayments: boolean;
	ratePeriods: RatePeriodInfo[];
	milestones: Milestone[];
	deposit: number;
	startDate?: Date;
}

const ANIMATION_DURATION = 400;

// Visibility toggle configurations per chart
const VISIBILITY_CONFIGS: Record<
	ChartType,
	Array<{ key: string; label: string; color: string }>
> = {
	balance_equity: [
		{ key: "balance", label: "Balance", color: CHART_COLORS.balance },
		{ key: "equity", label: "Principal", color: CHART_COLORS.equity },
		{ key: "deposit", label: "Deposit", color: CHART_COLORS.deposit },
	],
	payment_breakdown: [
		{ key: "principal", label: "Principal", color: CHART_COLORS.principal },
		{ key: "interest", label: "Interest", color: CHART_COLORS.interest },
		{
			key: "oneTimeOverpayment",
			label: "One-time Overpayments",
			color: CHART_COLORS.oneTimeOverpayment,
		},
		{
			key: "recurringOverpayment",
			label: "Recurring Overpayments",
			color: CHART_COLORS.recurringOverpayment,
		},
	],
	cumulative_costs: [
		{ key: "principal", label: "Principal", color: CHART_COLORS.principal },
		{ key: "interest", label: "Interest", color: CHART_COLORS.interest },
	],
	overpayment_impact: [
		{
			key: "baseline",
			label: "Balance Baseline",
			color: CHART_COLORS.baseline,
		},
		{ key: "actual", label: "Balance Actual", color: CHART_COLORS.actual },
		{
			key: "interestBaseline",
			label: "Interest Baseline",
			color: CHART_COLORS.interest,
		},
		{
			key: "interestActual",
			label: "Interest Actual",
			color: CHART_COLORS.interestSaved,
		},
	],
	rate_timeline: [
		{ key: "ltv", label: "LTV", color: CHART_COLORS.ltv },
		{ key: "milestones", label: "Milestones", color: CHART_COLORS.milestone },
	],
};

export function SimulateChartsContainer({
	data,
	overpaymentImpactData,
	settings,
	onChartChange,
	onGranularityChange,
	onToggleVisibility,
	hasOverpayments,
	ratePeriods,
	milestones,
	deposit,
	startDate,
}: SimulateChartsContainerProps) {
	// Track if initial animation has completed
	const hasAnimated = useRef(false);
	useEffect(() => {
		const timer = setTimeout(() => {
			hasAnimated.current = true;
		}, ANIMATION_DURATION + 50);
		return () => clearTimeout(timer);
	}, []);

	const shouldAnimate = !hasAnimated.current;
	const { activeChart, granularity, visibility } = settings;
	const currentVisibility = visibility[activeChart];
	const toggleConfigs = VISIBILITY_CONFIGS[activeChart];

	// Chart type tabs
	const chartTypes: ChartType[] = [
		"balance_equity",
		"payment_breakdown",
		"cumulative_costs",
		"overpayment_impact",
		"rate_timeline",
	];

	return (
		<Card>
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<CardTitle>Mortgage Projection</CardTitle>
					<Tabs
						value={granularity}
						onValueChange={(v) => onGranularityChange(v as ChartGranularity)}
					>
						<TabsList className="h-8">
							<TabsTrigger value="yearly" className="text-xs px-2">
								Yearly
							</TabsTrigger>
							<TabsTrigger value="quarterly" className="text-xs px-2">
								Quarterly
							</TabsTrigger>
							<TabsTrigger value="monthly" className="text-xs px-2">
								Monthly
							</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>

				{/* Chart type selector */}
				<div className="pt-2">
					<Tabs
						value={activeChart}
						onValueChange={(v) => onChartChange(v as ChartType)}
					>
						<TabsList
							className="h-8 w-full justify-start overflow-x-auto"
							collapseOnMobile
						>
							{chartTypes.map((type) => (
								<TabsTrigger
									key={type}
									value={type}
									className="text-xs px-3 whitespace-nowrap"
								>
									{CHART_LABELS[type]}
								</TabsTrigger>
							))}
						</TabsList>
					</Tabs>
				</div>

				{/* Visibility toggles for current chart */}
				<div className="flex flex-wrap items-center gap-2 pt-2">
					{toggleConfigs.map((config) => (
						<Toggle
							key={config.key}
							pressed={
								currentVisibility[
									config.key as keyof typeof currentVisibility
								] as boolean
							}
							onPressedChange={() =>
								onToggleVisibility(
									activeChart,
									config.key as keyof ChartVisibilitySettings[typeof activeChart],
								)
							}
							size="sm"
							className="h-7 gap-1.5 text-xs cursor-pointer hover:bg-muted data-[state=on]:bg-accent"
						>
							<div
								className="h-2.5 w-2.5 rounded-sm shrink-0"
								style={{ backgroundColor: config.color }}
							/>
							{config.label}
						</Toggle>
					))}
					{/* Monthly Average checkbox for payment breakdown */}
					{activeChart === "payment_breakdown" && (
						<div className="flex items-center gap-1.5 ml-auto">
							<Checkbox
								id="monthly-average-checkbox"
								checked={visibility.payment_breakdown.monthlyAverage}
								onCheckedChange={() =>
									onToggleVisibility("payment_breakdown", "monthlyAverage")
								}
							/>
							<Label
								htmlFor="monthly-average-checkbox"
								className="text-xs cursor-pointer"
							>
								Monthly Average
							</Label>
						</div>
					)}
					{/* Stacked checkbox for cumulative costs */}
					{activeChart === "cumulative_costs" && (
						<div className="flex items-center gap-1.5 ml-auto">
							<Checkbox
								id="stacked-checkbox"
								checked={visibility.cumulative_costs.stacked}
								onCheckedChange={() =>
									onToggleVisibility("cumulative_costs", "stacked")
								}
							/>
							<Label
								htmlFor="stacked-checkbox"
								className="text-xs cursor-pointer"
							>
								Stacked
							</Label>
						</div>
					)}
					{/* Rate toggle pushed to right for rate_timeline */}
					{activeChart === "rate_timeline" && (
						<Toggle
							pressed={visibility.rate_timeline.rate}
							onPressedChange={() =>
								onToggleVisibility("rate_timeline", "rate")
							}
							size="sm"
							className="h-7 gap-1.5 text-xs cursor-pointer hover:bg-muted data-[state=on]:bg-accent ml-auto"
						>
							<div
								className="h-2.5 w-2.5 rounded-sm shrink-0"
								style={{ backgroundColor: CHART_COLORS.rate }}
							/>
							Rate
						</Toggle>
					)}
				</div>
			</CardHeader>
			<CardContent className="pt-0">
				{activeChart === "balance_equity" && (
					<BalanceEquityChart
						data={data}
						visibility={visibility.balance_equity}
						granularity={granularity}
						animate={shouldAnimate}
						deposit={deposit}
					/>
				)}
				{activeChart === "payment_breakdown" && (
					<PaymentBreakdownChart
						data={data}
						visibility={visibility.payment_breakdown}
						granularity={granularity}
						animate={shouldAnimate}
					/>
				)}
				{activeChart === "cumulative_costs" && (
					<CumulativeCostsChart
						data={data}
						visibility={visibility.cumulative_costs}
						granularity={granularity}
						animate={shouldAnimate}
					/>
				)}
				{activeChart === "overpayment_impact" && (
					<OverpaymentImpactChart
						data={overpaymentImpactData}
						visibility={visibility.overpayment_impact}
						granularity={granularity}
						animate={shouldAnimate}
						hasOverpayments={hasOverpayments}
					/>
				)}
				{activeChart === "rate_timeline" && (
					<RateTimelineChart
						data={data}
						visibility={visibility.rate_timeline}
						granularity={granularity}
						animate={shouldAnimate}
						ratePeriods={ratePeriods}
						milestones={milestones}
						startDate={startDate}
					/>
				)}
			</CardContent>
		</Card>
	);
}
