/**
 * Self-build mortgage calculation helpers.
 *
 * Self-build mortgages release funds in stages during construction.
 * During construction, only interest is paid on the drawn amount.
 * Full amortization begins after construction completes.
 */

import type {
    DrawdownStage,
    SelfBuildConfig,
    SelfBuildPhase,
} from "@/lib/schemas/simulate";

/**
 * Drawdown stage with computed cumulative values.
 */
export type ResolvedDrawdownStage = DrawdownStage & {
    cumulativeDrawn: number;
    remainingToDrawn: number;
    totalApproved: number;
};

/**
 * Get the drawdown amount for a specific month.
 * Returns 0 if no drawdown occurs in that month.
 */
export function getDrawdownForMonth(
    month: number,
    stages: DrawdownStage[],
): number {
    const stage = stages.find((s) => s.month === month);
    return stage?.amount ?? 0;
}

/**
 * Get the cumulative amount drawn by a specific month (inclusive).
 */
export function getCumulativeDrawn(
    month: number,
    stages: DrawdownStage[],
): number {
    return stages
        .filter((s) => s.month <= month)
        .reduce((sum, s) => sum + s.amount, 0);
}

/**
 * Get the month when the final drawdown occurs.
 * Returns 0 if no drawdown stages are configured.
 */
export function getFinalDrawdownMonth(stages: DrawdownStage[]): number {
    if (stages.length === 0) return 0;
    return Math.max(...stages.map((s) => s.month));
}

/**
 * Get the month when the construction phase ends.
 * This is the month of the final drawdown.
 */
export function getConstructionEndMonth(config: SelfBuildConfig): number {
    return getFinalDrawdownMonth(config.drawdownStages);
}

/**
 * Get the month when the interest-only phase ends.
 * This is the final drawdown month + interest-only months.
 */
export function getInterestOnlyEndMonth(config: SelfBuildConfig): number {
    const finalDrawdown = getFinalDrawdownMonth(config.drawdownStages);
    return finalDrawdown + config.interestOnlyMonths;
}

/**
 * Determine the self-build phase for a given month.
 *
 * Phases:
 * - construction: Months 1 through final drawdown month (balance increasing, interest-only payments)
 * - interest_only: Months after final drawdown through interest-only period (balance stable, interest-only payments)
 * - repayment: After interest-only period ends (full amortization begins)
 */
export function determinePhase(
    month: number,
    config: SelfBuildConfig,
): SelfBuildPhase {
    const finalDrawdownMonth = getFinalDrawdownMonth(config.drawdownStages);
    const interestOnlyEndMonth = getInterestOnlyEndMonth(config);

    if (month <= finalDrawdownMonth) {
        return "construction";
    }

    if (month <= interestOnlyEndMonth) {
        return "interest_only";
    }

    return "repayment";
}

/**
 * Check if a month is in the interest-only period.
 * When constructionRepaymentType is "interest_and_capital", construction months are NOT interest-only.
 * Only the explicit interest-only period after construction is interest-only.
 */
export function isInterestOnlyMonth(
    month: number,
    config: SelfBuildConfig,
): boolean {
    const phase = determinePhase(month, config);

    // If using interest + capital during construction, only the explicit interest-only phase counts
    if (config.constructionRepaymentType === "interest_and_capital") {
        return phase === "interest_only";
    }

    // Default: both construction and interest_only phases are interest-only
    return phase === "construction" || phase === "interest_only";
}

/**
 * Calculate the interest-only payment for a given balance and rate.
 * During construction/interest-only phase, no principal is paid.
 */
export function calculateInterestOnlyPayment(
    balance: number,
    annualRate: number,
): number {
    const monthlyRate = annualRate / 100 / 12;
    return balance * monthlyRate;
}

/**
 * Get the remaining term in months from when full amortization begins.
 * This is used to recalculate the monthly payment when transitioning to repayment phase.
 */
export function getRemainingTermFromRepayment(
    totalTermMonths: number,
    interestOnlyEndMonth: number,
): number {
    // After interest-only ends, we have the remaining term for full repayment
    // The interest-only period effectively delays the start of amortization
    return totalTermMonths - interestOnlyEndMonth;
}

/**
 * Validate that total drawdowns equal the mortgage amount.
 * Returns the difference (positive = under-drawn, negative = over-drawn).
 */
export function validateDrawdownTotal(
    config: SelfBuildConfig,
    mortgageAmount: number,
): {
    isValid: boolean;
    totalDrawn: number;
    difference: number;
} {
    const totalDrawn = config.drawdownStages.reduce(
        (sum, s) => sum + s.amount,
        0,
    );
    const difference = mortgageAmount - totalDrawn;

    return {
        isValid: Math.abs(difference) < 1, // Allow for rounding (1 cent)
        totalDrawn,
        difference,
    };
}

/**
 * Check if self-build is enabled and has valid configuration.
 */
export function isSelfBuildActive(
    config: SelfBuildConfig | undefined,
): config is SelfBuildConfig {
    return config?.enabled === true && config.drawdownStages.length > 0;
}

/**
 * Get the initial balance for a self-build mortgage.
 * This is the first drawdown amount (balance starts at first drawdown, not full amount).
 */
export function getInitialSelfBuildBalance(config: SelfBuildConfig): number {
    if (config.drawdownStages.length === 0) return 0;

    // Find the first drawdown (should be month 1 typically)
    const sortedStages = [...config.drawdownStages].sort(
        (a, b) => a.month - b.month,
    );
    return sortedStages[0].amount;
}

/**
 * Get drawdown stages with computed cumulative amounts.
 */
export function getDrawdownStagesWithCumulative(
    stages: DrawdownStage[],
): ResolvedDrawdownStage[] {
    const sortedStages = [...stages].sort((a, b) => a.month - b.month);
    const total = sortedStages.reduce((sum, s) => sum + s.amount, 0);

    let cumulative = 0;
    return sortedStages.map((stage) => {
        cumulative += stage.amount;
        return {
            ...stage,
            cumulativeDrawn: cumulative,
            remainingToDrawn: total - cumulative,
            totalApproved: total,
        };
    });
}
