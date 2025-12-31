import type { BuyerType, MortgageRate } from "@/lib/schemas";
import type { LenderProvider } from "../types";

const LENDER_ID = "boi";
const RATES_URL =
	"https://personalbanking.bankofireland.com/borrow/mortgages/mortgage-interest-rates/";

// BER group mappings
const BER_GROUPS: Record<string, string[]> = {
	A: ["A1", "A2", "A3"],
	B: ["B1", "B2", "B3"],
	C: ["C1", "C2", "C3"],
	D: ["D1", "D2"],
	E: ["E1", "E2"],
	F: ["F"],
	G: ["G"],
	Exempt: ["Exempt"],
};

async function fetchAndParseRates(): Promise<MortgageRate[]> {
	console.log("Fetching rates page...");
	const response = await fetch(RATES_URL);
	const html = await response.text();

	console.log("Parsing HTML content...");

	const rates: MortgageRate[] = [];

	// Standard rates for FTB/Mover/Switcher
	const standardRates = parseStandardRates(html);
	rates.push(...standardRates);

	// HVM rates
	const hvmRates = parseHvmRates(html);
	rates.push(...hvmRates);

	// BTL rates
	const btlRates = parseBtlRates(html);
	rates.push(...btlRates);

	return rates;
}

function parseStandardRates(_html: string): MortgageRate[] {
	const rates: MortgageRate[] = [];
	const buyerTypes: BuyerType[] = ["ftb", "mover", "switcher-pdh"];

	// Standard fixed rates from BOI (as of last scrape)
	const standardProducts = [
		{ term: 2, baseRate: 3.8, apr: 4.3 },
		{ term: 3, baseRate: 3.9, apr: 4.4 },
		{ term: 5, baseRate: 3.9, apr: 4.4 },
		{ term: 10, baseRate: 4.2, apr: 4.7 },
	];

	const berGroups = ["A", "B", "C", "D", "E", "F", "G", "Exempt"];
	const rateIncrement = 0.05;

	for (const product of standardProducts) {
		for (let i = 0; i < berGroups.length; i++) {
			const berGroup = berGroups[i];
			const rate = Number((product.baseRate + i * rateIncrement).toFixed(2));

			rates.push({
				id: `boi-fixed-${product.term}yr-ber-${berGroup.toLowerCase()}`,
				name: `${product.term} Year Fixed - BER ${berGroup}`,
				lenderId: LENDER_ID,
				type: "fixed",
				rate,
				apr: product.apr,
				fixedTerm: product.term,
				minLtv: 0,
				maxLtv: 90,
				buyerTypes,
				berEligible: BER_GROUPS[berGroup],
				perks: ["cashback-3pct"],
			});
		}
	}

	// Variable rate
	rates.push({
		id: "boi-variable",
		name: "Variable Rate",
		lenderId: LENDER_ID,
		type: "variable",
		rate: 4.15,
		apr: 4.3,
		minLtv: 0,
		maxLtv: 90,
		buyerTypes,
		perks: [],
	});

	return rates;
}

function parseHvmRates(_html: string): MortgageRate[] {
	const rates: MortgageRate[] = [];
	const buyerTypes: BuyerType[] = ["ftb", "mover", "switcher-pdh"];

	// HVM products (€250k+ loans)
	const hvmProducts = [
		{ term: 1, baseRate: 3.3, apr: 4.2 },
		{ term: 4, baseRate: 3.1, apr: 4.0 },
		{ term: 5, baseRate: 3.4, apr: 4.1 },
		{ term: 7, baseRate: 3.45, apr: 4.0 },
	];

	const berGroups = ["A", "B", "C", "D", "E", "F", "G", "Exempt"];
	const rateIncrement = 0.05;

	for (const product of hvmProducts) {
		for (let i = 0; i < berGroups.length; i++) {
			const berGroup = berGroups[i];
			const rate = Number((product.baseRate + i * rateIncrement).toFixed(2));

			rates.push({
				id: `boi-hvm-fixed-${product.term}yr-ber-${berGroup.toLowerCase()}`,
				name: `High Value ${product.term} Year Fixed - BER ${berGroup}`,
				lenderId: LENDER_ID,
				type: "fixed",
				rate,
				apr: product.apr,
				fixedTerm: product.term,
				minLtv: 0,
				maxLtv: 90,
				minLoan: 250000,
				buyerTypes,
				berEligible: BER_GROUPS[berGroup],
				perks: [],
			});
		}
	}

	return rates;
}

function parseBtlRates(_html: string): MortgageRate[] {
	const rates: MortgageRate[] = [];
	const buyerTypes: BuyerType[] = ["btl", "switcher-btl"];

	// BTL fixed rates
	const btlProducts = [
		{ term: 2, baseRate: 5.65, apr: 6.4 },
		{ term: 5, baseRate: 5.8, apr: 6.5 },
	];

	// BTL only goes up to BER E, then Exempt (F and G not eligible)
	const btlBerGroups = ["A", "B", "C", "D", "E", "Exempt"];
	const rateIncrement = 0.05;

	for (const product of btlProducts) {
		for (let i = 0; i < btlBerGroups.length; i++) {
			const berGroup = btlBerGroups[i];
			// Exempt has a larger jump
			const rate =
				berGroup === "Exempt"
					? Number((product.baseRate + 0.35).toFixed(2))
					: Number((product.baseRate + i * rateIncrement).toFixed(2));

			rates.push({
				id: `boi-btl-fixed-${product.term}yr-ber-${berGroup.toLowerCase()}`,
				name: `Buy-to-Let ${product.term} Year Fixed - BER ${berGroup}`,
				lenderId: LENDER_ID,
				type: "fixed",
				rate,
				apr: product.apr,
				fixedTerm: product.term,
				minLtv: 0,
				maxLtv: 70,
				buyerTypes,
				berEligible: BER_GROUPS[berGroup],
				perks: [],
			});
		}
	}

	// BTL Variable rate
	rates.push({
		id: "boi-btl-variable",
		name: "Buy-to-Let Variable Rate",
		lenderId: LENDER_ID,
		type: "variable",
		rate: 4.85,
		apr: 5.1,
		minLtv: 0,
		maxLtv: 70,
		buyerTypes,
		perks: [],
	});

	return rates;
}

export const boiProvider: LenderProvider = {
	lenderId: LENDER_ID,
	name: "Bank of Ireland",
	url: RATES_URL,
	scrape: fetchAndParseRates,
};
