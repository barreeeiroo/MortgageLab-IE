import type { BerRating } from "@/lib/constants/ber";
import type { SaveableSimulationState } from "@/lib/schemas/simulate";
import type { StoredCustomRate } from "@/lib/stores/custom-rates";
import type { ResolvedCompareSimulation } from "@/lib/stores/simulate/simulate-compare";
import {
	clearUrlParam,
	generateShareUrl,
	hasUrlParam,
	parseShareParam,
} from "./common";
import {
	type CompressedCustomRate,
	compressCustomRate,
	decompressCustomRate,
} from "./custom-rates";
import {
	type CompressedOverpayment,
	type CompressedRatePeriod,
	type CompressedSelfBuildConfig,
	compressOverpayment,
	compressRatePeriod,
	compressSelfBuildConfig,
	decompressOverpayment,
	decompressRatePeriod,
	decompressSelfBuildConfig,
} from "./simulate";

/**
 * Simulate Comparison share state encoding/decoding
 *
 * Uses a separate param from single simulation (s) to avoid collisions.
 * Compresses all compared simulations with their full state.
 */

export const COMPARE_SHARE_PARAM = "sc"; // simulation-compare

interface CompressedSimulationState {
	i: {
		a: number; // mortgageAmount
		t: number; // mortgageTermMonths
		p: number; // propertyValue
		d?: string; // startDate
		b: string; // ber
	};
	r: CompressedRatePeriod[];
	o?: CompressedOverpayment[];
	sb?: CompressedSelfBuildConfig;
}

interface CompressedCompareSimulation {
	id: string; // Original ID (or generated for current view)
	n: string; // name
	st: CompressedSimulationState; // state
	cr?: CompressedCustomRate[]; // embedded custom rates for this simulation
	cv: boolean; // isCurrentView
}

interface CompressedCompareState {
	sims: CompressedCompareSimulation[];
}

function compressSimulationState(
	state: SaveableSimulationState,
): CompressedSimulationState {
	return {
		i: {
			a: state.input.mortgageAmount,
			t: state.input.mortgageTermMonths,
			p: state.input.propertyValue,
			d: state.input.startDate,
			b: state.input.ber,
		},
		r: state.ratePeriods.map(compressRatePeriod),
		o:
			state.overpaymentConfigs.length > 0
				? state.overpaymentConfigs.map((c) =>
						compressOverpayment(c, state.ratePeriods),
					)
				: undefined,
		sb: state.selfBuildConfig?.enabled
			? compressSelfBuildConfig(state.selfBuildConfig)
			: undefined,
	};
}

function decompressSimulationState(
	compressed: CompressedSimulationState,
): SaveableSimulationState {
	const ratePeriods = compressed.r.map(decompressRatePeriod);

	return {
		input: {
			mortgageAmount: compressed.i.a,
			mortgageTermMonths: compressed.i.t,
			propertyValue: compressed.i.p,
			startDate: compressed.i.d,
			ber: compressed.i.b as BerRating,
		},
		ratePeriods,
		overpaymentConfigs:
			compressed.o?.map((o) => decompressOverpayment(o, ratePeriods)) ?? [],
		selfBuildConfig: compressed.sb
			? decompressSelfBuildConfig(compressed.sb)
			: undefined,
	};
}

/**
 * Data for a simulation in the share URL
 */
export interface CompareShareSimulation {
	id: string;
	name: string;
	state: SaveableSimulationState;
	customRates: StoredCustomRate[];
	isCurrentView: boolean;
}

/**
 * Parsed share state
 */
export interface ParsedCompareShareState {
	simulations: CompareShareSimulation[];
}

/**
 * Generate a unique ID for shared simulations that were the current view
 */
function generateSharedSimulationId(): string {
	return `sim-shared-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Get custom rates used by a simulation
 */
function getUsedCustomRates(
	state: SaveableSimulationState,
	allCustomRates: StoredCustomRate[],
): StoredCustomRate[] {
	const usedIds = state.ratePeriods
		.filter((p) => p.isCustom)
		.map((p) => p.rateId);

	return allCustomRates.filter((r) => usedIds.includes(r.id));
}

/**
 * Generate a shareable URL for comparing simulations
 */
export function generateCompareShareUrl(
	simulations: ResolvedCompareSimulation[],
	allCustomRates: StoredCustomRate[],
): string {
	const compressedSims: CompressedCompareSimulation[] = simulations.map(
		(sim) => {
			// For current view, generate a new ID for the recipient
			const id = sim.isCurrentView ? generateSharedSimulationId() : sim.id;

			// Get only the custom rates used by this simulation
			const usedCustomRates = getUsedCustomRates(sim.state, allCustomRates);

			return {
				id,
				n: sim.isCurrentView ? "Shared Simulation" : sim.name,
				st: compressSimulationState(sim.state),
				cr:
					usedCustomRates.length > 0
						? usedCustomRates.map(compressCustomRate)
						: undefined,
				cv: sim.isCurrentView,
			};
		},
	);

	const compressed: CompressedCompareState = {
		sims: compressedSims,
	};

	return generateShareUrl(COMPARE_SHARE_PARAM, compressed);
}

/**
 * Parse comparison share state from URL if present
 */
export function parseCompareShareState(): ParsedCompareShareState | null {
	const compressed =
		parseShareParam<CompressedCompareState>(COMPARE_SHARE_PARAM);
	if (!compressed || !compressed.sims) return null;

	const simulations: CompareShareSimulation[] = compressed.sims.map((sim) => ({
		id: sim.id,
		name: sim.n,
		state: decompressSimulationState(sim.st),
		customRates: sim.cr?.map(decompressCustomRate) ?? [],
		isCurrentView: sim.cv,
	}));

	return { simulations };
}

/**
 * Check if URL has comparison share param
 */
export function hasCompareShareParam(): boolean {
	return hasUrlParam(COMPARE_SHARE_PARAM);
}

/**
 * Clear the comparison share param from URL
 */
export function clearCompareShareParam(): void {
	clearUrlParam(COMPARE_SHARE_PARAM);
}
