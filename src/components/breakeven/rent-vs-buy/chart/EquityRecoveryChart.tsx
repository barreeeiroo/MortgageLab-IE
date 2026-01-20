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
import { ChartLegend } from "../../ChartLegend";
import {
	TooltipDifferenceRow,
	TooltipHeader,
	TooltipMetricRow,
	TooltipSection,
	TooltipWrapper,
} from "../../ChartTooltip";
import { formatPeriodLabel, limitChartData } from "../../chart-utils";

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
	const { chartData, useMonthlyView, referenceLineValue, dataKey } =
		limitChartData({
			yearlyData: data,
			monthlyData,
			breakevenYear,
			breakevenMonth,
		});

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
							const periodLabel = formatPeriodLabel(point, useMonthlyView);
							const difference = point.equity - upfrontCosts;
							return (
								<TooltipWrapper>
									<TooltipHeader>{periodLabel}</TooltipHeader>
									<TooltipSection>
										<TooltipMetricRow
											color={COLORS.equity}
											label="Your Equity"
											value={point.equity}
											highlight={aboveUpfront ? "positive" : "none"}
										/>
										<TooltipDifferenceRow
											label="vs Upfront Costs"
											value={difference}
										/>
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
									</TooltipSection>
								</TooltipWrapper>
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
			<ChartLegend
				items={[
					{ color: COLORS.equity, label: "Equity Built" },
					{
						color: "var(--muted-foreground)",
						label: "Upfront Costs",
						dashed: true,
					},
				]}
			/>
		</div>
	);
}
