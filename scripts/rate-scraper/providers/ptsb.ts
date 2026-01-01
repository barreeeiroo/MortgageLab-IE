import * as cheerio from "cheerio";
import { GREEN_BER_RATINGS } from "@/lib/constants/ber";
import type { BuyerType } from "@/lib/schemas";
import type { MortgageRate } from "@/lib/schemas/rate";
import {
	parseLtvFromName,
	parsePercentageOrThrow,
	parseTermFromText,
} from "../lib/parsing";
import type { LenderProvider } from "../types";

const LENDER_ID = "ptsb";
const RATES_URL = "https://www.ptsb.ie/mortgages/mortgage-interest-rates/";

const PDH_BUYER_TYPES: BuyerType[] = ["ftb", "mover", "switcher-pdh"];
const BTL_BUYER_TYPES: BuyerType[] = ["btl", "switcher-btl"];

interface ParsedRow {
	name: string;
	term?: number;
	rate: number;
	apr: number;
	minLtv: number;
	maxLtv: number;
	isGreen: boolean;
	isVariable: boolean;
	excludesCashback: boolean;
}

function parseTableRow(
	$: cheerio.CheerioAPI,
	row: cheerio.Element,
): ParsedRow | null {
	const cells = $(row).find("td").toArray();
	if (cells.length < 3) return null;

	const name = $(cells[0]).text().trim();
	const rateText = $(cells[1]).text().trim();
	const aprText = $(cells[2]).text().trim();

	// Skip header rows, empty rows, or sub-section headers
	if (
		!name ||
		!rateText.includes("%") ||
		rateText.toLowerCase().includes("rate") ||
		rateText.toLowerCase().includes("borrowing") ||
		$(row).find("td[colspan]").length > 0
	) {
		return null;
	}

	try {
		const rate = parsePercentageOrThrow(rateText);
		const apr = parsePercentageOrThrow(aprText);
		const term = parseTermFromText(name) ?? undefined;
		const { minLtv, maxLtv } = parseLtvFromName(name);
		const lowerName = name.toLowerCase();

		return {
			name,
			term,
			rate,
			apr,
			minLtv,
			maxLtv,
			isGreen: lowerName.includes("green"),
			isVariable: lowerName.includes("variable"),
			// 4 Year Fixed and Green rates exclude cashback
			excludesCashback:
				lowerName.includes("4 year") ||
				lowerName.includes("green") ||
				lowerName.includes("*"),
		};
	} catch {
		return null;
	}
}

async function fetchAndParseRates(): Promise<MortgageRate[]> {
	console.log("Fetching rates page...");
	const response = await fetch(RATES_URL);
	const html = await response.text();

	console.log("Parsing HTML content with Cheerio...");
	const $ = cheerio.load(html);

	// Use a Map to deduplicate rates by ID
	const ratesMap = new Map<string, MortgageRate>();

	// Track whether we've hit the "Existing Mortgage Customers" section
	let hitExistingSection = false;

	// Find all h4 headings and process each section
	$("h4").each((_, heading) => {
		const headingText = $(heading).text().toLowerCase();

		// Stop processing when we hit existing customers section
		if (headingText.includes("existing")) {
			hitExistingSection = true;
			return false; // Break the each loop
		}

		if (hitExistingSection) return;

		// Find the table following this heading
		const table = $(heading).nextAll("table").first();
		if (!table.length) return;

		// Determine section type from heading
		const isHighValueSection = headingText.includes("high value");
		const isVariableSection =
			headingText.includes("variable") && !headingText.includes("buy to let");
		const isBtlSection =
			headingText.includes("buy to let") || headingText.includes("btl");

		// For BTL section, track sub-sections within the table
		let btlSubSection: "variable" | "fixed" | null = null;

		$(table)
			.find("tbody tr")
			.each((_, row) => {
				// Check for BTL sub-section headers
				const colspan = $(row).find("td[colspan]");
				if (colspan.length > 0) {
					const subHeading = colspan.text().toLowerCase();
					if (subHeading.includes("variable")) {
						btlSubSection = "variable";
					} else if (subHeading.includes("fixed")) {
						btlSubSection = "fixed";
					}
					return; // Skip sub-heading rows
				}

				const parsed = parseTableRow($, row);
				if (!parsed) return;

				// Determine if this is a variable rate
				// Variable section rates are variable even without "variable" in name
				// BTL variable sub-section rates are variable
				const isVariable =
					parsed.isVariable ||
					isVariableSection ||
					(isBtlSection && btlSubSection === "variable");

				const isBtl = isBtlSection;
				const isHighValue = isHighValueSection;
				const buyerTypes = isBtl ? BTL_BUYER_TYPES : PDH_BUYER_TYPES;

				// Generate unique ID
				const idParts = [LENDER_ID];
				if (isBtl) idParts.push("btl");
				if (isHighValue) idParts.push("hv");
				if (parsed.isGreen) idParts.push("green");

				if (isVariable) {
					idParts.push("variable");
					idParts.push(String(parsed.maxLtv));
				} else if (parsed.term) {
					idParts.push("fixed");
					idParts.push(`${parsed.term}yr`);
					idParts.push(String(parsed.maxLtv));
				}

				// Generate display name
				const nameParts: string[] = [];
				if (isHighValue) nameParts.push("High Value");
				if (parsed.isGreen) nameParts.push("Green");
				if (isBtl) nameParts.push("Buy-to-Let");

				if (isVariable) {
					nameParts.push("Managed Variable Rate");
				} else if (parsed.term) {
					nameParts.push(`${parsed.term} Year Fixed`);
				}

				nameParts.push(`- LTV ≤${parsed.maxLtv}%`);

				// Determine perks (cashback)
				// PTSB: 2% cashback for PDH new business, excludes 4 Year Fixed and Green
				const hasCashback =
					!parsed.excludesCashback && !isVariable && !isBtl && !isHighValue;

				// High Value non-green rates get cashback
				const hasHighValueCashback =
					isHighValue && !parsed.isGreen && !isVariable;

				const mortgageRate: MortgageRate = {
					id: idParts.join("-"),
					name: nameParts.join(" "),
					lenderId: LENDER_ID,
					type: isVariable ? "variable" : "fixed",
					rate: parsed.rate,
					apr: parsed.apr,
					fixedTerm: isVariable ? undefined : parsed.term,
					minLtv: parsed.minLtv,
					maxLtv: parsed.maxLtv,
					minLoan: isHighValue ? 250000 : undefined,
					buyerTypes,
					berEligible: parsed.isGreen ? GREEN_BER_RATINGS : undefined,
					perks: hasCashback || hasHighValueCashback ? ["cashback-2pct"] : [],
				};

				ratesMap.set(mortgageRate.id, mortgageRate);
			});
	});

	const rates = Array.from(ratesMap.values());
	console.log(`Parsed ${rates.length} unique rates from HTML`);
	return rates;
}

export const ptsbProvider: LenderProvider = {
	lenderId: LENDER_ID,
	name: "Permanent TSB",
	url: RATES_URL,
	scrape: fetchAndParseRates,
};
