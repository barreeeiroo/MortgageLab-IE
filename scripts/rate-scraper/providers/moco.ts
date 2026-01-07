import * as cheerio from "cheerio";
import {
	type AprcConfig,
	calculateAprc,
	inferFollowOnRate,
} from "@/lib/mortgage";
import type { BuyerType } from "@/lib/schemas";
import type { MortgageRate } from "@/lib/schemas/rate";
import {
	parseLtvBandOrThrow,
	parsePercentageOrThrow,
	parseTermOrThrow,
} from "../parsing.ts";
import type { LenderProvider } from "../types";

const LENDER_ID = "moco";
const RATES_URL = "https://www.moco.ie/moco/our-rates";

// MoCo offers PDH mortgages (no BTL)
const BUYER_TYPES: BuyerType[] = ["ftb", "mover", "switcher-pdh"];

// APRC calculation parameters (per MoCo's disclosure)
const APRC_CONFIG: AprcConfig = {
	loanAmount: 250000,
	termMonths: 20 * 12,
	valuationFee: 199,
	securityReleaseFee: 95,
};

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
		const term = parseTermOrThrow(termText);
		const rate = parsePercentageOrThrow(rateText);
		const apr = parsePercentageOrThrow(aprText);
		const { minLtv, maxLtv } = parseLtvBandOrThrow(ltvText);

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
	console.log(`Parsed ${rates.length} unique fixed rates from HTML`);

	// Infer SVR from the fixed rate products' APRCs
	// Use multiple products and take the median for robustness
	const inferredSvrs: number[] = [];
	for (const rate of rates) {
		if (rate.type === "fixed" && rate.fixedTerm && rate.apr) {
			const svr = inferFollowOnRate(
				rate.rate,
				rate.fixedTerm * 12,
				rate.apr,
				APRC_CONFIG,
			);
			inferredSvrs.push(svr);
			console.log(
				`Inferred SVR from ${rate.fixedTerm}yr fixed at ${rate.rate}% (APRC ${rate.apr}%): ${svr}%`,
			);
		}
	}

	if (inferredSvrs.length > 0) {
		// Use median SVR for robustness against rounding errors
		inferredSvrs.sort((a, b) => a - b);
		const medianSvr = inferredSvrs[Math.floor(inferredSvrs.length / 2)];
		console.log(`Inferred median SVR: ${medianSvr}%`);

		// Calculate APRC for variable rate (same rate for entire term)
		const fullTermMonths = APRC_CONFIG.termMonths;
		const svrAprc = calculateAprc(
			medianSvr,
			fullTermMonths,
			medianSvr,
			APRC_CONFIG,
		);
		console.log(`Calculated SVR APRC: ${svrAprc}%`);

		// Add the SVR as a variable rate product
		rates.push({
			id: `${LENDER_ID}-variable-svr`,
			name: "Standard Variable Rate",
			lenderId: LENDER_ID,
			type: "variable",
			rate: medianSvr,
			apr: svrAprc,
			minLtv: 0,
			maxLtv: 90,
			buyerTypes: BUYER_TYPES,
			newBusiness: false, // SVR is for existing customers after fixed period ends
			perks: [],
			warning:
				"This rate is not publicly disclosed. It has been inferred from APRC values.",
		});
	}

	console.log(`Total rates: ${rates.length} (including inferred SVR)`);
	return rates;
}

export const mocoProvider: LenderProvider = {
	lenderId: LENDER_ID,
	name: "MoCo",
	url: RATES_URL,
	scrape: fetchAndParseRates,
};
