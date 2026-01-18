import * as cheerio from "cheerio";
import type { BuyerType } from "@/lib/schemas/buyer";
import type { MortgageRate } from "@/lib/schemas/rate";
import type {
	HistoricalLenderProvider,
	StructureValidation,
} from "../utils/types";

const LENDER_ID = "cu";
const RATES_URL = "https://creditunionmortgages.com/our-mortgage/";

// Credit Union Mortgages only offers PDH mortgages (no BTL)
const BUYER_TYPES: BuyerType[] = ["ftb", "mover", "switcher-pdh"];

/**
 * Parse rates from HTML content.
 * Separated from fetch for historical scraping support.
 * Note: CU has a very loose structure, parsing is based on text patterns.
 */
function parseRatesFromHtml(html: string): MortgageRate[] {
	const $ = cheerio.load(html);
	const rates: MortgageRate[] = [];
	const pageText = $("body").text();

	// Credit Union has a simple product - Capped Variable Rate
	// Look for rate patterns in the page text

	// Try to find the main rate (usually displayed prominently)
	let mainRate: number | null = null;
	let apr: number | null = null;

	// Look for patterns like "3.85%" or "Rate: 3.85%"
	$("*").each((_, element) => {
		const text = $(element).text();

		// Look for the main interest rate
		const rateMatch = text.match(
			/(?:interest rate|current rate|rate)[:\s]*(\d+\.?\d*)%/i,
		);
		if (rateMatch && !mainRate) {
			mainRate = Number.parseFloat(rateMatch[1]);
		}

		// Look for APR
		const aprMatch = text.match(/(?:APR|APRC)[:\s]*(\d+\.?\d*)%/i);
		if (aprMatch && !apr) {
			apr = Number.parseFloat(aprMatch[1]);
		}
	});

	// Also check for rates in specific containers
	$(".rate, .interest-rate, [class*='rate']").each((_, element) => {
		const text = $(element).text();
		const match = text.match(/(\d+\.?\d*)%/);
		if (match && !mainRate) {
			mainRate = Number.parseFloat(match[1]);
		}
	});

	// Look for rate in page text if not found
	if (!mainRate) {
		const ratePatterns = [
			/capped\s+(?:variable\s+)?rate[:\s]*(\d+\.?\d*)%/i,
			/(\d+\.?\d*)%\s*(?:interest|capped|variable)/i,
			/rate\s+(?:of\s+)?(\d+\.?\d*)%/i,
		];

		for (const pattern of ratePatterns) {
			const match = pageText.match(pattern);
			if (match) {
				mainRate = Number.parseFloat(match[1]);
				break;
			}
		}
	}

	if (!apr) {
		const aprPatterns = [/APR[:\s]*(\d+\.?\d*)%/i, /(\d+\.?\d*)%\s*APR/i];

		for (const pattern of aprPatterns) {
			const match = pageText.match(pattern);
			if (match) {
				apr = Number.parseFloat(match[1]);
				break;
			}
		}
	}

	// If we found rates, create the mortgage rate entry
	if (mainRate) {
		rates.push({
			id: "cu-capped-variable",
			name: "Capped Variable Rate (3yr cap)",
			lenderId: LENDER_ID,
			type: "variable",
			rate: mainRate,
			apr: apr || mainRate + 0.07, // Estimate APR if not found
			minLtv: 0,
			maxLtv: 90,
			buyerTypes: BUYER_TYPES,
			perks: [],
		});
	}

	return rates;
}

/**
 * Validate that the HTML structure matches what we expect.
 * CU has minimal structure - we just check for percentage patterns.
 */
function validateStructure(html: string): StructureValidation {
	const $ = cheerio.load(html);
	const pageText = $("body").text();

	// Check for any percentage values (rate indicators)
	if (!pageText.match(/\d+\.?\d*%/)) {
		return { valid: false, error: "No percentage values found on page" };
	}

	// Check for mortgage-related content
	const lowerText = pageText.toLowerCase();
	if (!lowerText.includes("mortgage") && !lowerText.includes("rate")) {
		return { valid: false, error: "No mortgage-related content found" };
	}

	return { valid: true };
}

async function fetchAndParseRates(): Promise<MortgageRate[]> {
	console.log("Fetching rates page...");
	const response = await fetch(RATES_URL);
	const html = await response.text();

	console.log("Parsing HTML content with Cheerio...");
	const rates = parseRatesFromHtml(html);
	console.log(`Parsed ${rates.length} rates from HTML`);

	if (rates.length === 0) {
		console.warn(
			"Warning: No rates found. Credit Union website structure may have changed.",
		);
	}

	return rates;
}

export const cuProvider: HistoricalLenderProvider = {
	lenderId: LENDER_ID,
	name: "Credit Union Mortgages",
	url: RATES_URL,
	scrape: fetchAndParseRates,
	parseHtml: async (html: string) => parseRatesFromHtml(html),
	validateStructure,
};
