import { useStore } from "@nanostores/react";
import { useEffect } from "react";
import {
	clearSimulateShareParam,
	copyShareUrl,
	hasSimulateShareParam,
	parseSimulateShareState,
} from "@/lib/share/simulate";
import {
	$storedCustomRates,
	addCustomRate,
	initializeCustomRates,
} from "@/lib/stores/custom-rates";
import { fetchRatesData } from "@/lib/stores/rates";
import { $simulationCompleteness } from "@/lib/stores/simulate/simulate-calculations";
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

	// Initialize stores on mount
	useEffect(() => {
		initializeCustomRates();
		fetchRatesData();

		// Check for share URL first
		if (hasSimulateShareParam()) {
			const parsed = parseSimulateShareState();
			if (parsed) {
				// Import embedded custom rates (skip if already exists)
				const existingIds = new Set($storedCustomRates.get().map((r) => r.id));
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
		return copyShareUrl(simulationState, customRates);
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
			onReset={resetSimulation}
			onShare={handleShare}
		/>
	);
}
