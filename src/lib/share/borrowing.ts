import type { BerRating } from "@/lib/constants";
import {
	clearUrlParam,
	compressToUrl,
	decompressFromUrl,
	getUrlParam,
} from "./common";

/**
 * Borrowing calculator share state encoding/decoding
 */

export const BORROWING_SHARE_PARAM = "b";

// Calculator types
export type BorrowingCalculatorType = "ftb" | "mover" | "btl";

// Base applicant state (shared by all calculators)
interface BaseApplicantState {
	applicationType: "sole" | "joint";
	income1: string;
	income2: string;
	birthDate1: string | null;
	birthDate2: string | null;
	berRating: BerRating;
}

// FTB-specific state
export interface FtbShareState extends BaseApplicantState {
	type: "ftb";
	savings: string;
	// Self Build fields (optional)
	isSelfBuild?: boolean;
	siteValue?: string;
}

// HomeMover-specific state
export interface MoverShareState extends BaseApplicantState {
	type: "mover";
	currentPropertyValue: string;
	outstandingMortgage: string;
	additionalSavings: string;
	// Self Build fields (optional)
	isSelfBuild?: boolean;
	siteValue?: string;
}

// BuyToLet-specific state
export interface BtlShareState extends BaseApplicantState {
	type: "btl";
	deposit: string;
	expectedRent: string;
}

// Union type for all calculator states
export type BorrowingShareState =
	| FtbShareState
	| MoverShareState
	| BtlShareState;

// Compressed format (abbreviated keys for smaller URLs)
interface CompressedBase {
	t: "f" | "m" | "b"; // calculator type: ftb/mover/btl
	a: "s" | "j"; // applicationType: sole/joint
	i1: string; // income1
	i2: string; // income2
	b1: string | null; // birthDate1
	b2: string | null; // birthDate2
	br: string; // berRating
}

interface CompressedFtb extends CompressedBase {
	t: "f";
	s: string; // savings
	// Self Build fields (optional)
	sb?: "1" | "0"; // isSelfBuild
	sv?: string; // siteValue
}

interface CompressedMover extends CompressedBase {
	t: "m";
	cv: string; // currentPropertyValue
	om: string; // outstandingMortgage
	as: string; // additionalSavings
	// Self Build fields (optional)
	sb?: "1" | "0"; // isSelfBuild
	sv?: string; // siteValue
}

interface CompressedBtl extends CompressedBase {
	t: "b";
	d: string; // deposit
	er: string; // expectedRent
}

type CompressedState = CompressedFtb | CompressedMover | CompressedBtl;

function compressState(state: BorrowingShareState): CompressedState {
	const base = {
		a: state.applicationType === "sole" ? "s" : "j",
		i1: state.income1,
		i2: state.income2,
		b1: state.birthDate1,
		b2: state.birthDate2,
		br: state.berRating,
	} as const;

	switch (state.type) {
		case "ftb":
			return {
				t: "f",
				...base,
				s: state.savings,
				...(state.isSelfBuild && {
					sb: "1",
					sv: state.siteValue ?? "",
				}),
			};
		case "mover":
			return {
				t: "m",
				...base,
				cv: state.currentPropertyValue,
				om: state.outstandingMortgage,
				as: state.additionalSavings,
				...(state.isSelfBuild && {
					sb: "1",
					sv: state.siteValue ?? "",
				}),
			};
		case "btl":
			return { t: "b", ...base, d: state.deposit, er: state.expectedRent };
	}
}

function decompressState(compressed: CompressedState): BorrowingShareState {
	const base = {
		applicationType: compressed.a === "s" ? "sole" : "joint",
		income1: compressed.i1,
		income2: compressed.i2,
		birthDate1: compressed.b1,
		birthDate2: compressed.b2,
		berRating: compressed.br as BerRating,
	} as const;

	switch (compressed.t) {
		case "f":
			return {
				type: "ftb",
				...base,
				savings: compressed.s,
				...(compressed.sb === "1" && {
					isSelfBuild: true,
					siteValue: compressed.sv ?? "",
				}),
			};
		case "m":
			return {
				type: "mover",
				...base,
				currentPropertyValue: compressed.cv,
				outstandingMortgage: compressed.om,
				additionalSavings: compressed.as,
				...(compressed.sb === "1" && {
					isSelfBuild: true,
					siteValue: compressed.sv ?? "",
				}),
			};
		case "b":
			return {
				type: "btl",
				...base,
				deposit: compressed.d,
				expectedRent: compressed.er,
			};
	}
}

/**
 * Generate a shareable URL for a borrowing calculator
 */
export function generateBorrowingShareUrl(state: BorrowingShareState): string {
	const compressed = compressState(state);
	const encoded = compressToUrl(compressed);
	const url = new URL(window.location.href);
	url.searchParams.set(BORROWING_SHARE_PARAM, encoded);
	return url.toString();
}

/**
 * Parse borrowing calculator share state from URL
 */
export function parseBorrowingShareState(): BorrowingShareState | null {
	const encoded = getUrlParam(BORROWING_SHARE_PARAM);
	if (!encoded) return null;

	const compressed = decompressFromUrl<CompressedState>(encoded);
	if (!compressed) return null;

	return decompressState(compressed);
}

/**
 * Clear the share parameter from URL
 */
export function clearBorrowingShareParam(): void {
	clearUrlParam(BORROWING_SHARE_PARAM);
}

/**
 * Check if URL has borrowing share param
 */
export function hasBorrowingShareParam(): boolean {
	if (typeof window === "undefined") return false;
	return new URLSearchParams(window.location.search).has(BORROWING_SHARE_PARAM);
}

/**
 * Copy share URL to clipboard
 */
export async function copyBorrowingShareUrl(
	state: BorrowingShareState,
): Promise<boolean> {
	try {
		const url = generateBorrowingShareUrl(state);
		await navigator.clipboard.writeText(url);
		return true;
	} catch {
		return false;
	}
}
