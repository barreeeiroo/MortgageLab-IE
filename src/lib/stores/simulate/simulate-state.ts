import { atom, computed } from "nanostores";
import { DEFAULT_BER } from "@/lib/constants/ber";
import { DEFAULT_TERM_MONTHS } from "@/lib/constants/term";
import { generateRepeatingRatePeriods } from "@/lib/mortgage/rates";
import type { Lender } from "@/lib/schemas/lender";
import type { MortgageRate } from "@/lib/schemas/rate";
import type {
	ConstructionRepaymentType,
	DrawdownStage,
	OverpaymentConfig,
	RatePeriod,
	SelfBuildConfig,
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
	mortgageTermMonths: DEFAULT_TERM_MONTHS,
	propertyValue: 0,
	startDate: undefined,
	ber: DEFAULT_BER,
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
export const $selfBuildConfig = computed(
	$simulationState,
	(s) => s.selfBuildConfig,
);
export const $initialized = computed($simulationState, (s) => s.initialized);

// Computed: check if simulation has required data to calculate
export const $hasRequiredData = computed($simulationState, (state) => {
	const { input, ratePeriods } = state;
	return (
		input.mortgageAmount > 0 &&
		input.mortgageTermMonths > 0 &&
		input.propertyValue > 0 &&
		ratePeriods.length > 0
	);
});

// Helper: Compute startMonth for a rate period based on its position in the stack
export function getStartMonth(periods: RatePeriod[], index: number): number {
	let start = 1;
	for (let i = 0; i < index; i++) {
		start += periods[i].durationMonths;
	}
	return start;
}

// Helper: Compute startMonth for all periods in the stack
export function getPeriodsWithStartMonths(
	periods: RatePeriod[],
): Array<RatePeriod & { startMonth: number }> {
	let start = 1;
	return periods.map((period) => {
		const withStart = { ...period, startMonth: start };
		start += period.durationMonths;
		return withStart;
	});
}

// Helper: Get the bounds (startMonth, endMonth) for a rate period
export function getPeriodBounds(
	periods: RatePeriod[],
	periodId: string,
	totalMonths: number,
): { startMonth: number; endMonth: number } | undefined {
	const periodsWithStarts = getPeriodsWithStartMonths(periods);
	const period = periodsWithStarts.find((p) => p.id === periodId);
	if (!period) return undefined;

	const endMonth =
		period.durationMonths === 0
			? totalMonths
			: period.startMonth + period.durationMonths - 1;

	return { startMonth: period.startMonth, endMonth };
}

// Helper: Get overpayments that would be affected by shortening a rate period
export function getAffectedOverpaymentsByDurationChange(
	periods: RatePeriod[],
	periodId: string,
	newDurationMonths: number,
	totalMonths: number,
	overpayments: OverpaymentConfig[],
): {
	toDelete: OverpaymentConfig[];
	toAdjust: OverpaymentConfig[];
} {
	const periodsWithStarts = getPeriodsWithStartMonths(periods);
	const period = periodsWithStarts.find((p) => p.id === periodId);
	if (!period) return { toDelete: [], toAdjust: [] };

	const newEndMonth =
		newDurationMonths === 0
			? totalMonths
			: period.startMonth + newDurationMonths - 1;

	const linkedOverpayments = overpayments.filter(
		(o) => o.ratePeriodId === periodId,
	);

	const toDelete: OverpaymentConfig[] = [];
	const toAdjust: OverpaymentConfig[] = [];

	for (const op of linkedOverpayments) {
		if (op.type === "one_time") {
			// Delete if falls outside new bounds
			if (op.startMonth > newEndMonth) {
				toDelete.push(op);
			}
		} else {
			// Recurring: check if starts after new end
			if (op.startMonth > newEndMonth) {
				toDelete.push(op);
			} else if (op.endMonth && op.endMonth > newEndMonth) {
				// Needs endMonth adjustment
				toAdjust.push(op);
			}
			// If endMonth is undefined (until end), no adjustment needed
		}
	}

	return { toDelete, toAdjust };
}

// Computed: total duration covered by rate periods (in months)
// Stack-based: sum of all durations, -1 if last period has duration 0 (until end)
export const $coveredMonths = computed($ratePeriods, (periods) => {
	if (periods.length === 0) return 0;

	// Check if last period is "until end"
	const lastPeriod = periods[periods.length - 1];
	if (lastPeriod.durationMonths === 0) {
		return -1; // -1 means "until end"
	}

	// Sum all durations
	return periods.reduce((sum, period) => sum + period.durationMonths, 0);
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
	(input) => input.mortgageTermMonths,
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

/**
 * Add a rate period to the simulation.
 * Works both on the Simulate page (updates store) and from other pages
 * like Rates (loads persisted state, updates, and saves).
 */
export function addRatePeriod(period: Omit<RatePeriod, "id">): void {
	const newPeriod: RatePeriod = {
		...period,
		id: crypto.randomUUID(),
	};

	// Check if store is initialized (we're on the Simulate page)
	const current = $simulationState.get();
	if (current.initialized) {
		$simulationState.set({
			...current,
			ratePeriods: [...current.ratePeriods, newPeriod],
		});
		return;
	}

	// Store not initialized - load from localStorage, update, and save directly
	const persisted = loadPersistedState();
	if (!persisted) {
		console.warn("No persisted simulation state found");
		return;
	}

	const updatedState: SimulationState = {
		...persisted,
		ratePeriods: [...persisted.ratePeriods, newPeriod],
	};

	saveToStorage(STORAGE_KEY, updatedState);
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

// Update rate period AND apply overpayment adjustments (for duration changes)
export function updateRatePeriodWithOverpaymentAdjustments(
	id: string,
	updates: Partial<Omit<RatePeriod, "id">>,
	overpaymentAdjustments: {
		toDelete: string[];
		toAdjust: Array<{ id: string; newEndMonth: number }>;
	},
): void {
	const current = $simulationState.get();

	// Filter out deleted overpayments and apply endMonth adjustments
	let updatedOverpayments = current.overpaymentConfigs.filter(
		(c) => !overpaymentAdjustments.toDelete.includes(c.id),
	);

	updatedOverpayments = updatedOverpayments.map((c) => {
		const adjustment = overpaymentAdjustments.toAdjust.find(
			(a) => a.id === c.id,
		);
		if (adjustment) {
			return { ...c, endMonth: adjustment.newEndMonth };
		}
		return c;
	});

	$simulationState.set({
		...current,
		ratePeriods: current.ratePeriods.map((p) =>
			p.id === id ? { ...p, ...updates } : p,
		),
		overpaymentConfigs: updatedOverpayments,
	});
}

export function removeRatePeriod(id: string): void {
	const current = $simulationState.get();
	$simulationState.set({
		...current,
		ratePeriods: current.ratePeriods.filter((p) => p.id !== id),
		// Cascade delete: remove all overpayments linked to this period
		overpaymentConfigs: current.overpaymentConfigs.filter(
			(c) => c.ratePeriodId !== id,
		),
	});
}

export function setRatePeriods(periods: RatePeriod[]): void {
	const current = $simulationState.get();
	$simulationState.set({
		...current,
		ratePeriods: periods,
	});
}

// Insert a rate period at a specific index (for variable buffer insertion)
export function insertRatePeriodAt(
	period: Omit<RatePeriod, "id">,
	index: number,
): void {
	const current = $simulationState.get();
	const newPeriod: RatePeriod = {
		...period,
		id: crypto.randomUUID(),
	};
	const newPeriods = [...current.ratePeriods];
	newPeriods.splice(index, 0, newPeriod);
	$simulationState.set({
		...current,
		ratePeriods: newPeriods,
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

export function toggleOverpaymentEnabled(id: string): void {
	const current = $simulationState.get();
	$simulationState.set({
		...current,
		overpaymentConfigs: current.overpaymentConfigs.map((c) =>
			c.id === id ? { ...c, enabled: c.enabled === false } : c,
		),
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

// Check if there's an existing simulation with rate periods
export function hasExistingSimulation(): boolean {
	const stored = loadFromStorage<SimulationState>(STORAGE_KEY);
	return !!(stored?.initialized && (stored?.ratePeriods?.length ?? 0) > 0);
}

// Initialize simulation from rates page data
export function initializeFromRate(params: {
	mortgageAmount: number;
	mortgageTermMonths: number;
	propertyValue: number;
	ber: SimulateInputValues["ber"];
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
		mortgageTermMonths,
		propertyValue,
		ber,
		lenderId,
		rateId,
		isCustom,
		fixedTerm,
		label,
		followOn,
	} = params;

	const startDate = getDefaultStartDate();

	// Create initial rate period (stack-based: no startMonth needed)
	const initialPeriod: RatePeriod = {
		id: crypto.randomUUID(),
		lenderId,
		rateId,
		isCustom,
		durationMonths: fixedTerm ? fixedTerm * 12 : 0, // 0 = until end for variable
		label,
	};

	const ratePeriods: RatePeriod[] = [initialPeriod];

	// Add follow-on rate period if provided (for fixed rates)
	// Stack-based: it automatically follows the previous period
	if (followOn && fixedTerm) {
		const followOnPeriod: RatePeriod = {
			id: crypto.randomUUID(),
			lenderId: followOn.lenderId,
			rateId: followOn.rateId,
			isCustom: followOn.isCustom,
			durationMonths: 0, // Until end of mortgage
			label: followOn.label,
		};
		ratePeriods.push(followOnPeriod);
	}

	const newState: SimulationState = {
		input: {
			mortgageAmount,
			mortgageTermMonths,
			propertyValue,
			startDate,
			ber,
		},
		ratePeriods,
		overpaymentConfigs: [],
		initialized: true,
	};

	$simulationState.set(newState);
	persistState(newState);
}

// Generate repeating rate periods (Fixed → Variable → Fixed → Variable → ...)
// Replaces a single fixed rate period with actual generated periods
// When includeBuffers is true, adds 1-month variable buffer periods between fixed periods
// The variable rate for each buffer is looked up using the LTV at that point in time
export function generateRepeatingPeriods(
	periodId: string,
	allRates: MortgageRate[],
	customRates: MortgageRate[],
	lenders: Lender[],
	includeBuffers = true,
): void {
	const current = $simulationState.get();
	const { ratePeriods, input } = current;

	// Find the period index
	const periodIndex = ratePeriods.findIndex((p) => p.id === periodId);
	if (periodIndex === -1) return;

	const period = ratePeriods[periodIndex];

	// Look up the rate from either custom rates or database rates
	const rate = period.isCustom
		? customRates.find((r) => r.id === period.rateId)
		: allRates.find(
				(r) => r.id === period.rateId && r.lenderId === period.lenderId,
			);

	if (!rate || rate.type !== "fixed" || !rate.fixedTerm) return;

	// Calculate start month for this period (stack-based)
	const periodStartMonth = getStartMonth(ratePeriods, periodIndex);

	// Generate new periods using pure function
	const newPeriods = generateRepeatingRatePeriods({
		fixedRate: rate,
		fixedLenderId: period.lenderId,
		fixedRateId: period.rateId,
		fixedIsCustom: period.isCustom,
		allRates,
		lenders,
		mortgageAmount: input.mortgageAmount,
		propertyValue: input.propertyValue,
		mortgageTermMonths: input.mortgageTermMonths,
		periodStartMonth,
		ber: input.ber,
		includeBuffers,
	});

	if (newPeriods.length === 0) return;

	// Replace the original period with the generated periods
	const beforePeriods = ratePeriods.slice(0, periodIndex);
	const afterPeriods = ratePeriods.slice(periodIndex + 1);

	// Delete overpayments linked to the original period
	const updatedOverpayments = current.overpaymentConfigs.filter(
		(c) => c.ratePeriodId !== periodId,
	);

	$simulationState.set({
		...current,
		ratePeriods: [...beforePeriods, ...newPeriods, ...afterPeriods],
		overpaymentConfigs: updatedOverpayments,
	});
}

// Self-Build Actions

/**
 * Enable self-build mode with initial configuration.
 * Drawdowns will be validated against the mortgage amount.
 */
export function enableSelfBuild(): void {
	const current = $simulationState.get();
	$simulationState.set({
		...current,
		selfBuildConfig: {
			enabled: true,
			constructionRepaymentType: "interest_only",
			interestOnlyMonths: 0,
			drawdownStages: [],
		},
	});
}

/**
 * Disable self-build mode and clear configuration.
 */
export function disableSelfBuild(): void {
	const current = $simulationState.get();
	$simulationState.set({
		...current,
		selfBuildConfig: undefined,
	});
}

/**
 * Update self-build configuration.
 */
export function updateSelfBuildConfig(
	updates: Partial<Omit<SelfBuildConfig, "drawdownStages">>,
): void {
	const current = $simulationState.get();
	if (!current.selfBuildConfig) return;

	$simulationState.set({
		...current,
		selfBuildConfig: {
			...current.selfBuildConfig,
			...updates,
		},
	});
}

/**
 * Set the interest-only period (months after final drawdown).
 */
export function setInterestOnlyMonths(months: number): void {
	const current = $simulationState.get();
	if (!current.selfBuildConfig) return;

	$simulationState.set({
		...current,
		selfBuildConfig: {
			...current.selfBuildConfig,
			interestOnlyMonths: months,
		},
	});
}

/**
 * Set the construction repayment type.
 * When changed to "interest_and_capital", interest-only months are reset to 0.
 */
export function setConstructionRepaymentType(
	type: ConstructionRepaymentType,
): void {
	const current = $simulationState.get();
	if (!current.selfBuildConfig) return;

	$simulationState.set({
		...current,
		selfBuildConfig: {
			...current.selfBuildConfig,
			constructionRepaymentType: type,
			// Reset interest-only months when switching to interest_and_capital
			interestOnlyMonths:
				type === "interest_and_capital"
					? 0
					: current.selfBuildConfig.interestOnlyMonths,
		},
	});
}

/**
 * Add a drawdown stage to the self-build configuration.
 * Stages are automatically sorted by month.
 */
export function addDrawdownStage(stage: Omit<DrawdownStage, "id">): void {
	const current = $simulationState.get();
	if (!current.selfBuildConfig?.enabled) return;

	const newStage: DrawdownStage = {
		...stage,
		id: crypto.randomUUID(),
	};

	// Insert sorted by month
	const updatedStages = [
		...current.selfBuildConfig.drawdownStages,
		newStage,
	].sort((a, b) => a.month - b.month);

	$simulationState.set({
		...current,
		selfBuildConfig: {
			...current.selfBuildConfig,
			drawdownStages: updatedStages,
		},
	});
}

/**
 * Update a drawdown stage.
 * Re-sorts stages by month if month was changed.
 */
export function updateDrawdownStage(
	id: string,
	updates: Partial<Omit<DrawdownStage, "id">>,
): void {
	const current = $simulationState.get();
	if (!current.selfBuildConfig?.enabled) return;

	const updatedStages = current.selfBuildConfig.drawdownStages
		.map((s) => (s.id === id ? { ...s, ...updates } : s))
		.sort((a, b) => a.month - b.month);

	$simulationState.set({
		...current,
		selfBuildConfig: {
			...current.selfBuildConfig,
			drawdownStages: updatedStages,
		},
	});
}

/**
 * Remove a drawdown stage.
 */
export function removeDrawdownStage(id: string): void {
	const current = $simulationState.get();
	if (!current.selfBuildConfig?.enabled) return;

	$simulationState.set({
		...current,
		selfBuildConfig: {
			...current.selfBuildConfig,
			drawdownStages: current.selfBuildConfig.drawdownStages.filter(
				(s) => s.id !== id,
			),
		},
	});
}

/**
 * Set all drawdown stages at once (used for applying templates).
 */
export function setDrawdownStages(stages: DrawdownStage[]): void {
	const current = $simulationState.get();
	if (!current.selfBuildConfig?.enabled) return;

	$simulationState.set({
		...current,
		selfBuildConfig: {
			...current.selfBuildConfig,
			drawdownStages: [...stages].sort((a, b) => a.month - b.month),
		},
	});
}
