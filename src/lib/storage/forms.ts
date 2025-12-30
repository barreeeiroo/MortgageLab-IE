import { loadFromStorage, saveToStorage } from "./helpers";

// Storage keys
export const STORAGE_KEYS = {
	FTB_CALCULATOR: "ftb-calculator",
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
}

export function loadFtbForm(): Partial<FtbFormState> {
	return loadFromStorage<FtbFormState>(STORAGE_KEYS.FTB_CALCULATOR);
}

export function saveFtbForm(state: FtbFormState): void {
	saveToStorage(STORAGE_KEYS.FTB_CALCULATOR, state);
}

// Rates Calculator form state
export type RatesMode = "first-mortgage" | "remortgage";

export interface RatesFormState {
	mode: RatesMode;
	propertyValue: string;
	mortgageAmount: string;
	monthlyRepayment: string;
	mortgageTerm: string;
	berRating: string;
	buyerType: string;
}

export function loadRatesForm(): Partial<RatesFormState> {
	return loadFromStorage<RatesFormState>(STORAGE_KEYS.RATES_CALCULATOR);
}

export function saveRatesForm(state: RatesFormState): void {
	saveToStorage(STORAGE_KEYS.RATES_CALCULATOR, state);
}
