/**
 * QR code generation with logo overlay for shareable links.
 * Uses lazy loading to avoid impacting initial page load.
 */

import logoSvg from "@/assets/logos/mortgagelab-logo.min.svg";
import { getQRCode } from "./loaders";

// Cache for logo image
let logoImage: HTMLImageElement | null = null;

/**
 * Loads the logo SVG as an Image element for canvas drawing.
 */
async function loadLogoForQR(): Promise<HTMLImageElement> {
	if (logoImage) return logoImage;

	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			logoImage = img;
			resolve(img);
		};
		img.onerror = () => {
			reject(new Error("Failed to load logo"));
		};
		img.src = logoSvg.src;
	});
}

/**
 * Generates a QR code with the MortgageLab logo in the center.
 * Uses high error correction (H = 30%) to allow for logo overlay.
 */
export async function generateQRCodeWithLogo(
	url: string,
	size = 256,
): Promise<string> {
	const qrcode = await getQRCode();

	// Create canvas with QR code
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;

	// Generate QR to canvas with high error correction for logo tolerance
	await qrcode.toCanvas(canvas, url, {
		width: size,
		margin: 2,
		errorCorrectionLevel: "H", // 30% error correction allows for center logo
		color: {
			dark: "#000000",
			light: "#ffffff",
		},
	});

	// Draw logo in center
	const ctx = canvas.getContext("2d");
	if (ctx) {
		try {
			const logo = await loadLogoForQR();
			// Logo size is ~20% of QR code for good readability
			const logoSize = size * 0.22;
			const logoX = (size - logoSize) / 2;
			const logoY = (size - logoSize) / 2;

			// Draw white background circle for logo
			ctx.fillStyle = "#ffffff";
			ctx.beginPath();
			ctx.arc(size / 2, size / 2, logoSize / 2 + 4, 0, Math.PI * 2);
			ctx.fill();

			// Draw logo
			ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
		} catch {
			// If logo fails to load, return QR without logo
		}
	}

	return canvas.toDataURL("image/png");
}
