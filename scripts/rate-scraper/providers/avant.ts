import * as cheerio from "cheerio";
import type { BuyerType } from "@/lib/schemas";
import type { MortgageRate } from "@/lib/schemas/rate";
import type { LenderProvider } from "../types";

const LENDER_ID = "avant";
const RATES_URL = "https://www.avantmoney.ie/mortgages/products-and-rates";

// Avant Money only offers PDH mortgages (no BTL)
const BUYER_TYPES: BuyerType[] = ["ftb", "mover", "switcher-pdh"];

function parsePercentage(text: string): number {
	const match = text.replace(/\s/g, "").match(/(\d+\.?\d*)/);
	if (!match) throw new Error(`Could not parse percentage: ${text}`);
	return Number.parseFloat(match[1]);
}

function parseLtvFromText(text: string): { minLtv: number; maxLtv: number } {
	const lowerText = text.toLowerCase().replace(/\s/g, "");

	// Handle various LTV formats
	if (
		lowerText.includes("<=60%") ||
		lowerText.includes("≤60%") ||
		lowerText === "<60%"
	) {
		return { minLtv: 0, maxLtv: 60 };
	}
	if (lowerText.includes(">60%") && lowerText.includes("70%")) {
		return { minLtv: 60, maxLtv: 70 };
	}
	if (lowerText.includes(">70%") && lowerText.includes("80%")) {
		return { minLtv: 70, maxLtv: 80 };
	}
	if (lowerText.includes("<=80%") || lowerText.includes("≤80%")) {
		return { minLtv: 0, maxLtv: 80 };
	}
	if (lowerText.includes(">80%") && lowerText.includes("90%")) {
		return { minLtv: 80, maxLtv: 90 };
	}
	if (lowerText.includes(">80%")) {
		return { minLtv: 80, maxLtv: 90 };
	}

	// Default
	return { minLtv: 0, maxLtv: 90 };
}

function parseTermFromHeading(heading: string): number | undefined {
	// Handle "3 years", "UP TO 15 YEARS", etc.
	const match = heading.match(/(\d+)\s*years?/i);
	return match ? Number.parseInt(match[1], 10) : undefined;
}

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
					const { minLtv, maxLtv } = parseLtvFromText(ltvText);
					const rate = parsePercentage(rateText);
					const apr = parsePercentage(aprText);

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

function parseFixedTermTable(
	$: cheerio.CheerioAPI,
	container: cheerio.Cheerio<cheerio.Element>,
): MortgageRate[] {
	const rates: MortgageRate[] = [];

	// Find sections with term headings
	container.find(".am-figures-table__tab-section").each((_, section) => {
		const headingEl = $(section)
			.find(".am-figures-table__section-heading")
			.first();
		const heading = headingEl.text().trim();
		const term = parseTermFromHeading(heading);

		if (!term) return;

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
					const { minLtv, maxLtv } = parseLtvFromText(ltvText);
					const rate = parsePercentage(rateText);
					const apr = parsePercentage(aprText);

					rates.push({
						id: `avant-fixed-${term}yr-${maxLtv}`,
						name: `${term} Year Fixed - LTV ≤${maxLtv}%`,
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

function parseOneMortgageTable(
	$: cheerio.CheerioAPI,
	container: cheerio.Cheerio<cheerio.Element>,
): MortgageRate[] {
	const rates: MortgageRate[] = [];

	// Find sections with term headings for One Mortgage
	container.find(".am-figures-table__tab-section").each((_, section) => {
		const headingEl = $(section)
			.find(".am-figures-table__section-heading")
			.first();
		const heading = headingEl.text().trim();
		const term = parseTermFromHeading(heading);

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
					const { minLtv, maxLtv } = parseLtvFromText(ltvText);
					const rate = parsePercentage(rateText);
					const apr = parsePercentage(aprText);

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

async function fetchAndParseRates(): Promise<MortgageRate[]> {
	console.log("Fetching rates page...");
	const response = await fetch(RATES_URL);
	const html = await response.text();

	console.log("Parsing HTML content with Cheerio...");
	const $ = cheerio.load(html);

	const rates: MortgageRate[] = [];

	// Parse Flex Mortgage (variable) rates
	console.log("Parsing Flex Mortgage rates...");
	rates.push(...parseFlexMortgageTable($));

	// Find Fixed Term Rates section
	$(".journal-content-article").each((_, article) => {
		const title = $(article).attr("data-analytics-asset-title") || "";

		if (title.toLowerCase().includes("fixed term rates")) {
			console.log("Parsing Fixed Term rates...");
			rates.push(...parseFixedTermTable($, $(article)));
		}

		if (title.toLowerCase().includes("one mortgage rates")) {
			console.log("Parsing One Mortgage rates...");
			rates.push(...parseOneMortgageTable($, $(article)));
		}
	});

	// If we couldn't find fixed rates via the structured approach, try a broader search
	if (rates.filter((r) => r.type === "fixed").length === 0) {
		console.log("Trying broader search for fixed rate tables...");

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

	console.log(`Parsed ${rates.length} rates from HTML`);
	return rates;
}

export const avantProvider: LenderProvider = {
	lenderId: LENDER_ID,
	name: "Avant Money",
	url: RATES_URL,
	scrape: fetchAndParseRates,
};
