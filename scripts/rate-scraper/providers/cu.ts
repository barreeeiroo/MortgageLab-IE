import type { BuyerType } from "@/lib/schemas";
import type { MortgageRate } from "@/lib/schemas/rate";
import type { LenderProvider } from "../types";

const LENDER_ID = "cu";
const RATES_URL = "https://creditunionmortgages.com/our-mortgage/";

// Credit Union Mortgages only offers PDH mortgages (no BTL)
const BUYER_TYPES: BuyerType[] = ["ftb", "mover", "switcher-pdh"];

async function fetchAndParseRates(): Promise<MortgageRate[]> {
	console.log("Fetching rates page...");
	const response = await fetch(RATES_URL);
	const _html = await response.text();

	console.log("Parsing HTML content...");

	const rates: MortgageRate[] = [];

	// Credit Union offers a single Capped Variable Rate product
	rates.push(...parseCappedVariableRate());

	return rates;
}

function parseCappedVariableRate(): MortgageRate[] {
	// Credit Union Mortgages offers one main product:
	// Capped Variable Rate at 3.85% (APR 3.92%)
	// Capped at 4.40% (APRC 4.5%) for 3 years
	// Max LTV: 90%
	// No LTV tiers - same rate for all LTV up to 90%

	return [
		{
			id: "cu-capped-variable",
			name: "Capped Variable Rate (3yr cap)",
			lenderId: LENDER_ID,
			type: "variable",
			rate: 3.85,
			apr: 3.92,
			minLtv: 0,
			maxLtv: 90,
			buyerTypes: BUYER_TYPES,
			perks: [],
		},
	];
}

export const cuProvider: LenderProvider = {
	lenderId: LENDER_ID,
	name: "Credit Union Mortgages",
	url: RATES_URL,
	scrape: fetchAndParseRates,
};
