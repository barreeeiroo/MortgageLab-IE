import type { ChartConfig } from "@/components/ui/chart";
import {
	formatChartCurrency as _formatChartCurrency,
	formatChartCurrencyShort as _formatChartCurrencyShort,
	CHART_ANIMATION_DURATION,
	formatChartPercentage,
	formatChartTerm,
} from "@/lib/utils/chart";
import type { CompareSimulationData } from "../../types";

// Re-export shared constants and formatters
export const ANIMATION_DURATION = CHART_ANIMATION_DURATION;

// Chart formatters - these use the shared cents-based formatters from @/lib/utils/chart
export const formatChartCurrency = _formatChartCurrency;
export const formatChartCurrencyShort = _formatChartCurrencyShort;
export const formatPercentage = formatChartPercentage;
export const formatTerm = formatChartTerm;

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
