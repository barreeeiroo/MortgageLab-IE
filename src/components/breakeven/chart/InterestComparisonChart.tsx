import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
} from "@/components/ui/chart";
import type { RemortgageYearlyComparison } from "@/lib/mortgage/breakeven";
import { formatCurrency, formatCurrencyShort } from "@/lib/utils";

interface InterestComparisonChartProps {
	data: RemortgageYearlyComparison[];
}

const chartConfig = {
	interestPaidCurrent: {
		label: "Interest (Current Rate)",
		color: "var(--chart-interest)",
	},
	interestPaidNew: {
		label: "Interest (New Rate)",
		color: "var(--primary)",
	},
} satisfies ChartConfig;

export function InterestComparisonChart({
	data,
}: InterestComparisonChartProps) {
	return (
		<ChartContainer config={chartConfig} className="h-[180px] w-full mt-3">
			<LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
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
						const point = payload[0].payload as RemortgageYearlyComparison;
						return (
							<div className="border-border/50 bg-background rounded-lg border px-3 py-2 shadow-xl">
								<div className="font-medium mb-2">Year {point.year}</div>
								<div className="space-y-1 text-sm">
									<div className="flex justify-between gap-4">
										<span className="text-muted-foreground">
											Interest (Current):
										</span>
										<span className="font-mono">
											{formatCurrency(point.interestPaidCurrent)}
										</span>
									</div>
									<div className="flex justify-between gap-4">
										<span className="text-muted-foreground">
											Interest (New):
										</span>
										<span className="font-mono">
											{formatCurrency(point.interestPaidNew)}
										</span>
									</div>
									<div className="flex justify-between gap-4 pt-1 border-t">
										<span className="text-muted-foreground">Saved:</span>
										<span
											className={`font-mono font-semibold ${point.interestSaved > 0 ? "text-green-600" : "text-amber-600"}`}
										>
											{point.interestSaved > 0 ? "+" : ""}
											{formatCurrency(point.interestSaved)}
										</span>
									</div>
								</div>
							</div>
						);
					}}
				/>
				<Line
					type="monotone"
					dataKey="interestPaidCurrent"
					stroke="var(--color-interestPaidCurrent)"
					strokeWidth={2}
					dot={false}
					activeDot={{ r: 4 }}
				/>
				<Line
					type="monotone"
					dataKey="interestPaidNew"
					stroke="var(--color-interestPaidNew)"
					strokeWidth={2}
					dot={false}
					activeDot={{ r: 4 }}
				/>
			</LineChart>
		</ChartContainer>
	);
}
