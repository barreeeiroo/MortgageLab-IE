import type { BerRating } from "@/lib/constants";
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
}

// Remortgage Breakeven share state
export interface RemortgageBreakevenShareState {
	type: "rmb";
	outstandingBalance: string;
	propertyValue: string;
	currentRate: string;
	currentPayment: string;
	remainingTerm: string;
	newRate: string;
	rateInputMode: "picker" | "manual";
	berRating: BerRating;
	legalFees: string;
	// Advanced options (only included if showAdvanced is true)
	showAdvanced?: boolean;
	cashback?: string;
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
}

interface CompressedRemortgageBreakeven {
	t: "m"; // type: remortgage-breakeven
	ob: string; // outstandingBalance
	pv: string; // propertyValue
	cr: string; // currentRate
	cp: string; // currentPayment
	rt: string; // remainingTerm
	nr: string; // newRate
	rm: "p" | "m"; // rateInputMode: picker/manual
	br: string; // berRating
	lf: string; // legalFees
	// Advanced (optional)
	sa?: "1"; // showAdvanced
	cb?: string; // cashback
}

type CompressedState = CompressedRentVsBuy | CompressedRemortgageBreakeven;

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

		return compressed;
	}

	// Remortgage breakeven
	const compressed: CompressedRemortgageBreakeven = {
		t: "m",
		ob: state.outstandingBalance,
		pv: state.propertyValue,
		cr: state.currentRate,
		cp: state.currentPayment,
		rt: state.remainingTerm,
		nr: state.newRate,
		rm: state.rateInputMode === "picker" ? "p" : "m",
		br: state.berRating,
		lf: state.legalFees,
	};

	if (state.showAdvanced) {
		compressed.sa = "1";
		if (state.cashback) compressed.cb = state.cashback;
	}

	return compressed;
}

function decompressState(compressed: CompressedState): BreakevenShareState {
	if (compressed.t === "r") {
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

		return state;
	}

	// Remortgage breakeven
	const state: RemortgageBreakevenShareState = {
		type: "rmb",
		outstandingBalance: compressed.ob,
		propertyValue: compressed.pv,
		currentRate: compressed.cr,
		currentPayment: compressed.cp,
		remainingTerm: compressed.rt,
		newRate: compressed.nr,
		rateInputMode: compressed.rm === "p" ? "picker" : "manual",
		berRating: compressed.br as BerRating,
		legalFees: compressed.lf,
	};

	if (compressed.sa === "1") {
		state.showAdvanced = true;
		if (compressed.cb) state.cashback = compressed.cb;
	}

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
