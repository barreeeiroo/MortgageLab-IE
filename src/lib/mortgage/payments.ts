/**
 * Mortgage payment calculations
 */

import type { MortgageRate } from "@/lib/schemas/rate";
import {
    calculateMonthlyPayment,
    calculateRemainingBalance,
} from "./calculations";

/**
 * Calculate the monthly payment for the follow-on period after a fixed term ends.
 *
 * @param rate - The fixed rate
 * @param variableRate - The variable rate to use after fixed term
 * @param principal - Original loan amount
 * @param totalTermMonths - Total mortgage term in months
 * @returns Monthly payment for the follow-on period, or undefined if not applicable
 */
export function calculateMonthlyFollowOn(
    rate: MortgageRate,
    variableRate: MortgageRate | undefined,
    principal: number,
    totalTermMonths: number,
): number | undefined {
    if (rate.type !== "fixed" || !rate.fixedTerm) return undefined;
    if (!variableRate) return undefined;

    const fixedMonths = rate.fixedTerm * 12;
    const remainingMonths = totalTermMonths - fixedMonths;

    if (remainingMonths <= 0) return undefined;

    const remainingBalance = calculateRemainingBalance(
        principal,
        rate.rate,
        totalTermMonths,
        fixedMonths,
    );

    return calculateMonthlyPayment(
        remainingBalance,
        variableRate.rate,
        remainingMonths,
    );
}

/**
 * Calculate the total amount repayable over the full mortgage term.
 * For fixed rates, includes both the fixed period and follow-on variable period.
 *
 * @param rate - The mortgage rate
 * @param monthlyPayment - Monthly payment during initial period
 * @param monthlyFollowOn - Monthly payment during follow-on period (for fixed rates)
 * @param totalTermMonths - Total mortgage term in months
 * @returns Total amount repayable over the full term
 */
export function calculateTotalRepayable(
    rate: MortgageRate,
    monthlyPayment: number,
    monthlyFollowOn: number | undefined,
    totalTermMonths: number,
): number {
    if (rate.type === "fixed" && rate.fixedTerm && monthlyFollowOn) {
        const fixedMonths = rate.fixedTerm * 12;
        const remainingMonths = totalTermMonths - fixedMonths;
        return monthlyPayment * fixedMonths + monthlyFollowOn * remainingMonths;
    }

    return monthlyPayment * totalTermMonths;
}

/**
 * Calculate the LTV after a fixed term ends, accounting for principal paid down.
 *
 * @param principal - Original loan amount
 * @param annualRate - Annual interest rate as a percentage (e.g., 3.5 for 3.5%)
 * @param totalMonths - Total loan term in months
 * @param fixedMonths - Duration of fixed rate period in months
 * @param originalLtv - Original LTV at mortgage start
 * @returns LTV after the fixed term ends
 */
export function calculateFollowOnLtv(
    principal: number,
    annualRate: number,
    totalMonths: number,
    fixedMonths: number,
    originalLtv: number,
): number {
    const remainingBalance = calculateRemainingBalance(
        principal,
        annualRate,
        totalMonths,
        fixedMonths,
    );
    return (remainingBalance / principal) * originalLtv;
}

/**
 * Calculate the cost of credit as a percentage of the loan amount.
 *
 * @param totalRepayable - Total amount repayable over the mortgage term
 * @param principal - Original loan amount
 * @returns Cost of credit as a percentage, or undefined if totalRepayable is undefined
 */
export function calculateCostOfCreditPercent(
    totalRepayable: number | undefined,
    principal: number,
): number | undefined {
    if (totalRepayable === undefined) return undefined;
    return ((totalRepayable - principal) / principal) * 100;
}
