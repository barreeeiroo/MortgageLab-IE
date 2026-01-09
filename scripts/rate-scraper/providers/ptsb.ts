import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import { GREEN_BER_RATINGS } from "@/lib/constants/ber";
import type { BuyerType } from "@/lib/schemas/buyer";
import type { MortgageRate, RateType } from "@/lib/schemas/rate";
import {
	parseLtvFromName,
	parsePercentageOrThrow,
	parseTermFromText,
} from "../parsing.ts";
import type { LenderProvider } from "../types";

const LENDER_ID = "ptsb";
const RATES_URL = "https://www.ptsb.ie/mortgages/mortgage-interest-rates/";

const PDH_NEW_BUYER_TYPES: BuyerType[] = ["ftb", "mover", "switcher-pdh"];
const PDH_EXISTING_BUYER_TYPES: BuyerType[] = ["switcher-pdh"];
const BTL_NEW_BUYER_TYPES: BuyerType[] = ["btl", "switcher-btl"];
const BTL_EXISTING_BUYER_TYPES: BuyerType[] = ["switcher-btl"];

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

function parseTableRow($: cheerio.CheerioAPI, row: Element): ParsedRow | null {
	const cells = $(row).find("td").toArray();
	if (cells.length < 3) return null;

	const name = $(cells[0]).text().trim();
	const rateText = $(cells[1]).text().trim();
	const aprText = $(cells[2]).text().trim();

	// Skip header rows, empty rows, sub-section headers, and legacy SVR rates
	if (
		!name ||
		!rateText.includes("%") ||
		rateText.toLowerCase().includes("rate") ||
		rateText.toLowerCase().includes("borrowing") ||
		$(row).find("td[colspan]").length > 0 ||
		name.toLowerCase().includes("svr") // Skip legacy Standard Variable Rate rows
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

	// Track whether we're in the existing customers section
	let isExistingSection = false;
	let isExistingBtlSection = false;

	// Find all h4 headings and process each section
	$("h4").each((_, heading) => {
		const headingText = $(heading).text().toLowerCase();

		// Skip irrelevant sections
		if (
			headingText.includes("commercial") ||
			headingText.includes("ulster bank")
		) {
			return;
		}

		// Track section transitions
		if (headingText.includes("existing") && headingText.includes("btl")) {
			isExistingBtlSection = true;
			isExistingSection = true;
		} else if (headingText.includes("existing")) {
			isExistingSection = true;
			isExistingBtlSection = false;
		}

		// Find the table following this heading
		const table = $(heading).nextAll("table").first();
		if (!table.length) return;

		// Determine section type from heading
		const isHighValueSection = headingText.includes("high value");
		const isVariableSection =
			headingText.includes("variable") && !headingText.includes("buy to let");
		const isBtlSection =
			headingText.includes("buy to let") ||
			headingText.includes("btl") ||
			isExistingBtlSection;

		// Track sub-sections within the table (for BTL and existing customer MVR rates)
		let tableSubSection: RateType | null = null;

		$(table)
			.find("tbody tr")
			.each((_, row) => {
				// Check for sub-section headers (colspan rows)
				const colspan = $(row).find("td[colspan]");
				if (colspan.length > 0) {
					const subHeading = colspan.text().toLowerCase();
					if (subHeading.includes("variable")) {
						tableSubSection = "variable";
					} else if (subHeading.includes("fixed")) {
						tableSubSection = "fixed";
					}
					return; // Skip sub-heading rows
				}

				const parsed = parseTableRow($, row);
				if (!parsed) return;

				// Determine if this is a variable rate
				// Variable section rates are variable even without "variable" in name
				// Sub-section variable rates are variable
				const isVariable =
					parsed.isVariable ||
					isVariableSection ||
					tableSubSection === "variable";

				const isBtl = isBtlSection;
				const isHighValue = isHighValueSection;
				const isNewBusiness = !isExistingSection;

				// Determine buyer types based on section
				let buyerTypes: BuyerType[];
				if (isBtl) {
					buyerTypes = isNewBusiness
						? BTL_NEW_BUYER_TYPES
						: BTL_EXISTING_BUYER_TYPES;
				} else {
					buyerTypes = isNewBusiness
						? PDH_NEW_BUYER_TYPES
						: PDH_EXISTING_BUYER_TYPES;
				}

				// Generate unique ID
				const idParts = [LENDER_ID];
				if (!isNewBusiness) idParts.push("existing");
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
				// PTSB: 2% cashback for PDH new business only, excludes 4 Year Fixed and Green
				const hasCashback =
					isNewBusiness &&
					!parsed.excludesCashback &&
					!isVariable &&
					!isBtl &&
					!isHighValue;

				// High Value non-green new business rates get cashback
				const hasHighValueCashback =
					isNewBusiness && isHighValue && !parsed.isGreen && !isVariable;

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
					newBusiness: isNewBusiness,
				};

				ratesMap.set(mortgageRate.id, mortgageRate);
			});
	});

	// Also process standalone MVR table (existing customer variable rates without h4 heading)
	// This table contains "Existing Business Managed Variable Rate (MVRs)" colspan
	$("table").each((_, table) => {
		const tableHtml = $(table).html() || "";
		if (
			!tableHtml.toLowerCase().includes("existing business managed variable")
		) {
			return;
		}

		// This is the existing customer MVR table
		let inMvrSection = false;

		$(table)
			.find("tbody tr")
			.each((_, row) => {
				const colspan = $(row).find("td[colspan]");
				if (colspan.length > 0) {
					const subHeading = colspan.text().toLowerCase();
					if (subHeading.includes("variable")) {
						inMvrSection = true;
					}
					return;
				}

				if (!inMvrSection) return;

				const parsed = parseTableRow($, row);
				if (!parsed) return;

				const idParts = [
					LENDER_ID,
					"existing",
					"variable",
					String(parsed.maxLtv),
				];
				const nameParts = ["Managed Variable Rate", `- LTV ≤${parsed.maxLtv}%`];

				const mortgageRate: MortgageRate = {
					id: idParts.join("-"),
					name: nameParts.join(" "),
					lenderId: LENDER_ID,
					type: "variable",
					rate: parsed.rate,
					apr: parsed.apr,
					minLtv: parsed.minLtv,
					maxLtv: parsed.maxLtv,
					buyerTypes: PDH_EXISTING_BUYER_TYPES,
					perks: [],
					newBusiness: false,
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
