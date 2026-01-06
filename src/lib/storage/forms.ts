import type { RatesInputValues } from "@/lib/stores/form";
import { loadFromStorage, saveToStorage } from "./helpers";

// Storage keys
export const STORAGE_KEYS = {
	FTB_CALCULATOR: "ftb-calculator",
	MOVER_CALCULATOR: "mover-calculator",
	BTL_CALCULATOR: "btl-calculator",
	RATES_CALCULATOR: "rates-calculator",
} as const;

// FTB Calculator form state
export interface FtbFormState {
	applicationType: "sole" | "joint";
	income1: string;
	income2: string;
	birthDate1: string | null;
	birthDate2: string | null;
	savings: string;
	berRating: string;
	// Self Build fields
	isSelfBuild?: boolean;
	siteValue?: string;
}

export function loadFtbForm(): Partial<FtbFormState> {
	return loadFromStorage<FtbFormState>(STORAGE_KEYS.FTB_CALCULATOR);
}

export function saveFtbForm(state: FtbFormState): void {
	saveToStorage(STORAGE_KEYS.FTB_CALCULATOR, state);
}

// Home Mover Calculator form state
export interface MoverFormState {
	applicationType: "sole" | "joint";
	income1: string;
	income2: string;
	birthDate1: string | null;
	birthDate2: string | null;
	currentPropertyValue: string;
	outstandingMortgage: string;
	additionalSavings: string;
	berRating: string;
	// Self Build fields
	isSelfBuild?: boolean;
	siteValue?: string;
}

export function loadMoverForm(): Partial<MoverFormState> {
	return loadFromStorage<MoverFormState>(STORAGE_KEYS.MOVER_CALCULATOR);
}

export function saveMoverForm(state: MoverFormState): void {
	saveToStorage(STORAGE_KEYS.MOVER_CALCULATOR, state);
}

// Buy to Let Calculator form state
export interface BtlFormState {
	applicationType: "sole" | "joint";
	income1: string;
	income2: string;
	birthDate1: string | null;
	birthDate2: string | null;
	deposit: string;
	expectedRent: string;
	berRating: string;
}

export function loadBtlForm(): Partial<BtlFormState> {
	return loadFromStorage<BtlFormState>(STORAGE_KEYS.BTL_CALCULATOR);
}

export function saveBtlForm(state: BtlFormState): void {
	saveToStorage(STORAGE_KEYS.BTL_CALCULATOR, state);
}

// Rates Calculator form state - uses RatesInputValues from the store
export type RatesFormState = RatesInputValues;

export function loadRatesForm(): Partial<RatesFormState> {
	return loadFromStorage<RatesFormState>(STORAGE_KEYS.RATES_CALCULATOR);
}

export function saveRatesForm(state: RatesFormState): void {
	saveToStorage(STORAGE_KEYS.RATES_CALCULATOR, state);
}
