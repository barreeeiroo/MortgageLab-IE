import type { BuyerType } from "@/lib/schemas";
import type { MortgageRate } from "@/lib/schemas/rate";
import type { LenderProvider } from "../types";

const LENDER_ID = "avant";
const RATES_URL = "https://www.avantmoney.ie/mortgages/products-and-rates";

// LTV bands for fixed term rates (4 bands)
const LTV_BANDS_FIXED = [
	{ id: "60", minLtv: 0, maxLtv: 60 },
	{ id: "70", minLtv: 60, maxLtv: 70 },
	{ id: "80", minLtv: 70, maxLtv: 80 },
	{ id: "90", minLtv: 80, maxLtv: 90 },
];

// LTV bands for Flex and One Mortgage (2 bands)
const LTV_BANDS_SIMPLE = [
	{ id: "80", minLtv: 0, maxLtv: 80 },
	{ id: "90", minLtv: 80, maxLtv: 90 },
];

// Avant Money only offers PDH mortgages (no BTL)
const BUYER_TYPES: BuyerType[] = ["ftb", "mover", "switcher-pdh"];

async function fetchAndParseRates(): Promise<MortgageRate[]> {
	console.log("Fetching rates page...");
	const response = await fetch(RATES_URL);
	const _html = await response.text();

	console.log("Parsing HTML content...");

	const rates: MortgageRate[] = [];

	// Flex Mortgage (variable rate)
	rates.push(...parseFlexMortgageRates());

	// Fixed Term rates (3, 4, 5, 7, 10 years)
	rates.push(...parseFixedTermRates());

	// One Mortgage rates (full-term fixed)
	rates.push(...parseOneMortgageRates());

	return rates;
}

function parseFlexMortgageRates(): MortgageRate[] {
	const rates: MortgageRate[] = [];

	// Flex Mortgage - Euribor-linked variable rate
	const flexRates = [
		{ ltvBand: LTV_BANDS_SIMPLE[0], rate: 3.12, apr: 3.19 }, // ≤80%
		{ ltvBand: LTV_BANDS_SIMPLE[1], rate: 3.32, apr: 3.39 }, // >80%
	];

	for (const r of flexRates) {
		rates.push({
			id: `avant-flex-${r.ltvBand.id}`,
			name: `Flex Mortgage - LTV ≤${r.ltvBand.maxLtv}%`,
			lenderId: LENDER_ID,
			type: "variable",
			rate: r.rate,
			apr: r.apr,
			minLtv: r.ltvBand.minLtv,
			maxLtv: r.ltvBand.maxLtv,
			buyerTypes: BUYER_TYPES,
			perks: [], // No cashback on Flex
		});
	}

	return rates;
}

function parseFixedTermRates(): MortgageRate[] {
	const rates: MortgageRate[] = [];

	// Fixed Term products by term
	// Structure: [≤60%, >60-70%, >70-80%, >80-90%]
	const fixedProducts = [
		{
			term: 3,
			rates: [
				{ ltvBand: LTV_BANDS_FIXED[0], rate: 3.6, apr: 3.79 },
				{ ltvBand: LTV_BANDS_FIXED[1], rate: 3.6, apr: 3.79 },
				{ ltvBand: LTV_BANDS_FIXED[2], rate: 3.6, apr: 3.93 },
				{ ltvBand: LTV_BANDS_FIXED[3], rate: 3.95, apr: 4.05 },
			],
		},
		{
			term: 4,
			rates: [
				{ ltvBand: LTV_BANDS_FIXED[0], rate: 3.4, apr: 3.7 },
				{ ltvBand: LTV_BANDS_FIXED[1], rate: 3.4, apr: 3.7 },
				{ ltvBand: LTV_BANDS_FIXED[2], rate: 3.4, apr: 3.82 },
				{ ltvBand: LTV_BANDS_FIXED[3], rate: 3.8, apr: 3.98 },
			],
		},
		{
			term: 5,
			rates: [
				{ ltvBand: LTV_BANDS_FIXED[0], rate: 3.8, apr: 3.86 },
				{ ltvBand: LTV_BANDS_FIXED[1], rate: 3.8, apr: 3.86 },
				{ ltvBand: LTV_BANDS_FIXED[2], rate: 3.8, apr: 3.97 },
				{ ltvBand: LTV_BANDS_FIXED[3], rate: 3.95, apr: 4.05 },
			],
		},
		{
			term: 7,
			rates: [
				{ ltvBand: LTV_BANDS_FIXED[0], rate: 3.8, apr: 3.87 },
				{ ltvBand: LTV_BANDS_FIXED[1], rate: 3.8, apr: 3.87 },
				{ ltvBand: LTV_BANDS_FIXED[2], rate: 3.8, apr: 3.95 },
				{ ltvBand: LTV_BANDS_FIXED[3], rate: 3.95, apr: 4.05 },
			],
		},
		{
			term: 10,
			rates: [
				{ ltvBand: LTV_BANDS_FIXED[0], rate: 3.8, apr: 3.88 },
				{ ltvBand: LTV_BANDS_FIXED[1], rate: 3.8, apr: 3.88 },
				{ ltvBand: LTV_BANDS_FIXED[2], rate: 3.8, apr: 3.92 },
				{ ltvBand: LTV_BANDS_FIXED[3], rate: 3.95, apr: 4.05 },
			],
		},
	];

	for (const product of fixedProducts) {
		for (const r of product.rates) {
			rates.push({
				id: `avant-fixed-${product.term}yr-${r.ltvBand.id}`,
				name: `${product.term} Year Fixed - LTV ≤${r.ltvBand.maxLtv}%`,
				lenderId: LENDER_ID,
				type: "fixed",
				rate: r.rate,
				apr: r.apr,
				fixedTerm: product.term,
				minLtv: r.ltvBand.minLtv,
				maxLtv: r.ltvBand.maxLtv,
				buyerTypes: BUYER_TYPES,
				perks: ["cashback-1pct"],
			});
		}
	}

	return rates;
}

function parseOneMortgageRates(): MortgageRate[] {
	const rates: MortgageRate[] = [];

	// One Mortgage - fixed for full term (up to 15, 20, 25, 30 years)
	// Rates are simpler - same for ≤80%, higher for >80%
	const oneProducts = [
		{
			term: 15,
			rates: [
				{ ltvBand: LTV_BANDS_SIMPLE[0], rate: 3.4, apr: 3.48 },
				{ ltvBand: LTV_BANDS_SIMPLE[1], rate: 3.8, apr: 3.9 },
			],
		},
		{
			term: 20,
			rates: [
				{ ltvBand: LTV_BANDS_SIMPLE[0], rate: 3.4, apr: 3.48 },
				{ ltvBand: LTV_BANDS_SIMPLE[1], rate: 3.8, apr: 3.89 },
			],
		},
		{
			term: 25,
			rates: [
				{ ltvBand: LTV_BANDS_SIMPLE[0], rate: 3.4, apr: 3.47 },
				{ ltvBand: LTV_BANDS_SIMPLE[1], rate: 3.8, apr: 3.89 },
			],
		},
		{
			term: 30,
			rates: [
				{ ltvBand: LTV_BANDS_SIMPLE[0], rate: 3.4, apr: 3.47 },
				{ ltvBand: LTV_BANDS_SIMPLE[1], rate: 3.8, apr: 3.88 },
			],
		},
	];

	for (const product of oneProducts) {
		for (const r of product.rates) {
			rates.push({
				id: `avant-one-${product.term}yr-${r.ltvBand.id}`,
				name: `One Mortgage ${product.term} Year - LTV ≤${r.ltvBand.maxLtv}%`,
				lenderId: LENDER_ID,
				type: "fixed",
				rate: r.rate,
				apr: r.apr,
				fixedTerm: product.term,
				minLtv: r.ltvBand.minLtv,
				maxLtv: r.ltvBand.maxLtv,
				buyerTypes: BUYER_TYPES,
				perks: ["cashback-1pct"],
			});
		}
	}

	return rates;
}

export const avantProvider: LenderProvider = {
	lenderId: LENDER_ID,
	name: "Avant Money",
	url: RATES_URL,
	scrape: fetchAndParseRates,
};
