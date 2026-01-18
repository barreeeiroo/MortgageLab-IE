/**
 * Compare rates export functionality.
 * Exports compared rates in transposed format (metrics as rows, rates as columns).
 */

import { getLender } from "@/lib/data/lenders";
import { resolvePerks } from "@/lib/data/perks";
import type { Lender } from "@/lib/schemas/lender";
import type { Perk } from "@/lib/schemas/perk";
import type { MortgageRate } from "@/lib/schemas/rate";
import { formatCurrency } from "@/lib/utils/currency";
import { formatTermDisplay } from "@/lib/utils/term";
import { exportToCSV } from "./format/csv";
import { createExcelWorkbook, downloadWorkbook } from "./format/excel";
import {
	addBrandedHeader,
	addFooter,
	addSubtitle,
	addTable,
	addViewOnlineLink,
	createPDFDocument,
	downloadPDF,
} from "./format/pdf";
import { sanitizeForPDF } from "./formatters";
import type { TableExportData } from "./types";

/**
 * Rate row with computed fields from the comparison modal.
 */
export interface CompareRateRow extends MortgageRate {
	monthlyPayment: number;
	followOnRate?: MortgageRate;
	followOnLtv: number;
	monthlyFollowOn?: number;
	totalRepayable?: number;
	costOfCreditPct?: number;
	combinedPerks: string[];
	isCustom?: boolean;
	customLenderName?: string;
	indicativeAprc?: number;
	usesFixedRateForWholeTerm?: boolean;
}

export interface CompareRatesExportContext {
	rates: CompareRateRow[];
	lenders: Lender[];
	perks: Perk[];
	mortgageAmount: number;
	mortgageTerm: number; // in months
	shareUrl?: string;
}

/**
 * Comparison metrics with labels for different export formats.
 * CSV/Excel use full labels with units, PDF uses shorter labels.
 */
const COMPARISON_METRICS = [
	{ key: "perks", label: "Perks", pdfLabel: "Perks" },
	{ key: "type", label: "Type", pdfLabel: "Type" },
	{ key: "period", label: "Fixed Period (Years)", pdfLabel: "Fixed Period" },
	{ key: "rate", label: "Rate (%)", pdfLabel: "Rate" },
	{ key: "aprc", label: "APRC (%)", pdfLabel: "APRC" },
	{ key: "monthly", label: "Monthly Payment (EUR)", pdfLabel: "Monthly" },
	{ key: "followOnProduct", label: "Follow-On Product", pdfLabel: "Follow-On" },
	{
		key: "followOnRate",
		label: "Follow-On Rate (%)",
		pdfLabel: "Follow-On Rate",
	},
	{
		key: "followOnMonthly",
		label: "Follow-On Monthly (EUR)",
		pdfLabel: "Follow-On Monthly",
	},
	{
		key: "totalRepayable",
		label: "Total Repayable (EUR)",
		pdfLabel: "Total Repayable",
	},
	{
		key: "costOfCredit",
		label: "Cost of Credit (%)",
		pdfLabel: "Cost of Credit",
	},
] as const;

type ComparisonKey = (typeof COMPARISON_METRICS)[number]["key"];

/**
 * Gets the display value for a metric.
 */
function getMetricValue(
	rate: CompareRateRow,
	key: ComparisonKey,
	perks: Perk[],
): string {
	switch (key) {
		case "perks": {
			const resolvedPerks = resolvePerks(perks, rate.combinedPerks);
			return resolvedPerks.length > 0
				? resolvedPerks.map((p) => p.label).join(", ")
				: "-";
		}
		case "type":
			return rate.type === "fixed" ? "Fixed" : "Variable";
		case "period":
			return rate.type === "fixed" && rate.fixedTerm
				? `${rate.fixedTerm} year${rate.fixedTerm !== 1 ? "s" : ""}`
				: "-";
		case "rate":
			return `${rate.rate.toFixed(2)}%`;
		case "aprc":
			return rate.indicativeAprc ? `${rate.indicativeAprc.toFixed(2)}%` : "-";
		case "monthly":
			return formatCurrency(rate.monthlyPayment, { showCents: true });
		case "followOnProduct":
			if (rate.type !== "fixed") return "-";
			return rate.followOnRate ? rate.followOnRate.name : "Not found";
		case "followOnRate":
			return rate.followOnRate ? `${rate.followOnRate.rate.toFixed(2)}%` : "-";
		case "followOnMonthly":
			return rate.monthlyFollowOn
				? formatCurrency(rate.monthlyFollowOn, { showCents: true })
				: "-";
		case "totalRepayable":
			return rate.totalRepayable
				? formatCurrency(rate.totalRepayable, { showCents: true })
				: "-";
		case "costOfCredit":
			return rate.costOfCreditPct !== undefined
				? `${rate.costOfCreditPct.toFixed(1)}%`
				: "-";
		default:
			return "-";
	}
}

/**
 * Gets the raw numeric value for Excel formatting.
 */
function getRawMetricValue(
	rate: CompareRateRow,
	key: ComparisonKey,
	perks: Perk[],
): string | number {
	switch (key) {
		case "perks": {
			const resolvedPerks = resolvePerks(perks, rate.combinedPerks);
			return resolvedPerks.length > 0
				? resolvedPerks.map((p) => p.label).join(", ")
				: "";
		}
		case "type":
			return rate.type === "fixed" ? "Fixed" : "Variable";
		case "period":
			return rate.type === "fixed" && rate.fixedTerm ? rate.fixedTerm : "";
		case "rate":
			return rate.rate;
		case "aprc":
			return rate.indicativeAprc ?? "";
		case "monthly":
			return Math.round(rate.monthlyPayment * 100) / 100;
		case "followOnProduct":
			if (rate.type !== "fixed") return "";
			return rate.followOnRate ? rate.followOnRate.name : "Not found";
		case "followOnRate":
			return rate.followOnRate?.rate ?? "";
		case "followOnMonthly":
			return rate.monthlyFollowOn
				? Math.round(rate.monthlyFollowOn * 100) / 100
				: "";
		case "totalRepayable":
			return rate.totalRepayable
				? Math.round(rate.totalRepayable * 100) / 100
				: "";
		case "costOfCredit":
			return rate.costOfCreditPct ?? "";
		default:
			return "";
	}
}

/**
 * Builds column headers with lender name and product.
 */
function buildColumnHeaders(
	rates: CompareRateRow[],
	lenders: Lender[],
): string[] {
	return rates.map((rate) => {
		const lender = getLender(lenders, rate.lenderId);
		const displayName =
			rate.isCustom && rate.customLenderName
				? rate.customLenderName
				: (lender?.name ?? rate.lenderId);
		return `${displayName} - ${rate.name}`;
	});
}

/**
 * Transforms comparison data to transposed format for export.
 */
function toTransposedData(
	context: CompareRatesExportContext,
	formatValue: (
		rate: CompareRateRow,
		key: ComparisonKey,
		perks: Perk[],
	) => string | number,
	options?: { usePdfLabels?: boolean },
): TableExportData {
	const headers = [
		"Metric",
		...buildColumnHeaders(context.rates, context.lenders),
	];

	const rows = COMPARISON_METRICS.map((metric) => [
		options?.usePdfLabels ? metric.pdfLabel : metric.label,
		...context.rates.map((rate) =>
			formatValue(rate, metric.key, context.perks),
		),
	]);

	return { headers, rows };
}

/**
 * Exports compared rates to CSV file.
 */
export function exportCompareRatesToCSV(
	context: CompareRatesExportContext,
): void {
	const data = toTransposedData(context, getRawMetricValue);
	exportToCSV(data, "rates");
}

/**
 * Excel number formats by metric key.
 */
const EXCEL_ROW_FORMATS: Partial<Record<ComparisonKey, string>> = {
	rate: '0.00"%"',
	aprc: '0.00"%"',
	followOnRate: '0.00"%"',
	costOfCredit: '0.00"%"',
	monthly: "€#,##0.00",
	followOnMonthly: "€#,##0.00",
	totalRepayable: "€#,##0.00",
};

/**
 * Exports compared rates to Excel file.
 */
export async function exportCompareRatesToExcel(
	context: CompareRatesExportContext,
): Promise<void> {
	const data = toTransposedData(context, getRawMetricValue);

	// Build column configs - first column is metric label, rest are rate values
	const columnConfigs = data.headers.map((header, index) => ({
		header,
		width: index === 0 ? 18 : 22,
	}));

	const workbook = await createExcelWorkbook(
		"Rate Comparison",
		data,
		columnConfigs,
	);

	// Apply number formatting to specific rows
	const worksheet = workbook.getWorksheet("Rate Comparison");
	if (worksheet) {
		COMPARISON_METRICS.forEach((metric, rowIndex) => {
			const format = EXCEL_ROW_FORMATS[metric.key];
			if (format) {
				const row = worksheet.getRow(rowIndex + 2); // +2 for 1-indexed + header row
				// Apply format to all cells except the first (metric label)
				row.eachCell((cell, colIndex) => {
					if (colIndex > 1 && typeof cell.value === "number") {
						cell.numFmt = format;
					}
				});
			}
		});
	}

	await downloadWorkbook(workbook, "rates");
}

/**
 * Exports compared rates to PDF file.
 */
export async function exportCompareRatesToPDF(
	context: CompareRatesExportContext,
): Promise<void> {
	const rawData = toTransposedData(context, getMetricValue, {
		usePdfLabels: true,
	});

	// Sanitize data for PDF compatibility (replace Unicode chars not supported by Helvetica)
	const data: TableExportData = {
		headers: rawData.headers.map((h) =>
			typeof h === "string" ? sanitizeForPDF(h) : h,
		),
		rows: rawData.rows.map((row) =>
			row.map((cell) => {
				if (cell === null || cell === undefined) return "";
				if (typeof cell === "string") return sanitizeForPDF(cell);
				return cell;
			}),
		),
	};

	// Determine orientation based on number of rates
	const orientation = context.rates.length > 3 ? "landscape" : "portrait";
	const doc = await createPDFDocument(orientation);

	// Add branded header
	let y = await addBrandedHeader(doc, "Rate Comparison");

	// Add subtitle with mortgage details
	const subtitle = `${formatCurrency(context.mortgageAmount, { showCents: true })} over ${formatTermDisplay(context.mortgageTerm)}`;
	y = addSubtitle(doc, subtitle, y);

	// Add table
	await addTable(doc, data, y, {
		columnStyles: {
			0: { cellWidth: 35 }, // Metric label column
		},
	});

	// Add "View Online" link if share URL provided
	if (context.shareUrl) {
		addViewOnlineLink(doc, context.shareUrl);
	}

	// Add footer
	addFooter(doc);

	// Download
	downloadPDF(doc, "rates");
}
