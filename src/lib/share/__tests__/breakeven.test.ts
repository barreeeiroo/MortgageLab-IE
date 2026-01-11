import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	BREAKEVEN_SHARE_PARAM,
	clearBreakevenShareParam,
	generateBreakevenShareUrl,
	hasBreakevenShareParam,
	parseBreakevenShareState,
	type RemortgageBreakevenShareState,
	type RentVsBuyShareState,
} from "../breakeven";

// Helper to create mock window with proper URL handling
function createMockWindow(search = "") {
	const href = `https://example.com/breakeven${search}`;
	return {
		location: {
			href,
			search,
			origin: "https://example.com",
			pathname: "/breakeven",
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

describe("breakeven share", () => {
	describe("Rent vs Buy calculator state", () => {
		const rvbState: RentVsBuyShareState = {
			type: "rvb",
			propertyValue: "400000",
			deposit: "40000",
			mortgageTerm: "30",
			interestRate: "3.5",
			berRating: "B2",
			currentRent: "1800",
			legalFees: "3000",
			rentInflation: "2",
			homeAppreciation: "3",
			maintenanceRate: "1",
			opportunityCost: "4",
			saleCost: "2",
			serviceCharge: "1500",
			serviceChargeIncrease: "3",
		};

		it("generates shareable URL for RvB state", () => {
			const url = generateBreakevenShareUrl(rvbState);
			expect(url).toContain(BREAKEVEN_SHARE_PARAM);
			expect(url).toContain("https://example.com");
		});

		it("roundtrips Rent vs Buy state", () => {
			const url = generateBreakevenShareUrl(rvbState);
			const params = new URL(url).searchParams;
			const encoded = params.get(BREAKEVEN_SHARE_PARAM);

			setWindowSearch(`?${BREAKEVEN_SHARE_PARAM}=${encoded}`);
			const parsed = parseBreakevenShareState();
			expect(parsed).toEqual(rvbState);
		});

		it("handles RvB with new-build property type", () => {
			const newBuildRvb: RentVsBuyShareState = {
				...rvbState,
				propertyType: "new-build",
				priceIncludesVAT: true,
			};

			const url = generateBreakevenShareUrl(newBuildRvb);
			const params = new URL(url).searchParams;
			const encoded = params.get(BREAKEVEN_SHARE_PARAM);

			setWindowSearch(`?${BREAKEVEN_SHARE_PARAM}=${encoded}`);
			const parsed = parseBreakevenShareState();
			expect(parsed).toEqual(newBuildRvb);
		});

		it("handles RvB with new-apartment property type", () => {
			const newAptRvb: RentVsBuyShareState = {
				...rvbState,
				propertyType: "new-apartment",
				priceIncludesVAT: false,
			};

			const url = generateBreakevenShareUrl(newAptRvb);
			const params = new URL(url).searchParams;
			const encoded = params.get(BREAKEVEN_SHARE_PARAM);

			setWindowSearch(`?${BREAKEVEN_SHARE_PARAM}=${encoded}`);
			const parsed = parseBreakevenShareState();
			expect(parsed).toEqual(newAptRvb);
		});

		it("omits existing property type (default)", () => {
			const existingRvb: RentVsBuyShareState = {
				...rvbState,
				propertyType: "existing",
			};

			const url = generateBreakevenShareUrl(existingRvb);
			const params = new URL(url).searchParams;
			const encoded = params.get(BREAKEVEN_SHARE_PARAM);

			setWindowSearch(`?${BREAKEVEN_SHARE_PARAM}=${encoded}`);
			const parsed = parseBreakevenShareState() as RentVsBuyShareState | null;
			expect(parsed?.propertyType).toBeUndefined();
		});

		it("handles zero values in advanced options", () => {
			const zeroValuesRvb: RentVsBuyShareState = {
				...rvbState,
				rentInflation: "0",
				homeAppreciation: "0",
				maintenanceRate: "0",
				opportunityCost: "0",
				saleCost: "0",
				serviceCharge: "0",
				serviceChargeIncrease: "0",
			};

			const url = generateBreakevenShareUrl(zeroValuesRvb);
			const params = new URL(url).searchParams;
			const encoded = params.get(BREAKEVEN_SHARE_PARAM);

			setWindowSearch(`?${BREAKEVEN_SHARE_PARAM}=${encoded}`);
			const parsed = parseBreakevenShareState();
			expect(parsed).toEqual(zeroValuesRvb);
		});
	});

	describe("Remortgage Breakeven calculator state", () => {
		const rmbState: RemortgageBreakevenShareState = {
			type: "rmb",
			outstandingBalance: "250000",
			propertyValue: "400000",
			currentRate: "4.5",
			remainingTerm: "20",
			newRate: "3.2",
			rateInputMode: "picker",
			berRating: "B2",
			legalFees: "2500",
			fixedPeriodYears: "5",
		};

		it("generates shareable URL for RMB state", () => {
			const url = generateBreakevenShareUrl(rmbState);
			expect(url).toContain(BREAKEVEN_SHARE_PARAM);
		});

		it("roundtrips Remortgage Breakeven state", () => {
			const url = generateBreakevenShareUrl(rmbState);
			const params = new URL(url).searchParams;
			const encoded = params.get(BREAKEVEN_SHARE_PARAM);

			setWindowSearch(`?${BREAKEVEN_SHARE_PARAM}=${encoded}`);
			const parsed = parseBreakevenShareState();
			expect(parsed).toEqual(rmbState);
		});

		it("handles RMB with manual rate input mode", () => {
			const manualRmb: RemortgageBreakevenShareState = {
				...rmbState,
				rateInputMode: "manual",
			};

			const url = generateBreakevenShareUrl(manualRmb);
			const params = new URL(url).searchParams;
			const encoded = params.get(BREAKEVEN_SHARE_PARAM);

			setWindowSearch(`?${BREAKEVEN_SHARE_PARAM}=${encoded}`);
			const parsed = parseBreakevenShareState();
			expect(parsed).toEqual(manualRmb);
		});

		it("handles RMB with cashback", () => {
			const cashbackRmb: RemortgageBreakevenShareState = {
				...rmbState,
				cashback: "2000",
			};

			const url = generateBreakevenShareUrl(cashbackRmb);
			const params = new URL(url).searchParams;
			const encoded = params.get(BREAKEVEN_SHARE_PARAM);

			setWindowSearch(`?${BREAKEVEN_SHARE_PARAM}=${encoded}`);
			const parsed = parseBreakevenShareState();
			expect(parsed).toEqual(cashbackRmb);
		});

		it("handles RMB with early repayment charge", () => {
			const ercRmb: RemortgageBreakevenShareState = {
				...rmbState,
				erc: "5000",
			};

			const url = generateBreakevenShareUrl(ercRmb);
			const params = new URL(url).searchParams;
			const encoded = params.get(BREAKEVEN_SHARE_PARAM);

			setWindowSearch(`?${BREAKEVEN_SHARE_PARAM}=${encoded}`);
			const parsed = parseBreakevenShareState();
			expect(parsed).toEqual(ercRmb);
		});

		it("handles RMB with both cashback and ERC", () => {
			const fullRmb: RemortgageBreakevenShareState = {
				...rmbState,
				cashback: "3000",
				erc: "4500",
			};

			const url = generateBreakevenShareUrl(fullRmb);
			const params = new URL(url).searchParams;
			const encoded = params.get(BREAKEVEN_SHARE_PARAM);

			setWindowSearch(`?${BREAKEVEN_SHARE_PARAM}=${encoded}`);
			const parsed = parseBreakevenShareState();
			expect(parsed).toEqual(fullRmb);
		});

		it("handles variable rate (fixedPeriodYears = 0)", () => {
			const variableRmb: RemortgageBreakevenShareState = {
				...rmbState,
				fixedPeriodYears: "0",
			};

			const url = generateBreakevenShareUrl(variableRmb);
			const params = new URL(url).searchParams;
			const encoded = params.get(BREAKEVEN_SHARE_PARAM);

			setWindowSearch(`?${BREAKEVEN_SHARE_PARAM}=${encoded}`);
			const parsed = parseBreakevenShareState();
			expect(parsed).toEqual(variableRmb);
		});

		it("handles different fixed period durations", () => {
			const periods = ["1", "2", "3", "4", "5", "7", "10"];

			for (const period of periods) {
				const state: RemortgageBreakevenShareState = {
					...rmbState,
					fixedPeriodYears: period,
				};

				const url = generateBreakevenShareUrl(state);
				const params = new URL(url).searchParams;
				const encoded = params.get(BREAKEVEN_SHARE_PARAM);

				setWindowSearch(`?${BREAKEVEN_SHARE_PARAM}=${encoded}`);
				const parsed = parseBreakevenShareState();
				expect(parsed?.type).toBe("rmb");
				if (parsed?.type === "rmb") {
					expect(parsed.fixedPeriodYears).toBe(period);
				}
			}
		});
	});

	describe("parseBreakevenShareState", () => {
		it("returns null when no share param present", () => {
			setWindowSearch("");
			const parsed = parseBreakevenShareState();
			expect(parsed).toBeNull();
		});

		it("returns null for invalid compressed data", () => {
			setWindowSearch(`?${BREAKEVEN_SHARE_PARAM}=invalid-data`);
			const parsed = parseBreakevenShareState();
			expect(parsed).toBeNull();
		});

		it("returns null for empty param value", () => {
			setWindowSearch(`?${BREAKEVEN_SHARE_PARAM}=`);
			const parsed = parseBreakevenShareState();
			expect(parsed).toBeNull();
		});
	});

	describe("hasBreakevenShareParam", () => {
		it("returns true when param is present", () => {
			setWindowSearch(`?${BREAKEVEN_SHARE_PARAM}=somevalue`);
			expect(hasBreakevenShareParam()).toBe(true);
		});

		it("returns false when param is not present", () => {
			setWindowSearch("?other=value");
			expect(hasBreakevenShareParam()).toBe(false);
		});

		it("returns false when search is empty", () => {
			setWindowSearch("");
			expect(hasBreakevenShareParam()).toBe(false);
		});

		it("returns false when window is undefined", () => {
			vi.stubGlobal("window", undefined);
			expect(hasBreakevenShareParam()).toBe(false);
		});
	});

	describe("clearBreakevenShareParam", () => {
		it("removes the share param from URL", () => {
			setWindowSearch(`?${BREAKEVEN_SHARE_PARAM}=value&other=keep`);
			clearBreakevenShareParam();
			expect(window.history.replaceState).toHaveBeenCalled();
		});
	});

	describe("compression efficiency", () => {
		it("produces reasonably sized URLs for RvB", () => {
			const fullRvbState: RentVsBuyShareState = {
				type: "rvb",
				propertyValue: "500000",
				deposit: "100000",
				mortgageTerm: "35",
				interestRate: "3.75",
				berRating: "A1",
				currentRent: "2500",
				legalFees: "5000",
				rentInflation: "2.5",
				homeAppreciation: "3.5",
				maintenanceRate: "1.5",
				opportunityCost: "5",
				saleCost: "2.5",
				serviceCharge: "2000",
				serviceChargeIncrease: "4",
				propertyType: "new-build",
				priceIncludesVAT: true,
			};

			const url = generateBreakevenShareUrl(fullRvbState);
			const params = new URL(url).searchParams;
			const encoded = params.get(BREAKEVEN_SHARE_PARAM);

			expect(encoded?.length).toBeLessThan(250);
		});

		it("produces reasonably sized URLs for RMB", () => {
			const fullRmbState: RemortgageBreakevenShareState = {
				type: "rmb",
				outstandingBalance: "350000",
				propertyValue: "550000",
				currentRate: "5.25",
				remainingTerm: "25",
				newRate: "3.85",
				rateInputMode: "manual",
				berRating: "B1",
				legalFees: "3500",
				fixedPeriodYears: "7",
				cashback: "5000",
				erc: "8000",
			};

			const url = generateBreakevenShareUrl(fullRmbState);
			const params = new URL(url).searchParams;
			const encoded = params.get(BREAKEVEN_SHARE_PARAM);

			expect(encoded?.length).toBeLessThan(200);
		});
	});

	describe("BER ratings for Remortgage", () => {
		const berRatings = [
			"A1",
			"A2",
			"A3",
			"B1",
			"B2",
			"B3",
			"C1",
			"C2",
			"C3",
			"D1",
			"D2",
			"E1",
			"E2",
			"F",
			"G",
		];

		it.each(berRatings)("roundtrips RMB state with BER rating %s", (ber) => {
			const state: RemortgageBreakevenShareState = {
				type: "rmb",
				outstandingBalance: "200000",
				propertyValue: "350000",
				currentRate: "4",
				remainingTerm: "15",
				newRate: "3",
				rateInputMode: "picker",
				berRating: ber as RemortgageBreakevenShareState["berRating"],
				legalFees: "2000",
				fixedPeriodYears: "3",
			};

			const url = generateBreakevenShareUrl(state);
			const params = new URL(url).searchParams;
			const encoded = params.get(BREAKEVEN_SHARE_PARAM);

			setWindowSearch(`?${BREAKEVEN_SHARE_PARAM}=${encoded}`);
			const parsed = parseBreakevenShareState();
			expect(parsed?.type).toBe("rmb");
			if (parsed?.type === "rmb") {
				expect(parsed.berRating).toBe(ber);
			}
		});
	});
});
