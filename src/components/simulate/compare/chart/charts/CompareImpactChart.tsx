import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import type { CompareChartDataPoint, CompareSimulationData } from "../types";
import {
    ANIMATION_DURATION,
    createCompareChartConfig,
    formatChartCurrency,
    formatChartCurrencyShort,
} from "./shared/chartConfig";

interface CompareImpactChartProps {
    data: CompareChartDataPoint[];
    simulations: CompareSimulationData[];
    showBaseline?: boolean;
    showActual?: boolean;
    animate?: boolean;
}

/**
 * Overpayment impact comparison chart showing baseline vs actual balance
 */
export function CompareImpactChart({
    data,
    simulations,
    showBaseline = true,
    showActual = true,
    animate = false,
}: CompareImpactChartProps) {
    // Filter to only show simulations with overpayments
    const simulationsWithOverpayments = simulations.filter(
        (sim) => sim.summary.interestSaved > 0 || sim.summary.monthsSaved > 0,
    );

    const chartConfig = createCompareChartConfig(simulationsWithOverpayments);

    if (simulationsWithOverpayments.length === 0) {
        return (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <div className="text-center">
                    <p className="font-medium">No overpayment impact to show</p>
                    <p className="text-sm mt-1">
                        Add overpayments to your simulations to see their impact
                    </p>
                </div>
            </div>
        );
    }

    return (
        <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[300px] w-full"
        >
            <LineChart
                data={data}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                    dataKey="period"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
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

                        const dataPoint = payload[0]
                            .payload as CompareChartDataPoint;

                        return (
                            <div className="border-border/50 bg-background rounded-lg border px-3 py-2 shadow-xl min-w-[200px]">
                                <div className="font-medium mb-2">
                                    {dataPoint.period}
                                </div>
                                <div className="space-y-2">
                                    {simulationsWithOverpayments.map((sim) => {
                                        const actual =
                                            dataPoint[`${sim.id}_balance`];
                                        const baseline =
                                            dataPoint[`${sim.id}_baseline`];
                                        if (actual === undefined) return null;

                                        const saved =
                                            baseline !== undefined
                                                ? (baseline as number) -
                                                  (actual as number)
                                                : 0;

                                        return (
                                            <div
                                                key={sim.id}
                                                className="space-y-1"
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <div
                                                        className="h-2.5 w-2.5 rounded-full shrink-0"
                                                        style={{
                                                            backgroundColor:
                                                                sim.color,
                                                        }}
                                                    />
                                                    <span className="text-sm font-medium truncate max-w-[120px]">
                                                        {sim.name}
                                                    </span>
                                                </div>
                                                <div className="pl-4 space-y-0.5">
                                                    {showBaseline &&
                                                        baseline !==
                                                            undefined && (
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-muted-foreground">
                                                                    Without
                                                                    Overpay
                                                                </span>
                                                                <span className="font-mono">
                                                                    {formatChartCurrency(
                                                                        baseline as number,
                                                                    )}
                                                                </span>
                                                            </div>
                                                        )}
                                                    {showActual && (
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-muted-foreground">
                                                                With Overpay
                                                            </span>
                                                            <span className="font-mono">
                                                                {formatChartCurrency(
                                                                    actual as number,
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {saved > 0 && (
                                                        <div className="flex justify-between text-sm border-t pt-0.5 mt-0.5">
                                                            <span className="text-green-600 dark:text-green-400 font-medium">
                                                                Ahead By
                                                            </span>
                                                            <span className="font-mono text-green-600 dark:text-green-400">
                                                                {formatChartCurrency(
                                                                    saved,
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    }}
                />
                {/* Baseline lines (dashed) */}
                {showBaseline &&
                    simulationsWithOverpayments.map((sim) => (
                        <Line
                            key={`${sim.id}_baseline`}
                            type="monotone"
                            dataKey={`${sim.id}_baseline`}
                            name={`${sim.name} Baseline`}
                            stroke={sim.color}
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                            isAnimationActive={animate}
                            animationDuration={ANIMATION_DURATION}
                            connectNulls
                        />
                    ))}
                {/* Actual balance lines (solid) */}
                {showActual &&
                    simulationsWithOverpayments.map((sim) => (
                        <Line
                            key={`${sim.id}_actual`}
                            type="monotone"
                            dataKey={`${sim.id}_balance`}
                            name={`${sim.name} Actual`}
                            stroke={sim.color}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={animate}
                            animationDuration={ANIMATION_DURATION}
                            connectNulls
                        />
                    ))}
            </LineChart>
        </ChartContainer>
    );
}
