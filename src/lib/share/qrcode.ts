/**
 * QR code generation with logo overlay for shareable links.
 * Uses uqr for ESM-compatible SVG output with lazy loading.
 */

import logoSvgRaw from "@/assets/logos/mortgagelab-logo.min.svg?raw";

// The logo SVG has viewBox="0 0 128 128"
const LOGO_VIEWBOX_SIZE = 128;

/**
 * Extracts the inner content of an SVG string and converts CSS classes to inline fills.
 * Returns content ready to be embedded in another SVG.
 */
function extractLogoContent(svgString: string): string {
	// Remove outer <svg> tag and extract inner content
	const innerMatch = svgString.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
	if (!innerMatch) return "";

	let content = innerMatch[1];

	// Remove the <style> tag entirely
	content = content.replace(/<style>[\s\S]*?<\/style>/, "");

	// Replace CSS classes with inline fills (use light mode colors for QR code)
	content = content.replace(/class="house"/g, 'fill="#0d9488"');
	content = content.replace(/class="bar"/g, 'fill="#fff"');

	return content;
}

// Pre-process logo content at module load time
const logoContent = extractLogoContent(logoSvgRaw);

/**
 * Generates a QR code SVG with the MortgageLab logo in the center.
 * Uses high error correction (H = 30%) to allow for logo overlay.
 * Returns a data URL for use in <img> src.
 */
export async function generateQRCodeWithLogo(
	url: string,
	size = 256,
): Promise<string> {
	// Lazy load uqr to keep it in a separate chunk
	const { renderSVG } = await import("uqr");

	// Generate QR code SVG with high error correction for logo tolerance
	const qrSvg = renderSVG(url, {
		ecc: "H", // 30% error correction allows for center logo
		border: 2,
		pixelSize: 8,
		whiteColor: "#ffffff",
		blackColor: "#000000",
	});

	// Parse the viewBox to get the QR code's actual size
	const viewBoxMatch = qrSvg.match(/viewBox="0 0 (\d+) (\d+)"/);
	if (!viewBoxMatch) {
		// Fallback: return QR without logo
		return `data:image/svg+xml,${encodeURIComponent(qrSvg)}`;
	}

	const qrSize = Number.parseInt(viewBoxMatch[1], 10);
	const center = qrSize / 2;

	// Logo size is ~22% of QR code for good readability
	const logoSize = qrSize * 0.22;
	const logoOffset = center - logoSize / 2;

	// White circle background radius (slightly larger than logo)
	const circleRadius = logoSize / 2 + 4;

	// Scale factor to fit logo's 128x128 viewBox into our logoSize
	const logoScale = logoSize / LOGO_VIEWBOX_SIZE;

	// Create composite SVG with QR code and logo overlay
	const logoOverlay = `
<circle cx="${center}" cy="${center}" r="${circleRadius}" fill="#ffffff"/>
<g transform="translate(${logoOffset}, ${logoOffset}) scale(${logoScale})">
${logoContent}
</g>`;

	// Insert logo before closing </svg> tag
	const compositeSvg = qrSvg.replace("</svg>", `${logoOverlay}</svg>`);

	// Return as data URL with explicit size for consistent rendering
	const finalSvg = compositeSvg.replace(
		/^<svg /,
		`<svg width="${size}" height="${size}" `,
	);

	return `data:image/svg+xml,${encodeURIComponent(finalSvg)}`;
}
