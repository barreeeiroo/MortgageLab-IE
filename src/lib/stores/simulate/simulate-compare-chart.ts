import { atom } from "nanostores";
import { loadFromStorage, saveToStorage } from "@/lib/storage/helpers";

const STORAGE_KEY = "simulate-compare-chart";

export type CompareChartGranularity = "monthly" | "quarterly" | "yearly";

export type CompareChartType =
	| "balance"
	| "payments"
	| "cumulative"
	| "rates"
	| "impact";

// Per-chart visibility settings
export interface CompareBalanceVisibility {
	balance: boolean;
	equity: boolean;
}

export interface ComparePaymentsVisibility {
	principal: boolean;
	interest: boolean;
	monthlyAverage: boolean;
}

export interface CompareCumulativeVisibility {
	interest: boolean;
	principal: boolean;
	stacked: boolean;
}

export interface CompareRatesVisibility {
	rate: boolean;
	ltv: boolean;
}

export interface CompareImpactVisibility {
	baseline: boolean;
	actual: boolean;
}

export interface CompareChartVisibilitySettings {
	balance: CompareBalanceVisibility;
	payments: ComparePaymentsVisibility;
	cumulative: CompareCumulativeVisibility;
	rates: CompareRatesVisibility;
	impact: CompareImpactVisibility;
}

export interface CompareChartSettings {
	granularity: CompareChartGranularity;
	activeChart: CompareChartType;
	visibility: CompareChartVisibilitySettings;
}

// Chart labels for UI
export const COMPARE_CHART_LABELS: Record<CompareChartType, string> = {
	balance: "Balance",
	payments: "Payments",
	cumulative: "Cumulative Costs",
	rates: "Rate & LTV",
	impact: "Overpayment Impact",
};

const DEFAULT_SETTINGS: CompareChartSettings = {
	granularity: "yearly",
	activeChart: "balance",
	visibility: {
		balance: { balance: true, equity: true },
		payments: { principal: true, interest: true, monthlyAverage: false },
		cumulative: { interest: true, principal: true, stacked: false },
		rates: { rate: true, ltv: true },
		impact: { baseline: true, actual: true },
	},
};

// Valid chart types for migration from old values
const VALID_CHART_TYPES: CompareChartType[] = [
	"balance",
	"payments",
	"cumulative",
	"rates",
	"impact",
];

// Load initial state from localStorage
function loadSettings(): CompareChartSettings {
	const stored = loadFromStorage<CompareChartSettings>(STORAGE_KEY);
	if (stored?.granularity && stored.visibility) {
		// Reset activeChart if it's an invalid/removed type (like "savings")
		const activeChart: CompareChartType = VALID_CHART_TYPES.includes(
			stored.activeChart as CompareChartType,
		)
			? (stored.activeChart as CompareChartType)
			: DEFAULT_SETTINGS.activeChart;
		return {
			granularity: stored.granularity,
			activeChart,
			visibility: {
				balance: {
					...DEFAULT_SETTINGS.visibility.balance,
					...stored.visibility.balance,
				},
				payments: {
					...DEFAULT_SETTINGS.visibility.payments,
					...stored.visibility.payments,
				},
				cumulative: {
					...DEFAULT_SETTINGS.visibility.cumulative,
					...stored.visibility.cumulative,
				},
				rates: {
					...DEFAULT_SETTINGS.visibility.rates,
					...stored.visibility.rates,
				},
				impact: {
					...DEFAULT_SETTINGS.visibility.impact,
					...stored.visibility.impact,
				},
			},
		};
	}
	return DEFAULT_SETTINGS;
}

// Main chart settings atom
export const $compareChartSettings = atom<CompareChartSettings>(loadSettings());

// Persist on changes
$compareChartSettings.listen((settings) => {
	saveToStorage(STORAGE_KEY, settings);
});

// Actions
export function setCompareChartGranularity(
	granularity: CompareChartGranularity,
): void {
	const current = $compareChartSettings.get();
	$compareChartSettings.set({ ...current, granularity });
}

export function setCompareActiveChart(chartType: CompareChartType): void {
	const current = $compareChartSettings.get();
	$compareChartSettings.set({ ...current, activeChart: chartType });
}

export function toggleCompareChartVisibility<T extends CompareChartType>(
	chartType: T,
	key: keyof CompareChartVisibilitySettings[T],
): void {
	const current = $compareChartSettings.get();
	const chartVisibility = current.visibility[chartType];
	$compareChartSettings.set({
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

export function resetCompareChartSettings(): void {
	$compareChartSettings.set(DEFAULT_SETTINGS);
}

// Toggle configuration for each chart type
export interface CompareChartToggleConfig {
	key: string;
	label: string;
	color?: string;
	lineStyle?: "solid" | "dashed";
	opacity?: number;
}

export const COMPARE_CHART_TOGGLES: Record<
	CompareChartType,
	CompareChartToggleConfig[]
> = {
	balance: [
		{
			key: "balance",
			label: "Balance",
			color: "var(--primary)",
			lineStyle: "solid",
		},
		{
			key: "equity",
			label: "Equity",
			color: "var(--primary)",
			lineStyle: "dashed",
		},
	],
	payments: [
		{
			key: "principal",
			label: "Principal",
			color: "var(--primary)",
			opacity: 1,
		},
		{
			key: "interest",
			label: "Interest",
			color: "var(--primary)",
			opacity: 0.6,
		},
	],
	cumulative: [
		{
			key: "principal",
			label: "Principal",
			color: "var(--primary)",
			lineStyle: "solid",
		},
		{
			key: "interest",
			label: "Interest",
			color: "var(--primary)",
			lineStyle: "dashed",
		},
	],
	rates: [
		{ key: "rate", label: "Rate", color: "var(--primary)", lineStyle: "solid" },
		{ key: "ltv", label: "LTV", color: "var(--primary)", lineStyle: "dashed" },
	],
	impact: [
		{
			key: "baseline",
			label: "Baseline",
			color: "var(--muted-foreground)",
			lineStyle: "dashed",
		},
		{
			key: "actual",
			label: "Actual",
			color: "var(--primary)",
			lineStyle: "solid",
		},
	],
};
