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
