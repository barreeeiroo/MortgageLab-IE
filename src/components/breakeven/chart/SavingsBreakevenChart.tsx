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
import type { RemortgageYearlyComparison } from "@/lib/mortgage/breakeven";
import { formatCurrency, formatCurrencyShort } from "@/lib/utils";

interface SavingsBreakevenChartProps {
	data: RemortgageYearlyComparison[];
	switchingCosts: number;
	breakevenYear: number | null;
}

const chartConfig = {
	cumulativeSavings: {
		label: "Cumulative Savings",
		color: "var(--primary)",
	},
	switchingCosts: {
		label: "Switching Costs",
		color: "var(--chart-interest)",
	},
} satisfies ChartConfig;

export function SavingsBreakevenChart({
	data,
	switchingCosts,
	breakevenYear,
}: SavingsBreakevenChartProps) {
	// Add switching costs line to data for reference
	const chartData = data.map((point) => ({
		...point,
		switchingCostsLine: switchingCosts,
	}));

	return (
		<ChartContainer config={chartConfig} className="h-[180px] w-full mt-3">
			<LineChart
				data={chartData}
				margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
			>
				<CartesianGrid strokeDasharray="3 3" vertical={false} />
				<XAxis
					dataKey="year"
					tickLine={false}
					axisLine={false}
					tickMargin={8}
					tickFormatter={(value) => `Y${value}`}
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
						const point = payload[0].payload as RemortgageYearlyComparison & {
							switchingCostsLine: number;
						};
						return (
							<div className="border-border/50 bg-background rounded-lg border px-3 py-2 shadow-xl">
								<div className="font-medium mb-2">Year {point.year}</div>
								<div className="space-y-1 text-sm">
									<div className="flex justify-between gap-4">
										<span className="text-muted-foreground">
											Cumulative Savings:
										</span>
										<span className="font-mono">
											{formatCurrency(point.cumulativeSavings)}
										</span>
									</div>
									<div className="flex justify-between gap-4">
										<span className="text-muted-foreground">
											Switching Costs:
										</span>
										<span className="font-mono">
											{formatCurrency(point.switchingCostsLine)}
										</span>
									</div>
									<div className="flex justify-between gap-4 pt-1 border-t">
										<span className="text-muted-foreground">Net Savings:</span>
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
				{breakevenYear && (
					<ReferenceLine
						x={breakevenYear}
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
	);
}
