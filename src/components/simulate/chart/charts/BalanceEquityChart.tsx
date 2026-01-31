import {
    Area,
    CartesianGrid,
    ComposedChart,
    Line,
    ReferenceDot,
    XAxis,
    YAxis,
} from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import type { BalanceEquityVisibility } from "@/lib/stores/simulate/simulate-chart";
import type { ChartDataPoint } from "../types";
import {
    ANIMATION_DURATION,
    balanceEquityConfig,
    CHART_COLORS,
    formatChartCurrency,
    formatChartCurrencyShort,
} from "./shared/chartConfig";
import { formatPeriodLabel, getXAxisConfig } from "./shared/chartUtils";

interface BalanceEquityChartProps {
    data: ChartDataPoint[];
    visibility: BalanceEquityVisibility;
    granularity: "yearly" | "quarterly" | "monthly";
    animate?: boolean;
    deposit: number;
}

export function BalanceEquityChart({
    data,
    visibility,
    granularity,
    animate = false,
    deposit,
}: BalanceEquityChartProps) {
    // Add deposit to each data point for stacking
    const dataWithDeposit = data.map((d) => ({
        ...d,
        deposit,
    }));
    const xAxisConfig = getXAxisConfig(data, granularity);

    return (
        <ChartContainer
            config={balanceEquityConfig}
            className="aspect-auto h-[300px] w-full"
        >
            <ComposedChart
                data={dataWithDeposit}
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
                                    {visibility.balance && (
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-1.5">
                                                <div
                                                    className="h-2.5 w-2.5 rounded-sm shrink-0"
                                                    style={{
                                                        backgroundColor:
                                                            CHART_COLORS.balance,
                                                    }}
                                                />
                                                <span className="text-muted-foreground text-sm">
                                                    Balance Remaining
                                                </span>
                                            </div>
                                            <span className="font-mono font-medium text-sm">
                                                {formatChartCurrency(
                                                    dataPoint.principalRemaining,
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    {visibility.equity && (
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-1.5">
                                                <div
                                                    className="h-2.5 w-2.5 rounded-sm shrink-0"
                                                    style={{
                                                        backgroundColor:
                                                            CHART_COLORS.equity,
                                                    }}
                                                />
                                                <span className="text-muted-foreground text-sm">
                                                    Principal Paid
                                                </span>
                                            </div>
                                            <span className="font-mono font-medium text-sm">
                                                {formatChartCurrency(
                                                    dataPoint.cumulativePrincipal,
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    {visibility.deposit && (
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-1.5">
                                                <div
                                                    className="h-2.5 w-2.5 rounded-sm shrink-0"
                                                    style={{
                                                        backgroundColor:
                                                            CHART_COLORS.deposit,
                                                    }}
                                                />
                                                <span className="text-muted-foreground text-sm">
                                                    Deposit
                                                </span>
                                            </div>
                                            <span className="font-mono font-medium text-sm">
                                                {formatChartCurrency(deposit)}
                                            </span>
                                        </div>
                                    )}
                                    {(visibility.equity ||
                                        visibility.deposit) && (
                                        <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/50">
                                            <span className="text-muted-foreground text-sm font-medium">
                                                Total Equity
                                            </span>
                                            <span className="font-mono font-medium text-sm">
                                                {formatChartCurrency(
                                                    dataPoint.cumulativePrincipal +
                                                        deposit,
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    {/* Self-build drawdown info */}
                                    {dataPoint.drawdownThisMonth !==
                                        undefined &&
                                        dataPoint.drawdownThisMonth > 0 && (
                                            <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/50">
                                                <div className="flex items-center gap-1.5">
                                                    <div
                                                        className="h-2.5 w-2.5 rounded-full shrink-0"
                                                        style={{
                                                            backgroundColor:
                                                                "#f59e0b",
                                                        }}
                                                    />
                                                    <span className="text-muted-foreground text-sm">
                                                        Drawdown
                                                    </span>
                                                </div>
                                                <span className="font-mono font-medium text-sm">
                                                    {formatChartCurrency(
                                                        dataPoint.drawdownThisMonth,
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                    {dataPoint.isInterestOnly && (
                                        <div className="text-xs text-amber-600 mt-1">
                                            Interest-only payment
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    }}
                />
                {visibility.deposit && (
                    <Area
                        type="monotone"
                        dataKey="deposit"
                        name="deposit"
                        fill={CHART_COLORS.deposit}
                        stroke={CHART_COLORS.deposit}
                        fillOpacity={0.3}
                        strokeWidth={2}
                        stackId="equity"
                        isAnimationActive={animate}
                        animationDuration={ANIMATION_DURATION}
                    />
                )}
                {visibility.equity && (
                    <Area
                        type="monotone"
                        dataKey="cumulativePrincipal"
                        name="equity"
                        fill={CHART_COLORS.equity}
                        stroke={CHART_COLORS.equity}
                        fillOpacity={0.3}
                        strokeWidth={2}
                        stackId="equity"
                        isAnimationActive={animate}
                        animationDuration={ANIMATION_DURATION}
                    />
                )}
                {visibility.balance && (
                    <Line
                        type="monotone"
                        dataKey="principalRemaining"
                        name="balance"
                        stroke={CHART_COLORS.balance}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={animate}
                        animationDuration={ANIMATION_DURATION}
                    />
                )}
                {/* Drawdown markers for self-build mortgages */}
                {visibility.balance &&
                    data
                        .filter(
                            (d) =>
                                d.drawdownThisMonth !== undefined &&
                                d.drawdownThisMonth > 0,
                        )
                        .map((d) => (
                            <ReferenceDot
                                key={`drawdown-${d.period}`}
                                x={d.period}
                                y={d.principalRemaining}
                                r={6}
                                fill="#f59e0b"
                                stroke="#fff"
                                strokeWidth={2}
                                isFront
                            />
                        ))}
            </ComposedChart>
        </ChartContainer>
    );
}
