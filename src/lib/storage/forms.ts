import type { RatesInputValues } from "@/lib/stores/rates/rates-form";
import type { PropertyType } from "@/lib/utils/fees";
import { loadFromStorage, saveToStorage } from "./helpers";

// Storage keys
export const STORAGE_KEYS = {
	FTB_CALCULATOR: "ftb-calculator",
	MOVER_CALCULATOR: "mover-calculator",
	BTL_CALCULATOR: "btl-calculator",
	RATES_CALCULATOR: "rates-calculator",
	RENT_VS_BUY_CALCULATOR: "rent-vs-buy-calculator",
	REMORTGAGE_BREAKEVEN_CALCULATOR: "remortgage-breakeven-calculator",
	CASHBACK_BREAKEVEN_CALCULATOR: "cashback-breakeven-calculator",
	WHATS_NEW_VERSION: "whats-new-version",
	THEME: "theme",
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
	// Property VAT fields
	propertyType?: PropertyType;
	priceIncludesVAT?: boolean;
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
	// Property VAT fields
	propertyType?: PropertyType;
	priceIncludesVAT?: boolean;
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
	// Property VAT fields
	propertyType?: PropertyType;
	priceIncludesVAT?: boolean;
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

// Rent vs Buy Calculator form state
export interface RentVsBuyFormState {
	propertyValue: string;
	deposit: string;
	mortgageTerm: string;
	interestRate: string;
	berRating: string;
	currentRent: string;
	legalFees: string;
	// Advanced options (always visible)
	rentInflation: string;
	homeAppreciation: string;
	maintenanceRate: string;
	opportunityCost: string;
	saleCost: string;
	serviceCharge: string;
	serviceChargeIncrease: string;
	// Property VAT fields
	propertyType?: PropertyType;
	priceIncludesVAT?: boolean;
}

export function loadRentVsBuyForm(): Partial<RentVsBuyFormState> {
	return loadFromStorage<RentVsBuyFormState>(
		STORAGE_KEYS.RENT_VS_BUY_CALCULATOR,
	);
}

export function saveRentVsBuyForm(state: RentVsBuyFormState): void {
	saveToStorage(STORAGE_KEYS.RENT_VS_BUY_CALCULATOR, state);
}

// Remortgage Breakeven Calculator form state
export interface RemortgageBreakevenFormState {
	outstandingBalance: string;
	propertyValue: string;
	currentRate: string;
	remainingTerm: string;
	newRate: string;
	rateInputMode: "picker" | "manual";
	berRating: string;
	legalFees: string;
	// Fixed period tracking ("0" = variable, "1"-"10" = years)
	fixedPeriodYears: string;
	// Advanced options
	cashback: string;
	erc?: string;
	// Remaining fixed term on current mortgage (for breaking a fixed rate)
	remainingFixedMonths?: string;
}

export function loadRemortgageBreakevenForm(): Partial<RemortgageBreakevenFormState> {
	return loadFromStorage<RemortgageBreakevenFormState>(
		STORAGE_KEYS.REMORTGAGE_BREAKEVEN_CALCULATOR,
	);
}

export function saveRemortgageBreakevenForm(
	state: RemortgageBreakevenFormState,
): void {
	saveToStorage(STORAGE_KEYS.REMORTGAGE_BREAKEVEN_CALCULATOR, state);
}

// Cashback Breakeven Calculator form state
export interface CashbackOptionFormState {
	id: string;
	label: string;
	rate: string;
	rateInputMode: "picker" | "manual";
	cashbackType: "percentage" | "flat";
	cashbackValue: string;
	cashbackCap: string;
	/** Overpayment policy ID */
	overpaymentPolicyId?: string;
}

export interface CashbackBreakevenFormState {
	mortgageAmount: string;
	mortgageTerm: string;
	/** Shared fixed period for comparison (in years, "0" = variable/full term) */
	fixedPeriod: string;
	options: CashbackOptionFormState[];
}

export function loadCashbackBreakevenForm(): Partial<CashbackBreakevenFormState> {
	return loadFromStorage<CashbackBreakevenFormState>(
		STORAGE_KEYS.CASHBACK_BREAKEVEN_CALCULATOR,
	);
}

export function saveCashbackBreakevenForm(
	state: CashbackBreakevenFormState,
): void {
	saveToStorage(STORAGE_KEYS.CASHBACK_BREAKEVEN_CALCULATOR, state);
}
