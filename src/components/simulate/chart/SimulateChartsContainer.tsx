import { useStore } from "@nanostores/react";
import { ImageDown, LineChart } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import {
	downloadChartWithBranding,
	elementToPngDataUrl,
} from "@/lib/export/format/chart-image";
import type { Milestone } from "@/lib/schemas/simulate";
import {
	CHART_LABELS,
	type ChartGranularity,
	type ChartSettings,
	type ChartType,
	type ChartVisibilitySettings,
} from "@/lib/stores/simulate/simulate-chart";
import {
	$pendingChartCapture,
	completeChartCapture,
} from "@/lib/stores/simulate/simulate-chart-capture";
import { BalanceEquityChart } from "./charts/BalanceEquityChart";
import { CumulativeCostsChart } from "./charts/CumulativeCostsChart";
import { OverpaymentImpactChart } from "./charts/OverpaymentImpactChart";
import { PaymentBreakdownChart } from "./charts/PaymentBreakdownChart";
import { RateTimelineChart } from "./charts/RateTimelineChart";
import { CHART_COLORS } from "./charts/shared/chartConfig";
import { StaticChartLegend } from "./StaticChartLegend";
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
	const chartContentRef = useRef<HTMLDivElement>(null);
	const [isExporting, setIsExporting] = useState(false);

	// Refs for capturing all charts for PDF export
	const captureRefs = useRef<Record<ChartType, HTMLDivElement | null>>({
		balance_equity: null,
		payment_breakdown: null,
		cumulative_costs: null,
		overpayment_impact: null,
		rate_timeline: null,
	});

	// Listen for capture requests
	const pendingCapture = useStore($pendingChartCapture);

	useEffect(() => {
		const timer = setTimeout(() => {
			hasAnimated.current = true;
		}, ANIMATION_DURATION + 50);
		return () => clearTimeout(timer);
	}, []);

	// Handle chart capture requests for PDF export
	useEffect(() => {
		if (!pendingCapture) return;

		const captureAllCharts = async () => {
			const chartTypes: ChartType[] = [
				"balance_equity",
				"payment_breakdown",
				"cumulative_costs",
				"overpayment_impact",
				"rate_timeline",
			];

			// Temporarily disable dark mode for capture (white background needs dark text)
			const isDarkMode = document.documentElement.classList.contains("dark");
			if (isDarkMode) {
				document.documentElement.classList.remove("dark");
			}

			const images: { title: string; imageDataUrl: string }[] = [];

			try {
				for (const chartType of chartTypes) {
					const element = captureRefs.current[chartType];
					if (element) {
						try {
							const imageDataUrl = await elementToPngDataUrl(element, {
								pixelRatio: 2,
								backgroundColor: "#ffffff",
							});
							images.push({
								title: CHART_LABELS[chartType],
								imageDataUrl,
							});
						} catch {
							// Skip if capture fails
						}
					}
				}
			} finally {
				// Restore dark mode if it was active
				if (isDarkMode) {
					document.documentElement.classList.add("dark");
				}
			}

			completeChartCapture(images);
		};

		// Small delay to ensure hidden charts are rendered
		const timer = setTimeout(captureAllCharts, 100);
		return () => clearTimeout(timer);
	}, [pendingCapture]);

	const { activeChart, granularity, visibility } = settings;

	const handleExportChart = useCallback(async () => {
		if (!chartContentRef.current) return;
		setIsExporting(true);
		try {
			await downloadChartWithBranding(chartContentRef.current, "simulation", {
				title: CHART_LABELS[activeChart],
				pixelRatio: 2,
				backgroundColor: "#ffffff",
			});
		} finally {
			setIsExporting(false);
		}
	}, [activeChart]);

	const shouldAnimate = !hasAnimated.current;
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
		<>
			<Card className="overflow-hidden">
				<CardHeader className="pb-2">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div className="flex items-center gap-2 min-w-0">
							<LineChart className="h-4 w-4 shrink-0 text-muted-foreground" />
							<CardTitle className="truncate">Mortgage Projection</CardTitle>
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								className="h-8 gap-1.5"
								onClick={handleExportChart}
								disabled={isExporting}
								title="Download chart as PNG"
							>
								<ImageDown className="h-4 w-4" />
								<span className="hidden sm:inline">
									{isExporting ? "Saving..." : "Save"}
								</span>
							</Button>
							<Tabs
								value={granularity}
								onValueChange={(v) =>
									onGranularityChange(v as ChartGranularity)
								}
							>
								<TabsList className="h-8">
									<TabsTrigger value="yearly" className="text-xs px-2">
										<span className="sm:hidden">Y</span>
										<span className="hidden sm:inline">Yearly</span>
									</TabsTrigger>
									<TabsTrigger value="quarterly" className="text-xs px-2">
										<span className="sm:hidden">Q</span>
										<span className="hidden sm:inline">Quarterly</span>
									</TabsTrigger>
									<TabsTrigger value="monthly" className="text-xs px-2">
										<span className="sm:hidden">M</span>
										<span className="hidden sm:inline">Monthly</span>
									</TabsTrigger>
								</TabsList>
							</Tabs>
						</div>
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
				</CardHeader>
				{/* Chart content area - captured for export */}
				<div ref={chartContentRef}>
					{/* Visibility toggles (legend) */}
					<div className="flex flex-wrap items-center gap-2 px-6 pb-2">
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
				</div>
			</Card>

			{/* Hidden container for capturing all charts for PDF export */}
			{pendingCapture && (
				<div
					style={{
						position: "absolute",
						left: "-9999px",
						top: 0,
						width: "800px",
						background: "#ffffff",
					}}
					aria-hidden="true"
				>
					<div
						ref={(el) => {
							captureRefs.current.balance_equity = el;
						}}
						style={{ padding: "16px" }}
					>
						<StaticChartLegend items={VISIBILITY_CONFIGS.balance_equity} />
						<BalanceEquityChart
							data={data}
							visibility={visibility.balance_equity}
							granularity={granularity}
							animate={false}
							deposit={deposit}
						/>
					</div>
					<div
						ref={(el) => {
							captureRefs.current.payment_breakdown = el;
						}}
						style={{ padding: "16px" }}
					>
						<StaticChartLegend items={VISIBILITY_CONFIGS.payment_breakdown} />
						<PaymentBreakdownChart
							data={data}
							visibility={visibility.payment_breakdown}
							granularity={granularity}
							animate={false}
						/>
					</div>
					<div
						ref={(el) => {
							captureRefs.current.cumulative_costs = el;
						}}
						style={{ padding: "16px" }}
					>
						<StaticChartLegend items={VISIBILITY_CONFIGS.cumulative_costs} />
						<CumulativeCostsChart
							data={data}
							visibility={visibility.cumulative_costs}
							granularity={granularity}
							animate={false}
						/>
					</div>
					<div
						ref={(el) => {
							captureRefs.current.overpayment_impact = el;
						}}
						style={{ padding: "16px" }}
					>
						<StaticChartLegend items={VISIBILITY_CONFIGS.overpayment_impact} />
						<OverpaymentImpactChart
							data={overpaymentImpactData}
							visibility={visibility.overpayment_impact}
							granularity={granularity}
							animate={false}
							hasOverpayments={hasOverpayments}
						/>
					</div>
					<div
						ref={(el) => {
							captureRefs.current.rate_timeline = el;
						}}
						style={{ padding: "16px" }}
					>
						<StaticChartLegend items={VISIBILITY_CONFIGS.rate_timeline} />
						<RateTimelineChart
							data={data}
							visibility={visibility.rate_timeline}
							granularity={granularity}
							animate={false}
							ratePeriods={ratePeriods}
							milestones={milestones}
							startDate={startDate}
						/>
					</div>
				</div>
			)}
		</>
	);
}
