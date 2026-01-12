import type { BerRating } from "@/lib/constants/ber";
import type {
	DrawdownStage,
	OverpaymentConfig,
	RatePeriod,
	SelfBuildConfig,
	SimulationState,
} from "@/lib/schemas/simulate";
import type { StoredCustomRate } from "@/lib/stores/custom-rates";
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
	p: number; // ratePeriodIndex (index into rate periods array, mapped to ID on decompress)
	y: "o" | "r"; // type (one_time/recurring)
	q?: "m" | "q" | "y"; // frequency (monthly/quarterly/yearly) - only for recurring
	a: number; // amount (cents)
	s: number; // startMonth
	e?: number; // endMonth (recurring only)
	f: "t" | "p"; // effect (reduce_term / reduce_payment)
	b?: string; // label
	n?: boolean; // enabled=false (only included when disabled, to save space)
}

interface CompressedDrawdownStage {
	m: number; // month
	a: number; // amount (cents)
	b?: string; // label
}

interface CompressedSelfBuildConfig {
	t?: "c"; // constructionRepaymentType: undefined = interest_only (default), "c" = interest_and_capital
	i: number; // interestOnlyMonths
	s: CompressedDrawdownStage[];
}

interface CompressedSimulation {
	i: {
		a: number; // mortgageAmount (cents)
		t: number; // mortgageTermMonths
		p: number; // propertyValue (cents)
		d?: string; // startDate (ISO), optional
		b: string; // ber rating
	};
	r: CompressedRatePeriod[];
	o?: CompressedOverpayment[];
	cr?: CompressedCustomRate[]; // embedded custom rates
	sb?: CompressedSelfBuildConfig; // self-build config
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

function compressOverpayment(
	config: OverpaymentConfig,
	ratePeriods: RatePeriod[],
): CompressedOverpayment {
	// Find the index of the rate period this overpayment belongs to
	const periodIndex = ratePeriods.findIndex(
		(p) => p.id === config.ratePeriodId,
	);

	// Compress frequency: only include if not monthly (default)
	let q: "m" | "q" | "y" | undefined;
	if (config.frequency === "quarterly") q = "q";
	else if (config.frequency === "yearly") q = "y";
	// Don't include for monthly (it's the default)

	return {
		p: periodIndex >= 0 ? periodIndex : 0,
		y: config.type === "one_time" ? "o" : "r",
		q,
		a: config.amount,
		s: config.startMonth,
		e: config.endMonth,
		f: config.effect === "reduce_term" ? "t" : "p",
		b: config.label,
		n: config.enabled === false ? true : undefined, // Only include when disabled
	};
}

function decompressOverpayment(
	compressed: CompressedOverpayment,
	ratePeriods: RatePeriod[],
): OverpaymentConfig {
	// Map period index back to the rate period ID
	const ratePeriodId =
		ratePeriods[compressed.p]?.id ?? ratePeriods[0]?.id ?? "";

	// Decompress frequency: default to monthly if not specified
	let frequency: "monthly" | "quarterly" | "yearly" = "monthly";
	if (compressed.q === "q") frequency = "quarterly";
	else if (compressed.q === "y") frequency = "yearly";

	return {
		id: crypto.randomUUID(),
		ratePeriodId,
		type: compressed.y === "o" ? "one_time" : "recurring",
		frequency,
		amount: compressed.a,
		startMonth: compressed.s,
		endMonth: compressed.e,
		effect: compressed.f === "t" ? "reduce_term" : "reduce_payment",
		label: compressed.b,
		enabled: compressed.n !== true, // Default to enabled
	};
}

function compressDrawdownStage(stage: DrawdownStage): CompressedDrawdownStage {
	return {
		m: stage.month,
		a: stage.amount,
		b: stage.label,
	};
}

function decompressDrawdownStage(
	compressed: CompressedDrawdownStage,
): DrawdownStage {
	return {
		id: crypto.randomUUID(),
		month: compressed.m,
		amount: compressed.a,
		label: compressed.b,
	};
}

function compressSelfBuildConfig(
	config: SelfBuildConfig,
): CompressedSelfBuildConfig {
	return {
		// Only include when not the default (interest_only)
		t: config.constructionRepaymentType === "interest_and_capital" ? "c" : undefined,
		i: config.interestOnlyMonths,
		s: config.drawdownStages.map(compressDrawdownStage),
	};
}

function decompressSelfBuildConfig(
	compressed: CompressedSelfBuildConfig,
): SelfBuildConfig {
	return {
		enabled: true,
		constructionRepaymentType: compressed.t === "c" ? "interest_and_capital" : "interest_only",
		interestOnlyMonths: compressed.i,
		drawdownStages: compressed.s.map(decompressDrawdownStage),
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
		cr:
			usedCustomRates.length > 0
				? usedCustomRates.map(compressCustomRate)
				: undefined,
		sb: state.selfBuildConfig?.enabled
			? compressSelfBuildConfig(state.selfBuildConfig)
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
	// Decompress rate periods first so we have their IDs for overpayments
	const ratePeriods = compressed.r.map(decompressRatePeriod);

	return {
		state: {
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
	return generateShareUrl(SIMULATE_SHARE_PARAM, compressed);
}

/**
 * Parse simulation share state from URL if present
 * Returns both the simulation state and any embedded custom rates
 */
export function parseSimulateShareState(): ParsedSimulateShareState | null {
	const compressed =
		parseShareParam<CompressedSimulation>(SIMULATE_SHARE_PARAM);
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
	return hasUrlParam(SIMULATE_SHARE_PARAM);
}
