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
import { formatCurrency, formatCurrencyShort } from "@/lib/utils/currency";

interface SaleBreakevenChartProps {
	data: YearlyComparison[];
	monthlyData?: MonthlyComparison[];
	upfrontCosts: number;
	saleCostRate: number;
	breakevenYear: number | null;
	breakevenMonth?: number | null;
}

const COLORS = {
	homeValue: "var(--chart-principal)",
	mortgageBalance: "var(--chart-interest)",
	saleProceeds: "var(--primary)",
} as const;

const chartConfig = {
	homeValue: {
		label: "Home Value",
		color: COLORS.homeValue,
	},
	mortgageBalance: {
		label: "Mortgage Balance",
		color: COLORS.mortgageBalance,
	},
	saleProceeds: {
		label: "Sale Proceeds",
		color: COLORS.saleProceeds,
	},
} satisfies ChartConfig;

export function SaleBreakevenChart({
	data,
	monthlyData,
	upfrontCosts,
	saleCostRate,
	breakevenYear,
	breakevenMonth,
}: SaleBreakevenChartProps) {
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

	// Add sale proceeds calculation to data
	const chartData = limitedData.map((point) => ({
		...point,
		saleProceeds:
			point.homeValue -
			point.homeValue * (saleCostRate / 100) -
			point.mortgageBalance,
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
								| YearlyComparison
								| MonthlyComparison
							) & {
								saleProceeds: number;
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
													style={{ backgroundColor: COLORS.homeValue }}
												/>
												<span className="text-muted-foreground">
													Home Value
												</span>
											</div>
											<span className="font-mono">
												{formatCurrency(point.homeValue)}
											</span>
										</div>
										<div className="flex items-center justify-between gap-4">
											<div className="flex items-center gap-1.5">
												<div
													className="h-2.5 w-2.5 rounded-sm shrink-0"
													style={{ backgroundColor: COLORS.mortgageBalance }}
												/>
												<span className="text-muted-foreground">
													Mortgage Owed
												</span>
											</div>
											<span className="font-mono">
												{formatCurrency(point.mortgageBalance)}
											</span>
										</div>
										<div className="flex items-center justify-between gap-4">
											<div className="flex items-center gap-1.5">
												<div
													className="h-2.5 w-2.5 rounded-sm shrink-0"
													style={{ backgroundColor: COLORS.saleProceeds }}
												/>
												<span className="text-muted-foreground">
													Sale Proceeds
												</span>
											</div>
											<span
												className={`font-mono font-semibold ${point.saleProceeds > upfrontCosts ? "text-green-600" : "text-amber-600"}`}
											>
												{formatCurrency(point.saleProceeds)}
											</span>
										</div>
										{/* Calculation breakdown */}
										<div className="pt-1.5 border-t border-border/50 text-xs text-muted-foreground">
											<span>
												Sale proceeds = Home − {saleCostRate}% fees − Mortgage
											</span>
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
					<Line
						type="monotone"
						dataKey="homeValue"
						stroke="var(--color-homeValue)"
						strokeWidth={2}
						dot={false}
						activeDot={{ r: 4 }}
					/>
					<Line
						type="monotone"
						dataKey="mortgageBalance"
						stroke="var(--color-mortgageBalance)"
						strokeWidth={2}
						dot={false}
						activeDot={{ r: 4 }}
					/>
					<Line
						type="monotone"
						dataKey="saleProceeds"
						stroke="var(--color-saleProceeds)"
						strokeWidth={2}
						dot={false}
						activeDot={{ r: 4 }}
					/>
				</LineChart>
			</ChartContainer>
			{/* Legend */}
			<div className="flex items-center justify-center gap-4 mt-2 text-xs flex-wrap">
				<div className="flex items-center gap-1.5">
					<div
						className="h-2 w-2 rounded-sm"
						style={{ backgroundColor: COLORS.homeValue }}
					/>
					<span className="text-muted-foreground">Home Value</span>
				</div>
				<div className="flex items-center gap-1.5">
					<div
						className="h-2 w-2 rounded-sm"
						style={{ backgroundColor: COLORS.mortgageBalance }}
					/>
					<span className="text-muted-foreground">Mortgage Balance</span>
				</div>
				<div className="flex items-center gap-1.5">
					<div
						className="h-2 w-2 rounded-sm"
						style={{ backgroundColor: COLORS.saleProceeds }}
					/>
					<span className="text-muted-foreground">Sale Proceeds</span>
				</div>
			</div>
		</div>
	);
}
