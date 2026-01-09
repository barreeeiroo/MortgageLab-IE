import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	BORROWING_SHARE_PARAM,
	type BtlShareState,
	clearBorrowingShareParam,
	type FtbShareState,
	generateBorrowingShareUrl,
	hasBorrowingShareParam,
	type MoverShareState,
	parseBorrowingShareState,
} from "../borrowing";

// Helper to create mock window with proper URL handling
function createMockWindow(search = "") {
	const href = `https://example.com/borrowing${search}`;
	return {
		location: {
			href,
			search,
			origin: "https://example.com",
			pathname: "/borrowing",
		},
		history: {
			replaceState: vi.fn(),
		},
	};
}

// Helper to set window with search params
function setWindowSearch(search: string) {
	vi.stubGlobal("window", createMockWindow(search));
}

beforeEach(() => {
	vi.stubGlobal("window", createMockWindow());
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("borrowing share", () => {
	describe("FTB calculator state", () => {
		const ftbState: FtbShareState = {
			type: "ftb",
			applicationType: "sole",
			income1: "€80,000",
			income2: "",
			birthDate1: "1990-05-15",
			birthDate2: null,
			berRating: "B2",
			savings: "€50,000",
		};

		it("generates shareable URL for FTB state", () => {
			const url = generateBorrowingShareUrl(ftbState);
			expect(url).toContain(BORROWING_SHARE_PARAM);
			expect(url).toContain("https://example.com");
		});

		it("roundtrips FTB state through URL compression", () => {
			const url = generateBorrowingShareUrl(ftbState);
			const params = new URL(url).searchParams;
			const encoded = params.get(BORROWING_SHARE_PARAM);

			setWindowSearch(`?${BORROWING_SHARE_PARAM}=${encoded}`);
			const parsed = parseBorrowingShareState();
			expect(parsed).toEqual(ftbState);
		});

		it("handles FTB with joint application", () => {
			const jointFtb: FtbShareState = {
				...ftbState,
				applicationType: "joint",
				income2: "€60,000",
				birthDate2: "1992-08-20",
			};

			const url = generateBorrowingShareUrl(jointFtb);
			const params = new URL(url).searchParams;
			const encoded = params.get(BORROWING_SHARE_PARAM);

			setWindowSearch(`?${BORROWING_SHARE_PARAM}=${encoded}`);
			const parsed = parseBorrowingShareState();
			expect(parsed).toEqual(jointFtb);
		});

		it("handles FTB with self-build fields", () => {
			const selfBuildFtb: FtbShareState = {
				...ftbState,
				isSelfBuild: true,
				siteValue: "€100,000",
			};

			const url = generateBorrowingShareUrl(selfBuildFtb);
			const params = new URL(url).searchParams;
			const encoded = params.get(BORROWING_SHARE_PARAM);

			setWindowSearch(`?${BORROWING_SHARE_PARAM}=${encoded}`);
			const parsed = parseBorrowingShareState();
			expect(parsed).toEqual(selfBuildFtb);
		});

		it("handles FTB with property type (new-build)", () => {
			const newBuildFtb: FtbShareState = {
				...ftbState,
				propertyType: "new-build",
				priceIncludesVAT: true,
			};

			const url = generateBorrowingShareUrl(newBuildFtb);
			const params = new URL(url).searchParams;
			const encoded = params.get(BORROWING_SHARE_PARAM);

			setWindowSearch(`?${BORROWING_SHARE_PARAM}=${encoded}`);
			const parsed = parseBorrowingShareState();
			expect(parsed).toEqual(newBuildFtb);
		});

		it("handles FTB with property type (new-apartment)", () => {
			const newAptFtb: FtbShareState = {
				...ftbState,
				propertyType: "new-apartment",
				priceIncludesVAT: false,
			};

			const url = generateBorrowingShareUrl(newAptFtb);
			const params = new URL(url).searchParams;
			const encoded = params.get(BORROWING_SHARE_PARAM);

			setWindowSearch(`?${BORROWING_SHARE_PARAM}=${encoded}`);
			const parsed = parseBorrowingShareState();
			expect(parsed).toEqual(newAptFtb);
		});

		it("omits existing property type (default)", () => {
			const existingPropFtb: FtbShareState = {
				...ftbState,
				propertyType: "existing",
			};

			const url = generateBorrowingShareUrl(existingPropFtb);
			const params = new URL(url).searchParams;
			const encoded = params.get(BORROWING_SHARE_PARAM);

			setWindowSearch(`?${BORROWING_SHARE_PARAM}=${encoded}`);
			const parsed = parseBorrowingShareState();
			// Property type should not be present (default omitted)
			expect(parsed?.propertyType).toBeUndefined();
		});
	});

	describe("HomeMover calculator state", () => {
		const moverState: MoverShareState = {
			type: "mover",
			applicationType: "joint",
			income1: "€90,000",
			income2: "€70,000",
			birthDate1: "1985-03-10",
			birthDate2: "1987-07-22",
			berRating: "A2",
			currentPropertyValue: "€400,000",
			outstandingMortgage: "€150,000",
			additionalSavings: "€30,000",
		};

		it("roundtrips HomeMover state", () => {
			const url = generateBorrowingShareUrl(moverState);
			const params = new URL(url).searchParams;
			const encoded = params.get(BORROWING_SHARE_PARAM);

			setWindowSearch(`?${BORROWING_SHARE_PARAM}=${encoded}`);
			const parsed = parseBorrowingShareState();
			expect(parsed).toEqual(moverState);
		});

		it("handles HomeMover with self-build", () => {
			const selfBuildMover: MoverShareState = {
				...moverState,
				isSelfBuild: true,
				siteValue: "€80,000",
			};

			const url = generateBorrowingShareUrl(selfBuildMover);
			const params = new URL(url).searchParams;
			const encoded = params.get(BORROWING_SHARE_PARAM);

			setWindowSearch(`?${BORROWING_SHARE_PARAM}=${encoded}`);
			const parsed = parseBorrowingShareState();
			expect(parsed).toEqual(selfBuildMover);
		});

		it("handles sole applicant HomeMover", () => {
			const soleMover: MoverShareState = {
				...moverState,
				applicationType: "sole",
				income2: "",
				birthDate2: null,
			};

			const url = generateBorrowingShareUrl(soleMover);
			const params = new URL(url).searchParams;
			const encoded = params.get(BORROWING_SHARE_PARAM);

			setWindowSearch(`?${BORROWING_SHARE_PARAM}=${encoded}`);
			const parsed = parseBorrowingShareState();
			expect(parsed).toEqual(soleMover);
		});
	});

	describe("BuyToLet calculator state", () => {
		const btlState: BtlShareState = {
			type: "btl",
			applicationType: "sole",
			income1: "€120,000",
			income2: "",
			birthDate1: "1980-01-01",
			birthDate2: null,
			berRating: "C1",
			deposit: "€100,000",
			expectedRent: "€2,000",
		};

		it("roundtrips BuyToLet state", () => {
			const url = generateBorrowingShareUrl(btlState);
			const params = new URL(url).searchParams;
			const encoded = params.get(BORROWING_SHARE_PARAM);

			setWindowSearch(`?${BORROWING_SHARE_PARAM}=${encoded}`);
			const parsed = parseBorrowingShareState();
			expect(parsed).toEqual(btlState);
		});

		it("handles joint BuyToLet application", () => {
			const jointBtl: BtlShareState = {
				...btlState,
				applicationType: "joint",
				income2: "€80,000",
				birthDate2: "1982-06-15",
			};

			const url = generateBorrowingShareUrl(jointBtl);
			const params = new URL(url).searchParams;
			const encoded = params.get(BORROWING_SHARE_PARAM);

			setWindowSearch(`?${BORROWING_SHARE_PARAM}=${encoded}`);
			const parsed = parseBorrowingShareState();
			expect(parsed).toEqual(jointBtl);
		});
	});

	describe("parseBorrowingShareState", () => {
		it("returns null when no share param present", () => {
			setWindowSearch("");
			const parsed = parseBorrowingShareState();
			expect(parsed).toBeNull();
		});

		it("returns null for invalid compressed data", () => {
			setWindowSearch(`?${BORROWING_SHARE_PARAM}=invalid-data`);
			const parsed = parseBorrowingShareState();
			expect(parsed).toBeNull();
		});

		it("returns null for empty param value", () => {
			setWindowSearch(`?${BORROWING_SHARE_PARAM}=`);
			const parsed = parseBorrowingShareState();
			expect(parsed).toBeNull();
		});
	});

	describe("hasBorrowingShareParam", () => {
		it("returns true when param is present", () => {
			setWindowSearch(`?${BORROWING_SHARE_PARAM}=somevalue`);
			expect(hasBorrowingShareParam()).toBe(true);
		});

		it("returns false when param is not present", () => {
			setWindowSearch("?other=value");
			expect(hasBorrowingShareParam()).toBe(false);
		});

		it("returns false when search is empty", () => {
			setWindowSearch("");
			expect(hasBorrowingShareParam()).toBe(false);
		});

		it("returns false when window is undefined", () => {
			vi.stubGlobal("window", undefined);
			expect(hasBorrowingShareParam()).toBe(false);
		});
	});

	describe("clearBorrowingShareParam", () => {
		it("removes the share param from URL", () => {
			setWindowSearch(`?${BORROWING_SHARE_PARAM}=value&other=keep`);
			clearBorrowingShareParam();
			expect(window.history.replaceState).toHaveBeenCalled();
		});
	});

	describe("compression efficiency", () => {
		it("produces reasonably sized URLs", () => {
			const fullState: FtbShareState = {
				type: "ftb",
				applicationType: "joint",
				income1: "€100,000",
				income2: "€80,000",
				birthDate1: "1990-01-15",
				birthDate2: "1992-06-20",
				berRating: "A1",
				savings: "€75,000",
				propertyType: "new-build",
				priceIncludesVAT: true,
				isSelfBuild: true,
				siteValue: "€120,000",
			};

			const url = generateBorrowingShareUrl(fullState);
			const params = new URL(url).searchParams;
			const encoded = params.get(BORROWING_SHARE_PARAM);

			// Encoded param should be reasonably short (under 200 chars for this data)
			expect(encoded?.length).toBeLessThan(200);
		});
	});

	describe("all BER ratings", () => {
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

		it.each(berRatings)("roundtrips state with BER rating %s", (ber) => {
			const state: FtbShareState = {
				type: "ftb",
				applicationType: "sole",
				income1: "€50,000",
				income2: "",
				birthDate1: "1990-01-01",
				birthDate2: null,
				berRating: ber as FtbShareState["berRating"],
				savings: "€25,000",
			};

			const url = generateBorrowingShareUrl(state);
			const params = new URL(url).searchParams;
			const encoded = params.get(BORROWING_SHARE_PARAM);

			setWindowSearch(`?${BORROWING_SHARE_PARAM}=${encoded}`);
			const parsed = parseBorrowingShareState();
			expect(parsed?.berRating).toBe(ber);
		});
	});
});
