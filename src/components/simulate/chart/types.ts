/**
 * Shared types for chart components
 *
 * All currency values are stored in cents (×100) to match the internal
 * storage convention used throughout the codebase.
 */

export interface ChartDataPoint {
    // Unique identifier for the data point
    period: number;
    year: number;
    month?: number;
    quarter?: number; // 1-4 for quarterly view

    // Actual calendar date (if startDate is set)
    calendarYear?: number;
    calendarMonth?: number;
    calendarQuarter?: number; // 1-4 based on calendar

    // Balance and cumulative values (in cents)
    principalRemaining: number;
    cumulativeInterest: number;
    cumulativePrincipal: number;
    totalPaid: number;

    // Monthly payment breakdown (in cents, for stacked bars)
    monthlyPrincipal: number;
    monthlyInterest: number;
    // Overpayments split by type (in cents)
    oneTimeOverpayment: number;
    recurringOverpayment: number;

    // Baseline values (in cents, for overpayment impact chart)
    baselineBalance?: number;
    baselineCumulativeInterest?: number;

    // Rate information (for rate timeline chart)
    rate?: number;
    ratePeriodId?: string;
    ratePeriodLabel?: string;
    // All rates in this period with their duration (for tooltip)
    ratesInPeriod?: Array<{ label: string; rate: number; months: number }>;

    // LTV (Loan-to-Value) percentage
    ltv?: number;

    // Self-build fields (in cents)
    drawdownThisMonth?: number; // Amount drawn this period
    cumulativeDrawn?: number; // Total drawn so far
    phase?: "construction" | "interest_only" | "repayment";
    isInterestOnly?: boolean;
}
