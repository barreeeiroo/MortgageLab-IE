import * as cheerio from "cheerio";
import { GREEN_BER_RATINGS } from "@/lib/constants/ber";
import type { BuyerType } from "@/lib/schemas";
import type { MortgageRate } from "@/lib/schemas/rate";
import type { LenderProvider } from "../types";

const LENDER_ID = "haven";
const RATES_URL =
	"https://www.havenmortgages.ie/mortgage-centre/mortgage-rates";

// Haven only offers PDH mortgages (no BTL)
const BUYER_TYPES: BuyerType[] = ["ftb", "mover", "switcher-pdh"];

function parsePercentage(text: string): number {
	const match = text.replace(/\s/g, "").match(/(\d+\.?\d*)/);
	if (!match) throw new Error(`Could not parse percentage: ${text}`);
	return Number.parseFloat(match[1]);
}

function parseTermFromName(name: string): number | undefined {
	const match = name.match(/(\d+)\s*Year/i);
	return match ? Number.parseInt(match[1], 10) : undefined;
}

function parseLtvFromName(name: string): { minLtv: number; maxLtv: number } {
	const lowerName = name.toLowerCase();

	if (lowerName.includes("≤50%") || lowerName.includes("<=50%")) {
		return { minLtv: 0, maxLtv: 50 };
	}
	if (lowerName.includes(">50%") && lowerName.includes("80%")) {
		return { minLtv: 50, maxLtv: 80 };
	}
	if (lowerName.includes(">80%")) {
		return { minLtv: 80, maxLtv: 90 };
	}

	return { minLtv: 0, maxLtv: 90 };
}

interface ParsedRow {
	name: string;
	term?: number;
	rate: number;
	apr: number;
	minLtv: number;
	maxLtv: number;
	isGreen: boolean;
	isVariable: boolean;
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

	if (
		!name ||
		!rateText.includes("%") ||
		rateText.toLowerCase().includes("rate")
	) {
		return null;
	}

	try {
		const rate = parsePercentage(rateText);
		const apr = parsePercentage(aprText);
		const term = parseTermFromName(name);
		const { minLtv, maxLtv } = parseLtvFromName(name);
		const lowerName = name.toLowerCase();

		return {
			name,
			term,
			rate,
			apr,
			minLtv,
			maxLtv,
			isGreen: lowerName.includes("green") || lowerName.includes("haven green"),
			isVariable: lowerName.includes("variable"),
		};
	} catch {
		return null;
	}
}

type SectionType = "new-variable" | "existing-variable" | "fixed" | "unknown";

function getSectionTypeFromTab(tabText: string): SectionType {
	const lower = tabText.toLowerCase();
	if (lower.includes("variable") && lower.includes("existing"))
		return "existing-variable";
	if (lower.includes("variable") && lower.includes("new")) return "new-variable";
	if (lower.includes("fixed")) return "fixed";
	return "unknown";
}

async function fetchAndParseRates(): Promise<MortgageRate[]> {
	console.log("Fetching rates page...");
	const response = await fetch(RATES_URL);
	const html = await response.text();

	console.log("Parsing HTML content with Cheerio...");
	const $ = cheerio.load(html);

	const ratesMap = new Map<string, MortgageRate>();

	$('[role="tabpanel"]').each((_, tabPanel) => {
		const panelId = $(tabPanel).attr("id") || "";
		const tabSelector = `[aria-controls="${panelId}"]`;
		const tabText = $(tabSelector).text().trim();
		const sectionType = getSectionTypeFromTab(tabText);

		if (sectionType === "unknown") return;

		$(tabPanel)
			.find("table")
			.each((_, table) => {
				$(table)
					.find("tbody tr, tr")
					.each((_, row) => {
						const parsed = parseTableRow($, row);
						if (!parsed) return;

						const ltvPatterns = /^[<>=≤≥\s\d%]+$/;
						const isLtvOnlyRow = !parsed.term && ltvPatterns.test(parsed.name);
						const isVariable = parsed.isVariable || isLtvOnlyRow;

						const isNewBusinessVariable =
							isVariable && sectionType === "new-variable";
						const isExistingBusinessVariable =
							isVariable && sectionType === "existing-variable";

						const idParts = [LENDER_ID];
						if (parsed.isGreen) idParts.push("green");
						if (isVariable) {
							idParts.push("variable");
							if (parsed.maxLtv < 90) {
								idParts.push(String(parsed.maxLtv));
							} else if (parsed.minLtv > 0) {
								idParts.push(String(parsed.maxLtv));
							}
						} else if (parsed.term) {
							idParts.push("fixed", `${parsed.term}yr`);
						}

						const nameParts: string[] = [];
						if (parsed.isGreen) nameParts.push("Haven Green");
						if (isVariable) {
							nameParts.push("Variable Rate");
							if (parsed.maxLtv < 90) {
								nameParts.push(`- LTV ≤${parsed.maxLtv}%`);
							} else if (parsed.minLtv > 0) {
								nameParts.push(`- LTV >${parsed.minLtv}%`);
							}
						} else if (parsed.term) {
							nameParts.push(`${parsed.term} Year Fixed`);
						}

						const mortgageRate: MortgageRate = {
							id: idParts.join("-"),
							name: nameParts.join(" ") || parsed.name,
							lenderId: LENDER_ID,
							type: isVariable ? "variable" : "fixed",
							rate: parsed.rate,
							apr: parsed.apr,
							fixedTerm: isVariable ? undefined : parsed.term,
							minLtv: parsed.minLtv,
							maxLtv: parsed.maxLtv,
							buyerTypes: BUYER_TYPES,
							berEligible: parsed.isGreen ? GREEN_BER_RATINGS : undefined,
							newBusiness: isNewBusinessVariable
								? true
								: isExistingBusinessVariable
									? false
									: undefined,
							perks: [],
						};

						ratesMap.set(mortgageRate.id, mortgageRate);
					});
			});
	});

	const rates = Array.from(ratesMap.values());
	console.log(`Parsed ${rates.length} unique rates from HTML`);
	return rates;
}

export const havenProvider: LenderProvider = {
	lenderId: LENDER_ID,
	name: "Haven Mortgages",
	url: RATES_URL,
	scrape: fetchAndParseRates,
};
