import { useStore } from "@nanostores/react";
import { useEffect, useState } from "react";
import { generateCompareShareUrl } from "@/lib/share/simulate-compare";
import {
	$storedCustomRates,
	initializeCustomRates,
} from "@/lib/stores/custom-rates";
import { fetchRatesData } from "@/lib/stores/rates";
import {
	$compareSimulations,
	$compareValidation,
	initializeCompareState,
	navigateToSimulate,
} from "@/lib/stores/simulate/simulate-compare";
import { $compareSimulationData } from "@/lib/stores/simulate/simulate-compare-calculations";
import { initializeSavedSimulations } from "@/lib/stores/simulate/simulate-saves";
import { SimulateCompareHeader } from "./SimulateCompareHeader";

/**
 * Island component for the compare header
 * Handles initialization and redirects if comparison is invalid
 */
export function CompareHeaderIsland() {
	const compareSimulations = useStore($compareSimulations);
	const compareValidation = useStore($compareValidation);
	const compareData = useStore($compareSimulationData);
	const customRates = useStore($storedCustomRates);
	const [initialized, setInitialized] = useState(false);

	// Initialize on mount
	useEffect(() => {
		async function initialize() {
			// Initialize custom rates and saved simulations
			initializeCustomRates();
			initializeSavedSimulations();
			initializeCompareState();

			// Wait for rate data to load (needed for calculations)
			await fetchRatesData();

			setInitialized(true);
		}
		initialize();
	}, []);

	// Redirect to simulate page if comparison is invalid
	useEffect(() => {
		if (initialized && !compareValidation.isValid) {
			navigateToSimulate();
		}
	}, [initialized, compareValidation.isValid]);

	// Don't render until initialized
	if (!initialized) return null;

	// Don't render if validation fails (will redirect)
	if (!compareValidation.isValid) return null;

	const handleShare = async () => {
		return generateCompareShareUrl(compareSimulations, customRates);
	};

	const handleClose = () => {
		navigateToSimulate();
	};

	return (
		<SimulateCompareHeader
			simulationCount={compareData.length}
			onShare={handleShare}
			onClose={handleClose}
		/>
	);
}
