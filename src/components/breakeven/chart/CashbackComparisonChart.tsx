import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
} from "@/components/ui/chart";
import type {
	CashbackOptionResult,
	CashbackYearlyComparison,
} from "@/lib/mortgage/breakeven";
import { formatCurrency, formatCurrencyShort } from "@/lib/utils/currency";

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
								<div className="border-border/50 bg-background rounded-lg border px-3 py-2 shadow-xl">
									<div className="font-medium mb-2">
										Year {year}
										{isProjection && (
											<span className="ml-1 text-xs text-muted-foreground font-normal">
												(projection)
											</span>
										)}
									</div>
									<div className="space-y-1.5 text-sm">
										{options.map((opt, index) => {
											const value = dataPoint[`option${index}`] as number;
											return (
												<div
													key={opt.label}
													className="flex items-center justify-between gap-4"
												>
													<div className="flex items-center gap-1.5">
														<div
															className="h-2.5 w-2.5 rounded-sm shrink-0"
															style={{
																backgroundColor:
																	OPTION_COLORS[index] ?? OPTION_COLORS[0],
															}}
														/>
														<span className="text-muted-foreground">
															{opt.label}
														</span>
													</div>
													<span className="font-mono">
														{formatCurrency(value)}
													</span>
												</div>
											);
										})}
									</div>
								</div>
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
				</LineChart>
			</ChartContainer>
			{/* Legend */}
			<div className="flex flex-wrap items-center justify-center gap-4 mt-2 text-xs">
				{options.map((opt, index) => (
					<div key={opt.label} className="flex items-center gap-1.5">
						<div
							className="h-2 w-2 rounded-sm"
							style={{
								backgroundColor: OPTION_COLORS[index] ?? OPTION_COLORS[0],
							}}
						/>
						<span className="text-muted-foreground">{opt.label}</span>
					</div>
				))}
			</div>
		</div>
	);
}
