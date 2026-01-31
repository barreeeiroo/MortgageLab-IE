import {
    CartesianGrid,
    Line,
    LineChart,
    ReferenceLine,
    XAxis,
    YAxis,
} from "recharts";
import {
    type ChartConfig,
    ChartContainer,
    ChartTooltip,
} from "@/components/ui/chart";
import type {
    MonthlyComparison,
    YearlyComparison,
} from "@/lib/mortgage/breakeven";
import { formatCurrencyShort } from "@/lib/utils/currency";
import { ChartLegend } from "../../ChartLegend";
import {
    TooltipHeader,
    TooltipMetricRow,
    TooltipSection,
    TooltipWrapper,
} from "../../ChartTooltip";
import { formatPeriodLabel, limitChartData } from "../../chart-utils";

interface SaleBreakevenChartProps {
    data: YearlyComparison[];
    monthlyData?: MonthlyComparison[];
    upfrontCosts: number;
    saleCostRate: number;
    breakevenYear: number | null;
    breakevenMonth?: number | null;
}

const COLORS = {
    homeValue: "var(--chart-principal)",
    mortgageBalance: "var(--chart-interest)",
    saleProceeds: "var(--primary)",
} as const;

const chartConfig = {
    homeValue: {
        label: "Home Value",
        color: COLORS.homeValue,
    },
    mortgageBalance: {
        label: "Mortgage Balance",
        color: COLORS.mortgageBalance,
    },
    saleProceeds: {
        label: "Sale Proceeds",
        color: COLORS.saleProceeds,
    },
} satisfies ChartConfig;

export function SaleBreakevenChart({
    data,
    monthlyData,
    upfrontCosts,
    saleCostRate,
    breakevenYear,
    breakevenMonth,
}: SaleBreakevenChartProps) {
    const {
        chartData: limitedData,
        useMonthlyView,
        referenceLineValue,
        dataKey,
    } = limitChartData({
        yearlyData: data,
        monthlyData,
        breakevenYear,
        breakevenMonth,
    });

    // Add sale proceeds calculation to data
    const chartData = limitedData.map((point) => ({
        ...point,
        saleProceeds:
            point.homeValue -
            point.homeValue * (saleCostRate / 100) -
            point.mortgageBalance,
    }));

    return (
        <div className="mt-3">
            <ChartContainer config={chartConfig} className="h-[180px] w-full">
                <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                        dataKey={dataKey}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) =>
                            useMonthlyView ? `M${value}` : `Y${value}`
                        }
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        width={50}
                        tickFormatter={formatCurrencyShort}
                    />
                    <ChartTooltip
                        content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const point = payload[0].payload as (
                                | YearlyComparison
                                | MonthlyComparison
                            ) & {
                                saleProceeds: number;
                            };
                            const periodLabel = formatPeriodLabel(
                                point,
                                useMonthlyView,
                            );
                            const isProfitable =
                                point.saleProceeds > upfrontCosts;
                            return (
                                <TooltipWrapper>
                                    <TooltipHeader>{periodLabel}</TooltipHeader>
                                    <TooltipSection>
                                        <TooltipMetricRow
                                            color={COLORS.homeValue}
                                            label="Home Value"
                                            value={point.homeValue}
                                        />
                                        <TooltipMetricRow
                                            color={COLORS.mortgageBalance}
                                            label="Mortgage Owed"
                                            value={point.mortgageBalance}
                                        />
                                        <TooltipMetricRow
                                            color={COLORS.saleProceeds}
                                            label="Sale Proceeds"
                                            value={point.saleProceeds}
                                            highlight={
                                                isProfitable
                                                    ? "positive"
                                                    : "negative"
                                            }
                                        />
                                        {/* Calculation breakdown */}
                                        <div className="pt-1.5 border-t border-border/50 text-xs text-muted-foreground">
                                            <span>
                                                Sale proceeds = Home −{" "}
                                                {saleCostRate}% fees − Mortgage
                                            </span>
                                        </div>
                                    </TooltipSection>
                                </TooltipWrapper>
                            );
                        }}
                    />
                    {/* Reference line for upfront costs */}
                    <ReferenceLine
                        y={upfrontCosts}
                        stroke="var(--muted-foreground)"
                        strokeDasharray="4 4"
                        opacity={0.5}
                        label={{
                            value: "Upfront",
                            position: "right",
                            fill: "var(--muted-foreground)",
                            fontSize: 10,
                        }}
                    />
                    {referenceLineValue && (
                        <ReferenceLine
                            x={referenceLineValue}
                            stroke="var(--primary)"
                            strokeDasharray="4 4"
                            opacity={0.6}
                        />
                    )}
                    <Line
                        type="monotone"
                        dataKey="homeValue"
                        stroke="var(--color-homeValue)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="mortgageBalance"
                        stroke="var(--color-mortgageBalance)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="saleProceeds"
                        stroke="var(--color-saleProceeds)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                    />
                </LineChart>
            </ChartContainer>
            <ChartLegend
                items={[
                    { color: COLORS.homeValue, label: "Home Value" },
                    {
                        color: COLORS.mortgageBalance,
                        label: "Mortgage Balance",
                    },
                    { color: COLORS.saleProceeds, label: "Sale Proceeds" },
                ]}
            />
        </div>
    );
}
