import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import type { CompareChartDataPoint, CompareSimulationData } from "../types";
import {
    ANIMATION_DURATION,
    createCompareChartConfig,
    formatChartCurrency,
    formatChartCurrencyShort,
} from "./shared/chartConfig";

interface CompareCumulativeChartProps {
    data: CompareChartDataPoint[];
    simulations: CompareSimulationData[];
    showPrincipal?: boolean;
    showInterest?: boolean;
    stacked?: boolean;
    animate?: boolean;
}

/**
 * Cumulative costs comparison chart showing interest and principal paid over time
 * Uses solid lines for principal and dashed lines for interest
 */
export function CompareCumulativeChart({
    data,
    simulations,
    showPrincipal = true,
    showInterest = true,
    stacked = false,
    animate = false,
}: CompareCumulativeChartProps) {
    const chartConfig = createCompareChartConfig(simulations);

    // When stacked, interest line shows total (principal + interest)
    // When not stacked, interest line shows just interest
    const getInterestDataKey = (simId: string) =>
        stacked ? `${simId}_total` : `${simId}_interest`;

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
                                    {simulations.map((sim) => {
                                        const interest =
                                            dataPoint[`${sim.id}_interest`];
                                        const principal =
                                            dataPoint[`${sim.id}_principal`];
                                        const total =
                                            dataPoint[`${sim.id}_total`];
                                        if (
                                            interest === undefined &&
                                            principal === undefined
                                        )
                                            return null;

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
                                                    {principal !==
                                                        undefined && (
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-muted-foreground">
                                                                Principal
                                                            </span>
                                                            <span className="font-mono">
                                                                {formatChartCurrency(
                                                                    principal as number,
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {interest !== undefined && (
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-muted-foreground">
                                                                Interest
                                                            </span>
                                                            <span className="font-mono">
                                                                {formatChartCurrency(
                                                                    interest as number,
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {total !== undefined && (
                                                        <div className="flex justify-between text-sm border-t pt-0.5 mt-0.5">
                                                            <span className="text-muted-foreground font-medium">
                                                                Total
                                                            </span>
                                                            <span className="font-mono font-medium">
                                                                {formatChartCurrency(
                                                                    total as number,
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
                {/* Principal lines (solid) */}
                {showPrincipal &&
                    simulations.map((sim) => (
                        <Line
                            key={`${sim.id}_principal`}
                            type="monotone"
                            dataKey={`${sim.id}_principal`}
                            name={`${sim.name} Principal`}
                            stroke={sim.color}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={animate}
                            animationDuration={ANIMATION_DURATION}
                            connectNulls
                        />
                    ))}
                {/* Interest lines (dashed) - shows total when stacked */}
                {showInterest &&
                    simulations.map((sim) => (
                        <Line
                            key={`${sim.id}_interest`}
                            type="monotone"
                            dataKey={getInterestDataKey(sim.id)}
                            name={
                                stacked
                                    ? `${sim.name} Total`
                                    : `${sim.name} Interest`
                            }
                            stroke={sim.color}
                            strokeWidth={2}
                            strokeDasharray="5 5"
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
