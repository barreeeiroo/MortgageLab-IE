import { useStore } from "@nanostores/react";
import { useCallback, useEffect } from "react";
import {
	$customLenders,
	$formValues,
	$lenders,
	$perks,
	addCustomRate,
	initializeCustomRates,
	type StoredCustomRate,
} from "@/lib/stores";
import { AddCustomRateDialog } from "./AddCustomRateDialog";

export function CustomRatesIsland() {
	const lenders = useStore($lenders);
	const customLenders = useStore($customLenders);
	const perks = useStore($perks);
	const formValues = useStore($formValues);

	useEffect(() => {
		initializeCustomRates();
	}, []);

	const handleAddCustomRate = useCallback((rate: StoredCustomRate) => {
		addCustomRate(rate);
	}, []);

	return (
		<AddCustomRateDialog
			lenders={lenders}
			customLenders={customLenders}
			perks={perks}
			currentBuyerType={
				formValues.buyerType as
					| "ftb"
					| "mover"
					| "btl"
					| "switcher-pdh"
					| "switcher-btl"
			}
			onAddRate={handleAddCustomRate}
		/>
	);
}
