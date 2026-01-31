import {
    CartesianGrid,
    Line,
    LineChart,
    ReferenceArea,
    ReferenceLine,
    XAxis,
    YAxis,
} from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import type { Milestone } from "@/lib/schemas/simulate";
import type { RateTimelineVisibility } from "@/lib/stores/simulate/simulate-chart";
import type { ChartDataPoint } from "../types";
import {
    ANIMATION_DURATION,
    CHART_COLORS,
    formatPercentage,
    rateTimelineConfig,
} from "./shared/chartConfig";
import { formatPeriodLabel, getXAxisConfig } from "./shared/chartUtils";

interface RatePeriodInfo {
    id: string;
    label: string;
    startPeriod: number;
    endPeriod: number;
    rate: number;
    type: "fixed" | "variable";
}

interface RateTimelineChartProps {
    data: ChartDataPoint[];
    visibility: RateTimelineVisibility;
    granularity: "yearly" | "quarterly" | "monthly";
    animate?: boolean;
    ratePeriods: RatePeriodInfo[];
    milestones: Milestone[];
    startDate?: Date;
}

// Color palette for rate period backgrounds
const PERIOD_COLORS = [
    "rgba(59, 130, 246, 0.08)", // blue
    "rgba(168, 85, 247, 0.08)", // purple
    "rgba(34, 197, 94, 0.08)", // green
    "rgba(249, 115, 22, 0.08)", // orange
];

// Milestone icons mapping
const MILESTONE_LABELS: Record<string, string> = {
    mortgage_start: "Start",
    principal_25_percent: "25%",
    principal_50_percent: "50%",
    principal_75_percent: "75%",
    ltv_80_percent: "80% LTV",
    mortgage_complete: "Complete",
};

export function RateTimelineChart({
    data,
    visibility,
    granularity,
    animate = false,
    ratePeriods,
    milestones,
    startDate,
}: RateTimelineChartProps) {
    const xAxisConfig = getXAxisConfig(data, granularity);

    // Calculate Y-axis domain for rate with some padding
    const rates = data.map((d) => d.rate ?? 0).filter((r) => r > 0);
    const minRate = Math.max(0, Math.min(...rates) - 0.5);
    const maxRate = Math.max(...rates) + 0.5;

    // Calculate Y-axis domain for LTV
    const ltvValues = data.map((d) => d.ltv ?? 0).filter((v) => v > 0);
    const minLtv = Math.max(
        0,
        Math.floor(Math.min(...ltvValues) / 10) * 10 - 10,
    );
    const maxLtv = Math.min(
        100,
        Math.ceil(Math.max(...ltvValues) / 10) * 10 + 10,
    );

    // Map rate periods to actual chart period values
    // The startPeriod/endPeriod from props are in sequential terms (1, 2, 3...)
    // but chart data periods may be calendar years (2024, 2025...) or sequential
    // So we map using array indices since data is ordered chronologically
    const mappedRatePeriods = ratePeriods.map((period, index) => {
        // Use array indices to map rate period ranges to chart period values
        // startPeriod/endPeriod are 1-indexed, so subtract 1 for array index
        const startIdx = Math.max(0, period.startPeriod - 1);
        const endIdx = Math.min(data.length - 1, period.endPeriod - 1);

        // Get the actual chart period values from the data array
        const chartStartPeriod = data[startIdx]?.period ?? data[0]?.period ?? 1;
        const chartEndPeriod =
            data[endIdx]?.period ?? data[data.length - 1]?.period ?? 1;

        return {
            ...period,
            chartStartPeriod,
            chartEndPeriod,
            color: PERIOD_COLORS[index % PERIOD_COLORS.length],
        };
    });

    // Map milestones to their chart period positions
    // When startDate is provided, we use calendar years and need to calculate exactly
    const milestonePeriods = milestones
        .filter((m) => m.type !== "mortgage_start") // Skip start milestone
        .map((m) => {
            let periodData: ChartDataPoint | undefined;

            if (granularity === "monthly") {
                // In monthly view, find by array index (month - 1)
                const idx = Math.min(m.month - 1, data.length - 1);
                periodData = data[idx];
            } else if (granularity === "quarterly") {
                // In quarterly view, find the quarter containing this month
                const quarterIndex = Math.min(
                    Math.ceil(m.month / 3) - 1,
                    data.length - 1,
                );
                periodData = data[quarterIndex];
            } else {
                // Yearly view - check if we're using calendar years
                if (startDate) {
                    // Calculate the actual calendar year for this milestone
                    // Given startDate with month S (1-12) and year Y
                    // For milestone at month M: calendarYear = Y + floor((S - 1 + M - 1) / 12)
                    const startMonth = startDate.getMonth() + 1; // 1-12
                    const startYear = startDate.getFullYear();
                    const targetYear =
                        startYear +
                        Math.floor((startMonth - 1 + m.month - 1) / 12);

                    // Find the data point with this calendar year
                    periodData = data.find(
                        (d) =>
                            d.calendarYear === targetYear ||
                            d.period === targetYear,
                    );

                    // Fallback to last data point if milestone is after all data
                    if (
                        !periodData &&
                        targetYear >=
                            (data[data.length - 1]?.calendarYear ??
                                data[data.length - 1]?.period ??
                                0)
                    ) {
                        periodData = data[data.length - 1];
                    }
                } else {
                    // Mortgage year mode - use simple index
                    const yearIndex = Math.min(
                        Math.ceil(m.month / 12) - 1,
                        data.length - 1,
                    );
                    periodData = data[yearIndex];
                }
            }

            return {
                ...m,
                period: periodData?.period ?? 0,
                label: MILESTONE_LABELS[m.type] ?? m.label,
            };
        })
        .filter((m) => m.period > 0);

    return (
        <div className="space-y-2">
            <ChartContainer
                config={rateTimelineConfig}
                className="aspect-auto h-[300px] w-full"
            >
                <LineChart
                    data={data}
                    margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                        dataKey="period"
                        type="number"
                        domain={["dataMin", "dataMax"]}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={xAxisConfig.tickFormatter}
                        ticks={xAxisConfig.ticks}
                    />
                    {visibility.ltv && (
                        <YAxis
                            yAxisId="left"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            width={50}
                            tickFormatter={(v) => `${Math.round(Number(v))}%`}
                            domain={[minLtv, maxLtv]}
                        />
                    )}
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        width={50}
                        tickFormatter={(v) => `${Number(v).toFixed(1)}%`}
                        domain={[minRate, maxRate]}
                    />
                    <ChartTooltip
                        content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;

                            const dataPoint = payload[0]
                                .payload as ChartDataPoint;
                            const label = formatPeriodLabel(
                                dataPoint,
                                granularity,
                            );

                            return (
                                <div className="border-border/50 bg-background rounded-lg border px-3 py-2 shadow-xl">
                                    <div className="font-medium mb-2">
                                        {label}
                                    </div>
                                    <div className="space-y-1">
                                        {/* Rate - show average with indicator */}
                                        {dataPoint.rate !== undefined && (
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-1.5">
                                                    <div
                                                        className="h-2.5 w-2.5 rounded-sm shrink-0"
                                                        style={{
                                                            backgroundColor:
                                                                CHART_COLORS.rate,
                                                        }}
                                                    />
                                                    <span className="text-muted-foreground text-sm">
                                                        {dataPoint.ratesInPeriod
                                                            ? "Avg Rate"
                                                            : "Interest Rate"}
                                                    </span>
                                                </div>
                                                <span className="font-mono font-medium text-sm">
                                                    {formatPercentage(
                                                        dataPoint.rate,
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                        {/* LTV */}
                                        {dataPoint.ltv !== undefined && (
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-1.5">
                                                    <div
                                                        className="h-2.5 w-2.5 rounded-sm shrink-0"
                                                        style={{
                                                            backgroundColor:
                                                                CHART_COLORS.ltv,
                                                        }}
                                                    />
                                                    <span className="text-muted-foreground text-sm">
                                                        LTV
                                                    </span>
                                                </div>
                                                <span className="font-mono font-medium text-sm">
                                                    {formatPercentage(
                                                        dataPoint.ltv,
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                        {/* Show individual rates in muted style at bottom */}
                                        {dataPoint.ratesInPeriod && (
                                            <div className="text-xs text-muted-foreground pt-1 border-t border-border/50 space-y-0.5">
                                                {dataPoint.ratesInPeriod.map(
                                                    (rp) => (
                                                        <div
                                                            key={`${rp.label}-${rp.rate}`}
                                                        >
                                                            {rp.label}:{" "}
                                                            {formatPercentage(
                                                                rp.rate,
                                                            )}{" "}
                                                            ({rp.months}
                                                            mo)
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        }}
                    />

                    {/* Rate period background shading */}
                    {mappedRatePeriods.map((period, idx) => {
                        // Calculate x1/x2 based on position relative to other periods
                        // For contiguous coverage, each period should extend from its start to the next period's start
                        // For the last period, ensure it extends to the actual last data point
                        const nextPeriod = mappedRatePeriods[idx + 1];
                        const x1 = period.chartStartPeriod;
                        const x2 = nextPeriod
                            ? nextPeriod.chartStartPeriod
                            : (data[data.length - 1]?.period ??
                              period.chartEndPeriod);

                        return (
                            <ReferenceArea
                                key={period.id}
                                yAxisId="right"
                                x1={x1}
                                x2={x2}
                                fill={period.color}
                                fillOpacity={1}
                            />
                        );
                    })}

                    {/* Milestone reference lines */}
                    {visibility.milestones &&
                        milestonePeriods.map((milestone) => (
                            <ReferenceLine
                                key={milestone.type}
                                yAxisId="right"
                                x={milestone.period}
                                stroke={CHART_COLORS.milestone}
                                strokeDasharray="3 3"
                                label={{
                                    value: milestone.label,
                                    position: "top",
                                    fill: CHART_COLORS.milestone,
                                    fontSize: 10,
                                }}
                            />
                        ))}

                    {/* LTV line */}
                    {visibility.ltv && (
                        <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="ltv"
                            name="ltv"
                            stroke={CHART_COLORS.ltv}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={animate}
                            animationDuration={ANIMATION_DURATION}
                        />
                    )}
                    {/* Rate line */}
                    {visibility.rate && (
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="rate"
                            name="rate"
                            stroke={CHART_COLORS.rate}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={animate}
                            animationDuration={ANIMATION_DURATION}
                        />
                    )}
                </LineChart>
            </ChartContainer>

            {/* Rate period legend */}
            {mappedRatePeriods.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 px-2 text-xs text-muted-foreground">
                    {mappedRatePeriods.map((period) => (
                        <div
                            key={period.id}
                            className="flex items-center gap-1.5"
                        >
                            <div
                                className="h-3 w-3 rounded-sm shrink-0 border border-border/50"
                                style={{
                                    backgroundColor: period.color.replace(
                                        "0.08",
                                        "0.3",
                                    ),
                                }}
                            />
                            <span>{period.label}</span>
                            <span className="font-mono">
                                ({formatPercentage(period.rate)})
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
