import { describe, expect, it } from "vitest";

// We can't easily mock import.meta.env.BASE_URL in Vitest without complex setup.
// Instead, we test the actual function behavior in the current environment (development).
// The BASE_URL in dev is "/" which we can verify.

import { getPath } from "../path";

describe("getPath", () => {
	// In development, BASE_URL is "/"
	// We test the path normalization logic

	describe("path normalization", () => {
		it("handles path with leading slash", () => {
			const result = getPath("/rates");
			// In dev mode (BASE_URL="/"), result should be "/rates"
			expect(result).toContain("rates");
			expect(result).not.toContain("//"); // No double slashes
		});

		it("handles path without leading slash", () => {
			const result = getPath("rates");
			expect(result).toContain("rates");
			expect(result).not.toContain("//");
		});

		it("handles empty path", () => {
			const result = getPath("");
			// Should return base path with trailing slash
			expect(result.endsWith("/")).toBe(true);
		});

		it("handles nested paths", () => {
			const result = getPath("/breakeven/rent-vs-buy");
			expect(result).toContain("breakeven/rent-vs-buy");
		});

		it("handles file paths", () => {
			const result = getPath("/data/rates/aib.json");
			expect(result).toContain("data/rates/aib.json");
		});

		it("handles just a slash path", () => {
			const result = getPath("/");
			expect(result.length).toBeGreaterThanOrEqual(1);
			expect(result.endsWith("/")).toBe(true);
		});

		it("handles path with query string", () => {
			const result = getPath("/rates?ltv=80");
			expect(result).toContain("rates?ltv=80");
		});

		it("handles path with hash", () => {
			const result = getPath("/simulate#chart");
			expect(result).toContain("simulate#chart");
		});

		it("handles path with both query and hash", () => {
			const result = getPath("/rates?ltv=80#table");
			expect(result).toContain("rates?ltv=80#table");
		});
	});

	describe("consistency", () => {
		it("produces consistent results for same logical path", () => {
			const withSlash = getPath("/page");
			const withoutSlash = getPath("page");
			expect(withSlash).toBe(withoutSlash);
		});

		it("never produces double slashes in result", () => {
			const paths = ["/test", "test", "/deep/nested/path", "deep/nested/path"];
			for (const path of paths) {
				const result = getPath(path);
				expect(result).not.toContain("//");
			}
		});

		it("returns string type", () => {
			expect(typeof getPath("/test")).toBe("string");
		});
	});

	describe("development environment", () => {
		// In Vitest dev mode, BASE_URL should be "/"
		it("returns paths starting with /", () => {
			const result = getPath("/rates");
			expect(result.startsWith("/")).toBe(true);
		});

		it("prepends base path correctly", () => {
			// In dev mode with BASE_URL="/", path should just be /rates
			const result = getPath("/rates");
			expect(result).toBe("/rates");
		});

		it("handles root path", () => {
			const result = getPath("");
			expect(result).toBe("/");
		});
	});
});
