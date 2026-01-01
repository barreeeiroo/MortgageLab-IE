import { type AprcConfig, calculateAprc } from "@/lib/mortgage";
import type { BuyerType } from "@/lib/schemas";
import type { MortgageRate } from "@/lib/schemas/rate";
import type { LenderProvider } from "../types";

const LENDER_ID = "nua";
const PRODUCTS_API_URL =
	"https://backend.nuamoney.com/v1/dictionaries/products";
const SVR_API_URL = "https://backend.nuamoney.com/v1/dictionaries/svr/current";

// APRC calculation parameters (per Núa's disclosure)
const APRC_CONFIG: AprcConfig = {
	loanAmount: 100000,
	termYears: 20,
	valuationFee: 199,
	securityReleaseFee: 80,
};

interface NuaSvr {
	_id: string;
	rate: number; // Decimal format (e.g., 0.0485 = 4.85%)
	validFrom: string;
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
		const aprc = calculateAprc(
			fixedRate,
			product.fixedRateTerm,
			svrRate,
			APRC_CONFIG,
		);

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
