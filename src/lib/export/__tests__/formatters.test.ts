import { describe, expect, it } from "vitest";
import {
	formatCurrencyForExport,
	formatCurrencyRaw,
	formatDateForExport,
	formatMonthYearForExport,
	formatNumberForExport,
	formatPercentForExport,
	formatPercentRaw,
	formatTermForExport,
	sanitizeForPDF,
} from "../formatters";

describe("formatCurrencyForExport", () => {
	it("formats positive amounts without decimals by default", () => {
		expect(formatCurrencyForExport(1000)).toBe("€1,000");
		expect(formatCurrencyForExport(350000)).toBe("€350,000");
	});

	it("formats amounts with decimals when requested", () => {
		expect(formatCurrencyForExport(1000.5, true)).toBe("€1,000.50");
		expect(formatCurrencyForExport(1234.56, true)).toBe("€1,234.56");
	});

	it("formats zero", () => {
		expect(formatCurrencyForExport(0)).toBe("€0");
		expect(formatCurrencyForExport(0, true)).toBe("€0.00");
	});

	it("formats negative amounts", () => {
		expect(formatCurrencyForExport(-500)).toBe("-€500");
		expect(formatCurrencyForExport(-1234.56, true)).toBe("-€1,234.56");
	});

	it("rounds to nearest integer without decimals", () => {
		expect(formatCurrencyForExport(1000.7)).toBe("€1,001");
		expect(formatCurrencyForExport(1000.4)).toBe("€1,000");
	});

	it("handles large amounts", () => {
		expect(formatCurrencyForExport(1000000)).toBe("€1,000,000");
		expect(formatCurrencyForExport(999999.99, true)).toBe("€999,999.99");
	});
});

describe("formatCurrencyRaw", () => {
	it("returns the value unchanged", () => {
		expect(formatCurrencyRaw(1000)).toBe(1000);
		expect(formatCurrencyRaw(1234.56)).toBe(1234.56);
		expect(formatCurrencyRaw(-500)).toBe(-500);
	});
});

describe("formatPercentForExport", () => {
	it("formats decimal values as percentages with default 2 decimals", () => {
		expect(formatPercentForExport(0.035)).toBe("3.50%");
		expect(formatPercentForExport(0.1)).toBe("10.00%");
	});

	it("formats with custom decimal places", () => {
		expect(formatPercentForExport(0.035, 1)).toBe("3.5%");
		expect(formatPercentForExport(0.035, 0)).toBe("4%");
		expect(formatPercentForExport(0.12345, 3)).toBe("12.345%");
	});

	it("formats zero", () => {
		expect(formatPercentForExport(0)).toBe("0.00%");
	});

	it("formats values greater than 1 (over 100%)", () => {
		expect(formatPercentForExport(1.5)).toBe("150.00%");
	});

	it("formats negative percentages", () => {
		expect(formatPercentForExport(-0.05)).toBe("-5.00%");
	});
});

describe("formatPercentRaw", () => {
	it("returns the value unchanged", () => {
		expect(formatPercentRaw(0.035)).toBe(0.035);
		expect(formatPercentRaw(0.1)).toBe(0.1);
	});
});

describe("formatDateForExport", () => {
	it("formats Date objects in DD/MM/YYYY format", () => {
		expect(formatDateForExport(new Date(2026, 0, 12))).toBe("12/01/2026");
		expect(formatDateForExport(new Date(2025, 11, 25))).toBe("25/12/2025");
	});

	it("formats ISO date strings", () => {
		expect(formatDateForExport("2026-01-12")).toBe("12/01/2026");
	});

	it("pads single digit days and months", () => {
		expect(formatDateForExport(new Date(2026, 0, 5))).toBe("05/01/2026");
		expect(formatDateForExport(new Date(2026, 8, 1))).toBe("01/09/2026");
	});
});

describe("formatMonthYearForExport", () => {
	it("formats Date objects as month/year", () => {
		expect(formatMonthYearForExport(new Date(2026, 0, 1))).toBe("Jan 2026");
		expect(formatMonthYearForExport(new Date(2026, 11, 15))).toBe("Dec 2026");
	});

	it("formats ISO date strings", () => {
		expect(formatMonthYearForExport("2026-06-15")).toBe("Jun 2026");
	});
});

describe("formatTermForExport", () => {
	it("formats full years", () => {
		expect(formatTermForExport(12)).toBe("1 year");
		expect(formatTermForExport(24)).toBe("2 years");
		expect(formatTermForExport(360)).toBe("30 years");
	});

	it("formats years with remaining months", () => {
		expect(formatTermForExport(18)).toBe("1y 6m");
		expect(formatTermForExport(25)).toBe("2y 1m");
		expect(formatTermForExport(37)).toBe("3y 1m");
	});

	it("handles zero months", () => {
		expect(formatTermForExport(0)).toBe("0 years");
	});

	it("handles months less than a year", () => {
		expect(formatTermForExport(6)).toBe("0y 6m");
		expect(formatTermForExport(11)).toBe("0y 11m");
	});
});

describe("formatNumberForExport", () => {
	it("formats with thousand separators", () => {
		expect(formatNumberForExport(1000)).toBe("1,000");
		expect(formatNumberForExport(1000000)).toBe("1,000,000");
	});

	it("formats with specified decimal places", () => {
		expect(formatNumberForExport(1234.567, 2)).toBe("1,234.57");
		expect(formatNumberForExport(1234, 2)).toBe("1,234.00");
	});

	it("formats zero", () => {
		expect(formatNumberForExport(0)).toBe("0");
		expect(formatNumberForExport(0, 2)).toBe("0.00");
	});

	it("formats negative numbers", () => {
		expect(formatNumberForExport(-1234)).toBe("-1,234");
	});
});

describe("sanitizeForPDF", () => {
	it("replaces less than or equal symbol", () => {
		expect(sanitizeForPDF("LTV ≤80%")).toBe("LTV <=80%");
	});

	it("replaces greater than or equal symbol", () => {
		expect(sanitizeForPDF("Rate ≥3.5%")).toBe("Rate >=3.5%");
	});

	it("replaces en-dash and em-dash", () => {
		expect(sanitizeForPDF("2024–2025")).toBe("2024-2025");
		expect(sanitizeForPDF("value—description")).toBe("value-description");
	});

	it("replaces curly quotes", () => {
		// Single curly quotes ' and ' (U+2018, U+2019) to straight '
		expect(sanitizeForPDF("\u2018quoted\u2019")).toBe("'quoted'");
		// Double curly quotes " and " (U+201C, U+201D) to straight "
		expect(sanitizeForPDF("\u201Cdouble\u201D")).toBe('"double"');
	});

	it("handles multiple replacements", () => {
		expect(sanitizeForPDF("3 Year Fixed – LTV ≤60%")).toBe(
			"3 Year Fixed - LTV <=60%",
		);
	});

	it("leaves regular ASCII text unchanged", () => {
		expect(sanitizeForPDF("Normal text 123")).toBe("Normal text 123");
	});
});
