import * as cheerio from "cheerio";
import type { BuyerType } from "@/lib/schemas";
import type { MortgageRate } from "@/lib/schemas/rate";
import type { LenderProvider } from "../types";

const LENDER_ID = "moco";
const RATES_URL = "https://www.moco.ie/moco/our-rates";

// MoCo offers PDH mortgages (no BTL)
const BUYER_TYPES: BuyerType[] = ["ftb", "mover", "switcher-pdh"];

function parsePercentage(text: string): number {
	const match = text.replace(/\s/g, "").match(/(\d+\.?\d*)/);
	if (!match) throw new Error(`Could not parse percentage: ${text}`);
	return Number.parseFloat(match[1]);
}

function parseTermFromText(text: string): number {
	const match = text.match(/(\d+)/);
	if (!match) throw new Error(`Could not parse term: ${text}`);
	return Number.parseInt(match[1], 10);
}

function parseLtvFromText(text: string): { minLtv: number; maxLtv: number } {
	const cleanText = text.replace(/\s/g, "").toLowerCase();

	// <= 50%
	if (cleanText.includes("<=50%") || cleanText.includes("≤50%")) {
		return { minLtv: 0, maxLtv: 50 };
	}
	// >50% <= 60%
	if (cleanText.includes(">50%") && cleanText.includes("60%")) {
		return { minLtv: 50, maxLtv: 60 };
	}
	// >60% <= 70%
	if (cleanText.includes(">60%") && cleanText.includes("70%")) {
		return { minLtv: 60, maxLtv: 70 };
	}
	// >70% <= 80%
	if (cleanText.includes(">70%") && cleanText.includes("80%")) {
		return { minLtv: 70, maxLtv: 80 };
	}
	// >80% <= 90%
	if (cleanText.includes(">80%") && cleanText.includes("90%")) {
		return { minLtv: 80, maxLtv: 90 };
	}

	throw new Error(`Could not parse LTV: ${text}`);
}

interface ParsedRow {
	term: number;
	rate: number;
	apr: number;
	minLtv: number;
	maxLtv: number;
}

function parseTableRow(
	$: cheerio.CheerioAPI,
	row: cheerio.Element,
): ParsedRow | null {
	const cells = $(row).find("td").toArray();
	if (cells.length < 4) return null;

	const termText = $(cells[0]).text().trim();
	const ltvText = $(cells[1]).text().trim();
	const rateText = $(cells[2]).text().trim();
	const aprText = $(cells[3]).text().trim();

	// Skip header rows or invalid rows
	if (!termText || !ltvText || !rateText.includes("%")) {
		return null;
	}

	try {
		const term = parseTermFromText(termText);
		const rate = parsePercentage(rateText);
		const apr = parsePercentage(aprText);
		const { minLtv, maxLtv } = parseLtvFromText(ltvText);

		return {
			term,
			rate,
			apr,
			minLtv,
			maxLtv,
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

	const ratesMap = new Map<string, MortgageRate>();

	$("table").each((_, table) => {
		$(table)
			.find("tbody tr")
			.each((_, row) => {
				const parsed = parseTableRow($, row);
				if (!parsed) return;

				// Generate unique ID: moco-fixed-{term}yr-{maxLtv}
				const id = `${LENDER_ID}-fixed-${parsed.term}yr-${parsed.maxLtv}`;

				const mortgageRate: MortgageRate = {
					id,
					name: `${parsed.term} Year Fixed`,
					lenderId: LENDER_ID,
					type: "fixed",
					rate: parsed.rate,
					apr: parsed.apr,
					fixedTerm: parsed.term,
					minLtv: parsed.minLtv,
					maxLtv: parsed.maxLtv,
					buyerTypes: BUYER_TYPES,
					perks: [],
				};

				ratesMap.set(id, mortgageRate);
			});
	});

	const rates = Array.from(ratesMap.values());
	console.log(`Parsed ${rates.length} unique rates from HTML`);
	return rates;
}

export const mocoProvider: LenderProvider = {
	lenderId: LENDER_ID,
	name: "MoCo",
	url: RATES_URL,
	scrape: fetchAndParseRates,
};
