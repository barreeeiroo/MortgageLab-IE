import { useStore } from "@nanostores/react";
import { $compareValidation } from "@/lib/stores/simulate/simulate-compare";
import {
	$compareSimulationData,
	$compareSummaryMetrics,
} from "@/lib/stores/simulate/simulate-compare-calculations";
import { SimulateCompareSummary } from "./SimulateCompareSummary";
import { SimulateCompareWarning } from "./SimulateCompareWarning";

/**
 * Island component for compare summary cards and metrics
 */
export function CompareSummaryIsland() {
	const compareData = useStore($compareSimulationData);
	const summaryMetrics = useStore($compareSummaryMetrics);
	const compareValidation = useStore($compareValidation);

	// Don't render if no data (header will handle redirect)
	if (compareData.length === 0) return null;

	return (
		<>
			{/* Warnings */}
			{compareValidation.warnings.length > 0 && (
				<SimulateCompareWarning
					errors={[]}
					warnings={compareValidation.warnings}
				/>
			)}

			{/* Summary Cards and Metrics Table */}
			<SimulateCompareSummary
				simulations={compareData}
				summaryMetrics={summaryMetrics}
			/>
		</>
	);
}
