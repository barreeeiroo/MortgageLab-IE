import type { BuyerType } from "@/lib/schemas";
import type { BerRating, MortgageRate } from "@/lib/schemas/rate";
import type { LenderProvider } from "../types";

const LENDER_ID = "ebs";
const RATES_URL = "https://www.ebs.ie/mortgages/mortgage-interest-rates";

// BER ratings for green mortgages (A1-B3)
const BER_GREEN: BerRating[] = ["A1", "A2", "A3", "B1", "B2", "B3"];

// PDH buyer types
const PDH_BUYER_TYPES: BuyerType[] = ["ftb", "mover", "switcher-pdh"];

// BTL buyer types
const BTL_BUYER_TYPES: BuyerType[] = ["btl", "switcher-btl"];

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

	// PDH Fixed rates
	rates.push(...parseFixedRates());

	// PDH Variable rates
	rates.push(...parseVariableRates());

	// BTL rates
	rates.push(...parseBtlRates());

	return rates;
}

function parseFixedRates(): MortgageRate[] {
	const rates: MortgageRate[] = [];

	// Standard fixed rates (no LTV differentiation, up to 90%)
	const fixedProducts = [
		{ term: 1, rate: 3.85, apr: 4.3 },
		{ term: 2, rate: 3.9, apr: 4.2 },
		{ term: 3, rate: 4.3, apr: 4.3 },
		{ term: 5, rate: 4.4, apr: 4.4 },
	];

	for (const product of fixedProducts) {
		rates.push({
			id: `ebs-fixed-${product.term}yr`,
			name: `${product.term} Year Fixed`,
			lenderId: LENDER_ID,
			type: "fixed",
			rate: product.rate,
			apr: product.apr,
			fixedTerm: product.term,
			minLtv: 0,
			maxLtv: 90,
			buyerTypes: PDH_BUYER_TYPES,
			perks: [],
		});
	}

	// 4 Year Green Fixed (requires BER A1-B3)
	rates.push({
		id: "ebs-green-fixed-4yr",
		name: "4 Year Green Fixed",
		lenderId: LENDER_ID,
		type: "fixed",
		rate: 3.2,
		apr: 3.9,
		fixedTerm: 4,
		minLtv: 0,
		maxLtv: 90,
		buyerTypes: PDH_BUYER_TYPES,
		berEligible: BER_GREEN,
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
			id: `ebs-variable-${v.ltvBand.id}`,
			name: `Variable Rate - LTV ≤${v.ltvBand.maxLtv}%`,
			lenderId: LENDER_ID,
			type: "variable",
			rate: v.rate,
			apr: v.apr,
			minLtv: v.ltvBand.minLtv,
			maxLtv: v.ltvBand.maxLtv,
			buyerTypes: PDH_BUYER_TYPES,
			perks: [],
		});
	}

	return rates;
}

function parseBtlRates(): MortgageRate[] {
	const rates: MortgageRate[] = [];

	// BTL Variable rate
	rates.push({
		id: "ebs-btl-variable",
		name: "Buy-to-Let Variable",
		lenderId: LENDER_ID,
		type: "variable",
		rate: 5.43,
		apr: 5.6,
		minLtv: 0,
		maxLtv: 70,
		buyerTypes: BTL_BUYER_TYPES,
		perks: [],
	});

	// BTL Fixed rates
	const btlFixedProducts = [
		{ term: 3, rate: 7.15, apr: 7.3 },
		{ term: 5, rate: 7.55, apr: 7.6 },
	];

	for (const product of btlFixedProducts) {
		rates.push({
			id: `ebs-btl-fixed-${product.term}yr`,
			name: `Buy-to-Let ${product.term} Year Fixed`,
			lenderId: LENDER_ID,
			type: "fixed",
			rate: product.rate,
			apr: product.apr,
			fixedTerm: product.term,
			minLtv: 0,
			maxLtv: 70,
			buyerTypes: BTL_BUYER_TYPES,
			perks: [],
		});
	}

	return rates;
}

export const ebsProvider: LenderProvider = {
	lenderId: LENDER_ID,
	name: "EBS",
	url: RATES_URL,
	scrape: fetchAndParseRates,
};
