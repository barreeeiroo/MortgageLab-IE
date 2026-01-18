import { useStore } from "@nanostores/react";
import { useCallback } from "react";
import { ShareButton } from "@/components/ShareButton";
import {
	generateHistoryShareUrl,
	type HistoryShareState,
} from "@/lib/share/rates-history";
import {
	$changesFilter,
	$changesSelectedLender,
	$comparisonDate,
	$comparisonEndDate,
	$historyActiveTab,
	$trendsFilter,
	$trendsSelectedLenders,
	$updatesFilter,
} from "@/lib/stores/rates/rates-history-filters";

/**
 * Share button for the history page.
 * Collects all filter state and generates a shareable URL.
 */
export function HistoryShareButton() {
	const activeTab = useStore($historyActiveTab);
	const updatesFilter = useStore($updatesFilter);
	const comparisonDate = useStore($comparisonDate);
	const comparisonEndDate = useStore($comparisonEndDate);
	const changesFilter = useStore($changesFilter);
	const trendsFilter = useStore($trendsFilter);
	const trendsSelectedLenders = useStore($trendsSelectedLenders);
	const changesSelectedLender = useStore($changesSelectedLender);

	const handleShare = useCallback(async () => {
		const state: HistoryShareState = {
			activeTab,
			updatesFilter,
			comparisonDate,
			comparisonEndDate,
			changesFilter,
			trendsFilter,
			trendsSelectedLenders,
			changesSelectedLender,
		};
		return generateHistoryShareUrl(state);
	}, [
		activeTab,
		updatesFilter,
		comparisonDate,
		comparisonEndDate,
		changesFilter,
		trendsFilter,
		trendsSelectedLenders,
		changesSelectedLender,
	]);

	return <ShareButton onShare={handleShare} responsive />;
}
