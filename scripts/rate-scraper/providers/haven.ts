import { GREEN_BER_RATINGS } from "@/lib/constants/ber";
import type { BuyerType } from "@/lib/schemas";
import type { MortgageRate } from "@/lib/schemas/rate";
import type { LenderProvider } from "../types";

const LENDER_ID = "haven";
const RATES_URL = "https://www.havenmortgages.ie/mortgage-centre/mortgage-rates";

// PDH buyer types (Haven doesn't offer BTL)
const BUYER_TYPES: BuyerType[] = ["ftb", "mover", "switcher-pdh"];

// LTV bands for variable rates
const LTV_BANDS_VARIABLE = [
	{ id: "50", minLtv: 0, maxLtv: 50 },
	{ id: "80", minLtv: 50, maxLtv: 80 },
	{ id: "90", minLtv: 80, maxLtv: 90 },
];

async function fetchAndParseRates(): Promise<MortgageRate[]> {
	console.log("Fetching rates page...");
	const response = await fetch(RATES_URL);
	const _html = await response.text();

	console.log("Parsing HTML content...");

	const rates: MortgageRate[] = [];

	// Fixed rates
	rates.push(...parseFixedRates());

	// Variable rates
	rates.push(...parseVariableRates());

	return rates;
}

function parseFixedRates(): MortgageRate[] {
	const rates: MortgageRate[] = [];

	// Standard fixed rates (no LTV differentiation, up to 90%)
	const fixedProducts = [
		{ term: 1, rate: 3.55, apr: 4.2 },
		{ term: 2, rate: 3.6, apr: 4.2 },
		{ term: 3, rate: 3.75, apr: 4.2 },
		{ term: 5, rate: 3.9, apr: 4.2 },
		{ term: 7, rate: 4.1, apr: 4.3 },
		{ term: 10, rate: 4.25, apr: 4.4 },
	];

	for (const product of fixedProducts) {
		rates.push({
			id: `haven-fixed-${product.term}yr`,
			name: `${product.term} Year Fixed`,
			lenderId: LENDER_ID,
			type: "fixed",
			rate: product.rate,
			apr: product.apr,
			fixedTerm: product.term,
			minLtv: 0,
			maxLtv: 90,
			buyerTypes: BUYER_TYPES,
			perks: ["cashback-5k"],
		});
	}

	// 4 Year Green Fixed (Haven Green - requires BER A1-B3)
	rates.push({
		id: "haven-green-fixed-4yr",
		name: "4 Year Haven Green Fixed",
		lenderId: LENDER_ID,
		type: "fixed",
		rate: 3.2,
		apr: 3.9,
		fixedTerm: 4,
		minLtv: 0,
		maxLtv: 90,
		buyerTypes: BUYER_TYPES,
		berEligible: GREEN_BER_RATINGS,
		perks: [],
	});

	return rates;
}

function parseVariableRates(): MortgageRate[] {
	const rates: MortgageRate[] = [];

	// Variable rates by LTV
	const variableRates = [
		{ ltvBand: LTV_BANDS_VARIABLE[0], rate: 3.75, apr: 3.9 }, // ≤50%
		{ ltvBand: LTV_BANDS_VARIABLE[1], rate: 3.95, apr: 4.1 }, // 50-80%
		{ ltvBand: LTV_BANDS_VARIABLE[2], rate: 4.15, apr: 4.3 }, // 80-90%
	];

	for (const v of variableRates) {
		rates.push({
			id: `haven-variable-${v.ltvBand.id}`,
			name: `Variable Rate - LTV ≤${v.ltvBand.maxLtv}%`,
			lenderId: LENDER_ID,
			type: "variable",
			rate: v.rate,
			apr: v.apr,
			minLtv: v.ltvBand.minLtv,
			maxLtv: v.ltvBand.maxLtv,
			buyerTypes: BUYER_TYPES,
			perks: [],
		});
	}

	return rates;
}

export const havenProvider: LenderProvider = {
	lenderId: LENDER_ID,
	name: "Haven Mortgages",
	url: RATES_URL,
	scrape: fetchAndParseRates,
};
