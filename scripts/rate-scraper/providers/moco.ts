import * as cheerio from "cheerio";
import type { BuyerType } from "@/lib/schemas";
import type { MortgageRate } from "@/lib/schemas/rate";
import type { LenderProvider } from "../types";

const LENDER_ID = "moco";
const RATES_URL = "https://www.moco.ie/moco/our-rates";

// MoCo offers PDH mortgages (no BTL)
const BUYER_TYPES: BuyerType[] = ["ftb", "mover", "switcher-pdh"];

// APRC calculation parameters (per MoCo's disclosure)
const APRC_LOAN_AMOUNT = 250000;
const APRC_TERM_YEARS = 20;
const APRC_TERM_MONTHS = APRC_TERM_YEARS * 12;
const APRC_VALUATION_FEE = 199;
const APRC_SECURITY_RELEASE_FEE = 95;

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

/**
 * Calculate monthly payment for a loan
 */
function calculateMonthlyPayment(
	principal: number,
	annualRate: number,
	months: number,
): number {
	if (annualRate === 0) return principal / months;
	const monthlyRate = annualRate / 100 / 12;
	return (
		(principal * monthlyRate * (1 + monthlyRate) ** months) /
		((1 + monthlyRate) ** months - 1)
	);
}

/**
 * Calculate remaining balance after a number of payments
 */
function calculateRemainingBalance(
	principal: number,
	annualRate: number,
	totalMonths: number,
	paidMonths: number,
): number {
	if (paidMonths >= totalMonths) return 0;
	const monthlyRate = annualRate / 100 / 12;
	const payment = calculateMonthlyPayment(principal, annualRate, totalMonths);
	return (
		principal * (1 + monthlyRate) ** paidMonths -
		(payment * ((1 + monthlyRate) ** paidMonths - 1)) / monthlyRate
	);
}

/**
 * Calculate APRC for a fixed rate product that reverts to SVR
 */
function calculateAprc(
	fixedRate: number,
	fixedTermMonths: number,
	svrRate: number,
): number {
	const totalMonths = APRC_TERM_MONTHS;
	const variableMonths = totalMonths - fixedTermMonths;

	const fixedPayment =
		Math.round(
			calculateMonthlyPayment(APRC_LOAN_AMOUNT, fixedRate, totalMonths) * 100,
		) / 100;
	const balanceAfterFixed = calculateRemainingBalance(
		APRC_LOAN_AMOUNT,
		fixedRate,
		totalMonths,
		fixedTermMonths,
	);
	const variablePayment =
		Math.round(
			calculateMonthlyPayment(balanceAfterFixed, svrRate, variableMonths) * 100,
		) / 100;

	const netLoanAmount = APRC_LOAN_AMOUNT - APRC_VALUATION_FEE;
	const cashFlows: number[] = [-netLoanAmount];
	for (let i = 0; i < fixedTermMonths; i++) {
		cashFlows.push(fixedPayment);
	}
	for (let i = 0; i < variableMonths - 1; i++) {
		cashFlows.push(variablePayment);
	}
	cashFlows.push(variablePayment + APRC_SECURITY_RELEASE_FEE);

	// Newton-Raphson to find monthly rate where NPV = 0
	let monthlyRate = fixedRate / 100 / 12;
	const tolerance = 1e-12;
	const maxIterations = 200;

	for (let iter = 0; iter < maxIterations; iter++) {
		let npv = 0;
		let npvDerivative = 0;

		for (let i = 0; i < cashFlows.length; i++) {
			const discountFactor = (1 + monthlyRate) ** i;
			npv += cashFlows[i] / discountFactor;
			if (i > 0) {
				npvDerivative -= (i * cashFlows[i]) / (1 + monthlyRate) ** (i + 1);
			}
		}

		if (Math.abs(npv) < tolerance) break;
		if (Math.abs(npvDerivative) < tolerance) break;

		monthlyRate = monthlyRate - npv / npvDerivative;
	}

	const effectiveAnnualRate = (1 + monthlyRate) ** 12 - 1;
	return Math.round(effectiveAnnualRate * 10000) / 100;
}

/**
 * Infer the SVR from a fixed rate product's APRC using bisection
 */
function inferSvrFromAprc(
	fixedRate: number,
	fixedTermYears: number,
	observedAprc: number,
): number {
	const fixedTermMonths = fixedTermYears * 12;
	let low = 0.01;
	let high = 15.0;
	const tolerance = 0.001;
	const maxIterations = 100;

	for (let i = 0; i < maxIterations; i++) {
		const mid = (low + high) / 2;
		const calculatedAprc = calculateAprc(fixedRate, fixedTermMonths, mid);

		if (Math.abs(calculatedAprc - observedAprc) < tolerance) {
			return Math.round(mid * 100) / 100;
		}

		if (calculatedAprc < observedAprc) {
			low = mid;
		} else {
			high = mid;
		}
	}

	return Math.round(((low + high) / 2) * 100) / 100;
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
	console.log(`Parsed ${rates.length} unique fixed rates from HTML`);

	// Infer SVR from the fixed rate products' APRCs
	// Use multiple products and take the median for robustness
	const inferredSvrs: number[] = [];
	for (const rate of rates) {
		if (rate.type === "fixed" && rate.fixedTerm && rate.apr) {
			const svr = inferSvrFromAprc(rate.rate, rate.fixedTerm, rate.apr);
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

		// Add the SVR as a variable rate product
		rates.push({
			id: `${LENDER_ID}-variable-svr`,
			name: "Standard Variable Rate",
			lenderId: LENDER_ID,
			type: "variable",
			rate: medianSvr,
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
