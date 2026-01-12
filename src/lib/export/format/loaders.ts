/**
 * Lazy singleton wrappers for heavy export libraries.
 * Each library is loaded on first use and cached for subsequent calls.
 * This avoids impacting initial page load with ~3MB of export dependencies.
 */

let excelJS: typeof import("exceljs") | null = null;

/**
 * Lazily loads ExcelJS library (~2MB).
 * Cached after first load.
 */
export async function getExcelJS() {
	if (!excelJS) {
		excelJS = await import("exceljs");
	}
	return excelJS;
}

let jspdfModule: typeof import("jspdf") | null = null;
let autoTableModule: typeof import("jspdf-autotable") | null = null;

/**
 * Lazily loads jsPDF library (~300KB).
 * Cached after first load.
 */
export async function getJsPDF() {
	if (!jspdfModule) {
		jspdfModule = await import("jspdf");
	}
	return jspdfModule;
}

/**
 * Lazily loads jspdf-autotable plugin (~100KB).
 * Returns the autoTable function for use with jsPDF documents.
 * Cached after first load.
 */
export async function getAutoTable() {
	if (!autoTableModule) {
		autoTableModule = await import("jspdf-autotable");
	}
	return autoTableModule.default;
}

let htmlToImageModule: typeof import("html-to-image") | null = null;

/**
 * Lazily loads html-to-image library (~50KB).
 * Cached after first load.
 */
export async function getHtmlToImage() {
	if (!htmlToImageModule) {
		htmlToImageModule = await import("html-to-image");
	}
	return htmlToImageModule;
}
