import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import type { CompareChartDataPoint, CompareSimulationData } from "../types";
import {
    ANIMATION_DURATION,
    createCompareChartConfig,
    formatChartCurrency,
    formatChartCurrencyShort,
} from "./shared/chartConfig";

interface ComparePaymentChartProps {
    data: CompareChartDataPoint[];
    simulations: CompareSimulationData[];
    showPrincipal?: boolean;
    showRecurringOverpayment?: boolean;
    showOneTimeOverpayment?: boolean;
    showInterest?: boolean;
    monthlyAverage?: boolean;
    granularity?: "yearly" | "quarterly" | "monthly";
    animate?: boolean;
}

// Opacity values for 4-segment stacked bars
// Principal is darkest (equity building), Interest is lightest (cost)
const PRINCIPAL_OPACITY = 1;
const RECURRING_OVERPAYMENT_OPACITY = 0.75;
const ONE_TIME_OVERPAYMENT_OPACITY = 0.5;
const INTEREST_OPACITY = 0.25;

/**
 * Payment comparison chart showing stacked principal + overpayments + interest per simulation
 */
export function ComparePaymentChart({
    data,
    simulations,
    showPrincipal = true,
    showRecurringOverpayment = true,
    showOneTimeOverpayment = true,
    showInterest = true,
    monthlyAverage = false,
    granularity = "yearly",
    animate = false,
}: ComparePaymentChartProps) {
    const chartConfig = createCompareChartConfig(simulations);

    // Calculate bar width based on number of simulations
    const barWidth = Math.max(8, 40 / simulations.length);

    // Calculate the divisor for monthly average
    const monthsPerPeriod =
        granularity === "yearly" ? 12 : granularity === "quarterly" ? 3 : 1;
    const shouldAverage = monthlyAverage && granularity !== "monthly";

    // Check if there are any segments above interest
    const hasSegmentsAboveInterest =
        showPrincipal || showRecurringOverpayment || showOneTimeOverpayment;

    // Transform data for monthly average view
    const chartData = useMemo(() => {
        if (!shouldAverage) return data;

        return data.map((d) => {
            const transformed: CompareChartDataPoint = { ...d };
            for (const sim of simulations) {
                const principalKey = `${sim.id}_principalPortion`;
                const interestKey = `${sim.id}_interestPortion`;
                const recurringOpKey = `${sim.id}_recurringOverpayment`;
                const oneTimeOpKey = `${sim.id}_oneTimeOverpayment`;
                const paymentKey = `${sim.id}_payment`;

                if (d[principalKey] !== undefined) {
                    transformed[principalKey] =
                        (d[principalKey] as number) / monthsPerPeriod;
                }
                if (d[interestKey] !== undefined) {
                    transformed[interestKey] =
                        (d[interestKey] as number) / monthsPerPeriod;
                }
                if (d[recurringOpKey] !== undefined) {
                    transformed[recurringOpKey] =
                        (d[recurringOpKey] as number) / monthsPerPeriod;
                }
                if (d[oneTimeOpKey] !== undefined) {
                    transformed[oneTimeOpKey] =
                        (d[oneTimeOpKey] as number) / monthsPerPeriod;
                }
                if (d[paymentKey] !== undefined) {
                    transformed[paymentKey] =
                        (d[paymentKey] as number) / monthsPerPeriod;
                }
            }
            return transformed;
        });
    }, [data, shouldAverage, monthsPerPeriod, simulations]);

    return (
        <ChartContainer
            config={chartConfig}
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
                                    {shouldAverage && (
                                        <span className="text-muted-foreground font-normal text-xs ml-1">
                                            (monthly avg)
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {simulations.map((sim) => {
                                        const principal =
                                            dataPoint[
                                                `${sim.id}_principalPortion`
                                            ];
                                        const interest =
                                            dataPoint[
                                                `${sim.id}_interestPortion`
                                            ];
                                        const recurringOp =
                                            dataPoint[
                                                `${sim.id}_recurringOverpayment`
                                            ];
                                        const oneTimeOp =
                                            dataPoint[
                                                `${sim.id}_oneTimeOverpayment`
                                            ];
                                        const total =
                                            dataPoint[`${sim.id}_payment`];
                                        if (total === undefined) return null;

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
                                                    {showPrincipal &&
                                                        principal !==
                                                            undefined && (
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-green-600 dark:text-green-400">
                                                                    Principal
                                                                </span>
                                                                <span className="font-mono">
                                                                    {formatChartCurrency(
                                                                        principal as number,
                                                                    )}
                                                                </span>
                                                            </div>
                                                        )}
                                                    {showRecurringOverpayment &&
                                                        recurringOp !==
                                                            undefined &&
                                                        (recurringOp as number) >
                                                            0 && (
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-emerald-600 dark:text-emerald-400">
                                                                    Recurring
                                                                    Overpay
                                                                </span>
                                                                <span className="font-mono">
                                                                    {formatChartCurrency(
                                                                        recurringOp as number,
                                                                    )}
                                                                </span>
                                                            </div>
                                                        )}
                                                    {showOneTimeOverpayment &&
                                                        oneTimeOp !==
                                                            undefined &&
                                                        (oneTimeOp as number) >
                                                            0 && (
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-teal-600 dark:text-teal-400">
                                                                    One-time
                                                                    Overpay
                                                                </span>
                                                                <span className="font-mono">
                                                                    {formatChartCurrency(
                                                                        oneTimeOp as number,
                                                                    )}
                                                                </span>
                                                            </div>
                                                        )}
                                                    {showInterest &&
                                                        interest !==
                                                            undefined && (
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-red-600 dark:text-red-400">
                                                                    Interest
                                                                </span>
                                                                <span className="font-mono">
                                                                    {formatChartCurrency(
                                                                        interest as number,
                                                                    )}
                                                                </span>
                                                            </div>
                                                        )}
                                                    <div className="flex justify-between text-sm border-t pt-0.5 mt-0.5">
                                                        <span className="text-muted-foreground font-medium">
                                                            {shouldAverage
                                                                ? "Monthly Total"
                                                                : "Total"}
                                                        </span>
                                                        <span className="font-mono font-medium">
                                                            {formatChartCurrency(
                                                                total as number,
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    }}
                />
                {/* Principal bars (bottom of stack, darkest = 100%) */}
                {showPrincipal &&
                    simulations.map((sim) => (
                        <Bar
                            key={`${sim.id}_principal`}
                            dataKey={`${sim.id}_principalPortion`}
                            name={`${sim.name} Principal`}
                            fill={sim.color}
                            fillOpacity={PRINCIPAL_OPACITY}
                            stackId={sim.id}
                            radius={[0, 0, 0, 0]}
                            isAnimationActive={animate}
                            animationDuration={ANIMATION_DURATION}
                            barSize={barWidth}
                        />
                    ))}
                {/* Recurring Overpayment bars (75%) */}
                {showRecurringOverpayment &&
                    simulations.map((sim) => (
                        <Bar
                            key={`${sim.id}_recurringOp`}
                            dataKey={`${sim.id}_recurringOverpayment`}
                            name={`${sim.name} Recurring Overpay`}
                            fill={sim.color}
                            fillOpacity={RECURRING_OVERPAYMENT_OPACITY}
                            stackId={sim.id}
                            radius={[0, 0, 0, 0]}
                            isAnimationActive={animate}
                            animationDuration={ANIMATION_DURATION}
                            barSize={barWidth}
                        />
                    ))}
                {/* One-time Overpayment bars (50%) */}
                {showOneTimeOverpayment &&
                    simulations.map((sim) => (
                        <Bar
                            key={`${sim.id}_oneTimeOp`}
                            dataKey={`${sim.id}_oneTimeOverpayment`}
                            name={`${sim.name} One-time Overpay`}
                            fill={sim.color}
                            fillOpacity={ONE_TIME_OVERPAYMENT_OPACITY}
                            stackId={sim.id}
                            radius={[0, 0, 0, 0]}
                            isAnimationActive={animate}
                            animationDuration={ANIMATION_DURATION}
                            barSize={barWidth}
                        />
                    ))}
                {/* Interest bars (top of stack, lightest = 25%) */}
                {showInterest &&
                    simulations.map((sim) => (
                        <Bar
                            key={`${sim.id}_interest`}
                            dataKey={`${sim.id}_interestPortion`}
                            name={`${sim.name} Interest`}
                            fill={sim.color}
                            fillOpacity={INTEREST_OPACITY}
                            stackId={sim.id}
                            radius={
                                hasSegmentsAboveInterest
                                    ? [0, 0, 0, 0]
                                    : [4, 4, 0, 0]
                            }
                            isAnimationActive={animate}
                            animationDuration={ANIMATION_DURATION}
                            barSize={barWidth}
                        />
                    ))}
            </BarChart>
        </ChartContainer>
    );
}
