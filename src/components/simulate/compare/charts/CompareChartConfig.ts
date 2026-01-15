import type { ChartConfig } from "@/components/ui/chart";
import type { CompareSimulationData } from "@/lib/stores/simulate/simulate-compare-calculations";
import { formatCurrency, formatCurrencyShort } from "@/lib/utils/currency";

/**
 * Create a dynamic chart config based on the simulations being compared
 */
export function createCompareChartConfig(
	simulations: CompareSimulationData[],
): ChartConfig {
	const config: ChartConfig = {};

	for (const sim of simulations) {
		config[`${sim.id}_balance`] = {
			label: `${sim.name} - Balance`,
			color: sim.color,
		};
		config[`${sim.id}_interest`] = {
			label: `${sim.name} - Interest`,
			color: sim.color,
		};
		config[`${sim.id}_principal`] = {
			label: `${sim.name} - Principal`,
			color: sim.color,
		};
		config[`${sim.id}_total`] = {
			label: `${sim.name} - Total`,
			color: sim.color,
		};
		config[`${sim.id}_payment`] = {
			label: `${sim.name} - Payment`,
			color: sim.color,
		};
	}

	return config;
}

// Shared animation duration
export const ANIMATION_DURATION = 400;

// Currency formatters (values are in cents, divide by 100)
export function formatChartCurrency(value: number): string {
	return formatCurrency(value / 100, { showCents: false });
}

export function formatChartCurrencyShort(value: number): string {
	return formatCurrencyShort(value / 100);
}

// Format percentage (for rate timeline)
export function formatPercentage(value: number): string {
	return `${value.toFixed(2)}%`;
}

// Format term (months to years/months)
export function formatTerm(months: number): string {
	const years = Math.floor(months / 12);
	const remainingMonths = months % 12;
	if (remainingMonths === 0) return `${years}y`;
	return `${years}y ${remainingMonths}m`;
}
