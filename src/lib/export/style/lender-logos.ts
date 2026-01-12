/**
 * Lender logo loader for PDF export.
 * Converts WebP logos to PNG data URLs for jsPDF compatibility.
 */

import { LENDER_LOGOS } from "@/lib/constants/lender-logos";

// Cache for converted PNG data URLs
const logoCache = new Map<string, string>();

/**
 * Converts a WebP image URL to a PNG data URL.
 * Uses canvas to decode WebP and re-encode as PNG.
 */
async function convertWebPToPngDataUrl(
	webpUrl: string,
	size = 32,
): Promise<string> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";

		img.onload = () => {
			const canvas = document.createElement("canvas");
			canvas.width = size;
			canvas.height = size;

			const ctx = canvas.getContext("2d");
			if (!ctx) {
				reject(new Error("Could not get canvas context"));
				return;
			}

			// Draw image centered and scaled to fit
			const scale = Math.min(size / img.width, size / img.height);
			const scaledWidth = img.width * scale;
			const scaledHeight = img.height * scale;
			const x = (size - scaledWidth) / 2;
			const y = (size - scaledHeight) / 2;

			ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

			// Convert to PNG data URL
			resolve(canvas.toDataURL("image/png"));
		};

		img.onerror = () => {
			reject(new Error(`Failed to load image: ${webpUrl}`));
		};

		img.src = webpUrl;
	});
}

/**
 * Loads a lender logo as a PNG data URL for use in jsPDF.
 * Returns null for unknown lenders.
 * Results are cached for performance.
 */
export async function loadLenderLogo(
	lenderId: string,
	size = 32,
): Promise<string | null> {
	const cacheKey = `${lenderId}-${size}`;

	// Check cache first
	const cached = logoCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	const logoMeta = LENDER_LOGOS[lenderId];
	if (!logoMeta) {
		return null;
	}

	try {
		const dataUrl = await convertWebPToPngDataUrl(logoMeta.src, size);
		logoCache.set(cacheKey, dataUrl);
		return dataUrl;
	} catch {
		console.warn(`Failed to load logo for lender: ${lenderId}`);
		return null;
	}
}

/**
 * Preloads all lender logos for faster PDF generation.
 * Returns a map of lenderId to PNG data URL.
 */
export async function preloadAllLenderLogos(
	size = 32,
): Promise<Map<string, string>> {
	const results = new Map<string, string>();

	const loadPromises = Object.keys(LENDER_LOGOS).map(async (lenderId) => {
		const dataUrl = await loadLenderLogo(lenderId, size);
		if (dataUrl) {
			results.set(lenderId, dataUrl);
		}
	});

	await Promise.all(loadPromises);
	return results;
}
