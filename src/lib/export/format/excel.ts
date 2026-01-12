/**
 * Excel workbook generation using ExcelJS (lazy-loaded).
 */

import {
	downloadFile,
	type ExportPage,
	generateExportFilename,
	type TableExportData,
} from "../types";
import { getExcelJS } from "./loaders";

/**
 * Column width configuration for auto-sizing.
 */
interface ColumnConfig {
	header: string;
	width?: number;
	style?: {
		numFmt?: string;
	};
}

/**
 * Creates an Excel workbook and adds a worksheet with the provided data.
 */
export async function createExcelWorkbook(
	sheetName: string,
	data: TableExportData,
	columnConfigs?: ColumnConfig[],
) {
	const ExcelJS = await getExcelJS();
	const workbook = new ExcelJS.Workbook();

	workbook.creator = "MortgageLab.ie";
	workbook.created = new Date();

	const worksheet = workbook.addWorksheet(sheetName);

	// Set up columns
	worksheet.columns = data.headers.map((header, index) => {
		const config = columnConfigs?.[index];
		return {
			header,
			key: `col${index}`,
			width: config?.width ?? Math.max(header.length + 2, 12),
			style: config?.style,
		};
	});

	// Style header row
	const headerRow = worksheet.getRow(1);
	headerRow.font = { bold: true };
	headerRow.fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FFE8E8E8" },
	};

	// Add data rows
	for (const row of data.rows) {
		const rowData: Record<string, string | number | null | undefined> = {};
		row.forEach((value, index) => {
			rowData[`col${index}`] = value;
		});
		worksheet.addRow(rowData);
	}

	// Auto-filter on header row
	if (data.rows.length > 0) {
		worksheet.autoFilter = {
			from: { row: 1, column: 1 },
			to: { row: 1, column: data.headers.length },
		};
	}

	return workbook;
}

/**
 * Adds a worksheet to an existing workbook.
 */
export async function addWorksheet(
	workbook: Awaited<ReturnType<typeof createExcelWorkbook>>,
	sheetName: string,
	data: TableExportData,
	columnConfigs?: ColumnConfig[],
) {
	const worksheet = workbook.addWorksheet(sheetName);

	// Set up columns
	worksheet.columns = data.headers.map((header, index) => {
		const config = columnConfigs?.[index];
		return {
			header,
			key: `col${index}`,
			width: config?.width ?? Math.max(header.length + 2, 12),
			style: config?.style,
		};
	});

	// Style header row
	const headerRow = worksheet.getRow(1);
	headerRow.font = { bold: true };
	headerRow.fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FFE8E8E8" },
	};

	// Add data rows
	for (const row of data.rows) {
		const rowData: Record<string, string | number | null | undefined> = {};
		row.forEach((value, index) => {
			rowData[`col${index}`] = value;
		});
		worksheet.addRow(rowData);
	}

	// Auto-filter on header row
	if (data.rows.length > 0) {
		worksheet.autoFilter = {
			from: { row: 1, column: 1 },
			to: { row: 1, column: data.headers.length },
		};
	}

	return worksheet;
}

/**
 * Downloads an Excel workbook as an .xlsx file.
 */
export async function downloadWorkbook(
	workbook: Awaited<ReturnType<typeof createExcelWorkbook>>,
	page: ExportPage,
): Promise<void> {
	const buffer = await workbook.xlsx.writeBuffer();
	const filename = generateExportFilename(page, "xlsx");
	const blob = new Blob([buffer], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
	downloadFile(blob, filename);
}

/**
 * Downloads an Excel workbook with a custom filename.
 */
export async function downloadWorkbookWithFilename(
	workbook: Awaited<ReturnType<typeof createExcelWorkbook>>,
	filename: string,
): Promise<void> {
	const buffer = await workbook.xlsx.writeBuffer();
	const blob = new Blob([buffer], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
	downloadFile(blob, filename);
}

/**
 * Simple export: creates workbook with single sheet and downloads.
 */
export async function exportToExcel(
	data: TableExportData,
	page: ExportPage,
	sheetName = "Data",
): Promise<void> {
	const workbook = await createExcelWorkbook(sheetName, data);
	await downloadWorkbook(workbook, page);
}
