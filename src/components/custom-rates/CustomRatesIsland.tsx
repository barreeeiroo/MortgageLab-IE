import { useStore } from "@nanostores/react";
import { useCallback, useEffect } from "react";
import {
	$customLenders,
	$formValues,
	$lenders,
	$perks,
	$storedCustomRates,
	addCustomRate,
	initializeCustomRates,
	removeCustomRate,
	type StoredCustomRate,
	updateCustomRate,
} from "@/lib/stores";
import { ManageCustomRatesDialog } from "./ManageCustomRatesDialog";

export function CustomRatesIsland() {
	const lenders = useStore($lenders);
	const customLenders = useStore($customLenders);
	const storedCustomRates = useStore($storedCustomRates);
	const perks = useStore($perks);
	const formValues = useStore($formValues);

	useEffect(() => {
		initializeCustomRates();
	}, []);

	const handleAddRate = useCallback((rate: StoredCustomRate) => {
		addCustomRate(rate);
	}, []);

	const handleUpdateRate = useCallback((rate: StoredCustomRate) => {
		updateCustomRate(rate);
	}, []);

	const handleDeleteRate = useCallback((rateId: string) => {
		removeCustomRate(rateId);
	}, []);

	return (
		<ManageCustomRatesDialog
			customRates={storedCustomRates}
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
			onAddRate={handleAddRate}
			onUpdateRate={handleUpdateRate}
			onDeleteRate={handleDeleteRate}
		/>
	);
}
