import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import type { PaymentBreakdownVisibility } from "@/lib/stores/simulate/simulate-chart";
import type { ChartDataPoint } from "../types";
import {
    ANIMATION_DURATION,
    CHART_COLORS,
    formatChartCurrency,
    formatChartCurrencyShort,
    paymentBreakdownConfig,
} from "./shared/chartConfig";
import { formatPeriodLabel, getXAxisConfig } from "./shared/chartUtils";

interface PaymentBreakdownChartProps {
    data: ChartDataPoint[];
    visibility: PaymentBreakdownVisibility;
    granularity: "yearly" | "quarterly" | "monthly";
    animate?: boolean;
}

export function PaymentBreakdownChart({
    data,
    visibility,
    granularity,
    animate = false,
}: PaymentBreakdownChartProps) {
    const xAxisConfig = getXAxisConfig(data, granularity);

    // Calculate the divisor for monthly average
    const monthsPerPeriod =
        granularity === "yearly" ? 12 : granularity === "quarterly" ? 3 : 1;
    const shouldAverage =
        visibility.monthlyAverage && granularity !== "monthly";

    // Transform data for monthly average view
    const chartData = useMemo(() => {
        if (!shouldAverage) return data;

        return data.map((d) => ({
            ...d,
            monthlyPrincipal: d.monthlyPrincipal / monthsPerPeriod,
            monthlyInterest: d.monthlyInterest / monthsPerPeriod,
            oneTimeOverpayment: d.oneTimeOverpayment / monthsPerPeriod,
            recurringOverpayment: d.recurringOverpayment / monthsPerPeriod,
        }));
    }, [data, shouldAverage, monthsPerPeriod]);

    return (
        <ChartContainer
            config={paymentBreakdownConfig}
            className="aspect-auto h-[300px] w-full"
        >
            <BarChart
                data={chartData}
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
                        const totalPayment =
                            dataPoint.monthlyPrincipal +
                            dataPoint.monthlyInterest +
                            dataPoint.oneTimeOverpayment +
                            dataPoint.recurringOverpayment;

                        return (
                            <div className="border-border/50 bg-background rounded-lg border px-3 py-2 shadow-xl">
                                <div className="font-medium mb-2">
                                    {label}
                                    {shouldAverage && (
                                        <span className="text-muted-foreground font-normal text-xs ml-1">
                                            (monthly avg)
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-1">
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
                                                Principal
                                            </span>
                                        </div>
                                        <span className="font-mono font-medium text-sm">
                                            {formatChartCurrency(
                                                dataPoint.monthlyPrincipal,
                                            )}
                                        </span>
                                    </div>
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
                                                Interest
                                            </span>
                                        </div>
                                        <span className="font-mono font-medium text-sm">
                                            {formatChartCurrency(
                                                dataPoint.monthlyInterest,
                                            )}
                                        </span>
                                    </div>
                                    {dataPoint.oneTimeOverpayment > 0 && (
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-1.5">
                                                <div
                                                    className="h-2.5 w-2.5 rounded-sm shrink-0"
                                                    style={{
                                                        backgroundColor:
                                                            CHART_COLORS.oneTimeOverpayment,
                                                    }}
                                                />
                                                <span className="text-muted-foreground text-sm">
                                                    One-time Overpayments
                                                </span>
                                            </div>
                                            <span className="font-mono font-medium text-sm">
                                                {formatChartCurrency(
                                                    dataPoint.oneTimeOverpayment,
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    {dataPoint.recurringOverpayment > 0 && (
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-1.5">
                                                <div
                                                    className="h-2.5 w-2.5 rounded-sm shrink-0"
                                                    style={{
                                                        backgroundColor:
                                                            CHART_COLORS.recurringOverpayment,
                                                    }}
                                                />
                                                <span className="text-muted-foreground text-sm">
                                                    Recurring Overpayments
                                                </span>
                                            </div>
                                            <span className="font-mono font-medium text-sm">
                                                {formatChartCurrency(
                                                    dataPoint.recurringOverpayment,
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    <div className="pt-1 mt-1 border-t border-border/50">
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="text-muted-foreground text-sm font-medium">
                                                {shouldAverage
                                                    ? "Monthly Total"
                                                    : "Total Payment"}
                                            </span>
                                            <span className="font-mono font-medium text-sm">
                                                {formatChartCurrency(
                                                    totalPayment,
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
                    <Bar
                        dataKey="monthlyPrincipal"
                        name="principal"
                        stackId="payment"
                        fill={CHART_COLORS.principal}
                        radius={[0, 0, 0, 0]}
                        isAnimationActive={animate}
                        animationDuration={ANIMATION_DURATION}
                    />
                )}
                {visibility.interest && (
                    <Bar
                        dataKey="monthlyInterest"
                        name="interest"
                        stackId="payment"
                        fill={CHART_COLORS.interest}
                        radius={[0, 0, 0, 0]}
                        isAnimationActive={animate}
                        animationDuration={ANIMATION_DURATION}
                    />
                )}
                {visibility.recurringOverpayment && (
                    <Bar
                        dataKey="recurringOverpayment"
                        name="recurringOverpayment"
                        stackId="payment"
                        fill={CHART_COLORS.recurringOverpayment}
                        radius={[0, 0, 0, 0]}
                        isAnimationActive={animate}
                        animationDuration={ANIMATION_DURATION}
                    />
                )}
                {visibility.oneTimeOverpayment && (
                    <Bar
                        dataKey="oneTimeOverpayment"
                        name="oneTimeOverpayment"
                        stackId="payment"
                        fill={CHART_COLORS.oneTimeOverpayment}
                        radius={[2, 2, 0, 0]}
                        isAnimationActive={animate}
                        animationDuration={ANIMATION_DURATION}
                    />
                )}
            </BarChart>
        </ChartContainer>
    );
}
