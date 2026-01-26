import type { BerRating } from "@/lib/constants/ber";
import type { PropertyType } from "@/lib/utils/fees";
import {
	clearUrlParam,
	generateShareUrl,
	hasUrlParam,
	parseShareParam,
} from "./common";

/**
 * Breakeven calculator share state encoding/decoding
 */

export const BREAKEVEN_SHARE_PARAM = "be";

// Calculator types
export type BreakevenCalculatorType = "rvb" | "rmb" | "cb"; // rent-vs-buy, remortgage-breakeven, cashback

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
	// Remaining fixed term on current mortgage (for breaking a fixed rate)
	remainingFixedMonths?: string;
}

// Cashback Breakeven share state
export interface CashbackOptionShareState {
	label: string;
	rate: string;
	rateInputMode: "picker" | "manual";
	cashbackType: "percentage" | "flat";
	cashbackValue: string;
	cashbackCap: string;
	overpaymentPolicyId?: string;
}

export interface CashbackBreakevenShareState {
	type: "cb";
	mortgageAmount: string;
	mortgageTerm: string;
	/** Shared fixed period for comparison (in years, "0" = variable/full term) */
	fixedPeriod: string;
	options: CashbackOptionShareState[];
}

// Union type for all breakeven calculator states
export type BreakevenShareState =
	| RentVsBuyShareState
	| RemortgageBreakevenShareState
	| CashbackBreakevenShareState;

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
	rf?: string; // remainingFixedMonths (remaining fixed term on current mortgage)
}

interface CompressedCashbackOption {
	l: string; // label
	r: string; // rate
	m: "p" | "m"; // rateInputMode: picker/manual
	ct: "p" | "f"; // cashbackType: percentage/flat
	cv: string; // cashbackValue
	cc: string; // cashbackCap
	op?: string; // overpaymentPolicyId
}

interface CompressedCashbackBreakeven {
	t: "c"; // type: cashback
	ma: string; // mortgageAmount
	mt: string; // mortgageTerm
	fp: string; // fixedPeriod (shared)
	o: CompressedCashbackOption[]; // options
}

type CompressedState =
	| CompressedRentVsBuy
	| CompressedRemortgageBreakeven
	| CompressedCashbackBreakeven;

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

	if (state.type === "cb") {
		// Cashback comparison
		const compressedOptions: CompressedCashbackOption[] = state.options.map(
			(opt) => {
				const compressed: CompressedCashbackOption = {
					l: opt.label,
					r: opt.rate,
					m: opt.rateInputMode === "picker" ? "p" : "m",
					ct: opt.cashbackType === "percentage" ? "p" : "f",
					cv: opt.cashbackValue,
					cc: opt.cashbackCap,
				};
				if (opt.overpaymentPolicyId) {
					compressed.op = opt.overpaymentPolicyId;
				}
				return compressed;
			},
		);

		return {
			t: "c",
			ma: state.mortgageAmount,
			mt: state.mortgageTerm,
			fp: state.fixedPeriod,
			o: compressedOptions,
		};
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
	if (state.remainingFixedMonths) compressed.rf = state.remainingFixedMonths;

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

	if (compressed.t === "c") {
		// Cashback comparison
		const decompressedOptions: CashbackOptionShareState[] = compressed.o.map(
			(opt) => ({
				label: opt.l,
				rate: opt.r,
				rateInputMode: opt.m === "p" ? "picker" : "manual",
				cashbackType: opt.ct === "p" ? "percentage" : "flat",
				cashbackValue: opt.cv,
				cashbackCap: opt.cc,
				overpaymentPolicyId: opt.op,
			}),
		);

		return {
			type: "cb",
			mortgageAmount: compressed.ma,
			mortgageTerm: compressed.mt,
			fixedPeriod: compressed.fp ?? "0", // Default to variable for old URLs
			options: decompressedOptions,
		};
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
	if (compressed.rf) state.remainingFixedMonths = compressed.rf;

	return state;
}

/**
 * Generate a shareable URL for a breakeven calculator
 */
export function generateBreakevenShareUrl(state: BreakevenShareState): string {
	const compressed = compressState(state);
	return generateShareUrl(BREAKEVEN_SHARE_PARAM, compressed);
}

/**
 * Parse breakeven calculator share state from URL
 */
export function parseBreakevenShareState(): BreakevenShareState | null {
	const compressed = parseShareParam<CompressedState>(BREAKEVEN_SHARE_PARAM);
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
	return hasUrlParam(BREAKEVEN_SHARE_PARAM);
}
