/**
 * Compare simulation export functionality.
 * Exports comparison data including metrics, schedules, and charts.
 */

import type {
	CompareSimulationData,
	CompareSummaryMetric,
} from "@/lib/stores/simulate/simulate-compare-calculations";
import {
	addWorksheet,
	createExcelWorkbook,
	downloadWorkbook,
} from "./format/excel";
import {
	addBrandedHeader,
	addFooter,
	addImage,
	addSectionHeader,
	addStyledSectionHeader,
	addTable,
	addViewOnlineLink,
	createPDFDocument,
	downloadPDF,
} from "./format/pdf";
import { formatCurrencyForExport, formatTermForExport } from "./formatters";
import type { ChartImageData } from "./simulate-export";
import type { TableExportData } from "./types";

interface CompareExportContext {
	simulations: CompareSimulationData[];
	summaryMetrics: CompareSummaryMetric[];
	shareUrl?: string;
	chartImages?: ChartImageData[];
}

interface ColumnConfig {
	header: string;
	width?: number;
	style?: { numFmt?: string };
}

/**
 * Prepares simulation overview data for export.
 */
function prepareOverviewData(
	simulations: CompareSimulationData[],
): TableExportData {
	const headers = [
		"Simulation",
		"Mortgage Amount",
		"Term",
		"Property Value",
		"LTV",
		"Rate Periods",
		"Overpayments",
	];

	const rows = simulations.map((sim) => {
		const ltv =
			sim.input.propertyValue > 0
				? ((sim.input.mortgageAmount / sim.input.propertyValue) * 100).toFixed(
						0,
					)
				: "N/A";

		return [
			sim.name,
			formatCurrencyForExport(sim.input.mortgageAmount / 100, true),
			formatTermForExport(sim.input.mortgageTermMonths),
			formatCurrencyForExport(sim.input.propertyValue / 100, true),
			`${ltv}%`,
			sim.ratePeriods.length,
			sim.overpaymentConfigs.length,
		];
	});

	return { headers, rows };
}

/**
 * Prepares overview data for Excel with column configs.
 */
function prepareOverviewDataForExcel(simulations: CompareSimulationData[]): {
	data: TableExportData;
	columnConfigs: ColumnConfig[];
} {
	const headers = [
		"Simulation",
		"Mortgage Amount (EUR)",
		"Term (Months)",
		"Property Value (EUR)",
		"LTV (%)",
		"Rate Periods",
		"Overpayments",
	];

	const rows = simulations.map((sim) => {
		const ltv =
			sim.input.propertyValue > 0
				? (sim.input.mortgageAmount / sim.input.propertyValue) * 100
				: 0;

		return [
			sim.name,
			Math.round(sim.input.mortgageAmount) / 100,
			sim.input.mortgageTermMonths,
			Math.round(sim.input.propertyValue) / 100,
			Math.round(ltv * 10) / 10,
			sim.ratePeriods.length,
			sim.overpaymentConfigs.length,
		];
	});

	const currencyFormat = "€#,##0.00";
	const columnConfigs: ColumnConfig[] = [
		{ header: headers[0], width: 25 },
		{ header: headers[1], width: 20, style: { numFmt: currencyFormat } },
		{ header: headers[2], width: 14 },
		{ header: headers[3], width: 20, style: { numFmt: currencyFormat } },
		{ header: headers[4], width: 10, style: { numFmt: "0.0" } },
		{ header: headers[5], width: 14 },
		{ header: headers[6], width: 14 },
	];

	return { data: { headers, rows }, columnConfigs };
}

/**
 * Prepares metrics comparison data for PDF.
 */
function prepareMetricsDataForPDF(
	simulations: CompareSimulationData[],
	metrics: CompareSummaryMetric[],
): TableExportData {
	const headers = ["Metric", ...simulations.map((s) => s.name)];

	const rows = metrics.map((metric) => {
		const values = metric.values.map((v) => v.formatted);
		return [metric.label, ...values];
	});

	return { headers, rows };
}

/**
 * Prepares metrics comparison data for Excel.
 */
function prepareMetricsDataForExcel(
	simulations: CompareSimulationData[],
	metrics: CompareSummaryMetric[],
): { data: TableExportData; columnConfigs: ColumnConfig[] } {
	const headers = ["Metric", ...simulations.map((s) => s.name)];

	const rows = metrics.map((metric) => {
		const values = metric.values.map((v) => v.formatted);
		return [metric.label, ...values];
	});

	const columnConfigs: ColumnConfig[] = [
		{ header: headers[0], width: 25 },
		...simulations.map((s) => ({
			header: s.name,
			width: 18,
		})),
	];

	return { data: { headers, rows }, columnConfigs };
}

/**
 * Prepares combined yearly schedule for PDF.
 * Creates a table with Year + columns for each simulation's balance.
 */
function prepareCombinedScheduleForPDF(
	simulations: CompareSimulationData[],
): TableExportData {
	// Find max years across all simulations
	const maxYears = Math.max(...simulations.map((s) => s.yearlySchedule.length));

	// Find the longest simulation to use for reference year values
	const longestSim = simulations.reduce(
		(longest, sim) =>
			sim.yearlySchedule.length > longest.yearlySchedule.length ? sim : longest,
		simulations[0],
	);

	// Build headers: Year, then Balance for each simulation
	const headers = [
		"Year",
		...simulations.flatMap((s) => [`${s.name} Balance`, `${s.name} Interest`]),
	];

	const rows: (string | number)[][] = [];
	for (let yearIndex = 0; yearIndex < maxYears; yearIndex++) {
		// Use calendar year from longest simulation if available, otherwise relative year
		const yearValue =
			longestSim.yearlySchedule[yearIndex]?.year ?? yearIndex + 1;
		const row: (string | number)[] = [yearValue];

		for (const sim of simulations) {
			const yearData = sim.yearlySchedule[yearIndex];
			if (yearData) {
				row.push(formatCurrencyForExport(yearData.closingBalance / 100, true));
				row.push(formatCurrencyForExport(yearData.totalInterest / 100, true));
			} else {
				row.push("-");
				row.push("-");
			}
		}

		rows.push(row);
	}

	return { headers, rows };
}

/**
 * Prepares combined yearly schedule for Excel.
 */
function prepareCombinedScheduleForExcel(
	simulations: CompareSimulationData[],
): {
	data: TableExportData;
	columnConfigs: ColumnConfig[];
} {
	const maxYears = Math.max(...simulations.map((s) => s.yearlySchedule.length));

	// Find the longest simulation to use for reference year values
	const longestSim = simulations.reduce(
		(longest, sim) =>
			sim.yearlySchedule.length > longest.yearlySchedule.length ? sim : longest,
		simulations[0],
	);

	const headers = [
		"Year",
		...simulations.flatMap((s) => [
			`${s.name} Balance (EUR)`,
			`${s.name} Interest (EUR)`,
			`${s.name} Principal (EUR)`,
		]),
	];

	const rows: (string | number | null)[][] = [];
	for (let yearIndex = 0; yearIndex < maxYears; yearIndex++) {
		// Use calendar year from longest simulation if available, otherwise relative year
		const yearValue =
			longestSim.yearlySchedule[yearIndex]?.year ?? yearIndex + 1;
		const row: (string | number | null)[] = [yearValue];

		for (const sim of simulations) {
			const yearData = sim.yearlySchedule[yearIndex];
			if (yearData) {
				row.push(Math.round(yearData.closingBalance) / 100);
				row.push(Math.round(yearData.totalInterest) / 100);
				row.push(Math.round(yearData.totalPrincipal) / 100);
			} else {
				row.push(null);
				row.push(null);
				row.push(null);
			}
		}

		rows.push(row);
	}

	const currencyFormat = "€#,##0.00";
	const columnConfigs: ColumnConfig[] = [
		{ header: headers[0], width: 8 },
		...simulations.flatMap(() => [
			{ header: "", width: 18, style: { numFmt: currencyFormat } },
			{ header: "", width: 16, style: { numFmt: currencyFormat } },
			{ header: "", width: 16, style: { numFmt: currencyFormat } },
		]),
	];

	return { data: { headers, rows }, columnConfigs };
}

/**
 * Prepares pivot-ready schedule data for Excel.
 * Flat format: Simulation, Year, Opening Balance, Principal, Interest, Overpayments, Closing Balance
 */
function preparePivotScheduleForExcel(simulations: CompareSimulationData[]): {
	data: TableExportData;
	columnConfigs: ColumnConfig[];
} {
	const headers = [
		"Simulation",
		"Year",
		"Opening Balance (EUR)",
		"Principal (EUR)",
		"Interest (EUR)",
		"Overpayments (EUR)",
		"Closing Balance (EUR)",
	];

	const rows: (string | number)[][] = [];
	for (const sim of simulations) {
		for (const yearData of sim.yearlySchedule) {
			rows.push([
				sim.name,
				yearData.year,
				Math.round(yearData.openingBalance) / 100,
				Math.round(yearData.totalPrincipal) / 100,
				Math.round(yearData.totalInterest) / 100,
				Math.round(yearData.totalOverpayments) / 100,
				Math.round(yearData.closingBalance) / 100,
			]);
		}
	}

	const currencyFormat = "€#,##0.00";
	const columnConfigs: ColumnConfig[] = [
		{ header: headers[0], width: 25 },
		{ header: headers[1], width: 8 },
		{ header: headers[2], width: 20, style: { numFmt: currencyFormat } },
		{ header: headers[3], width: 16, style: { numFmt: currencyFormat } },
		{ header: headers[4], width: 16, style: { numFmt: currencyFormat } },
		{ header: headers[5], width: 16, style: { numFmt: currencyFormat } },
		{ header: headers[6], width: 20, style: { numFmt: currencyFormat } },
	];

	return { data: { headers, rows }, columnConfigs };
}

/**
 * Exports comparison to Excel file with multiple sheets.
 */
export async function exportCompareToExcel(
	context: CompareExportContext,
): Promise<void> {
	const { simulations, summaryMetrics } = context;

	// Sheet 1: Overview
	const overview = prepareOverviewDataForExcel(simulations);
	const workbook = await createExcelWorkbook(
		"Overview",
		overview.data,
		overview.columnConfigs,
	);

	// Sheet 2: Metrics comparison
	const metrics = prepareMetricsDataForExcel(simulations, summaryMetrics);
	await addWorksheet(workbook, "Metrics", metrics.data, metrics.columnConfigs);

	// Sheet 3: Combined schedule
	const combinedSchedule = prepareCombinedScheduleForExcel(simulations);
	await addWorksheet(
		workbook,
		"Schedule (Combined)",
		combinedSchedule.data,
		combinedSchedule.columnConfigs,
	);

	// Sheet 4: Pivot-ready schedule
	const pivotSchedule = preparePivotScheduleForExcel(simulations);
	await addWorksheet(
		workbook,
		"Schedule (Pivot-Ready)",
		pivotSchedule.data,
		pivotSchedule.columnConfigs,
	);

	await downloadWorkbook(workbook, "simulation-compare");
}

/**
 * Exports comparison to PDF with summary tables and optional charts.
 */
export async function exportCompareToPDF(
	context: CompareExportContext,
): Promise<void> {
	const { simulations, summaryMetrics, chartImages, shareUrl } = context;

	const doc = await createPDFDocument();

	// Branded header
	let y = await addBrandedHeader(doc, "Simulation Comparison Report");
	y += 2;

	// Simulations overview section
	y = addStyledSectionHeader(doc, "Simulations", y, { divider: true });
	const overviewData = prepareOverviewData(simulations);
	y = await addTable(doc, overviewData, y);

	// Metrics comparison section
	y = addStyledSectionHeader(doc, "Key Metrics Comparison", y, {
		divider: true,
	});
	const metricsData = prepareMetricsDataForPDF(simulations, summaryMetrics);
	// Right-align all value columns (everything except first column)
	const metricsColumnStyles: Record<number, { halign: "right" }> = {};
	for (let i = 1; i <= simulations.length; i++) {
		metricsColumnStyles[i] = { halign: "right" };
	}
	y = await addTable(doc, metricsData, y, {
		columnStyles: metricsColumnStyles,
	});

	// Charts section if available
	if (chartImages && chartImages.length > 0) {
		y = addStyledSectionHeader(doc, "Charts", y, { divider: true });
		for (const chart of chartImages) {
			// Check if we need a new page (leave room for image ~100px + header)
			if (y > 180) {
				doc.addPage();
				y = 20;
			}
			y = addSectionHeader(doc, chart.title, y);
			y = addImage(doc, chart.imageDataUrl, y, { width: 180, height: 90 });
		}
	}

	// Combined schedule section
	y = addStyledSectionHeader(doc, "Yearly Schedule Comparison", y, {
		divider: true,
	});
	const scheduleData = prepareCombinedScheduleForPDF(simulations);
	await addTable(doc, scheduleData, y);

	// Add "View Online" link if share URL provided
	if (shareUrl) {
		addViewOnlineLink(doc, shareUrl);
	}

	addFooter(doc);
	downloadPDF(doc, "simulation-compare");
}
