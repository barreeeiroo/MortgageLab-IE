import { atom } from "nanostores";
import { loadFromStorage, saveToStorage } from "@/lib/storage/helpers";

const STORAGE_KEY = "simulate-chart";

export type ChartGranularity = "monthly" | "quarterly" | "yearly";

export type ChartType =
    | "balance_equity"
    | "payment_breakdown"
    | "cumulative_costs"
    | "overpayment_impact"
    | "rate_timeline";

// Per-chart visibility settings
export interface BalanceEquityVisibility {
    balance: boolean;
    equity: boolean;
    deposit: boolean;
}

export interface PaymentBreakdownVisibility {
    principal: boolean;
    interest: boolean;
    oneTimeOverpayment: boolean;
    recurringOverpayment: boolean;
    monthlyAverage: boolean;
}

export interface CumulativeCostsVisibility {
    interest: boolean;
    principal: boolean;
    stacked: boolean;
}

export interface OverpaymentImpactVisibility {
    baseline: boolean;
    actual: boolean;
    interestBaseline: boolean;
    interestActual: boolean;
}

export interface RateTimelineVisibility {
    rate: boolean;
    ltv: boolean;
    milestones: boolean;
}

export interface ChartVisibilitySettings {
    balance_equity: BalanceEquityVisibility;
    payment_breakdown: PaymentBreakdownVisibility;
    cumulative_costs: CumulativeCostsVisibility;
    overpayment_impact: OverpaymentImpactVisibility;
    rate_timeline: RateTimelineVisibility;
}

export interface ChartSettings {
    granularity: ChartGranularity;
    activeChart: ChartType;
    visibility: ChartVisibilitySettings;
}

// Chart labels for UI
export const CHART_LABELS: Record<ChartType, string> = {
    balance_equity: "Balance & Equity",
    payment_breakdown: "Payments",
    cumulative_costs: "Cumulative Costs",
    overpayment_impact: "Overpayment Impact",
    rate_timeline: "Rate & LTV",
};

const DEFAULT_SETTINGS: ChartSettings = {
    granularity: "yearly",
    activeChart: "balance_equity",
    visibility: {
        balance_equity: { balance: true, equity: true, deposit: true },
        payment_breakdown: {
            principal: true,
            interest: true,
            oneTimeOverpayment: true,
            recurringOverpayment: true,
            monthlyAverage: false,
        },
        cumulative_costs: {
            interest: true,
            principal: true,
            stacked: false,
        },
        overpayment_impact: {
            baseline: true,
            actual: true,
            interestBaseline: true,
            interestActual: true,
        },
        rate_timeline: { rate: true, ltv: true, milestones: true },
    },
};

// Load initial state from localStorage
function loadSettings(): ChartSettings {
    const stored = loadFromStorage<ChartSettings>(STORAGE_KEY);
    if (stored?.granularity && stored.visibility) {
        return {
            granularity: stored.granularity,
            activeChart: stored.activeChart ?? DEFAULT_SETTINGS.activeChart,
            visibility: {
                balance_equity: {
                    ...DEFAULT_SETTINGS.visibility.balance_equity,
                    ...stored.visibility.balance_equity,
                },
                payment_breakdown: {
                    ...DEFAULT_SETTINGS.visibility.payment_breakdown,
                    ...stored.visibility.payment_breakdown,
                },
                cumulative_costs: {
                    ...DEFAULT_SETTINGS.visibility.cumulative_costs,
                    ...stored.visibility.cumulative_costs,
                },
                overpayment_impact: {
                    ...DEFAULT_SETTINGS.visibility.overpayment_impact,
                    ...stored.visibility.overpayment_impact,
                },
                rate_timeline: {
                    ...DEFAULT_SETTINGS.visibility.rate_timeline,
                    ...stored.visibility.rate_timeline,
                },
            },
        };
    }
    return DEFAULT_SETTINGS;
}

// Main chart settings atom
export const $chartSettings = atom<ChartSettings>(loadSettings());

// Persist on changes
$chartSettings.listen((settings) => {
    saveToStorage(STORAGE_KEY, settings);
});

// Actions
export function setGranularity(granularity: ChartGranularity): void {
    const current = $chartSettings.get();
    $chartSettings.set({ ...current, granularity });
}

export function setActiveChart(chartType: ChartType): void {
    const current = $chartSettings.get();
    $chartSettings.set({ ...current, activeChart: chartType });
}

export function toggleChartVisibility<T extends ChartType>(
    chartType: T,
    key: keyof ChartVisibilitySettings[T],
): void {
    const current = $chartSettings.get();
    const chartVisibility = current.visibility[chartType];
    $chartSettings.set({
        ...current,
        visibility: {
            ...current.visibility,
            [chartType]: {
                ...chartVisibility,
                [key]: !chartVisibility[key as keyof typeof chartVisibility],
            },
        },
    });
}

export function resetChartSettings(): void {
    $chartSettings.set(DEFAULT_SETTINGS);
}
