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
import { RatesTrendCharts } from "./RatesTrendCharts";

/**
 * Island wrapper for Trend Charts tab.
 * Only renders when the "trends" tab is active and data is loaded.
 * Loading/error states are handled by HistoryTabsIsland.
 */
export function RatesTrendChartsIsland() {
	// Initialize filters synchronously so the correct tab check works on first render
	initializeHistoryFilters();

	const activeTab = useStore($historyActiveTab);
	const { loading, error, historyData, lenders } = useStore($historyDataState);

	// Load data on mount
	useEffect(() => {
		loadHistoryData();
	}, []);

	// Don't render if not active, loading, error, or no data
	if (activeTab !== "trends" || loading || error || historyData.size === 0) {
		return null;
	}

	return <RatesTrendCharts historyData={historyData} lenders={lenders} />;
}
