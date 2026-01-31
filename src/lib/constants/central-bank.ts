/**
 * Central Bank of Ireland Mortgage Measures
 *
 * These rules came into effect January 1, 2023.
 * Source: https://www.centralbank.ie/consumer-hub/explainers/what-are-the-mortgage-measures
 */

// Loan-to-Income (LTI) Limits
export const LTI_LIMITS = {
    /** First-time buyers can borrow up to 4 times gross income */
    FTB: 4,
    /** Second and subsequent buyers (movers) can borrow up to 3.5 times gross income */
    MOVER: 3.5,
    /** Buy-to-let typically assessed on rental yield, but lenders may use LTI */
    BTL: 3.5,
} as const;

// Loan-to-Value (LTV) Limits
export const LTV_LIMITS = {
    /** First-time buyers: 90% LTV (10% minimum deposit) */
    FTB: 90,
    /** Movers/second buyers: 90% LTV (10% minimum deposit) */
    MOVER: 90,
    /** Buy-to-let investors: 70% LTV (30% minimum deposit) */
    BTL: 70,
} as const;

// Lender Allowances - percentage of lending that can exceed limits
export const LENDER_ALLOWANCES = {
    /** 15% of FTB lending can exceed the limits */
    FTB: 15,
    /** 15% of mover lending can exceed the limits */
    MOVER: 15,
    /** 10% of BTL lending can exceed the limits */
    BTL: 10,
} as const;

// Age limits for mortgage applicants
export const AGE_LIMITS = {
    /** Standard maximum age at end of mortgage term */
    MAX_AGE_AT_END: 68,
    /** Some lenders may extend to age 70 */
    EXTENDED_MAX_AGE_AT_END: 70,
    /** Maximum mortgage term */
    MAX_TERM: 35,
    /** Maximum age to start a 35-year mortgage at age 68 end */
    MAX_APPLICANT_AGE: 63,
} as const;

// Central Bank explainer URL
export const CENTRAL_BANK_MORTGAGE_MEASURES_URL =
    "https://www.centralbank.ie/consumer-hub/explainers/what-are-the-mortgage-measures";
