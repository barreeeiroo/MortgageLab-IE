import { useStore } from "@nanostores/react";
import {
	$compareMonthlyChartData,
	$compareSimulationData,
	$compareYearlyChartData,
} from "@/lib/stores/simulate/simulate-compare-calculations";
import { SimulateCompareTable } from "./SimulateCompareTable";

/**
 * Island component for comparison table
 */
export function CompareTableIsland() {
	const compareData = useStore($compareSimulationData);
	const yearlyData = useStore($compareYearlyChartData);
	const monthlyData = useStore($compareMonthlyChartData);

	// Don't render if no data
	if (compareData.length === 0) return null;

	return (
		<div className="mt-6">
			<SimulateCompareTable
				simulations={compareData}
				yearlyData={yearlyData}
				monthlyData={monthlyData}
			/>
		</div>
	);
}
