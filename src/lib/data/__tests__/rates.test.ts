import { describe, expect, it } from "vitest";
import type { MortgageRate } from "@/lib/schemas/rate";
import { filterRates } from "../rates";

// Helper to create a minimal valid rate
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
		buyerTypes: ["ftb", "mover"],
		perks: [],
		...overrides,
	};
}

describe("filterRates", () => {
	describe("minLoan filtering", () => {
		const standardRate = createRate({ id: "standard", minLoan: undefined });
		const hvmRate = createRate({ id: "hvm", minLoan: 250000 });
		const rates = [standardRate, hvmRate];

		it("excludes rates when mortgage amount is below minLoan", () => {
			const result = filterRates(rates, { mortgageAmount: 200000 });
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("standard");
		});

		it("includes rates when mortgage amount equals minLoan", () => {
			const result = filterRates(rates, { mortgageAmount: 250000 });
			expect(result).toHaveLength(2);
		});

		it("includes rates when mortgage amount exceeds minLoan", () => {
			const result = filterRates(rates, { mortgageAmount: 300000 });
			expect(result).toHaveLength(2);
		});

		it("includes all rates when mortgageAmount filter is not specified", () => {
			const result = filterRates(rates, {});
			expect(result).toHaveLength(2);
		});

		it("includes rates without minLoan regardless of mortgage amount", () => {
			const result = filterRates(rates, { mortgageAmount: 100000 });
			expect(result).toContainEqual(
				expect.objectContaining({ id: "standard" }),
			);
		});
	});

	describe("LTV filtering", () => {
		const lowLtvRate = createRate({ id: "low-ltv", minLtv: 0, maxLtv: 60 });
		const midLtvRate = createRate({ id: "mid-ltv", minLtv: 60, maxLtv: 80 });
		const highLtvRate = createRate({ id: "high-ltv", minLtv: 80, maxLtv: 90 });
		const rates = [lowLtvRate, midLtvRate, highLtvRate];

		it("filters rates by LTV - low LTV", () => {
			const result = filterRates(rates, { ltv: 50 });
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("low-ltv");
		});

		it("filters rates by LTV - boundary value", () => {
			const result = filterRates(rates, { ltv: 60 });
			expect(result).toHaveLength(2);
			expect(result.map((r) => r.id)).toContain("low-ltv");
			expect(result.map((r) => r.id)).toContain("mid-ltv");
		});

		it("filters rates by LTV - high LTV", () => {
			const result = filterRates(rates, { ltv: 85 });
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("high-ltv");
		});
	});

	describe("buyerType filtering", () => {
		const ftbOnlyRate = createRate({ id: "ftb-only", buyerTypes: ["ftb"] });
		const allBuyersRate = createRate({
			id: "all-buyers",
			buyerTypes: ["ftb", "mover", "btl"],
		});
		const rates = [ftbOnlyRate, allBuyersRate];

		it("filters rates by buyer type", () => {
			const result = filterRates(rates, { buyerType: "btl" });
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("all-buyers");
		});

		it("includes rates that support the buyer type", () => {
			const result = filterRates(rates, { buyerType: "ftb" });
			expect(result).toHaveLength(2);
		});
	});

	describe("BER filtering", () => {
		const greenRate = createRate({
			id: "green",
			berEligible: ["A1", "A2", "A3", "B1", "B2", "B3"],
		});
		const allBerRate = createRate({ id: "all-ber", berEligible: undefined });
		const rates = [greenRate, allBerRate];

		it("filters rates by BER rating", () => {
			const result = filterRates(rates, { ber: "D1" });
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("all-ber");
		});

		it("includes rates that support the BER rating", () => {
			const result = filterRates(rates, { ber: "B1" });
			expect(result).toHaveLength(2);
		});

		it("includes rates with undefined berEligible for any BER", () => {
			const result = filterRates(rates, { ber: "G" });
			expect(result).toContainEqual(expect.objectContaining({ id: "all-ber" }));
		});
	});

	describe("newBusiness filtering", () => {
		const newBusinessOnly = createRate({
			id: "new-only",
			lenderId: "aib",
			newBusiness: true,
		});
		const existingOnly = createRate({
			id: "existing-only",
			lenderId: "aib",
			newBusiness: false,
		});
		const bothRate = createRate({
			id: "both",
			lenderId: "aib",
			newBusiness: undefined,
		});
		const rates = [newBusinessOnly, existingOnly, bothRate];

		it("excludes existing-customer-only rates for new mortgages (no currentLender)", () => {
			const result = filterRates(rates, {});
			expect(result.map((r) => r.id)).not.toContain("existing-only");
			expect(result).toHaveLength(2);
		});

		it("excludes new-business-only rates when switching with same lender", () => {
			const result = filterRates(rates, { currentLender: "aib" });
			expect(result.map((r) => r.id)).not.toContain("new-only");
			expect(result.map((r) => r.id)).toContain("existing-only");
			expect(result.map((r) => r.id)).toContain("both");
		});

		it("excludes existing-customer-only rates when switching to different lender", () => {
			const result = filterRates(rates, { currentLender: "boi" });
			expect(result.map((r) => r.id)).not.toContain("existing-only");
			expect(result.map((r) => r.id)).toContain("new-only");
			expect(result.map((r) => r.id)).toContain("both");
		});
	});

	describe("combined filters", () => {
		it("applies multiple filters together", () => {
			const rates = [
				createRate({
					id: "match",
					minLtv: 0,
					maxLtv: 80,
					minLoan: 200000,
					buyerTypes: ["ftb"],
				}),
				createRate({
					id: "wrong-ltv",
					minLtv: 80,
					maxLtv: 90,
					minLoan: 200000,
					buyerTypes: ["ftb"],
				}),
				createRate({
					id: "wrong-loan",
					minLtv: 0,
					maxLtv: 80,
					minLoan: 300000,
					buyerTypes: ["ftb"],
				}),
				createRate({
					id: "wrong-buyer",
					minLtv: 0,
					maxLtv: 80,
					minLoan: 200000,
					buyerTypes: ["btl"],
				}),
			];

			const result = filterRates(rates, {
				ltv: 70,
				mortgageAmount: 250000,
				buyerType: "ftb",
			});

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("match");
		});
	});
});
