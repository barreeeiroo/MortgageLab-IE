import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateQRCodeWithLogo } from "../qrcode";

// Mock the uqr module
vi.mock("uqr", () => ({
	renderSVG: vi.fn(() => {
		// Return a minimal valid SVG that matches the expected structure from uqr
		return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="100%" height="100%" fill="#ffffff"/><path d="M0 0h10v10H0z" fill="#000000"/></svg>';
	}),
}));

describe("generateQRCodeWithLogo", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("basic functionality", () => {
		it("generates a valid data URL", async () => {
			const result = await generateQRCodeWithLogo("https://example.com");

			expect(result).toMatch(/^data:image\/svg\+xml,/);
		});

		it("generates SVG content", async () => {
			const result = await generateQRCodeWithLogo("https://example.com");
			const decodedSvg = decodeURIComponent(
				result.replace("data:image/svg+xml,", ""),
			);

			expect(decodedSvg).toContain("<svg");
			expect(decodedSvg).toContain("</svg>");
		});

		it("includes viewBox from uqr output", async () => {
			const result = await generateQRCodeWithLogo("https://example.com");
			const decodedSvg = decodeURIComponent(
				result.replace("data:image/svg+xml,", ""),
			);

			expect(decodedSvg).toContain("viewBox=");
		});
	});

	describe("size parameter", () => {
		it("uses default size of 256 when not specified", async () => {
			const result = await generateQRCodeWithLogo("https://example.com");
			const decodedSvg = decodeURIComponent(
				result.replace("data:image/svg+xml,", ""),
			);

			expect(decodedSvg).toContain('width="256"');
			expect(decodedSvg).toContain('height="256"');
		});

		it("applies custom size", async () => {
			const result = await generateQRCodeWithLogo("https://example.com", 512);
			const decodedSvg = decodeURIComponent(
				result.replace("data:image/svg+xml,", ""),
			);

			expect(decodedSvg).toContain('width="512"');
			expect(decodedSvg).toContain('height="512"');
		});

		it("supports small sizes", async () => {
			const result = await generateQRCodeWithLogo("https://example.com", 64);
			const decodedSvg = decodeURIComponent(
				result.replace("data:image/svg+xml,", ""),
			);

			expect(decodedSvg).toContain('width="64"');
			expect(decodedSvg).toContain('height="64"');
		});

		it("supports large sizes", async () => {
			const result = await generateQRCodeWithLogo("https://example.com", 1024);
			const decodedSvg = decodeURIComponent(
				result.replace("data:image/svg+xml,", ""),
			);

			expect(decodedSvg).toContain('width="1024"');
			expect(decodedSvg).toContain('height="1024"');
		});
	});

	describe("logo overlay", () => {
		it("includes logo overlay elements", async () => {
			const result = await generateQRCodeWithLogo("https://example.com");
			const decodedSvg = decodeURIComponent(
				result.replace("data:image/svg+xml,", ""),
			);

			// The overlay includes a white circle background and a transformed group for the logo
			expect(decodedSvg).toContain("<circle");
			expect(decodedSvg).toContain("<g transform=");
		});

		it("includes white background circle for logo", async () => {
			const result = await generateQRCodeWithLogo("https://example.com");
			const decodedSvg = decodeURIComponent(
				result.replace("data:image/svg+xml,", ""),
			);

			// Circle should have white fill
			expect(decodedSvg).toMatch(/<circle[^>]*fill="#ffffff"/);
		});

		it("positions logo in center", async () => {
			const result = await generateQRCodeWithLogo("https://example.com");
			const decodedSvg = decodeURIComponent(
				result.replace("data:image/svg+xml,", ""),
			);

			// Circle should be centered at qrSize/2 (100 for our mock's 200x200 viewBox)
			expect(decodedSvg).toContain('cx="100"');
			expect(decodedSvg).toContain('cy="100"');
		});
	});

	describe("URL encoding", () => {
		it("works with simple URLs", async () => {
			const result = await generateQRCodeWithLogo("https://example.com");

			expect(result).toMatch(/^data:image\/svg\+xml,/);
		});

		it("works with URLs containing query parameters", async () => {
			const result = await generateQRCodeWithLogo(
				"https://example.com?param=value&other=123",
			);

			expect(result).toMatch(/^data:image\/svg\+xml,/);
		});

		it("works with URLs containing special characters", async () => {
			const result = await generateQRCodeWithLogo(
				"https://example.com/path?q=hello%20world",
			);

			expect(result).toMatch(/^data:image\/svg\+xml,/);
		});

		it("works with long URLs", async () => {
			const longUrl = `https://example.com/${"a".repeat(500)}`;
			const result = await generateQRCodeWithLogo(longUrl);

			expect(result).toMatch(/^data:image\/svg\+xml,/);
		});
	});

	describe("uqr integration", () => {
		it("calls uqr renderSVG with high error correction", async () => {
			const { renderSVG } = await import("uqr");

			await generateQRCodeWithLogo("https://example.com");

			expect(renderSVG).toHaveBeenCalledWith(
				"https://example.com",
				expect.objectContaining({
					ecc: "H", // High error correction for logo tolerance
				}),
			);
		});

		it("calls uqr renderSVG with border", async () => {
			const { renderSVG } = await import("uqr");

			await generateQRCodeWithLogo("https://example.com");

			expect(renderSVG).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					border: 2,
				}),
			);
		});

		it("calls uqr renderSVG with correct colors", async () => {
			const { renderSVG } = await import("uqr");

			await generateQRCodeWithLogo("https://example.com");

			expect(renderSVG).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					whiteColor: "#ffffff",
					blackColor: "#000000",
				}),
			);
		});
	});

	describe("error handling", () => {
		it("returns fallback data URL when viewBox is missing", async () => {
			const { renderSVG } = await import("uqr");
			// Mock a response without viewBox
			vi.mocked(renderSVG).mockReturnValueOnce(
				'<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>',
			);

			const result = await generateQRCodeWithLogo("https://example.com");

			// Should return the QR without logo overlay
			expect(result).toMatch(/^data:image\/svg\+xml,/);
			// Should not include overlay elements
			const decodedSvg = decodeURIComponent(
				result.replace("data:image/svg+xml,", ""),
			);
			expect(decodedSvg).not.toContain("<circle");
		});
	});

	describe("SVG structure", () => {
		it("maintains valid SVG structure", async () => {
			const result = await generateQRCodeWithLogo("https://example.com");
			const decodedSvg = decodeURIComponent(
				result.replace("data:image/svg+xml,", ""),
			);

			// Should have proper opening and closing tags
			expect(decodedSvg).toMatch(/<svg[^>]*>/);
			expect(decodedSvg).toMatch(/<\/svg>$/);

			// Should have xmlns attribute
			expect(decodedSvg).toContain('xmlns="http://www.w3.org/2000/svg"');
		});

		it("adds explicit width and height", async () => {
			const result = await generateQRCodeWithLogo("https://example.com", 300);
			const decodedSvg = decodeURIComponent(
				result.replace("data:image/svg+xml,", ""),
			);

			expect(decodedSvg).toMatch(/<svg[^>]*width="300"/);
			expect(decodedSvg).toMatch(/<svg[^>]*height="300"/);
		});
	});

	describe("consistency", () => {
		it("produces consistent output for same input", async () => {
			const url = "https://example.com/test";
			const result1 = await generateQRCodeWithLogo(url);
			const result2 = await generateQRCodeWithLogo(url);

			expect(result1).toBe(result2);
		});

		it("produces different output for different URLs", async () => {
			await generateQRCodeWithLogo("https://example1.com");
			await generateQRCodeWithLogo("https://example2.com");

			// The mock returns the same SVG, but the function is called with different URLs
			// In real usage, uqr would produce different QR codes
			const { renderSVG } = await import("uqr");
			expect(renderSVG).toHaveBeenCalledWith(
				"https://example1.com",
				expect.any(Object),
			);
			expect(renderSVG).toHaveBeenCalledWith(
				"https://example2.com",
				expect.any(Object),
			);
		});
	});
});
