import { useStore } from "@nanostores/react";
import { useCallback, useEffect } from "react";
import type { StoredCustomPerk } from "@/lib/stores/custom-perks";
import {
    $storedCustomPerks,
    addCustomPerk,
    initializeCustomPerks,
    removeCustomPerk,
    updateCustomPerk,
} from "@/lib/stores/custom-perks";
import {
    $customLenders,
    $storedCustomRates,
    addCustomRate,
    initializeCustomRates,
    removeCustomRate,
    type StoredCustomRate,
    updateCustomRate,
} from "@/lib/stores/custom-rates";
import { $lenders } from "@/lib/stores/lenders";
import { $perks } from "@/lib/stores/perks";
import { $formValues } from "@/lib/stores/rates/rates-form";
import { ManageCustomRatesDialog } from "./ManageCustomRatesDialog";

export function CustomRatesIsland() {
    const lenders = useStore($lenders);
    const customLenders = useStore($customLenders);
    const storedCustomRates = useStore($storedCustomRates);
    const storedCustomPerks = useStore($storedCustomPerks);
    const perks = useStore($perks);
    const formValues = useStore($formValues);

    useEffect(() => {
        initializeCustomRates();
        initializeCustomPerks();
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

    const handleAddPerk = useCallback((perk: StoredCustomPerk) => {
        addCustomPerk(perk);
    }, []);

    const handleUpdatePerk = useCallback((perk: StoredCustomPerk) => {
        updateCustomPerk(perk);
    }, []);

    const handleDeletePerk = useCallback((perkId: string) => {
        removeCustomPerk(perkId);
    }, []);

    return (
        <ManageCustomRatesDialog
            customRates={storedCustomRates}
            lenders={lenders}
            customLenders={customLenders}
            perks={perks}
            customPerks={storedCustomPerks}
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
            onAddPerk={handleAddPerk}
            onUpdatePerk={handleUpdatePerk}
            onDeletePerk={handleDeletePerk}
        />
    );
}
