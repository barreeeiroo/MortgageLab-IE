import * as cheerio from "cheerio";
import { BER_GROUP_A, GREEN_BER_RATINGS } from "@/lib/constants/ber";
import type { BuyerType } from "@/lib/schemas";
import type { MortgageRate } from "@/lib/schemas/rate";
import {
	parseLtvFromName,
	parsePercentageOrThrow,
	parseTermFromText,
} from "../parsing.ts";
import type { LenderProvider } from "../types";

const LENDER_ID = "aib";
const RATES_URL =
	"https://aib.ie/our-products/mortgages/mortgage-interest-rates";

const PDH_NEW_BUYER_TYPES: BuyerType[] = ["ftb", "mover"];
const PDH_SWITCHER_BUYER_TYPES: BuyerType[] = ["switcher-pdh"];
const BTL_BUYER_TYPES: BuyerType[] = ["btl", "switcher-btl"];

interface ParsedRow {
	name: string;
	term?: number;
	rate: number;
	apr: number;
	minLtv: number;
	maxLtv: number;
	isGreen: boolean;
	isGreenA: boolean;
	isHighValue: boolean;
	isBtl: boolean;
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
			isGreen: lowerName.includes("green") && !lowerName.includes("greena"),
			isGreenA: lowerName.includes("greena") || lowerName.includes("green a"),
			isHighValue:
				lowerName.includes("high value") || lowerName.includes("higher value"),
			isBtl: lowerName.includes("buy to let") || lowerName.includes("btl"),
			isVariable: lowerName.includes("variable") || lowerName.includes("var "),
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

	// Use a Map to deduplicate rates by ID (AIB page has duplicate tables)
	const ratesMap = new Map<string, MortgageRate>();

	$("table").each((_, table) => {
		// Detect section based on tab pane ID
		// AIB uses: id="owner" for PDH, id="residential" for BTL
		const tabPaneId = $(table).closest(".tab-pane").attr("id") || "";
		const isBtlSection = tabPaneId === "residential";

		// Also check heading for additional context (green, high value, etc.)
		const prevHeading = $(table)
			.prevAll("h2, h3, h4")
			.first()
			.text()
			.toLowerCase();

		const isGreenSection = prevHeading.includes("green");
		const isHighValueSection =
			prevHeading.includes("high value") ||
			prevHeading.includes("higher value");

		$(table)
			.find("tbody tr, tr")
			.each((_, row) => {
				const parsed = parseTableRow($, row);
				if (!parsed) return;

				const isBtl = parsed.isBtl || isBtlSection;
				const isGreen = parsed.isGreen || isGreenSection;
				const isGreenA = parsed.isGreenA;
				const isHighValue = parsed.isHighValue || isHighValueSection;

				const idParts = [LENDER_ID];
				if (isBtl) idParts.push("btl");
				if (isHighValue) idParts.push("hv");
				if (isGreenA) {
					idParts.push("green-a");
				} else if (isGreen) {
					idParts.push("green");
				}
				if (parsed.isVariable) {
					idParts.push("variable");
					if (parsed.maxLtv < 90 && !isBtl) idParts.push(String(parsed.maxLtv));
				} else if (parsed.term) {
					idParts.push("fixed", `${parsed.term}yr`);
					if (parsed.maxLtv < 90 && !isBtl) idParts.push(String(parsed.maxLtv));
				}

				const nameParts: string[] = [];
				if (isBtl) nameParts.push("Buy-to-Let");
				if (isHighValue) nameParts.push("Higher Value");
				if (isGreenA) {
					nameParts.push("Green A");
				} else if (isGreen) {
					nameParts.push("Green");
				}
				if (parsed.isVariable) {
					nameParts.push("Variable Rate");
					if (parsed.maxLtv < 90 && !isBtl)
						nameParts.push(`- LTV ≤${parsed.maxLtv}%`);
				} else if (parsed.term) {
					nameParts.push(`${parsed.term} Year Fixed`);
					if (parsed.maxLtv < 90 && !isBtl)
						nameParts.push(`- LTV ≤${parsed.maxLtv}%`);
				}

				let berEligible: string[] | undefined;
				if (isGreenA) {
					berEligible = BER_GROUP_A;
				} else if (isGreen) {
					berEligible = GREEN_BER_RATINGS;
				}

				const baseId = idParts.join("-");
				const baseName = nameParts.join(" ") || parsed.name;

				if (isBtl) {
					// BTL: single rate for btl and switcher-btl, no perks
					const mortgageRate: MortgageRate = {
						id: baseId,
						name: baseName,
						lenderId: LENDER_ID,
						type: parsed.isVariable ? "variable" : "fixed",
						rate: parsed.rate,
						apr: parsed.apr,
						fixedTerm: parsed.isVariable ? undefined : parsed.term,
						minLtv: parsed.minLtv,
						maxLtv: 70,
						minLoan: isHighValue ? 250000 : undefined,
						buyerTypes: BTL_BUYER_TYPES,
						berEligible,
						perks: [],
					};
					ratesMap.set(mortgageRate.id, mortgageRate);
				} else {
					// PDH: split into FTB/mover (no perks) and switcher (€3k perk)
					const pdhRate: MortgageRate = {
						id: baseId,
						name: baseName,
						lenderId: LENDER_ID,
						type: parsed.isVariable ? "variable" : "fixed",
						rate: parsed.rate,
						apr: parsed.apr,
						fixedTerm: parsed.isVariable ? undefined : parsed.term,
						minLtv: parsed.minLtv,
						maxLtv: parsed.maxLtv,
						minLoan: isHighValue ? 250000 : undefined,
						buyerTypes: PDH_NEW_BUYER_TYPES,
						berEligible,
						perks: [],
					};
					ratesMap.set(pdhRate.id, pdhRate);

					const switcherRate: MortgageRate = {
						id: `${baseId}-switcher`,
						name: baseName,
						lenderId: LENDER_ID,
						type: parsed.isVariable ? "variable" : "fixed",
						rate: parsed.rate,
						apr: parsed.apr,
						fixedTerm: parsed.isVariable ? undefined : parsed.term,
						minLtv: parsed.minLtv,
						maxLtv: parsed.maxLtv,
						minLoan: isHighValue ? 250000 : undefined,
						buyerTypes: PDH_SWITCHER_BUYER_TYPES,
						berEligible,
						perks: ["switcher-3k"],
					};
					ratesMap.set(switcherRate.id, switcherRate);
				}
			});
	});

	const rates = Array.from(ratesMap.values());
	console.log(`Parsed ${rates.length} unique rates from HTML`);
	return rates;
}

export const aibProvider: LenderProvider = {
	lenderId: LENDER_ID,
	name: "AIB",
	url: RATES_URL,
	scrape: fetchAndParseRates,
};
