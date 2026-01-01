import {
	clearUrlParam,
	compressToUrl,
	decompressFromUrl,
	getUrlParam,
} from "@/lib/share";
import type { RatesInputValues } from "@/lib/stores";

/**
 * Rates table share state encoding/decoding
 */

const SHARE_PARAM = "s";

export interface ShareableTableState {
	columnVisibility: Record<string, boolean>;
	columnFilters: Array<{ id: string; value: unknown }>;
	sorting: Array<{ id: string; desc: boolean }>;
}

export interface RatesShareState {
	input: RatesInputValues;
	table: ShareableTableState;
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
	};
}

/**
 * Generate a shareable URL with the current rates state
 */
export function generateRatesShareUrl(state: RatesShareState): string {
	const compressed = compressState(state);
	const encoded = compressToUrl(compressed);
	const url = new URL(window.location.href);
	url.searchParams.set(SHARE_PARAM, encoded);
	url.hash = "";
	return url.toString();
}

/**
 * Parse rates share state from URL if present
 */
export function parseRatesShareState(): RatesShareState | null {
	const encoded = getUrlParam(SHARE_PARAM);
	if (!encoded) return null;

	const compressed = decompressFromUrl<CompressedState>(encoded);
	if (!compressed) return null;

	return decompressState(compressed);
}

/**
 * Clear the share parameter from the URL
 */
export function clearRatesShareParam(): void {
	clearUrlParam(SHARE_PARAM);
}
