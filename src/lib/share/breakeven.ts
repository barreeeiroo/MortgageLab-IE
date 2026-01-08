import type { BerRating } from "@/lib/constants";
import type { PropertyType } from "@/lib/utils/fees";
import {
	clearUrlParam,
	compressToUrl,
	decompressFromUrl,
	getUrlParam,
} from "./common";

/**
 * Breakeven calculator share state encoding/decoding
 */

export const BREAKEVEN_SHARE_PARAM = "be";

// Calculator types
export type BreakevenCalculatorType = "rvb" | "rmb"; // rent-vs-buy, remortgage-breakeven

// Rent vs Buy share state
export interface RentVsBuyShareState {
	type: "rvb";
	propertyValue: string;
	deposit: string;
	mortgageTerm: string;
	interestRate: string;
	berRating: string;
	currentRent: string;
	legalFees: string;
	// Advanced options (always included)
	rentInflation: string;
	homeAppreciation: string;
	maintenanceRate: string;
	opportunityCost: string;
	saleCost: string;
	serviceCharge: string;
	serviceChargeIncrease: string;
	// Property VAT fields (optional for backwards compatibility)
	propertyType?: PropertyType;
	priceIncludesVAT?: boolean;
}

// Remortgage Breakeven share state
export interface RemortgageBreakevenShareState {
	type: "rmb";
	outstandingBalance: string;
	propertyValue: string;
	currentRate: string;
	remainingTerm: string;
	newRate: string;
	rateInputMode: "picker" | "manual";
	berRating: BerRating;
	legalFees: string;
	// Fixed period tracking ("0" = variable, "1"-"10" = years)
	fixedPeriodYears: string;
	// Advanced options
	cashback?: string;
	erc?: string;
}

// Union type for all breakeven calculator states
export type BreakevenShareState =
	| RentVsBuyShareState
	| RemortgageBreakevenShareState;

// Compressed format (abbreviated keys for smaller URLs)
interface CompressedRentVsBuy {
	t: "r"; // type: rent-vs-buy
	pv: string; // propertyValue
	dp: string; // deposit
	mt: string; // mortgageTerm
	ir: string; // interestRate
	br: string; // berRating
	cr: string; // currentRent
	lf: string; // legalFees
	// Advanced (always included)
	ri: string; // rentInflation
	ha: string; // homeAppreciation
	mr: string; // maintenanceRate
	oc: string; // opportunityCost
	sc: string; // saleCost
	sv: string; // serviceCharge
	si: string; // serviceChargeIncrease
	// Property VAT fields (optional for backwards compatibility)
	pt?: "e" | "n" | "a"; // propertyType: existing/new-build/new-apartment
	vi?: "1" | "0"; // priceIncludesVAT (vatInclusive)
}

interface CompressedRemortgageBreakeven {
	t: "m"; // type: remortgage-breakeven
	ob: string; // outstandingBalance
	pv: string; // propertyValue
	cr: string; // currentRate
	rt: string; // remainingTerm
	nr: string; // newRate
	rm: "p" | "m"; // rateInputMode: picker/manual
	br: string; // berRating
	lf: string; // legalFees
	fp: string; // fixedPeriodYears ("0" = variable)
	// Advanced (optional)
	cb?: string; // cashback
	er?: string; // erc (early repayment charge)
}

type CompressedState = CompressedRentVsBuy | CompressedRemortgageBreakeven;

function compressPropertyType(
	pt: PropertyType | undefined,
): "e" | "n" | "a" | undefined {
	if (!pt || pt === "existing") return undefined; // Don't include default
	return pt === "new-build" ? "n" : "a";
}

function decompressPropertyType(
	pt: "e" | "n" | "a" | undefined,
): PropertyType | undefined {
	if (!pt) return undefined;
	return pt === "e" ? "existing" : pt === "n" ? "new-build" : "new-apartment";
}

function compressState(state: BreakevenShareState): CompressedState {
	if (state.type === "rvb") {
		const compressed: CompressedRentVsBuy = {
			t: "r",
			pv: state.propertyValue,
			dp: state.deposit,
			mt: state.mortgageTerm,
			ir: state.interestRate,
			br: state.berRating,
			cr: state.currentRent,
			lf: state.legalFees,
			ri: state.rentInflation,
			ha: state.homeAppreciation,
			mr: state.maintenanceRate,
			oc: state.opportunityCost,
			sc: state.saleCost,
			sv: state.serviceCharge,
			si: state.serviceChargeIncrease,
		};

		// Only include property type fields if non-default
		if (state.propertyType && state.propertyType !== "existing") {
			compressed.pt = compressPropertyType(state.propertyType);
			compressed.vi = state.priceIncludesVAT === false ? "0" : "1";
		}

		return compressed;
	}

	// Remortgage breakeven
	const compressed: CompressedRemortgageBreakeven = {
		t: "m",
		ob: state.outstandingBalance,
		pv: state.propertyValue,
		cr: state.currentRate,
		rt: state.remainingTerm,
		nr: state.newRate,
		rm: state.rateInputMode === "picker" ? "p" : "m",
		br: state.berRating,
		lf: state.legalFees,
		fp: state.fixedPeriodYears,
	};

	if (state.cashback) compressed.cb = state.cashback;
	if (state.erc) compressed.er = state.erc;

	return compressed;
}

function decompressState(compressed: CompressedState): BreakevenShareState {
	if (compressed.t === "r") {
		const propertyType = decompressPropertyType(compressed.pt);
		const state: RentVsBuyShareState = {
			type: "rvb",
			propertyValue: compressed.pv,
			deposit: compressed.dp,
			mortgageTerm: compressed.mt,
			interestRate: compressed.ir,
			berRating: compressed.br,
			currentRent: compressed.cr,
			legalFees: compressed.lf,
			rentInflation: compressed.ri,
			homeAppreciation: compressed.ha,
			maintenanceRate: compressed.mr,
			opportunityCost: compressed.oc,
			saleCost: compressed.sc,
			serviceCharge: compressed.sv,
			serviceChargeIncrease: compressed.si,
		};

		// Include property type fields if present
		if (propertyType) {
			state.propertyType = propertyType;
			state.priceIncludesVAT = compressed.vi !== "0";
		}

		return state;
	}

	// Remortgage breakeven
	const state: RemortgageBreakevenShareState = {
		type: "rmb",
		outstandingBalance: compressed.ob,
		propertyValue: compressed.pv,
		currentRate: compressed.cr,
		remainingTerm: compressed.rt,
		newRate: compressed.nr,
		rateInputMode: compressed.rm === "p" ? "picker" : "manual",
		berRating: compressed.br as BerRating,
		legalFees: compressed.lf,
		fixedPeriodYears: compressed.fp ?? "5", // Default to 5 years for old URLs
	};

	if (compressed.cb) state.cashback = compressed.cb;
	if (compressed.er) state.erc = compressed.er;

	return state;
}

/**
 * Generate a shareable URL for a breakeven calculator
 */
export function generateBreakevenShareUrl(state: BreakevenShareState): string {
	const compressed = compressState(state);
	const encoded = compressToUrl(compressed);
	const url = new URL(window.location.href);
	url.searchParams.set(BREAKEVEN_SHARE_PARAM, encoded);
	return url.toString();
}

/**
 * Parse breakeven calculator share state from URL
 */
export function parseBreakevenShareState(): BreakevenShareState | null {
	const encoded = getUrlParam(BREAKEVEN_SHARE_PARAM);
	if (!encoded) return null;

	const compressed = decompressFromUrl<CompressedState>(encoded);
	if (!compressed) return null;

	return decompressState(compressed);
}

/**
 * Clear the share parameter from URL
 */
export function clearBreakevenShareParam(): void {
	clearUrlParam(BREAKEVEN_SHARE_PARAM);
}

/**
 * Check if URL has breakeven share param
 */
export function hasBreakevenShareParam(): boolean {
	if (typeof window === "undefined") return false;
	return new URLSearchParams(window.location.search).has(BREAKEVEN_SHARE_PARAM);
}

/**
 * Copy share URL to clipboard
 */
export async function copyBreakevenShareUrl(
	state: BreakevenShareState,
): Promise<boolean> {
	try {
		const url = generateBreakevenShareUrl(state);
		await navigator.clipboard.writeText(url);
		return true;
	} catch {
		return false;
	}
}
