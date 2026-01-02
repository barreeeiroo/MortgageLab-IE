import type { RatesInputValues, StoredCustomRate } from "@/lib/stores";
import {
	clearUrlParam,
	compressToUrl,
	decompressFromUrl,
	getUrlParam,
} from "./common";

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
	customRates?: StoredCustomRate[];
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

// Compressed custom rate format
interface CompressedCustomRate {
	id: string;
	n: string; // name
	li: string; // lenderId
	ty: string; // type
	rt: number; // rate
	ap?: number; // apr
	ft?: number; // fixedTerm
	mnL: number; // minLtv
	mxL: number; // maxLtv
	mnLn?: number; // minLoan
	bt: string[]; // buyerTypes
	be?: string[]; // berEligible
	nb?: boolean; // newBusiness
	pk?: string[]; // perks
	w?: string; // warning
	cln?: string; // customLenderName
}

interface CompressedState {
	i: CompressedInput;
	v?: Record<string, boolean>;
	f?: Array<{ id: string; value: unknown }>;
	s?: Array<{ id: string; desc: boolean }>;
	c?: CompressedCustomRate[]; // customRates
}

function compressCustomRate(rate: StoredCustomRate): CompressedCustomRate {
	return {
		id: rate.id,
		n: rate.name,
		li: rate.lenderId,
		ty: rate.type,
		rt: rate.rate,
		ap: rate.apr,
		ft: rate.fixedTerm,
		mnL: rate.minLtv,
		mxL: rate.maxLtv,
		mnLn: rate.minLoan,
		bt: rate.buyerTypes,
		be: rate.berEligible,
		nb: rate.newBusiness,
		pk: rate.perks.length > 0 ? rate.perks : undefined,
		w: rate.warning,
		cln: rate.customLenderName,
	};
}

function decompressCustomRate(
	compressed: CompressedCustomRate,
): StoredCustomRate {
	return {
		id: compressed.id,
		name: compressed.n,
		lenderId: compressed.li,
		type: compressed.ty as "fixed" | "variable",
		rate: compressed.rt,
		apr: compressed.ap,
		fixedTerm: compressed.ft,
		minLtv: compressed.mnL,
		maxLtv: compressed.mxL,
		minLoan: compressed.mnLn,
		buyerTypes: compressed.bt as StoredCustomRate["buyerTypes"],
		berEligible: compressed.be as StoredCustomRate["berEligible"],
		newBusiness: compressed.nb,
		perks: compressed.pk ?? [],
		warning: compressed.w,
		customLenderName: compressed.cln,
	};
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
	url.hash = state.input.mode;
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
