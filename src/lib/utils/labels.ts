import type { MortgageRate } from "@/lib/schemas/rate";

/**
 * Generate a standard rate period label
 * Format: "{Lender} {Term}-Year Fixed @ {Rate}%" or "{Lender} Variable @ {Rate}%"
 * With optional cycle info: "(Cycle N)" or "(Variable Buffer, Cycle N)"
 */
export function generateRateLabel(
    lenderName: string,
    rate: MortgageRate,
    cycleInfo?: { cycle: number; isBuffer?: boolean },
): string {
    const rateStr = `${rate.rate.toFixed(2)}%`;
    const typeName =
        rate.type === "fixed" && rate.fixedTerm
            ? `${rate.fixedTerm}-Year Fixed`
            : "Variable";

    const baseLabel = `${lenderName} ${typeName} @ ${rateStr}`;

    if (!cycleInfo) {
        return baseLabel;
    }

    if (cycleInfo.isBuffer) {
        return `${baseLabel} (Variable Buffer, Cycle ${cycleInfo.cycle})`;
    }

    return `${baseLabel} (Cycle ${cycleInfo.cycle})`;
}

/**
 * Generate a variable buffer label (without cycle number)
 * Used for "until end" variable periods that serve as buffers
 * Format: "{Lender} Variable @ {Rate}% (Variable Buffer)"
 */
export function generateVariableBufferLabel(
    lenderName: string,
    rate: MortgageRate,
): string {
    const rateStr = `${rate.rate.toFixed(2)}%`;
    return `${lenderName} Variable @ ${rateStr} (Variable Buffer)`;
}
