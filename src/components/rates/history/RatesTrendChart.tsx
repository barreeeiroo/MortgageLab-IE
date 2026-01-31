import {
    Area,
    CartesianGrid,
    ComposedChart,
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

// Colors for Euribor reference rates (muted tones)
const EURIBOR_COLORS: Record<string, string> = {
    "euribor-1M": "var(--chart-5)",
    "euribor-3M": "var(--chart-4)",
    "euribor-6M": "var(--chart-3)",
    "euribor-12M": "var(--chart-2)",
};

export interface MarketDataPoint {
    timestamp: string;
    min: number;
    max: number;
    avg: number;
}

interface RateTrendChartProps {
    /** Single rate or array of rates for comparison */
    data: RateTimeSeries | RateTimeSeries[];
    /** Optional average series to display with primary color */
    averageSeries?: RateTimeSeries | null;
    /** Market data for market overview mode */
    marketData?: MarketDataPoint[];
    /** Display style: lines (individual rates), average (market avg only), range-band (min/max area with avg line) */
    displayStyle?: "lines" | "average" | "range-band";
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
    /** End date for the chart (defaults to today if not specified) */
    endDate?: Date | null;
    /** Euribor reference rate series to display as dashed lines */
    euriborSeries?: RateTimeSeries[];
}

interface ChartDataPoint {
    timestamp: number; // Unix timestamp for sorting
    date: string; // Display date
    [key: string]: number | string; // Dynamic keys for rate values
}

interface MarketChartDataPoint {
    timestamp: number;
    date: string;
    min: number;
    max: number;
    avg: number;
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
    averageSeries?: RateTimeSeries | null,
    forceSingleSeries?: boolean,
    endDate?: Date | null,
    euriborSeries?: RateTimeSeries[],
): ChartDataPoint[] {
    const seriesArray = Array.isArray(data) ? data : [data];
    // Use forceSingleSeries if provided, otherwise default based on array length
    const isSingleSeries = forceSingleSeries ?? seriesArray.length === 1;

    // Collect all unique timestamps (including from average series and Euribor)
    const timestampSet = new Set<string>();
    for (const series of seriesArray) {
        for (const point of series.dataPoints) {
            timestampSet.add(point.timestamp);
        }
    }
    if (averageSeries) {
        for (const point of averageSeries.dataPoints) {
            timestampSet.add(point.timestamp);
        }
    }
    if (euriborSeries) {
        for (const series of euriborSeries) {
            for (const point of series.dataPoints) {
                timestampSet.add(point.timestamp);
            }
        }
    }

    // Add end date to extend chart (today if not specified)
    const chartEndDate = endDate ?? new Date();
    timestampSet.add(chartEndDate.toISOString());

    // Sort timestamps chronologically
    const timestamps = Array.from(timestampSet).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    );

    // Build data points - carry forward last known rate for each series
    // Track last known values for each series
    const lastKnownRates: (number | null)[] = seriesArray.map(() => null);
    const lastKnownAprs: (number | null)[] = seriesArray.map(() => null);
    // Track last known Euribor values
    const lastKnownEuribor: Map<string, number | null> = new Map();
    if (euriborSeries) {
        for (const series of euriborSeries) {
            lastKnownEuribor.set(series.rateId, null);
        }
    }

    const chartData: ChartDataPoint[] = timestamps.map((ts) => {
        const tsTime = Math.floor(new Date(ts).getTime() / 1000); // seconds
        const point: ChartDataPoint = {
            timestamp: tsTime,
            date: formatDate(ts),
        };

        for (let i = 0; i < seriesArray.length; i++) {
            const series = seriesArray[i];
            // Find the most recent rate at or before this timestamp
            for (const dp of series.dataPoints) {
                const dpTime = Math.floor(
                    new Date(dp.timestamp).getTime() / 1000,
                );
                if (dpTime <= tsTime) {
                    lastKnownRates[i] = dp.rate;
                    if (dp.apr !== undefined) {
                        lastKnownAprs[i] = dp.apr;
                    }
                } else {
                    break;
                }
            }

            if (isSingleSeries) {
                // For single series, use simple keys
                if (lastKnownRates[i] !== null) {
                    point.rate = lastKnownRates[i] as number;
                    if (showApr && lastKnownAprs[i] !== null) {
                        point.apr = lastKnownAprs[i] as number;
                    }
                }
            } else {
                // For multi-series, use indexed keys
                if (lastKnownRates[i] !== null) {
                    point[`rate_${i}`] = lastKnownRates[i] as number;
                    if (showApr && lastKnownAprs[i] !== null) {
                        point[`apr_${i}`] = lastKnownAprs[i] as number;
                    }
                }
            }
        }

        // Add average data if present
        if (averageSeries) {
            const avgPoint = averageSeries.dataPoints.find(
                (dp) => dp.timestamp === ts,
            );
            if (avgPoint) {
                point.average = avgPoint.rate;
            }
        }

        // Add Euribor data if present
        if (euriborSeries) {
            for (const series of euriborSeries) {
                // Find the most recent Euribor rate at or before this timestamp
                for (const dp of series.dataPoints) {
                    const dpTime = Math.floor(
                        new Date(dp.timestamp).getTime() / 1000,
                    );
                    if (dpTime <= tsTime) {
                        lastKnownEuribor.set(series.rateId, dp.rate);
                    } else {
                        break;
                    }
                }
                const lastEuribor = lastKnownEuribor.get(series.rateId);
                if (lastEuribor !== null && lastEuribor !== undefined) {
                    point[series.rateId] = lastEuribor;
                }
            }
        }

        return point;
    });

    return chartData;
}

/**
 * Transform market data into chart-ready format
 */
function transformMarketData(
    marketData: MarketDataPoint[],
): MarketChartDataPoint[] {
    return marketData.map((point) => ({
        timestamp: Math.floor(new Date(point.timestamp).getTime() / 1000),
        date: formatDate(point.timestamp),
        min: point.min,
        max: point.max,
        avg: point.avg,
    }));
}

/**
 * Get Y-axis domain with padding
 * @param allowNegative - If true, allows negative values (for Euribor rates)
 */
function getYAxisDomain(
    data: ChartDataPoint[] | MarketChartDataPoint[],
    keys: string[],
    allowNegative = false,
): [number, number] {
    const values: number[] = [];
    for (const point of data) {
        for (const key of keys) {
            const val = point[key as keyof typeof point];
            if (typeof val === "number") {
                values.push(val);
            }
        }
    }

    if (values.length === 0) return [0, 10];

    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1 || 0.5;

    return [
        allowNegative ? min - padding : Math.max(0, min - padding),
        max + padding,
    ];
}

export function RatesTrendChart({
    data,
    averageSeries,
    marketData,
    displayStyle = "lines",
    showApr = false,
    height = 250,
    showLegend = false,
    animate = false,
    showCurrentRate = true,
    endDate,
    euriborSeries,
}: RateTrendChartProps) {
    // Market overview modes
    if (
        (displayStyle === "average" || displayStyle === "range-band") &&
        marketData &&
        marketData.length > 0
    ) {
        const hasEuribor = euriborSeries && euriborSeries.length > 0;

        // Transform market data and merge with Euribor if present
        let chartData = transformMarketData(marketData);

        // Merge Euribor data into market chart data
        if (hasEuribor) {
            // Track last known Euribor values for carry-forward
            const lastKnownEuribor: Map<string, number | null> = new Map();
            for (const series of euriborSeries) {
                lastKnownEuribor.set(series.rateId, null);
            }

            // Collect all Euribor timestamps
            const euriborTimestamps = new Set<number>();
            for (const series of euriborSeries) {
                for (const point of series.dataPoints) {
                    euriborTimestamps.add(
                        Math.floor(new Date(point.timestamp).getTime() / 1000),
                    );
                }
            }

            // Get existing timestamps from market data
            const existingTimestamps = new Set(
                chartData.map((d) => d.timestamp),
            );

            // Add missing Euribor timestamps to chart data
            for (const ts of euriborTimestamps) {
                if (!existingTimestamps.has(ts)) {
                    // Find closest market data point before this timestamp
                    let closestData: MarketChartDataPoint | null = null;
                    for (const point of chartData) {
                        if (point.timestamp <= ts) {
                            closestData = point;
                        } else {
                            break;
                        }
                    }
                    if (closestData) {
                        chartData.push({
                            timestamp: ts,
                            date: formatDate(new Date(ts * 1000).toISOString()),
                            min: closestData.min,
                            max: closestData.max,
                            avg: closestData.avg,
                        });
                    }
                }
            }

            // Re-sort by timestamp
            chartData = chartData.sort((a, b) => a.timestamp - b.timestamp);

            // Add Euribor values to each data point
            chartData = chartData.map((point) => {
                const newPoint = { ...point } as MarketChartDataPoint & {
                    [key: string]: number | string;
                };
                for (const series of euriborSeries) {
                    // Find the most recent Euribor rate at or before this timestamp
                    for (const dp of series.dataPoints) {
                        const dpTime = Math.floor(
                            new Date(dp.timestamp).getTime() / 1000,
                        );
                        if (dpTime <= point.timestamp) {
                            lastKnownEuribor.set(series.rateId, dp.rate);
                        } else {
                            break;
                        }
                    }
                    const lastEuribor = lastKnownEuribor.get(series.rateId);
                    if (lastEuribor !== null && lastEuribor !== undefined) {
                        newPoint[series.rateId] = lastEuribor;
                    }
                }
                return newPoint;
            });
        }

        const keys =
            displayStyle === "range-band" ? ["min", "max", "avg"] : ["avg"];
        const euriborKeys = hasEuribor
            ? euriborSeries.map((s) => s.rateId)
            : [];
        const [yMin, yMax] = getYAxisDomain(
            chartData,
            [...keys, ...euriborKeys],
            hasEuribor,
        );

        const marketConfig: ChartConfig = {
            avg: {
                label: "Average",
                color: "var(--primary)",
            },
            range: {
                label: "Range",
                color: "var(--primary)",
            },
            ...(hasEuribor &&
                Object.fromEntries(
                    euriborSeries.map((series) => [
                        series.rateId,
                        {
                            label: series.rateName,
                            color:
                                EURIBOR_COLORS[series.rateId] ??
                                "var(--muted-foreground)",
                        },
                    ]),
                )),
        };

        return (
            <div className="space-y-2">
                <ChartContainer
                    config={marketConfig}
                    className="w-full"
                    style={{ height: `${height}px` }}
                >
                    <ComposedChart
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
                                const date = new Date(value * 1000);
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
                            wrapperStyle={{ zIndex: 50 }}
                            content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;

                                const point = payload[0]
                                    .payload as MarketChartDataPoint & {
                                    [key: string]: number | string;
                                };

                                return (
                                    <div className="border-border/50 bg-background rounded-lg border px-3 py-2 shadow-xl">
                                        <div className="font-medium mb-2">
                                            {point.date}
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-1.5">
                                                    <div
                                                        className="h-2.5 w-2.5 rounded-sm shrink-0"
                                                        style={{
                                                            backgroundColor:
                                                                "var(--primary)",
                                                        }}
                                                    />
                                                    <span className="text-muted-foreground text-sm">
                                                        Average
                                                    </span>
                                                </div>
                                                <span className="font-mono font-medium text-sm">
                                                    {point.avg.toFixed(2)}%
                                                </span>
                                            </div>
                                            {displayStyle === "range-band" && (
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className="text-muted-foreground text-sm pl-4">
                                                        Range
                                                    </span>
                                                    <span className="font-mono text-sm text-muted-foreground">
                                                        {point.min.toFixed(2)}%
                                                        - {point.max.toFixed(2)}
                                                        %
                                                    </span>
                                                </div>
                                            )}
                                            {/* Euribor values */}
                                            {hasEuribor &&
                                                euriborSeries.map((series) => {
                                                    const euriborValue =
                                                        point[series.rateId];
                                                    if (
                                                        euriborValue ===
                                                        undefined
                                                    )
                                                        return null;
                                                    return (
                                                        <div
                                                            key={series.rateId}
                                                            className="flex items-center justify-between gap-4"
                                                        >
                                                            <div className="flex items-center gap-1.5">
                                                                <div
                                                                    className="h-2.5 w-0.5 shrink-0"
                                                                    style={{
                                                                        backgroundColor:
                                                                            EURIBOR_COLORS[
                                                                                series
                                                                                    .rateId
                                                                            ] ??
                                                                            "var(--muted-foreground)",
                                                                    }}
                                                                />
                                                                <span className="text-muted-foreground text-sm">
                                                                    {
                                                                        series.rateName
                                                                    }
                                                                </span>
                                                            </div>
                                                            <span className="font-mono text-sm text-muted-foreground">
                                                                {Number(
                                                                    euriborValue,
                                                                ).toFixed(2)}
                                                                %
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                );
                            }}
                        />

                        {/* Range band area (min to max) */}
                        {displayStyle === "range-band" && (
                            <Area
                                type="monotone"
                                dataKey="max"
                                stroke="none"
                                fill="var(--primary)"
                                fillOpacity={0.15}
                                isAnimationActive={animate}
                                animationDuration={300}
                            />
                        )}
                        {displayStyle === "range-band" && (
                            <Area
                                type="monotone"
                                dataKey="min"
                                stroke="none"
                                fill="var(--background)"
                                fillOpacity={1}
                                isAnimationActive={animate}
                                animationDuration={300}
                            />
                        )}

                        {/* Average line */}
                        <Line
                            type="monotone"
                            dataKey="avg"
                            name="Average"
                            stroke="var(--primary)"
                            strokeWidth={2.5}
                            dot={false}
                            isAnimationActive={animate}
                            animationDuration={300}
                            connectNulls
                        />

                        {/* Euribor reference lines (dashed) */}
                        {hasEuribor &&
                            euriborSeries.map((series) => (
                                <Line
                                    key={series.rateId}
                                    type="monotone"
                                    dataKey={series.rateId}
                                    name={series.rateName}
                                    stroke={
                                        EURIBOR_COLORS[series.rateId] ??
                                        "var(--muted-foreground)"
                                    }
                                    strokeWidth={1.5}
                                    strokeDasharray="4 3"
                                    dot={false}
                                    isAnimationActive={animate}
                                    animationDuration={300}
                                    connectNulls
                                />
                            ))}
                    </ComposedChart>
                </ChartContainer>

                {/* Legend for market overview */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 px-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <div
                            className="h-3 w-3 rounded-sm shrink-0"
                            style={{
                                backgroundColor: "var(--primary)",
                            }}
                        />
                        <span>Market Average</span>
                    </div>
                    {displayStyle === "range-band" && (
                        <div className="flex items-center gap-1.5">
                            <div
                                className="h-3 w-3 rounded-sm shrink-0 opacity-20"
                                style={{
                                    backgroundColor: "var(--primary)",
                                }}
                            />
                            <span>Min/Max Range</span>
                        </div>
                    )}
                    {/* Euribor legend items */}
                    {hasEuribor &&
                        euriborSeries.map((series) => (
                            <div
                                key={series.rateId}
                                className="flex items-center gap-1.5"
                            >
                                <div
                                    className="h-3 w-0.5 shrink-0"
                                    style={{
                                        backgroundColor:
                                            EURIBOR_COLORS[series.rateId] ??
                                            "var(--muted-foreground)",
                                    }}
                                />
                                <span>{series.rateName}</span>
                            </div>
                        ))}
                </div>
            </div>
        );
    }

    // Individual rates mode (existing logic)
    const seriesArray = Array.isArray(data) ? data : [data];
    // Use multi-series rendering when showLegend is true (grouped mode) even with single series
    const isSingleSeries = seriesArray.length === 1 && !showLegend;
    const hasEuribor = euriborSeries && euriborSeries.length > 0;
    const chartData = transformData(
        data,
        showApr,
        averageSeries,
        isSingleSeries,
        endDate,
        euriborSeries,
    );
    const hasAverage = averageSeries && averageSeries.dataPoints.length > 0;

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
    const averageKeys = hasAverage ? ["average"] : [];
    const euriborKeys = hasEuribor ? euriborSeries.map((s) => s.rateId) : [];
    const allKeys = [...rateKeys, ...aprKeys, ...averageKeys, ...euriborKeys];

    // Allow negative values when Euribor is displayed (pre-2022 rates were negative)
    const [yMin, yMax] = getYAxisDomain(chartData, allKeys, hasEuribor);

    // Get current rate for reference line (last data point)
    const currentRate = isSingleSeries
        ? seriesArray[0].dataPoints[seriesArray[0].dataPoints.length - 1]?.rate
        : undefined;

    // Build config for multi-series
    const config: ChartConfig = isSingleSeries
        ? rateTrendConfig
        : {
              ...Object.fromEntries(
                  seriesArray.map((series, i) => [
                      `rate_${i}`,
                      {
                          label: series.rateName,
                          color: SERIES_COLORS[i % SERIES_COLORS.length],
                      },
                  ]),
              ),
              ...(hasAverage && {
                  average: {
                      label: "Average",
                      color: "var(--primary)",
                  },
              }),
              ...(hasEuribor &&
                  Object.fromEntries(
                      euriborSeries.map((series) => [
                          series.rateId,
                          {
                              label: series.rateName,
                              color:
                                  EURIBOR_COLORS[series.rateId] ??
                                  "var(--muted-foreground)",
                          },
                      ]),
                  )),
          };

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
                            const date = new Date(value * 1000); // Convert seconds to ms
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
                        wrapperStyle={{ zIndex: 50 }}
                        content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;

                            const point = payload[0].payload as ChartDataPoint;

                            return (
                                <div className="border-border/50 bg-background rounded-lg border px-3 py-2 shadow-xl">
                                    <div className="font-medium mb-2">
                                        {point.date}
                                    </div>
                                    <div className="space-y-1">
                                        {isSingleSeries ? (
                                            <>
                                                {point.rate !== undefined && (
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-1.5">
                                                            <div
                                                                className="h-2.5 w-2.5 rounded-sm shrink-0"
                                                                style={{
                                                                    backgroundColor:
                                                                        "var(--chart-interest)",
                                                                }}
                                                            />
                                                            <span className="text-muted-foreground text-sm">
                                                                Rate
                                                            </span>
                                                        </div>
                                                        <span className="font-mono font-medium text-sm">
                                                            {Number(
                                                                point.rate,
                                                            ).toFixed(2)}
                                                            %
                                                        </span>
                                                    </div>
                                                )}
                                                {showApr &&
                                                    point.apr !== undefined && (
                                                        <div className="flex items-center justify-between gap-4">
                                                            <div className="flex items-center gap-1.5">
                                                                <div
                                                                    className="h-2.5 w-2.5 rounded-sm shrink-0"
                                                                    style={{
                                                                        backgroundColor:
                                                                            "var(--chart-principal)",
                                                                    }}
                                                                />
                                                                <span className="text-muted-foreground text-sm">
                                                                    APR
                                                                </span>
                                                            </div>
                                                            <span className="font-mono font-medium text-sm">
                                                                {Number(
                                                                    point.apr,
                                                                ).toFixed(2)}
                                                                %
                                                            </span>
                                                        </div>
                                                    )}
                                                {/* Euribor values */}
                                                {hasEuribor &&
                                                    euriborSeries.map(
                                                        (series) => {
                                                            const euriborValue =
                                                                point[
                                                                    series
                                                                        .rateId
                                                                ];
                                                            if (
                                                                euriborValue ===
                                                                undefined
                                                            )
                                                                return null;
                                                            return (
                                                                <div
                                                                    key={
                                                                        series.rateId
                                                                    }
                                                                    className="flex items-center justify-between gap-4"
                                                                >
                                                                    <div className="flex items-center gap-1.5">
                                                                        <div
                                                                            className="h-2.5 w-0.5 shrink-0"
                                                                            style={{
                                                                                backgroundColor:
                                                                                    EURIBOR_COLORS[
                                                                                        series
                                                                                            .rateId
                                                                                    ] ??
                                                                                    "var(--muted-foreground)",
                                                                            }}
                                                                        />
                                                                        <span className="text-muted-foreground text-sm">
                                                                            {
                                                                                series.rateName
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                    <span className="font-mono text-sm text-muted-foreground">
                                                                        {Number(
                                                                            euriborValue,
                                                                        ).toFixed(
                                                                            2,
                                                                        )}
                                                                        %
                                                                    </span>
                                                                </div>
                                                            );
                                                        },
                                                    )}
                                            </>
                                        ) : (
                                            <>
                                                {/* Average value first */}
                                                {point.average !==
                                                    undefined && (
                                                    <div className="flex items-center justify-between gap-4 font-medium">
                                                        <div className="flex items-center gap-1.5">
                                                            <div
                                                                className="h-2.5 w-2.5 rounded-sm shrink-0"
                                                                style={{
                                                                    backgroundColor:
                                                                        "var(--primary)",
                                                                }}
                                                            />
                                                            <span className="text-sm">
                                                                Average
                                                            </span>
                                                        </div>
                                                        <span className="font-mono font-medium text-sm">
                                                            {Number(
                                                                point.average,
                                                            ).toFixed(2)}
                                                            %
                                                        </span>
                                                    </div>
                                                )}
                                                {seriesArray.map(
                                                    (series, i) => {
                                                        const rateValue =
                                                            point[`rate_${i}`];
                                                        if (
                                                            rateValue ===
                                                            undefined
                                                        )
                                                            return null;
                                                        return (
                                                            <div
                                                                key={
                                                                    series.rateId
                                                                }
                                                                className="flex items-center justify-between gap-4"
                                                            >
                                                                <div className="flex items-center gap-1.5">
                                                                    <div
                                                                        className="h-2.5 w-2.5 rounded-sm shrink-0 opacity-60"
                                                                        style={{
                                                                            backgroundColor:
                                                                                SERIES_COLORS[
                                                                                    i %
                                                                                        SERIES_COLORS.length
                                                                                ],
                                                                        }}
                                                                    />
                                                                    <span className="text-muted-foreground text-sm truncate max-w-[150px]">
                                                                        {
                                                                            series.rateName
                                                                        }
                                                                    </span>
                                                                </div>
                                                                <span className="font-mono font-medium text-sm">
                                                                    {Number(
                                                                        rateValue,
                                                                    ).toFixed(
                                                                        2,
                                                                    )}
                                                                    %
                                                                </span>
                                                            </div>
                                                        );
                                                    },
                                                )}
                                                {/* Euribor values */}
                                                {hasEuribor &&
                                                    euriborSeries.map(
                                                        (series) => {
                                                            const euriborValue =
                                                                point[
                                                                    series
                                                                        .rateId
                                                                ];
                                                            if (
                                                                euriborValue ===
                                                                undefined
                                                            )
                                                                return null;
                                                            return (
                                                                <div
                                                                    key={
                                                                        series.rateId
                                                                    }
                                                                    className="flex items-center justify-between gap-4"
                                                                >
                                                                    <div className="flex items-center gap-1.5">
                                                                        <div
                                                                            className="h-2.5 w-0.5 shrink-0"
                                                                            style={{
                                                                                backgroundColor:
                                                                                    EURIBOR_COLORS[
                                                                                        series
                                                                                            .rateId
                                                                                    ] ??
                                                                                    "var(--muted-foreground)",
                                                                            }}
                                                                        />
                                                                        <span className="text-muted-foreground text-sm">
                                                                            {
                                                                                series.rateName
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                    <span className="font-mono text-sm text-muted-foreground">
                                                                        {Number(
                                                                            euriborValue,
                                                                        ).toFixed(
                                                                            2,
                                                                        )}
                                                                        %
                                                                    </span>
                                                                </div>
                                                            );
                                                        },
                                                    )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        }}
                    />

                    {/* Current rate reference line (single series only) */}
                    {showCurrentRate &&
                        isSingleSeries &&
                        currentRate !== undefined && (
                            <ReferenceLine
                                y={currentRate}
                                stroke="var(--muted-foreground)"
                                strokeDasharray="3 3"
                                strokeOpacity={0.5}
                            />
                        )}

                    {/* Rate lines */}
                    {isSingleSeries
                        ? [
                              <Line
                                  key="rate"
                                  type="stepAfter"
                                  dataKey="rate"
                                  name="rate"
                                  stroke="var(--chart-interest)"
                                  strokeWidth={2}
                                  dot={chartData.length <= 12}
                                  isAnimationActive={animate}
                                  animationDuration={300}
                                  connectNulls
                              />,
                              showApr ? (
                                  <Line
                                      key="apr"
                                      type="stepAfter"
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
                              ) : null,
                          ]
                        : [
                              ...seriesArray.map((series, i) => (
                                  <Line
                                      key={series.rateId}
                                      type={
                                          hasAverage ? "stepAfter" : "monotone"
                                      }
                                      dataKey={`rate_${i}`}
                                      name={series.rateName}
                                      stroke={
                                          SERIES_COLORS[
                                              i % SERIES_COLORS.length
                                          ]
                                      }
                                      strokeWidth={1.5}
                                      strokeOpacity={0.6}
                                      dot={false}
                                      isAnimationActive={animate}
                                      animationDuration={300}
                                      connectNulls
                                  />
                              )),
                              // Average line - rendered last to be on top
                              hasAverage ? (
                                  <Line
                                      key="average"
                                      type="stepAfter"
                                      dataKey="average"
                                      name="Average"
                                      stroke="var(--primary)"
                                      strokeWidth={2.5}
                                      dot={false}
                                      isAnimationActive={animate}
                                      animationDuration={300}
                                      connectNulls
                                  />
                              ) : null,
                          ]}

                    {/* Euribor reference lines (dashed) */}
                    {hasEuribor &&
                        euriborSeries.map((series) => (
                            <Line
                                key={series.rateId}
                                type="monotone"
                                dataKey={series.rateId}
                                name={series.rateName}
                                stroke={
                                    EURIBOR_COLORS[series.rateId] ??
                                    "var(--muted-foreground)"
                                }
                                strokeWidth={1.5}
                                strokeDasharray="4 3"
                                dot={false}
                                isAnimationActive={animate}
                                animationDuration={300}
                                connectNulls
                            />
                        ))}
                </LineChart>
            </ChartContainer>

            {/* Legend for multi-series */}
            {(showLegend && !isSingleSeries) || hasEuribor ? (
                <div className="flex flex-wrap gap-x-4 gap-y-1 px-2 text-xs text-muted-foreground">
                    {/* Average legend item first (multi-series only) */}
                    {hasAverage && !isSingleSeries && (
                        <div className="flex items-center gap-1.5 font-medium">
                            <div
                                className="h-3 w-3 rounded-sm shrink-0"
                                style={{
                                    backgroundColor: "var(--primary)",
                                }}
                            />
                            <span>Average</span>
                        </div>
                    )}
                    {/* Rate legend items (multi-series only) */}
                    {!isSingleSeries &&
                        seriesArray.map((series, i) => (
                            <div
                                key={series.rateId}
                                className="flex items-center gap-1.5"
                            >
                                <div
                                    className="h-3 w-3 rounded-sm shrink-0 opacity-60"
                                    style={{
                                        backgroundColor:
                                            SERIES_COLORS[
                                                i % SERIES_COLORS.length
                                            ],
                                    }}
                                />
                                <span className="truncate max-w-[120px]">
                                    {series.rateName}
                                </span>
                            </div>
                        ))}
                    {/* Euribor legend items */}
                    {hasEuribor &&
                        euriborSeries.map((series) => (
                            <div
                                key={series.rateId}
                                className="flex items-center gap-1.5"
                            >
                                <div
                                    className="h-3 w-0.5 shrink-0"
                                    style={{
                                        backgroundColor:
                                            EURIBOR_COLORS[series.rateId] ??
                                            "var(--muted-foreground)",
                                    }}
                                />
                                <span>{series.rateName}</span>
                            </div>
                        ))}
                </div>
            ) : null}
        </div>
    );
}
