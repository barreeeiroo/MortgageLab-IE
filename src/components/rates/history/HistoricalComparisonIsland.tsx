import { useStore } from "@nanostores/react";
import { useEffect } from "react";
import {
	$historyDataState,
	loadHistoryData,
} from "@/lib/stores/rates/rates-history-data";
import {
	$historyActiveTab,
	initializeHistoryFilters,
} from "@/lib/stores/rates/rates-history-filters";
import { HistoricalComparison } from "./HistoricalComparison";

/**
 * Island wrapper for Historical Comparison tab.
 * Only renders when the "compare" tab is active and data is loaded.
 * Loading/error states are handled by HistoryTabsIsland.
 */
export function HistoricalComparisonIsland() {
	// Initialize filters synchronously so the correct tab check works on first render
	initializeHistoryFilters();

	const activeTab = useStore($historyActiveTab);
	const { loading, error, historyData, lenders } = useStore($historyDataState);

	// Load data on mount
	useEffect(() => {
		loadHistoryData();
	}, []);

	// Don't render if not active, loading, error, or no data
	if (activeTab !== "compare" || loading || error || historyData.size === 0) {
		return null;
	}

	return <HistoricalComparison historyData={historyData} lenders={lenders} />;
}
