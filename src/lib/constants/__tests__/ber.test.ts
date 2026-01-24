import { describe, expect, it } from "vitest";
import {
	BER_GROUP_A,
	BER_GROUP_B,
	BER_GROUP_C,
	BER_GROUP_D,
	BER_GROUP_E,
	BER_RATINGS,
	getBerGroup,
	isGreenBer,
} from "../ber";

describe("isGreenBer", () => {
	describe("returns true for green BER ratings (A1-B3)", () => {
		it.each([
			"A1",
			"A2",
			"A3",
			"B1",
			"B2",
			"B3",
		] as const)("returns true for %s", (rating) => {
			expect(isGreenBer(rating)).toBe(true);
		});
	});

	describe("returns false for non-green BER ratings", () => {
		const nonGreenRatings = [
			"C1",
			"C2",
			"C3",
			"D1",
			"D2",
			"E1",
			"E2",
			"F",
			"G",
			"Exempt",
		] as const;

		it.each(nonGreenRatings)("returns false for %s", (rating) => {
			expect(isGreenBer(rating)).toBe(false);
		});
	});

	it("covers all BER ratings", () => {
		// Ensure test covers all defined BER ratings
		const testedRatings = [
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
			"Exempt",
		];
		expect(testedRatings).toEqual(BER_RATINGS);
	});
});

describe("getBerGroup", () => {
	describe("Group A ratings", () => {
		it.each(BER_GROUP_A)("returns 'A' for %s", (rating) => {
			expect(getBerGroup(rating)).toBe("A");
		});
	});

	describe("Group B ratings", () => {
		it.each(BER_GROUP_B)("returns 'B' for %s", (rating) => {
			expect(getBerGroup(rating)).toBe("B");
		});
	});

	describe("Group C ratings", () => {
		it.each(BER_GROUP_C)("returns 'C' for %s", (rating) => {
			expect(getBerGroup(rating)).toBe("C");
		});
	});

	describe("Group D ratings", () => {
		it.each(BER_GROUP_D)("returns 'D' for %s", (rating) => {
			expect(getBerGroup(rating)).toBe("D");
		});
	});

	describe("Group E ratings", () => {
		it.each(BER_GROUP_E)("returns 'E' for %s", (rating) => {
			expect(getBerGroup(rating)).toBe("E");
		});
	});

	it("returns 'F' for F rating", () => {
		expect(getBerGroup("F")).toBe("F");
	});

	it("returns 'G' for G rating", () => {
		expect(getBerGroup("G")).toBe("G");
	});

	it("returns 'Exempt' for Exempt rating", () => {
		expect(getBerGroup("Exempt")).toBe("Exempt");
	});

	it("maps all BER ratings to their correct groups", () => {
		const expectedGroups: Record<string, string> = {
			A1: "A",
			A2: "A",
			A3: "A",
			B1: "B",
			B2: "B",
			B3: "B",
			C1: "C",
			C2: "C",
			C3: "C",
			D1: "D",
			D2: "D",
			E1: "E",
			E2: "E",
			F: "F",
			G: "G",
			Exempt: "Exempt",
		};

		for (const rating of BER_RATINGS) {
			expect(getBerGroup(rating)).toBe(expectedGroups[rating]);
		}
	});
});
