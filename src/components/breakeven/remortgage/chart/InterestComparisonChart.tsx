import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
} from "@/components/ui/chart";
import type { RemortgageYearlyComparison } from "@/lib/mortgage/breakeven";
import { formatCurrencyShort } from "@/lib/utils/currency";
import { ChartLegend } from "../../ChartLegend";
import {
	TooltipDifferenceRow,
	TooltipHeader,
	TooltipMetricRow,
	TooltipSection,
	TooltipWrapper,
} from "../../ChartTooltip";

interface InterestComparisonChartProps {
	data: RemortgageYearlyComparison[];
}

const COLORS = {
	interestPaidCurrent: "var(--chart-interest)",
	interestPaidNew: "var(--primary)",
} as const;

const chartConfig = {
	interestPaidCurrent: {
		label: "Interest (Current Rate)",
		color: COLORS.interestPaidCurrent,
	},
	interestPaidNew: {
		label: "Interest (New Rate)",
		color: COLORS.interestPaidNew,
	},
} satisfies ChartConfig;

export function InterestComparisonChart({
	data,
}: InterestComparisonChartProps) {
	return (
		<div className="mt-3">
			<ChartContainer config={chartConfig} className="h-[180px] w-full">
				<LineChart
					data={data}
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
							const point = payload[0].payload as RemortgageYearlyComparison;
							return (
								<TooltipWrapper>
									<TooltipHeader>Year {point.year}</TooltipHeader>
									<TooltipSection>
										<TooltipMetricRow
											color={COLORS.interestPaidCurrent}
											label="Interest (Current)"
											value={point.interestPaidCurrent}
										/>
										<TooltipMetricRow
											color={COLORS.interestPaidNew}
											label="Interest (New)"
											value={point.interestPaidNew}
										/>
										<TooltipDifferenceRow
											label="Saved"
											value={point.interestSaved}
										/>
									</TooltipSection>
								</TooltipWrapper>
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
			<ChartLegend
				items={[
					{ color: COLORS.interestPaidCurrent, label: "Current Rate Interest" },
					{ color: COLORS.interestPaidNew, label: "New Rate Interest" },
				]}
			/>
		</div>
	);
}
