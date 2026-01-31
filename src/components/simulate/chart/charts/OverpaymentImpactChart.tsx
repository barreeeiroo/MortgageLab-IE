import {
    Area,
    CartesianGrid,
    ComposedChart,
    Line,
    XAxis,
    YAxis,
} from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import type { OverpaymentImpactVisibility } from "@/lib/stores/simulate/simulate-chart";
import type { ChartDataPoint } from "../types";
import {
    ANIMATION_DURATION,
    CHART_COLORS,
    formatChartCurrency,
    formatChartCurrencyShort,
    overpaymentImpactConfig,
} from "./shared/chartConfig";
import { formatPeriodLabel, getXAxisConfig } from "./shared/chartUtils";

interface OverpaymentImpactChartProps {
    data: ChartDataPoint[];
    visibility: OverpaymentImpactVisibility;
    granularity: "yearly" | "quarterly" | "monthly";
    animate?: boolean;
    hasOverpayments: boolean;
}

export function OverpaymentImpactChart({
    data,
    visibility,
    granularity,
    animate = false,
    hasOverpayments,
}: OverpaymentImpactChartProps) {
    const xAxisConfig = getXAxisConfig(data, granularity);

    // If no overpayments, show a message
    if (!hasOverpayments) {
        return (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <p>Add overpayments to see their impact on your mortgage</p>
            </div>
        );
    }

    return (
        <ChartContainer
            config={overpaymentImpactConfig}
            className="aspect-auto h-[300px] w-full"
        >
            <ComposedChart
                data={data}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                    dataKey="period"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={xAxisConfig.tickFormatter}
                    ticks={xAxisConfig.ticks}
                    interval="preserveStartEnd"
                />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={60}
                    tickFormatter={formatChartCurrencyShort}
                    domain={[0, "auto"]}
                />
                <ChartTooltip
                    content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;

                        const dataPoint = payload[0].payload as ChartDataPoint;
                        const label = formatPeriodLabel(dataPoint, granularity);
                        const balanceSavings =
                            (dataPoint.baselineBalance ?? 0) -
                            dataPoint.principalRemaining;
                        const interestSavings =
                            (dataPoint.baselineCumulativeInterest ?? 0) -
                            dataPoint.cumulativeInterest;

                        return (
                            <div className="border-border/50 bg-background rounded-lg border px-3 py-2 shadow-xl">
                                <div className="font-medium mb-2">{label}</div>
                                <div className="space-y-1">
                                    {/* Balance section */}
                                    {(visibility.baseline ||
                                        visibility.actual) && (
                                        <div className="text-xs text-muted-foreground font-medium mb-1">
                                            Balance
                                        </div>
                                    )}
                                    {visibility.baseline &&
                                        dataPoint.baselineBalance !==
                                            undefined && (
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-1.5">
                                                    <div
                                                        className="h-2.5 w-2.5 rounded-sm shrink-0"
                                                        style={{
                                                            backgroundColor:
                                                                CHART_COLORS.baseline,
                                                        }}
                                                    />
                                                    <span className="text-muted-foreground text-sm">
                                                        Baseline
                                                    </span>
                                                </div>
                                                <span className="font-mono font-medium text-sm">
                                                    {formatChartCurrency(
                                                        dataPoint.baselineBalance,
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                    {visibility.actual && (
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-1.5">
                                                <div
                                                    className="h-2.5 w-2.5 rounded-sm shrink-0"
                                                    style={{
                                                        backgroundColor:
                                                            CHART_COLORS.actual,
                                                    }}
                                                />
                                                <span className="text-muted-foreground text-sm">
                                                    Actual
                                                </span>
                                            </div>
                                            <span className="font-mono font-medium text-sm">
                                                {formatChartCurrency(
                                                    dataPoint.principalRemaining,
                                                )}
                                            </span>
                                        </div>
                                    )}

                                    {/* Interest section */}
                                    {(visibility.interestBaseline ||
                                        visibility.interestActual) && (
                                        <div className="text-xs text-muted-foreground font-medium mt-2 mb-1">
                                            Cumulative Interest
                                        </div>
                                    )}
                                    {visibility.interestBaseline &&
                                        dataPoint.baselineCumulativeInterest !==
                                            undefined && (
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-1.5">
                                                    <div
                                                        className="h-2.5 w-2.5 rounded-sm shrink-0"
                                                        style={{
                                                            backgroundColor:
                                                                CHART_COLORS.interest,
                                                        }}
                                                    />
                                                    <span className="text-muted-foreground text-sm">
                                                        Baseline
                                                    </span>
                                                </div>
                                                <span className="font-mono font-medium text-sm">
                                                    {formatChartCurrency(
                                                        dataPoint.baselineCumulativeInterest,
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                    {visibility.interestActual && (
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-1.5">
                                                <div
                                                    className="h-2.5 w-2.5 rounded-sm shrink-0"
                                                    style={{
                                                        backgroundColor:
                                                            CHART_COLORS.interestSaved,
                                                    }}
                                                />
                                                <span className="text-muted-foreground text-sm">
                                                    Actual
                                                </span>
                                            </div>
                                            <span className="font-mono font-medium text-sm">
                                                {formatChartCurrency(
                                                    dataPoint.cumulativeInterest,
                                                )}
                                            </span>
                                        </div>
                                    )}

                                    {/* Savings summary */}
                                    {(balanceSavings > 0 ||
                                        interestSavings > 0) && (
                                        <div className="pt-1 mt-1 border-t border-border/50 space-y-1">
                                            {balanceSavings > 0 && (
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className="text-muted-foreground text-sm font-medium">
                                                        Balance Ahead By
                                                    </span>
                                                    <span className="font-mono font-medium text-sm text-green-600">
                                                        {formatChartCurrency(
                                                            balanceSavings,
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                            {interestSavings > 0 && (
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className="text-muted-foreground text-sm font-medium">
                                                        Interest Saved
                                                    </span>
                                                    <span className="font-mono font-medium text-sm text-green-600">
                                                        {formatChartCurrency(
                                                            interestSavings,
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    }}
                />

                {/* Balance comparison */}
                {/* Shaded area between baseline and actual */}
                {visibility.baseline && visibility.actual && (
                    <Area
                        type="monotone"
                        dataKey="baselineBalance"
                        name="savingsZone"
                        fill={CHART_COLORS.principal}
                        fillOpacity={0.1}
                        stroke="none"
                        isAnimationActive={animate}
                        animationDuration={ANIMATION_DURATION}
                    />
                )}
                {/* Baseline line (dashed) */}
                {visibility.baseline && (
                    <Line
                        type="monotone"
                        dataKey="baselineBalance"
                        name="baselineBalance"
                        stroke={CHART_COLORS.baseline}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        isAnimationActive={animate}
                        animationDuration={ANIMATION_DURATION}
                    />
                )}
                {/* Actual line (solid) */}
                {visibility.actual && (
                    <Line
                        type="monotone"
                        dataKey="principalRemaining"
                        name="actualBalance"
                        stroke={CHART_COLORS.actual}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={animate}
                        animationDuration={ANIMATION_DURATION}
                    />
                )}

                {/* Interest comparison */}
                {/* Shaded area between interest baseline and actual */}
                {visibility.interestBaseline && visibility.interestActual && (
                    <Area
                        type="monotone"
                        dataKey="baselineCumulativeInterest"
                        name="interestSavingsZone"
                        fill={CHART_COLORS.interest}
                        fillOpacity={0.1}
                        stroke="none"
                        isAnimationActive={animate}
                        animationDuration={ANIMATION_DURATION}
                    />
                )}
                {/* Interest baseline line (dashed) */}
                {visibility.interestBaseline && (
                    <Line
                        type="monotone"
                        dataKey="baselineCumulativeInterest"
                        name="interestBaseline"
                        stroke={CHART_COLORS.interest}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        isAnimationActive={animate}
                        animationDuration={ANIMATION_DURATION}
                    />
                )}
                {/* Interest actual line (solid) */}
                {visibility.interestActual && (
                    <Line
                        type="monotone"
                        dataKey="cumulativeInterest"
                        name="interestActual"
                        stroke={CHART_COLORS.interestSaved}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={animate}
                        animationDuration={ANIMATION_DURATION}
                    />
                )}
            </ComposedChart>
        </ChartContainer>
    );
}
