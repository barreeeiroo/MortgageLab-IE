import {
	CartesianGrid,
	Line,
	LineChart,
	ReferenceLine,
	XAxis,
	YAxis,
} from "recharts";
import type { ChartConfig } from "@/components/ui/chart";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import type { RateTimeSeries } from "@/lib/schemas/rate-history";
import { SHORT_MONTH_NAMES } from "@/lib/utils/date";

// Chart configuration for rate trends
const rateTrendConfig: ChartConfig = {
	rate: {
		label: "Interest Rate",
		color: "var(--chart-interest)",
	},
	apr: {
		label: "APR",
		color: "var(--chart-principal)",
	},
};

// Colors for multiple series (when comparing multiple rates)
const SERIES_COLORS = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
];

interface RateTrendChartProps {
	/** Single rate or array of rates for comparison */
	data: RateTimeSeries | RateTimeSeries[];
	/** Show APR line alongside rate */
	showApr?: boolean;
	/** Chart height in pixels */
	height?: number;
	/** Show legend for multi-rate view */
	showLegend?: boolean;
	/** Enable animations */
	animate?: boolean;
	/** Highlight current rate with reference line */
	showCurrentRate?: boolean;
}

interface ChartDataPoint {
	timestamp: number; // Unix timestamp for sorting
	date: string; // Display date
	[key: string]: number | string; // Dynamic keys for rate values
}

/**
 * Format timestamp to display string
 */
function formatDate(timestamp: string): string {
	const date = new Date(timestamp);
	const month = SHORT_MONTH_NAMES[date.getMonth()];
	const year = date.getFullYear();
	return `${month} ${year}`;
}

/**
 * Transform time series data into chart-ready format
 */
function transformData(
	data: RateTimeSeries | RateTimeSeries[],
	showApr: boolean,
): ChartDataPoint[] {
	const seriesArray = Array.isArray(data) ? data : [data];
	const isSingleSeries = seriesArray.length === 1;

	// Collect all unique timestamps
	const timestampSet = new Set<string>();
	for (const series of seriesArray) {
		for (const point of series.dataPoints) {
			timestampSet.add(point.timestamp);
		}
	}

	// Sort timestamps chronologically
	const timestamps = Array.from(timestampSet).sort(
		(a, b) => new Date(a).getTime() - new Date(b).getTime(),
	);

	// Build data points
	const chartData: ChartDataPoint[] = timestamps.map((ts) => {
		const point: ChartDataPoint = {
			timestamp: new Date(ts).getTime(),
			date: formatDate(ts),
		};

		for (let i = 0; i < seriesArray.length; i++) {
			const series = seriesArray[i];
			const dataPoint = series.dataPoints.find((dp) => dp.timestamp === ts);

			if (isSingleSeries) {
				// For single series, use simple keys
				if (dataPoint) {
					point.rate = dataPoint.rate;
					if (showApr && dataPoint.apr !== undefined) {
						point.apr = dataPoint.apr;
					}
				}
			} else {
				// For multi-series, use indexed keys
				if (dataPoint) {
					point[`rate_${i}`] = dataPoint.rate;
					if (showApr && dataPoint.apr !== undefined) {
						point[`apr_${i}`] = dataPoint.apr;
					}
				}
			}
		}

		return point;
	});

	return chartData;
}

/**
 * Get Y-axis domain with padding
 */
function getYAxisDomain(
	data: ChartDataPoint[],
	keys: string[],
): [number, number] {
	const values: number[] = [];
	for (const point of data) {
		for (const key of keys) {
			const val = point[key];
			if (typeof val === "number") {
				values.push(val);
			}
		}
	}

	if (values.length === 0) return [0, 10];

	const min = Math.min(...values);
	const max = Math.max(...values);
	const padding = (max - min) * 0.1 || 0.5;

	return [Math.max(0, min - padding), max + padding];
}

export function RateTrendChart({
	data,
	showApr = false,
	height = 250,
	showLegend = false,
	animate = false,
	showCurrentRate = true,
}: RateTrendChartProps) {
	const seriesArray = Array.isArray(data) ? data : [data];
	const isSingleSeries = seriesArray.length === 1;
	const chartData = transformData(data, showApr);

	if (chartData.length === 0) {
		return (
			<div
				className="flex items-center justify-center text-muted-foreground text-sm"
				style={{ height }}
			>
				No historical data available
			</div>
		);
	}

	// Determine which keys to plot
	const rateKeys = isSingleSeries
		? ["rate"]
		: seriesArray.map((_, i) => `rate_${i}`);
	const aprKeys = showApr
		? isSingleSeries
			? ["apr"]
			: seriesArray.map((_, i) => `apr_${i}`)
		: [];
	const allKeys = [...rateKeys, ...aprKeys];

	const [yMin, yMax] = getYAxisDomain(chartData, allKeys);

	// Get current rate for reference line (last data point)
	const currentRate = isSingleSeries
		? seriesArray[0].dataPoints[seriesArray[0].dataPoints.length - 1]?.rate
		: undefined;

	// Build config for multi-series
	const config: ChartConfig = isSingleSeries
		? rateTrendConfig
		: Object.fromEntries(
				seriesArray.map((series, i) => [
					`rate_${i}`,
					{
						label: series.rateName,
						color: SERIES_COLORS[i % SERIES_COLORS.length],
					},
				]),
			);

	return (
		<div className="space-y-2">
			<ChartContainer
				config={config}
				className="w-full"
				style={{ height: `${height}px` }}
			>
				<LineChart
					data={chartData}
					margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
				>
					<CartesianGrid strokeDasharray="3 3" vertical={false} />
					<XAxis
						dataKey="timestamp"
						type="number"
						domain={["dataMin", "dataMax"]}
						tickLine={false}
						axisLine={false}
						tickMargin={8}
						tickFormatter={(value) => {
							const date = new Date(value);
							return `${SHORT_MONTH_NAMES[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`;
						}}
						minTickGap={40}
					/>
					<YAxis
						tickLine={false}
						axisLine={false}
						tickMargin={8}
						width={45}
						tickFormatter={(v) => `${Number(v).toFixed(1)}%`}
						domain={[yMin, yMax]}
					/>
					<ChartTooltip
						content={({ active, payload }) => {
							if (!active || !payload?.length) return null;

							const point = payload[0].payload as ChartDataPoint;

							return (
								<div className="border-border/50 bg-background rounded-lg border px-3 py-2 shadow-xl">
									<div className="font-medium mb-2">{point.date}</div>
									<div className="space-y-1">
										{isSingleSeries ? (
											<>
												{point.rate !== undefined && (
													<div className="flex items-center justify-between gap-4">
														<div className="flex items-center gap-1.5">
															<div
																className="h-2.5 w-2.5 rounded-sm shrink-0"
																style={{
																	backgroundColor: "var(--chart-interest)",
																}}
															/>
															<span className="text-muted-foreground text-sm">
																Rate
															</span>
														</div>
														<span className="font-mono font-medium text-sm">
															{Number(point.rate).toFixed(2)}%
														</span>
													</div>
												)}
												{showApr && point.apr !== undefined && (
													<div className="flex items-center justify-between gap-4">
														<div className="flex items-center gap-1.5">
															<div
																className="h-2.5 w-2.5 rounded-sm shrink-0"
																style={{
																	backgroundColor: "var(--chart-principal)",
																}}
															/>
															<span className="text-muted-foreground text-sm">
																APR
															</span>
														</div>
														<span className="font-mono font-medium text-sm">
															{Number(point.apr).toFixed(2)}%
														</span>
													</div>
												)}
											</>
										) : (
											seriesArray.map((series, i) => {
												const rateValue = point[`rate_${i}`];
												if (rateValue === undefined) return null;
												return (
													<div
														key={series.rateId}
														className="flex items-center justify-between gap-4"
													>
														<div className="flex items-center gap-1.5">
															<div
																className="h-2.5 w-2.5 rounded-sm shrink-0"
																style={{
																	backgroundColor:
																		SERIES_COLORS[i % SERIES_COLORS.length],
																}}
															/>
															<span className="text-muted-foreground text-sm truncate max-w-[150px]">
																{series.rateName}
															</span>
														</div>
														<span className="font-mono font-medium text-sm">
															{Number(rateValue).toFixed(2)}%
														</span>
													</div>
												);
											})
										)}
									</div>
								</div>
							);
						}}
					/>

					{/* Current rate reference line (single series only) */}
					{showCurrentRate && isSingleSeries && currentRate !== undefined && (
						<ReferenceLine
							y={currentRate}
							stroke="var(--muted-foreground)"
							strokeDasharray="3 3"
							strokeOpacity={0.5}
						/>
					)}

					{/* Rate lines */}
					{isSingleSeries ? (
						<>
							<Line
								type="monotone"
								dataKey="rate"
								name="rate"
								stroke="var(--chart-interest)"
								strokeWidth={2}
								dot={chartData.length <= 12}
								isAnimationActive={animate}
								animationDuration={300}
								connectNulls
							/>
							{showApr && (
								<Line
									type="monotone"
									dataKey="apr"
									name="apr"
									stroke="var(--chart-principal)"
									strokeWidth={2}
									strokeDasharray="5 5"
									dot={false}
									isAnimationActive={animate}
									animationDuration={300}
									connectNulls
								/>
							)}
						</>
					) : (
						seriesArray.map((series, i) => (
							<Line
								key={series.rateId}
								type="monotone"
								dataKey={`rate_${i}`}
								name={series.rateName}
								stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
								strokeWidth={2}
								dot={chartData.length <= 12}
								isAnimationActive={animate}
								animationDuration={300}
								connectNulls
							/>
						))
					)}
				</LineChart>
			</ChartContainer>

			{/* Legend for multi-series */}
			{showLegend && !isSingleSeries && (
				<div className="flex flex-wrap gap-x-4 gap-y-1 px-2 text-xs text-muted-foreground">
					{seriesArray.map((series, i) => (
						<div key={series.rateId} className="flex items-center gap-1.5">
							<div
								className="h-3 w-3 rounded-sm shrink-0"
								style={{
									backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length],
								}}
							/>
							<span className="truncate max-w-[120px]">{series.rateName}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
