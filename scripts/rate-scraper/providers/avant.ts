import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type { BuyerType } from "@/lib/schemas/buyer";
import type { MortgageRate } from "@/lib/schemas/rate";
import {
	parseLtvFromName,
	parsePercentageOrThrow,
	parseTermFromText,
} from "../utils/parsing";
import type {
	HistoricalLenderProvider,
	StructureValidation,
} from "../utils/types";

const LENDER_ID = "avant";
const RATES_URL = "https://www.avantmoney.ie/mortgages/products-and-rates";

// Avant Money only offers PDH mortgages (no BTL)
const BUYER_TYPES: BuyerType[] = ["ftb", "mover", "switcher-pdh"];

function parseFlexMortgageTable($: cheerio.CheerioAPI): MortgageRate[] {
	const rates: MortgageRate[] = [];

	// Find tables with "Flex Mortgage" or "Benchmark Rate" headers
	$("table").each((_, table) => {
		const tableText = $(table).text().toLowerCase();
		if (
			!tableText.includes("flex mortgage") &&
			!tableText.includes("benchmark")
		) {
			return;
		}

		$(table)
			.find("tbody tr")
			.each((_, row) => {
				const cells = $(row).find("td").toArray();
				if (cells.length < 5) return;

				const ltvText = $(cells[0]).text().trim();
				const rateText = $(cells[3]).text().trim(); // Flex Mortgage Rate column
				const aprText = $(cells[4]).text().trim();

				if (!ltvText || !rateText.includes("%")) return;

				try {
					const { minLtv, maxLtv } = parseLtvFromName(ltvText);
					const rate = parsePercentageOrThrow(rateText);
					const apr = parsePercentageOrThrow(aprText);

					rates.push({
						id: `avant-flex-${maxLtv}`,
						name: `Flex Mortgage - LTV ≤${maxLtv}%`,
						lenderId: LENDER_ID,
						type: "variable",
						rate,
						apr,
						minLtv,
						maxLtv,
						buyerTypes: BUYER_TYPES,
						perks: [],
					});
				} catch {
					// Skip unparseable rows
				}
			});
	});

	return rates;
}

function parseFollowOnVariableTable(
	$: cheerio.CheerioAPI,
	container: cheerio.Cheerio<Element>,
): MortgageRate[] {
	const rates: MortgageRate[] = [];

	// Find sections with "Follow-on Variable" heading
	container.find(".am-figures-table__tab-section").each((_, section) => {
		const headingEl = $(section)
			.find(".am-figures-table__section-heading")
			.first();
		const heading = headingEl.text().trim().toLowerCase();

		if (!heading.includes("follow-on") && !heading.includes("follow on")) {
			return;
		}

		$(section)
			.find(".am-figures-table__section-row")
			.each((_, row) => {
				const cells = $(row).find("> div").toArray();
				if (cells.length < 3) return;

				const ltvText = $(cells[0]).text().trim();
				const rateText = $(cells[1]).text().trim();
				const aprText = $(cells[2]).text().trim();

				if (!ltvText || !rateText.includes("%")) return;

				try {
					const { minLtv, maxLtv } = parseLtvFromName(ltvText);
					const rate = parsePercentageOrThrow(rateText);
					const apr = parsePercentageOrThrow(aprText);

					rates.push({
						id: `avant-follow-on-variable-${maxLtv}`,
						name: `Follow-On Variable - LTV ≤${maxLtv}%`,
						lenderId: LENDER_ID,
						type: "variable",
						rate,
						apr,
						minLtv,
						maxLtv,
						buyerTypes: ["switcher-pdh"], // Only for existing customers rolling off fixed term
						newBusiness: false,
						perks: [],
					});
				} catch {
					// Skip unparseable rows
				}
			});
	});

	return rates;
}

function parseFixedTermTable(
	$: cheerio.CheerioAPI,
	container: cheerio.Cheerio<Element>,
): MortgageRate[] {
	const rates: MortgageRate[] = [];

	// Find sections with term headings
	container.find(".am-figures-table__tab-section").each((_, section) => {
		const headingEl = $(section)
			.find(".am-figures-table__section-heading")
			.first();
		const heading = headingEl.text().trim();
		const term = parseTermFromText(heading);

		if (!term) return;

		// Detect High Value Mortgage products (min €300k loan, no cashback)
		const isHighValue = heading.toLowerCase().includes("high value");

		$(section)
			.find(".am-figures-table__section-row")
			.each((_, row) => {
				const cells = $(row).find("> div").toArray();
				if (cells.length < 4) return;

				const ltvText = $(cells[0]).text().trim();
				const rateText = $(cells[1]).text().trim();
				const aprText = $(cells[3]).text().trim(); // APRC column

				if (!ltvText || !rateText.includes("%")) return;

				try {
					const { minLtv, maxLtv } = parseLtvFromName(ltvText);
					const rate = parsePercentageOrThrow(rateText);
					const apr = parsePercentageOrThrow(aprText);

					const idSuffix = isHighValue ? "highvalue" : "fixed";
					const nameSuffix = isHighValue ? " High Value" : "";

					rates.push({
						id: `avant-${idSuffix}-${term}yr-${maxLtv}`,
						name: `${term} Year Fixed${nameSuffix} - LTV ≤${maxLtv}%`,
						lenderId: LENDER_ID,
						type: "fixed",
						rate,
						apr,
						fixedTerm: term,
						minLtv,
						maxLtv,
						buyerTypes: BUYER_TYPES,
						newBusiness: true,
						// High Value mortgages don't have cashback
						perks: isHighValue ? [] : ["cashback-1pct"],
						// High Value mortgages require €300k minimum loan
						...(isHighValue && { minLoan: 300000 }),
					});
				} catch {
					// Skip unparseable rows
				}
			});
	});

	return rates;
}

function parseOneMortgageTable(
	$: cheerio.CheerioAPI,
	container: cheerio.Cheerio<Element>,
): MortgageRate[] {
	const rates: MortgageRate[] = [];

	// Find sections with term headings for One Mortgage
	container.find(".am-figures-table__tab-section").each((_, section) => {
		const headingEl = $(section)
			.find(".am-figures-table__section-heading")
			.first();
		const heading = headingEl.text().trim();
		const term = parseTermFromText(heading);

		if (!term) return;

		$(section)
			.find(".am-figures-table__section-row")
			.each((_, row) => {
				const cells = $(row).find("> div").toArray();
				if (cells.length < 3) return;

				const ltvText = $(cells[0]).text().trim();
				const rateText = $(cells[1]).text().trim();
				const aprText = $(cells[2]).text().trim(); // APRC column

				if (!ltvText || !rateText.includes("%")) return;

				try {
					const { minLtv, maxLtv } = parseLtvFromName(ltvText);
					const rate = parsePercentageOrThrow(rateText);
					const apr = parsePercentageOrThrow(aprText);

					rates.push({
						id: `avant-one-${term}yr-${maxLtv}`,
						name: `One Mortgage ${term} Year - LTV ≤${maxLtv}%`,
						lenderId: LENDER_ID,
						type: "fixed",
						rate,
						apr,
						fixedTerm: term,
						minLtv,
						maxLtv,
						buyerTypes: BUYER_TYPES,
						newBusiness: true,
						perks: ["cashback-1pct"],
					});
				} catch {
					// Skip unparseable rows
				}
			});
	});

	return rates;
}

/**
 * Parse rates from HTML content.
 * Separated from fetch for historical scraping support.
 */
function parseRatesFromHtml(html: string): MortgageRate[] {
	const $ = cheerio.load(html);
	const rates: MortgageRate[] = [];

	// Parse Flex Mortgage (variable) rates
	rates.push(...parseFlexMortgageTable($));

	// Find rate sections by article title
	$(".journal-content-article").each((_, article) => {
		const title = $(article).attr("data-analytics-asset-title") || "";
		const titleLower = title.toLowerCase();

		if (titleLower.includes("fixed term rates")) {
			rates.push(...parseFixedTermTable($, $(article)));
		}

		if (titleLower.includes("one mortgage rates")) {
			rates.push(...parseOneMortgageTable($, $(article)));
		}

		if (titleLower.includes("follow on variable")) {
			rates.push(...parseFollowOnVariableTable($, $(article)));
		}
	});

	// If we couldn't find fixed rates via the structured approach, try a broader search
	if (rates.filter((r) => r.type === "fixed").length === 0) {
		$(".am-figures-table").each((_, table) => {
			const tableTitle = $(table)
				.find("h3")
				.first()
				.text()
				.trim()
				.toLowerCase();

			if (tableTitle.includes("fixed term")) {
				rates.push(...parseFixedTermTable($, $(table)));
			} else if (tableTitle.includes("one mortgage")) {
				rates.push(...parseOneMortgageTable($, $(table)));
			}
		});
	}

	return rates;
}

/**
 * Validate that the HTML structure matches what we expect.
 * Avant uses .am-figures-table elements and tables.
 */
function validateStructure(html: string): StructureValidation {
	const $ = cheerio.load(html);

	// Check for Avant's custom table structure or standard tables
	const amTables = $(".am-figures-table");
	const standardTables = $("table");

	if (amTables.length === 0 && standardTables.length === 0) {
		return {
			valid: false,
			error:
				"No rate tables found (expected .am-figures-table or table elements)",
		};
	}

	// Check for rate content indicators
	const pageText = $("body").text().toLowerCase();
	if (!pageText.includes("ltv") && !pageText.includes("loan to value")) {
		return { valid: false, error: "No LTV content found on page" };
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
	return rates;
}

export const avantProvider: HistoricalLenderProvider = {
	lenderId: LENDER_ID,
	name: "Avant Money",
	url: RATES_URL,
	scrape: fetchAndParseRates,
	parseHtml: async (html: string) => parseRatesFromHtml(html),
	validateStructure,
};
