import { describe, expect, it } from "vitest";
import type { Lender } from "@/lib/schemas/lender";
import type { MortgageRate } from "@/lib/schemas/rate";
import type { RatePeriod } from "@/lib/schemas/simulate";
import type { CustomRate } from "../../custom-rates";
import {
	computeResolvedRatePeriods,
	isMonthDuringConstruction,
} from "../simulate-calculations";

// Helper to create a minimal rate
function createRate(overrides: Partial<MortgageRate> = {}): MortgageRate {
	return {
		id: "test-rate",
		name: "Test Rate",
		lenderId: "test-lender",
		type: "fixed",
		rate: 3.5,
		fixedTerm: 3,
		minLtv: 0,
		maxLtv: 90,
		buyerTypes: ["ftb"],
		perks: [],
		...overrides,
	};
}

// Helper to create a minimal lender
function createLender(overrides: Partial<Lender> = {}): Lender {
	return {
		id: "test-lender",
		name: "Test Lender",
		shortName: "Test",
		mortgagesUrl: "https://example.com/mortgages",
		perks: [],
		logo: "/logos/test.webp",
		ratesUrl: "https://example.com/rates",
		...overrides,
	};
}

describe("computeResolvedRatePeriods", () => {
	const rates: MortgageRate[] = [
		createRate({ id: "rate-1", lenderId: "aib", rate: 3.5, fixedTerm: 3 }),
		createRate({ id: "rate-2", lenderId: "aib", rate: 4.0, type: "variable" }),
	];

	const lenders: Lender[] = [createLender({ id: "aib", name: "AIB" })];

	const customRates: CustomRate[] = [];

	it("resolves single rate period starting at month 1", () => {
		const ratePeriods: RatePeriod[] = [
			{
				id: "period-1",
				lenderId: "aib",
				rateId: "rate-1",
				isCustom: false,
				durationMonths: 36,
			},
		];

		const result = computeResolvedRatePeriods(
			ratePeriods,
			rates,
			customRates,
			lenders,
		);

		expect(result).toHaveLength(1);
		expect(result[0].startMonth).toBe(1);
		expect(result[0].rate).toBe(3.5);
	});

	it("computes start months sequentially (stack-based)", () => {
		const ratePeriods: RatePeriod[] = [
			{
				id: "period-1",
				lenderId: "aib",
				rateId: "rate-1",
				isCustom: false,
				durationMonths: 36,
			},
			{
				id: "period-2",
				lenderId: "aib",
				rateId: "rate-2",
				isCustom: false,
				durationMonths: 0, // Until end
			},
		];

		const result = computeResolvedRatePeriods(
			ratePeriods,
			rates,
			customRates,
			lenders,
		);

		expect(result).toHaveLength(2);
		expect(result[0].startMonth).toBe(1);
		expect(result[1].startMonth).toBe(37); // After 36 months
	});

	it("resolves lender name", () => {
		const ratePeriods: RatePeriod[] = [
			{
				id: "period-1",
				lenderId: "aib",
				rateId: "rate-1",
				isCustom: false,
				durationMonths: 36,
			},
		];

		const result = computeResolvedRatePeriods(
			ratePeriods,
			rates,
			customRates,
			lenders,
		);

		expect(result[0].lenderName).toBe("AIB");
	});

	it("returns empty array for no rate periods", () => {
		const result = computeResolvedRatePeriods([], rates, customRates, lenders);

		expect(result).toEqual([]);
	});

	it("filters out unresolved rate periods", () => {
		const ratePeriods: RatePeriod[] = [
			{
				id: "period-1",
				lenderId: "unknown",
				rateId: "unknown-rate",
				isCustom: false,
				durationMonths: 36,
			},
		];

		const result = computeResolvedRatePeriods(
			ratePeriods,
			rates,
			customRates,
			lenders,
		);

		// Should return empty because rate doesn't exist
		expect(result).toHaveLength(0);
	});

	it("resolves custom rates", () => {
		const customRate: CustomRate = {
			id: "custom-rate-1",
			name: "My Custom Rate",
			lenderId: "aib",
			type: "fixed",
			rate: 3.25,
			minLtv: 0,
			maxLtv: 90,
			buyerTypes: ["ftb"],
			perks: [],
			isCustom: true,
		};

		const ratePeriods: RatePeriod[] = [
			{
				id: "period-1",
				lenderId: "aib",
				rateId: "custom-rate-1",
				isCustom: true,
				durationMonths: 36,
			},
		];

		const result = computeResolvedRatePeriods(
			ratePeriods,
			rates,
			[customRate],
			lenders,
		);

		expect(result).toHaveLength(1);
		expect(result[0].rate).toBe(3.25);
		expect(result[0].rateName).toBe("My Custom Rate");
	});

	it("handles multiple sequential periods", () => {
		const ratePeriods: RatePeriod[] = [
			{
				id: "period-1",
				lenderId: "aib",
				rateId: "rate-1",
				isCustom: false,
				durationMonths: 24,
			},
			{
				id: "period-2",
				lenderId: "aib",
				rateId: "rate-1",
				isCustom: false,
				durationMonths: 36,
			},
			{
				id: "period-3",
				lenderId: "aib",
				rateId: "rate-2",
				isCustom: false,
				durationMonths: 0,
			},
		];

		const result = computeResolvedRatePeriods(
			ratePeriods,
			rates,
			customRates,
			lenders,
		);

		expect(result).toHaveLength(3);
		expect(result[0].startMonth).toBe(1);
		expect(result[1].startMonth).toBe(25); // 1 + 24
		expect(result[2].startMonth).toBe(61); // 1 + 24 + 36
	});
});

describe("isMonthDuringConstruction", () => {
	it("returns true when month is before construction end", () => {
		expect(isMonthDuringConstruction(1, 12)).toBe(true);
		expect(isMonthDuringConstruction(6, 12)).toBe(true);
		expect(isMonthDuringConstruction(11, 12)).toBe(true);
	});

	it("returns true when month equals construction end", () => {
		expect(isMonthDuringConstruction(12, 12)).toBe(true);
	});

	it("returns false when month is after construction end", () => {
		expect(isMonthDuringConstruction(13, 12)).toBe(false);
		expect(isMonthDuringConstruction(24, 12)).toBe(false);
		expect(isMonthDuringConstruction(100, 12)).toBe(false);
	});

	it("handles construction end of 0", () => {
		// Month 0 or less is during construction
		expect(isMonthDuringConstruction(0, 0)).toBe(true);
		expect(isMonthDuringConstruction(1, 0)).toBe(false);
	});

	it("handles large construction periods", () => {
		expect(isMonthDuringConstruction(23, 24)).toBe(true);
		expect(isMonthDuringConstruction(24, 24)).toBe(true);
		expect(isMonthDuringConstruction(25, 24)).toBe(false);
	});
});
