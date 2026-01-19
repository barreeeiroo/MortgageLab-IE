/**
 * Breakeven calculator export functionality.
 * Exports Rent vs Buy and Remortgage analysis results as PDF.
 */

import type {
	CashbackBreakevenResult,
	RemortgageResult,
	RentVsBuyResult,
} from "@/lib/mortgage/breakeven";
import { formatBreakevenPeriod } from "@/lib/mortgage/breakeven";
import {
	addBrandedHeader,
	addFooter,
	addKeyValue,
	addMetricRow,
	addStyledSectionHeader,
	addTable,
	addViewOnlineLink,
	createPDFDocument,
	downloadPDF,
} from "./format/pdf";
import {
	formatCurrencyForExport,
	formatPercentForExport,
	formatTermForExport,
	sanitizeForPDF,
} from "./formatters";
import type { TableExportData } from "./types";

// --- Rent vs Buy Export ---

interface RentVsBuyExportContext {
	result: RentVsBuyResult;
	monthlyRent: number;
	saleCostRate: number;
	// Input parameters for context
	propertyValue?: number;
	deposit?: number;
	mortgageTerm?: number;
	interestRate?: number;
	/** Share URL to include in PDF export as "View Online" link */
	shareUrl?: string;
}

/**
 * Exports Rent vs Buy analysis to PDF.
 */
export async function exportRentVsBuyToPDF(
	context: RentVsBuyExportContext,
): Promise<void> {
	const { result, monthlyRent, saleCostRate } = context;
	const doc = await createPDFDocument();

	// Branded header with logo
	let y = await addBrandedHeader(doc, "Rent vs Buy Analysis");

	// Breakeven metrics row
	y = addMetricRow(
		doc,
		[
			{
				label: "Net Worth Breakeven",
				value: formatBreakevenPeriod(result.breakevenMonth),
				variant: result.breakevenMonth ? "success" : "default",
			},
			{
				label: "Break-even on Sale",
				value: formatBreakevenPeriod(result.breakEvenOnSaleMonth),
				variant: result.breakEvenOnSaleMonth ? "success" : "default",
			},
			{
				label: "Equity Recovery",
				value: formatBreakevenPeriod(result.equityRecoveryMonth),
				variant: result.equityRecoveryMonth ? "success" : "default",
			},
		],
		y,
	);

	// Monthly Comparison Section
	y = addStyledSectionHeader(doc, "Monthly Comparison", y, { divider: true });
	y = addKeyValue(
		doc,
		"Monthly Rent",
		formatCurrencyForExport(monthlyRent, true),
		y,
	);
	y = addKeyValue(
		doc,
		"Monthly Mortgage Payment",
		formatCurrencyForExport(result.monthlyMortgagePayment, true),
		y,
	);
	y += 4;

	// Upfront Costs Section
	y = addStyledSectionHeader(doc, "Upfront Costs to Buy", y, { divider: true });
	y = addKeyValue(
		doc,
		"Deposit",
		formatCurrencyForExport(result.deposit, true),
		y,
	);
	y = addKeyValue(
		doc,
		"Mortgage Amount",
		formatCurrencyForExport(result.mortgageAmount, true),
		y,
	);
	y = addKeyValue(
		doc,
		"Stamp Duty",
		formatCurrencyForExport(result.stampDuty, true),
		y,
	);
	y = addKeyValue(
		doc,
		"Legal Fees",
		formatCurrencyForExport(result.legalFees, true),
		y,
	);
	y = addKeyValue(
		doc,
		"Total Cash Required",
		formatCurrencyForExport(result.upfrontCosts, true),
		y,
	);
	y += 4;

	// Yearly Breakdown Table
	if (result.yearlyBreakdown.length > 0) {
		y = addStyledSectionHeader(doc, "Yearly Comparison", y, { divider: true });
		const tableData = prepareRentVsBuyTableData(result.yearlyBreakdown);
		y = await addTable(doc, tableData, y);
	}

	// Assumptions Section
	y = addStyledSectionHeader(doc, "Assumptions", y, { divider: true });
	y = addKeyValue(
		doc,
		"Sale Cost Rate",
		formatPercentForExport(saleCostRate / 100, 1),
		y,
	);
	if (context.propertyValue) {
		y = addKeyValue(
			doc,
			"Property Value",
			formatCurrencyForExport(context.propertyValue, true),
			y,
		);
	}
	if (context.mortgageTerm) {
		y = addKeyValue(
			doc,
			"Mortgage Term",
			formatTermForExport(context.mortgageTerm),
			y,
		);
	}
	if (context.interestRate) {
		y = addKeyValue(
			doc,
			"Interest Rate",
			formatPercentForExport(context.interestRate / 100, 2),
			y,
		);
	}

	// Add "View Online" link if share URL provided
	if (context.shareUrl) {
		addViewOnlineLink(doc, context.shareUrl);
	}

	addFooter(doc);
	downloadPDF(doc, "breakeven-rentvsbuy");
}

function prepareRentVsBuyTableData(
	yearlyBreakdown: RentVsBuyResult["yearlyBreakdown"],
): TableExportData {
	const headers = ["Year", "Rent Paid", "Net Own Cost", "Equity", "Difference"];

	const rows = yearlyBreakdown.map((year) => {
		const difference = year.cumulativeRent - year.netOwnershipCost;
		return [
			year.year,
			formatCurrencyForExport(year.cumulativeRent, true),
			formatCurrencyForExport(year.netOwnershipCost, true),
			formatCurrencyForExport(year.equity, true),
			`${difference >= 0 ? "+" : ""}${formatCurrencyForExport(difference, true)}`,
		];
	});

	return { headers, rows };
}

// --- Remortgage Export ---

interface RemortgageExportContext {
	result: RemortgageResult;
	remainingTermMonths: number;
	fixedPeriodMonths: number | null;
	// Input parameters for context
	outstandingBalance?: number;
	currentRate?: number;
	newRate?: number;
	/** Share URL to include in PDF export as "View Online" link */
	shareUrl?: string;
}

/**
 * Exports Remortgage analysis to PDF.
 */
export async function exportRemortgageToPDF(
	context: RemortgageExportContext,
): Promise<void> {
	const { result, remainingTermMonths, fixedPeriodMonths } = context;
	const doc = await createPDFDocument();

	const hasBreakeven =
		Number.isFinite(result.breakevenMonths) && result.breakevenMonths > 0;
	const breakevenText = formatBreakevenPeriod(
		hasBreakeven ? result.breakevenMonths : null,
	);

	// Branded header with logo
	let y = await addBrandedHeader(doc, "Remortgage Analysis");

	// Key metrics row
	const netBenefit = result.interestSavingsDetails.netBenefit;
	y = addMetricRow(
		doc,
		[
			{
				label: "Cost Recovery",
				value: breakevenText,
				variant: hasBreakeven ? "success" : "default",
			},
			{
				label: "Interest Saved",
				value: formatCurrencyForExport(
					result.interestSavingsDetails.interestSaved,
					true,
				),
				variant: "success",
			},
			{
				label: "Net Benefit",
				value: formatCurrencyForExport(netBenefit, true),
				variant:
					netBenefit > 0 ? "success" : netBenefit < 0 ? "danger" : "default",
			},
		],
		y,
	);

	// Monthly Comparison Section
	y = addStyledSectionHeader(doc, "Monthly Comparison", y, { divider: true });
	y = addKeyValue(
		doc,
		"Current Payment",
		formatCurrencyForExport(result.currentMonthlyPayment, true),
		y,
	);
	y = addKeyValue(
		doc,
		"New Payment",
		formatCurrencyForExport(result.newMonthlyPayment, true),
		y,
	);
	y = addKeyValue(
		doc,
		"Monthly Savings",
		formatCurrencyForExport(result.monthlySavings, true),
		y,
	);
	y += 4;

	// Switching Costs Section
	y = addStyledSectionHeader(doc, "Switching Costs", y, { divider: true });
	y = addKeyValue(
		doc,
		"Legal Fees",
		formatCurrencyForExport(result.legalFees, true),
		y,
	);
	if (result.erc > 0) {
		y = addKeyValue(
			doc,
			"Early Repayment Charge",
			formatCurrencyForExport(result.erc, true),
			y,
		);
	}
	if (result.cashback > 0) {
		y = addKeyValue(
			doc,
			"Cashback",
			`-${formatCurrencyForExport(result.cashback, true)}`,
			y,
		);
	}
	y = addKeyValue(
		doc,
		"Net Switching Cost",
		formatCurrencyForExport(result.switchingCosts, true),
		y,
	);
	y += 4;

	// Savings Summary Section
	y = addStyledSectionHeader(doc, "Savings Summary", y, { divider: true });
	y = addKeyValue(
		doc,
		"Year 1 Savings",
		formatCurrencyForExport(result.yearOneSavings, true),
		y,
	);
	y = addKeyValue(
		doc,
		`Total Savings (${formatTermForExport(remainingTermMonths)})`,
		formatCurrencyForExport(result.totalSavingsOverTerm, true),
		y,
	);
	y += 4;

	// Yearly Breakdown Table
	if (result.yearlyBreakdown.length > 0) {
		y = addStyledSectionHeader(doc, "Yearly Breakdown", y, { divider: true });
		const tableData = prepareRemortgageTableData(result.yearlyBreakdown);
		y = await addTable(doc, tableData, y);
	}

	// Context Section
	y = addStyledSectionHeader(doc, "Mortgage Details", y, { divider: true });
	y = addKeyValue(
		doc,
		"Remaining Term",
		formatTermForExport(remainingTermMonths),
		y,
	);
	if (fixedPeriodMonths !== null) {
		y = addKeyValue(
			doc,
			"Fixed Period",
			formatTermForExport(fixedPeriodMonths),
			y,
		);
	} else {
		y = addKeyValue(doc, "Rate Type", "Variable", y);
	}
	if (context.outstandingBalance) {
		y = addKeyValue(
			doc,
			"Outstanding Balance",
			formatCurrencyForExport(context.outstandingBalance, true),
			y,
		);
	}
	if (context.currentRate) {
		y = addKeyValue(
			doc,
			"Current Rate",
			formatPercentForExport(context.currentRate / 100, 2),
			y,
		);
	}
	if (context.newRate) {
		y = addKeyValue(
			doc,
			"New Rate",
			formatPercentForExport(context.newRate / 100, 2),
			y,
		);
	}

	// Add "View Online" link if share URL provided
	if (context.shareUrl) {
		addViewOnlineLink(doc, context.shareUrl);
	}

	addFooter(doc);
	downloadPDF(doc, "breakeven-remortgage");
}

function prepareRemortgageTableData(
	yearlyBreakdown: RemortgageResult["yearlyBreakdown"],
): TableExportData {
	const headers = [
		"Year",
		"Net Savings",
		"Interest Saved",
		"Balance (Current)",
		"Balance (New)",
	];

	const rows = yearlyBreakdown.map((year) => [
		year.year,
		`${year.netSavings >= 0 ? "+" : ""}${formatCurrencyForExport(year.netSavings, true)}`,
		formatCurrencyForExport(year.interestSaved, true),
		formatCurrencyForExport(year.remainingBalanceCurrent, true),
		formatCurrencyForExport(year.remainingBalanceNew, true),
	]);

	return { headers, rows };
}

// --- Cashback Comparison Export ---

interface CashbackExportContext {
	result: CashbackBreakevenResult;
	mortgageAmount: number;
	mortgageTermMonths: number;
	/** Share URL to include in PDF export as "View Online" link */
	shareUrl?: string;
}

/**
 * Exports Cashback comparison analysis to PDF.
 */
export async function exportCashbackToPDF(
	context: CashbackExportContext,
): Promise<void> {
	const { result, mortgageAmount, mortgageTermMonths } = context;
	const doc = await createPDFDocument();

	const cheapestOption = result.options[result.cheapestNetCostIndex];
	const comparisonYears = Math.floor(result.comparisonPeriodYears);

	// Branded header with logo
	let y = await addBrandedHeader(doc, "Cashback Comparison");

	// Winner summary row
	y = addMetricRow(
		doc,
		[
			{
				label: "Best Option",
				value: sanitizeForPDF(cheapestOption.label),
				variant: "success",
			},
			{
				label: "Savings vs Worst",
				value: formatCurrencyForExport(result.savingsVsWorst, true),
				variant: "success",
			},
			{
				label: `Net Cost (${comparisonYears}y)`,
				value: formatCurrencyForExport(cheapestOption.netCost, true),
				variant: "default",
			},
		],
		y,
	);

	// Mortgage Details Section
	y = addStyledSectionHeader(doc, "Mortgage Details", y, { divider: true });
	y = addKeyValue(
		doc,
		"Mortgage Amount",
		formatCurrencyForExport(mortgageAmount, true),
		y,
	);
	y = addKeyValue(doc, "Term", formatTermForExport(mortgageTermMonths), y);
	y += 4;

	// Comparison period info
	y = addKeyValue(
		doc,
		"Comparison Period",
		result.allVariable
			? `Full term (${comparisonYears} years)`
			: `${comparisonYears} years (max fixed period)`,
		y,
	);
	y += 4;

	// Options Comparison Table
	y = addStyledSectionHeader(doc, "Option Details", y, { divider: true });
	const optionsTableData = prepareCashbackOptionsTableData(result.options);
	y = await addTable(doc, optionsTableData, y);
	y += 4;

	// Time Horizon Comparison Table
	if (result.yearlyBreakdown.length > 0) {
		y = addStyledSectionHeader(doc, "Net Cost by Year", y, {
			divider: true,
		});
		const horizonTableData = prepareCashbackHorizonTableData(result);
		y = await addTable(doc, horizonTableData, y);
	}

	// Add "View Online" link if share URL provided
	if (context.shareUrl) {
		addViewOnlineLink(doc, context.shareUrl);
	}

	addFooter(doc);
	downloadPDF(doc, "breakeven-cashback");
}

function prepareCashbackOptionsTableData(
	options: CashbackBreakevenResult["options"],
): TableExportData {
	const headers = [
		"Option",
		"Rate",
		"Monthly",
		"Interest",
		"Principal",
		"Cashback",
		"Net Cost",
	];

	const rows = options.map((opt) => [
		sanitizeForPDF(opt.label),
		formatPercentForExport(opt.rate / 100, 2),
		formatCurrencyForExport(opt.monthlyPayment, true),
		formatCurrencyForExport(opt.interestPaid, true),
		formatCurrencyForExport(opt.principalPaid, true),
		formatCurrencyForExport(opt.cashbackAmount, true),
		formatCurrencyForExport(opt.netCost, true),
	]);

	return { headers, rows };
}

function prepareCashbackHorizonTableData(
	result: CashbackBreakevenResult,
): TableExportData {
	const headers = ["Option"];
	for (const year of result.yearlyBreakdown) {
		headers.push(`Year ${year.year}`);
	}

	const rows = result.options.map((opt, index) => {
		const row: (string | number)[] = [sanitizeForPDF(opt.label)];
		for (const yearData of result.yearlyBreakdown) {
			row.push(formatCurrencyForExport(yearData.netCosts[index], true));
		}
		return row;
	});

	return { headers, rows };
}
