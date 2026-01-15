import { useStore } from "@nanostores/react";
import { useState } from "react";
import { $compareValidation } from "@/lib/stores/simulate/simulate-compare";
import {
	$compareSimulationData,
	$compareSummaryMetrics,
	type CompareSimulationData,
} from "@/lib/stores/simulate/simulate-compare-calculations";
import { SimulateCompareSummary } from "./SimulateCompareSummary";
import { SimulateCompareWarning } from "./SimulateCompareWarning";
import { SimulationDetailSheet } from "./SimulationDetailSheet";

/**
 * Island component for compare summary cards and metrics
 */
export function CompareSummaryIsland() {
	const compareData = useStore($compareSimulationData);
	const summaryMetrics = useStore($compareSummaryMetrics);
	const compareValidation = useStore($compareValidation);
	const [selectedSimulation, setSelectedSimulation] =
		useState<CompareSimulationData | null>(null);

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
				onSimulationClick={setSelectedSimulation}
			/>

			{/* Simulation Detail Sheet */}
			<SimulationDetailSheet
				simulation={selectedSimulation}
				open={selectedSimulation !== null}
				onOpenChange={(open) => !open && setSelectedSimulation(null)}
			/>
		</>
	);
}
