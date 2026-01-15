import { useStore } from "@nanostores/react";
import { useCallback, useEffect, useState } from "react";
import {
	exportCompareToExcel,
	exportCompareToPDF,
} from "@/lib/export/compare-export";
import type { ChartImageData } from "@/lib/export/simulate-export";
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
import {
	$compareSimulationData,
	$compareSummaryMetrics,
} from "@/lib/stores/simulate/simulate-compare-calculations";
import { requestCompareChartCapture } from "@/lib/stores/simulate/simulate-compare-chart-capture";
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
	const summaryMetrics = useStore($compareSummaryMetrics);
	const customRates = useStore($storedCustomRates);
	const [initialized, setInitialized] = useState(false);
	const [isExporting, setIsExporting] = useState(false);

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

	const handleShare = useCallback(async () => {
		return generateCompareShareUrl(compareSimulations, customRates);
	}, [compareSimulations, customRates]);

	const handleClose = () => {
		navigateToSimulate();
	};

	const canExport = compareData.length >= 2;

	const handleExportExcel = useCallback(async () => {
		if (!canExport) return;
		setIsExporting(true);
		try {
			await exportCompareToExcel({
				simulations: compareData,
				summaryMetrics,
			});
		} finally {
			setIsExporting(false);
		}
	}, [compareData, summaryMetrics, canExport]);

	const handleExportPDF = useCallback(async () => {
		if (!canExport) return;
		setIsExporting(true);
		try {
			const shareUrl = await handleShare();
			await exportCompareToPDF({
				simulations: compareData,
				summaryMetrics,
				shareUrl,
			});
		} finally {
			setIsExporting(false);
		}
	}, [compareData, summaryMetrics, canExport, handleShare]);

	const handleExportPDFWithCharts = useCallback(async () => {
		if (!canExport) return;
		setIsExporting(true);

		const shareUrl = await handleShare();

		// Request chart capture - the callback will be called with the images
		requestCompareChartCapture(async (chartImages: ChartImageData[]) => {
			try {
				await exportCompareToPDF({
					simulations: compareData,
					summaryMetrics,
					chartImages,
					shareUrl,
				});
			} finally {
				setIsExporting(false);
			}
		});
	}, [compareData, summaryMetrics, canExport, handleShare]);

	// Don't render until initialized
	if (!initialized) return null;

	// Don't render if validation fails (will redirect)
	if (!compareValidation.isValid) return null;

	return (
		<SimulateCompareHeader
			simulationCount={compareData.length}
			onShare={handleShare}
			onClose={handleClose}
			onExportExcel={handleExportExcel}
			onExportPDF={handleExportPDF}
			onExportPDFWithCharts={handleExportPDFWithCharts}
			isExporting={isExporting}
			canExport={canExport}
		/>
	);
}
