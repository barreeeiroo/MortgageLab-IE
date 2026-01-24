/**
 * Affordability calculator export functionality.
 * Exports FTB, Home Mover, and BTL calculator results as PDF.
 */

import type { MortgageResult } from "@/components/borrowing/MortgageResultCard";
import {
	calculatePropertyVAT,
	calculateStampDuty,
	ESTIMATED_LEGAL_FEES,
	type PropertyType,
} from "@/lib/utils/fees";
import {
	addBrandedHeader,
	addFooter,
	addKeyValue,
	addMetricRow,
	addStyledSectionHeader,
	addViewOnlineLink,
	createPDFDocument,
	downloadPDF,
} from "./format/pdf";
import { formatCurrencyForExport, formatPercentForExport } from "./formatters";
import type { ExportPage } from "./types";

// --- Common Types ---

interface AffordabilityExportContext {
	calculatorType: "ftb" | "mover" | "btl";
	result: MortgageResult;
	totalIncome: number;
	// Property VAT
	propertyType?: PropertyType;
	priceIncludesVAT?: boolean;
	// FTB/Mover specific
	hasSavingsShortfall?: boolean;
	maxMortgageByIncome?: number;
	requiredDeposit?: number;
	// Home Mover specific
	currentPropertyValue?: number;
	mortgageBalance?: number;
	equity?: number;
	// BTL specific
	rentalIncome?: number;
	rentalYield?: number;
	stressTestPassed?: boolean;
	/** Share URL to include in PDF export as "View Online" link */
	shareUrl?: string;
}

const CALCULATOR_TITLES: Record<string, string> = {
	ftb: "First Time Buyer",
	mover: "Home Mover",
	btl: "Buy to Let",
};

const EXPORT_PAGES: Record<string, ExportPage> = {
	ftb: "affordability-ftb",
	mover: "affordability-mover",
	btl: "affordability-btl",
};

/**
 * Exports affordability calculation result to PDF.
 */
export async function exportAffordabilityToPDF(
	context: AffordabilityExportContext,
): Promise<void> {
	const {
		calculatorType,
		result,
		totalIncome,
		propertyType,
		priceIncludesVAT,
	} = context;
	const doc = await createPDFDocument();

	const calculatorTitle = CALCULATOR_TITLES[calculatorType];
	const exportPage = EXPORT_PAGES[calculatorType];

	// Branded header with logo
	let y = await addBrandedHeader(doc, `${calculatorTitle} Calculator`);

	// Key metrics row
	y = addMetricRow(
		doc,
		[
			{
				label: "Max Property Value",
				value: formatCurrencyForExport(result.propertyValue),
			},
			{
				label: "Mortgage Amount",
				value: formatCurrencyForExport(result.mortgageAmount),
			},
			{
				label: "LTV Ratio",
				value: formatPercentForExport(result.ltv / 100, 0),
			},
			{
				label: "LTI Ratio",
				value: `${result.lti.toFixed(1)}×`,
			},
		],
		y,
	);

	// Mortgage Summary Section
	y = addStyledSectionHeader(doc, "Mortgage Details", y, { divider: true });

	// Calculate property VAT if applicable
	const vatResult = calculatePropertyVAT(
		result.propertyValue,
		propertyType ?? "existing",
		priceIncludesVAT ?? true,
	);
	const vatAddedToTotal = vatResult.vatRate > 0 && !(priceIncludesVAT ?? true);

	y = addKeyValue(
		doc,
		"Max Property Value",
		formatCurrencyForExport(result.propertyValue),
		y,
	);
	if (vatAddedToTotal) {
		y = addKeyValue(
			doc,
			`+ ${vatResult.vatRate}% VAT`,
			formatCurrencyForExport(vatResult.grossPrice),
			y,
		);
	}
	y = addKeyValue(
		doc,
		"Mortgage Amount",
		formatCurrencyForExport(result.mortgageAmount),
		y,
	);
	y = addKeyValue(doc, "Mortgage Term", `${result.mortgageTerm} years`, y);
	y = addKeyValue(doc, "BER Rating", result.berRating, y);
	y += 4;

	// Lending Ratios Section
	y = addStyledSectionHeader(doc, "Lending Ratios", y, { divider: true });
	y = addKeyValue(
		doc,
		"Loan-to-Value (LTV)",
		formatPercentForExport(result.ltv / 100, 1),
		y,
	);
	y = addKeyValue(doc, "Loan-to-Income (LTI)", `${result.lti.toFixed(1)}×`, y);
	y = addKeyValue(
		doc,
		"Total Annual Income",
		formatCurrencyForExport(totalIncome),
		y,
	);
	y += 4;

	// Cash Required Section
	y = addStyledSectionHeader(doc, "Cash Required", y, { divider: true });

	const effectivePropertyValue = vatAddedToTotal
		? vatResult.grossPrice
		: result.propertyValue;
	const deposit = effectivePropertyValue - result.mortgageAmount;
	const stampDuty = calculateStampDuty(vatResult.netPrice);
	const legalFees = ESTIMATED_LEGAL_FEES;
	const totalFees =
		stampDuty + legalFees + (vatAddedToTotal ? vatResult.vatAmount : 0);
	const totalCashRequired = deposit + totalFees;

	y = addKeyValue(
		doc,
		`Deposit (${(100 - result.ltv).toFixed(0)}%)`,
		formatCurrencyForExport(deposit),
		y,
	);
	y = addKeyValue(doc, "Stamp Duty", formatCurrencyForExport(stampDuty), y);
	y = addKeyValue(
		doc,
		"Legal Fees (est.)",
		formatCurrencyForExport(legalFees),
		y,
	);
	if (vatAddedToTotal) {
		y = addKeyValue(
			doc,
			`Property VAT (${vatResult.vatRate}%)`,
			formatCurrencyForExport(vatResult.vatAmount),
			y,
		);
	}
	y = addKeyValue(
		doc,
		"Total Cash Required",
		formatCurrencyForExport(totalCashRequired),
		y,
	);
	y += 4;

	// Savings Shortfall Warning (FTB/Mover)
	if (context.hasSavingsShortfall && context.maxMortgageByIncome) {
		y = addStyledSectionHeader(doc, "Note: Savings Constraint", y, {
			divider: true,
		});
		y = addKeyValue(
			doc,
			"Max Mortgage (Income)",
			formatCurrencyForExport(context.maxMortgageByIncome),
			y,
		);
		if (context.requiredDeposit) {
			y = addKeyValue(
				doc,
				"Required Deposit for Max",
				formatCurrencyForExport(context.requiredDeposit),
				y,
			);
		}
		y += 4;
	}

	// Home Mover Specific: Equity Section
	if (calculatorType === "mover" && context.currentPropertyValue) {
		y = addStyledSectionHeader(doc, "Current Property", y, { divider: true });
		y = addKeyValue(
			doc,
			"Current Property",
			formatCurrencyForExport(context.currentPropertyValue),
			y,
		);
		if (context.mortgageBalance !== undefined) {
			y = addKeyValue(
				doc,
				"Outstanding Mortgage",
				formatCurrencyForExport(context.mortgageBalance),
				y,
			);
		}
		if (context.equity !== undefined) {
			y = addKeyValue(
				doc,
				"Available Equity",
				formatCurrencyForExport(context.equity),
				y,
			);
		}
		y += 4;
	}

	// BTL Specific: Rental Analysis Section
	if (calculatorType === "btl" && context.rentalIncome) {
		y = addStyledSectionHeader(doc, "Rental Analysis", y, { divider: true });
		y = addKeyValue(
			doc,
			"Expected Monthly Rent",
			formatCurrencyForExport(context.rentalIncome),
			y,
		);
		if (context.rentalYield !== undefined) {
			y = addKeyValue(
				doc,
				"Rental Yield",
				formatPercentForExport(context.rentalYield / 100, 1),
				y,
			);
		}
		if (context.stressTestPassed !== undefined) {
			y = addKeyValue(
				doc,
				"Stress Test",
				context.stressTestPassed ? "Passed" : "Failed",
				y,
			);
		}
	}

	// Add "View Online" link if share URL provided
	if (context.shareUrl) {
		addViewOnlineLink(doc, context.shareUrl, y);
	}

	addFooter(doc);
	downloadPDF(doc, exportPage);
}
