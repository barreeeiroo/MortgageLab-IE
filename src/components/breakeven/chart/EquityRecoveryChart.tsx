import {
	Area,
	AreaChart,
	CartesianGrid,
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
	MonthlyComparison,
	YearlyComparison,
} from "@/lib/mortgage/breakeven";
import { formatCurrency, formatCurrencyShort } from "@/lib/utils/currency";

interface EquityRecoveryChartProps {
	data: YearlyComparison[];
	monthlyData?: MonthlyComparison[];
	upfrontCosts: number;
	breakevenYear: number | null;
	breakevenMonth?: number | null;
}

const COLORS = {
	equity: "var(--primary)",
} as const;

const chartConfig = {
	equity: {
		label: "Equity",
		color: COLORS.equity,
	},
} satisfies ChartConfig;

export function EquityRecoveryChart({
	data,
	monthlyData,
	upfrontCosts,
	breakevenYear,
	breakevenMonth,
}: EquityRecoveryChartProps) {
	// Use monthly view if breakeven is under 2 years
	const useMonthlyView =
		breakevenMonth !== undefined &&
		breakevenMonth !== null &&
		breakevenMonth < 24 &&
		monthlyData &&
		monthlyData.length > 0;

	// Limit data to 2x breakeven point if breakeven exists
	const chartData = useMonthlyView
		? breakevenMonth * 2 < monthlyData.length
			? monthlyData.slice(0, breakevenMonth * 2 + 1)
			: monthlyData
		: breakevenYear && breakevenYear * 2 < data.length
			? data.slice(0, breakevenYear * 2 + 1)
			: data;

	const referenceLineValue = useMonthlyView ? breakevenMonth : breakevenYear;
	const dataKey = useMonthlyView ? "month" : "year";

	return (
		<div className="mt-3">
			<ChartContainer config={chartConfig} className="h-[180px] w-full">
				<AreaChart
					data={chartData}
					margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
				>
					<defs>
						<linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
							<stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
							<stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
						</linearGradient>
					</defs>
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
							const point = payload[0].payload as
								| YearlyComparison
								| MonthlyComparison;
							const aboveUpfront = point.equity > upfrontCosts;
							const periodLabel = useMonthlyView
								? `Month ${"month" in point ? point.month : ""}`
								: `Year ${"year" in point ? point.year : ""}`;
							const difference = point.equity - upfrontCosts;
							return (
								<div className="border-border/50 bg-background rounded-lg border px-3 py-2 shadow-xl">
									<div className="font-medium mb-2">{periodLabel}</div>
									<div className="space-y-1.5 text-sm">
										{/* Primary metric: Equity with color indicator */}
										<div className="flex items-center justify-between gap-4">
											<div className="flex items-center gap-1.5">
												<div
													className="h-2.5 w-2.5 rounded-sm shrink-0"
													style={{ backgroundColor: COLORS.equity }}
												/>
												<span className="text-muted-foreground">
													Your Equity
												</span>
											</div>
											<span
												className={`font-mono font-semibold ${aboveUpfront ? "text-green-600" : ""}`}
											>
												{formatCurrency(point.equity)}
											</span>
										</div>
										{/* Comparison to upfront costs */}
										<div className="flex items-center justify-between gap-4 pt-1.5 border-t border-border/50">
											<span className="text-muted-foreground pl-4">
												vs Upfront Costs
											</span>
											<span
												className={`font-mono font-semibold ${aboveUpfront ? "text-green-600" : "text-amber-600"}`}
											>
												{difference > 0 ? "+" : ""}
												{formatCurrency(difference)}
											</span>
										</div>
										{/* Breakdown explanation */}
										<div className="pt-1.5 border-t border-border/50 text-xs text-muted-foreground space-y-0.5">
											<div className="flex justify-between">
												<span>Home Value</span>
												<span className="font-mono">
													{formatCurrency(point.homeValue)}
												</span>
											</div>
											<div className="flex justify-between">
												<span>− Mortgage Owed</span>
												<span className="font-mono">
													{formatCurrency(point.mortgageBalance)}
												</span>
											</div>
										</div>
									</div>
								</div>
							);
						}}
					/>
					{/* Reference line for upfront costs */}
					<ReferenceLine
						y={upfrontCosts}
						stroke="var(--muted-foreground)"
						strokeDasharray="4 4"
						opacity={0.5}
						label={{
							value: "Upfront",
							position: "right",
							fill: "var(--muted-foreground)",
							fontSize: 10,
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
					<Area
						type="monotone"
						dataKey="equity"
						stroke="var(--color-equity)"
						strokeWidth={2}
						fill="url(#equityGradient)"
						dot={false}
						activeDot={{ r: 4 }}
					/>
				</AreaChart>
			</ChartContainer>
			{/* Legend */}
			<div className="flex items-center justify-center gap-4 mt-2 text-xs">
				<div className="flex items-center gap-1.5">
					<div
						className="h-2 w-2 rounded-sm"
						style={{ backgroundColor: COLORS.equity }}
					/>
					<span className="text-muted-foreground">Equity Built</span>
				</div>
				<div className="flex items-center gap-1.5">
					<div className="h-0.5 w-3 border-t border-dashed border-muted-foreground" />
					<span className="text-muted-foreground">Upfront Costs</span>
				</div>
			</div>
		</div>
	);
}
