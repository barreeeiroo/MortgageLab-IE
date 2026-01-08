import {
	CartesianGrid,
	Line,
	LineChart,
	ReferenceLine,
	XAxis,
	YAxis,
} from "recharts";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
} from "@/components/ui/chart";
import type {
	RemortgageMonthlyComparison,
	RemortgageYearlyComparison,
} from "@/lib/mortgage/breakeven";
import { formatCurrency, formatCurrencyShort } from "@/lib/utils";

interface SavingsBreakevenChartProps {
	data: RemortgageYearlyComparison[];
	monthlyData?: RemortgageMonthlyComparison[];
	switchingCosts: number;
	breakevenYear: number | null;
	breakevenMonth?: number | null;
}

const COLORS = {
	cumulativeSavings: "var(--primary)",
	switchingCosts: "var(--chart-interest)",
} as const;

const chartConfig = {
	cumulativeSavings: {
		label: "Cumulative Savings",
		color: COLORS.cumulativeSavings,
	},
	switchingCosts: {
		label: "Switching Costs",
		color: COLORS.switchingCosts,
	},
} satisfies ChartConfig;

export function SavingsBreakevenChart({
	data,
	monthlyData,
	switchingCosts,
	breakevenYear,
	breakevenMonth,
}: SavingsBreakevenChartProps) {
	// Use monthly view if breakeven is under 2 years
	const useMonthlyView =
		breakevenMonth !== undefined &&
		breakevenMonth !== null &&
		breakevenMonth < 24 &&
		monthlyData &&
		monthlyData.length > 0;

	// Limit data to 2x breakeven point if breakeven exists
	const limitedData = useMonthlyView
		? breakevenMonth * 2 < monthlyData.length
			? monthlyData.slice(0, breakevenMonth * 2 + 1)
			: monthlyData
		: breakevenYear && breakevenYear * 2 < data.length
			? data.slice(0, breakevenYear * 2 + 1)
			: data;

	// Add switching costs line to data for reference
	const chartData = limitedData.map((point) => ({
		...point,
		switchingCostsLine: switchingCosts,
	}));

	const referenceLineValue = useMonthlyView ? breakevenMonth : breakevenYear;
	const dataKey = useMonthlyView ? "month" : "year";

	return (
		<div className="mt-3">
			<ChartContainer config={chartConfig} className="h-[180px] w-full">
				<LineChart
					data={chartData}
					margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
				>
					<CartesianGrid strokeDasharray="3 3" vertical={false} />
					<XAxis
						dataKey={dataKey}
						tickLine={false}
						axisLine={false}
						tickMargin={8}
						tickFormatter={(value) =>
							useMonthlyView ? `M${value}` : `Y${value}`
						}
					/>
					<YAxis
						tickLine={false}
						axisLine={false}
						tickMargin={8}
						width={50}
						tickFormatter={formatCurrencyShort}
					/>
					<ChartTooltip
						content={({ active, payload }) => {
							if (!active || !payload?.length) return null;
							const point = payload[0].payload as (
								| RemortgageYearlyComparison
								| RemortgageMonthlyComparison
							) & {
								switchingCostsLine: number;
							};
							const periodLabel = useMonthlyView
								? `Month ${"month" in point ? point.month : ""}`
								: `Year ${"year" in point ? point.year : ""}`;
							return (
								<div className="border-border/50 bg-background rounded-lg border px-3 py-2 shadow-xl">
									<div className="font-medium mb-2">{periodLabel}</div>
									<div className="space-y-1.5 text-sm">
										<div className="flex items-center justify-between gap-4">
											<div className="flex items-center gap-1.5">
												<div
													className="h-2.5 w-2.5 rounded-sm shrink-0"
													style={{ backgroundColor: COLORS.cumulativeSavings }}
												/>
												<span className="text-muted-foreground">
													Cumulative Savings
												</span>
											</div>
											<span className="font-mono">
												{formatCurrency(point.cumulativeSavings)}
											</span>
										</div>
										<div className="flex items-center justify-between gap-4">
											<div className="flex items-center gap-1.5">
												<div
													className="h-2.5 w-2.5 rounded-sm shrink-0 border border-dashed"
													style={{
														backgroundColor: "transparent",
														borderColor: COLORS.switchingCosts,
													}}
												/>
												<span className="text-muted-foreground">
													Switching Costs
												</span>
											</div>
											<span className="font-mono">
												{formatCurrency(point.switchingCostsLine)}
											</span>
										</div>
										<div className="flex items-center justify-between gap-4 pt-1.5 border-t border-border/50">
											<span className="text-muted-foreground pl-4">
												Net Savings
											</span>
											<span
												className={`font-mono font-semibold ${point.netSavings > 0 ? "text-green-600" : "text-amber-600"}`}
											>
												{point.netSavings > 0 ? "+" : ""}
												{formatCurrency(point.netSavings)}
											</span>
										</div>
									</div>
								</div>
							);
						}}
					/>
					{referenceLineValue && (
						<ReferenceLine
							x={referenceLineValue}
							stroke="var(--primary)"
							strokeDasharray="4 4"
							opacity={0.6}
						/>
					)}
					<Line
						type="monotone"
						dataKey="cumulativeSavings"
						stroke="var(--color-cumulativeSavings)"
						strokeWidth={2}
						dot={false}
						activeDot={{ r: 4 }}
					/>
					<Line
						type="monotone"
						dataKey="switchingCostsLine"
						stroke="var(--color-switchingCosts)"
						strokeWidth={2}
						strokeDasharray="5 5"
						dot={false}
						activeDot={{ r: 4 }}
					/>
				</LineChart>
			</ChartContainer>
			{/* Legend */}
			<div className="flex items-center justify-center gap-4 mt-2 text-xs">
				<div className="flex items-center gap-1.5">
					<div
						className="h-2 w-2 rounded-sm"
						style={{ backgroundColor: COLORS.cumulativeSavings }}
					/>
					<span className="text-muted-foreground">Cumulative Savings</span>
				</div>
				<div className="flex items-center gap-1.5">
					<div
						className="h-2 w-2 rounded-sm border border-dashed"
						style={{
							backgroundColor: "transparent",
							borderColor: COLORS.switchingCosts,
						}}
					/>
					<span className="text-muted-foreground">Switching Costs</span>
				</div>
			</div>
		</div>
	);
}
