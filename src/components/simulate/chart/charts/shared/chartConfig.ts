import type { ChartConfig } from "@/components/ui/chart";
import {
	formatChartCurrency as _formatChartCurrency,
	formatChartCurrencyShort as _formatChartCurrencyShort,
	CHART_ANIMATION_DURATION,
	formatChartPercentage,
} from "@/lib/utils/chart";
import { SHORT_MONTH_NAMES } from "@/lib/utils/date";

// Re-export shared constants and formatters
export const ANIMATION_DURATION = CHART_ANIMATION_DURATION;

// Chart formatters - these use the shared cents-based formatters from @/lib/utils/chart
export const formatChartCurrency = _formatChartCurrency;
export const formatChartCurrencyShort = _formatChartCurrencyShort;
export const formatPercentage = formatChartPercentage;

// Shared colors for charts
export const CHART_COLORS = {
	primary: "var(--primary)",
	balance: "var(--primary)",
	equity: "var(--chart-principal)",
	deposit: "var(--chart-2)",
	principal: "var(--chart-principal)",
	interest: "var(--chart-interest)",
	oneTimeOverpayment: "var(--chart-4)",
	recurringOverpayment: "var(--chart-5)",
	total: "var(--chart-total)",
	baseline: "var(--muted-foreground)",
	actual: "var(--primary)",
	interestSaved: "var(--chart-principal)",
	rate: "var(--chart-interest)",
	ltv: "var(--chart-principal)",
	milestone: "var(--chart-4)",
} as const;

// Shared chart configs for Recharts
export const balanceEquityConfig: ChartConfig = {
	balance: {
		label: "Balance Remaining",
		color: CHART_COLORS.balance,
	},
	equity: {
		label: "Principal Paid",
		color: CHART_COLORS.equity,
	},
	deposit: {
		label: "Deposit",
		color: CHART_COLORS.deposit,
	},
};

export const paymentBreakdownConfig: ChartConfig = {
	principal: {
		label: "Principal",
		color: CHART_COLORS.principal,
	},
	interest: {
		label: "Interest",
		color: CHART_COLORS.interest,
	},
	oneTimeOverpayment: {
		label: "One-time Overpayments",
		color: CHART_COLORS.oneTimeOverpayment,
	},
	recurringOverpayment: {
		label: "Recurring Overpayments",
		color: CHART_COLORS.recurringOverpayment,
	},
};

export const cumulativeCostsConfig: ChartConfig = {
	cumulativeInterest: {
		label: "Total Interest Paid",
		color: CHART_COLORS.interest,
	},
	cumulativePrincipal: {
		label: "Total Principal Paid",
		color: CHART_COLORS.principal,
	},
};

export const overpaymentImpactConfig: ChartConfig = {
	baselineBalance: {
		label: "Balance Baseline",
		color: CHART_COLORS.baseline,
	},
	actualBalance: {
		label: "Balance Actual",
		color: CHART_COLORS.actual,
	},
	interestBaseline: {
		label: "Interest Baseline",
		color: CHART_COLORS.interest,
	},
	interestActual: {
		label: "Interest Actual",
		color: CHART_COLORS.interestSaved,
	},
};

export const rateTimelineConfig: ChartConfig = {
	rate: {
		label: "Interest Rate",
		color: CHART_COLORS.rate,
	},
	ltv: {
		label: "Loan-to-Value",
		color: CHART_COLORS.ltv,
	},
};

// Re-export month names for formatting (used by chartUtils.tsx)
export const MONTH_NAMES = SHORT_MONTH_NAMES;
