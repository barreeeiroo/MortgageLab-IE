import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearRatesShareParam,
	generateRatesShareUrl,
	hasRatesShareParam,
	parseRatesShareState,
	RATES_SHARE_PARAM,
	type RatesShareState,
} from "../rates";

// Helper to create mock window with proper URL handling
function createMockWindow(search = "", hash = "") {
	const href = `https://example.com/rates${search}${hash}`;
	return {
		location: {
			href,
			search,
			hash,
			origin: "https://example.com",
			pathname: "/rates",
		},
		history: {
			replaceState: vi.fn(),
		},
	};
}

function setWindowSearch(search: string) {
	vi.stubGlobal("window", createMockWindow(search));
}

beforeEach(() => {
	vi.stubGlobal("window", createMockWindow());
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("rates share", () => {
	describe("basic state", () => {
		const basicState: RatesShareState = {
			input: {
				mode: "first-mortgage",
				propertyValue: "€400,000",
				mortgageAmount: "€360,000",
				monthlyRepayment: "",
				mortgageTerm: "30",
				berRating: "B2",
				buyerType: "ftb",
				currentLender: "",
			},
			table: {
				columnVisibility: {},
				columnFilters: [],
				sorting: [],
			},
		};

		it("generates shareable URL", () => {
			const url = generateRatesShareUrl(basicState);
			expect(url).toContain(RATES_SHARE_PARAM);
			expect(url).toContain("https://example.com");
		});

		it("sets hash to mode", () => {
			const url = generateRatesShareUrl(basicState);
			expect(url).toContain("#first-mortgage");
		});

		it("roundtrips basic state", () => {
			const url = generateRatesShareUrl(basicState);
			const params = new URL(url).searchParams;
			const encoded = params.get(RATES_SHARE_PARAM);

			setWindowSearch(`?${RATES_SHARE_PARAM}=${encoded}`);
			const parsed = parseRatesShareState();
			expect(parsed).toEqual(basicState);
		});
	});

	describe("remortgage mode", () => {
		const remortgageState: RatesShareState = {
			input: {
				mode: "remortgage",
				propertyValue: "€500,000",
				mortgageAmount: "€300,000",
				monthlyRepayment: "€1,500",
				mortgageTerm: "25",
				berRating: "A2",
				buyerType: "mover",
				currentLender: "aib",
			},
			table: {
				columnVisibility: {},
				columnFilters: [],
				sorting: [],
			},
		};

		it("roundtrips remortgage state", () => {
			const url = generateRatesShareUrl(remortgageState);
			const params = new URL(url).searchParams;
			const encoded = params.get(RATES_SHARE_PARAM);

			setWindowSearch(`?${RATES_SHARE_PARAM}=${encoded}`);
			const parsed = parseRatesShareState();
			expect(parsed).toEqual(remortgageState);
		});

		it("sets hash to remortgage", () => {
			const url = generateRatesShareUrl(remortgageState);
			expect(url).toContain("#remortgage");
		});
	});

	describe("table state", () => {
		const baseState: RatesShareState = {
			input: {
				mode: "first-mortgage",
				propertyValue: "€350,000",
				mortgageAmount: "€315,000",
				monthlyRepayment: "",
				mortgageTerm: "30",
				berRating: "B2",
				buyerType: "ftb",
				currentLender: "",
			},
			table: {
				columnVisibility: {},
				columnFilters: [],
				sorting: [],
			},
		};

		it("roundtrips column visibility", () => {
			const state: RatesShareState = {
				...baseState,
				table: {
					columnVisibility: {
						aprc: false,
						lender: true,
						rate: true,
						payment: true,
					},
					columnFilters: [],
					sorting: [],
				},
			};

			const url = generateRatesShareUrl(state);
			const params = new URL(url).searchParams;
			const encoded = params.get(RATES_SHARE_PARAM);

			setWindowSearch(`?${RATES_SHARE_PARAM}=${encoded}`);
			const parsed = parseRatesShareState();
			expect(parsed?.table.columnVisibility).toEqual(
				state.table.columnVisibility,
			);
		});

		it("roundtrips column filters", () => {
			const state: RatesShareState = {
				...baseState,
				table: {
					columnVisibility: {},
					columnFilters: [
						{ id: "lender", value: ["aib", "boi"] },
						{ id: "type", value: "fixed" },
					],
					sorting: [],
				},
			};

			const url = generateRatesShareUrl(state);
			const params = new URL(url).searchParams;
			const encoded = params.get(RATES_SHARE_PARAM);

			setWindowSearch(`?${RATES_SHARE_PARAM}=${encoded}`);
			const parsed = parseRatesShareState();
			expect(parsed?.table.columnFilters).toEqual(state.table.columnFilters);
		});

		it("roundtrips sorting state", () => {
			const state: RatesShareState = {
				...baseState,
				table: {
					columnVisibility: {},
					columnFilters: [],
					sorting: [
						{ id: "rate", desc: false },
						{ id: "payment", desc: true },
					],
				},
			};

			const url = generateRatesShareUrl(state);
			const params = new URL(url).searchParams;
			const encoded = params.get(RATES_SHARE_PARAM);

			setWindowSearch(`?${RATES_SHARE_PARAM}=${encoded}`);
			const parsed = parseRatesShareState();
			expect(parsed?.table.sorting).toEqual(state.table.sorting);
		});

		it("omits empty table state arrays", () => {
			const url = generateRatesShareUrl(baseState);
			const params = new URL(url).searchParams;
			const encoded = params.get(RATES_SHARE_PARAM);

			setWindowSearch(`?${RATES_SHARE_PARAM}=${encoded}`);
			const parsed = parseRatesShareState();
			expect(parsed?.table.columnVisibility).toEqual({});
			expect(parsed?.table.columnFilters).toEqual([]);
			expect(parsed?.table.sorting).toEqual([]);
		});
	});

	describe("custom rates", () => {
		const baseState: RatesShareState = {
			input: {
				mode: "first-mortgage",
				propertyValue: "€350,000",
				mortgageAmount: "€315,000",
				monthlyRepayment: "",
				mortgageTerm: "30",
				berRating: "B2",
				buyerType: "ftb",
				currentLender: "",
			},
			table: {
				columnVisibility: {},
				columnFilters: [],
				sorting: [],
			},
		};

		it("roundtrips state with custom rates", () => {
			const state: RatesShareState = {
				...baseState,
				customRates: [
					{
						id: "custom-1",
						lenderId: "aib",
						name: "My Custom Rate",
						rate: 3.25,
						type: "fixed",
						fixedTerm: 3,
						minLtv: 0,
						maxLtv: 80,
						buyerTypes: ["ftb", "mover"],
						perks: [],
					},
				],
			};

			const url = generateRatesShareUrl(state);
			const params = new URL(url).searchParams;
			const encoded = params.get(RATES_SHARE_PARAM);

			setWindowSearch(`?${RATES_SHARE_PARAM}=${encoded}`);
			const parsed = parseRatesShareState();
			expect(parsed?.customRates).toHaveLength(1);
			expect(parsed?.customRates?.[0].name).toBe("My Custom Rate");
			expect(parsed?.customRates?.[0].rate).toBe(3.25);
		});

		it("handles multiple custom rates", () => {
			const state: RatesShareState = {
				...baseState,
				customRates: [
					{
						id: "custom-1",
						lenderId: "aib",
						name: "Rate A",
						rate: 3.0,
						type: "fixed",
						fixedTerm: 2,
						minLtv: 0,
						maxLtv: 90,
						buyerTypes: ["ftb"],
						perks: [],
					},
					{
						id: "custom-2",
						lenderId: "boi",
						name: "Rate B",
						rate: 3.5,
						type: "variable",
						minLtv: 0,
						maxLtv: 80,
						buyerTypes: ["mover"],
						perks: [],
					},
				],
			};

			const url = generateRatesShareUrl(state);
			const params = new URL(url).searchParams;
			const encoded = params.get(RATES_SHARE_PARAM);

			setWindowSearch(`?${RATES_SHARE_PARAM}=${encoded}`);
			const parsed = parseRatesShareState();
			expect(parsed?.customRates).toHaveLength(2);
		});
	});

	describe("custom perks", () => {
		const baseState: RatesShareState = {
			input: {
				mode: "first-mortgage",
				propertyValue: "€350,000",
				mortgageAmount: "€315,000",
				monthlyRepayment: "",
				mortgageTerm: "30",
				berRating: "B2",
				buyerType: "ftb",
				currentLender: "",
			},
			table: {
				columnVisibility: {},
				columnFilters: [],
				sorting: [],
			},
		};

		it("roundtrips state with custom perks", () => {
			const state: RatesShareState = {
				...baseState,
				customPerks: [
					{
						id: "perk-1",
						label: "€2,000 Cashback",
						icon: "Coins",
					},
				],
			};

			const url = generateRatesShareUrl(state);
			const params = new URL(url).searchParams;
			const encoded = params.get(RATES_SHARE_PARAM);

			setWindowSearch(`?${RATES_SHARE_PARAM}=${encoded}`);
			const parsed = parseRatesShareState();
			expect(parsed?.customPerks).toHaveLength(1);
			expect(parsed?.customPerks?.[0].label).toBe("€2,000 Cashback");
		});
	});

	describe("compare state", () => {
		const baseState: RatesShareState = {
			input: {
				mode: "first-mortgage",
				propertyValue: "€350,000",
				mortgageAmount: "€315,000",
				monthlyRepayment: "",
				mortgageTerm: "30",
				berRating: "B2",
				buyerType: "ftb",
				currentLender: "",
			},
			table: {
				columnVisibility: {},
				columnFilters: [],
				sorting: [],
			},
		};

		it("roundtrips compare rateIds", () => {
			const state: RatesShareState = {
				...baseState,
				compare: {
					rateIds: ["rate-1", "rate-2", "rate-3"],
				},
			};

			const url = generateRatesShareUrl(state);
			const params = new URL(url).searchParams;
			const encoded = params.get(RATES_SHARE_PARAM);

			setWindowSearch(`?${RATES_SHARE_PARAM}=${encoded}`);
			const parsed = parseRatesShareState();
			expect(parsed?.compare?.rateIds).toEqual(["rate-1", "rate-2", "rate-3"]);
		});

		it("omits empty compare state", () => {
			const state: RatesShareState = {
				...baseState,
				compare: {
					rateIds: [],
				},
			};

			const url = generateRatesShareUrl(state);
			const params = new URL(url).searchParams;
			const encoded = params.get(RATES_SHARE_PARAM);

			setWindowSearch(`?${RATES_SHARE_PARAM}=${encoded}`);
			const parsed = parseRatesShareState();
			expect(parsed?.compare).toBeUndefined();
		});
	});

	describe("parseRatesShareState", () => {
		it("returns null when no share param present", () => {
			setWindowSearch("");
			const parsed = parseRatesShareState();
			expect(parsed).toBeNull();
		});

		it("returns null for invalid compressed data", () => {
			setWindowSearch(`?${RATES_SHARE_PARAM}=invalid-data`);
			const parsed = parseRatesShareState();
			expect(parsed).toBeNull();
		});

		it("returns null for empty param value", () => {
			setWindowSearch(`?${RATES_SHARE_PARAM}=`);
			const parsed = parseRatesShareState();
			expect(parsed).toBeNull();
		});
	});

	describe("hasRatesShareParam", () => {
		it("returns true when param is present", () => {
			setWindowSearch(`?${RATES_SHARE_PARAM}=somevalue`);
			expect(hasRatesShareParam()).toBe(true);
		});

		it("returns false when param is not present", () => {
			setWindowSearch("?other=value");
			expect(hasRatesShareParam()).toBe(false);
		});

		it("returns false when window is undefined", () => {
			vi.stubGlobal("window", undefined);
			expect(hasRatesShareParam()).toBe(false);
		});
	});

	describe("clearRatesShareParam", () => {
		it("removes the share param from URL", () => {
			setWindowSearch(`?${RATES_SHARE_PARAM}=value&other=keep`);
			clearRatesShareParam();
			expect(window.history.replaceState).toHaveBeenCalled();
		});
	});

	describe("buyer types", () => {
		const buyerTypes = ["ftb", "mover", "btl"];

		it.each(buyerTypes)("roundtrips state with buyer type %s", (buyerType) => {
			const state: RatesShareState = {
				input: {
					mode: "first-mortgage",
					propertyValue: "€350,000",
					mortgageAmount: "€315,000",
					monthlyRepayment: "",
					mortgageTerm: "30",
					berRating: "B2",
					buyerType,
					currentLender: "",
				},
				table: {
					columnVisibility: {},
					columnFilters: [],
					sorting: [],
				},
			};

			const url = generateRatesShareUrl(state);
			const params = new URL(url).searchParams;
			const encoded = params.get(RATES_SHARE_PARAM);

			setWindowSearch(`?${RATES_SHARE_PARAM}=${encoded}`);
			const parsed = parseRatesShareState();
			expect(parsed?.input.buyerType).toBe(buyerType);
		});
	});
});
