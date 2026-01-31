import type { ChartDataPoint } from "../../types";
import { MONTH_NAMES } from "./chartConfig";

export type ChartGranularity = "yearly" | "quarterly" | "monthly";

/**
 * Format a period label for display in tooltips
 */
export function formatPeriodLabel(
    dataPoint: ChartDataPoint,
    granularity: ChartGranularity,
): string {
    // Use calendar dates if available
    if (dataPoint.calendarYear !== undefined) {
        if (granularity === "yearly") {
            return `${dataPoint.calendarYear}`;
        }
        if (granularity === "quarterly") {
            return `Q${dataPoint.calendarQuarter} ${dataPoint.calendarYear}`;
        }
        const monthName = MONTH_NAMES[(dataPoint.calendarMonth ?? 1) - 1];
        return `${monthName} ${dataPoint.calendarYear}`;
    }

    // Fallback to incremental year/month/quarter
    if (granularity === "yearly") {
        return `Year ${dataPoint.year}`;
    }
    if (granularity === "quarterly") {
        return `Year ${dataPoint.year} Q${dataPoint.quarter}`;
    }
    return `Year ${dataPoint.year} Month ${dataPoint.month}`;
}

/**
 * Get X-axis configuration for the chart
 */
export function getXAxisConfig(
    data: ChartDataPoint[],
    granularity: ChartGranularity,
): {
    tickFormatter: (value: number) => string;
    ticks: number[] | undefined;
} {
    const tickFormatter = (value: number): string => {
        const dataPoint = data.find((d) => d.period === value);
        if (!dataPoint) return "";

        const hasCalendarDate = dataPoint.calendarYear !== undefined;

        if (granularity === "yearly") {
            return hasCalendarDate
                ? `${dataPoint.calendarYear}`
                : `Y${dataPoint.year}`;
        }
        if (granularity === "quarterly") {
            // Show year for Q1, nothing for other quarters to reduce clutter
            if ((dataPoint.calendarQuarter ?? dataPoint.quarter) === 1) {
                return hasCalendarDate
                    ? `${dataPoint.calendarYear}`
                    : `Y${dataPoint.year}`;
            }
            return "";
        }
        // Monthly view: format as year
        return hasCalendarDate
            ? `${dataPoint.calendarYear}`
            : `Y${dataPoint.year}`;
    };

    // Only show ticks for yearly data, Q1 in quarterly, or January months in monthly mode
    const ticks =
        granularity === "yearly"
            ? undefined // Show all ticks in yearly mode
            : granularity === "quarterly"
              ? data
                    .filter((d) => (d.calendarQuarter ?? d.quarter) === 1)
                    .map((d) => d.period)
              : data
                    .filter((d) => (d.calendarMonth ?? d.month) === 1)
                    .map((d) => d.period);

    return { tickFormatter, ticks };
}

/**
 * Create a custom dot renderer for line charts
 */
export function createDotRenderer(
    granularity: ChartGranularity,
    color: string,
) {
    return (props: {
        cx?: number;
        cy?: number;
        payload?: ChartDataPoint;
        index?: number;
    }) => {
        const { cx, cy, payload, index } = props;
        if (cx === undefined || cy === undefined || !payload) return null;

        // Show dot for yearly view, Q1 in quarterly, or January (calendarMonth 1) in monthly view
        const shouldShowDot =
            granularity === "yearly" ||
            (granularity === "quarterly" &&
                (payload.calendarQuarter ?? payload.quarter) === 1) ||
            (granularity === "monthly" &&
                (payload.calendarMonth ?? payload.month) === 1);
        if (!shouldShowDot) return null;

        return (
            <circle
                key={`dot-${index}`}
                cx={cx}
                cy={cy}
                r={3}
                fill={color}
                stroke="var(--background)"
                strokeWidth={1}
            />
        );
    };
}
