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
import type { YearlyComparison } from "@/lib/mortgage/breakeven";
import { formatCurrency, formatCurrencyShort } from "@/lib/utils";

interface SaleBreakevenChartProps {
	data: YearlyComparison[];
	upfrontCosts: number;
	saleCostRate: number;
	breakevenYear: number | null;
}

const chartConfig = {
	homeValue: {
		label: "Home Value",
		color: "var(--chart-principal)",
	},
	mortgageBalance: {
		label: "Mortgage Balance",
		color: "var(--chart-interest)",
	},
	saleProceeds: {
		label: "Sale Proceeds",
		color: "var(--primary)",
	},
} satisfies ChartConfig;

export function SaleBreakevenChart({
	data,
	upfrontCosts,
	saleCostRate,
	breakevenYear,
}: SaleBreakevenChartProps) {
	// Add sale proceeds calculation to data
	const chartData = data.map((point) => ({
		...point,
		saleProceeds:
			point.homeValue -
			point.homeValue * (saleCostRate / 100) -
			point.mortgageBalance,
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
						const point = payload[0].payload as YearlyComparison & {
							saleProceeds: number;
						};
						const saleCosts = point.homeValue * (saleCostRate / 100);
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
										<span className="text-muted-foreground">Sale Costs:</span>
										<span className="font-mono text-amber-600">
											-{formatCurrency(saleCosts)}
										</span>
									</div>
									<div className="flex justify-between gap-4">
										<span className="text-muted-foreground">
											Mortgage Owed:
										</span>
										<span className="font-mono text-amber-600">
											-{formatCurrency(point.mortgageBalance)}
										</span>
									</div>
									<div className="flex justify-between gap-4 pt-1 border-t">
										<span className="text-muted-foreground">You'd Keep:</span>
										<span
											className={`font-mono font-semibold ${point.saleProceeds > upfrontCosts ? "text-green-600" : "text-amber-600"}`}
										>
											{formatCurrency(point.saleProceeds)}
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
	);
}
