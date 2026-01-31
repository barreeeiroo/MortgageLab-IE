/**
 * Mortgage amortization simulation calculations.
 * Pure functions for calculating amortization schedules, milestones, and summaries.
 */

import { calculateMonthlyPayment } from "@/lib/mortgage/calculations";
import { findVariableRate } from "@/lib/mortgage/rates";
import {
    calculateInterestOnlyPayment,
    determinePhase,
    getConstructionEndMonth,
    getDrawdownForMonth,
    getInitialSelfBuildBalance,
    getInterestOnlyEndMonth,
    isInterestOnlyMonth,
    isSelfBuildActive,
    validateDrawdownTotal,
} from "@/lib/mortgage/self-build";
import type { Lender } from "@/lib/schemas/lender";
import type {
    MaxTransactionsPeriod,
    OverpaymentPolicy,
} from "@/lib/schemas/overpayment-policy";
import type { MortgageRate } from "@/lib/schemas/rate";
import type {
    AmortizationMonth,
    AmortizationResult,
    AmortizationYear,
    AppliedOverpayment,
    Milestone,
    MilestoneType,
    OverpaymentConfig,
    RatePeriod,
    ResolvedRatePeriod,
    SelfBuildConfig,
    SelfBuildPhase,
    SimulationState,
    SimulationSummary,
    SimulationWarning,
} from "@/lib/schemas/simulate";
import type { CustomRate } from "@/lib/stores/custom-rates";
import { formatNumber } from "@/lib/utils/currency";
import {
    addMonthsToDateString,
    getCalendarDate,
    getCalendarYearForMonth,
    isFirstMonthOfCalendarYear,
} from "@/lib/utils/date";

// Helper: Find rate period for a given month (stack-based model)
// Returns both the period and its computed startMonth
export function findRatePeriodForMonth(
    periods: RatePeriod[],
    month: number,
): { period: RatePeriod; startMonth: number } | undefined {
    let currentStart = 1;

    for (const period of periods) {
        const periodEnd =
            period.durationMonths === 0
                ? Number.POSITIVE_INFINITY // Until end of mortgage
                : currentStart + period.durationMonths - 1;

        if (month >= currentStart && month <= periodEnd) {
            return { period, startMonth: currentStart };
        }

        currentStart += period.durationMonths;
    }

    return undefined;
}

// Helper: Resolve a rate period to get full rate details
// startMonth is computed from stack position and passed in
export function resolveRatePeriod(
    period: RatePeriod,
    startMonth: number,
    allRates: MortgageRate[],
    customRates: CustomRate[],
    lenders: Lender[],
): ResolvedRatePeriod | undefined {
    let rate: MortgageRate | CustomRate | undefined;
    let lenderName = "Unknown";

    if (period.isCustom) {
        rate = customRates.find((r) => r.id === period.rateId);
        if (rate && "customLenderName" in rate) {
            lenderName = rate.customLenderName || "Custom";
        }
    } else {
        rate = allRates.find(
            (r) => r.id === period.rateId && r.lenderId === period.lenderId,
        );
        const lender = lenders.find((l) => l.id === period.lenderId);
        lenderName = lender?.name || "Unknown";
    }

    if (!rate) return undefined;

    // Find overpayment policy for lender (if fixed rate)
    let overpaymentPolicyId: string | undefined;
    if (rate.type === "fixed") {
        const lender = lenders.find((l) => l.id === period.lenderId);
        overpaymentPolicyId = lender?.overpaymentPolicy;
    }

    // Generate label if not provided
    const label =
        period.label ||
        (rate.type === "fixed" && rate.fixedTerm
            ? `${lenderName} ${rate.fixedTerm}-Year Fixed @ ${rate.rate}%`
            : `${lenderName} Variable @ ${rate.rate}%`);

    return {
        id: period.id,
        rateId: period.rateId,
        rate: rate.rate,
        type: rate.type,
        fixedTerm: rate.fixedTerm,
        lenderId: period.lenderId,
        lenderName,
        rateName: rate.name,
        startMonth,
        durationMonths: period.durationMonths,
        overpaymentPolicyId,
        label,
        isCustom: period.isCustom,
    };
}

// Helper: Calculate overpayment allowance
export function calculateAllowance(
    policy: OverpaymentPolicy | undefined,
    balance: number,
    monthlyPayment: number,
    alreadyPaidThisYear: number,
): number {
    if (!policy) return 0; // No free allowance

    // All values are in cents
    let allowance = 0;

    switch (policy.allowanceType) {
        case "percentage":
            if (policy.allowanceBasis === "balance") {
                // e.g., 10% of balance per year
                allowance = Math.max(
                    0,
                    (balance * policy.allowanceValue) / 100 -
                        alreadyPaidThisYear,
                );
            } else if (policy.allowanceBasis === "monthly") {
                // e.g., 10% of monthly payment per month (BOI style)
                // This is a per-month allowance, not yearly
                allowance = (monthlyPayment * policy.allowanceValue) / 100;

                // Apply minimum amount if specified (e.g., BOI's €65 minimum)
                // minAmount is in euros, convert to cents
                if (policy.minAmount !== undefined && policy.minAmount > 0) {
                    const minAmountCents = policy.minAmount * 100;
                    allowance = Math.max(allowance, minAmountCents);
                }
            }
            break;
        case "flat": {
            // e.g., €5,000 per year - allowanceValue is in euros, convert to cents
            const yearlyAllowanceCents = policy.allowanceValue * 100;
            allowance = Math.max(0, yearlyAllowanceCents - alreadyPaidThisYear);
            break;
        }
    }

    return allowance;
}

/**
 * Get a unique key for tracking transaction counts within a period.
 * Used to enforce limits like "max 2 overpayments per year".
 *
 * @param ratePeriodId - The ID of the current rate period
 * @param month - The mortgage month number (1-indexed)
 * @param startDate - Optional mortgage start date for calendar-based periods
 * @param period - The period type for the limit
 */
export function getTransactionPeriodKey(
    ratePeriodId: string,
    month: number,
    startDate: string | undefined,
    period: MaxTransactionsPeriod,
): string {
    if (period === "fixed_period") {
        // Limit applies for the entire fixed rate period
        return ratePeriodId;
    }

    if (!startDate) {
        // Fallback to mortgage-relative periods when no start date
        if (period === "month") return `${ratePeriodId}-m${month}`;
        if (period === "quarter")
            return `${ratePeriodId}-q${Math.ceil(month / 3)}`;
        return `${ratePeriodId}-y${Math.ceil(month / 12)}`;
    }

    // Calendar-based periods
    const date = getCalendarDate(startDate, month - 1);
    const year = date.getFullYear();
    const calendarMonth = date.getMonth(); // 0-indexed

    if (period === "month") {
        return `${ratePeriodId}-${year}-${calendarMonth}`;
    }
    if (period === "quarter") {
        const quarter = Math.floor(calendarMonth / 3);
        return `${ratePeriodId}-${year}-Q${quarter}`;
    }
    // year
    return `${ratePeriodId}-${year}`;
}

// Helper: Get overpayments for a specific month
export interface OverpaymentResult {
    amount: number;
    applied: AppliedOverpayment[];
    exceededAllowance: boolean;
    excessAmount: number;
}

export function getOverpaymentForMonth(
    month: number,
    configs: OverpaymentConfig[],
    maxAmount: number,
    ratePeriod: ResolvedRatePeriod,
    policies: OverpaymentPolicy[],
    yearlyOverpaymentSoFar: number,
    currentBalance: number,
    currentPayment: number,
    yearStartBalance: number,
): OverpaymentResult {
    let totalAmount = 0;
    const applied: AppliedOverpayment[] = [];

    for (const config of configs) {
        // Skip disabled overpayments
        if (config.enabled === false) continue;

        // Check if this config applies to this month
        let applies = false;

        if (config.type === "one_time") {
            applies = config.startMonth === month;
        } else {
            // Recurring overpayment
            const inRange =
                month >= config.startMonth &&
                (!config.endMonth || month <= config.endMonth);

            if (inRange) {
                const frequency = config.frequency ?? "monthly"; // Default to monthly for backwards compatibility
                const monthsSinceStart = month - config.startMonth;

                if (frequency === "monthly") {
                    applies = true;
                } else if (frequency === "quarterly") {
                    // Quarterly: apply every 3 months from start
                    applies = monthsSinceStart % 3 === 0;
                } else {
                    // Yearly: only apply on anniversary months (every 12 months)
                    applies = monthsSinceStart % 12 === 0;
                }
            }
        }

        if (!applies) continue;

        const amount = Math.min(config.amount, maxAmount - totalAmount);
        if (amount <= 0) continue;

        // Check allowance for fixed rates
        let withinAllowance = true;
        let excessAmount = 0;

        if (ratePeriod.type === "fixed" && ratePeriod.overpaymentPolicyId) {
            const policy = policies.find(
                (p) => p.id === ratePeriod.overpaymentPolicyId,
            );
            // For balance-based yearly policies, use balance at start of year
            // (this matches how lenders typically calculate the allowance)
            const balanceForAllowance =
                policy?.allowanceBasis === "balance"
                    ? yearStartBalance
                    : currentBalance;
            const allowance = calculateAllowance(
                policy,
                balanceForAllowance,
                currentPayment,
                yearlyOverpaymentSoFar,
            );

            // For monthly-basis policies (like BOI), check per-month
            if (policy?.allowanceBasis === "monthly") {
                if (amount > allowance) {
                    withinAllowance = false;
                    excessAmount = amount - allowance;
                }
            } else {
                // Yearly basis
                const remaining = Math.max(0, allowance);
                if (amount > remaining) {
                    withinAllowance = false;
                    excessAmount = amount - remaining;
                }
            }
        }

        applied.push({
            month,
            amount,
            configId: config.id,
            isRecurring: config.type === "recurring",
            withinAllowance,
            excessAmount,
        });

        totalAmount += amount;
    }

    return {
        amount: totalAmount,
        applied,
        exceededAllowance: applied.some((a) => !a.withinAllowance),
        excessAmount: applied.reduce((sum, a) => sum + a.excessAmount, 0),
    };
}

// Main calculation function
export function calculateAmortization(
    state: SimulationState,
    allRates: MortgageRate[],
    customRates: CustomRate[],
    lenders: Lender[],
    policies: OverpaymentPolicy[],
): AmortizationResult {
    const { input, ratePeriods, overpaymentConfigs, selfBuildConfig } = state;

    const months: AmortizationMonth[] = [];
    const appliedOverpayments: AppliedOverpayment[] = [];
    const warnings: SimulationWarning[] = [];

    if (
        input.mortgageAmount <= 0 ||
        input.mortgageTermMonths <= 0 ||
        ratePeriods.length === 0
    ) {
        return { months, appliedOverpayments, warnings };
    }

    // Self-build mode: check if active and get initial state
    const isSelfBuild = isSelfBuildActive(selfBuildConfig);
    let cumulativeDrawn = 0;
    let previousPhase: SelfBuildPhase | undefined;

    // Initialize balance based on self-build or standard mortgage
    let balance: number;
    if (isSelfBuild) {
        // Self-build: balance starts at first drawdown amount
        const firstDrawdown = getDrawdownForMonth(
            1,
            selfBuildConfig.drawdownStages,
        );
        balance = firstDrawdown;
        cumulativeDrawn = firstDrawdown;
    } else {
        balance = input.mortgageAmount;
    }

    let cumulativeInterest = 0;
    let cumulativePrincipal = 0;
    let cumulativeOverpayments = 0;
    let cumulativeReduceTermOverpayments = 0;
    let month = 1;
    const maxMonths = input.mortgageTermMonths;

    // Track current monthly payment (can change with reduce_payment effect)
    let currentMonthlyPayment: number | null = null;
    let lastRatePeriodId: string | null = null;

    // Track yearly overpayments per rate period for allowance checking
    const yearlyOverpaymentsByPeriod = new Map<string, number>();

    // Track balance at start of each period-year for allowance calculation
    // (For balance-based policies, allowance should be based on balance at start of year)
    const yearStartBalanceByPeriod = new Map<string, number>();

    // Track transaction counts per period for policies with maxTransactions limit
    const transactionCountByPeriod = new Map<string, number>();

    // Pre-resolve all rate periods (stack-based: compute startMonth from position)
    const resolvedPeriods = new Map<string, ResolvedRatePeriod>();
    let currentStart = 1;
    for (const period of ratePeriods) {
        const resolved = resolveRatePeriod(
            period,
            currentStart,
            allRates,
            customRates,
            lenders,
        );
        if (resolved) {
            resolvedPeriods.set(period.id, resolved);
        }
        currentStart += period.durationMonths;
    }

    // Stack-based model: no gaps to check, periods are sequential
    // For self-build: continue even if balance is 0, as drawdowns will add to balance later
    const shouldContinue = () =>
        balance > 0.01 ||
        (isSelfBuild && cumulativeDrawn < input.mortgageAmount);

    while (shouldContinue() && month <= maxMonths) {
        // Find current rate period (stack-based)
        const found = findRatePeriodForMonth(ratePeriods, month);
        if (!found) {
            // No rate period for this month - incomplete simulation
            month++;
            continue;
        }

        const { period: ratePeriod } = found;
        const resolved = resolvedPeriods.get(ratePeriod.id);
        if (!resolved) {
            month++;
            continue;
        }

        const monthlyRate = resolved.rate / 100 / 12;

        // Self-build: handle drawdowns and phase tracking
        let drawdownThisMonth = 0;
        let currentPhase: SelfBuildPhase | undefined;
        let isInterestOnly = false;

        if (isSelfBuild) {
            // Check for drawdown this month (after month 1, first drawdown already in initial balance)
            if (month > 1) {
                drawdownThisMonth = getDrawdownForMonth(
                    month,
                    selfBuildConfig.drawdownStages,
                );
                if (drawdownThisMonth > 0) {
                    balance += drawdownThisMonth;
                    cumulativeDrawn += drawdownThisMonth;
                }
            }

            // Determine current phase and whether this is an interest-only month
            currentPhase = determinePhase(month, selfBuildConfig);
            isInterestOnly = isInterestOnlyMonth(month, selfBuildConfig);

            // Check if we're transitioning to repayment phase
            if (previousPhase !== "repayment" && currentPhase === "repayment") {
                // Recalculate payment for remaining term from this point
                const remainingMonths = maxMonths - month + 1;
                currentMonthlyPayment = calculateMonthlyPayment(
                    balance,
                    resolved.rate,
                    remainingMonths,
                );
            }

            previousPhase = currentPhase;
        }

        // Track yearly overpayments by rate period + year
        // Use calendar year if startDate is provided, otherwise use mortgage year
        const calendarYear = getCalendarYearForMonth(input.startDate, month);
        const yearKey =
            calendarYear !== undefined
                ? String(calendarYear) // Calendar year (e.g., "2025")
                : String(Math.ceil(month / 12)); // Mortgage year (e.g., "1", "2")
        const periodYear = `${ratePeriod.id}-${yearKey}`;

        // Check if we need to start tracking a new year
        const isNewYear =
            !yearlyOverpaymentsByPeriod.has(periodYear) ||
            (calendarYear !== undefined &&
                isFirstMonthOfCalendarYear(input.startDate, month));

        if (isNewYear && !yearlyOverpaymentsByPeriod.has(periodYear)) {
            yearlyOverpaymentsByPeriod.set(periodYear, 0);
            // Record balance at start of this year for allowance calculation
            yearStartBalanceByPeriod.set(periodYear, balance);
        }

        // Recalculate monthly payment when rate period changes (or for first calculation)
        // Also recalc after drawdowns in interest_and_capital mode (balance changed)
        // Skip recalc during self-build interest-only phase (we calculate differently)
        const needsRecalc =
            !isInterestOnly &&
            (lastRatePeriodId !== ratePeriod.id ||
                currentMonthlyPayment === null ||
                drawdownThisMonth > 0);
        if (needsRecalc) {
            const remainingMonths = maxMonths - month + 1;
            // For reduce_term: calculate payment using balance as if reduce_term
            // overpayments hadn't happened, so payments stay higher and term shortens
            const balanceForPaymentCalc =
                balance + cumulativeReduceTermOverpayments;
            currentMonthlyPayment = calculateMonthlyPayment(
                balanceForPaymentCalc,
                resolved.rate,
                remainingMonths,
            );
            lastRatePeriodId = ratePeriod.id;
        }

        // Calculate interest and principal portions
        let interestPortion: number;
        let principalPortion: number;
        let monthlyPayment: number;

        if (isInterestOnly) {
            // Self-build interest-only phase: only pay interest, no principal reduction
            interestPortion = calculateInterestOnlyPayment(
                balance,
                resolved.rate,
            );
            principalPortion = 0;
            monthlyPayment = interestPortion;
        } else {
            // Standard amortization
            // After needsRecalc block, currentMonthlyPayment is guaranteed to be a number
            monthlyPayment = currentMonthlyPayment as number;
            interestPortion = balance * monthlyRate;
            principalPortion = Math.min(
                monthlyPayment - interestPortion,
                balance,
            );
        }

        // Get overpayment for this month
        const overpaymentResult = getOverpaymentForMonth(
            month,
            overpaymentConfigs,
            balance - principalPortion,
            resolved,
            policies,
            yearlyOverpaymentsByPeriod.get(periodYear) ?? 0,
            balance,
            monthlyPayment,
            yearStartBalanceByPeriod.get(periodYear) ?? balance,
        );

        const overpayment = overpaymentResult.amount;
        appliedOverpayments.push(...overpaymentResult.applied);

        // Track reduce_term overpayments separately for payment recalculation
        for (const applied of overpaymentResult.applied) {
            const config = overpaymentConfigs.find(
                (c) => c.id === applied.configId,
            );
            if (config?.effect === "reduce_term") {
                cumulativeReduceTermOverpayments += applied.amount;
            }
        }

        // Track allowance usage
        yearlyOverpaymentsByPeriod.set(
            periodYear,
            (yearlyOverpaymentsByPeriod.get(periodYear) ?? 0) + overpayment,
        );

        // Add warnings for each overpayment that exceeded allowance
        for (const applied of overpaymentResult.applied) {
            if (!applied.withinAllowance) {
                const config = overpaymentConfigs.find(
                    (c) => c.id === applied.configId,
                );
                const policy = policies.find(
                    (p) => p.id === resolved.overpaymentPolicyId,
                );
                const overpaymentLabel =
                    config?.label ||
                    (config?.type === "one_time" ? "One-time" : "Recurring");
                const excessFormatted = formatNumber(
                    applied.excessAmount / 100,
                    2,
                );
                const policyLabel = policy?.label ?? "free allowance";
                warnings.push({
                    type: "allowance_exceeded",
                    month,
                    message: `Exceeds ${policyLabel} allowance by €${excessFormatted}`,
                    severity: "warning",
                    configId: applied.configId,
                    overpaymentLabel,
                });
            }
        }

        // Check transaction count limits (e.g., Avant's max 2 per year)
        if (
            overpaymentResult.applied.length > 0 &&
            resolved.overpaymentPolicyId
        ) {
            const policy = policies.find(
                (p) => p.id === resolved.overpaymentPolicyId,
            );
            if (policy?.maxTransactions && policy?.maxTransactionsPeriod) {
                const periodKey = getTransactionPeriodKey(
                    ratePeriod.id,
                    month,
                    input.startDate,
                    policy.maxTransactionsPeriod,
                );
                const currentCount =
                    transactionCountByPeriod.get(periodKey) ?? 0;

                // Check each applied overpayment for this month
                for (const applied of overpaymentResult.applied) {
                    const newCount = currentCount + 1;
                    transactionCountByPeriod.set(periodKey, newCount);

                    if (newCount > policy.maxTransactions) {
                        const config = overpaymentConfigs.find(
                            (c) => c.id === applied.configId,
                        );
                        const overpaymentLabel =
                            config?.label ||
                            (config?.type === "one_time"
                                ? "One-time"
                                : "Recurring");
                        const periodLabel =
                            policy.maxTransactionsPeriod === "fixed_period"
                                ? "fixed period"
                                : policy.maxTransactionsPeriod;
                        warnings.push({
                            type: "transaction_limit_exceeded",
                            month,
                            message: `Exceeds ${policy.maxTransactions} overpayments per ${periodLabel} limit`,
                            severity: "warning",
                            configId: applied.configId,
                            overpaymentLabel,
                        });
                    }
                }
            }
        }

        // Update balances
        const closingBalance = Math.max(
            0,
            balance - principalPortion - overpayment,
        );

        // Check for early redemption during fixed period
        if (closingBalance === 0 && resolved.type === "fixed") {
            const periodEndMonth =
                ratePeriod.durationMonths === 0
                    ? maxMonths
                    : found.startMonth + ratePeriod.durationMonths - 1;
            if (month < periodEndMonth && ratePeriod.durationMonths > 0) {
                warnings.push({
                    type: "early_redemption",
                    month,
                    message: `Mortgage paid off ${periodEndMonth - month} months before fixed period ends. Early redemption fees may apply.`,
                    severity: "error",
                });
            }
        }

        // Update cumulatives
        cumulativeInterest += interestPortion;
        cumulativePrincipal += principalPortion + overpayment;
        cumulativeOverpayments += overpayment;

        // Build month record with self-build fields if applicable
        const monthRecord: AmortizationMonth = {
            month,
            year: Math.ceil(month / 12),
            monthOfYear: ((month - 1) % 12) + 1,
            date: addMonthsToDateString(input.startDate, month),
            openingBalance: balance,
            closingBalance,
            scheduledPayment: monthlyPayment,
            interestPortion,
            principalPortion,
            overpayment,
            totalPayment: monthlyPayment + overpayment,
            rate: resolved.rate,
            ratePeriodId: ratePeriod.id,
            cumulativeInterest,
            cumulativePrincipal,
            cumulativeOverpayments,
            cumulativeTotal: cumulativeInterest + cumulativePrincipal,
        };

        // Add self-build specific fields if applicable
        if (isSelfBuild) {
            monthRecord.drawdownThisMonth = drawdownThisMonth;
            monthRecord.cumulativeDrawn = cumulativeDrawn;
            monthRecord.phase = currentPhase;
            monthRecord.isInterestOnly = isInterestOnly;
        }

        months.push(monthRecord);

        // Handle reduce_payment effect for variable rates
        // Only recalculate payment based on the "reduce_payment" portion of overpayments
        // "reduce_term" overpayments should NOT affect the monthly payment recalculation
        if (overpayment > 0 && resolved.type === "variable") {
            // Calculate how much of the overpayment has reduce_payment effect
            let reducePaymentAmount = 0;
            for (const applied of overpaymentResult.applied) {
                const config = overpaymentConfigs.find(
                    (c) => c.id === applied.configId,
                );
                if (config?.effect === "reduce_payment") {
                    reducePaymentAmount += applied.amount;
                }
            }

            if (reducePaymentAmount > 0) {
                // Proportionally reduce payment based on the reduce_payment portion
                // This preserves the term achieved by reduce_term overpayments
                // while still reducing payments from the reduce_payment portion
                const balanceWithoutReducePayment =
                    closingBalance + reducePaymentAmount;
                if (balanceWithoutReducePayment > 0) {
                    currentMonthlyPayment =
                        monthlyPayment *
                        (closingBalance / balanceWithoutReducePayment);
                }
            }
        }

        balance = closingBalance;
        month++;
    }

    return { months, appliedOverpayments, warnings };
}

// Extract calendar year from date string "YYYY-MM-DD"
// Returns NaN if date is empty (relative periods mode)
function getCalendarYear(dateStr: string): number {
    if (!dateStr) return NaN;
    return parseInt(dateStr.split("-")[0], 10);
}

// Aggregate months into calendar years (or mortgage years if no start date)
export function aggregateByYear(
    months: AmortizationMonth[],
): AmortizationYear[] {
    if (months.length === 0) return [];

    // Check if we have calendar dates (first month has a date)
    const hasCalendarDates = months[0]?.date && months[0].date !== "";

    const yearMap = new Map<number, AmortizationMonth[]>();
    for (const month of months) {
        // Group by calendar year if dates available, otherwise by mortgage year
        const yearKey = hasCalendarDates
            ? getCalendarYear(month.date)
            : month.year;
        const existing = yearMap.get(yearKey) || [];
        existing.push(month);
        yearMap.set(yearKey, existing);
    }

    const years: AmortizationYear[] = [];
    for (const [year, yearMonths] of yearMap) {
        const firstMonth = yearMonths[0];
        const lastMonth = yearMonths[yearMonths.length - 1];

        // Collect rate changes that started this year
        const rateChanges = new Set<string>();
        let prevRatePeriodId: string | null = null;
        for (const m of yearMonths) {
            if (m.ratePeriodId !== prevRatePeriodId) {
                // Find the rate period label
                rateChanges.add(m.ratePeriodId);
                prevRatePeriodId = m.ratePeriodId;
            }
        }

        years.push({
            year,
            openingBalance: firstMonth.openingBalance,
            closingBalance: lastMonth.closingBalance,
            totalInterest: yearMonths.reduce(
                (sum, m) => sum + m.interestPortion,
                0,
            ),
            totalPrincipal: yearMonths.reduce(
                (sum, m) => sum + m.principalPortion,
                0,
            ),
            totalOverpayments: yearMonths.reduce(
                (sum, m) => sum + m.overpayment,
                0,
            ),
            totalPayments: yearMonths.reduce(
                (sum, m) => sum + m.totalPayment,
                0,
            ),
            cumulativeInterest: lastMonth.cumulativeInterest,
            cumulativePrincipal: lastMonth.cumulativePrincipal,
            cumulativeTotal: lastMonth.cumulativeTotal,
            months: yearMonths,
            hasWarnings: false, // Will be set by computed
            rateChanges: Array.from(rateChanges),
        });
    }

    // Sort by calendar year
    return years.sort((a, b) => a.year - b.year);
}

/**
 * Calculate baseline total interest (mortgage without any overpayments)
 * This is a simplified calculation that doesn't track all monthly details.
 *
 * For self-build mortgages, the baseline uses interest-only payments during
 * construction (the default mode), so we can compare against "interest_and_capital"
 * mode to see the difference.
 */
export function calculateBaselineInterest(
    mortgageAmount: number,
    mortgageTermMonths: number,
    ratePeriods: RatePeriod[],
    resolvedPeriods: Map<string, ResolvedRatePeriod>,
    selfBuildConfig?: SelfBuildConfig,
): number {
    if (
        mortgageAmount <= 0 ||
        mortgageTermMonths <= 0 ||
        ratePeriods.length === 0
    ) {
        return 0;
    }

    // Check if self-build is active
    const isSelfBuild = isSelfBuildActive(selfBuildConfig);

    // For baseline, use the same construction repayment type as the user's config
    // The baseline should only differ by not having overpayments
    const baselineSelfBuildConfig: SelfBuildConfig | undefined =
        isSelfBuild && selfBuildConfig ? selfBuildConfig : undefined;

    // Initialize balance based on self-build or standard mortgage
    let balance: number;
    let cumulativeDrawn = 0;

    if (isSelfBuild && baselineSelfBuildConfig) {
        const firstDrawdown = getDrawdownForMonth(
            1,
            baselineSelfBuildConfig.drawdownStages,
        );
        balance = firstDrawdown;
        cumulativeDrawn = firstDrawdown;
    } else {
        balance = mortgageAmount;
    }

    let totalInterest = 0;
    let month = 1;
    const maxMonths = mortgageTermMonths;

    let currentMonthlyPayment: number | null = null;
    let lastRatePeriodId: string | null = null;
    let previousPhase: SelfBuildPhase | undefined;

    // For self-build: continue even if balance is 0, as drawdowns will add to balance later
    const shouldContinue = () =>
        balance > 0.01 || (isSelfBuild && cumulativeDrawn < mortgageAmount);

    while (shouldContinue() && month <= maxMonths) {
        // Find current rate period (stack-based)
        const found = findRatePeriodForMonth(ratePeriods, month);
        if (!found) {
            month++;
            continue;
        }

        const { period: ratePeriod } = found;
        const resolved = resolvedPeriods.get(ratePeriod.id);
        if (!resolved) {
            month++;
            continue;
        }

        const monthlyRate = resolved.rate / 100 / 12;

        // Self-build: handle drawdowns and phase tracking
        let isInterestOnly = false;

        // Track drawdowns for self-build
        let drawdownThisMonth = 0;

        if (isSelfBuild && baselineSelfBuildConfig) {
            // Check for drawdown this month
            if (month > 1) {
                drawdownThisMonth = getDrawdownForMonth(
                    month,
                    baselineSelfBuildConfig.drawdownStages,
                );
                if (drawdownThisMonth > 0) {
                    balance += drawdownThisMonth;
                    cumulativeDrawn += drawdownThisMonth;
                }
            }

            // Use isInterestOnlyMonth which respects constructionRepaymentType
            const currentPhase = determinePhase(month, baselineSelfBuildConfig);
            isInterestOnly = isInterestOnlyMonth(
                month,
                baselineSelfBuildConfig,
            );

            // Recalculate payment when transitioning to repayment phase
            if (previousPhase !== "repayment" && currentPhase === "repayment") {
                const remainingMonths = maxMonths - month + 1;
                currentMonthlyPayment = calculateMonthlyPayment(
                    balance,
                    resolved.rate,
                    remainingMonths,
                );
            }

            previousPhase = currentPhase;
        }

        // Recalculate monthly payment when rate period changes (skip during interest-only)
        // Also recalc after drawdowns in interest_and_capital mode
        if (
            !isInterestOnly &&
            (lastRatePeriodId !== ratePeriod.id ||
                currentMonthlyPayment === null ||
                drawdownThisMonth > 0)
        ) {
            const remainingMonths = maxMonths - month + 1;
            currentMonthlyPayment = calculateMonthlyPayment(
                balance,
                resolved.rate,
                remainingMonths,
            );
            lastRatePeriodId = ratePeriod.id;
        }

        // Calculate interest and principal portions
        let interestPortion: number;
        let principalPortion: number;

        if (isInterestOnly) {
            // Self-build interest-only phase: only pay interest
            interestPortion = calculateInterestOnlyPayment(
                balance,
                resolved.rate,
            );
            principalPortion = 0;
        } else {
            // Standard amortization
            const monthlyPayment = currentMonthlyPayment as number;
            interestPortion = balance * monthlyRate;
            principalPortion = Math.min(
                monthlyPayment - interestPortion,
                balance,
            );
        }

        totalInterest += interestPortion;
        balance = Math.max(0, balance - principalPortion);
        month++;
    }

    return totalInterest;
}

// Calculate simulation summary
export function calculateSummary(
    months: AmortizationMonth[],
    baselineInterest: number,
    mortgageTermMonths: number,
    interestAndCapitalBaseline?: number, // Interest if paying principal during construction (self-build only)
): SimulationSummary {
    if (months.length === 0) {
        return {
            totalInterest: 0,
            totalPaid: 0,
            actualTermMonths: 0,
            interestSaved: 0,
            monthsSaved: 0,
        };
    }

    const lastMonth = months[months.length - 1];
    const actualTermMonths = months.length;

    // Calculate interest saved by comparing to baseline (no overpayments)
    const actualInterest = lastMonth.cumulativeInterest;
    const interestSaved = Math.max(0, baselineInterest - actualInterest);

    // Calculate extra interest from choosing interest_only vs interest_and_capital
    // Compare both WITHOUT overpayments to show the pure mode difference
    // Positive = extra interest (costs more)
    let extraInterestFromSelfBuild: number | undefined;
    if (interestAndCapitalBaseline !== undefined) {
        // baselineInterest = interest_only without overpayments
        // interestAndCapitalBaseline = interest_and_capital without overpayments
        const diff = baselineInterest - interestAndCapitalBaseline;
        // Only set if there's a meaningful difference (> €1)
        if (Math.abs(diff) > 100) {
            extraInterestFromSelfBuild = diff;
        }
    }

    // Only report months saved if the mortgage was actually paid off (balance reached 0)
    // If simulation is incomplete (no rate defined for remaining months), don't report months saved
    const isMortgagePaidOff = lastMonth.closingBalance <= 0.01;
    const monthsSaved = isMortgagePaidOff
        ? mortgageTermMonths - actualTermMonths
        : 0;

    return {
        totalInterest: actualInterest,
        totalPaid: lastMonth.cumulativeTotal,
        actualTermMonths,
        interestSaved,
        monthsSaved,
        extraInterestFromSelfBuild,
    };
}

// Milestone labels
const MILESTONE_LABELS: Record<MilestoneType, string> = {
    mortgage_start: "Mortgage Starts",
    construction_complete: "Construction Complete",
    full_payments_start: "Full Payments Start",
    principal_25_percent: "25% Paid Off",
    principal_50_percent: "50% Paid Off",
    principal_75_percent: "75% Paid Off",
    ltv_80_percent: "LTV Below 80%",
    mortgage_complete: "Mortgage Complete",
};

// Calculate milestones from amortization schedule
export function calculateMilestones(
    months: AmortizationMonth[],
    mortgageAmount: number,
    propertyValue: number,
    startDate: string | undefined,
    selfBuildConfig?: SelfBuildConfig,
): Milestone[] {
    if (months.length === 0) return [];

    const milestones: Milestone[] = [];
    const reachedMilestones = new Set<MilestoneType>();

    // Check if self-build is active and fully configured
    const isSelfBuild = isSelfBuildActive(selfBuildConfig);
    const constructionEndMonth =
        isSelfBuild && selfBuildConfig
            ? getConstructionEndMonth(selfBuildConfig)
            : 0;
    const interestOnlyEndMonth =
        isSelfBuild && selfBuildConfig
            ? getInterestOnlyEndMonth(selfBuildConfig)
            : 0;

    // For self-build, check if drawdowns are fully allocated
    // Hide construction/repayment milestones until drawdowns sum to mortgage amount
    const isDrawdownComplete =
        !isSelfBuild ||
        (selfBuildConfig &&
            validateDrawdownTotal(selfBuildConfig, mortgageAmount).isValid);

    // Add mortgage start milestone
    milestones.push({
        type: "mortgage_start",
        month: 1,
        date: startDate || "",
        label: MILESTONE_LABELS.mortgage_start,
        value:
            isSelfBuild && selfBuildConfig
                ? getInitialSelfBuildBalance(selfBuildConfig)
                : mortgageAmount,
    });
    reachedMilestones.add("mortgage_start");

    // Calculate thresholds
    const threshold25 = mortgageAmount * 0.75; // Balance at 25% paid off
    const threshold50 = mortgageAmount * 0.5; // Balance at 50% paid off
    const threshold75 = mortgageAmount * 0.25; // Balance at 75% paid off
    const ltv80Threshold = propertyValue * 0.8; // Balance for 80% LTV

    for (const month of months) {
        // Self-build: Add construction complete milestone (only if drawdowns are fully allocated)
        if (
            isSelfBuild &&
            isDrawdownComplete &&
            !reachedMilestones.has("construction_complete") &&
            month.month === constructionEndMonth
        ) {
            milestones.push({
                type: "construction_complete",
                month: month.month,
                date: month.date,
                label: MILESTONE_LABELS.construction_complete,
                value: month.closingBalance,
            });
            reachedMilestones.add("construction_complete");
        }

        // Self-build: Add full payments start milestone (only if drawdowns are fully allocated)
        if (
            isSelfBuild &&
            isDrawdownComplete &&
            !reachedMilestones.has("full_payments_start") &&
            interestOnlyEndMonth > constructionEndMonth &&
            month.month === interestOnlyEndMonth + 1
        ) {
            milestones.push({
                type: "full_payments_start",
                month: month.month,
                date: month.date,
                label: MILESTONE_LABELS.full_payments_start,
                value: month.openingBalance,
            });
            reachedMilestones.add("full_payments_start");
        }

        // For self-build, only check principal milestones after:
        // 1. Drawdowns are fully allocated (sum equals mortgage amount)
        // 2. Interest-only period ends (full amortization begins)
        const canCheckPrincipalMilestones =
            !isSelfBuild ||
            (isDrawdownComplete && month.month > interestOnlyEndMonth);

        // Check 25% paid off
        if (
            canCheckPrincipalMilestones &&
            !reachedMilestones.has("principal_25_percent") &&
            month.closingBalance <= threshold25
        ) {
            milestones.push({
                type: "principal_25_percent",
                month: month.month,
                date: month.date,
                label: MILESTONE_LABELS.principal_25_percent,
                value: month.closingBalance,
            });
            reachedMilestones.add("principal_25_percent");
        }

        // Check 50% paid off
        if (
            canCheckPrincipalMilestones &&
            !reachedMilestones.has("principal_50_percent") &&
            month.closingBalance <= threshold50
        ) {
            milestones.push({
                type: "principal_50_percent",
                month: month.month,
                date: month.date,
                label: MILESTONE_LABELS.principal_50_percent,
                value: month.closingBalance,
            });
            reachedMilestones.add("principal_50_percent");
        }

        // Check 75% paid off
        if (
            canCheckPrincipalMilestones &&
            !reachedMilestones.has("principal_75_percent") &&
            month.closingBalance <= threshold75
        ) {
            milestones.push({
                type: "principal_75_percent",
                month: month.month,
                date: month.date,
                label: MILESTONE_LABELS.principal_75_percent,
                value: month.closingBalance,
            });
            reachedMilestones.add("principal_75_percent");
        }

        // Check LTV below 80% (useful for removing mortgage insurance)
        if (
            canCheckPrincipalMilestones &&
            !reachedMilestones.has("ltv_80_percent") &&
            month.closingBalance <= ltv80Threshold &&
            mortgageAmount > ltv80Threshold // Only show if we started above 80% LTV
        ) {
            milestones.push({
                type: "ltv_80_percent",
                month: month.month,
                date: month.date,
                label: MILESTONE_LABELS.ltv_80_percent,
                value: month.closingBalance,
            });
            reachedMilestones.add("ltv_80_percent");
        }

        // Check mortgage complete (for self-build, only if drawdowns are fully allocated)
        if (
            (!isSelfBuild || isDrawdownComplete) &&
            !reachedMilestones.has("mortgage_complete") &&
            month.closingBalance <= 0.01
        ) {
            milestones.push({
                type: "mortgage_complete",
                month: month.month,
                date: month.date,
                label: MILESTONE_LABELS.mortgage_complete,
                value: 0,
            });
            reachedMilestones.add("mortgage_complete");
            break; // No more milestones after completion
        }
    }

    return milestones;
}

// Simulation completeness check
export interface SimulationCompleteness {
    isComplete: boolean;
    remainingBalance: number;
    coveredMonths: number;
    totalMonths: number;
    missingMonths: number;
}

export function calculateSimulationCompleteness(
    months: AmortizationMonth[],
    mortgageAmount: number,
    mortgageTermMonths: number,
): SimulationCompleteness {
    if (months.length === 0) {
        return {
            isComplete: false,
            remainingBalance: mortgageAmount,
            coveredMonths: 0,
            totalMonths: mortgageTermMonths,
            missingMonths: mortgageTermMonths,
        };
    }

    const lastMonth = months[months.length - 1];
    const remainingBalance = lastMonth.closingBalance;
    const isComplete = remainingBalance <= 0.01; // Consider complete if balance is essentially 0

    return {
        isComplete,
        remainingBalance,
        coveredMonths: months.length,
        totalMonths: mortgageTermMonths,
        missingMonths: Math.max(0, mortgageTermMonths - months.length),
    };
}

/**
 * Buffer suggestion: detected transitions where a 1-month variable buffer is recommended.
 */
export interface BufferSuggestion {
    afterIndex: number;
    fixedRate: MortgageRate;
    suggestedRate: MortgageRate;
    ltvAtEnd: number;
    lenderName: string;
    isTrailing?: boolean;
}

export function calculateBufferSuggestions(
    state: SimulationState,
    allRates: MortgageRate[],
    customRates: CustomRate[],
    resolvedPeriods: ResolvedRatePeriod[],
    amortizationSchedule: AmortizationMonth[],
): BufferSuggestion[] {
    const suggestions: BufferSuggestion[] = [];
    const propertyValue = state.input.propertyValue;

    if (resolvedPeriods.length === 0 || propertyValue <= 0) {
        return suggestions;
    }

    // Check transitions between periods (existing logic)
    for (let i = 0; i < resolvedPeriods.length - 1; i++) {
        const current = resolvedPeriods[i];
        const next = resolvedPeriods[i + 1];

        // Only suggest buffer after fixed periods
        if (current.type !== "fixed") continue;

        // Find the actual MortgageRate for the current fixed period
        const currentRate = current.isCustom
            ? customRates.find((r) => r.id === current.rateId)
            : allRates.find((r) => r.id === current.rateId);

        if (!currentRate) continue;

        // Calculate LTV at end of fixed period
        const endMonth = current.startMonth + current.durationMonths - 1;
        const monthData = amortizationSchedule.find(
            (m) => m.month === endMonth,
        );
        const balanceAtEnd =
            monthData?.closingBalance ?? state.input.mortgageAmount;
        const ltvAtEnd = (balanceAtEnd / propertyValue) * 100;

        // Find the natural follow-on rate for the current fixed period
        const naturalFollowOn = findVariableRate(
            currentRate as MortgageRate,
            allRates,
            ltvAtEnd,
            state.input.ber,
        );

        // If no natural follow-on found, we can't suggest a buffer
        if (!naturalFollowOn) continue;

        // Check if next period is the natural follow-on
        const isNaturalFollowOn =
            next.rateId === naturalFollowOn.id &&
            next.lenderId === naturalFollowOn.lenderId &&
            !next.isCustom;

        if (!isNaturalFollowOn) {
            suggestions.push({
                afterIndex: i,
                fixedRate: currentRate as MortgageRate,
                suggestedRate: naturalFollowOn,
                ltvAtEnd,
                lenderName: current.lenderName,
            });
        }
    }

    // Check if last period is fixed and mortgage is not fully covered (trailing suggestion)
    const lastPeriod = resolvedPeriods[resolvedPeriods.length - 1];
    if (
        lastPeriod.type === "fixed" &&
        lastPeriod.durationMonths > 0 // Not "until end" - mortgage not covered
    ) {
        // Find the actual MortgageRate for the last fixed period
        const lastRate = lastPeriod.isCustom
            ? customRates.find((r) => r.id === lastPeriod.rateId)
            : allRates.find((r) => r.id === lastPeriod.rateId);

        if (lastRate) {
            // Calculate LTV at end of fixed period
            const endMonth =
                lastPeriod.startMonth + lastPeriod.durationMonths - 1;
            const monthData = amortizationSchedule.find(
                (m) => m.month === endMonth,
            );
            const balanceAtEnd =
                monthData?.closingBalance ?? state.input.mortgageAmount;
            const ltvAtEnd = (balanceAtEnd / propertyValue) * 100;

            // Find the natural follow-on rate
            const naturalFollowOn = findVariableRate(
                lastRate as MortgageRate,
                allRates,
                ltvAtEnd,
                state.input.ber,
            );

            if (naturalFollowOn) {
                suggestions.push({
                    afterIndex: resolvedPeriods.length - 1,
                    fixedRate: lastRate as MortgageRate,
                    suggestedRate: naturalFollowOn,
                    ltvAtEnd,
                    lenderName: lastPeriod.lenderName,
                    isTrailing: true,
                });
            }
        }
    }

    return suggestions;
}
