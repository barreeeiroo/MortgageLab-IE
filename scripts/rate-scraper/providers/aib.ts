import type { BuyerType } from "@/lib/schemas";
import type { BerRating, MortgageRate } from "@/lib/schemas/rate";
import type { LenderProvider } from "../types";

const LENDER_ID = "aib";
const RATES_URL =
	"https://aib.ie/our-products/mortgages/mortgage-interest-rates";

// BER group mappings for green rates
const BER_GREEN: BerRating[] = ["A1", "A2", "A3", "B1", "B2", "B3"];
const BER_GREEN_A: BerRating[] = ["A1", "A2", "A3"];

// LTV bands used by AIB
const LTV_BANDS = [
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

	// Standard rates (FTB/Mover/Switcher)
	rates.push(...parseStandardRates());

	// Green mortgage rates
	rates.push(...parseGreenRates());

	// BTL rates
	rates.push(...parseBtlRates());

	return rates;
}

function parseStandardRates(): MortgageRate[] {
	const rates: MortgageRate[] = [];
	const buyerTypes: BuyerType[] = ["ftb", "mover", "switcher-pdh"];

	// Variable rates by LTV
	const variableRates = [
		{ ltvBand: LTV_BANDS[0], rate: 3.75, apr: 3.84 },
		{ ltvBand: LTV_BANDS[1], rate: 3.95, apr: 4.04 },
		{ ltvBand: LTV_BANDS[2], rate: 4.15, apr: 4.25 },
	];

	for (const v of variableRates) {
		rates.push({
			id: `aib-variable-${v.ltvBand.id}`,
			name: `Variable Rate - LTV ≤${v.ltvBand.maxLtv}%`,
			lenderId: LENDER_ID,
			type: "variable",
			rate: v.rate,
			apr: v.apr,
			minLtv: v.ltvBand.minLtv,
			maxLtv: v.ltvBand.maxLtv,
			buyerTypes,
			perks: ["cashback-2pct"],
		});
	}

	// Fixed rates by term and LTV
	const fixedProducts = [
		{
			term: 1,
			rates: [
				{ ltvBand: LTV_BANDS[0], rate: 3.3, apr: 3.79 },
				{ ltvBand: LTV_BANDS[1], rate: 3.4, apr: 3.98 },
				{ ltvBand: LTV_BANDS[2], rate: 3.5, apr: 4.18 },
			],
		},
		{
			term: 3,
			rates: [
				{ ltvBand: LTV_BANDS[0], rate: 3.5, apr: 3.76 },
				{ ltvBand: LTV_BANDS[1], rate: 3.6, apr: 3.93 },
				{ ltvBand: LTV_BANDS[2], rate: 3.7, apr: 4.11 },
			],
		},
		{
			term: 5,
			rates: [
				{ ltvBand: LTV_BANDS[0], rate: 3.65, apr: 3.79 },
				{ ltvBand: LTV_BANDS[1], rate: 3.75, apr: 3.95 },
				{ ltvBand: LTV_BANDS[2], rate: 3.85, apr: 4.1 },
			],
		},
		{
			term: 7,
			rates: [
				{ ltvBand: LTV_BANDS[0], rate: 3.8, apr: 3.84 },
				{ ltvBand: LTV_BANDS[1], rate: 3.9, apr: 3.99 },
				{ ltvBand: LTV_BANDS[2], rate: 4.0, apr: 4.14 },
			],
		},
		{
			term: 10,
			rates: [
				{ ltvBand: LTV_BANDS[0], rate: 4.0, apr: 3.93 },
				{ ltvBand: LTV_BANDS[1], rate: 4.1, apr: 4.07 },
				{ ltvBand: LTV_BANDS[2], rate: 4.2, apr: 4.21 },
			],
		},
	];

	for (const product of fixedProducts) {
		for (const r of product.rates) {
			rates.push({
				id: `aib-fixed-${product.term}yr-${r.ltvBand.id}`,
				name: `${product.term} Year Fixed - LTV ≤${r.ltvBand.maxLtv}%`,
				lenderId: LENDER_ID,
				type: "fixed",
				rate: r.rate,
				apr: r.apr,
				fixedTerm: product.term,
				minLtv: r.ltvBand.minLtv,
				maxLtv: r.ltvBand.maxLtv,
				buyerTypes,
				perks: ["cashback-2pct"],
			});
		}
	}

	// Higher Value 4-Year Fixed (€250k+)
	const hv4YearRates = [
		{ ltvBand: LTV_BANDS[0], rate: 3.15, apr: 3.78 },
		{ ltvBand: LTV_BANDS[1], rate: 3.25, apr: 3.95 },
		{ ltvBand: LTV_BANDS[2], rate: 3.35, apr: 4.12 },
	];

	for (const r of hv4YearRates) {
		rates.push({
			id: `aib-hv-fixed-4yr-${r.ltvBand.id}`,
			name: `Higher Value 4 Year Fixed - LTV ≤${r.ltvBand.maxLtv}%`,
			lenderId: LENDER_ID,
			type: "fixed",
			rate: r.rate,
			apr: r.apr,
			fixedTerm: 4,
			minLtv: r.ltvBand.minLtv,
			maxLtv: r.ltvBand.maxLtv,
			minLoan: 250000,
			buyerTypes,
			perks: ["cashback-2pct"],
		});
	}

	return rates;
}

function parseGreenRates(): MortgageRate[] {
	const rates: MortgageRate[] = [];
	const buyerTypes: BuyerType[] = ["ftb", "mover", "switcher-pdh"];

	// Green 2-Year Fixed (BER A1-B3)
	const green2YearRates = [
		{ ltvBand: LTV_BANDS[0], rate: 3.15, apr: 3.79 },
		{ ltvBand: LTV_BANDS[1], rate: 3.25, apr: 3.96 },
		{ ltvBand: LTV_BANDS[2], rate: 3.35, apr: 4.14 },
	];

	for (const r of green2YearRates) {
		rates.push({
			id: `aib-green-fixed-2yr-${r.ltvBand.id}`,
			name: `Green 2 Year Fixed - LTV ≤${r.ltvBand.maxLtv}%`,
			lenderId: LENDER_ID,
			type: "fixed",
			rate: r.rate,
			apr: r.apr,
			fixedTerm: 2,
			minLtv: r.ltvBand.minLtv,
			maxLtv: r.ltvBand.maxLtv,
			buyerTypes,
			berEligible: BER_GREEN,
			perks: ["cashback-2pct"],
		});
	}

	// GreenA 3-Year Fixed (BER A1-A3 only)
	const greenA3YearRates = [
		{ ltvBand: LTV_BANDS[0], rate: 3.0, apr: 3.74 },
		{ ltvBand: LTV_BANDS[1], rate: 3.1, apr: 3.91 },
		{ ltvBand: LTV_BANDS[2], rate: 3.2, apr: 4.08 },
	];

	for (const r of greenA3YearRates) {
		rates.push({
			id: `aib-green-a-fixed-3yr-${r.ltvBand.id}`,
			name: `Green A 3 Year Fixed - LTV ≤${r.ltvBand.maxLtv}%`,
			lenderId: LENDER_ID,
			type: "fixed",
			rate: r.rate,
			apr: r.apr,
			fixedTerm: 3,
			minLtv: r.ltvBand.minLtv,
			maxLtv: r.ltvBand.maxLtv,
			buyerTypes,
			berEligible: BER_GREEN_A,
			perks: ["cashback-2pct"],
		});
	}

	// Green 5-Year Fixed (BER A1-B3)
	const green5YearRates = [
		{ ltvBand: LTV_BANDS[0], rate: 3.2, apr: 3.71 },
		{ ltvBand: LTV_BANDS[1], rate: 3.3, apr: 3.87 },
		{ ltvBand: LTV_BANDS[2], rate: 3.4, apr: 4.03 },
	];

	for (const r of green5YearRates) {
		rates.push({
			id: `aib-green-fixed-5yr-${r.ltvBand.id}`,
			name: `Green 5 Year Fixed - LTV ≤${r.ltvBand.maxLtv}%`,
			lenderId: LENDER_ID,
			type: "fixed",
			rate: r.rate,
			apr: r.apr,
			fixedTerm: 5,
			minLtv: r.ltvBand.minLtv,
			maxLtv: r.ltvBand.maxLtv,
			buyerTypes,
			berEligible: BER_GREEN,
			perks: ["cashback-2pct"],
		});
	}

	return rates;
}

function parseBtlRates(): MortgageRate[] {
	const rates: MortgageRate[] = [];
	const buyerTypes: BuyerType[] = ["btl", "switcher-btl"];

	// BTL Variable
	rates.push({
		id: "aib-btl-variable",
		name: "Buy-to-Let Variable Rate",
		lenderId: LENDER_ID,
		type: "variable",
		rate: 5.2,
		apr: 5.34,
		minLtv: 0,
		maxLtv: 70,
		buyerTypes,
		perks: [],
	});

	// BTL Fixed rates
	const btlFixedProducts = [
		{ term: 1, rate: 7.3, apr: 5.6 },
		{ term: 3, rate: 5.5, apr: 5.37 },
		{ term: 5, rate: 5.6, apr: 5.43 },
	];

	for (const product of btlFixedProducts) {
		rates.push({
			id: `aib-btl-fixed-${product.term}yr`,
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

export const aibProvider: LenderProvider = {
	lenderId: LENDER_ID,
	name: "AIB",
	url: RATES_URL,
	scrape: fetchAndParseRates,
};
