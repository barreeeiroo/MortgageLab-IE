/**
 * Shared test fixtures for affordability integration tests.
 *
 * All monetary values are in euros (not cents) for readability.
 * These fixtures represent realistic Irish mortgage scenarios.
 */

// Re-export constants for convenience in tests
// biome-ignore lint/performance/noBarrelFile: test fixtures re-export for convenience
export {
	AGE_LIMITS,
	LTI_LIMITS,
	LTV_LIMITS,
} from "@/lib/constants/central-bank";

// Common income scenarios
export const INCOME_SCENARIOS = {
	/** Single applicant earning €50,000 */
	single50k: { income1: 50000, income2: 0, isJoint: false },
	/** Single applicant earning €80,000 */
	single80k: { income1: 80000, income2: 0, isJoint: false },
	/** Joint applicants earning €50k + €40k = €90,000 */
	joint90k: { income1: 50000, income2: 40000, isJoint: true },
	/** Joint applicants earning €70k + €60k = €130,000 */
	joint130k: { income1: 70000, income2: 60000, isJoint: true },
	/** High earner single €120,000 */
	single120k: { income1: 120000, income2: 0, isJoint: false },
} as const;

// Common property value scenarios
export const PROPERTY_VALUES = {
	starter: 300000,
	average: 400000,
	dublin: 500000,
	premium: 600000,
	luxury: 800000,
} as const;

// Age scenarios for term calculations
export const AGE_SCENARIOS = {
	/** Young buyer, age 28 - can get max 35 year term */
	young: new Date(1997, 5, 15),
	/** Mid-career, age 40 - can get 28 year term */
	midCareer: new Date(1985, 2, 10),
	/** Older buyer, age 55 - limited to 13 year term */
	older: new Date(1970, 8, 20),
	/** Near retirement, age 60 - limited to 8 year term */
	nearRetirement: new Date(1965, 0, 5),
} as const;

// Home mover equity scenarios
export const EQUITY_SCENARIOS = {
	/** Good equity position */
	goodEquity: {
		currentPropertyValue: 450000,
		mortgageBalance: 150000,
		equity: 300000,
	},
	/** Moderate equity */
	moderateEquity: {
		currentPropertyValue: 350000,
		mortgageBalance: 200000,
		equity: 150000,
	},
	/** Low equity */
	lowEquity: {
		currentPropertyValue: 300000,
		mortgageBalance: 250000,
		equity: 50000,
	},
	/** No current mortgage (cash buyer trading up) */
	noMortgage: {
		currentPropertyValue: 400000,
		mortgageBalance: 0,
		equity: 400000,
	},
} as const;

// BTL rental scenarios
export const RENTAL_SCENARIOS = {
	/** Dublin city center - high rent */
	dublinCity: { monthlyRent: 2500, propertyValue: 500000 },
	/** Dublin suburbs */
	dublinSuburbs: { monthlyRent: 2000, propertyValue: 400000 },
	/** Cork/Galway cities */
	regionalCity: { monthlyRent: 1500, propertyValue: 300000 },
	/** Rural area */
	rural: { monthlyRent: 1000, propertyValue: 200000 },
} as const;

/**
 * Calculate maximum mortgage based on LTI limit
 */
export function calculateMaxMortgageByLTI(
	totalIncome: number,
	ltiLimit: number,
): number {
	return totalIncome * ltiLimit;
}

/**
 * Calculate maximum mortgage based on LTV limit
 */
export function calculateMaxMortgageByLTV(
	propertyValue: number,
	ltvLimit: number,
): number {
	return propertyValue * (ltvLimit / 100);
}

/**
 * Calculate required deposit for a property
 */
export function calculateRequiredDeposit(
	propertyValue: number,
	ltvLimit: number,
): number {
	return propertyValue * (1 - ltvLimit / 100);
}

/**
 * Calculate rental yield percentage
 */
export function calculateRentalYield(
	annualRent: number,
	propertyValue: number,
): number {
	return (annualRent / propertyValue) * 100;
}
