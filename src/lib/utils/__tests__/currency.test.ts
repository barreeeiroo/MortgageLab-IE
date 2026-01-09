import { describe, expect, it } from "vitest";
import {
	formatCurrency,
	formatCurrencyInput,
	formatCurrencyShort,
	parseCurrency,
} from "../currency";

describe("formatCurrency", () => {
	describe("default formatting (no cents)", () => {
		it("formats whole numbers correctly", () => {
			expect(formatCurrency(100000)).toBe("€100,000");
		});

		it("formats zero", () => {
			expect(formatCurrency(0)).toBe("€0");
		});

		it("formats small values", () => {
			expect(formatCurrency(50)).toBe("€50");
		});

		it("formats large values with thousand separators", () => {
			expect(formatCurrency(1234567)).toBe("€1,234,567");
		});

		it("rounds decimals when showCents is false (default)", () => {
			expect(formatCurrency(1234.56)).toBe("€1,235");
		});

		it("rounds down decimals below 0.5", () => {
			expect(formatCurrency(1234.49)).toBe("€1,234");
		});

		it("handles negative values", () => {
			expect(formatCurrency(-500)).toBe("-€500");
		});
	});

	describe("with showCents option", () => {
		it("shows cents when option is true", () => {
			expect(formatCurrency(100, { showCents: true })).toBe("€100.00");
		});

		it("formats decimal values with cents", () => {
			expect(formatCurrency(1234.56, { showCents: true })).toBe("€1,234.56");
		});

		it("shows .00 for whole numbers with showCents", () => {
			expect(formatCurrency(500, { showCents: true })).toBe("€500.00");
		});

		it("handles very small cent values", () => {
			expect(formatCurrency(0.01, { showCents: true })).toBe("€0.01");
		});

		it("rounds to 2 decimal places", () => {
			expect(formatCurrency(99.999, { showCents: true })).toBe("€100.00");
		});

		it("handles negative with cents", () => {
			expect(formatCurrency(-123.45, { showCents: true })).toBe("-€123.45");
		});
	});

	describe("edge cases", () => {
		it("formats millions correctly", () => {
			expect(formatCurrency(1500000)).toBe("€1,500,000");
		});

		it("handles very small positive numbers", () => {
			expect(formatCurrency(0.001)).toBe("€0");
		});
	});
});

describe("formatCurrencyInput", () => {
	describe("valid inputs", () => {
		it("formats numeric string", () => {
			expect(formatCurrencyInput("100000")).toBe("€100,000");
		});

		it("formats string with existing currency symbol", () => {
			expect(formatCurrencyInput("€50,000")).toBe("€50,000");
		});

		it("formats string with commas", () => {
			expect(formatCurrencyInput("250,000")).toBe("€250,000");
		});

		it("extracts numbers from mixed strings", () => {
			expect(formatCurrencyInput("abc123def")).toBe("€123");
		});

		it("formats small values", () => {
			expect(formatCurrencyInput("50")).toBe("€50");
		});

		it("handles large values", () => {
			expect(formatCurrencyInput("1234567")).toBe("€1,234,567");
		});
	});

	describe("empty/invalid inputs", () => {
		it("returns empty string for empty input", () => {
			expect(formatCurrencyInput("")).toBe("");
		});

		it("returns empty string for zero", () => {
			expect(formatCurrencyInput("0")).toBe("");
		});

		it("returns empty string for non-numeric input", () => {
			expect(formatCurrencyInput("abc")).toBe("");
		});

		it("returns empty string for special characters only", () => {
			expect(formatCurrencyInput("€,")).toBe("");
		});
	});

	describe("decimal handling", () => {
		it("treats decimal point as separator and concatenates digits", () => {
			// regex strips non-numeric, so "100.50" becomes "10050"
			expect(formatCurrencyInput("100.50")).toBe("€10,050");
		});

		it("handles string with decimal and currency", () => {
			// "€1,234.56" -> strips non-digits -> "123456"
			expect(formatCurrencyInput("€1,234.56")).toBe("€123,456");
		});
	});
});

describe("parseCurrency", () => {
	describe("valid inputs", () => {
		it("parses clean number string", () => {
			expect(parseCurrency("100000")).toBe(100000);
		});

		it("parses currency formatted string", () => {
			expect(parseCurrency("€100,000")).toBe(100000);
		});

		it("parses string with commas", () => {
			expect(parseCurrency("250,000")).toBe(250000);
		});

		it("parses decimal values", () => {
			expect(parseCurrency("1234.56")).toBe(1234.56);
		});

		it("parses currency with cents", () => {
			expect(parseCurrency("€1,234.56")).toBe(1234.56);
		});

		it("parses small values", () => {
			expect(parseCurrency("50")).toBe(50);
		});

		it("parses zero", () => {
			expect(parseCurrency("0")).toBe(0);
		});
	});

	describe("invalid inputs", () => {
		it("returns 0 for empty string", () => {
			expect(parseCurrency("")).toBe(0);
		});

		it("returns 0 for non-numeric string", () => {
			expect(parseCurrency("abc")).toBe(0);
		});

		it("returns 0 for currency symbol only", () => {
			expect(parseCurrency("€")).toBe(0);
		});

		it("returns 0 for comma only", () => {
			expect(parseCurrency(",")).toBe(0);
		});
	});

	describe("edge cases", () => {
		it("handles numbers with spaces", () => {
			// Spaces are filtered out
			expect(parseCurrency("100 000")).toBe(100000);
		});

		it("handles multiple decimal points", () => {
			// parseFloat stops at second decimal, so "1.234.567" -> 1.234
			expect(parseCurrency("1.234.567")).toBe(1.234);
		});

		it("handles very large numbers", () => {
			expect(parseCurrency("9999999999")).toBe(9999999999);
		});

		it("handles decimal with no integer part", () => {
			expect(parseCurrency(".99")).toBe(0.99);
		});
	});
});

describe("formatCurrencyShort", () => {
	describe("millions", () => {
		it("formats 1 million as €1.0M", () => {
			expect(formatCurrencyShort(1000000)).toBe("€1.0M");
		});

		it("formats 1.5 million as €1.5M", () => {
			expect(formatCurrencyShort(1500000)).toBe("€1.5M");
		});

		it("formats 2.7 million as €2.7M", () => {
			expect(formatCurrencyShort(2700000)).toBe("€2.7M");
		});

		it("formats 10 million as €10.0M", () => {
			expect(formatCurrencyShort(10000000)).toBe("€10.0M");
		});

		it("formats 1.25 million as €1.3M (rounds)", () => {
			expect(formatCurrencyShort(1250000)).toBe("€1.3M");
		});

		it("formats 999,999 as €1000k (not million)", () => {
			expect(formatCurrencyShort(999999)).toBe("€1000k");
		});
	});

	describe("thousands", () => {
		it("formats 1000 as €1k", () => {
			expect(formatCurrencyShort(1000)).toBe("€1k");
		});

		it("formats 100,000 as €100k", () => {
			expect(formatCurrencyShort(100000)).toBe("€100k");
		});

		it("formats 250,000 as €250k", () => {
			expect(formatCurrencyShort(250000)).toBe("€250k");
		});

		it("formats 999,000 as €999k", () => {
			expect(formatCurrencyShort(999000)).toBe("€999k");
		});

		it("formats 1500 as €2k (rounds up)", () => {
			expect(formatCurrencyShort(1500)).toBe("€2k");
		});

		it("formats 1499 as €1k (rounds down)", () => {
			expect(formatCurrencyShort(1499)).toBe("€1k");
		});

		it("formats 350,000 as €350k", () => {
			expect(formatCurrencyShort(350000)).toBe("€350k");
		});
	});

	describe("under 1000", () => {
		it("formats 999 as €999", () => {
			expect(formatCurrencyShort(999)).toBe("€999");
		});

		it("formats 500 as €500", () => {
			expect(formatCurrencyShort(500)).toBe("€500");
		});

		it("formats 0 as €0", () => {
			expect(formatCurrencyShort(0)).toBe("€0");
		});

		it("formats 1 as €1", () => {
			expect(formatCurrencyShort(1)).toBe("€1");
		});

		it("formats decimal as rounded integer", () => {
			expect(formatCurrencyShort(99.99)).toBe("€100");
		});
	});

	describe("typical mortgage values", () => {
		it("formats typical Irish FTB mortgage €350k", () => {
			expect(formatCurrencyShort(350000)).toBe("€350k");
		});

		it("formats typical Dublin property €450k", () => {
			expect(formatCurrencyShort(450000)).toBe("€450k");
		});

		it("formats premium property €1.2M", () => {
			expect(formatCurrencyShort(1200000)).toBe("€1.2M");
		});

		it("formats deposit €35k", () => {
			expect(formatCurrencyShort(35000)).toBe("€35k");
		});
	});
});
