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
    RemortgageMonthlyComparison,
    RemortgageYearlyComparison,
} from "@/lib/mortgage/breakeven";
import { formatCurrencyShort } from "@/lib/utils/currency";
import { ChartLegend } from "../../ChartLegend";
import {
    TooltipDifferenceRow,
    TooltipHeader,
    TooltipMetricRow,
    TooltipSection,
    TooltipWrapper,
} from "../../ChartTooltip";
import { formatPeriodLabel, limitChartData } from "../../chart-utils";

interface SavingsBreakevenChartProps {
    data: RemortgageYearlyComparison[];
    monthlyData?: RemortgageMonthlyComparison[];
    switchingCosts: number;
    breakevenYear: number | null;
    breakevenMonth?: number | null;
}

const COLORS = {
    cumulativeSavings: "var(--primary)",
    switchingCosts: "var(--chart-interest)",
} as const;

const chartConfig = {
    cumulativeSavings: {
        label: "Cumulative Savings",
        color: COLORS.cumulativeSavings,
    },
    switchingCosts: {
        label: "Switching Costs",
        color: COLORS.switchingCosts,
    },
} satisfies ChartConfig;

export function SavingsBreakevenChart({
    data,
    monthlyData,
    switchingCosts,
    breakevenYear,
    breakevenMonth,
}: SavingsBreakevenChartProps) {
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

    // Add switching costs line to data for reference
    const chartData = limitedData.map((point) => ({
        ...point,
        switchingCostsLine: switchingCosts,
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
                                | RemortgageYearlyComparison
                                | RemortgageMonthlyComparison
                            ) & {
                                switchingCostsLine: number;
                            };
                            const periodLabel = formatPeriodLabel(
                                point,
                                useMonthlyView,
                            );
                            return (
                                <TooltipWrapper>
                                    <TooltipHeader>{periodLabel}</TooltipHeader>
                                    <TooltipSection>
                                        <TooltipMetricRow
                                            color={COLORS.cumulativeSavings}
                                            label="Cumulative Savings"
                                            value={point.cumulativeSavings}
                                        />
                                        <TooltipMetricRow
                                            color={COLORS.switchingCosts}
                                            label="Switching Costs"
                                            value={point.switchingCostsLine}
                                            dashed
                                        />
                                        <TooltipDifferenceRow
                                            label="Net Savings"
                                            value={point.netSavings}
                                        />
                                    </TooltipSection>
                                </TooltipWrapper>
                            );
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
                        dataKey="cumulativeSavings"
                        stroke="var(--color-cumulativeSavings)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="switchingCostsLine"
                        stroke="var(--color-switchingCosts)"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        activeDot={{ r: 4 }}
                    />
                </LineChart>
            </ChartContainer>
            <ChartLegend
                items={[
                    {
                        color: COLORS.cumulativeSavings,
                        label: "Cumulative Savings",
                    },
                    {
                        color: COLORS.switchingCosts,
                        label: "Switching Costs",
                        dashed: true,
                    },
                ]}
            />
        </div>
    );
}
