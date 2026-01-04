export function formatCurrency(
	value: number,
	options?: { showCents?: boolean },
): string {
	return new Intl.NumberFormat("en-IE", {
		style: "currency",
		currency: "EUR",
		minimumFractionDigits: options?.showCents ? 2 : 0,
		maximumFractionDigits: options?.showCents ? 2 : 0,
	}).format(value);
}

export function formatCurrencyInput(value: string): string {
	const num = Number.parseInt(value.replace(/[^0-9]/g, ""), 10);
	if (Number.isNaN(num) || num === 0) return "";
	return new Intl.NumberFormat("en-IE", {
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
