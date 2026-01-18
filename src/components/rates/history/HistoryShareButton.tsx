import { useStore } from "@nanostores/react";
import { useCallback } from "react";
import { ShareButton } from "@/components/ShareButton";
import {
	generateHistoryShareUrl,
	type HistoryShareState,
} from "@/lib/share/rates-history";
import {
	$compareFilter,
	$compareSelectedLender,
	$comparisonDate,
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
	const compareFilter = useStore($compareFilter);
	const trendsFilter = useStore($trendsFilter);
	const trendsSelectedLenders = useStore($trendsSelectedLenders);
	const compareSelectedLender = useStore($compareSelectedLender);

	const handleShare = useCallback(async () => {
		const state: HistoryShareState = {
			activeTab,
			updatesFilter,
			comparisonDate,
			compareFilter,
			trendsFilter,
			trendsSelectedLenders,
			compareSelectedLender,
		};
		return generateHistoryShareUrl(state);
	}, [
		activeTab,
		updatesFilter,
		comparisonDate,
		compareFilter,
		trendsFilter,
		trendsSelectedLenders,
		compareSelectedLender,
	]);

	return <ShareButton onShare={handleShare} responsive />;
}
