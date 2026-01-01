import * as cheerio from "cheerio";
import type { BuyerType, MortgageRate } from "@/lib/schemas";
import { parseTermFromText } from "../lib/parsing";
import type { LenderProvider } from "../types";

const LENDER_ID = "boi";
const RATES_URL =
	"https://personalbanking.bankofireland.com/borrow/mortgages/mortgage-interest-rates/";

// BER group mappings
const BER_GROUPS: Record<string, string[]> = {
	A: ["A1", "A2", "A3"],
	B: ["B1", "B2", "B3"],
	C: ["C1", "C2", "C3"],
	D: ["D1", "D2"],
	E: ["E1", "E2"],
	F: ["F"],
	G: ["G"],
	Exempt: ["Exempt"],
};

const PDH_NEW_BUYER_TYPES: BuyerType[] = ["ftb", "mover", "switcher-pdh"];
const PDH_EXISTING_BUYER_TYPES: BuyerType[] = ["switcher-pdh"];
const BTL_NEW_BUYER_TYPES: BuyerType[] = ["btl"];
const BTL_EXISTING_BUYER_TYPES: BuyerType[] = ["switcher-btl"];

function normalizeBer(ber: string): string | null {
	const upper = ber.toUpperCase().trim();
	if (upper === "NO BER") return null;
	if (upper === "BER EXEMPT" || upper === "EXEMPT") return "Exempt";
	if (/^[A-G]$/.test(upper)) return upper;
	return null;
}

interface ParsedRow {
	buyerType: string;
	ber: string | null;
	description: string;
	rateType: string;
	rate: number;
	apr: number;
	term?: number;
	isHvm: boolean;
	isBtl: boolean;
	isVariable: boolean;
	isExisting: boolean;
}

function parseMainTableRow(
	$: cheerio.CheerioAPI,
	row: cheerio.Element,
): ParsedRow | null {
	const cells = $(row).find("td").toArray();
	// Main table has 6 columns: buyer type, BER, description, rate type, rate, apr
	if (cells.length < 6) return null;

	const buyerType = $(cells[0]).text().trim();
	const berText = $(cells[1]).text().trim();
	const description = $(cells[2]).text().trim();
	const rateType = $(cells[3]).text().trim().toLowerCase();
	const rateText = $(cells[4]).text().trim();
	const aprText = $(cells[5]).text().trim();

	// Skip header rows or invalid rows
	if (!buyerType || !description || !rateText) return null;
	if (buyerType.toLowerCase().includes("mortgage type")) return null;

	// Rate should be numeric (without %)
	const rate = Number.parseFloat(rateText);
	const apr = Number.parseFloat(aprText);
	if (Number.isNaN(rate) || Number.isNaN(apr)) return null;

	const term = parseTermFromText(description) ?? undefined;
	const ber = normalizeBer(berText);
	const lowerDesc = description.toLowerCase();
	const lowerBuyer = buyerType.toLowerCase();

	return {
		buyerType,
		ber,
		description,
		rateType,
		rate,
		apr,
		term,
		isHvm: lowerDesc.includes("hvm"),
		isBtl: lowerDesc.includes("btl") || lowerBuyer.includes("investor"),
		isVariable: rateType === "variable" || lowerDesc.includes("variable"),
		isExisting: lowerBuyer.includes("existing"),
	};
}

async function fetchAndParseRates(): Promise<MortgageRate[]> {
	console.log("Fetching rates page...");
	const response = await fetch(RATES_URL);
	const html = await response.text();

	console.log("Parsing HTML content with Cheerio...");
	const $ = cheerio.load(html);

	// Use a Map to deduplicate rates by ID
	const ratesMap = new Map<string, MortgageRate>();

	// Find the main data table (first table with 6+ columns)
	$("table").each((_, table) => {
		const firstRow = $(table).find("tr").first();
		const colCount = firstRow.find("td, th").length;

		// Only process the main data table with 6 columns
		if (colCount < 6) return;

		$(table)
			.find("tr")
			.each((_, row) => {
				const parsed = parseMainTableRow($, row);
				if (!parsed) return;

				// Skip "No BER" entries as they're duplicates of Exempt
				if (parsed.ber === null) return;

				const isBtl = parsed.isBtl;
				const isExisting = parsed.isExisting;
				const isHvm = parsed.isHvm;

				// Determine buyer types
				let buyerTypes: BuyerType[];
				if (isBtl) {
					buyerTypes = isExisting
						? BTL_EXISTING_BUYER_TYPES
						: BTL_NEW_BUYER_TYPES;
				} else {
					buyerTypes = isExisting
						? PDH_EXISTING_BUYER_TYPES
						: PDH_NEW_BUYER_TYPES;
				}

				// Generate unique ID
				const idParts = [LENDER_ID];
				if (isBtl) idParts.push("btl");
				if (isExisting) idParts.push("existing");
				if (isHvm) idParts.push("hvm");
				if (parsed.isVariable) {
					idParts.push("variable");
				} else if (parsed.term) {
					idParts.push("fixed", `${parsed.term}yr`);
				}
				if (parsed.ber) {
					idParts.push("ber", parsed.ber.toLowerCase());
				}

				// Generate name
				const nameParts: string[] = [];
				if (isBtl) nameParts.push("Buy-to-Let");
				if (isExisting) nameParts.push("Existing");
				if (isHvm) nameParts.push("High Value");
				if (parsed.isVariable) {
					nameParts.push("Variable Rate");
				} else if (parsed.term) {
					nameParts.push(`${parsed.term} Year Fixed`);
				}
				if (parsed.ber) {
					nameParts.push(`- BER ${parsed.ber}`);
				}

				const mortgageRate: MortgageRate = {
					id: idParts.join("-"),
					name: nameParts.join(" ") || parsed.description,
					lenderId: LENDER_ID,
					type: parsed.isVariable ? "variable" : "fixed",
					rate: parsed.rate,
					apr: parsed.apr,
					fixedTerm: parsed.isVariable ? undefined : parsed.term,
					minLtv: 0,
					maxLtv: isBtl ? 70 : 90,
					minLoan: isHvm ? 250000 : undefined,
					buyerTypes,
					berEligible: parsed.ber ? BER_GROUPS[parsed.ber] : undefined,
					newBusiness: !isExisting,
					perks:
						!isBtl && !isExisting && !parsed.isVariable
							? ["cashback-3pct"]
							: [],
				};

				ratesMap.set(mortgageRate.id, mortgageRate);
			});
	});

	const rates = Array.from(ratesMap.values());
	console.log(`Parsed ${rates.length} unique rates from HTML`);
	return rates;
}

export const boiProvider: LenderProvider = {
	lenderId: LENDER_ID,
	name: "Bank of Ireland",
	url: RATES_URL,
	scrape: fetchAndParseRates,
};
