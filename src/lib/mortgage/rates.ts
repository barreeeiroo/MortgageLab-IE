/**
 * Rate-related utilities for mortgage rate matching and generation
 */

import type { BerRating } from "@/lib/constants/ber";
import { BTL_BUYER_TYPES } from "@/lib/constants/buyer";
import type { Lender } from "@/lib/schemas/lender";
import type { MortgageRate } from "@/lib/schemas/rate";
import type { RatePeriod } from "@/lib/schemas/simulate";
import {
	generateRateLabel,
	generateVariableBufferLabel,
} from "@/lib/utils/labels";
import { calculateRemainingBalance } from "./calculations";

/**
 * Check if a variable rate is a valid follow-on candidate for a fixed rate.
 * This is the shared matching logic used by both runtime lookups and validation.
 *
 * @param fixedRate - The fixed rate to find a follow-on for
 * @param variableRate - The candidate variable rate to check
 * @param exactLtv - Optional exact LTV to match against (e.g., follow-on LTV after fixed term).
 *                   When provided, checks if exactLtv falls within variable rate's LTV range.
 *                   When omitted, checks if fixed and variable LTV ranges overlap (for validation).
 * @returns true if the variable rate is a valid follow-on candidate
 */
export function isValidFollowOnRate(
	fixedRate: MortgageRate,
	variableRate: MortgageRate,
	exactLtv?: number,
): boolean {
	// Must be a variable rate from the same lender
	if (
		variableRate.type !== "variable" ||
		variableRate.lenderId !== fixedRate.lenderId
	) {
		return false;
	}

	// BTL status must match - BTL rates only match BTL, residential only matches residential
	// This prevents matching BTL variable rates with residential fixed rates
	const fixedIsBtl = fixedRate.buyerTypes.some((bt) =>
		BTL_BUYER_TYPES.includes(bt),
	);
	const variableIsBtl = variableRate.buyerTypes.some((bt) =>
		BTL_BUYER_TYPES.includes(bt),
	);
	if (fixedIsBtl !== variableIsBtl) {
		return false;
	}

	// LTV matching: exact LTV when provided, otherwise overlap check
	if (exactLtv !== undefined) {
		// Exact LTV matching - used at runtime when we know the actual follow-on LTV
		// This allows matching variable rates outside the original fixed rate's LTV band
		// because the user's LTV will have changed after years of payments
		if (exactLtv < variableRate.minLtv || exactLtv > variableRate.maxLtv) {
			return false;
		}
	} else {
		// Overlap check - used by validator when no exact LTV is known
		if (
			fixedRate.maxLtv <= variableRate.minLtv ||
			fixedRate.minLtv >= variableRate.maxLtv
		) {
			return false;
		}
	}

	return true;
}

/**
 * Find the variable rate that would be used after a fixed rate period ends.
 * This is the "follow-on" rate that applies when a fixed term expires.
 *
 * @param fixedRate - The fixed rate to find follow-on for
 * @param allRates - All available rates to search
 * @param ltv - Optional current LTV to filter by (for exact LTV matching)
 * @param ber - Optional BER rating to filter by
 * @returns The matching variable rate, or undefined if none found
 */
export function findVariableRate(
	fixedRate: MortgageRate,
	allRates: MortgageRate[],
	ltv?: number,
	ber?: BerRating,
): MortgageRate | undefined {
	const matchingVariables = allRates.filter((r) => {
		// Use shared validation logic (with exact LTV when provided)
		if (!isValidFollowOnRate(fixedRate, r, ltv)) {
			return false;
		}

		// Filter by BER eligibility if provided
		if (ber !== undefined && r.berEligible !== undefined) {
			if (!r.berEligible.includes(ber)) {
				return false;
			}
		}

		return true;
	});

	if (matchingVariables.length === 0) return undefined;

	// Prefer follow-on rates (newBusiness: false) for existing customers
	const followOnRate = matchingVariables.find((r) => r.newBusiness === false);
	if (followOnRate) return followOnRate;

	// Fall back to any matching variable rate
	return matchingVariables[0];
}

/**
 * Check if a rate can be repeated (used for "Repeat until end" feature).
 * Only fixed rates that are not new-business-only can be repeated.
 *
 * @param rate - The rate to check
 * @returns true if the rate can be repeated
 */
export function canRateBeRepeated(
	rate: MortgageRate | undefined | null,
): boolean {
	if (!rate) return false;
	if (rate.type !== "fixed") return false;
	if (rate.newBusiness === true) return false;
	return true;
}

/**
 * Check if a rate is still eligible based on current balance and LTV.
 * Used during repeat generation to stop when eligibility criteria are no longer met.
 *
 * @param rate - The rate to check eligibility for
 * @param currentBalance - Current outstanding balance in cents
 * @param propertyValue - Property value in cents
 * @returns true if the rate is still eligible
 */
export function isRateEligibleForBalance(
	rate: MortgageRate,
	currentBalance: number,
	propertyValue: number,
): boolean {
	// Check LTV eligibility
	const currentLtv = (currentBalance / propertyValue) * 100;
	if (currentLtv < rate.minLtv || currentLtv > rate.maxLtv) {
		return false;
	}

	// Check minimum loan amount (HVM products)
	// Note: minLoan in schema is in euros, currentBalance is in cents
	if (rate.minLoan !== undefined && currentBalance < rate.minLoan * 100) {
		return false;
	}

	return true;
}

// ============================================================================
// Repeating Rate Period Generation
// ============================================================================

/**
 * Configuration for generating repeating rate periods
 */
export interface GenerateRepeatingPeriodsConfig {
	/** The fixed rate to repeat */
	fixedRate: MortgageRate;
	/** Lender ID for the fixed rate */
	fixedLenderId: string;
	/** Rate ID for the fixed rate */
	fixedRateId: string;
	/** Whether the fixed rate is a custom rate */
	fixedIsCustom: boolean;
	/** All available rates for variable rate lookup */
	allRates: MortgageRate[];
	/** All lenders for label generation */
	lenders: Lender[];
	/** Mortgage amount in cents */
	mortgageAmount: number;
	/** Property value in cents */
	propertyValue: number;
	/** Total mortgage term in months */
	mortgageTermMonths: number;
	/** Month where this period starts (1-indexed) */
	periodStartMonth: number;
	/** BER rating for rate filtering */
	ber: BerRating;
	/** Whether to include 1-month variable buffers between fixed periods */
	includeBuffers: boolean;
}

/** Internal state tracked during period generation */
interface GenerationState {
	currentBalance: number;
	monthsElapsed: number;
	monthsRemaining: number;
	cycleNumber: number;
}

/** Look up lender name, falling back to lender ID */
function getLenderName(lenders: Lender[], lenderId: string): string {
	return lenders.find((l) => l.id === lenderId)?.name ?? lenderId;
}

/** Create a fixed rate period */
function createFixedPeriod(
	lenderId: string,
	rateId: string,
	isCustom: boolean,
	durationMonths: number,
	lenderName: string,
	rate: MortgageRate,
	cycleNumber: number,
): RatePeriod {
	return {
		id: crypto.randomUUID(),
		lenderId,
		rateId,
		isCustom,
		durationMonths,
		label: generateRateLabel(lenderName, rate, { cycle: cycleNumber }),
	};
}

/** Create a variable rate period (buffer or final) */
function createVariablePeriod(
	rate: MortgageRate,
	lenderName: string,
	durationMonths: number,
	cycleNumber?: number,
): RatePeriod {
	const isUntilEnd = durationMonths === 0;
	return {
		id: crypto.randomUUID(),
		lenderId: rate.lenderId,
		rateId: rate.id,
		isCustom: false,
		durationMonths,
		label: isUntilEnd
			? generateVariableBufferLabel(lenderName, rate)
			: generateRateLabel(lenderName, rate, {
					cycle: cycleNumber ?? 1,
					isBuffer: true,
				}),
	};
}

/** Try to add a variable "until end" period when no room for full fixed term */
function tryAddFinalVariablePeriod(
	config: GenerateRepeatingPeriodsConfig,
	state: GenerationState,
): RatePeriod | null {
	const { fixedRate, allRates, lenders, propertyValue, ber } = config;

	const currentLtv = (state.currentBalance / propertyValue) * 100;
	const variableRate = findVariableRate(fixedRate, allRates, currentLtv, ber);

	if (!variableRate) return null;

	const lenderName = getLenderName(lenders, variableRate.lenderId);
	return createVariablePeriod(variableRate, lenderName, 0); // 0 = until end
}

/** Add a fixed period and update state */
function addFixedPeriodAndUpdateState(
	config: GenerateRepeatingPeriodsConfig,
	state: GenerationState,
	fixedDurationMonths: number,
	fixedLenderName: string,
): RatePeriod {
	const {
		fixedRate,
		fixedLenderId,
		fixedRateId,
		fixedIsCustom,
		mortgageTermMonths,
	} = config;

	const period = createFixedPeriod(
		fixedLenderId,
		fixedRateId,
		fixedIsCustom,
		fixedDurationMonths,
		fixedLenderName,
		fixedRate,
		state.cycleNumber,
	);

	// Calculate balance after this fixed period
	const remainingTerm = mortgageTermMonths - state.monthsElapsed;
	state.currentBalance = calculateRemainingBalance(
		state.currentBalance,
		fixedRate.rate,
		remainingTerm,
		fixedDurationMonths,
	);
	state.monthsElapsed += fixedDurationMonths;
	state.monthsRemaining -= fixedDurationMonths;

	return period;
}

/**
 * Try to add a variable buffer period. Returns the period and whether generation should stop.
 */
function tryAddVariableBuffer(
	config: GenerateRepeatingPeriodsConfig,
	state: GenerationState,
	fixedDurationMonths: number,
	bufferMonths: number,
): { period: RatePeriod | null; shouldStop: boolean } {
	const {
		fixedRate,
		allRates,
		lenders,
		propertyValue,
		mortgageTermMonths,
		ber,
	} = config;

	const currentLtv = (state.currentBalance / propertyValue) * 100;
	const variableRate = findVariableRate(fixedRate, allRates, currentLtv, ber);

	if (!variableRate) {
		return { period: null, shouldStop: true };
	}

	const lenderName = getLenderName(lenders, variableRate.lenderId);

	// Check if after buffer there's room for another fixed period
	const monthsAfterBuffer = state.monthsRemaining - bufferMonths;
	const isLastBuffer = monthsAfterBuffer < fixedDurationMonths;

	const period = createVariablePeriod(
		variableRate,
		lenderName,
		isLastBuffer ? 0 : bufferMonths,
		isLastBuffer ? undefined : state.cycleNumber,
	);

	if (!isLastBuffer) {
		// Update state for next cycle
		const bufferRemainingTerm = mortgageTermMonths - state.monthsElapsed;
		state.currentBalance = calculateRemainingBalance(
			state.currentBalance,
			variableRate.rate,
			bufferRemainingTerm,
			bufferMonths,
		);
		state.monthsElapsed += bufferMonths;
		state.monthsRemaining -= bufferMonths;
	}

	return { period, shouldStop: isLastBuffer };
}

/**
 * Generate repeating rate periods (Fixed → Variable → Fixed → Variable → ...)
 * This is a pure function that returns the generated periods without side effects.
 *
 * @param config - Configuration for period generation
 * @returns Array of generated rate periods
 */
export function generateRepeatingRatePeriods(
	config: GenerateRepeatingPeriodsConfig,
): RatePeriod[] {
	const {
		fixedRate,
		fixedLenderId,
		lenders,
		mortgageAmount,
		mortgageTermMonths,
		periodStartMonth,
		includeBuffers,
	} = config;

	// Validate fixed rate has a term
	if (!fixedRate.fixedTerm) return [];

	// Calculate remaining months in the mortgage from this period's start
	const totalRemainingMonths = mortgageTermMonths - periodStartMonth + 1;
	if (totalRemainingMonths <= 0) return [];

	const fixedLenderName = getLenderName(lenders, fixedLenderId);
	const fixedDurationMonths = fixedRate.fixedTerm * 12;
	const bufferMonths = 1;

	// Initialize generation state
	const state: GenerationState = {
		currentBalance: mortgageAmount,
		monthsElapsed: periodStartMonth - 1,
		monthsRemaining: totalRemainingMonths,
		cycleNumber: 1,
	};

	const periods: RatePeriod[] = [];

	while (state.monthsRemaining > 0) {
		// Check if fixed rate is still eligible at current balance/LTV
		// (e.g., LTV dropped below minLtv, or balance dropped below minLoan for HVM)
		if (
			!isRateEligibleForBalance(
				fixedRate,
				state.currentBalance,
				config.propertyValue,
			)
		) {
			// Rate no longer eligible - add buffer if enabled, then stop
			if (includeBuffers) {
				const finalBuffer = tryAddFinalVariablePeriod(config, state);
				if (finalBuffer) periods.push(finalBuffer);
			}
			break;
		}

		// Check if there's room for a full fixed period
		if (state.monthsRemaining < fixedDurationMonths) {
			// Not enough room - add variable until end
			const finalPeriod = tryAddFinalVariablePeriod(config, state);
			if (finalPeriod) periods.push(finalPeriod);
			break;
		}

		// Add fixed period
		const fixedPeriod = addFixedPeriodAndUpdateState(
			config,
			state,
			fixedDurationMonths,
			fixedLenderName,
		);
		periods.push(fixedPeriod);

		if (state.monthsRemaining <= 0) break;

		// Add variable buffer if enabled
		if (includeBuffers) {
			const { period, shouldStop } = tryAddVariableBuffer(
				config,
				state,
				fixedDurationMonths,
				bufferMonths,
			);
			if (period) periods.push(period);
			if (shouldStop) break;
		}

		state.cycleNumber++;
	}

	return periods;
}
