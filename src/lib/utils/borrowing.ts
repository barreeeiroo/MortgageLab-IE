import { AGE_LIMITS } from "@/lib/constants/central-bank";
import { calculateAge } from "./date";

/**
 * Calculate maximum mortgage term based on age at end of term
 */
export function calculateMaxTermByAge(
	birthDate: Date | undefined,
): number | null {
	const age = calculateAge(birthDate);
	if (age === null) return null;
	const maxTermByAge = AGE_LIMITS.MAX_AGE_AT_END - age;
	const maxTerm = Math.min(maxTermByAge, AGE_LIMITS.MAX_TERM);
	return maxTerm > 0 ? maxTerm : 0;
}

/**
 * Calculate the maximum mortgage term for multiple applicants (uses oldest)
 */
export function calculateJointMaxTerm(
	birthDate1: Date | undefined,
	birthDate2: Date | undefined,
	isJoint: boolean,
): number | null {
	const maxTerm1 = calculateMaxTermByAge(birthDate1);
	const maxTerm2 = isJoint ? calculateMaxTermByAge(birthDate2) : null;

	if (maxTerm1 !== null && maxTerm2 !== null) {
		return Math.min(maxTerm1, maxTerm2);
	} else if (maxTerm1 !== null) {
		return maxTerm1;
	} else if (maxTerm2 !== null) {
		return maxTerm2;
	}
	return null;
}

/**
 * Check if any applicant is too old for a mortgage
 */
export function isApplicantTooOld(
	birthDate1: Date | undefined,
	birthDate2: Date | undefined,
	isJoint: boolean,
): boolean {
	const age1 = calculateAge(birthDate1);
	const age2 = isJoint ? calculateAge(birthDate2) : null;

	const isAge1TooOld = age1 !== null && age1 > AGE_LIMITS.MAX_APPLICANT_AGE;
	const isAge2TooOld = age2 !== null && age2 > AGE_LIMITS.MAX_APPLICANT_AGE;

	return isAge1TooOld || isAge2TooOld;
}

/**
 * Calculate monthly mortgage payment using standard amortization formula
 */
export function calculateMonthlyPayment(
	principal: number,
	annualRate: number,
	months: number,
): number {
	const monthlyRate = annualRate / 12;
	if (monthlyRate === 0) return principal / months;
	return (
		(principal * monthlyRate * (1 + monthlyRate) ** months) /
		((1 + monthlyRate) ** months - 1)
	);
}

/**
 * Calculate mortgage metrics (LTV and LTI)
 */
export function calculateMortgageMetrics(
	mortgageAmount: number,
	propertyValue: number,
	totalIncome: number,
): { ltv: number; lti: number } {
	return {
		ltv: propertyValue > 0 ? (mortgageAmount / propertyValue) * 100 : 0,
		lti: totalIncome > 0 ? mortgageAmount / totalIncome : 0,
	};
}
