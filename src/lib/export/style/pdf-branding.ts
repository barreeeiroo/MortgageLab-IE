/**
 * PDF branding constants and styled components.
 * Provides consistent visual styling across all PDF exports.
 */

import logoUrl from "@/assets/logos/mortgagelab-logo-pdf.png";

// Brand colors as RGB tuples for jsPDF
export const PDF_COLORS = {
	// Primary brand color (teal from logo)
	primary: [13, 148, 136] as const, // #0d9488

	// Text colors
	text: [15, 23, 42] as const, // #0f172a (slate-900)
	textMuted: [100, 116, 139] as const, // #64748b (slate-500)

	// Semantic colors
	success: [34, 197, 94] as const, // #22c55e (green-500)
	warning: [234, 179, 8] as const, // #eab308 (yellow-500)
	danger: [239, 68, 68] as const, // #ef4444 (red-500)

	// Table colors
	headerBg: [30, 41, 59] as const, // #1e293b (slate-800)
	headerText: [255, 255, 255] as const, // white
	altRowBg: [248, 250, 252] as const, // #f8fafc (slate-50)
	borderColor: [226, 232, 240] as const, // #e2e8f0 (slate-200)
} as const;

export type PDFColor = (typeof PDF_COLORS)[keyof typeof PDF_COLORS];

/**
 * PDF layout constants.
 */
export const PDF_LAYOUT = {
	// Margins
	marginLeft: 14,
	marginRight: 14,
	marginTop: 15,
	marginBottom: 20,

	// Content width (A4 is 210mm)
	contentWidth: 182, // 210 - 14 - 14

	// Spacing
	sectionGap: 10,
	paragraphGap: 6,

	// Logo dimensions (horizontal logo, proportional)
	logoWidth: 45,
	logoHeight: 9, // 400x80 aspect ratio scaled

	// Divider
	dividerWidth: 0.5,
} as const;

/**
 * Font sizes for consistent typography.
 */
export const PDF_FONTS = {
	title: 18,
	sectionHeader: 14,
	subtitle: 12,
	body: 10,
	small: 9,
	footer: 8,
} as const;

// Cache for loaded logo
let logoDataUrl: string | null = null;

/**
 * Fetches an image and returns it as a data URL.
 */
async function fetchAsDataUrl(url: string): Promise<string> {
	const response = await fetch(url);
	const blob = await response.blob();
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}

/**
 * Loads the logo image as a data URL.
 * Cached after first load.
 */
export async function loadLogo(): Promise<string> {
	if (logoDataUrl) return logoDataUrl;
	logoDataUrl = await fetchAsDataUrl(logoUrl.src);
	return logoDataUrl;
}
