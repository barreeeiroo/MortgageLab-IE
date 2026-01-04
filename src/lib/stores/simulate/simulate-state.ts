import { atom, computed } from "nanostores";
import type {
	OverpaymentConfig,
	RatePeriod,
	SimulateInputValues,
	SimulationState,
} from "@/lib/schemas/simulate";
import { loadFromStorage, saveToStorage } from "@/lib/storage/helpers";

const STORAGE_KEY = "simulate-state";

// Format date as YYYY-MM-DD without timezone issues
function formatDateLocal(year: number, month: number, day: number): string {
	return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Get default start date: today if 1st of month, otherwise first of next month
function getDefaultStartDate(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth() + 1; // 1-indexed

	if (now.getDate() === 1) {
		// Today is the 1st, use today
		return formatDateLocal(year, month, 1);
	}

	// Otherwise, use first of next month
	if (month === 12) {
		return formatDateLocal(year + 1, 1, 1);
	}
	return formatDateLocal(year, month + 1, 1);
}

// Default input values
export const DEFAULT_INPUT: SimulateInputValues = {
	mortgageAmount: 0,
	mortgageTerm: 30,
	propertyValue: 0,
	startDate: undefined,
};

// Default simulation state
export const DEFAULT_STATE: SimulationState = {
	input: DEFAULT_INPUT,
	ratePeriods: [],
	overpaymentConfigs: [],
	initialized: false,
};

// Main simulation state atom
export const $simulationState = atom<SimulationState>(DEFAULT_STATE);

// Persist state to localStorage
function persistState(state: SimulationState): void {
	if (state.initialized) {
		saveToStorage(STORAGE_KEY, state);
	}
}

// Load state from localStorage
function loadPersistedState(): SimulationState | null {
	const stored = loadFromStorage<SimulationState>(STORAGE_KEY);
	// Basic validation - check if it has the required structure
	if (
		stored &&
		typeof stored.input === "object" &&
		Array.isArray(stored.ratePeriods) &&
		stored.initialized
	) {
		return stored as SimulationState;
	}
	return null;
}

// Initialize simulation from localStorage
export function initializeSimulation(): void {
	const persisted = loadPersistedState();
	if (persisted) {
		$simulationState.set(persisted);
	}
}

// Subscribe to auto-persist all state changes
$simulationState.listen((state) => {
	persistState(state);
});

// Kept for backwards compatibility but no longer needed
export function markInitialized(): void {
	$simulationState.set({
		...$simulationState.get(),
		initialized: true,
	});
}

// Derived atoms for easy access
export const $input = computed($simulationState, (s) => s.input);
export const $ratePeriods = computed($simulationState, (s) => s.ratePeriods);
export const $overpaymentConfigs = computed(
	$simulationState,
	(s) => s.overpaymentConfigs,
);
export const $initialized = computed($simulationState, (s) => s.initialized);

// Computed: check if simulation has required data to calculate
export const $hasRequiredData = computed($simulationState, (state) => {
	const { input, ratePeriods } = state;
	return (
		input.mortgageAmount > 0 &&
		input.mortgageTerm > 0 &&
		input.propertyValue > 0 &&
		ratePeriods.length > 0
	);
});

// Computed: total duration covered by rate periods (in months)
export const $coveredMonths = computed($ratePeriods, (periods) => {
	if (periods.length === 0) return 0;

	// Sort by start month
	const sorted = [...periods].sort((a, b) => a.startMonth - b.startMonth);
	let maxEnd = 0;

	for (const period of sorted) {
		const periodEnd =
			period.durationMonths === 0
				? Number.POSITIVE_INFINITY // Until end of mortgage
				: period.startMonth + period.durationMonths - 1;
		maxEnd = Math.max(maxEnd, periodEnd);
	}

	return maxEnd === Number.POSITIVE_INFINITY ? -1 : maxEnd; // -1 means "until end"
});

// Computed: LTV based on input
export const $ltv = computed($input, (input) =>
	input.propertyValue > 0
		? (input.mortgageAmount / input.propertyValue) * 100
		: 0,
);

// Computed: total mortgage term in months
export const $totalMonths = computed(
	$input,
	(input) => input.mortgageTerm * 12,
);

// Computed: list of custom rate IDs used (for sharing)
export const $usedCustomRateIds = computed($ratePeriods, (periods) =>
	periods.filter((p) => p.isCustom).map((p) => p.rateId),
);

// Actions

export function setSimulationState(state: SimulationState): void {
	$simulationState.set(state);
}

export function setInput(input: Partial<SimulateInputValues>): void {
	const current = $simulationState.get();
	$simulationState.set({
		...current,
		input: { ...current.input, ...input },
	});
}

export function setInitialized(initialized: boolean): void {
	const current = $simulationState.get();
	$simulationState.set({ ...current, initialized });
}

// Rate Period Actions

export function addRatePeriod(period: Omit<RatePeriod, "id">): void {
	const current = $simulationState.get();
	const newPeriod: RatePeriod = {
		...period,
		id: crypto.randomUUID(),
	};
	$simulationState.set({
		...current,
		ratePeriods: [...current.ratePeriods, newPeriod],
	});
}

export function updateRatePeriod(
	id: string,
	updates: Partial<Omit<RatePeriod, "id">>,
): void {
	const current = $simulationState.get();
	$simulationState.set({
		...current,
		ratePeriods: current.ratePeriods.map((p) =>
			p.id === id ? { ...p, ...updates } : p,
		),
	});
}

export function removeRatePeriod(id: string): void {
	const current = $simulationState.get();
	$simulationState.set({
		...current,
		ratePeriods: current.ratePeriods.filter((p) => p.id !== id),
	});
}

export function setRatePeriods(periods: RatePeriod[]): void {
	const current = $simulationState.get();
	$simulationState.set({
		...current,
		ratePeriods: periods,
	});
}

// Overpayment Config Actions

export function addOverpaymentConfig(
	config: Omit<OverpaymentConfig, "id">,
): void {
	const current = $simulationState.get();
	const newConfig: OverpaymentConfig = {
		...config,
		id: crypto.randomUUID(),
	};
	$simulationState.set({
		...current,
		overpaymentConfigs: [...current.overpaymentConfigs, newConfig],
	});
}

export function updateOverpaymentConfig(
	id: string,
	updates: Partial<Omit<OverpaymentConfig, "id">>,
): void {
	const current = $simulationState.get();
	$simulationState.set({
		...current,
		overpaymentConfigs: current.overpaymentConfigs.map((c) =>
			c.id === id ? { ...c, ...updates } : c,
		),
	});
}

export function removeOverpaymentConfig(id: string): void {
	const current = $simulationState.get();
	$simulationState.set({
		...current,
		overpaymentConfigs: current.overpaymentConfigs.filter((c) => c.id !== id),
	});
}

export function setOverpaymentConfigs(configs: OverpaymentConfig[]): void {
	const current = $simulationState.get();
	$simulationState.set({
		...current,
		overpaymentConfigs: configs,
	});
}

export function clearOverpaymentConfigs(): void {
	const current = $simulationState.get();
	$simulationState.set({
		...current,
		overpaymentConfigs: [],
	});
}

// Reset simulation to defaults
export function resetSimulation(): void {
	const defaultState = {
		...DEFAULT_STATE,
		input: {
			...DEFAULT_INPUT,
			startDate: undefined,
		},
		// Keep initialized true - the app is still initialized, just with empty data
		initialized: true,
	};
	$simulationState.set(defaultState);
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch {
		// Ignore storage errors
	}
}

// Initialize simulation from rates page data
export function initializeFromRate(params: {
	mortgageAmount: number;
	mortgageTerm: number;
	propertyValue: number;
	lenderId: string;
	rateId: string;
	isCustom: boolean;
	fixedTerm?: number;
	label?: string;
	followOn?: {
		lenderId: string;
		rateId: string;
		isCustom: boolean;
		label?: string;
	};
}): void {
	const {
		mortgageAmount,
		mortgageTerm,
		propertyValue,
		lenderId,
		rateId,
		isCustom,
		fixedTerm,
		label,
		followOn,
	} = params;

	const startDate = getDefaultStartDate();

	// Create initial rate period
	const initialPeriod: RatePeriod = {
		id: crypto.randomUUID(),
		lenderId,
		rateId,
		isCustom,
		startMonth: 1,
		durationMonths: fixedTerm ? fixedTerm * 12 : 0, // 0 = until end for variable
		label,
	};

	const ratePeriods: RatePeriod[] = [initialPeriod];

	// Add follow-on rate period if provided (for fixed rates)
	if (followOn && fixedTerm) {
		const followOnPeriod: RatePeriod = {
			id: crypto.randomUUID(),
			lenderId: followOn.lenderId,
			rateId: followOn.rateId,
			isCustom: followOn.isCustom,
			startMonth: fixedTerm * 12 + 1, // Start after fixed period
			durationMonths: 0, // Until end of mortgage
			label: followOn.label,
		};
		ratePeriods.push(followOnPeriod);
	}

	const newState: SimulationState = {
		input: {
			mortgageAmount,
			mortgageTerm,
			propertyValue,
			startDate,
		},
		ratePeriods,
		overpaymentConfigs: [],
		initialized: true,
	};

	$simulationState.set(newState);
	persistState(newState);
}
