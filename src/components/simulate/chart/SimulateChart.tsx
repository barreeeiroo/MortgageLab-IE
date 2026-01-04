import { useEffect, useRef } from "react";
import {
	Bar,
	CartesianGrid,
	ComposedChart,
	Line,
	XAxis,
	YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
} from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import { formatCurrency, formatCurrencyShort } from "@/lib/utils";
import type {
	ChartDataPoint,
	ChartGranularity,
	ChartVisibility,
} from "./SimulateChartIsland";

interface SimulateChartProps {
	data: ChartDataPoint[];
	visibility: ChartVisibility;
	granularity: ChartGranularity;
	onToggleVisibility: (key: keyof ChartVisibility) => void;
	onGranularityChange: (granularity: ChartGranularity) => void;
}

const chartConfig = {
	principalRemaining: {
		label: "Balance Remaining",
		color: "var(--primary)",
	},
	cumulativeInterest: {
		label: "Total Interest Paid",
		color: "var(--chart-2)",
	},
	cumulativePrincipal: {
		label: "Total Principal Paid",
		color: "var(--chart-3)",
	},
	totalPaid: {
		label: "Total Paid",
		color: "var(--chart-4)",
	},
	monthlyPrincipal: {
		label: "Monthly Principal",
		color: "var(--chart-3)",
	},
	monthlyInterest: {
		label: "Monthly Interest",
		color: "var(--chart-2)",
	},
	monthlyPayment: {
		label: "Monthly Payment",
		color: "var(--chart-4)",
	},
} satisfies ChartConfig;

// Colors for toggle buttons (outside ChartContainer scope)
const COLORS = {
	principalRemaining: "var(--primary)",
	cumulativeInterest: "var(--chart-2)",
	cumulativePrincipal: "var(--chart-3)",
	totalPaid: "var(--chart-4)",
	monthlyPrincipal: "var(--chart-3)",
	monthlyInterest: "var(--chart-2)",
	monthlyPayment: "var(--chart-4)",
} as const;

const leftAxisSeries: Array<{
	key: keyof ChartVisibility;
	label: string;
}> = [
	{ key: "principalRemaining", label: "Balance" },
	{ key: "cumulativeInterest", label: "Interest" },
	{ key: "cumulativePrincipal", label: "Principal" },
	{ key: "totalPaid", label: "Total" },
];

const ANIMATION_DURATION = 400;

const MONTH_NAMES = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

function formatPeriodLabel(
	dataPoint: ChartDataPoint,
	granularity: ChartGranularity,
): string {
	// Use calendar dates if available
	if (dataPoint.calendarYear !== undefined) {
		if (granularity === "yearly") {
			return `${dataPoint.calendarYear}`;
		}
		const monthName = MONTH_NAMES[(dataPoint.calendarMonth ?? 1) - 1];
		return `${monthName} ${dataPoint.calendarYear}`;
	}

	// Fallback to incremental year/month
	if (granularity === "yearly") {
		return `Year ${dataPoint.year}`;
	}
	return `Year ${dataPoint.year} Month ${dataPoint.month}`;
}

// Custom dot renderer: show dots for yearly view or January in monthly view
function createDotRenderer(granularity: ChartGranularity, color: string) {
	return (props: {
		cx?: number;
		cy?: number;
		payload?: ChartDataPoint;
		index?: number;
	}) => {
		const { cx, cy, payload, index } = props;
		if (cx === undefined || cy === undefined || !payload) return null;

		// Show dot for yearly view, or for January (calendarMonth 1) in monthly view
		const shouldShowDot =
			granularity === "yearly" || payload.calendarMonth === 1;
		if (!shouldShowDot) return null;

		return (
			<circle
				key={`dot-${index}`}
				cx={cx}
				cy={cy}
				r={3}
				fill={color}
				stroke="var(--background)"
				strokeWidth={1}
			/>
		);
	};
}

export function SimulateChart({
	data,
	visibility,
	granularity,
	onToggleVisibility,
	onGranularityChange,
}: SimulateChartProps) {
	// Track if initial animation has completed to avoid re-animating on visibility toggle
	const hasAnimated = useRef(false);
	useEffect(() => {
		const timer = setTimeout(() => {
			hasAnimated.current = true;
		}, ANIMATION_DURATION + 50);
		return () => clearTimeout(timer);
	}, []);

	const shouldAnimate = !hasAnimated.current;

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
							<TabsTrigger value="monthly" className="text-xs px-2">
								Monthly
							</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>
				{/* Legend Toggles */}
				<div className="flex justify-between gap-2 pt-2">
					<div className="flex flex-wrap gap-2">
						{leftAxisSeries.map((series) => (
							<Toggle
								key={series.key}
								pressed={visibility[series.key]}
								onPressedChange={() => onToggleVisibility(series.key)}
								size="sm"
								className="h-7 gap-1.5 text-xs cursor-pointer hover:bg-muted data-[state=on]:bg-accent"
							>
								<div
									className="h-2.5 w-2.5 rounded-sm shrink-0"
									style={{
										backgroundColor: COLORS[series.key],
									}}
								/>
								{series.label}
							</Toggle>
						))}
					</div>
					<div className="flex flex-wrap gap-2">
						{/* Monthly Payment toggle with stacked color indicators */}
						<Toggle
							pressed={visibility.monthlyPayment}
							onPressedChange={() => onToggleVisibility("monthlyPayment")}
							size="sm"
							className="h-7 gap-1.5 text-xs cursor-pointer hover:bg-muted data-[state=on]:bg-accent"
						>
							<div className="flex gap-0.5">
								<div
									className="h-2.5 w-1.5 rounded-l-sm shrink-0"
									style={{ backgroundColor: COLORS.monthlyPrincipal }}
								/>
								<div
									className="h-2.5 w-1.5 rounded-r-sm shrink-0"
									style={{ backgroundColor: COLORS.monthlyInterest }}
								/>
							</div>
							Monthly Payment
						</Toggle>
					</div>
				</div>
			</CardHeader>
			<CardContent className="pt-0">
				<ChartContainer
					config={chartConfig}
					className="aspect-auto h-[300px] w-full"
				>
					<ComposedChart
						data={data}
						margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
					>
						<CartesianGrid strokeDasharray="3 3" vertical={false} />
						<XAxis
							dataKey="period"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							tickFormatter={(value) => {
								// Find the data point by period value
								const dataPoint = data.find((d) => d.period === value);
								if (!dataPoint) return "";

								const hasCalendarDate = dataPoint.calendarYear !== undefined;

								if (granularity === "yearly") {
									return hasCalendarDate
										? `${dataPoint.calendarYear}`
										: `Y${dataPoint.year}`;
								}
								// Monthly view: format as year
								return hasCalendarDate
									? `${dataPoint.calendarYear}`
									: `Y${dataPoint.year}`;
							}}
							// Only show ticks for yearly data or January months in monthly mode
							ticks={
								granularity === "yearly"
									? undefined // Show all ticks in yearly mode
									: data
											.filter((d) => d.calendarMonth === 1)
											.map((d) => d.period)
							}
							interval="preserveStartEnd"
						/>
						<YAxis
							yAxisId="left"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							width={60}
							tickFormatter={formatCurrencyShort}
							domain={[0, "auto"]}
						/>
						<YAxis
							yAxisId="right"
							orientation="right"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							width={50}
							tickFormatter={formatCurrencyShort}
							domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.1)]}
							allowDataOverflow={false}
						/>
						<ChartTooltip
							content={({ active, payload }) => {
								if (!active || !payload?.length) return null;

								const dataPoint = payload[0].payload as ChartDataPoint;
								const label = formatPeriodLabel(dataPoint, granularity);

								// Calculate monthly payment total
								const monthlyPayment =
									dataPoint.monthlyPrincipal + dataPoint.monthlyInterest;

								// Separate items into categories
								const cumulativeItems = payload.filter(
									(item) =>
										item.value !== undefined &&
										(item.dataKey === "cumulativeInterest" ||
											item.dataKey === "cumulativePrincipal" ||
											item.dataKey === "totalPaid"),
								);

								const monthlyItems = payload.filter(
									(item) =>
										item.value !== undefined &&
										(item.dataKey === "monthlyPrincipal" ||
											item.dataKey === "monthlyInterest"),
								);

								// Check if balance remaining is in payload
								const balanceItem = payload.find(
									(item) => item.dataKey === "principalRemaining",
								);

								return (
									<div className="border-border/50 bg-background rounded-lg border px-3 py-2 shadow-xl">
										<div className="font-medium mb-2">{label}</div>
										<div className="space-y-1">
											{/* Cumulative/total items first */}
											{cumulativeItems.map((item) => (
												<div
													key={item.dataKey}
													className="flex items-center justify-between gap-4"
												>
													<div className="flex items-center gap-1.5">
														<div
															className="h-2.5 w-2.5 rounded-sm shrink-0"
															style={{
																backgroundColor:
																	COLORS[item.dataKey as keyof typeof COLORS],
															}}
														/>
														<span className="text-muted-foreground text-sm">
															{
																chartConfig[
																	item.dataKey as keyof typeof chartConfig
																]?.label
															}
														</span>
													</div>
													<span className="font-mono font-medium text-sm">
														{formatCurrency(item.value as number, {
															showCents: true,
														})}
													</span>
												</div>
											))}
											{/* Monthly items below totals */}
											{monthlyItems.map((item) => (
												<div
													key={item.dataKey}
													className="flex items-center justify-between gap-4"
												>
													<div className="flex items-center gap-1.5">
														<div
															className="h-2.5 w-2.5 rounded-sm shrink-0"
															style={{
																backgroundColor:
																	COLORS[item.dataKey as keyof typeof COLORS],
															}}
														/>
														<span className="text-muted-foreground text-sm">
															{
																chartConfig[
																	item.dataKey as keyof typeof chartConfig
																]?.label
															}
														</span>
													</div>
													<span className="font-mono font-medium text-sm">
														{formatCurrency(item.value as number, {
															showCents: true,
														})}
													</span>
												</div>
											))}

											{/* Divider and summary items */}
											{(balanceItem ||
												(visibility.monthlyPayment && monthlyPayment > 0)) && (
												<div className="pt-1 mt-1 border-t border-border/50 space-y-1">
													{/* Balance Remaining */}
													{balanceItem && (
														<div className="flex items-center justify-between gap-4">
															<div className="flex items-center gap-1.5">
																<div
																	className="h-2.5 w-2.5 rounded-sm shrink-0"
																	style={{
																		backgroundColor: COLORS.principalRemaining,
																	}}
																/>
																<span className="text-muted-foreground text-sm font-medium">
																	Balance Remaining
																</span>
															</div>
															<span className="font-mono font-medium text-sm">
																{formatCurrency(balanceItem.value as number, {
																	showCents: true,
																})}
															</span>
														</div>
													)}
													{/* Monthly Payment total */}
													{visibility.monthlyPayment && monthlyPayment > 0 && (
														<div className="flex items-center justify-between gap-4">
															<div className="flex items-center gap-1.5">
																<div className="flex">
																	<div
																		className="h-2.5 w-1.5 rounded-l-sm shrink-0"
																		style={{
																			backgroundColor: COLORS.monthlyPrincipal,
																		}}
																	/>
																	<div
																		className="h-2.5 w-1.5 rounded-r-sm shrink-0"
																		style={{
																			backgroundColor: COLORS.monthlyInterest,
																		}}
																	/>
																</div>
																<span className="text-muted-foreground text-sm font-medium">
																	Monthly Payment
																</span>
															</div>
															<span className="font-mono font-medium text-sm">
																{formatCurrency(monthlyPayment, {
																	showCents: true,
																})}
															</span>
														</div>
													)}
												</div>
											)}
										</div>
									</div>
								);
							}}
						/>
						{visibility.monthlyPayment && (
							<Bar
								dataKey="monthlyPrincipal"
								name="monthlyPrincipal"
								yAxisId="right"
								stackId="payment"
								fill="var(--color-monthlyPrincipal)"
								opacity={0.5}
								radius={[0, 0, 0, 0]}
								isAnimationActive={shouldAnimate}
								animationDuration={ANIMATION_DURATION}
							/>
						)}
						{visibility.monthlyPayment && (
							<Bar
								dataKey="monthlyInterest"
								name="monthlyInterest"
								yAxisId="right"
								stackId="payment"
								fill="var(--color-monthlyInterest)"
								opacity={0.5}
								radius={[2, 2, 0, 0]}
								isAnimationActive={shouldAnimate}
								animationDuration={ANIMATION_DURATION}
							/>
						)}
						{visibility.principalRemaining && (
							<Line
								type="linear"
								dataKey="principalRemaining"
								yAxisId="left"
								stroke="var(--color-principalRemaining)"
								strokeWidth={2}
								dot={createDotRenderer(granularity, COLORS.principalRemaining)}
								activeDot={{ r: 4 }}
								isAnimationActive={shouldAnimate}
								animationDuration={ANIMATION_DURATION}
							/>
						)}
						{visibility.cumulativeInterest && (
							<Line
								type="linear"
								dataKey="cumulativeInterest"
								yAxisId="left"
								stroke="var(--color-cumulativeInterest)"
								strokeWidth={2}
								dot={createDotRenderer(granularity, COLORS.cumulativeInterest)}
								activeDot={{ r: 4 }}
								isAnimationActive={shouldAnimate}
								animationDuration={ANIMATION_DURATION}
							/>
						)}
						{visibility.cumulativePrincipal && (
							<Line
								type="linear"
								dataKey="cumulativePrincipal"
								yAxisId="left"
								stroke="var(--color-cumulativePrincipal)"
								strokeWidth={2}
								dot={createDotRenderer(granularity, COLORS.cumulativePrincipal)}
								activeDot={{ r: 4 }}
								isAnimationActive={shouldAnimate}
								animationDuration={ANIMATION_DURATION}
							/>
						)}
						{visibility.totalPaid && (
							<Line
								type="linear"
								dataKey="totalPaid"
								yAxisId="left"
								stroke="var(--color-totalPaid)"
								strokeWidth={2}
								dot={createDotRenderer(granularity, COLORS.totalPaid)}
								activeDot={{ r: 4 }}
								isAnimationActive={shouldAnimate}
								animationDuration={ANIMATION_DURATION}
							/>
						)}
					</ComposedChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
