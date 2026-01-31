import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import type { CumulativeCostsVisibility } from "@/lib/stores/simulate/simulate-chart";
import type { ChartDataPoint } from "../types";
import {
    ANIMATION_DURATION,
    CHART_COLORS,
    cumulativeCostsConfig,
    formatChartCurrency,
    formatChartCurrencyShort,
} from "./shared/chartConfig";
import { formatPeriodLabel, getXAxisConfig } from "./shared/chartUtils";

interface CumulativeCostsChartProps {
    data: ChartDataPoint[];
    visibility: CumulativeCostsVisibility;
    granularity: "yearly" | "quarterly" | "monthly";
    animate?: boolean;
}

export function CumulativeCostsChart({
    data,
    visibility,
    granularity,
    animate = false,
}: CumulativeCostsChartProps) {
    const xAxisConfig = getXAxisConfig(data, granularity);
    const stackId = visibility.stacked ? "costs" : undefined;

    return (
        <ChartContainer
            config={cumulativeCostsConfig}
            className="aspect-auto h-[300px] w-full"
        >
            <AreaChart
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

                        return (
                            <div className="border-border/50 bg-background rounded-lg border px-3 py-2 shadow-xl">
                                <div className="font-medium mb-2">{label}</div>
                                <div className="space-y-1">
                                    {visibility.interest && (
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
                                                    Total Interest Paid
                                                </span>
                                            </div>
                                            <span className="font-mono font-medium text-sm">
                                                {formatChartCurrency(
                                                    dataPoint.cumulativeInterest,
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    {visibility.principal && (
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-1.5">
                                                <div
                                                    className="h-2.5 w-2.5 rounded-sm shrink-0"
                                                    style={{
                                                        backgroundColor:
                                                            CHART_COLORS.principal,
                                                    }}
                                                />
                                                <span className="text-muted-foreground text-sm">
                                                    Total Principal Paid
                                                </span>
                                            </div>
                                            <span className="font-mono font-medium text-sm">
                                                {formatChartCurrency(
                                                    dataPoint.cumulativePrincipal,
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    <div className="pt-1 mt-1 border-t border-border/50">
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="text-muted-foreground text-sm font-medium">
                                                Total Paid
                                            </span>
                                            <span className="font-mono font-medium text-sm">
                                                {formatChartCurrency(
                                                    dataPoint.totalPaid,
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }}
                />
                {visibility.principal && (
                    <Area
                        type="monotone"
                        dataKey="cumulativePrincipal"
                        name="cumulativePrincipal"
                        fill={CHART_COLORS.principal}
                        stroke={CHART_COLORS.principal}
                        fillOpacity={0.3}
                        strokeWidth={2}
                        stackId={stackId}
                        isAnimationActive={animate}
                        animationDuration={ANIMATION_DURATION}
                    />
                )}
                {visibility.interest && (
                    <Area
                        type="monotone"
                        dataKey="cumulativeInterest"
                        name="cumulativeInterest"
                        fill={CHART_COLORS.interest}
                        stroke={CHART_COLORS.interest}
                        fillOpacity={0.3}
                        strokeWidth={2}
                        stackId={stackId}
                        isAnimationActive={animate}
                        animationDuration={ANIMATION_DURATION}
                    />
                )}
            </AreaChart>
        </ChartContainer>
    );
}
