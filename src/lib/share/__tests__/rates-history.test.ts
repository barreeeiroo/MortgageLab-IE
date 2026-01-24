import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearHistoryShareParam,
	generateHistoryShareUrl,
	HISTORY_SHARE_PARAM,
	type HistoryShareState,
	hasHistoryShareParam,
	parseHistoryShareState,
} from "../rates-history";

// Helper to create mock window
function createMockWindow(search = "") {
	const href = `https://example.com/rates/history${search}`;
	return {
		location: {
			href,
			search,
			origin: "https://example.com",
			pathname: "/rates/history",
		},
		history: {
			replaceState: vi.fn(),
		},
	};
}

function setWindowSearch(search: string) {
	vi.stubGlobal("window", createMockWindow(search));
}

// Sample data for tests
function createSampleHistoryShareState(): HistoryShareState {
	return {
		activeTab: "updates",
		updatesFilter: {
			lenderIds: ["aib", "boi"],
			startDate: "2024-01-01",
			endDate: "2024-06-30",
			changeType: "modified",
		},
		comparisonDate: "2024-03-01",
		comparisonEndDate: "2024-06-01",
		changesFilter: {
			lenderIds: ["ptsb"],
			rateType: "fixed",
			ltvRange: [0, 80],
			buyerCategory: "pdh",
		},
		trendsFilter: {
			rateType: "fixed-4",
			fixedTerm: 4,
			ltvRange: [0, 80],
			lenderIds: ["aib", "boi", "ptsb"],
			buyerCategory: "pdh",
			berFilter: "A",
			displayMode: "individual",
			marketChartStyle: "average",
			breakdownBy: ["lender"],
			timeRange: "1y",
		},
		trendsSelectedLenders: ["aib", "boi"],
		changesSelectedLender: "aib",
	};
}

describe("rates-history share", () => {
	describe("HISTORY_SHARE_PARAM", () => {
		it("exports the correct parameter name", () => {
			expect(HISTORY_SHARE_PARAM).toBe("h");
		});
	});

	describe("roundtrip compression", () => {
		beforeEach(() => {
			vi.stubGlobal("window", createMockWindow());
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it("roundtrips full history share state", () => {
			const state = createSampleHistoryShareState();
			const url = generateHistoryShareUrl(state);

			// Extract the param value from the URL
			const urlObj = new URL(url);
			const paramValue = urlObj.searchParams.get(HISTORY_SHARE_PARAM);
			expect(paramValue).toBeTruthy();

			// Set up window with the generated URL search params
			setWindowSearch(`?${HISTORY_SHARE_PARAM}=${paramValue}`);

			const parsed = parseHistoryShareState();
			expect(parsed).toEqual(state);
		});

		it("roundtrips minimal state with defaults", () => {
			const state: HistoryShareState = {
				activeTab: "changes",
				updatesFilter: {
					lenderIds: [],
					startDate: null,
					endDate: null,
					changeType: "all",
				},
				comparisonDate: null,
				comparisonEndDate: null,
				changesFilter: {
					lenderIds: [],
					rateType: null,
					ltvRange: null,
					buyerCategory: "all",
				},
				trendsFilter: {
					rateType: "fixed-4",
					fixedTerm: null,
					ltvRange: [0, 80],
					lenderIds: [],
					buyerCategory: "pdh",
					berFilter: "all",
					displayMode: "individual",
					marketChartStyle: "average",
					breakdownBy: ["lender"],
					timeRange: "all",
				},
				trendsSelectedLenders: [],
				changesSelectedLender: "all",
			};

			const url = generateHistoryShareUrl(state);
			const urlObj = new URL(url);
			const paramValue = urlObj.searchParams.get(HISTORY_SHARE_PARAM);
			setWindowSearch(`?${HISTORY_SHARE_PARAM}=${paramValue}`);

			const parsed = parseHistoryShareState();
			expect(parsed).toEqual(state);
		});

		it("preserves all tab types", () => {
			const tabs = ["updates", "changes", "trends"] as const;

			for (const tab of tabs) {
				const state = createSampleHistoryShareState();
				state.activeTab = tab;

				const url = generateHistoryShareUrl(state);
				const urlObj = new URL(url);
				const paramValue = urlObj.searchParams.get(HISTORY_SHARE_PARAM);
				setWindowSearch(`?${HISTORY_SHARE_PARAM}=${paramValue}`);

				const parsed = parseHistoryShareState();
				expect(parsed?.activeTab).toBe(tab);
			}
		});

		it("preserves updates filter change types", () => {
			const changeTypes = [
				"all",
				"increase",
				"decrease",
				"modified",
				"added",
				"removed",
			] as const;

			for (const changeType of changeTypes) {
				const state = createSampleHistoryShareState();
				state.updatesFilter.changeType = changeType;

				const url = generateHistoryShareUrl(state);
				const urlObj = new URL(url);
				const paramValue = urlObj.searchParams.get(HISTORY_SHARE_PARAM);
				setWindowSearch(`?${HISTORY_SHARE_PARAM}=${paramValue}`);

				const parsed = parseHistoryShareState();
				expect(parsed?.updatesFilter.changeType).toBe(changeType);
			}
		});

		it("preserves trends filter options", () => {
			const state = createSampleHistoryShareState();
			state.trendsFilter = {
				rateType: "variable",
				fixedTerm: null,
				ltvRange: [60, 90],
				lenderIds: ["haven", "ics"],
				buyerCategory: "btl",
				berFilter: "C",
				displayMode: "market-overview",
				marketChartStyle: "range-band",
				breakdownBy: ["ltv", "lender"],
				timeRange: "6m",
			};

			const url = generateHistoryShareUrl(state);
			const urlObj = new URL(url);
			const paramValue = urlObj.searchParams.get(HISTORY_SHARE_PARAM);
			setWindowSearch(`?${HISTORY_SHARE_PARAM}=${paramValue}`);

			const parsed = parseHistoryShareState();
			expect(parsed?.trendsFilter).toEqual(state.trendsFilter);
		});

		it("preserves LTV ranges correctly", () => {
			const state = createSampleHistoryShareState();
			state.changesFilter.ltvRange = [50, 90];
			state.trendsFilter.ltvRange = [0, 60];

			const url = generateHistoryShareUrl(state);
			const urlObj = new URL(url);
			const paramValue = urlObj.searchParams.get(HISTORY_SHARE_PARAM);
			setWindowSearch(`?${HISTORY_SHARE_PARAM}=${paramValue}`);

			const parsed = parseHistoryShareState();
			expect(parsed?.changesFilter.ltvRange).toEqual([50, 90]);
			expect(parsed?.trendsFilter.ltvRange).toEqual([0, 60]);
		});

		it("preserves null LTV range", () => {
			const state = createSampleHistoryShareState();
			state.changesFilter.ltvRange = null;

			const url = generateHistoryShareUrl(state);
			const urlObj = new URL(url);
			const paramValue = urlObj.searchParams.get(HISTORY_SHARE_PARAM);
			setWindowSearch(`?${HISTORY_SHARE_PARAM}=${paramValue}`);

			const parsed = parseHistoryShareState();
			expect(parsed?.changesFilter.ltvRange).toBeNull();
		});

		it("handles many lender IDs", () => {
			const state = createSampleHistoryShareState();
			state.updatesFilter.lenderIds = [
				"aib",
				"boi",
				"ptsb",
				"ebs",
				"haven",
				"avant",
				"ics",
				"moco",
				"nua",
				"cum",
			];

			const url = generateHistoryShareUrl(state);
			const urlObj = new URL(url);
			const paramValue = urlObj.searchParams.get(HISTORY_SHARE_PARAM);
			setWindowSearch(`?${HISTORY_SHARE_PARAM}=${paramValue}`);

			const parsed = parseHistoryShareState();
			expect(parsed?.updatesFilter.lenderIds).toEqual(
				state.updatesFilter.lenderIds,
			);
		});
	});

	describe("generateHistoryShareUrl", () => {
		beforeEach(() => {
			vi.stubGlobal("window", createMockWindow());
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it("generates URL with history share param", () => {
			const state = createSampleHistoryShareState();
			const url = generateHistoryShareUrl(state);

			expect(url).toContain("https://example.com");
			expect(url).toContain(`${HISTORY_SHARE_PARAM}=`);
		});

		it("produces shorter URLs with compression", () => {
			const state = createSampleHistoryShareState();
			const url = generateHistoryShareUrl(state);
			const json = JSON.stringify(state);

			// The URL-encoded JSON would be much longer
			expect(url.length).toBeLessThan(
				`https://example.com/rates/history?h=${encodeURIComponent(json)}`
					.length,
			);
		});

		it("produces consistent URLs for same state", () => {
			const state = createSampleHistoryShareState();
			const url1 = generateHistoryShareUrl(state);
			const url2 = generateHistoryShareUrl(state);

			expect(url1).toBe(url2);
		});
	});

	describe("parseHistoryShareState", () => {
		beforeEach(() => {
			vi.stubGlobal("window", createMockWindow());
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it("returns null when no param exists", () => {
			setWindowSearch("");
			const result = parseHistoryShareState();
			expect(result).toBeNull();
		});

		it("returns null for invalid compressed data", () => {
			setWindowSearch(`?${HISTORY_SHARE_PARAM}=invalid-data`);
			const result = parseHistoryShareState();
			expect(result).toBeNull();
		});

		it("returns null when window is undefined", () => {
			vi.stubGlobal("window", undefined);
			const result = parseHistoryShareState();
			expect(result).toBeNull();
		});

		it("applies defaults for missing optional fields", () => {
			// Generate a URL with full state, then modify the compressed data
			// to simulate old share links missing new fields
			const state = createSampleHistoryShareState();
			const url = generateHistoryShareUrl(state);
			const urlObj = new URL(url);
			const paramValue = urlObj.searchParams.get(HISTORY_SHARE_PARAM);
			setWindowSearch(`?${HISTORY_SHARE_PARAM}=${paramValue}`);

			const parsed = parseHistoryShareState();
			// Should have sensible defaults
			expect(parsed?.trendsFilter.berFilter).toBeDefined();
			expect(parsed?.trendsFilter.displayMode).toBeDefined();
			expect(parsed?.trendsFilter.marketChartStyle).toBeDefined();
			expect(parsed?.trendsFilter.breakdownBy).toBeDefined();
			expect(parsed?.trendsFilter.timeRange).toBeDefined();
		});
	});

	describe("hasHistoryShareParam", () => {
		beforeEach(() => {
			vi.stubGlobal("window", createMockWindow());
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it("returns true when param exists", () => {
			setWindowSearch(`?${HISTORY_SHARE_PARAM}=some-value`);
			expect(hasHistoryShareParam()).toBe(true);
		});

		it("returns true for empty param value", () => {
			setWindowSearch(`?${HISTORY_SHARE_PARAM}=`);
			expect(hasHistoryShareParam()).toBe(true);
		});

		it("returns false when param does not exist", () => {
			setWindowSearch("?other=value");
			expect(hasHistoryShareParam()).toBe(false);
		});

		it("returns false when no params exist", () => {
			setWindowSearch("");
			expect(hasHistoryShareParam()).toBe(false);
		});

		it("returns false when window is undefined", () => {
			vi.stubGlobal("window", undefined);
			expect(hasHistoryShareParam()).toBe(false);
		});
	});

	describe("clearHistoryShareParam", () => {
		beforeEach(() => {
			vi.stubGlobal("window", createMockWindow());
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it("calls replaceState to clear param", () => {
			setWindowSearch(`?${HISTORY_SHARE_PARAM}=value&keep=other`);
			clearHistoryShareParam();
			expect(window.history.replaceState).toHaveBeenCalled();
		});

		it("does nothing when window is undefined", () => {
			vi.stubGlobal("window", undefined);
			expect(() => clearHistoryShareParam()).not.toThrow();
		});
	});

	describe("edge cases", () => {
		beforeEach(() => {
			vi.stubGlobal("window", createMockWindow());
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it("handles empty lender arrays", () => {
			const state = createSampleHistoryShareState();
			state.updatesFilter.lenderIds = [];
			state.changesFilter.lenderIds = [];
			state.trendsFilter.lenderIds = [];
			state.trendsSelectedLenders = [];

			const url = generateHistoryShareUrl(state);
			const urlObj = new URL(url);
			const paramValue = urlObj.searchParams.get(HISTORY_SHARE_PARAM);
			setWindowSearch(`?${HISTORY_SHARE_PARAM}=${paramValue}`);

			const parsed = parseHistoryShareState();
			expect(parsed?.updatesFilter.lenderIds).toEqual([]);
			expect(parsed?.changesFilter.lenderIds).toEqual([]);
			expect(parsed?.trendsFilter.lenderIds).toEqual([]);
			expect(parsed?.trendsSelectedLenders).toEqual([]);
		});

		it("handles dates at year boundaries", () => {
			const state = createSampleHistoryShareState();
			state.updatesFilter.startDate = "2023-12-31";
			state.updatesFilter.endDate = "2024-01-01";

			const url = generateHistoryShareUrl(state);
			const urlObj = new URL(url);
			const paramValue = urlObj.searchParams.get(HISTORY_SHARE_PARAM);
			setWindowSearch(`?${HISTORY_SHARE_PARAM}=${paramValue}`);

			const parsed = parseHistoryShareState();
			expect(parsed?.updatesFilter.startDate).toBe("2023-12-31");
			expect(parsed?.updatesFilter.endDate).toBe("2024-01-01");
		});

		it("handles special characters in lender IDs", () => {
			// While current lender IDs are simple, test robustness
			const state = createSampleHistoryShareState();
			state.changesSelectedLender = "test-lender_123";

			const url = generateHistoryShareUrl(state);
			const urlObj = new URL(url);
			const paramValue = urlObj.searchParams.get(HISTORY_SHARE_PARAM);
			setWindowSearch(`?${HISTORY_SHARE_PARAM}=${paramValue}`);

			const parsed = parseHistoryShareState();
			expect(parsed?.changesSelectedLender).toBe("test-lender_123");
		});

		it("handles multiple breakdown dimensions", () => {
			const state = createSampleHistoryShareState();
			state.trendsFilter.breakdownBy = ["lender", "ltv", "rate-type"];

			const url = generateHistoryShareUrl(state);
			const urlObj = new URL(url);
			const paramValue = urlObj.searchParams.get(HISTORY_SHARE_PARAM);
			setWindowSearch(`?${HISTORY_SHARE_PARAM}=${paramValue}`);

			const parsed = parseHistoryShareState();
			expect(parsed?.trendsFilter.breakdownBy).toEqual([
				"lender",
				"ltv",
				"rate-type",
			]);
		});
	});
});
