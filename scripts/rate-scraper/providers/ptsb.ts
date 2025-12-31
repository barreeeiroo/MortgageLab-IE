import { GREEN_BER_RATINGS } from "@/lib/constants/ber";
import type { BuyerType } from "@/lib/schemas";
import type { MortgageRate } from "@/lib/schemas/rate";
import type { LenderProvider } from "../types";

const LENDER_ID = "ptsb";
const RATES_URL = "https://www.ptsb.ie/mortgages/mortgage-interest-rates/";

// LTV bands used by PTSB for fixed rates
const LTV_BANDS_FIXED = [
	{ id: "60", minLtv: 0, maxLtv: 60 },
	{ id: "80", minLtv: 60, maxLtv: 80 },
	{ id: "90", minLtv: 80, maxLtv: 90 },
];

// LTV bands for variable rates (more granular)
const LTV_BANDS_VARIABLE = [
	{ id: "50", minLtv: 0, maxLtv: 50 },
	{ id: "60", minLtv: 50, maxLtv: 60 },
	{ id: "70", minLtv: 60, maxLtv: 70 },
	{ id: "80", minLtv: 70, maxLtv: 80 },
	{ id: "90", minLtv: 80, maxLtv: 90 },
];

// LTV bands for BTL variable
const LTV_BANDS_BTL_VAR = [
	{ id: "50", minLtv: 0, maxLtv: 50 },
	{ id: "60", minLtv: 50, maxLtv: 60 },
	{ id: "70", minLtv: 60, maxLtv: 70 },
];

async function fetchAndParseRates(): Promise<MortgageRate[]> {
	console.log("Fetching rates page...");
	const response = await fetch(RATES_URL);
	const _html = await response.text();

	console.log("Parsing HTML content...");

	const rates: MortgageRate[] = [];

	// Standard fixed rates (FTB/Mover/Switcher)
	rates.push(...parseStandardFixedRates());

	// Green mortgage rates
	rates.push(...parseGreenRates());

	// High Value Mortgage rates (€250k+)
	rates.push(...parseHighValueRates());

	// Variable rates
	rates.push(...parseVariableRates());

	// BTL rates
	rates.push(...parseBtlRates());

	return rates;
}

function parseStandardFixedRates(): MortgageRate[] {
	const rates: MortgageRate[] = [];
	const buyerTypes: BuyerType[] = ["ftb", "mover", "switcher-pdh"];

	// Fixed rate products by term and LTV
	const fixedProducts = [
		{
			term: 2,
			rates: [
				{ ltvBand: LTV_BANDS_FIXED[0], rate: 4.05, apr: 4.45 },
				{ ltvBand: LTV_BANDS_FIXED[1], rate: 4.2, apr: 4.57 },
				{ ltvBand: LTV_BANDS_FIXED[2], rate: 4.4, apr: 4.78 },
			],
			hasCashback: true,
		},
		{
			term: 3,
			rates: [
				{ ltvBand: LTV_BANDS_FIXED[0], rate: 3.65, apr: 4.29 },
				{ ltvBand: LTV_BANDS_FIXED[1], rate: 3.8, apr: 4.41 },
				{ ltvBand: LTV_BANDS_FIXED[2], rate: 4.05, apr: 4.63 },
			],
			hasCashback: true,
		},
		{
			term: 4,
			rates: [
				{ ltvBand: LTV_BANDS_FIXED[0], rate: 3.0, apr: 3.96 },
				{ ltvBand: LTV_BANDS_FIXED[1], rate: 3.4, apr: 4.18 },
				{ ltvBand: LTV_BANDS_FIXED[2], rate: 3.65, apr: 4.41 },
			],
			hasCashback: false, // 4 Year Fixed excludes cashback
		},
		{
			term: 5,
			rates: [
				{ ltvBand: LTV_BANDS_FIXED[0], rate: 3.65, apr: 4.16 },
				{ ltvBand: LTV_BANDS_FIXED[1], rate: 3.8, apr: 4.29 },
				{ ltvBand: LTV_BANDS_FIXED[2], rate: 4.05, apr: 4.52 },
			],
			hasCashback: true,
		},
		{
			term: 7,
			rates: [
				{ ltvBand: LTV_BANDS_FIXED[0], rate: 3.65, apr: 4.05 },
				{ ltvBand: LTV_BANDS_FIXED[1], rate: 3.8, apr: 4.18 },
				{ ltvBand: LTV_BANDS_FIXED[2], rate: 4.05, apr: 4.42 },
			],
			hasCashback: true,
		},
	];

	for (const product of fixedProducts) {
		for (const r of product.rates) {
			rates.push({
				id: `ptsb-fixed-${product.term}yr-${r.ltvBand.id}`,
				name: `${product.term} Year Fixed - LTV ≤${r.ltvBand.maxLtv}%`,
				lenderId: LENDER_ID,
				type: "fixed",
				rate: r.rate,
				apr: r.apr,
				fixedTerm: product.term,
				minLtv: r.ltvBand.minLtv,
				maxLtv: r.ltvBand.maxLtv,
				buyerTypes,
				perks: product.hasCashback ? ["cashback-2pct"] : [],
			});
		}
	}

	return rates;
}

function parseGreenRates(): MortgageRate[] {
	const rates: MortgageRate[] = [];
	const buyerTypes: BuyerType[] = ["ftb", "mover", "switcher-pdh"];

	// Green fixed rates (BER A1-B3 required)
	const greenProducts = [
		{
			term: 3,
			rates: [
				{ ltvBand: LTV_BANDS_FIXED[0], rate: 3.45, apr: 4.22 },
				{ ltvBand: LTV_BANDS_FIXED[1], rate: 3.6, apr: 4.34 },
				{ ltvBand: LTV_BANDS_FIXED[2], rate: 3.8, apr: 4.55 },
			],
		},
		{
			term: 5,
			rates: [
				{ ltvBand: LTV_BANDS_FIXED[0], rate: 3.45, apr: 4.06 },
				{ ltvBand: LTV_BANDS_FIXED[1], rate: 3.6, apr: 4.19 },
				{ ltvBand: LTV_BANDS_FIXED[2], rate: 3.8, apr: 4.39 },
			],
		},
	];

	for (const product of greenProducts) {
		for (const r of product.rates) {
			rates.push({
				id: `ptsb-green-fixed-${product.term}yr-${r.ltvBand.id}`,
				name: `Green ${product.term} Year Fixed - LTV ≤${r.ltvBand.maxLtv}%`,
				lenderId: LENDER_ID,
				type: "fixed",
				rate: r.rate,
				apr: r.apr,
				fixedTerm: product.term,
				minLtv: r.ltvBand.minLtv,
				maxLtv: r.ltvBand.maxLtv,
				buyerTypes,
				berEligible: GREEN_BER_RATINGS,
				perks: ["cashback-2pct"],
			});
		}
	}

	return rates;
}

function parseHighValueRates(): MortgageRate[] {
	const rates: MortgageRate[] = [];
	const buyerTypes: BuyerType[] = ["ftb", "mover", "switcher-pdh"];

	// High Value standard fixed rates (€250k+ loans)
	const hvProducts = [
		{
			term: 3,
			rates: [
				{ ltvBand: LTV_BANDS_FIXED[0], rate: 3.45, apr: 4.22 },
				{ ltvBand: LTV_BANDS_FIXED[1], rate: 3.55, apr: 4.33 },
				{ ltvBand: LTV_BANDS_FIXED[2], rate: 3.85, apr: 4.57 },
			],
		},
		{
			term: 5,
			rates: [
				{ ltvBand: LTV_BANDS_FIXED[0], rate: 3.45, apr: 4.06 },
				{ ltvBand: LTV_BANDS_FIXED[1], rate: 3.55, apr: 4.16 },
				{ ltvBand: LTV_BANDS_FIXED[2], rate: 3.85, apr: 4.42 },
			],
		},
	];

	for (const product of hvProducts) {
		for (const r of product.rates) {
			rates.push({
				id: `ptsb-hv-fixed-${product.term}yr-${r.ltvBand.id}`,
				name: `High Value ${product.term} Year Fixed - LTV ≤${r.ltvBand.maxLtv}%`,
				lenderId: LENDER_ID,
				type: "fixed",
				rate: r.rate,
				apr: r.apr,
				fixedTerm: product.term,
				minLtv: r.ltvBand.minLtv,
				maxLtv: r.ltvBand.maxLtv,
				minLoan: 250000,
				buyerTypes,
				perks: ["cashback-2pct"],
			});
		}
	}

	// High Value Green fixed rates (€250k+ loans, BER A1-B3)
	const hvGreenProducts = [
		{
			term: 3,
			rates: [
				{ ltvBand: LTV_BANDS_FIXED[0], rate: 3.35, apr: 4.19 },
				{ ltvBand: LTV_BANDS_FIXED[1], rate: 3.5, apr: 4.31 },
				{ ltvBand: LTV_BANDS_FIXED[2], rate: 3.7, apr: 4.52 },
			],
		},
		{
			term: 5,
			rates: [
				{ ltvBand: LTV_BANDS_FIXED[0], rate: 3.35, apr: 4.01 },
				{ ltvBand: LTV_BANDS_FIXED[1], rate: 3.5, apr: 4.14 },
				{ ltvBand: LTV_BANDS_FIXED[2], rate: 3.7, apr: 4.34 },
			],
		},
	];

	for (const product of hvGreenProducts) {
		for (const r of product.rates) {
			rates.push({
				id: `ptsb-hv-green-fixed-${product.term}yr-${r.ltvBand.id}`,
				name: `High Value Green ${product.term} Year Fixed - LTV ≤${r.ltvBand.maxLtv}%`,
				lenderId: LENDER_ID,
				type: "fixed",
				rate: r.rate,
				apr: r.apr,
				fixedTerm: product.term,
				minLtv: r.ltvBand.minLtv,
				maxLtv: r.ltvBand.maxLtv,
				minLoan: 250000,
				buyerTypes,
				berEligible: GREEN_BER_RATINGS,
				perks: ["cashback-2pct"],
			});
		}
	}

	return rates;
}

function parseVariableRates(): MortgageRate[] {
	const rates: MortgageRate[] = [];
	const buyerTypes: BuyerType[] = ["ftb", "mover", "switcher-pdh"];

	// Managed Variable Rates by LTV
	const variableRates = [
		{ ltvBand: LTV_BANDS_VARIABLE[0], rate: 4.4, apr: 4.53 }, // ≤50%
		{ ltvBand: LTV_BANDS_VARIABLE[1], rate: 4.4, apr: 4.53 }, // 50-60%
		{ ltvBand: LTV_BANDS_VARIABLE[2], rate: 4.5, apr: 4.64 }, // 60-70%
		{ ltvBand: LTV_BANDS_VARIABLE[3], rate: 4.5, apr: 4.64 }, // 70-80%
		{ ltvBand: LTV_BANDS_VARIABLE[4], rate: 4.7, apr: 4.84 }, // 80-90%
	];

	for (const v of variableRates) {
		rates.push({
			id: `ptsb-variable-${v.ltvBand.id}`,
			name: `Managed Variable Rate - LTV ≤${v.ltvBand.maxLtv}%`,
			lenderId: LENDER_ID,
			type: "variable",
			rate: v.rate,
			apr: v.apr,
			minLtv: v.ltvBand.minLtv,
			maxLtv: v.ltvBand.maxLtv,
			buyerTypes,
			perks: [],
		});
	}

	return rates;
}

function parseBtlRates(): MortgageRate[] {
	const rates: MortgageRate[] = [];
	const buyerTypes: BuyerType[] = ["btl", "switcher-btl"];

	// BTL Variable rates by LTV
	const btlVariableRates = [
		{ ltvBand: LTV_BANDS_BTL_VAR[0], rate: 5.3, apr: 5.63 }, // ≤50%
		{ ltvBand: LTV_BANDS_BTL_VAR[1], rate: 5.45, apr: 5.79 }, // 50-60%
		{ ltvBand: LTV_BANDS_BTL_VAR[2], rate: 5.55, apr: 5.9 }, // 60-70%
	];

	for (const v of btlVariableRates) {
		rates.push({
			id: `ptsb-btl-variable-${v.ltvBand.id}`,
			name: `Buy-to-Let Variable - LTV ≤${v.ltvBand.maxLtv}%`,
			lenderId: LENDER_ID,
			type: "variable",
			rate: v.rate,
			apr: v.apr,
			minLtv: v.ltvBand.minLtv,
			maxLtv: v.ltvBand.maxLtv,
			buyerTypes,
			perks: [],
		});
	}

	// BTL Fixed rates (max 70% LTV)
	const btlFixedProducts = [
		{ term: 3, rate: 5.65, apr: 5.93 },
		{ term: 5, rate: 5.85, apr: 6.06 },
	];

	for (const product of btlFixedProducts) {
		rates.push({
			id: `ptsb-btl-fixed-${product.term}yr`,
			name: `Buy-to-Let ${product.term} Year Fixed`,
			lenderId: LENDER_ID,
			type: "fixed",
			rate: product.rate,
			apr: product.apr,
			fixedTerm: product.term,
			minLtv: 0,
			maxLtv: 70,
			buyerTypes,
			perks: [],
		});
	}

	return rates;
}

export const ptsbProvider: LenderProvider = {
	lenderId: LENDER_ID,
	name: "Permanent TSB",
	url: RATES_URL,
	scrape: fetchAndParseRates,
};
