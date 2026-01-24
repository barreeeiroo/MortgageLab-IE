/**
 * Simulation page export functionality.
 * Exports amortization schedule, summary, and configuration.
 */

import type {
	AmortizationYear,
	OverpaymentConfig,
	ResolvedRatePeriod,
	SelfBuildConfig,
	SimulationSummary,
} from "@/lib/schemas/simulate";
import {
	addWorksheet,
	createExcelWorkbook,
	downloadWorkbook,
} from "./format/excel";
import {
	addBrandedHeader,
	addFooter,
	addImage,
	addKeyValue,
	addMetricRow,
	addSectionHeader,
	addStyledSectionHeader,
	addTable,
	addViewOnlineLink,
	createPDFDocument,
	downloadPDF,
	type MetricVariant,
} from "./format/pdf";
import {
	formatCurrencyForExport,
	formatPercentForExport,
	formatTermForExport,
} from "./formatters";
import type { TableExportData } from "./types";

/** Chart image with title for PDF export */
export interface ChartImageData {
	title: string;
	imageDataUrl: string;
}

interface SimulateExportContext {
	// Input data
	mortgageAmount: number;
	mortgageTerm: number;
	propertyValue: number;
	startDate?: Date;
	// Calculated data
	yearlySchedule: AmortizationYear[];
	summary: SimulationSummary;
	ratePeriods: ResolvedRatePeriod[];
	overpaymentConfigs?: OverpaymentConfig[];
	selfBuildConfig?: SelfBuildConfig;
	// Chart images for PDF export (multiple charts with titles)
	chartImages?: ChartImageData[];
	/** Share URL to include in PDF export as "View Online" link */
	shareUrl?: string;
}

// Excel column configurations
interface ColumnConfig {
	header: string;
	width?: number;
	style?: { numFmt?: string };
}

/**
 * Prepares yearly schedule as table export data for PDF.
 * Note: All amounts are stored in cents, so we divide by 100.
 */
function prepareScheduleDataForPDF(
	schedule: AmortizationYear[],
): TableExportData {
	const headers = [
		"Year",
		"Opening Balance",
		"Principal Paid",
		"Interest Paid",
		"Overpayments",
		"Closing Balance",
		"Cumulative Interest",
	];

	const rows = schedule.map((year) => [
		year.year,
		formatCurrencyForExport(year.openingBalance / 100, true),
		formatCurrencyForExport(year.totalPrincipal / 100, true),
		formatCurrencyForExport(year.totalInterest / 100, true),
		formatCurrencyForExport(year.totalOverpayments / 100, true),
		formatCurrencyForExport(year.closingBalance / 100, true),
		formatCurrencyForExport(year.cumulativeInterest / 100, true),
	]);

	return { headers, rows };
}

/**
 * Prepares yearly schedule as table export data for Excel.
 * Note: All amounts are stored in cents, so we divide by 100.
 */
function prepareScheduleDataForExcel(schedule: AmortizationYear[]): {
	data: TableExportData;
	columnConfigs: ColumnConfig[];
} {
	const headers = [
		"Year",
		"Opening Balance (EUR)",
		"Principal Paid (EUR)",
		"Interest Paid (EUR)",
		"Overpayments (EUR)",
		"Closing Balance (EUR)",
		"Cumulative Interest (EUR)",
	];

	const rows = schedule.map((year) => [
		year.year,
		Math.round(year.openingBalance) / 100,
		Math.round(year.totalPrincipal) / 100,
		Math.round(year.totalInterest) / 100,
		Math.round(year.totalOverpayments) / 100,
		Math.round(year.closingBalance) / 100,
		Math.round(year.cumulativeInterest) / 100,
	]);

	const currencyFormat = "€#,##0.00";
	const columnConfigs: ColumnConfig[] = [
		{ header: headers[0], width: 8 },
		{ header: headers[1], width: 18, style: { numFmt: currencyFormat } },
		{ header: headers[2], width: 16, style: { numFmt: currencyFormat } },
		{ header: headers[3], width: 16, style: { numFmt: currencyFormat } },
		{ header: headers[4], width: 16, style: { numFmt: currencyFormat } },
		{ header: headers[5], width: 18, style: { numFmt: currencyFormat } },
		{ header: headers[6], width: 20, style: { numFmt: currencyFormat } },
	];

	return { data: { headers, rows }, columnConfigs };
}

/**
 * Prepares summary as table export data.
 * Note: All amounts are stored in cents, so we divide by 100.
 */
function prepareSummaryData(context: SimulateExportContext): TableExportData {
	const { summary, mortgageAmount, mortgageTerm, propertyValue } = context;
	const ltv =
		propertyValue > 0
			? ((mortgageAmount / propertyValue) * 100).toFixed(1)
			: "N/A";

	const headers = ["Metric", "Value"];
	const rows: (string | number)[][] = [
		["Mortgage Amount", formatCurrencyForExport(mortgageAmount / 100, true)],
		["Original Term", formatTermForExport(mortgageTerm)],
		["Property Value", formatCurrencyForExport(propertyValue / 100, true)],
		["LTV", `${ltv}%`],
		[
			"Total Interest Paid",
			formatCurrencyForExport(summary.totalInterest / 100, true),
		],
		[
			"Total Amount Paid",
			formatCurrencyForExport(summary.totalPaid / 100, true),
		],
		["Actual Term", formatTermForExport(summary.actualTermMonths)],
	];

	// Add savings if there are overpayments
	if (summary.interestSaved > 0 || summary.monthsSaved > 0) {
		rows.push(
			[
				"Interest Saved",
				formatCurrencyForExport(summary.interestSaved / 100, true),
			],
			["Months Saved", summary.monthsSaved.toString()],
		);
	}

	return { headers, rows };
}

/**
 * Prepares rate periods as table export data for PDF.
 */
function prepareRatePeriodsDataForPDF(
	ratePeriods: ResolvedRatePeriod[],
): TableExportData {
	const headers = ["Period", "Lender", "Rate", "Type", "Duration"];

	const rows = ratePeriods.map((period, index) => [
		index + 1,
		period.lenderName ?? "Custom",
		formatPercentForExport(period.rate / 100, 2),
		period.type === "fixed" ? "Fixed" : "Variable",
		period.durationMonths > 0
			? formatTermForExport(period.durationMonths)
			: "Until end",
	]);

	return { headers, rows };
}

/**
 * Prepares rate periods as table export data for Excel.
 */
function prepareRatePeriodsDataForExcel(ratePeriods: ResolvedRatePeriod[]): {
	data: TableExportData;
	columnConfigs: ColumnConfig[];
} {
	const headers = ["Period", "Lender", "Rate (%)", "Type", "Duration"];

	const rows = ratePeriods.map((period, index) => [
		index + 1,
		period.lenderName ?? "Custom",
		period.rate,
		period.type === "fixed" ? "Fixed" : "Variable",
		period.durationMonths > 0
			? formatTermForExport(period.durationMonths)
			: "Until end",
	]);

	const columnConfigs: ColumnConfig[] = [
		{ header: headers[0], width: 8 },
		{ header: headers[1], width: 20 },
		{ header: headers[2], width: 12, style: { numFmt: '0.00"%"' } },
		{ header: headers[3], width: 10 },
		{ header: headers[4], width: 14 },
	];

	return { data: { headers, rows }, columnConfigs };
}

/**
 * Prepares overpayment configs as table export data for Excel.
 * Note: Amounts are stored in cents, so we divide by 100.
 */
function prepareOverpaymentsDataForExcel(
	overpayments: OverpaymentConfig[],
): { data: TableExportData; columnConfigs: ColumnConfig[] } | null {
	const enabledOverpayments = overpayments.filter((op) => op.enabled);
	if (enabledOverpayments.length === 0) return null;

	const headers = [
		"Label",
		"Type",
		"Amount (EUR)",
		"Frequency",
		"Start Month",
		"End Month",
		"Effect",
	];

	const typeLabels: Record<string, string> = {
		one_time: "One-Time",
		recurring: "Recurring",
	};

	const effectLabels: Record<string, string> = {
		reduce_term: "Reduce Term",
		reduce_payment: "Reduce Payment",
	};

	const rows = enabledOverpayments.map((op) => [
		op.label ?? "-",
		typeLabels[op.type] ?? op.type,
		op.amount / 100, // Amount in cents
		op.frequency ?? "-",
		op.startMonth,
		op.endMonth ?? "-",
		effectLabels[op.effect] ?? op.effect,
	]);

	const columnConfigs: ColumnConfig[] = [
		{ header: headers[0], width: 20 },
		{ header: headers[1], width: 14 },
		{ header: headers[2], width: 14, style: { numFmt: "€#,##0.00" } },
		{ header: headers[3], width: 12 },
		{ header: headers[4], width: 12 },
		{ header: headers[5], width: 12 },
		{ header: headers[6], width: 16 },
	];

	return { data: { headers, rows }, columnConfigs };
}

/**
 * Prepares self-build config as table export data for Excel.
 * Note: Amounts are stored in cents, so we divide by 100.
 */
function prepareSelfBuildDataForExcel(config: SelfBuildConfig): {
	data: TableExportData;
	columnConfigs: ColumnConfig[];
} | null {
	if (!config.enabled || config.drawdownStages.length === 0) return null;

	const headers = ["Stage", "Month", "Amount (EUR)", "Label"];

	const rows = config.drawdownStages.map((stage, index) => [
		index + 1,
		stage.month,
		stage.amount / 100,
		stage.label ?? "-",
	]);

	// Add summary row
	const totalAmount = config.drawdownStages.reduce(
		(sum, s) => sum + s.amount,
		0,
	);
	rows.push(["Total", "-", totalAmount / 100, "-"]);

	const columnConfigs: ColumnConfig[] = [
		{ header: headers[0], width: 8 },
		{ header: headers[1], width: 10 },
		{ header: headers[2], width: 16, style: { numFmt: "€#,##0.00" } },
		{ header: headers[3], width: 20 },
	];

	return { data: { headers, rows }, columnConfigs };
}

/**
 * Exports simulation to Excel file with multiple sheets.
 */
export async function exportSimulationToExcel(
	context: SimulateExportContext,
): Promise<void> {
	// Create workbook with summary sheet
	const summaryData = prepareSummaryData(context);
	const workbook = await createExcelWorkbook("Summary", summaryData);

	// Add rate periods sheet
	const ratePeriods = prepareRatePeriodsDataForExcel(context.ratePeriods);
	await addWorksheet(
		workbook,
		"Rate Periods",
		ratePeriods.data,
		ratePeriods.columnConfigs,
	);

	// Add overpayments sheet if there are any
	if (context.overpaymentConfigs && context.overpaymentConfigs.length > 0) {
		const overpayments = prepareOverpaymentsDataForExcel(
			context.overpaymentConfigs,
		);
		if (overpayments) {
			await addWorksheet(
				workbook,
				"Overpayments",
				overpayments.data,
				overpayments.columnConfigs,
			);
		}
	}

	// Add self-build sheet if configured
	if (context.selfBuildConfig?.enabled) {
		const selfBuild = prepareSelfBuildDataForExcel(context.selfBuildConfig);
		if (selfBuild) {
			await addWorksheet(
				workbook,
				"Self Build",
				selfBuild.data,
				selfBuild.columnConfigs,
			);
		}
	}

	// Add schedule sheet
	const schedule = prepareScheduleDataForExcel(context.yearlySchedule);
	await addWorksheet(
		workbook,
		"Yearly Schedule",
		schedule.data,
		schedule.columnConfigs,
	);

	await downloadWorkbook(workbook, "simulation");
}

/**
 * Prepares overpayment configs as table export data for PDF.
 * Note: Amounts are stored in cents, so we divide by 100.
 */
function prepareOverpaymentsDataForPDF(
	overpayments: OverpaymentConfig[],
): TableExportData | null {
	const enabledOverpayments = overpayments.filter((op) => op.enabled);
	if (enabledOverpayments.length === 0) return null;

	const headers = ["Label", "Type", "Amount", "Frequency", "Start", "End"];

	const typeLabels: Record<string, string> = {
		one_time: "One-Time",
		recurring: "Recurring",
	};

	const rows = enabledOverpayments.map((op) => [
		op.label ?? "-",
		typeLabels[op.type] ?? op.type,
		formatCurrencyForExport(op.amount / 100, true),
		op.frequency ?? "-",
		`Month ${op.startMonth}`,
		op.endMonth ? `Month ${op.endMonth}` : "-",
	]);

	return { headers, rows };
}

/**
 * Prepares self-build config as table export data for PDF.
 * Note: Amounts are stored in cents, so we divide by 100.
 */
function prepareSelfBuildDataForPDF(
	config: SelfBuildConfig,
): TableExportData | null {
	if (!config.enabled || config.drawdownStages.length === 0) return null;

	const headers = ["Stage", "Month", "Amount", "Label"];

	const rows = config.drawdownStages.map((stage, index) => [
		index + 1,
		stage.month,
		formatCurrencyForExport(stage.amount / 100, true),
		stage.label ?? "-",
	]);

	return { headers, rows };
}

/**
 * Exports simulation to PDF with summary, configuration, and optional charts.
 * Note: All amounts are stored in cents, so we divide by 100.
 */
export async function exportSimulationToPDF(
	context: SimulateExportContext,
): Promise<void> {
	const doc = await createPDFDocument();
	const { summary, mortgageAmount, mortgageTerm, propertyValue } = context;

	// Branded header with logo
	let y = await addBrandedHeader(doc, "Mortgage Simulation Report");

	// Key metrics row
	const ltv =
		propertyValue > 0
			? ((mortgageAmount / propertyValue) * 100).toFixed(0)
			: "N/A";

	y = addMetricRow(
		doc,
		[
			{
				label: "Mortgage Amount",
				value: formatCurrencyForExport(mortgageAmount / 100, true),
			},
			{
				label: "Property Value",
				value: formatCurrencyForExport(propertyValue / 100, true),
			},
			{ label: "LTV", value: `${ltv}%` },
			{ label: "Term", value: formatTermForExport(mortgageTerm) },
		],
		y,
	);

	// Results metrics row
	const resultsMetrics: Array<{
		label: string;
		value: string;
		variant?: MetricVariant;
	}> = [
		{
			label: "Total Interest",
			value: formatCurrencyForExport(summary.totalInterest / 100, true),
		},
		{
			label: "Total Paid",
			value: formatCurrencyForExport(summary.totalPaid / 100, true),
		},
		{
			label: "Actual Term",
			value: formatTermForExport(summary.actualTermMonths),
		},
	];

	// Add savings metrics if applicable
	if (summary.interestSaved > 0) {
		resultsMetrics.push({
			label: "Interest Saved",
			value: formatCurrencyForExport(summary.interestSaved / 100, true),
			variant: "success",
		});
	}

	y = addMetricRow(doc, resultsMetrics, y);
	y += 4;

	// Rate periods section
	y = addStyledSectionHeader(doc, "Rate Periods", y, { divider: true });
	const ratePeriodsData = prepareRatePeriodsDataForPDF(context.ratePeriods);
	y = await addTable(doc, ratePeriodsData, y);

	// Overpayments section if any
	if (context.overpaymentConfigs && context.overpaymentConfigs.length > 0) {
		const overpaymentsData = prepareOverpaymentsDataForPDF(
			context.overpaymentConfigs,
		);
		if (overpaymentsData) {
			y = addStyledSectionHeader(doc, "Overpayments", y, { divider: true });
			y = await addTable(doc, overpaymentsData, y);
		}
	}

	// Self-build section if configured
	if (context.selfBuildConfig?.enabled) {
		const selfBuildData = prepareSelfBuildDataForPDF(context.selfBuildConfig);
		if (selfBuildData) {
			y = addStyledSectionHeader(doc, "Self Build Drawdowns", y, {
				divider: true,
			});
			y = addKeyValue(
				doc,
				"Construction Payment",
				context.selfBuildConfig.constructionRepaymentType === "interest_only"
					? "Interest Only"
					: "Interest & Capital",
				y,
			);
			if (context.selfBuildConfig.interestOnlyMonths > 0) {
				y = addKeyValue(
					doc,
					"Post-Build Interest Only",
					`${context.selfBuildConfig.interestOnlyMonths} months`,
					y,
				);
			}
			y = await addTable(doc, selfBuildData, y);
		}
	}

	// Charts section if available
	if (context.chartImages && context.chartImages.length > 0) {
		y = addStyledSectionHeader(doc, "Charts", y, { divider: true });
		for (const chart of context.chartImages) {
			// Check if we need a new page (leave room for image ~100px + header)
			if (y > 180) {
				doc.addPage();
				y = 20;
			}
			y = addSectionHeader(doc, chart.title, y);
			y = addImage(doc, chart.imageDataUrl, y, { width: 180, height: 90 });
		}
	}

	// Schedule table
	y = addStyledSectionHeader(doc, "Yearly Amortization Schedule", y, {
		divider: true,
	});
	const scheduleData = prepareScheduleDataForPDF(context.yearlySchedule);
	y = await addTable(doc, scheduleData, y);

	// Add "View Online" link if share URL provided
	if (context.shareUrl) {
		addViewOnlineLink(doc, context.shareUrl, y);
	}

	addFooter(doc);
	downloadPDF(doc, "simulation");
}
