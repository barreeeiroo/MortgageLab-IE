/**
 * Contact and issue reporting utilities
 */

import { AUTHOR } from "./site";

// Map lender IDs to issue template dropdown values
const LENDER_TO_TEMPLATE: Record<string, string> = {
	aib: "AIB",
	avant: "Avant Money",
	boi: "Bank of Ireland",
	cu: "Credit Union Mortgages",
	ebs: "EBS",
	haven: "Haven Mortgages",
	ics: "ICS Mortgages",
	moco: "MoCo",
	nua: "Núa Mortgages",
	ptsb: "Permanent TSB",
};

function getLenderTemplateValue(lenderId: string): string {
	return LENDER_TO_TEMPLATE[lenderId] ?? "Other";
}

interface IncorrectRateParams {
	lenderId: string;
	rateName: string;
	rateId?: string;
	sourceUrl?: string;
	/** Where the report was generated from (e.g., "Rate Info dialog", "Rates table") */
	reportSource: string;
	/** Additional context to include before the footer */
	additionalContext?: string;
}

/**
 * Generate a URL for reporting an incorrect rate
 */
export function getIncorrectRateUrl({
	lenderId: _lenderId,
	rateName,
	rateId,
	sourceUrl,
	reportSource,
	additionalContext,
}: IncorrectRateParams): string {
	const params = new URLSearchParams({
		template: "3-incorrect-rate.yml",
		title: `[Rate] Incorrect rate for ${rateName}`,
		"rate-name": rateId ?? rateName,
	});

	if (sourceUrl) {
		params.set("source", sourceUrl);
	}

	// Build additional info with placeholder and italics footer
	const additionalParts = [
		additionalContext ?? "[Replace this with what you think is incorrect]",
		"",
		`_Reported from ${reportSource}_`,
	];
	params.set("additional", additionalParts.join("\n"));

	return `${AUTHOR.github}/issues/new?${params.toString()}`;
}

interface NewRateParams {
	/** Where the report was generated from (e.g., "Rate Updates dialog") */
	reportSource: string;
	lenderId?: string;
	rateDescription?: string;
	sourceUrl?: string;
	/** Additional context to include before the footer */
	additionalContext?: string;
}

/**
 * Generate a URL for requesting a new rate
 */
export function getNewRateUrl({
	reportSource,
	lenderId,
	rateDescription,
	sourceUrl,
	additionalContext,
}: NewRateParams): string {
	const params = new URLSearchParams({
		template: "4-new-rate.yml",
	});

	if (lenderId) {
		params.set("lender", getLenderTemplateValue(lenderId));
	}

	if (rateDescription) {
		params.set("rate-description", rateDescription);
	}

	if (sourceUrl) {
		params.set("source", sourceUrl);
	}

	// Build additional info with placeholder and italics footer
	const additionalParts = [
		additionalContext ?? "[Replace this with details about the missing rate]",
		"",
		`_Reported from ${reportSource}_`,
	];
	params.set("additional", additionalParts.join("\n"));

	return `${AUTHOR.github}/issues/new?${params.toString()}`;
}

interface BugReportParams {
	currentBehaviour?: string;
	expectedBehaviour?: string;
	steps?: string;
	browser?: string;
	context?: string;
}

/**
 * Generate a URL for reporting a bug
 */
export function getBugReportUrl({
	currentBehaviour,
	expectedBehaviour,
	steps,
	browser,
	context,
}: BugReportParams = {}): string {
	const params = new URLSearchParams({
		template: "1-bug-report.yml",
	});

	if (currentBehaviour) {
		params.set("current-behaviour", currentBehaviour);
	}

	if (expectedBehaviour) {
		params.set("expected-behaviour", expectedBehaviour);
	}

	if (steps) {
		params.set("steps", steps);
	}

	if (browser) {
		params.set("browser", browser);
	}

	if (context) {
		params.set("context", context);
	}

	return `${AUTHOR.github}/issues/new?${params.toString()}`;
}

interface MissingVariableRateParams {
	lenderId: string;
	lenderName: string;
	fixedRateId: string;
	fixedRateName: string;
	fixedRate: number;
	fixedTerm?: number;
	ltv: number;
	minLtv: number;
	maxLtv: number;
	ratesUrl?: string;
	// User search context
	mode?: "first-mortgage" | "remortgage";
	buyerType?: string;
	berRating?: string;
}

/**
 * Generate a URL for reporting a missing variable rate (for follow-up calculation)
 */
// Map buyer type codes to human-readable labels
const BUYER_TYPE_LABELS: Record<string, string> = {
	ftb: "First Time Buyer",
	mover: "Home Mover / Owner Occupied",
	btl: "Buy To Let / 2nd Home",
};

function getBuyerTypeLabel(buyerType: string): string {
	return BUYER_TYPE_LABELS[buyerType] ?? buyerType;
}

export function getMissingVariableRateUrl({
	lenderId,
	lenderName,
	fixedRateId,
	fixedRateName,
	fixedRate,
	fixedTerm,
	ltv,
	minLtv,
	maxLtv,
	ratesUrl,
	mode,
	buyerType,
	berRating,
}: MissingVariableRateParams): string {
	const ltvRange =
		minLtv > 0 ? `${minLtv}%-${maxLtv}% LTV` : `up to ${maxLtv}% LTV`;
	const termInfo = fixedTerm ? `${fixedTerm}-year fixed` : "fixed";
	const modeLabel =
		mode === "remortgage" ? "Remortgage / Switcher" : "First Mortgage";

	const additionalContext = [
		`**Issue:** Unable to find a matching variable rate for follow-up payment calculation.`,
		``,
		`**Fixed Rate Details:**`,
		`- Product: ${fixedRateName}`,
		`- Rate: ${fixedRate.toFixed(2)}%`,
		`- Term: ${termInfo}`,
		`- LTV Range: ${ltvRange}`,
		``,
		`**User's Search Context:**`,
		`- Mode: ${modeLabel}`,
		buyerType ? `- Buyer Type: ${getBuyerTypeLabel(buyerType)}` : null,
		berRating ? `- BER Rating: ${berRating.toUpperCase()}` : null,
		`- Current LTV: ${ltv.toFixed(1)}%`,
		``,
		`**Expected:** A variable rate from ${lenderName} that covers ${ltv.toFixed(1)}% LTV for customers rolling off fixed terms.`,
	]
		.filter(Boolean)
		.join("\n");

	// Note: GitHub doesn't support prefilling dropdown fields via URL params,
	// so lender must be selected manually. The lender info is included in additional context.
	return getIncorrectRateUrl({
		lenderId,
		rateName: `${lenderName} - ${fixedRateName}`,
		rateId: fixedRateId,
		sourceUrl: ratesUrl,
		reportSource: "Rates table follow-up column",
		additionalContext,
	});
}
