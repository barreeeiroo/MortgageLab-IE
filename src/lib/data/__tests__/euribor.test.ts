import { describe, expect, it } from "vitest";
import type { EuriborFile, EuriborTenor } from "@/lib/schemas/euribor";
import { getEuriborTimeSeries } from "../euribor";

// Helper to create a minimal Euribor file
function createEuriborFile(rates: EuriborFile["rates"] = []): EuriborFile {
	return {
		lastScrapedAt: "2025-01-01T00:00:00.000Z",
		lastUpdatedAt: "2025-01-01T00:00:00.000Z",
		ratesHash: "test-hash",
		rates,
	};
}

describe("getEuriborTimeSeries", () => {
	const sampleData = createEuriborFile([
		{ date: "2025-01-01", "1M": 3.1, "3M": 3.2, "6M": 3.3, "12M": 3.4 },
		{ date: "2025-02-01", "1M": 3.0, "3M": 3.1, "6M": 3.2, "12M": 3.3 },
		{ date: "2025-03-01", "1M": 2.9, "3M": 3.0, "6M": 3.1, "12M": 3.2 },
	]);

	it("returns correct rate ID for tenor", () => {
		const result = getEuriborTimeSeries(sampleData, "1M");

		expect(result.rateId).toBe("euribor-1M");
	});

	it("returns correct rate name for tenor", () => {
		const result = getEuriborTimeSeries(sampleData, "3M");

		expect(result.rateName).toBe("Euribor 3M");
	});

	it("returns _euribor as lenderId", () => {
		const result = getEuriborTimeSeries(sampleData, "6M");

		expect(result.lenderId).toBe("_euribor");
	});

	it("extracts 1M tenor correctly", () => {
		const result = getEuriborTimeSeries(sampleData, "1M");

		expect(result.dataPoints).toHaveLength(3);
		expect(result.dataPoints[0].rate).toBe(3.1);
		expect(result.dataPoints[1].rate).toBe(3.0);
		expect(result.dataPoints[2].rate).toBe(2.9);
	});

	it("extracts 3M tenor correctly", () => {
		const result = getEuriborTimeSeries(sampleData, "3M");

		expect(result.dataPoints).toHaveLength(3);
		expect(result.dataPoints[0].rate).toBe(3.2);
		expect(result.dataPoints[1].rate).toBe(3.1);
		expect(result.dataPoints[2].rate).toBe(3.0);
	});

	it("extracts 6M tenor correctly", () => {
		const result = getEuriborTimeSeries(sampleData, "6M");

		expect(result.dataPoints).toHaveLength(3);
		expect(result.dataPoints[0].rate).toBe(3.3);
		expect(result.dataPoints[1].rate).toBe(3.2);
		expect(result.dataPoints[2].rate).toBe(3.1);
	});

	it("extracts 12M tenor correctly", () => {
		const result = getEuriborTimeSeries(sampleData, "12M");

		expect(result.dataPoints).toHaveLength(3);
		expect(result.dataPoints[0].rate).toBe(3.4);
		expect(result.dataPoints[1].rate).toBe(3.3);
		expect(result.dataPoints[2].rate).toBe(3.2);
	});

	it("converts date to ISO timestamp", () => {
		const result = getEuriborTimeSeries(sampleData, "1M");

		// Date string "2025-01-01" should become ISO timestamp
		expect(result.dataPoints[0].timestamp).toContain("2025-01-01");
	});

	it("preserves order of rates", () => {
		const result = getEuriborTimeSeries(sampleData, "1M");

		expect(result.dataPoints[0].timestamp).toContain("2025-01-01");
		expect(result.dataPoints[1].timestamp).toContain("2025-02-01");
		expect(result.dataPoints[2].timestamp).toContain("2025-03-01");
	});

	it("handles empty rates array", () => {
		const emptyData = createEuriborFile([]);
		const result = getEuriborTimeSeries(emptyData, "1M");

		expect(result.dataPoints).toHaveLength(0);
	});

	it("handles single rate entry", () => {
		const singleData = createEuriborFile([
			{ date: "2025-01-15", "1M": 3.5, "3M": 3.6, "6M": 3.7, "12M": 3.8 },
		]);

		const result = getEuriborTimeSeries(singleData, "12M");

		expect(result.dataPoints).toHaveLength(1);
		expect(result.dataPoints[0].rate).toBe(3.8);
	});

	it("works with all tenors", () => {
		const tenors: EuriborTenor[] = ["1M", "3M", "6M", "12M"];

		for (const tenor of tenors) {
			const result = getEuriborTimeSeries(sampleData, tenor);
			expect(result.rateId).toBe(`euribor-${tenor}`);
			expect(result.rateName).toBe(`Euribor ${tenor}`);
			expect(result.dataPoints).toHaveLength(3);
		}
	});
});
