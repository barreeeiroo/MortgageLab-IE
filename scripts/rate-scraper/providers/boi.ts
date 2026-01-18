import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type { BerRating } from "@/lib/constants/ber";
import type { BuyerType } from "@/lib/schemas/buyer";
import type { MortgageRate } from "@/lib/schemas/rate";
import { parseTermFromText } from "../utils/parsing";
import type {
	HistoricalLenderProvider,
	StructureValidation,
} from "../utils/types";

const LENDER_ID = "boi";
const RATES_URL =
	"https://personalbanking.bankofireland.com/borrow/mortgages/mortgage-interest-rates/";

// Legacy URL used before ~2025
const LEGACY_RATES_URL =
	"https://personalbanking.bankofireland.com/borrow/mortgages/rate-table/";

// BER group mappings
const BER_GROUPS: Record<string, BerRating[]> = {
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

// Legacy format (pre-2025) has LTV instead of BER
interface LegacyParsedRow {
	buyerType: string;
	ltv: string;
	description: string;
	rateType: string;
	rate: number;
	apr: number;
	term?: number;
	minLtv: number;
	maxLtv: number;
	isBtl: boolean;
	isVariable: boolean;
}

/**
 * Parse LTV range from legacy format strings like "<=60%", "61%-80%", ">80%"
 */
function parseLtvRange(ltv: string): { minLtv: number; maxLtv: number } {
	const cleaned = ltv.replace(/\s/g, "").replace(/%/g, "");

	if (cleaned.includes("<=60") || cleaned.includes("≤60")) {
		return { minLtv: 0, maxLtv: 60 };
	}
	if (cleaned.includes("61-80") || cleaned.includes("61%-80")) {
		return { minLtv: 60, maxLtv: 80 };
	}
	if (cleaned.includes(">80") || cleaned.includes("&gt;80")) {
		return { minLtv: 80, maxLtv: 90 };
	}
	// Default to full range
	return { minLtv: 0, maxLtv: 90 };
}

function parseMainTableRow(
	$: cheerio.CheerioAPI,
	row: Element,
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

/**
 * Parse a row from the legacy rate-table format (pre-2025).
 * Columns: buyer type, LTV, description, rate type, rate, apr
 */
function parseLegacyTableRow(
	$: cheerio.CheerioAPI,
	row: Element,
): LegacyParsedRow | null {
	const cells = $(row).find("td").toArray();
	if (cells.length < 6) return null;

	const buyerType = $(cells[0]).text().trim();
	const ltvText = $(cells[1]).text().trim();
	const description = $(cells[2]).text().trim();
	const rateType = $(cells[3]).text().trim().toLowerCase();
	const rateText = $(cells[4]).text().trim();
	const aprText = $(cells[5]).text().trim();

	// Skip header rows or invalid rows
	if (!buyerType || !description || !rateText) return null;
	if (buyerType.toLowerCase().includes("mortgage type")) return null;

	const rate = Number.parseFloat(rateText);
	const apr = Number.parseFloat(aprText);
	if (Number.isNaN(rate) || Number.isNaN(apr)) return null;

	const { minLtv, maxLtv } = parseLtvRange(ltvText);
	const term = parseTermFromText(description) ?? undefined;
	const lowerDesc = description.toLowerCase();
	const lowerBuyer = buyerType.toLowerCase();

	return {
		buyerType,
		ltv: ltvText,
		description,
		rateType,
		rate,
		apr,
		term,
		minLtv,
		maxLtv,
		isBtl: lowerDesc.includes("btl") || lowerBuyer.includes("investor"),
		isVariable: rateType === "variable" || lowerDesc.includes("variable"),
	};
}

/**
 * Parse rates from legacy rate-table HTML (pre-2025 format).
 * This format has LTV tiers instead of BER ratings.
 */
function parseLegacyRatesFromHtml(html: string): MortgageRate[] {
	const $ = cheerio.load(html);
	const ratesMap = new Map<string, MortgageRate>();

	$("table").each((_, table) => {
		const firstRow = $(table).find("tr").first();
		const colCount = firstRow.find("td, th").length;
		if (colCount < 6) return;

		$(table)
			.find("tr")
			.each((_, row) => {
				const parsed = parseLegacyTableRow($, row);
				if (!parsed) return;

				const isBtl = parsed.isBtl;
				const lowerBuyer = parsed.buyerType.toLowerCase();

				// Determine buyer types based on buyer type column
				let buyerTypes: BuyerType[];
				if (isBtl) {
					buyerTypes = BTL_NEW_BUYER_TYPES;
				} else if (lowerBuyer.includes("first time")) {
					buyerTypes = ["ftb"];
				} else if (
					lowerBuyer.includes("mover") ||
					lowerBuyer.includes("home mover")
				) {
					buyerTypes = ["mover"];
				} else if (lowerBuyer.includes("switcher")) {
					buyerTypes = ["switcher-pdh"];
				} else {
					// Default to all PDH types
					buyerTypes = PDH_NEW_BUYER_TYPES;
				}

				// Generate unique ID
				const idParts = [LENDER_ID];
				if (isBtl) idParts.push("btl");
				if (parsed.isVariable) {
					idParts.push("variable");
				} else if (parsed.term) {
					idParts.push("fixed", `${parsed.term}yr`);
				}
				idParts.push(String(parsed.maxLtv));

				// Generate name
				const nameParts: string[] = [];
				if (isBtl) nameParts.push("Buy-to-Let");
				if (parsed.isVariable) {
					nameParts.push("Variable Rate");
				} else if (parsed.term) {
					nameParts.push(`${parsed.term} Year Fixed`);
				}
				nameParts.push(`- LTV ≤${parsed.maxLtv}%`);

				const mortgageRate: MortgageRate = {
					id: idParts.join("-"),
					name: nameParts.join(" ") || parsed.description,
					lenderId: LENDER_ID,
					type: parsed.isVariable ? "variable" : "fixed",
					rate: parsed.rate,
					apr: parsed.apr,
					fixedTerm: parsed.isVariable ? undefined : parsed.term,
					minLtv: parsed.minLtv,
					maxLtv: parsed.maxLtv,
					buyerTypes,
					newBusiness: true,
					perks: [],
				};

				// Use composite key for deduplication (rate might appear for multiple buyer types)
				const key = `${mortgageRate.id}-${buyerTypes.join(",")}`;
				if (!ratesMap.has(key)) {
					ratesMap.set(key, mortgageRate);
				}
			});
	});

	// Merge rates with same ID but different buyer types
	const mergedRates = new Map<string, MortgageRate>();
	for (const rate of ratesMap.values()) {
		const existing = mergedRates.get(rate.id);
		if (existing) {
			// Merge buyer types
			const allBuyerTypes = new Set([
				...existing.buyerTypes,
				...rate.buyerTypes,
			]);
			existing.buyerTypes = Array.from(allBuyerTypes) as BuyerType[];
		} else {
			mergedRates.set(rate.id, { ...rate });
		}
	}

	return Array.from(mergedRates.values());
}

/**
 * Validate structure for legacy rate-table format.
 */
function validateLegacyStructure(html: string): StructureValidation {
	const $ = cheerio.load(html);

	const tables = $("table");
	if (tables.length === 0) {
		return { valid: false, error: "No tables found on page" };
	}

	// Check for a table with 6 columns and LTV-style data
	let hasValidTable = false;
	tables.each((_, table) => {
		const rows = $(table).find("tr");
		if (rows.length < 2) return;

		// Check second row (skip header) for LTV pattern
		const secondRow = rows.eq(1);
		const cells = secondRow.find("td");
		if (cells.length >= 6) {
			const ltvCell = cells.eq(1).text();
			// Legacy format has LTV patterns like "<=60%", "61%-80%"
			if (
				ltvCell.includes("%") &&
				(ltvCell.includes("<=") ||
					ltvCell.includes("&lt;") ||
					ltvCell.includes("-"))
			) {
				hasValidTable = true;
			}
		}
	});

	if (!hasValidTable) {
		return {
			valid: false,
			error: "No valid legacy rate table found (expected LTV-based format)",
		};
	}

	return { valid: true };
}

/**
 * Parse rates from HTML content.
 * Separated from fetch for historical scraping support.
 */
function parseRatesFromHtml(html: string): MortgageRate[] {
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
					// Cashback Plus (3%) only available on standard fixed rates
					// NOT available on: BTL, existing customers, variable rates, or HVM
					perks:
						!isBtl && !isExisting && !parsed.isVariable && !isHvm
							? ["cashback-3pct"]
							: [],
				};

				ratesMap.set(mortgageRate.id, mortgageRate);
			});
	});

	return Array.from(ratesMap.values());
}

/**
 * Validate that the HTML structure matches what we expect.
 * BOI uses a main table with 6 columns: buyer type, BER, description, rate type, rate, apr.
 */
function validateStructure(html: string): StructureValidation {
	const $ = cheerio.load(html);

	// Check for tables
	const tables = $("table");
	if (tables.length === 0) {
		return { valid: false, error: "No tables found on page" };
	}

	// Check for a table with 6+ columns (BOI's main rate table format)
	let hasValidTable = false;
	tables.each((_, table) => {
		const firstRow = $(table).find("tr").first();
		const colCount = firstRow.find("td, th").length;
		if (colCount >= 6) {
			hasValidTable = true;
		}
	});

	if (!hasValidTable) {
		return {
			valid: false,
			error: "No valid rate table found (expected 6+ columns)",
		};
	}

	return { valid: true };
}

async function fetchAndParseRates(): Promise<MortgageRate[]> {
	console.log("Fetching rates page...");
	const response = await fetch(RATES_URL);
	const html = await response.text();

	console.log("Parsing HTML content with Cheerio...");
	const rates = parseRatesFromHtml(html);
	console.log(`Parsed ${rates.length} unique rates from HTML`);
	return rates;
}

/**
 * Detect whether HTML is legacy format (LTV-based) or current format (BER-based).
 */
function isLegacyFormat(html: string): boolean {
	const $ = cheerio.load(html);

	// Check if any table has LTV patterns in the second column
	let isLegacy = false;
	$("table").each((_, table) => {
		const rows = $(table).find("tr");
		if (rows.length < 2) return;

		const secondRow = rows.eq(1);
		const cells = secondRow.find("td");
		if (cells.length >= 6) {
			const cell1 = cells.eq(1).text();
			// Legacy format has LTV like "<=60%", "61%-80%"
			if (
				cell1.includes("%") &&
				(cell1.includes("<=") ||
					cell1.includes("&lt;") ||
					cell1.includes("-") ||
					cell1.includes(">"))
			) {
				isLegacy = true;
			}
		}
	});

	return isLegacy;
}

/**
 * Auto-detect format and parse rates accordingly.
 */
function parseHtmlAutoDetect(html: string): MortgageRate[] {
	if (isLegacyFormat(html)) {
		return parseLegacyRatesFromHtml(html);
	}
	return parseRatesFromHtml(html);
}

/**
 * Auto-detect format and validate accordingly.
 */
function validateStructureAutoDetect(html: string): StructureValidation {
	if (isLegacyFormat(html)) {
		return validateLegacyStructure(html);
	}
	return validateStructure(html);
}

export const boiProvider: HistoricalLenderProvider = {
	lenderId: LENDER_ID,
	name: "Bank of Ireland",
	url: RATES_URL,
	// Legacy URL for historical scraping
	legacyUrl: LEGACY_RATES_URL,
	scrape: fetchAndParseRates,
	parseHtml: async (html: string) => parseHtmlAutoDetect(html),
	validateStructure: validateStructureAutoDetect,
};
