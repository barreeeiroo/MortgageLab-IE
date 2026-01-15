import { useStore } from "@nanostores/react";
import { $compareSimulationData } from "@/lib/stores/simulate/simulate-compare-calculations";
import { SimulateCompareTable } from "./SimulateCompareTable";

/**
 * Island component for comparison table
 */
export function CompareTableIsland() {
	const compareData = useStore($compareSimulationData);

	// Don't render if no data
	if (compareData.length === 0) return null;

	return (
		<div className="mt-6">
			<SimulateCompareTable simulations={compareData} />
		</div>
	);
}
