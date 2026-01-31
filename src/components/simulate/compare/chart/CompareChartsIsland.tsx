import { useStore } from "@nanostores/react";
import {
    $compareMonthlyChartData,
    $compareQuarterlyChartData,
    $compareSimulationData,
    $compareYearlyChartData,
} from "@/lib/stores/simulate/simulate-compare-calculations";
import { SimulateCompareCharts } from "./SimulateCompareCharts";

/**
 * Island component for comparison charts
 */
export function CompareChartsIsland() {
    const compareData = useStore($compareSimulationData);
    const yearlyChartData = useStore($compareYearlyChartData);
    const quarterlyChartData = useStore($compareQuarterlyChartData);
    const monthlyChartData = useStore($compareMonthlyChartData);

    // Don't render if no data
    if (compareData.length === 0) return null;

    return (
        <div className="mt-6">
            <SimulateCompareCharts
                simulations={compareData}
                yearlyData={yearlyChartData}
                quarterlyData={quarterlyChartData}
                monthlyData={monthlyChartData}
            />
        </div>
    );
}
