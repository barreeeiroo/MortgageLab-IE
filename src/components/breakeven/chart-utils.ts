interface HasMonth {
    month: number;
}

interface HasYear {
    year: number;
}

interface LimitChartDataOptions<
    TYearly extends HasYear,
    TMonthly extends HasMonth,
> {
    yearlyData: TYearly[];
    monthlyData?: TMonthly[];
    breakevenYear: number | null;
    breakevenMonth?: number | null;
}

interface LimitChartDataResult<
    TYearly extends HasYear,
    TMonthly extends HasMonth,
> {
    chartData: TYearly[] | TMonthly[];
    useMonthlyView: boolean;
    referenceLineValue: number | null;
    dataKey: "year" | "month";
}

/**
 * Limits chart data to show appropriate view based on breakeven timing.
 * - Uses monthly view if breakeven is under 2 years
 * - Limits data to 2x breakeven point for better visualization
 */
export function limitChartData<
    TYearly extends HasYear,
    TMonthly extends HasMonth,
>({
    yearlyData,
    monthlyData,
    breakevenYear,
    breakevenMonth,
}: LimitChartDataOptions<TYearly, TMonthly>): LimitChartDataResult<
    TYearly,
    TMonthly
> {
    // Use monthly view if breakeven is under 2 years
    const useMonthlyView =
        breakevenMonth !== undefined &&
        breakevenMonth !== null &&
        breakevenMonth < 24 &&
        monthlyData !== undefined &&
        monthlyData.length > 0;

    // Limit data to 2x breakeven point if breakeven exists
    const chartData = useMonthlyView
        ? breakevenMonth * 2 < monthlyData.length
            ? monthlyData.slice(0, breakevenMonth * 2 + 1)
            : monthlyData
        : breakevenYear && breakevenYear * 2 < yearlyData.length
          ? yearlyData.slice(0, breakevenYear * 2 + 1)
          : yearlyData;

    const referenceLineValue = useMonthlyView
        ? (breakevenMonth ?? null)
        : breakevenYear;

    const dataKey = useMonthlyView ? "month" : "year";

    return {
        chartData: chartData as TYearly[] | TMonthly[],
        useMonthlyView,
        referenceLineValue,
        dataKey,
    };
}

/**
 * Formats period label for chart tooltips
 */
export function formatPeriodLabel(
    dataPoint: HasYear | HasMonth,
    useMonthlyView: boolean,
): string {
    if (useMonthlyView && "month" in dataPoint) {
        return `Month ${dataPoint.month}`;
    }
    if ("year" in dataPoint) {
        return `Year ${dataPoint.year}`;
    }
    return "";
}
