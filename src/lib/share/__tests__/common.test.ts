import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearUrlParam,
	compressToUrl,
	decompressFromUrl,
	generateShareUrl,
	getUrlParam,
	hasUrlParam,
	parseShareParam,
} from "../common";

// Helper to create mock window
function createMockWindow(search = "") {
	const href = `https://example.com/test${search}`;
	return {
		location: {
			href,
			search,
			origin: "https://example.com",
			pathname: "/test",
		},
		history: {
			replaceState: vi.fn(),
		},
	};
}

function setWindowSearch(search: string) {
	vi.stubGlobal("window", createMockWindow(search));
}

describe("compressToUrl", () => {
	describe("basic compression", () => {
		it("compresses a simple string", () => {
			const result = compressToUrl("hello");
			expect(typeof result).toBe("string");
			expect(result.length).toBeGreaterThan(0);
		});

		it("compresses a simple object", () => {
			const result = compressToUrl({ name: "test", value: 123 });
			expect(typeof result).toBe("string");
			expect(result.length).toBeGreaterThan(0);
		});

		it("compresses an array", () => {
			const result = compressToUrl([1, 2, 3, 4, 5]);
			expect(typeof result).toBe("string");
			expect(result.length).toBeGreaterThan(0);
		});

		it("compresses nested objects", () => {
			const data = {
				user: { name: "John", age: 30 },
				settings: { theme: "dark", notifications: true },
			};
			const result = compressToUrl(data);
			expect(typeof result).toBe("string");
		});
	});

	describe("URL safety", () => {
		it("produces output that can be safely used in URLs", () => {
			const data = { special: 'test!@#$%^&*()+=[]{}|\\:";<>?,./' };
			const result = compressToUrl(data);
			// Should produce a non-empty string
			expect(result.length).toBeGreaterThan(0);
			// Should be decompressible
			const decompressed = decompressFromUrl<typeof data>(result);
			expect(decompressed).toEqual(data);
		});

		it("produces consistent output for same input", () => {
			const data = { key: "value with spaces" };
			const result1 = compressToUrl(data);
			const result2 = compressToUrl(data);
			expect(result1).toBe(result2);
		});
	});

	describe("compression efficiency", () => {
		it("compresses repetitive data efficiently", () => {
			const data = { items: Array(100).fill("repeated") };
			const json = JSON.stringify(data);
			const compressed = compressToUrl(data);
			// Compressed should be smaller than raw JSON for repetitive data
			expect(compressed.length).toBeLessThan(json.length);
		});
	});
});

describe("decompressFromUrl", () => {
	describe("basic decompression", () => {
		it("decompresses a simple string", () => {
			const original = "hello world";
			const compressed = compressToUrl(original);
			const result = decompressFromUrl<string>(compressed);
			expect(result).toBe(original);
		});

		it("decompresses a simple object", () => {
			const original = { name: "test", value: 123 };
			const compressed = compressToUrl(original);
			const result = decompressFromUrl<typeof original>(compressed);
			expect(result).toEqual(original);
		});

		it("decompresses an array", () => {
			const original = [1, 2, 3, 4, 5];
			const compressed = compressToUrl(original);
			const result = decompressFromUrl<number[]>(compressed);
			expect(result).toEqual(original);
		});

		it("decompresses nested objects", () => {
			const original = {
				user: { name: "John", age: 30 },
				settings: { theme: "dark", notifications: true },
			};
			const compressed = compressToUrl(original);
			const result = decompressFromUrl<typeof original>(compressed);
			expect(result).toEqual(original);
		});
	});

	describe("error handling", () => {
		it("returns null for empty string", () => {
			const result = decompressFromUrl("");
			expect(result).toBeNull();
		});

		it("returns null for invalid compressed data", () => {
			const result = decompressFromUrl("not-valid-compressed-data");
			expect(result).toBeNull();
		});

		it("returns null for corrupted data", () => {
			const result = decompressFromUrl("!!!invalid!!!");
			expect(result).toBeNull();
		});

		it("returns null for truncated compressed data", () => {
			const original = { data: "some long string to compress" };
			const compressed = compressToUrl(original);
			// Truncate the compressed data
			const truncated = compressed.slice(0, compressed.length / 2);
			const result = decompressFromUrl(truncated);
			expect(result).toBeNull();
		});
	});

	describe("type preservation", () => {
		it("preserves boolean values", () => {
			const original = { active: true, disabled: false };
			const compressed = compressToUrl(original);
			const result = decompressFromUrl<typeof original>(compressed);
			expect(result?.active).toBe(true);
			expect(result?.disabled).toBe(false);
		});

		it("preserves null values", () => {
			const original = { value: null };
			const compressed = compressToUrl(original);
			const result = decompressFromUrl<typeof original>(compressed);
			expect(result?.value).toBeNull();
		});

		it("preserves number types", () => {
			const original = { int: 42, float: 3.14, negative: -100 };
			const compressed = compressToUrl(original);
			const result = decompressFromUrl<typeof original>(compressed);
			expect(result?.int).toBe(42);
			expect(result?.float).toBeCloseTo(3.14);
			expect(result?.negative).toBe(-100);
		});
	});
});

describe("roundtrip compression", () => {
	it("roundtrips mortgage calculator state", () => {
		const mortgageState = {
			propertyValue: "€350,000",
			mortgageAmount: "€315,000",
			termYears: 30,
			interestRate: 3.5,
			buyerType: "ftb",
			berRating: "B2",
		};

		const compressed = compressToUrl(mortgageState);
		const decompressed = decompressFromUrl<typeof mortgageState>(compressed);

		expect(decompressed).toEqual(mortgageState);
	});

	it("roundtrips simulation state with rate periods", () => {
		const simulationState = {
			input: {
				mortgageAmount: 30000000,
				termMonths: 360,
				propertyValue: 35000000,
			},
			ratePeriods: [
				{ id: "p1", rateId: "rate1", durationMonths: 36 },
				{ id: "p2", rateId: "rate2", durationMonths: 0 },
			],
		};

		const compressed = compressToUrl(simulationState);
		const decompressed = decompressFromUrl<typeof simulationState>(compressed);

		expect(decompressed).toEqual(simulationState);
	});

	it("roundtrips breakeven calculator state", () => {
		const breakevenState = {
			type: "rvb",
			propertyValue: "350000",
			deposit: "35000",
			mortgageTerm: "30",
			interestRate: "3.5",
			currentRent: "1500",
			rentInflation: "2",
			homeAppreciation: "3",
		};

		const compressed = compressToUrl(breakevenState);
		const decompressed = decompressFromUrl<typeof breakevenState>(compressed);

		expect(decompressed).toEqual(breakevenState);
	});

	it("roundtrips complex nested state", () => {
		const complexState = {
			inputs: {
				financial: { income: 80000, savings: 50000 },
				personal: { age: 32, jointApplication: true },
			},
			results: {
				maxBorrowing: 320000,
				ltv: 90,
				lti: 4,
			},
			filters: ["green", "fixed"],
			sorting: [{ id: "rate", desc: false }],
		};

		const compressed = compressToUrl(complexState);
		const decompressed = decompressFromUrl<typeof complexState>(compressed);

		expect(decompressed).toEqual(complexState);
	});

	it("handles empty arrays and objects", () => {
		const state = {
			items: [],
			config: {},
			filters: [],
		};

		const compressed = compressToUrl(state);
		const decompressed = decompressFromUrl<typeof state>(compressed);

		expect(decompressed).toEqual(state);
	});

	it("handles unicode characters", () => {
		const state = {
			currency: "€",
			name: "Seán O'Brien",
			emoji: "🏠",
		};

		const compressed = compressToUrl(state);
		const decompressed = decompressFromUrl<typeof state>(compressed);

		expect(decompressed).toEqual(state);
	});
});

describe("browser-dependent functions", () => {
	beforeEach(() => {
		vi.stubGlobal("window", createMockWindow());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe("getUrlParam", () => {
		it("returns value when param exists", () => {
			setWindowSearch("?key=value");
			expect(getUrlParam("key")).toBe("value");
		});

		it("returns null when param does not exist", () => {
			setWindowSearch("?other=value");
			expect(getUrlParam("key")).toBeNull();
		});

		it("returns null when window is undefined", () => {
			vi.stubGlobal("window", undefined);
			expect(getUrlParam("key")).toBeNull();
		});

		it("handles URL-encoded values", () => {
			setWindowSearch("?key=hello%20world");
			expect(getUrlParam("key")).toBe("hello world");
		});
	});

	describe("clearUrlParam", () => {
		it("calls replaceState to clear param", () => {
			setWindowSearch("?share=value&keep=other");
			clearUrlParam("share");
			expect(window.history.replaceState).toHaveBeenCalled();
		});

		it("does nothing when window is undefined", () => {
			vi.stubGlobal("window", undefined);
			// Should not throw
			expect(() => clearUrlParam("key")).not.toThrow();
		});
	});

	describe("hasUrlParam", () => {
		it("returns true when param exists", () => {
			setWindowSearch("?key=value");
			expect(hasUrlParam("key")).toBe(true);
		});

		it("returns false when param does not exist", () => {
			setWindowSearch("?other=value");
			expect(hasUrlParam("key")).toBe(false);
		});

		it("returns false when window is undefined", () => {
			vi.stubGlobal("window", undefined);
			expect(hasUrlParam("key")).toBe(false);
		});

		it("returns true even for empty param value", () => {
			setWindowSearch("?key=");
			expect(hasUrlParam("key")).toBe(true);
		});
	});

	describe("generateShareUrl", () => {
		it("generates URL with compressed data", () => {
			setWindowSearch("");
			const data = { test: "value" };
			const url = generateShareUrl("s", data);

			expect(url).toContain("https://example.com");
			expect(url).toContain("s=");
		});

		it("includes hash when provided", () => {
			setWindowSearch("");
			const url = generateShareUrl("s", { test: "value" }, { hash: "section" });

			expect(url).toContain("#section");
		});
	});

	describe("parseShareParam", () => {
		it("returns data when valid param exists", () => {
			const data = { test: "value", num: 42 };
			const compressed = compressToUrl(data);
			setWindowSearch(`?s=${compressed}`);

			const result = parseShareParam<typeof data>("s");

			expect(result).toEqual(data);
		});

		it("returns null when param does not exist", () => {
			setWindowSearch("");
			const result = parseShareParam("s");
			expect(result).toBeNull();
		});

		it("returns null for invalid data", () => {
			setWindowSearch("?s=invalid-data");
			const result = parseShareParam("s");
			expect(result).toBeNull();
		});
	});
});
