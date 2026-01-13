/**
 * PDF document generation using jsPDF and jspdf-autotable (lazy-loaded).
 */

import { sanitizeForPDF } from "../formatters";
import {
	loadLogo,
	PDF_COLORS,
	PDF_FONTS,
	PDF_LAYOUT,
} from "../style/pdf-branding";
import {
	downloadFile,
	type ExportPage,
	generateExportFilename,
	type TableExportData,
} from "../types";
import { getAutoTable, getJsPDF } from "./loaders";

interface AutoTableOptions {
	head?: (string | number)[][];
	body?: (string | number | null | undefined)[][];
	startY?: number;
	margin?: { top?: number; right?: number; bottom?: number; left?: number };
	styles?: {
		fontSize?: number;
		cellPadding?: number;
	};
	headStyles?: {
		fillColor?: [number, number, number];
		textColor?: [number, number, number];
		fontStyle?: string;
	};
	alternateRowStyles?: {
		fillColor?: [number, number, number];
	};
	columnStyles?: Record<
		number,
		{
			halign?: "left" | "center" | "right";
			cellWidth?: number | "auto" | "wrap";
		}
	>;
}

/**
 * Creates a new PDF document.
 * @param orientation 'portrait' or 'landscape'
 */
export async function createPDFDocument(
	orientation: "portrait" | "landscape" = "portrait",
) {
	const { jsPDF } = await getJsPDF();
	const doc = new jsPDF({
		orientation,
		unit: "mm",
		format: "a4",
	});

	return doc;
}

/**
 * Adds a title to the PDF document.
 */
export function addTitle(
	doc: Awaited<ReturnType<typeof createPDFDocument>>,
	title: string,
	y = 15,
): number {
	doc.setFontSize(18);
	doc.setFont("helvetica", "bold");
	doc.text(title, 14, y);
	return y + 10;
}

/**
 * Adds a subtitle to the PDF document.
 */
export function addSubtitle(
	doc: Awaited<ReturnType<typeof createPDFDocument>>,
	subtitle: string,
	y: number,
): number {
	doc.setFontSize(12);
	doc.setFont("helvetica", "normal");
	doc.setTextColor(100);
	doc.text(subtitle, 14, y);
	doc.setTextColor(0);
	return y + 8;
}

/**
 * Adds a section header to the PDF document.
 */
export function addSectionHeader(
	doc: Awaited<ReturnType<typeof createPDFDocument>>,
	header: string,
	y: number,
): number {
	doc.setFontSize(14);
	doc.setFont("helvetica", "bold");
	doc.text(header, 14, y);
	return y + 8;
}

/**
 * Adds body text to the PDF document.
 */
export function addText(
	doc: Awaited<ReturnType<typeof createPDFDocument>>,
	text: string,
	y: number,
	options?: { fontSize?: number; maxWidth?: number },
): number {
	const fontSize = options?.fontSize ?? 10;
	const maxWidth = options?.maxWidth ?? 180;

	doc.setFontSize(fontSize);
	doc.setFont("helvetica", "normal");

	const lines = doc.splitTextToSize(text, maxWidth);
	doc.text(lines, 14, y);

	return y + lines.length * (fontSize * 0.4) + 4;
}

/**
 * Adds a key-value pair line to the PDF.
 */
export function addKeyValue(
	doc: Awaited<ReturnType<typeof createPDFDocument>>,
	key: string,
	value: string,
	y: number,
): number {
	doc.setFontSize(10);
	doc.setFont("helvetica", "bold");
	doc.text(`${key}:`, 14, y);
	doc.setFont("helvetica", "normal");
	doc.text(value, 60, y);
	return y + 6;
}

/**
 * Checks if a cell value should be right-aligned (numeric, currency, percentage).
 */
function isNumericCell(value: string | number | null | undefined): boolean {
	if (value === null || value === undefined || value === "") return false;
	if (typeof value === "number") return true;
	if (typeof value === "string") {
		// Check for currency (€, $, etc.) or percentage
		const trimmed = value.trim();
		return (
			/^[+-]?[\d€$£¥,.\s]+$/.test(trimmed) || // Currency or plain numbers (with optional +/- prefix)
			/^[+-]?€[\d,.\s]+$/.test(trimmed) || // Euro amounts like "+€100,234.56" or "-€100,234.56"
			/^[+-]?\d+([.,]\d+)?%$/.test(trimmed) // Percentages like "3.50%" or "-3.50%"
		);
	}
	return false;
}

/**
 * Detects which columns should be right-aligned based on content.
 */
function detectNumericColumns(
	rows: (string | number | null | undefined)[][],
): Record<number, { halign: "right" }> {
	if (rows.length === 0) return {};

	const columnStyles: Record<number, { halign: "right" }> = {};
	const numColumns = rows[0]?.length ?? 0;

	for (let col = 0; col < numColumns; col++) {
		// Check if majority of non-empty cells in this column are numeric
		let numericCount = 0;
		let totalCount = 0;

		for (const row of rows) {
			const cell = row[col];
			if (cell !== null && cell !== undefined && cell !== "") {
				totalCount++;
				if (isNumericCell(cell)) {
					numericCount++;
				}
			}
		}

		// If more than half of non-empty cells are numeric, right-align the column
		if (totalCount > 0 && numericCount / totalCount > 0.5) {
			columnStyles[col] = { halign: "right" };
		}
	}

	return columnStyles;
}

/**
 * Adds a table to the PDF using autoTable.
 */
export async function addTable(
	doc: Awaited<ReturnType<typeof createPDFDocument>>,
	data: TableExportData,
	startY: number,
	options?: Partial<AutoTableOptions>,
): Promise<number> {
	const autoTable = await getAutoTable();

	// Convert rows to ensure compatibility with jspdf-autotable
	// (null/undefined values become empty strings)
	const body: (string | number)[][] = data.rows.map((row) =>
		row.map((cell) => (cell === null || cell === undefined ? "" : cell)),
	);

	// Auto-detect numeric columns for right alignment
	const detectedColumnStyles = detectNumericColumns(data.rows);

	// biome-ignore lint/suspicious/noExplicitAny: jspdf-autotable types require casting
	const tableOptions: any = {
		head: [data.headers],
		body,
		startY,
		margin: { left: PDF_LAYOUT.marginLeft, right: PDF_LAYOUT.marginRight },
		styles: {
			fontSize: PDF_FONTS.small,
			cellPadding: 2,
		},
		headStyles: {
			fillColor: [...PDF_COLORS.headerBg],
			textColor: [...PDF_COLORS.headerText],
			fontStyle: "bold",
		},
		alternateRowStyles: {
			fillColor: [...PDF_COLORS.altRowBg],
		},
		columnStyles: {
			...detectedColumnStyles,
			...options?.columnStyles,
		},
		...options,
	};

	autoTable(doc, tableOptions);

	// Get final Y position from the document's internal state
	// biome-ignore lint/suspicious/noExplicitAny: jspdf-autotable adds this property
	return ((doc as any).lastAutoTable?.finalY ?? startY + 50) + 10;
}

interface TableWithLogosOptions extends Partial<AutoTableOptions> {
	/** Column index where logos should be rendered (typically 0 for lender column) */
	logoColumn?: number;
	/** Size of logos in mm */
	logoSize?: number;
	/** Map of display names to lender IDs for logo matching */
	lenderNameToId?: Map<string, string>;
}

/**
 * Adds a table with lender logos to the PDF.
 * Uses didDrawCell hook to render logos alongside text.
 */
export async function addTableWithLogos(
	doc: Awaited<ReturnType<typeof createPDFDocument>>,
	data: TableExportData,
	logos: Map<string, string>,
	startY: number,
	options?: TableWithLogosOptions,
): Promise<number> {
	const autoTable = await getAutoTable();
	const logoColumn = options?.logoColumn ?? 0;
	const logoSize = options?.logoSize ?? 5;
	const lenderNameToId = options?.lenderNameToId;

	// Convert and sanitize rows for PDF compatibility
	const body: (string | number)[][] = data.rows.map((row) =>
		row.map((cell) => {
			if (cell === null || cell === undefined) return "";
			if (typeof cell === "string") return sanitizeForPDF(cell);
			return cell;
		}),
	);

	// Sanitize headers as well
	const headers = data.headers.map((h) =>
		typeof h === "string" ? sanitizeForPDF(h) : h,
	);

	// Store original lender names for logo lookup (before sanitization)
	const originalLenderNames: string[] = data.rows.map((row) =>
		String(row[logoColumn] ?? ""),
	);

	// Auto-detect numeric columns for right alignment
	const detectedColumnStyles = detectNumericColumns(data.rows);

	// Get page dimensions for landscape A4
	const pageWidth = doc.internal.pageSize.getWidth();
	const tableWidth = pageWidth - PDF_LAYOUT.marginLeft - PDF_LAYOUT.marginRight;

	// biome-ignore lint/suspicious/noExplicitAny: jspdf-autotable types require casting
	const tableOptions: any = {
		head: [headers],
		body,
		startY,
		tableWidth,
		margin: { left: PDF_LAYOUT.marginLeft, right: PDF_LAYOUT.marginRight },
		styles: {
			fontSize: PDF_FONTS.small,
			cellPadding: 2,
			overflow: "linebreak",
			valign: "middle",
		},
		headStyles: {
			fillColor: [...PDF_COLORS.headerBg],
			textColor: [...PDF_COLORS.headerText],
			fontStyle: "bold",
			halign: "center",
			valign: "middle",
		},
		alternateRowStyles: {
			fillColor: [...PDF_COLORS.altRowBg],
		},
		columnStyles: {
			...detectedColumnStyles,
			// Add padding for logo column
			[logoColumn]: {
				cellPadding: { left: logoSize + 3, top: 2, right: 2, bottom: 2 },
			},
			...options?.columnStyles,
		},
		// Hook to draw logos in cells
		didDrawCell: (hookData: {
			section: string;
			column: { index: number };
			row: { index: number };
			cell: { x: number; y: number; height: number };
		}) => {
			if (hookData.section === "body" && hookData.column.index === logoColumn) {
				const rowIndex = hookData.row.index;
				// Use original (unsanitized) lender name for lookup
				const cellText = originalLenderNames[rowIndex] ?? "";

				// Find lender ID - use mapping if provided, otherwise try direct match
				let lenderId: string | undefined;
				if (lenderNameToId) {
					lenderId = lenderNameToId.get(cellText);
				}

				// Fallback: try to match by checking if cell text contains lender ID
				if (!lenderId) {
					for (const id of logos.keys()) {
						if (
							cellText.toLowerCase().includes(id.toLowerCase()) ||
							id.toLowerCase() === cellText.toLowerCase()
						) {
							lenderId = id;
							break;
						}
					}
				}

				// Draw logo if found
				if (lenderId) {
					const logoDataUrl = logos.get(lenderId);
					if (logoDataUrl) {
						try {
							const x = hookData.cell.x + 1;
							const y = hookData.cell.y + (hookData.cell.height - logoSize) / 2;
							doc.addImage(logoDataUrl, "PNG", x, y, logoSize, logoSize);
						} catch {
							// Silently fail if logo can't be added
						}
					}
				}
			}
		},
		...options,
	};

	autoTable(doc, tableOptions);

	// biome-ignore lint/suspicious/noExplicitAny: jspdf-autotable adds this property
	return ((doc as any).lastAutoTable?.finalY ?? startY + 50) + 10;
}

/**
 * Adds an image to the PDF.
 * @param imageData Base64 encoded image data (data URL)
 */
export function addImage(
	doc: Awaited<ReturnType<typeof createPDFDocument>>,
	imageData: string,
	y: number,
	options?: { width?: number; height?: number; x?: number },
): number {
	const width = options?.width ?? 180;
	const height = options?.height ?? 100;
	const x = options?.x ?? 14;

	doc.addImage(imageData, "PNG", x, y, width, height);

	return y + height + 10;
}

/**
 * Adds a footer with page numbers and generation timestamp.
 * Works with both portrait and landscape orientations.
 */
export function addFooter(
	doc: Awaited<ReturnType<typeof createPDFDocument>>,
): void {
	const pageCount = doc.getNumberOfPages();
	const timestamp = new Date().toLocaleString("en-IE");

	// Get page dimensions (works for both portrait and landscape)
	const pageHeight = doc.internal.pageSize.getHeight();
	const pageWidth = doc.internal.pageSize.getWidth();
	const footerY = pageHeight - 10; // 10mm from bottom
	const rightX = pageWidth - PDF_LAYOUT.marginRight;

	for (let i = 1; i <= pageCount; i++) {
		doc.setPage(i);
		doc.setFont("helvetica", "normal"); // Reset font style after tables
		doc.setFontSize(8);
		doc.setTextColor(128);

		// Branding and timestamp (left)
		const prefix = "Generated by ";
		const linkText = "MortgageLab.ie";
		const suffix = ` on ${timestamp}`;

		doc.text(prefix, PDF_LAYOUT.marginLeft, footerY);
		const prefixWidth = doc.getTextWidth(prefix);

		// Add link text in blue
		doc.setTextColor(0, 0, 238);
		doc.textWithLink(linkText, PDF_LAYOUT.marginLeft + prefixWidth, footerY, {
			url: "https://www.mortgagelab.ie",
		});
		const linkWidth = doc.getTextWidth(linkText);

		// Continue with suffix in gray
		doc.setTextColor(128);
		doc.text(suffix, PDF_LAYOUT.marginLeft + prefixWidth + linkWidth, footerY);

		// Page number (right)
		doc.text(`Page ${i} of ${pageCount}`, rightX, footerY, { align: "right" });
	}
}

/**
 * Downloads the PDF document.
 */
export function downloadPDF(
	doc: Awaited<ReturnType<typeof createPDFDocument>>,
	page: ExportPage,
): void {
	const filename = generateExportFilename(page, "pdf");
	const blob = doc.output("blob");
	downloadFile(blob, filename);
}

/**
 * Downloads the PDF with a custom filename.
 */
export function downloadPDFWithFilename(
	doc: Awaited<ReturnType<typeof createPDFDocument>>,
	filename: string,
): void {
	const blob = doc.output("blob");
	downloadFile(blob, filename);
}

/**
 * Simple export: creates PDF with title and table, then downloads.
 */
export async function exportTableToPDF(
	data: TableExportData,
	page: ExportPage,
	title: string,
	subtitle?: string,
): Promise<void> {
	const doc = await createPDFDocument();

	let y = addTitle(doc, title);
	if (subtitle) {
		y = addSubtitle(doc, subtitle, y);
	}

	await addTable(doc, data, y);
	addFooter(doc);

	downloadPDF(doc, page);
}

// ============================================================================
// Styled Components
// ============================================================================

/**
 * Adds a branded header with logo and title (first page only).
 * Logo is clickable and links to MortgageLab.ie.
 */
export async function addBrandedHeader(
	doc: Awaited<ReturnType<typeof createPDFDocument>>,
	title: string,
	y = PDF_LAYOUT.marginTop,
): Promise<number> {
	const logoX = PDF_LAYOUT.marginLeft;
	const logoY = y - 2;
	const logoWidth = PDF_LAYOUT.logoWidth;
	const logoHeight = PDF_LAYOUT.logoHeight;

	// Load logo and add to document
	try {
		const logoDataUrl = await loadLogo();
		doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoWidth, logoHeight);

		// Add clickable link over the logo
		doc.link(logoX, logoY, logoWidth, logoHeight, {
			url: "https://www.mortgagelab.ie",
		});
	} catch {
		// Fallback if logo fails - just skip the logo
	}

	// Add title next to logo
	const titleX = PDF_LAYOUT.marginLeft + PDF_LAYOUT.logoWidth + 4;
	doc.setFontSize(PDF_FONTS.title);
	doc.setFont("helvetica", "bold");
	doc.setTextColor(...PDF_COLORS.text);
	doc.text(title, titleX, y + 6);

	// Reset text color
	doc.setTextColor(0);

	return y + 18;
}

/**
 * Adds a horizontal divider line.
 */
export function addDivider(
	doc: Awaited<ReturnType<typeof createPDFDocument>>,
	y: number,
	options?: { color?: readonly [number, number, number]; margin?: number },
): number {
	const color = options?.color ?? PDF_COLORS.borderColor;
	const margin = options?.margin ?? 4;

	doc.setDrawColor(...color);
	doc.setLineWidth(PDF_LAYOUT.dividerWidth);
	doc.line(PDF_LAYOUT.marginLeft, y, 210 - PDF_LAYOUT.marginRight, y);

	return y + margin;
}

export type MetricVariant = "default" | "success" | "warning" | "danger";

interface MetricBoxOptions {
	variant?: MetricVariant;
	width?: number;
}

/**
 * Adds a metric box with label and value.
 */
export function addMetricBox(
	doc: Awaited<ReturnType<typeof createPDFDocument>>,
	label: string,
	value: string,
	x: number,
	y: number,
	options?: MetricBoxOptions,
): void {
	const width = options?.width ?? 42;
	const height = 18;
	const variant = options?.variant ?? "default";

	// Determine colors based on variant
	let bgColor: readonly [number, number, number];
	let valueColor: readonly [number, number, number];

	switch (variant) {
		case "success":
			bgColor = [240, 253, 244]; // green-50
			valueColor = PDF_COLORS.success;
			break;
		case "warning":
			bgColor = [254, 252, 232]; // yellow-50
			valueColor = PDF_COLORS.warning;
			break;
		case "danger":
			bgColor = [254, 242, 242]; // red-50
			valueColor = PDF_COLORS.danger;
			break;
		default:
			bgColor = PDF_COLORS.altRowBg;
			valueColor = PDF_COLORS.text;
	}

	// Draw box background
	doc.setFillColor(...bgColor);
	doc.setDrawColor(...PDF_COLORS.borderColor);
	doc.setLineWidth(0.3);
	doc.roundedRect(x, y, width, height, 2, 2, "FD");

	// Add label (small, muted)
	doc.setFontSize(8);
	doc.setFont("helvetica", "normal");
	doc.setTextColor(...PDF_COLORS.textMuted);
	doc.text(label, x + 3, y + 5);

	// Add value (larger, colored)
	doc.setFontSize(11);
	doc.setFont("helvetica", "bold");
	doc.setTextColor(...valueColor);
	doc.text(value, x + 3, y + 13);

	// Reset colors
	doc.setTextColor(0);
}

/**
 * Adds a row of metric boxes.
 * Automatically calculates spacing based on number of metrics.
 */
export function addMetricRow(
	doc: Awaited<ReturnType<typeof createPDFDocument>>,
	metrics: Array<{
		label: string;
		value: string;
		variant?: MetricVariant;
	}>,
	y: number,
): number {
	const totalWidth = PDF_LAYOUT.contentWidth;
	const gap = 4;
	const count = metrics.length;
	const boxWidth = (totalWidth - gap * (count - 1)) / count;

	let x = PDF_LAYOUT.marginLeft;
	for (const metric of metrics) {
		addMetricBox(doc, metric.label, metric.value, x, y, {
			width: boxWidth,
			variant: metric.variant,
		});
		x += boxWidth + gap;
	}

	return y + 22; // box height + gap
}

/**
 * Adds a styled section header with optional divider above.
 */
export function addStyledSectionHeader(
	doc: Awaited<ReturnType<typeof createPDFDocument>>,
	header: string,
	y: number,
	options?: { divider?: boolean },
): number {
	if (options?.divider) {
		y = addDivider(doc, y, { margin: 6 });
	}

	doc.setFontSize(PDF_FONTS.sectionHeader);
	doc.setFont("helvetica", "bold");
	doc.setTextColor(...PDF_COLORS.text);
	doc.text(header, PDF_LAYOUT.marginLeft, y);
	doc.setTextColor(0);

	return y + 8;
}

/**
 * Adds a "View Online" link section at the end of the document.
 * Should be called before addFooter().
 */
export function addViewOnlineLink(
	doc: Awaited<ReturnType<typeof createPDFDocument>>,
	shareUrl: string,
): void {
	const pageCount = doc.getNumberOfPages();
	doc.setPage(pageCount);

	// Get page dimensions
	const pageHeight = doc.internal.pageSize.getHeight();
	const footerY = pageHeight - 10; // Footer position
	const linkY = footerY - 8; // Position above footer

	// Draw a subtle divider above the link
	doc.setDrawColor(...PDF_COLORS.borderColor);
	doc.setLineWidth(PDF_LAYOUT.dividerWidth);
	doc.line(
		PDF_LAYOUT.marginLeft,
		linkY - 4,
		doc.internal.pageSize.getWidth() - PDF_LAYOUT.marginRight,
		linkY - 4,
	);

	// Add clickable link with friendly text
	doc.setFontSize(9);
	doc.setFont("helvetica", "normal");
	doc.setTextColor(0, 0, 238);
	doc.textWithLink("View this report online", PDF_LAYOUT.marginLeft, linkY, {
		url: shareUrl,
	});

	// Reset colors
	doc.setTextColor(0);
}
