import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import type { CompareChartDataPoint, CompareSimulationData } from "../types";
import {
    ANIMATION_DURATION,
    createCompareChartConfig,
    formatChartCurrency,
    formatChartCurrencyShort,
} from "./shared/chartConfig";

interface CompareBalanceChartProps {
    data: CompareChartDataPoint[];
    simulations: CompareSimulationData[];
    showBalance?: boolean;
    showEquity?: boolean;
    animate?: boolean;
}

/**
 * Balance & Equity comparison chart showing remaining balance and equity for each simulation
 */
export function CompareBalanceChart({
    data,
    simulations,
    showBalance = true,
    showEquity = true,
    animate = false,
}: CompareBalanceChartProps) {
    const chartConfig = createCompareChartConfig(simulations);

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
                                        const balance =
                                            dataPoint[`${sim.id}_balance`];
                                        const equity =
                                            dataPoint[`${sim.id}_equity`];
                                        if (
                                            balance === undefined &&
                                            equity === undefined
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
                                                    {showBalance &&
                                                        balance !==
                                                            undefined && (
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-muted-foreground">
                                                                    Balance
                                                                </span>
                                                                <span className="font-mono">
                                                                    {formatChartCurrency(
                                                                        balance as number,
                                                                    )}
                                                                </span>
                                                            </div>
                                                        )}
                                                    {showEquity &&
                                                        equity !==
                                                            undefined && (
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-muted-foreground">
                                                                    Equity
                                                                </span>
                                                                <span className="font-mono">
                                                                    {formatChartCurrency(
                                                                        equity as number,
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
                {/* Balance lines (solid) */}
                {showBalance &&
                    simulations.map((sim) => (
                        <Line
                            key={`${sim.id}_balance`}
                            type="monotone"
                            dataKey={`${sim.id}_balance`}
                            name={`${sim.name} Balance`}
                            stroke={sim.color}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={animate}
                            animationDuration={ANIMATION_DURATION}
                            connectNulls
                        />
                    ))}
                {/* Equity lines (dashed) */}
                {showEquity &&
                    simulations.map((sim) => (
                        <Line
                            key={`${sim.id}_equity`}
                            type="monotone"
                            dataKey={`${sim.id}_equity`}
                            name={`${sim.name} Equity`}
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
