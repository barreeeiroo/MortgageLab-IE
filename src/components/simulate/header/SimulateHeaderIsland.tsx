import { useStore } from "@nanostores/react";
import { useEffect } from "react";
import {
    clearSimulateShareParam,
    generateSimulateShareUrl,
    hasSimulateShareParam,
    parseSimulateShareState,
} from "@/lib/share/simulate";
import {
    $storedCustomRates,
    addCustomRate,
    initializeCustomRates,
} from "@/lib/stores/custom-rates";
import { fetchRatesData } from "@/lib/stores/rates/rates-state";
import {
    $resolvedRatePeriods,
    $simulationCompleteness,
    $simulationSummary,
    $yearlySchedule,
} from "@/lib/stores/simulate/simulate-calculations";
import { initializeCompareState } from "@/lib/stores/simulate/simulate-compare";
import { initializeSavedSimulations } from "@/lib/stores/simulate/simulate-saves";
import {
    $hasRequiredData,
    $simulationState,
    initializeSimulation,
    markInitialized,
    resetSimulation,
    setSimulationState,
} from "@/lib/stores/simulate/simulate-state";
import { SimulateHeader } from "./SimulateHeader";

export function SimulateHeaderIsland() {
    const simulationState = useStore($simulationState);
    const hasRequiredData = useStore($hasRequiredData);
    const customRates = useStore($storedCustomRates);
    const completeness = useStore($simulationCompleteness);
    const yearlySchedule = useStore($yearlySchedule);
    const summary = useStore($simulationSummary);
    const ratePeriods = useStore($resolvedRatePeriods);

    // Initialize stores on mount
    useEffect(() => {
        initializeCustomRates();
        initializeSavedSimulations();
        initializeCompareState();
        fetchRatesData();

        // Check for share URL first
        if (hasSimulateShareParam()) {
            const parsed = parseSimulateShareState();
            if (parsed) {
                // Import embedded custom rates (skip if already exists)
                const existingIds = new Set(
                    $storedCustomRates.get().map((r) => r.id),
                );
                for (const rate of parsed.embeddedCustomRates) {
                    if (!existingIds.has(rate.id)) {
                        addCustomRate(rate);
                    }
                }

                // Set the simulation state
                setSimulationState(parsed.state);
                markInitialized();
                clearSimulateShareParam();
                return;
            }
        }

        // Otherwise load from localStorage
        initializeSimulation();
        markInitialized();
    }, []);

    const handleShare = async () => {
        return generateSimulateShareUrl(simulationState, customRates);
    };

    return (
        <SimulateHeader
            hasRequiredData={hasRequiredData}
            mortgageAmount={simulationState.input.mortgageAmount}
            mortgageTermMonths={simulationState.input.mortgageTermMonths}
            propertyValue={simulationState.input.propertyValue}
            ber={simulationState.input.ber}
            ratePeriodCount={simulationState.ratePeriods.length}
            overpaymentCount={simulationState.overpaymentConfigs.length}
            completeness={completeness}
            yearlySchedule={yearlySchedule}
            summary={summary}
            ratePeriods={ratePeriods}
            overpaymentConfigs={simulationState.overpaymentConfigs}
            selfBuildConfig={simulationState.selfBuildConfig}
            onReset={resetSimulation}
            onShare={handleShare}
        />
    );
}
