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
import type { YearlyComparison } from "@/lib/mortgage/breakeven";
import { formatCurrency, formatCurrencyShort } from "@/lib/utils";

interface EquityRecoveryChartProps {
	data: YearlyComparison[];
	upfrontCosts: number;
	breakevenYear: number | null;
}

const chartConfig = {
	equity: {
		label: "Equity",
		color: "var(--primary)",
	},
} satisfies ChartConfig;

export function EquityRecoveryChart({
	data,
	upfrontCosts,
	breakevenYear,
}: EquityRecoveryChartProps) {
	return (
		<ChartContainer config={chartConfig} className="h-[180px] w-full mt-3">
			<AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
				<defs>
					<linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
						<stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
						<stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
					</linearGradient>
				</defs>
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
						const point = payload[0].payload as YearlyComparison;
						const aboveUpfront = point.equity > upfrontCosts;
						return (
							<div className="border-border/50 bg-background rounded-lg border px-3 py-2 shadow-xl">
								<div className="font-medium mb-2">Year {point.year}</div>
								<div className="space-y-1 text-sm">
									<div className="flex justify-between gap-4">
										<span className="text-muted-foreground">Home Value:</span>
										<span className="font-mono">
											{formatCurrency(point.homeValue)}
										</span>
									</div>
									<div className="flex justify-between gap-4">
										<span className="text-muted-foreground">
											Mortgage Owed:
										</span>
										<span className="font-mono">
											{formatCurrency(point.mortgageBalance)}
										</span>
									</div>
									<div className="flex justify-between gap-4 pt-1 border-t">
										<span className="text-muted-foreground">Your Equity:</span>
										<span
											className={`font-mono font-semibold ${aboveUpfront ? "text-green-600" : "text-primary"}`}
										>
											{formatCurrency(point.equity)}
										</span>
									</div>
									<div className="flex justify-between gap-4">
										<span className="text-muted-foreground">vs Upfront:</span>
										<span
											className={`font-mono text-xs ${aboveUpfront ? "text-green-600" : "text-amber-600"}`}
										>
											{aboveUpfront ? "+" : ""}
											{formatCurrency(point.equity - upfrontCosts)}
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
				{breakevenYear && (
					<ReferenceLine
						x={breakevenYear}
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
	);
}
