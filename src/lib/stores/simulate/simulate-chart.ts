import { atom } from "nanostores";
import { loadFromStorage, saveToStorage } from "@/lib/storage/helpers";

const STORAGE_KEY = "simulate-chart";

export type ChartGranularity = "monthly" | "quarterly" | "yearly";

export interface ChartVisibility {
	principalRemaining: boolean;
	cumulativeInterest: boolean;
	cumulativePrincipal: boolean;
	totalPaid: boolean;
	monthlyPayment: boolean;
}

export interface ChartSettings {
	granularity: ChartGranularity;
	visibility: ChartVisibility;
}

const DEFAULT_SETTINGS: ChartSettings = {
	granularity: "yearly",
	visibility: {
		principalRemaining: true,
		cumulativeInterest: true,
		cumulativePrincipal: false,
		totalPaid: false,
		monthlyPayment: false,
	},
};

// Load initial state from localStorage
function loadSettings(): ChartSettings {
	const stored = loadFromStorage<ChartSettings>(STORAGE_KEY);
	if (stored?.granularity && stored.visibility) {
		return {
			granularity: stored.granularity,
			visibility: { ...DEFAULT_SETTINGS.visibility, ...stored.visibility },
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

export function toggleVisibility(key: keyof ChartVisibility): void {
	const current = $chartSettings.get();
	$chartSettings.set({
		...current,
		visibility: {
			...current.visibility,
			[key]: !current.visibility[key],
		},
	});
}

export function resetChartSettings(): void {
	$chartSettings.set(DEFAULT_SETTINGS);
}
