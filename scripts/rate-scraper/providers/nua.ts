import type { BuyerType } from "@/lib/schemas";
import type { MortgageRate } from "@/lib/schemas/rate";
import type { LenderProvider } from "../types";

const LENDER_ID = "nua";
const PRODUCTS_API_URL =
	"https://backend.nuamoney.com/v1/dictionaries/products";
const SVR_API_URL = "https://backend.nuamoney.com/v1/dictionaries/svr/current";

// APRC calculation parameters (per Núa's disclosure)
const APRC_LOAN_AMOUNT = 100000;
const APRC_TERM_YEARS = 20;
const APRC_TERM_MONTHS = APRC_TERM_YEARS * 12;
const APRC_VALUATION_FEE = 199; // Paid upfront (deducted from loan)
const APRC_SECURITY_RELEASE_FEE = 80; // Paid at end of loan term

interface NuaSvr {
	_id: string;
	rate: number; // Decimal format (e.g., 0.0485 = 4.85%)
	validFrom: string;
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
 * Calculate APRC for a fixed rate product
 * Uses Newton-Raphson method to find the rate that makes NPV = 0
 *
 * Per EU Consumer Credit Directive, APRC is calculated such that:
 * Sum of drawdowns = Sum of (repayments / (1 + APRC)^t)
 * where t is time in years from drawdown
 */
function calculateAprc(
	fixedRate: number,
	fixedTermMonths: number,
	svrRate: number,
): number {
	const totalMonths = APRC_TERM_MONTHS;
	const variableMonths = totalMonths - fixedTermMonths;

	// Calculate payment schedule (rounded to cents as in practice)
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

	// Build cash flows: drawdown (negative), then repayments (positive)
	// Per EU directive: net amount = loan amount - fees deducted at drawdown
	// Only valuation fee is paid upfront; security release fee is paid at end
	const netLoanAmount = APRC_LOAN_AMOUNT - APRC_VALUATION_FEE;
	const cashFlows: number[] = [-netLoanAmount];
	for (let i = 0; i < fixedTermMonths; i++) {
		cashFlows.push(fixedPayment);
	}
	for (let i = 0; i < variableMonths - 1; i++) {
		cashFlows.push(variablePayment);
	}
	// Final payment includes the security release fee
	cashFlows.push(variablePayment + APRC_SECURITY_RELEASE_FEE);

	// Newton-Raphson to find monthly rate where NPV = 0
	let monthlyRate = fixedRate / 100 / 12; // Initial guess
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

	// Convert to effective annual rate (compounded) per EU directive
	const effectiveAnnualRate = (1 + monthlyRate) ** 12 - 1;

	// Convert to percentage and round up to 2 decimal places
	// Note: Small discrepancy (~0.02%) from website values may exist due to
	// internal rounding differences in payment calculations
	return Math.ceil(effectiveAnnualRate * 10000) / 100;
}

interface NuaProduct {
	_id: string;
	reference: string;
	name: string;
	borrowerType: "FTB" | "SSB" | "Switcher";
	rateType: "Fixed" | "Variable";
	fixedRate: number;
	fixedRateTerm: number; // in months
	ltvMin: number;
	ltvMax: number;
	suspendedFrom: string | null;
	loanSizeMin?: number;
	loanSizeMax?: number;
}

function mapBuyerType(nuaBuyerType: string): BuyerType[] {
	switch (nuaBuyerType) {
		case "FTB":
			return ["ftb"];
		case "SSB":
			return ["mover"];
		case "Switcher":
			return ["switcher-pdh"];
		default:
			return ["ftb", "mover", "switcher-pdh"];
	}
}

function generateRateId(product: NuaProduct): string {
	const termYears = product.fixedRateTerm / 12;
	const buyerPrefix = product.borrowerType.toLowerCase();

	// Handle special product names
	const nameLower = product.name.toLowerCase();
	let productVariant = "";

	if (nameLower.includes("extra")) {
		productVariant = "-extra";
	} else if (nameLower.includes("one")) {
		productVariant = "-one";
	} else if (nameLower.includes("freedom")) {
		productVariant = "-freedom";
	} else if (nameLower.includes("home plus")) {
		productVariant = "-homeplus";
	}

	return `${LENDER_ID}-${buyerPrefix}${productVariant}-fixed-${termYears}yr-${product.ltvMax}`;
}

function generateRateName(product: NuaProduct): string {
	const termYears = product.fixedRateTerm / 12;

	// Use the original name if it contains special product type
	const nameLower = product.name.toLowerCase();
	if (
		nameLower.includes("extra") ||
		nameLower.includes("one") ||
		nameLower.includes("freedom") ||
		nameLower.includes("home plus")
	) {
		return product.name;
	}

	// Generate a standardized name for regular products
	return `${termYears} Year Fixed - LTV ≤${product.ltvMax}%`;
}

async function fetchSvr(): Promise<NuaSvr> {
	const response = await fetch(SVR_API_URL);
	if (!response.ok) {
		throw new Error(`Failed to fetch Núa SVR: ${response.statusText}`);
	}
	return response.json();
}

async function fetchAndParseRates(): Promise<MortgageRate[]> {
	console.log("Fetching rates from Núa API...");

	// Fetch products and SVR in parallel
	const [productsResponse, svr] = await Promise.all([
		fetch(PRODUCTS_API_URL),
		fetchSvr(),
	]);

	if (!productsResponse.ok) {
		throw new Error(
			`Failed to fetch Núa products: ${productsResponse.statusText}`,
		);
	}

	const products: NuaProduct[] = await productsResponse.json();
	console.log(`Fetched ${products.length} products from API`);

	// Convert SVR from decimal to percentage (0.0485 -> 4.85)
	const svrRate = Math.round(svr.rate * 10000) / 100;
	console.log(`SVR rate: ${svrRate}% (valid from ${svr.validFrom})`);

	// Filter out suspended products and convert to MortgageRate
	const activeProducts = products.filter((p) => p.suspendedFrom === null);
	console.log(`${activeProducts.length} active products after filtering`);

	const rates: MortgageRate[] = activeProducts.map((product) => {
		const termYears = product.fixedRateTerm / 12;
		// Round rate to 2 decimal places to handle floating-point precision issues
		const fixedRate = Math.round(product.fixedRate * 100) / 100;
		const aprc = calculateAprc(fixedRate, product.fixedRateTerm, svrRate);

		return {
			id: generateRateId(product),
			name: generateRateName(product),
			lenderId: LENDER_ID,
			type: "fixed",
			rate: fixedRate,
			apr: aprc,
			fixedTerm: termYears,
			minLtv: product.ltvMin,
			maxLtv: product.ltvMax,
			buyerTypes: mapBuyerType(product.borrowerType),
			newBusiness: true, // Fixed rate products are for new mortgage applications
			perks: [],
		};
	});

	// Add SVR for existing customers (after fixed period ends)

	rates.push({
		id: `${LENDER_ID}-variable-svr`,
		name: "Standard Variable Rate",
		lenderId: LENDER_ID,
		type: "variable",
		rate: svrRate,
		minLtv: 0,
		maxLtv: 90,
		buyerTypes: ["ftb", "mover", "switcher-pdh"],
		newBusiness: false, // SVR is for existing customers after fixed period ends
		perks: [],
		warning:
			"This rate is not publicly listed on their website, but is used as part of the APRC calculation.",
	});

	console.log(`Parsed ${rates.length} rates from Núa (including SVR)`);
	return rates;
}

export const nuaProvider: LenderProvider = {
	lenderId: LENDER_ID,
	name: "Núa Mortgages",
	url: "https://nuamoney.com/mortgage-rates",
	scrape: fetchAndParseRates,
};
