import { useStore } from "@nanostores/react";
import {
	AlertTriangle,
	Banknote,
	CalendarClock,
	Download,
	GitCompare,
	Home,
	Leaf,
	LineChart,
	Percent,
	PiggyBank,
	RotateCcw,
} from "lucide-react";
import { useCallback, useState } from "react";
import { ShareButton } from "@/components/ShareButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { BerRating } from "@/lib/constants/ber";
import {
	type ChartImageData,
	exportSimulationToExcel,
	exportSimulationToPDF,
} from "@/lib/export/simulate-export";
import type { SimulationCompleteness } from "@/lib/mortgage/simulation";
import type {
	AmortizationYear,
	OverpaymentConfig,
	ResolvedRatePeriod,
	SelfBuildConfig,
	SimulationSummary,
} from "@/lib/schemas/simulate";
import { requestChartCapture } from "@/lib/stores/simulate/simulate-chart-capture";
import {
	$hasValidComparison,
	navigateToCompare,
} from "@/lib/stores/simulate/simulate-compare";
import { $savedSimulations } from "@/lib/stores/simulate/simulate-saves";
import { formatCurrency, formatCurrencyShort } from "@/lib/utils/currency";
import { formatTermDisplay } from "@/lib/utils/term";
import { SimulateCompareSelectDialog } from "../compare/SimulateCompareSelectDialog";
import { SimulateSavesDropdown } from "./SimulateSavesDropdown";

interface SimulateHeaderProps {
	hasRequiredData: boolean;
	mortgageAmount: number;
	mortgageTermMonths: number;
	propertyValue: number;
	ber: BerRating;
	ratePeriodCount: number;
	overpaymentCount: number;
	completeness: SimulationCompleteness;
	// Export data
	yearlySchedule: AmortizationYear[];
	summary: SimulationSummary | null;
	ratePeriods: ResolvedRatePeriod[];
	overpaymentConfigs: OverpaymentConfig[];
	selfBuildConfig?: SelfBuildConfig;
	// Callbacks
	onReset: () => void;
	onShare: () => Promise<string>;
}

export function SimulateHeader({
	hasRequiredData,
	mortgageAmount,
	mortgageTermMonths,
	propertyValue,
	ber,
	ratePeriodCount,
	overpaymentCount,
	completeness,
	yearlySchedule,
	summary,
	ratePeriods,
	overpaymentConfigs,
	selfBuildConfig,
	onReset,
	onShare,
}: SimulateHeaderProps) {
	const [isExporting, setIsExporting] = useState(false);
	const [compareDialogOpen, setCompareDialogOpen] = useState(false);
	const savedSimulations = useStore($savedSimulations);
	const hasValidComparison = useStore($hasValidComparison);

	// Can compare if there's at least 1 saved simulation (current counts as the other one)
	const canCompare = savedSimulations.length >= 1;

	const handleCompare = () => {
		if (hasValidComparison) {
			// Already have selections, navigate directly
			navigateToCompare();
		} else {
			// Open dialog for selection
			setCompareDialogOpen(true);
		}
	};

	// Calculate LTV
	const ltv = propertyValue > 0 ? (mortgageAmount / propertyValue) * 100 : 0;

	const canExport =
		hasRequiredData && summary !== null && yearlySchedule.length > 0;

	const handleExportExcel = useCallback(async () => {
		if (!summary) return;
		setIsExporting(true);
		try {
			await exportSimulationToExcel({
				mortgageAmount,
				mortgageTerm: mortgageTermMonths,
				propertyValue,
				yearlySchedule,
				summary,
				ratePeriods,
				overpaymentConfigs,
				selfBuildConfig,
			});
		} finally {
			setIsExporting(false);
		}
	}, [
		mortgageAmount,
		mortgageTermMonths,
		propertyValue,
		yearlySchedule,
		summary,
		ratePeriods,
		overpaymentConfigs,
		selfBuildConfig,
	]);

	const handleExportPDF = useCallback(async () => {
		if (!summary) return;
		setIsExporting(true);
		try {
			const shareUrl = await onShare();
			await exportSimulationToPDF({
				mortgageAmount,
				mortgageTerm: mortgageTermMonths,
				propertyValue,
				yearlySchedule,
				summary,
				ratePeriods,
				overpaymentConfigs,
				selfBuildConfig,
				shareUrl,
			});
		} finally {
			setIsExporting(false);
		}
	}, [
		mortgageAmount,
		mortgageTermMonths,
		propertyValue,
		yearlySchedule,
		summary,
		ratePeriods,
		overpaymentConfigs,
		selfBuildConfig,
		onShare,
	]);

	const handleExportPDFWithCharts = useCallback(async () => {
		if (!summary) return;
		setIsExporting(true);

		// Generate share URL before requesting chart capture
		const shareUrl = await onShare();

		// Request chart capture - the callback will be called with the images
		requestChartCapture(async (chartImages: ChartImageData[]) => {
			try {
				await exportSimulationToPDF({
					mortgageAmount,
					mortgageTerm: mortgageTermMonths,
					propertyValue,
					yearlySchedule,
					summary,
					ratePeriods,
					overpaymentConfigs,
					selfBuildConfig,
					chartImages,
					shareUrl,
				});
			} finally {
				setIsExporting(false);
			}
		});
	}, [
		mortgageAmount,
		mortgageTermMonths,
		propertyValue,
		yearlySchedule,
		summary,
		ratePeriods,
		overpaymentConfigs,
		selfBuildConfig,
		onShare,
	]);

	return (
		<div className="space-y-4">
			{/* Page Header */}
			{/* Page title - always visible */}
			<div className="flex items-start gap-3">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
					<LineChart className="h-5 w-5 text-primary" />
				</div>
				<div>
					<h1 className="text-xl font-semibold">Mortgage Simulator</h1>
					<p className="text-muted-foreground text-sm">
						Simulate your mortgage with different rates, overpayments, and
						scenarios.
					</p>
				</div>
			</div>

			{/* Action buttons - only when simulation is active */}
			{hasRequiredData && (
				<div className="flex flex-wrap items-center justify-between gap-2">
					{/* Left: State actions */}
					<div className="flex items-center gap-2">
						<SimulateSavesDropdown />
						<div className="border-l h-6" />
						<Button
							variant="ghost"
							size="sm"
							className="gap-1.5"
							onClick={onReset}
						>
							<RotateCcw className="h-4 w-4" />
							<span className="hidden sm:inline">Reset</span>
						</Button>
					</div>

					{/* Right: Output + Compare */}
					<div className="flex items-center gap-2">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className="gap-1.5"
									disabled={!canExport || isExporting}
								>
									<Download className="h-4 w-4" />
									<span className="hidden sm:inline">
										{isExporting ? "Exporting..." : "Export"}
									</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={handleExportExcel}>
									Export as Excel
								</DropdownMenuItem>
								<DropdownMenuItem onClick={handleExportPDF}>
									Export as PDF
								</DropdownMenuItem>
								<DropdownMenuItem onClick={handleExportPDFWithCharts}>
									Export as PDF (with charts)
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
						<ShareButton onShare={onShare} responsive />
						<div className="border-l h-6" />
						{canCompare ? (
							<Button
								variant="outline"
								size="sm"
								className="gap-1.5"
								onClick={handleCompare}
							>
								<GitCompare className="h-4 w-4" />
								Compare
							</Button>
						) : (
							<Tooltip>
								<TooltipTrigger asChild>
									<span>
										<Button
											variant="outline"
											size="sm"
											className="gap-1.5"
											disabled
										>
											<GitCompare className="h-4 w-4" />
											Compare
										</Button>
									</span>
								</TooltipTrigger>
								<TooltipContent>
									Save at least 1 simulation to compare
								</TooltipContent>
							</Tooltip>
						)}
					</div>
				</div>
			)}

			{/* Summary when data is present */}
			{hasRequiredData && (
				<Card className="py-4">
					<CardContent className="py-0">
						<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
							<div className="flex items-center gap-3">
								<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
									<Home className="h-4 w-4 text-primary" />
								</div>
								<div className="min-w-0">
									<p className="text-xs text-muted-foreground">
										Property Value
									</p>
									<p className="font-semibold truncate">
										{formatCurrencyShort(propertyValue / 100)}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
									<Banknote className="h-4 w-4 text-primary" />
								</div>
								<div className="min-w-0">
									<p className="text-xs text-muted-foreground">Mortgage</p>
									<p className="font-semibold truncate">
										{formatCurrencyShort(mortgageAmount / 100)}
										<span className="text-xs text-muted-foreground font-normal ml-1">
											({ltv.toFixed(0)}%)
										</span>
									</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
									<CalendarClock className="h-4 w-4 text-primary" />
								</div>
								<div className="min-w-0">
									<p className="text-xs text-muted-foreground">Original Term</p>
									<p className="font-semibold">
										{formatTermDisplay(mortgageTermMonths)}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
									<Leaf className="h-4 w-4 text-primary" />
								</div>
								<div className="min-w-0">
									<p className="text-xs text-muted-foreground">BER</p>
									<p className="font-semibold">{ber}</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
									<Percent className="h-4 w-4 text-primary" />
								</div>
								<div className="min-w-0">
									<p className="text-xs text-muted-foreground">Rates</p>
									<p className="font-semibold">{ratePeriodCount}</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
									<PiggyBank className="h-4 w-4 text-primary" />
								</div>
								<div className="min-w-0">
									<p className="text-xs text-muted-foreground">Overpayments</p>
									<p className="font-semibold">{overpaymentCount}</p>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Incomplete simulation warning */}
			{hasRequiredData &&
				!completeness.isComplete &&
				completeness.coveredMonths > 0 && (
					<Alert variant="destructive">
						<AlertTriangle className="h-4 w-4" />
						<AlertTitle>Incomplete Simulation</AlertTitle>
						<AlertDescription>
							Your rate periods only cover{" "}
							{formatTermDisplay(completeness.coveredMonths)} of{" "}
							{formatTermDisplay(completeness.totalMonths)}. There is a
							remaining balance of{" "}
							{formatCurrency(completeness.remainingBalance / 100)} that is not
							covered. Add more rate periods or overpayments to complete the
							simulation.
						</AlertDescription>
					</Alert>
				)}

			{/* Compare Selection Dialog */}
			<SimulateCompareSelectDialog
				open={compareDialogOpen}
				onOpenChange={setCompareDialogOpen}
				showCurrentSimulation={hasRequiredData}
			/>
		</div>
	);
}
