import type {
	OverpaymentConfig,
	RatePeriod,
	SimulationState,
} from "@/lib/schemas/simulate";
import type { StoredCustomRate } from "@/lib/stores/custom-rates";
import {
	clearUrlParam,
	compressToUrl,
	decompressFromUrl,
	getUrlParam,
} from "./common";
import {
	type CompressedCustomRate,
	compressCustomRate,
	decompressCustomRate,
} from "./custom-rates";

/**
 * Simulate page share state encoding/decoding
 */

export const SIMULATE_SHARE_PARAM = "s";

// Compressed format for URL (abbreviated keys)
// Stack-based model: startMonth is computed from position, not stored
interface CompressedRatePeriod {
	l: string; // lenderId
	r: string; // rateId
	c: boolean; // isCustom
	d: number; // durationMonths
	b?: string; // label
}

interface CompressedOverpayment {
	y: "o" | "r"; // type (one_time/recurring)
	a: number; // amount (cents)
	s: number; // startMonth
	e?: number; // endMonth (recurring only)
	f: "t" | "p"; // effect (reduce_term / reduce_payment)
	b?: string; // label
}

interface CompressedSimulation {
	i: {
		a: number; // mortgageAmount (cents)
		t: number; // mortgageTerm (years)
		p: number; // propertyValue (cents)
		d?: string; // startDate (ISO), optional
	};
	r: CompressedRatePeriod[];
	o?: CompressedOverpayment[];
	cr?: CompressedCustomRate[]; // embedded custom rates
}

function compressRatePeriod(period: RatePeriod): CompressedRatePeriod {
	return {
		l: period.lenderId,
		r: period.rateId,
		c: period.isCustom,
		d: period.durationMonths,
		b: period.label,
	};
}

function decompressRatePeriod(compressed: CompressedRatePeriod): RatePeriod {
	return {
		id: crypto.randomUUID(),
		lenderId: compressed.l,
		rateId: compressed.r,
		isCustom: compressed.c,
		durationMonths: compressed.d,
		label: compressed.b,
	};
}

function compressOverpayment(config: OverpaymentConfig): CompressedOverpayment {
	return {
		y: config.type === "one_time" ? "o" : "r",
		a: config.amount,
		s: config.startMonth,
		e: config.endMonth,
		f: config.effect === "reduce_term" ? "t" : "p",
		b: config.label,
	};
}

function decompressOverpayment(
	compressed: CompressedOverpayment,
): OverpaymentConfig {
	return {
		id: crypto.randomUUID(),
		type: compressed.y === "o" ? "one_time" : "recurring",
		amount: compressed.a,
		startMonth: compressed.s,
		endMonth: compressed.e,
		effect: compressed.f === "t" ? "reduce_term" : "reduce_payment",
		label: compressed.b,
	};
}

function compressState(
	state: SimulationState,
	customRates: StoredCustomRate[],
): CompressedSimulation {
	// Find custom rates that are used in rate periods
	const usedCustomRateIds = state.ratePeriods
		.filter((p) => p.isCustom)
		.map((p) => p.rateId);

	const usedCustomRates = customRates.filter((r) =>
		usedCustomRateIds.includes(r.id),
	);

	return {
		i: {
			a: state.input.mortgageAmount,
			t: state.input.mortgageTerm,
			p: state.input.propertyValue,
			d: state.input.startDate,
		},
		r: state.ratePeriods.map(compressRatePeriod),
		o:
			state.overpaymentConfigs.length > 0
				? state.overpaymentConfigs.map(compressOverpayment)
				: undefined,
		cr:
			usedCustomRates.length > 0
				? usedCustomRates.map(compressCustomRate)
				: undefined,
	};
}

/**
 * Result of parsing a shared simulation URL
 */
export interface ParsedSimulateShareState {
	state: SimulationState;
	embeddedCustomRates: StoredCustomRate[];
}

function decompressState(
	compressed: CompressedSimulation,
): ParsedSimulateShareState {
	return {
		state: {
			input: {
				mortgageAmount: compressed.i.a,
				mortgageTerm: compressed.i.t,
				propertyValue: compressed.i.p,
				startDate: compressed.i.d,
			},
			ratePeriods: compressed.r.map(decompressRatePeriod),
			overpaymentConfigs: compressed.o?.map(decompressOverpayment) ?? [],
			initialized: true,
		},
		embeddedCustomRates: compressed.cr?.map(decompressCustomRate) ?? [],
	};
}

/**
 * Generate a shareable URL with the current simulation state
 * @param state - The simulation state to share
 * @param customRates - All custom rates (only ones used in rate periods will be embedded)
 */
export function generateSimulateShareUrl(
	state: SimulationState,
	customRates: StoredCustomRate[] = [],
): string {
	const compressed = compressState(state, customRates);
	const encoded = compressToUrl(compressed);
	const url = new URL(window.location.href);
	url.searchParams.set(SIMULATE_SHARE_PARAM, encoded);
	return url.toString();
}

/**
 * Parse simulation share state from URL if present
 * Returns both the simulation state and any embedded custom rates
 */
export function parseSimulateShareState(): ParsedSimulateShareState | null {
	const encoded = getUrlParam(SIMULATE_SHARE_PARAM);
	if (!encoded) return null;

	const compressed = decompressFromUrl<CompressedSimulation>(encoded);
	if (!compressed) return null;

	return decompressState(compressed);
}

/**
 * Clear the share parameter from the URL
 */
export function clearSimulateShareParam(): void {
	clearUrlParam(SIMULATE_SHARE_PARAM);
}

/**
 * Check if URL has share param
 */
export function hasSimulateShareParam(): boolean {
	if (typeof window === "undefined") return false;
	const params = new URLSearchParams(window.location.search);
	return params.has(SIMULATE_SHARE_PARAM);
}

/**
 * Copy URL to clipboard and return success status
 * @param state - The simulation state to share
 * @param customRates - All custom rates (only ones used in rate periods will be embedded)
 */
export async function copyShareUrl(
	state: SimulationState,
	customRates: StoredCustomRate[] = [],
): Promise<boolean> {
	try {
		const url = generateSimulateShareUrl(state, customRates);
		await navigator.clipboard.writeText(url);
		return true;
	} catch {
		return false;
	}
}
