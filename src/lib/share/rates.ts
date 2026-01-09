import type { StoredCustomPerk } from "@/lib/stores/custom-perks";
import type { StoredCustomRate } from "@/lib/stores/custom-rates";
import type { RatesInputValues } from "@/lib/stores/rates-form";
import {
	clearUrlParam,
	generateShareUrl,
	hasUrlParam,
	parseShareParam,
} from "./common";
import {
	type CompressedCustomPerk,
	compressCustomPerk,
	decompressCustomPerk,
} from "./custom-perks";
import {
	type CompressedCustomRate,
	compressCustomRate,
	decompressCustomRate,
} from "./custom-rates";

/**
 * Rates table share state encoding/decoding
 */

export const RATES_SHARE_PARAM = "r";

export interface ShareableTableState {
	columnVisibility: Record<string, boolean>;
	columnFilters: Array<{ id: string; value: unknown }>;
	sorting: Array<{ id: string; desc: boolean }>;
}

export interface CompareShareState {
	rateIds: string[];
}

export interface RatesShareState {
	input: RatesInputValues;
	table: ShareableTableState;
	customRates?: StoredCustomRate[];
	customPerks?: StoredCustomPerk[];
	compare?: CompareShareState;
}

// Value abbreviations for mode
const MODE_MAP = {
	"first-mortgage": "f",
	remortgage: "r",
} as const;

const REVERSE_MODE_MAP = Object.fromEntries(
	Object.entries(MODE_MAP).map(([k, v]) => [v, k]),
) as Record<string, string>;

interface CompressedInput {
	m: string;
	p: string;
	a: string;
	r: string;
	t: string;
	b: string;
	y: string;
	l: string;
}

interface CompressedState {
	i: CompressedInput;
	v?: Record<string, boolean>;
	f?: Array<{ id: string; value: unknown }>;
	s?: Array<{ id: string; desc: boolean }>;
	c?: CompressedCustomRate[]; // customRates
	cp?: CompressedCustomPerk[]; // customPerks
	x?: string[]; // compare rateIds
}

function compressState(state: RatesShareState): CompressedState {
	return {
		i: {
			m:
				MODE_MAP[state.input.mode as keyof typeof MODE_MAP] || state.input.mode,
			p: state.input.propertyValue,
			a: state.input.mortgageAmount,
			r: state.input.monthlyRepayment,
			t: state.input.mortgageTerm,
			b: state.input.berRating,
			y: state.input.buyerType,
			l: state.input.currentLender,
		},
		v:
			Object.keys(state.table.columnVisibility).length > 0
				? state.table.columnVisibility
				: undefined,
		f:
			state.table.columnFilters.length > 0
				? state.table.columnFilters
				: undefined,
		s: state.table.sorting.length > 0 ? state.table.sorting : undefined,
		c:
			state.customRates && state.customRates.length > 0
				? state.customRates.map(compressCustomRate)
				: undefined,
		cp:
			state.customPerks && state.customPerks.length > 0
				? state.customPerks.map(compressCustomPerk)
				: undefined,
		x:
			state.compare && state.compare.rateIds.length > 0
				? state.compare.rateIds
				: undefined,
	};
}

function decompressState(compressed: CompressedState): RatesShareState {
	return {
		input: {
			mode: (REVERSE_MODE_MAP[compressed.i.m] ||
				compressed.i.m) as RatesInputValues["mode"],
			propertyValue: compressed.i.p,
			mortgageAmount: compressed.i.a,
			monthlyRepayment: compressed.i.r,
			mortgageTerm: compressed.i.t,
			berRating: compressed.i.b,
			buyerType: compressed.i.y,
			currentLender: compressed.i.l,
		},
		table: {
			columnVisibility: compressed.v ?? {},
			columnFilters: compressed.f ?? [],
			sorting: compressed.s ?? [],
		},
		customRates: compressed.c?.map(decompressCustomRate),
		customPerks: compressed.cp?.map(decompressCustomPerk),
		compare: compressed.x ? { rateIds: compressed.x } : undefined,
	};
}

/**
 * Generate a shareable URL with the current rates state
 */
export function generateRatesShareUrl(state: RatesShareState): string {
	const compressed = compressState(state);
	return generateShareUrl(RATES_SHARE_PARAM, compressed, {
		hash: state.input.mode,
	});
}

/**
 * Parse rates share state from URL if present
 */
export function parseRatesShareState(): RatesShareState | null {
	const compressed = parseShareParam<CompressedState>(RATES_SHARE_PARAM);
	if (!compressed) return null;
	return decompressState(compressed);
}

/**
 * Clear the share parameter from the URL
 */
export function clearRatesShareParam(): void {
	clearUrlParam(RATES_SHARE_PARAM);
}

/**
 * Check if URL has share param
 */
export function hasRatesShareParam(): boolean {
	return hasUrlParam(RATES_SHARE_PARAM);
}
