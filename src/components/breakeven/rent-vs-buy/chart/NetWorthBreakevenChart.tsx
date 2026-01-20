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
import { formatCurrencyShort } from "@/lib/utils/currency";
import { ChartLegend } from "../../ChartLegend";
import {
	TooltipDifferenceRow,
	TooltipHeader,
	TooltipMetricRow,
	TooltipSection,
	TooltipWrapper,
} from "../../ChartTooltip";
import { formatPeriodLabel, limitChartData } from "../../chart-utils";

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
							const periodLabel = formatPeriodLabel(point, useMonthlyView);
							const difference = point.cumulativeRent - point.netOwnershipCost;
							return (
								<TooltipWrapper>
									<TooltipHeader>{periodLabel}</TooltipHeader>
									<TooltipSection>
										<TooltipMetricRow
											color={COLORS.cumulativeRent}
											label="Rent Paid"
											value={point.cumulativeRent}
										/>
										<TooltipMetricRow
											color={COLORS.netOwnershipCost}
											label="Net Own Cost"
											value={point.netOwnershipCost}
										/>
										<TooltipDifferenceRow
											label="Difference"
											value={difference}
										/>
									</TooltipSection>
								</TooltipWrapper>
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
			<ChartLegend
				items={[
					{ color: COLORS.cumulativeRent, label: "Rent Paid" },
					{ color: COLORS.netOwnershipCost, label: "Net Ownership Cost" },
				]}
			/>
		</div>
	);
}
