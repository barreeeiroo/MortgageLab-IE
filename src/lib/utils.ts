import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
	return new Intl.NumberFormat("en-IE", {
		style: "currency",
		currency: "EUR",
		maximumFractionDigits: 0,
	}).format(value);
}

export function formatCurrencyInput(value: string): string {
	const num = Number.parseInt(value.replace(/[^0-9]/g, ""), 10);
	if (Number.isNaN(num) || num === 0) return "";
	return new Intl.NumberFormat("en-IE", {
		style: "currency",
		currency: "EUR",
		maximumFractionDigits: 0,
	}).format(num);
}

export function parseCurrency(value: string): number {
	const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ""));
	return Number.isNaN(parsed) ? 0 : parsed;
}

// Stamp Duty for residential property in Ireland
// 1% up to €1M, 2% from €1M to €1.5M, 6% above €1.5M (cumulative)
export function calculateStampDuty(propertyValue: number): number {
	if (propertyValue <= 0) return 0;

	let stampDuty = 0;
	const tier1Limit = 1_000_000;
	const tier2Limit = 1_500_000;

	if (propertyValue <= tier1Limit) {
		stampDuty = propertyValue * 0.01;
	} else if (propertyValue <= tier2Limit) {
		stampDuty = tier1Limit * 0.01 + (propertyValue - tier1Limit) * 0.02;
	} else {
		stampDuty =
			tier1Limit * 0.01 +
			(tier2Limit - tier1Limit) * 0.02 +
			(propertyValue - tier2Limit) * 0.06;
	}

	return stampDuty;
}

// Estimated legal fees (solicitor, searches, registration, etc.)
export const ESTIMATED_LEGAL_FEES = 4000;
