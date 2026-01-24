/**
 * Rates page export functionality.
 * Transforms filtered rates into exportable format with computed fields.
 */

import type { SortingState, VisibilityState } from "@tanstack/react-table";
import type { BerRating } from "@/lib/constants/ber";
import { getLender } from "@/lib/data/lenders";
import { type AprcConfig, calculateAprc } from "@/lib/mortgage/aprc";
import { calculateMonthlyPayment } from "@/lib/mortgage/calculations";
import {
	calculateCostOfCreditPercent,
	calculateFollowOnLtv,
	calculateMonthlyFollowOn,
	calculateTotalRepayable,
} from "@/lib/mortgage/payments";
import { findVariableRate } from "@/lib/mortgage/rates";
import type { AprcFees, Lender } from "@/lib/schemas/lender";
import { DEFAULT_APRC_FEES } from "@/lib/schemas/lender";
import type { MortgageRate } from "@/lib/schemas/rate";
import { exportToCSV } from "./format/csv";
import { createExcelWorkbook, downloadWorkbook } from "./format/excel";
import {
	addBrandedHeader,
	addFooter,
	addTableWithLogos,
	addViewOnlineLink,
	createPDFDocument,
	downloadPDF,
} from "./format/pdf";
import { formatCurrencyForExport, formatPercentForExport } from "./formatters";
import { preloadAllLenderLogos } from "./style/lender-logos";
import type { TableExportData } from "./types";

interface RatesExportContext {
	rates: MortgageRate[];
	allRates: MortgageRate[];
	lenders: Lender[];
	mortgageAmount: number;
	mortgageTerm: number;
	ltv: number;
	berRating?: BerRating;
	columnVisibility?: VisibilityState;
	sorting?: SortingState;
	/** Share URL to include in PDF export as "View Online" link */
	shareUrl?: string;
}

/** @internal Exported for testing */
export interface ExportableRateRow {
	lender: string;
	product: string;
	type: string;
	fixedTerm: number | null;
	rate: number;
	apr: number | null;
	monthlyPayment: number;
	followOnProduct: string | null;
	followOnRate: number | null;
	followOnMonthly: number | null;
	totalRepayable: number | null;
	costOfCreditPct: number | null;
}

/**
 * Column labels for export headers.
 */
const COLUMN_LABELS: Record<keyof ExportableRateRow, string> = {
	lender: "Lender",
	product: "Product",
	type: "Type",
	fixedTerm: "Fixed Period (Years)",
	rate: "Rate (%)",
	apr: "APRC (%)",
	monthlyPayment: "Monthly Payment (EUR)",
	followOnProduct: "Follow-On Product",
	followOnRate: "Follow-On Rate (%)",
	followOnMonthly: "Follow-On Monthly (EUR)",
	totalRepayable: "Total Repayable (EUR)",
	costOfCreditPct: "Cost of Credit (%)",
};

/**
 * Maps column visibility keys to export row keys.
 */
const VISIBILITY_TO_EXPORT: Record<string, keyof ExportableRateRow> = {
	lenderId: "lender",
	name: "product",
	type: "type",
	fixedTerm: "fixedTerm",
	rate: "rate",
	apr: "apr",
	monthlyPayment: "monthlyPayment",
	followOnProduct: "followOnProduct",
	monthlyFollowOn: "followOnMonthly",
	totalRepayable: "totalRepayable",
	costOfCreditPct: "costOfCreditPct",
};

/**
 * Default columns to include in export (when no visibility state provided).
 */
const DEFAULT_EXPORT_COLUMNS: (keyof ExportableRateRow)[] = [
	"lender",
	"product",
	"type",
	"fixedTerm",
	"rate",
	"apr",
	"monthlyPayment",
	"followOnProduct",
	"followOnMonthly",
	"totalRepayable",
	"costOfCreditPct",
];

/**
 * Transforms rates data into exportable row format with computed fields.
 */
function transformRatesToExportRows(
	context: RatesExportContext,
): ExportableRateRow[] {
	const {
		rates,
		allRates,
		lenders,
		mortgageAmount,
		mortgageTerm,
		ltv,
		berRating,
	} = context;

	return rates.map((rate) => {
		const lender = getLender(lenders, rate.lenderId);
		const lenderName = lender?.name ?? rate.lenderId;

		// Calculate follow-on LTV after fixed term
		const followOnLtv =
			rate.type === "fixed" && rate.fixedTerm
				? calculateFollowOnLtv(
						mortgageAmount,
						rate.rate,
						mortgageTerm,
						rate.fixedTerm * 12,
						ltv,
					)
				: ltv;

		// Find follow-on variable rate
		const followOnRate =
			rate.type === "fixed"
				? findVariableRate(rate, allRates, followOnLtv, berRating)
				: undefined;

		const monthlyPayment = calculateMonthlyPayment(
			mortgageAmount,
			rate.rate,
			mortgageTerm,
		);

		const monthlyFollowOn = calculateMonthlyFollowOn(
			rate,
			followOnRate,
			mortgageAmount,
			mortgageTerm,
		);

		const totalRepayable = calculateTotalRepayable(
			rate,
			monthlyPayment,
			monthlyFollowOn,
			mortgageTerm,
		);

		const costOfCreditPct = calculateCostOfCreditPercent(
			totalRepayable,
			mortgageAmount,
		);

		// Calculate indicative APRC if not provided
		let apr = rate.apr ?? null;
		if (!apr && rate.type === "fixed" && rate.fixedTerm) {
			const aprcFees: AprcFees = lender?.aprcFees ?? DEFAULT_APRC_FEES;
			const aprcConfig: AprcConfig = {
				loanAmount: mortgageAmount,
				termMonths: mortgageTerm,
				valuationFee: aprcFees.valuationFee,
				securityReleaseFee: aprcFees.securityReleaseFee,
			};
			const followOnRateValue = followOnRate?.rate ?? rate.rate;
			apr = calculateAprc(
				rate.rate,
				rate.fixedTerm * 12,
				followOnRateValue,
				aprcConfig,
			);
		}

		return {
			lender: lenderName,
			product: rate.name,
			type: rate.type === "fixed" ? "Fixed" : "Variable",
			fixedTerm: rate.fixedTerm ?? null,
			rate: rate.rate,
			apr,
			monthlyPayment,
			followOnProduct: followOnRate?.name ?? null,
			followOnRate: followOnRate?.rate ?? null,
			followOnMonthly: monthlyFollowOn ?? null,
			totalRepayable: totalRepayable ?? null,
			costOfCreditPct: costOfCreditPct ?? null,
		};
	});
}

/**
 * Determines which columns to include based on visibility state.
 */
/** @internal Exported for testing */
export function getExportColumns(
	columnVisibility?: VisibilityState,
): (keyof ExportableRateRow)[] {
	if (!columnVisibility) {
		return DEFAULT_EXPORT_COLUMNS;
	}

	const columns: (keyof ExportableRateRow)[] = [];

	// Always include lender and product
	columns.push("lender", "product");

	// Add visible columns based on visibility state
	for (const [visKey, exportKey] of Object.entries(VISIBILITY_TO_EXPORT)) {
		// Skip already added columns
		if (exportKey === "lender" || exportKey === "product") continue;

		// Column is visible if not explicitly set to false
		if (columnVisibility[visKey] !== false) {
			columns.push(exportKey);
		}
	}

	return columns;
}

/**
 * Maps table column IDs to export row keys for sorting.
 */
const SORT_KEY_MAP: Record<string, keyof ExportableRateRow> = {
	lenderId: "lender",
	name: "product",
	type: "type",
	fixedTerm: "fixedTerm",
	rate: "rate",
	apr: "apr",
	monthlyPayment: "monthlyPayment",
	followOnProduct: "followOnProduct",
	monthlyFollowOn: "followOnMonthly",
	totalRepayable: "totalRepayable",
	costOfCreditPct: "costOfCreditPct",
};

/**
 * Applies sorting to export rows based on table sorting state.
 */
/** @internal Exported for testing */
export function applySorting(
	rows: ExportableRateRow[],
	sorting?: SortingState,
): ExportableRateRow[] {
	if (!sorting || sorting.length === 0) {
		return rows;
	}

	return [...rows].sort((a, b) => {
		for (const sort of sorting) {
			const key = SORT_KEY_MAP[sort.id];
			if (!key) continue;

			const aVal = a[key];
			const bVal = b[key];

			// Handle nulls - put them at the end
			if (aVal === null && bVal === null) continue;
			if (aVal === null) return sort.desc ? -1 : 1;
			if (bVal === null) return sort.desc ? 1 : -1;

			// Compare values
			let comparison = 0;
			if (typeof aVal === "number" && typeof bVal === "number") {
				comparison = aVal - bVal;
			} else {
				comparison = String(aVal).localeCompare(String(bVal));
			}

			if (comparison !== 0) {
				return sort.desc ? -comparison : comparison;
			}
		}
		return 0;
	});
}

/**
 * Excel number format configurations by column type.
 */
const EXCEL_FORMATS: Partial<Record<keyof ExportableRateRow, string>> = {
	rate: '0.00"%"',
	apr: '0.00"%"',
	followOnRate: '0.00"%"',
	costOfCreditPct: '0.00"%"',
	monthlyPayment: "€#,##0.00",
	followOnMonthly: "€#,##0.00",
	totalRepayable: "€#,##0.00",
};

/**
 * Converts export rows to table export data format for Excel.
 * Uses raw numbers with Excel number formatting.
 */
function toExcelExportData(
	rows: ExportableRateRow[],
	columns: (keyof ExportableRateRow)[],
): {
	data: TableExportData;
	columnConfigs: {
		header: string;
		width?: number;
		style?: { numFmt?: string };
	}[];
} {
	const headers = columns.map((col) => COLUMN_LABELS[col]);

	const dataRows = rows.map((row) =>
		columns.map((col) => {
			const value = row[col];
			if (value === null) return "";

			// Output raw numbers - Excel formatting handles display
			switch (col) {
				case "monthlyPayment":
				case "followOnMonthly":
				case "totalRepayable":
					// Round to 2 decimal places
					return Math.round((value as number) * 100) / 100;
				case "rate":
				case "apr":
				case "followOnRate":
				case "costOfCreditPct":
					// Keep as-is (stored as percentage number like 3.5)
					return value;
				default:
					return value;
			}
		}),
	);

	// Build column configs with number formats
	const columnConfigs = columns.map((col) => ({
		header: COLUMN_LABELS[col],
		width: col === "product" || col === "followOnProduct" ? 25 : undefined,
		style: EXCEL_FORMATS[col] ? { numFmt: EXCEL_FORMATS[col] } : undefined,
	}));

	return { data: { headers, rows: dataRows }, columnConfigs };
}

/**
 * Converts export rows to table export data format for CSV.
 * Uses raw numeric values (units are in headers).
 */
function toCSVExportData(
	rows: ExportableRateRow[],
	columns: (keyof ExportableRateRow)[],
): TableExportData {
	const headers = columns.map((col) => COLUMN_LABELS[col]);

	const dataRows = rows.map((row) =>
		columns.map((col) => {
			const value = row[col];
			if (value === null) return "";

			// For CSV, output raw numbers - units are in headers
			switch (col) {
				case "monthlyPayment":
				case "followOnMonthly":
				case "totalRepayable":
					// Round to 2 decimal places for currency
					return Math.round((value as number) * 100) / 100;
				case "rate":
				case "apr":
				case "followOnRate":
				case "costOfCreditPct":
					// Already stored as percentage (e.g., 3.5 for 3.5%)
					return value;
				default:
					return value;
			}
		}),
	);

	return { headers, rows: dataRows };
}

/**
 * Exports rates to CSV file.
 */
export function exportRatesToCSV(context: RatesExportContext): void {
	const unsortedRows = transformRatesToExportRows(context);
	const rows = applySorting(unsortedRows, context.sorting);
	const columns = getExportColumns(context.columnVisibility);
	const data = toCSVExportData(rows, columns);
	exportToCSV(data, "rates");
}

/**
 * Exports rates to Excel file.
 */
export async function exportRatesToExcel(
	context: RatesExportContext,
): Promise<void> {
	const unsortedRows = transformRatesToExportRows(context);
	const rows = applySorting(unsortedRows, context.sorting);
	const columns = getExportColumns(context.columnVisibility);
	const { data, columnConfigs } = toExcelExportData(rows, columns);

	const workbook = await createExcelWorkbook(
		"Mortgage Rates",
		data,
		columnConfigs,
	);
	await downloadWorkbook(workbook, "rates");
}

/**
 * PDF column labels (shorter versions for landscape layout).
 */
const PDF_COLUMN_LABELS: Record<keyof ExportableRateRow, string> = {
	lender: "Lender",
	product: "Product",
	type: "Type",
	fixedTerm: "Fixed (Yrs)",
	rate: "Rate",
	apr: "APRC",
	monthlyPayment: "Monthly",
	followOnProduct: "Follow-On",
	followOnRate: "Follow-On Rate",
	followOnMonthly: "Follow-On Monthly",
	totalRepayable: "Total Repayable",
	costOfCreditPct: "Cost of Credit",
};

/**
 * Converts export rows to table export data format for PDF.
 * Uses formatted strings with currency/percentage symbols.
 */
function toPDFExportData(
	rows: ExportableRateRow[],
	columns: (keyof ExportableRateRow)[],
): TableExportData {
	const headers = columns.map((col) => PDF_COLUMN_LABELS[col]);

	const dataRows = rows.map((row) =>
		columns.map((col) => {
			const value = row[col];
			if (value === null || value === "") return "";

			switch (col) {
				case "monthlyPayment":
				case "followOnMonthly":
				case "totalRepayable":
					return formatCurrencyForExport(value as number, true);
				case "rate":
				case "apr":
				case "followOnRate":
				case "costOfCreditPct":
					return formatPercentForExport((value as number) / 100, 2);
				case "fixedTerm":
					return value === 0 ? "" : String(value);
				default:
					return value;
			}
		}),
	);

	return { headers, rows: dataRows };
}

/**
 * Exports rates to PDF file in landscape orientation with lender logos.
 */
export async function exportRatesToPDF(
	context: RatesExportContext,
): Promise<void> {
	const unsortedRows = transformRatesToExportRows(context);
	const rows = applySorting(unsortedRows, context.sorting);
	const columns = getExportColumns(context.columnVisibility);
	const data = toPDFExportData(rows, columns);

	// Build lender name to ID mapping for logo matching
	const lenderNameToId = new Map<string, string>();
	for (const lender of context.lenders) {
		lenderNameToId.set(lender.name, lender.id);
	}

	// Create landscape PDF
	const doc = await createPDFDocument("landscape");

	// Add branded header
	const y = await addBrandedHeader(doc, "Mortgage Rates Comparison");

	// Preload lender logos
	const logos = await preloadAllLenderLogos(24);

	// Add table with logos
	const finalY = await addTableWithLogos(doc, data, logos, y, {
		logoColumn: 0,
		logoSize: 4,
		lenderNameToId,
	});

	// Add "View Online" link if share URL provided
	if (context.shareUrl) {
		addViewOnlineLink(doc, context.shareUrl, finalY);
	}

	// Add footer
	addFooter(doc);

	// Download
	downloadPDF(doc, "rates");
}
