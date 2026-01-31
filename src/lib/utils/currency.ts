import { LOCALE } from "@/lib/constants/site";

export function formatCurrency(
    value: number,
    options?: { showCents?: boolean },
): string {
    return new Intl.NumberFormat(LOCALE, {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: options?.showCents ? 2 : 0,
        maximumFractionDigits: options?.showCents ? 2 : 0,
    }).format(value);
}

export function formatCurrencyInput(
    value: string,
    options?: { allowZero?: boolean },
): string {
    const num = Number.parseInt(value.replace(/[^0-9]/g, ""), 10);
    if (Number.isNaN(num)) return "";
    if (num === 0 && !options?.allowZero) return "";
    return new Intl.NumberFormat(LOCALE, {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
    }).format(num);
}

export function parseCurrency(value: string): number {
    const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ""));
    return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Format currency in compact form (e.g., €100k, €1.5M)
 */
export function formatCurrencyShort(value: number): string {
    if (value >= 1000000) {
        return `€${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
        return `€${(value / 1000).toFixed(0)}k`;
    }
    return `€${value.toFixed(0)}`;
}

/**
 * Format currency from cents.
 * Convenience wrapper for values stored in cents (×100).
 *
 * @param cents - Amount in cents (×100)
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export function formatCurrencyFromCents(
    cents: number,
    options?: { showCents?: boolean },
): string {
    return formatCurrency(cents / 100, options);
}

/**
 * Format a number with thousand separators.
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted number string (e.g., "1,234" or "1,234.56")
 */
export function formatNumber(value: number, decimals = 0): string {
    return new Intl.NumberFormat(LOCALE, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
}
