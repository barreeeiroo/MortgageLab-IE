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
	MonthlyComparison,
	YearlyComparison,
} from "@/lib/mortgage/breakeven";
import { formatCurrency, formatCurrencyShort } from "@/lib/utils";

interface NetWorthBreakevenChartProps {
	data: YearlyComparison[];
	monthlyData?: MonthlyComparison[];
	breakevenYear: number | null;
	breakevenMonth?: number | null;
}

const COLORS = {
	cumulativeRent: "var(--chart-interest)",
	netOwnershipCost: "var(--primary)",
} as const;

const chartConfig = {
	cumulativeRent: {
		label: "Rent Paid",
		color: COLORS.cumulativeRent,
	},
	netOwnershipCost: {
		label: "Net Ownership Cost",
		color: COLORS.netOwnershipCost,
	},
} satisfies ChartConfig;

export function NetWorthBreakevenChart({
	data,
	monthlyData,
	breakevenYear,
	breakevenMonth,
}: NetWorthBreakevenChartProps) {
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
							const point = payload[0].payload as
								| YearlyComparison
								| MonthlyComparison;
							const periodLabel = useMonthlyView
								? `Month ${"month" in point ? point.month : ""}`
								: `Year ${"year" in point ? point.year : ""}`;
							const difference = point.cumulativeRent - point.netOwnershipCost;
							return (
								<div className="border-border/50 bg-background rounded-lg border px-3 py-2 shadow-xl">
									<div className="font-medium mb-2">{periodLabel}</div>
									<div className="space-y-1.5 text-sm">
										<div className="flex items-center justify-between gap-4">
											<div className="flex items-center gap-1.5">
												<div
													className="h-2.5 w-2.5 rounded-sm shrink-0"
													style={{ backgroundColor: COLORS.cumulativeRent }}
												/>
												<span className="text-muted-foreground">Rent Paid</span>
											</div>
											<span className="font-mono">
												{formatCurrency(point.cumulativeRent)}
											</span>
										</div>
										<div className="flex items-center justify-between gap-4">
											<div className="flex items-center gap-1.5">
												<div
													className="h-2.5 w-2.5 rounded-sm shrink-0"
													style={{ backgroundColor: COLORS.netOwnershipCost }}
												/>
												<span className="text-muted-foreground">
													Net Own Cost
												</span>
											</div>
											<span className="font-mono">
												{formatCurrency(point.netOwnershipCost)}
											</span>
										</div>
										<div className="flex items-center justify-between gap-4 pt-1.5 border-t border-border/50">
											<span className="text-muted-foreground pl-4">
												Difference
											</span>
											<span
												className={`font-mono font-semibold ${difference > 0 ? "text-green-600" : "text-amber-600"}`}
											>
												{difference > 0 ? "+" : ""}
												{formatCurrency(difference)}
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
						dataKey="cumulativeRent"
						stroke="var(--color-cumulativeRent)"
						strokeWidth={2}
						dot={false}
						activeDot={{ r: 4 }}
					/>
					<Line
						type="monotone"
						dataKey="netOwnershipCost"
						stroke="var(--color-netOwnershipCost)"
						strokeWidth={2}
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
						style={{ backgroundColor: COLORS.cumulativeRent }}
					/>
					<span className="text-muted-foreground">Rent Paid</span>
				</div>
				<div className="flex items-center gap-1.5">
					<div
						className="h-2 w-2 rounded-sm"
						style={{ backgroundColor: COLORS.netOwnershipCost }}
					/>
					<span className="text-muted-foreground">Net Ownership Cost</span>
				</div>
			</div>
		</div>
	);
}
