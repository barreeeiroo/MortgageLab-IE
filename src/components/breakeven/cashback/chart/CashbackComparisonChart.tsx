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
	CashbackOptionResult,
	CashbackYearlyComparison,
} from "@/lib/mortgage/breakeven";
import { formatCurrencyShort } from "@/lib/utils/currency";
import { ChartLegend } from "../../ChartLegend";
import {
	TooltipHeader,
	TooltipMetricRow,
	TooltipSection,
	TooltipWrapper,
} from "../../ChartTooltip";

interface CashbackComparisonChartProps {
	yearlyData: CashbackYearlyComparison[];
	options: CashbackOptionResult[];
	/** Optional projection year to show beyond comparison period */
	projectionYear?: CashbackYearlyComparison | null;
}

// Colors for up to 5 options
const OPTION_COLORS = [
	"var(--primary)",
	"var(--chart-interest)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
] as const;

export function CashbackComparisonChart({
	yearlyData,
	options,
	projectionYear,
}: CashbackComparisonChartProps) {
	// Use yearly data for better visualization of long-term trends
	// Include projection year if provided
	const allYearlyData = projectionYear
		? [...yearlyData, projectionYear]
		: yearlyData;

	// End of comparison period (last year before projection)
	const comparisonEndYear =
		yearlyData.length > 0 ? yearlyData[yearlyData.length - 1].year : null;

	const chartData = allYearlyData.map((year) => {
		const dataPoint: Record<string, number | string | boolean> = {
			year: year.year,
			isProjection: projectionYear?.year === year.year,
		};
		options.forEach((_, index) => {
			dataPoint[`option${index}`] = year.netCosts[index];
		});
		return dataPoint;
	});

	// Create chart config dynamically based on number of options
	const chartConfig: ChartConfig = {};
	options.forEach((opt, index) => {
		chartConfig[`option${index}`] = {
			label: opt.label,
			color: OPTION_COLORS[index] ?? OPTION_COLORS[0],
		};
	});

	return (
		<div>
			<ChartContainer config={chartConfig} className="h-[220px] w-full">
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
						width={60}
						tickFormatter={formatCurrencyShort}
					/>
					<ChartTooltip
						content={({ active, payload }) => {
							if (!active || !payload?.length) return null;
							const dataPoint = payload[0].payload as Record<
								string,
								number | boolean
							>;
							const year = dataPoint.year as number;
							const isProjection = dataPoint.isProjection as boolean;

							return (
								<TooltipWrapper>
									<TooltipHeader isProjection={isProjection}>
										Year {year}
									</TooltipHeader>
									<TooltipSection>
										{options.map((opt, index) => {
											const value = dataPoint[`option${index}`] as number;
											return (
												<TooltipMetricRow
													key={opt.label}
													color={OPTION_COLORS[index] ?? OPTION_COLORS[0]}
													label={opt.label}
													value={value}
												/>
											);
										})}
									</TooltipSection>
								</TooltipWrapper>
							);
						}}
					/>
					{options.map((opt, index) => (
						<Line
							key={opt.label}
							type="monotone"
							dataKey={`option${index}`}
							stroke={OPTION_COLORS[index] ?? OPTION_COLORS[0]}
							strokeWidth={2}
							dot={false}
							activeDot={{ r: 4 }}
						/>
					))}
					{projectionYear && comparisonEndYear && (
						<ReferenceLine
							x={comparisonEndYear}
							stroke="var(--muted-foreground)"
							strokeDasharray="4 4"
							strokeWidth={1}
						/>
					)}
				</LineChart>
			</ChartContainer>
			<ChartLegend
				items={options.map((opt, index) => ({
					color: OPTION_COLORS[index] ?? OPTION_COLORS[0],
					label: opt.label,
				}))}
			/>
		</div>
	);
}
