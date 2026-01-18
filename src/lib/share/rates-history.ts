import type {
	ChangesFilter,
	HistoryTab,
	MarketChartStyle,
	TrendsBreakdownDimension,
	TrendsDisplayMode,
	TrendsFilter,
	TrendsTimeRange,
	UpdatesFilter,
} from "@/lib/stores/rates/rates-history-filters";
import {
	clearUrlParam,
	generateShareUrl,
	hasUrlParam,
	parseShareParam,
} from "./common";

/**
 * History page share state encoding/decoding
 *
 * Encodes all filter state for all tabs + active tab into a single URL param.
 */

export const HISTORY_SHARE_PARAM = "h";

/**
 * Full share state for history page
 */
export interface HistoryShareState {
	activeTab: HistoryTab;
	updatesFilter: UpdatesFilter;
	comparisonDate: string | null;
	comparisonEndDate: string | null;
	changesFilter: ChangesFilter;
	trendsFilter: TrendsFilter;
	trendsSelectedLenders: string[];
	changesSelectedLender: string;
}

/**
 * Compressed format with abbreviated keys to reduce URL length
 */
interface CompressedHistoryShareState {
	t: string; // activeTab
	u: {
		// updatesFilter
		l: string[]; // lenderIds
		s: string | null; // startDate
		e: string | null; // endDate
		c: string; // changeType
	};
	cd: string | null; // comparisonDate
	ced: string | null; // comparisonEndDate
	c: {
		// changesFilter
		l: string[]; // lenderIds
		r: string | null; // rateType
		v: [number, number] | null; // ltvRange
		b: string; // buyerCategory
	};
	r: {
		// trendsFilter
		t: string | null; // rateType
		f: number | null; // fixedTerm
		v: [number, number] | null; // ltvRange
		l: string[]; // lenderIds
		b: string; // buyerCategory
		d?: string; // displayMode
		m?: string; // marketChartStyle
		g?: string[]; // breakdownBy (array of dimensions)
		x?: string; // timeRange
	};
	tl: string[]; // trendsSelectedLenders
	cl: string; // changesSelectedLender
}

/**
 * Compress share state
 */
function compressState(state: HistoryShareState): CompressedHistoryShareState {
	return {
		t: state.activeTab,
		u: {
			l: state.updatesFilter.lenderIds,
			s: state.updatesFilter.startDate,
			e: state.updatesFilter.endDate,
			c: state.updatesFilter.changeType,
		},
		cd: state.comparisonDate,
		ced: state.comparisonEndDate,
		c: {
			l: state.changesFilter.lenderIds,
			r: state.changesFilter.rateType,
			v: state.changesFilter.ltvRange,
			b: state.changesFilter.buyerCategory,
		},
		r: {
			t: state.trendsFilter.rateType,
			f: state.trendsFilter.fixedTerm,
			v: state.trendsFilter.ltvRange,
			l: state.trendsFilter.lenderIds,
			b: state.trendsFilter.buyerCategory,
			d: state.trendsFilter.displayMode,
			m: state.trendsFilter.marketChartStyle,
			g: state.trendsFilter.breakdownBy,
			x: state.trendsFilter.timeRange,
		},
		tl: state.trendsSelectedLenders,
		cl: state.changesSelectedLender,
	};
}

/**
 * Decompress share state
 */
function decompressState(
	compressed: CompressedHistoryShareState,
): HistoryShareState {
	return {
		activeTab: compressed.t as HistoryTab,
		updatesFilter: {
			lenderIds: compressed.u.l ?? [],
			startDate: compressed.u.s ?? null,
			endDate: compressed.u.e ?? null,
			changeType: (compressed.u.c ?? "all") as UpdatesFilter["changeType"],
		},
		comparisonDate: compressed.cd ?? null,
		comparisonEndDate: compressed.ced ?? null,
		changesFilter: {
			lenderIds: compressed.c.l ?? [],
			rateType: compressed.c.r ?? null,
			ltvRange: compressed.c.v ?? null,
			buyerCategory: (compressed.c.b ??
				"all") as ChangesFilter["buyerCategory"],
		},
		trendsFilter: {
			rateType: compressed.r.t ?? "fixed-4",
			fixedTerm: compressed.r.f ?? null,
			ltvRange: compressed.r.v ?? [0, 80],
			lenderIds: compressed.r.l ?? [],
			buyerCategory: (compressed.r.b ?? "pdh") as TrendsFilter["buyerCategory"],
			displayMode: (compressed.r.d ?? "individual") as TrendsDisplayMode,
			marketChartStyle: (compressed.r.m ?? "average") as MarketChartStyle,
			breakdownBy: (compressed.r.g ?? ["lender"]) as TrendsBreakdownDimension[],
			timeRange: (compressed.r.x ?? "all") as TrendsTimeRange,
		},
		trendsSelectedLenders: compressed.tl ?? [],
		changesSelectedLender: compressed.cl ?? "all",
	};
}

/**
 * Generate a shareable URL for history page state
 */
export function generateHistoryShareUrl(state: HistoryShareState): string {
	const compressed = compressState(state);
	return generateShareUrl(HISTORY_SHARE_PARAM, compressed);
}

/**
 * Parse history share state from URL if present
 */
export function parseHistoryShareState(): HistoryShareState | null {
	const compressed =
		parseShareParam<CompressedHistoryShareState>(HISTORY_SHARE_PARAM);
	if (!compressed) return null;
	return decompressState(compressed);
}

/**
 * Check if URL has history share param
 */
export function hasHistoryShareParam(): boolean {
	return hasUrlParam(HISTORY_SHARE_PARAM);
}

/**
 * Clear the history share param from URL
 */
export function clearHistoryShareParam(): void {
	clearUrlParam(HISTORY_SHARE_PARAM);
}
