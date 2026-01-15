import { ChevronDown, ChevronRight } from "lucide-react";
import { Fragment } from "react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { CompareSimulationData } from "@/lib/stores/simulate/simulate-compare-calculations";
import type { CompareTableColumnVisibility } from "@/lib/stores/simulate/simulate-compare-table";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/currency";
import { CompareMonthRow } from "./CompareMonthRow";

interface CompareYearRowProps {
	yearIndex: number;
	simulations: CompareSimulationData[];
	visibleColumns: CompareTableColumnVisibility;
	isExpanded: boolean;
	onToggle: () => void;
}

function formatEuro(cents: number): string {
	return formatCurrency(cents / 100, { showCents: false });
}

function formatDiff(
	value: number,
	baseValue: number,
	lowerIsBetter = true,
): { text: string; className: string } | null {
	const diff = value - baseValue;
	if (diff === 0) return null;

	const absFormatted = formatEuro(Math.abs(diff));
	const isPositive = diff > 0;
	const isBetter = lowerIsBetter ? !isPositive : isPositive;

	return {
		text: `${isPositive ? "+" : "-"}${absFormatted}`,
		className: isBetter
			? "text-green-600 dark:text-green-400"
			: "text-red-600 dark:text-red-400",
	};
}

export function CompareYearRow({
	yearIndex,
	simulations,
	visibleColumns,
	isExpanded,
	onToggle,
}: CompareYearRowProps) {
	if (simulations.length === 0) return null;

	const baseSimulation = simulations[0];
	const baseYearData = baseSimulation.yearlySchedule[yearIndex];

	// Find which simulations have data for this year
	const simulationsWithData = simulations.filter(
		(sim) => sim.yearlySchedule[yearIndex] !== undefined,
	);

	if (simulationsWithData.length === 0) return null;

	const yearNum = yearIndex + 1;

	// Collect rate period labels per simulation for this year
	const ratePeriodsBySimulation = simulationsWithData
		.map((sim) => {
			const yearData = sim.yearlySchedule[yearIndex];
			if (!yearData || yearData.rateChanges.length === 0) return null;
			return {
				name: sim.name,
				periods: yearData.rateChanges.map((periodId) => {
					const resolved = sim.resolvedRatePeriods.find(
						(rp) => rp.id === periodId,
					);
					return resolved?.label || periodId;
				}),
			};
		})
		.filter(Boolean);

	return (
		<Fragment>
			<TableRow
				className={cn("cursor-pointer hover:bg-muted/50")}
				onClick={onToggle}
			>
				<TableCell className="p-2 sticky left-0 bg-background">
					<Button variant="ghost" size="icon" className="h-6 w-6">
						{isExpanded ? (
							<ChevronDown className="h-4 w-4" />
						) : (
							<ChevronRight className="h-4 w-4" />
						)}
					</Button>
				</TableCell>
				<TableCell className="font-medium sticky left-10 bg-background">
					Year {yearNum}
				</TableCell>

				{/* Opening Balance columns for all simulations */}
				{visibleColumns.opening &&
					simulations.map((sim, simIndex) => {
						const yearData = sim.yearlySchedule[yearIndex];
						const value = yearData?.openingBalance ?? 0;
						const baseValue = baseYearData?.openingBalance ?? 0;
						const diff =
							simIndex > 0 ? formatDiff(value, baseValue, true) : null;

						return (
							<TableCell key={`${sim.id}-opening`} className="text-right">
								<div>{yearData ? formatEuro(value) : "—"}</div>
								{diff && (
									<div className={`text-xs font-normal ${diff.className}`}>
										{diff.text}
									</div>
								)}
							</TableCell>
						);
					})}

				{/* Interest columns for all simulations */}
				{visibleColumns.interest &&
					simulations.map((sim, simIndex) => {
						const yearData = sim.yearlySchedule[yearIndex];
						const value = yearData?.totalInterest ?? 0;
						const baseValue = baseYearData?.totalInterest ?? 0;
						const diff =
							simIndex > 0 ? formatDiff(value, baseValue, true) : null;

						return (
							<TableCell
								key={`${sim.id}-interest`}
								className="text-right text-red-600 dark:text-red-400"
							>
								<div>{yearData ? formatEuro(value) : "—"}</div>
								{diff && (
									<div className={`text-xs font-normal ${diff.className}`}>
										{diff.text}
									</div>
								)}
							</TableCell>
						);
					})}

				{/* Principal columns for all simulations */}
				{visibleColumns.principal &&
					simulations.map((sim, simIndex) => {
						const yearData = sim.yearlySchedule[yearIndex];
						const value = yearData?.totalPrincipal ?? 0;
						const baseValue = baseYearData?.totalPrincipal ?? 0;
						const diff =
							simIndex > 0 ? formatDiff(value, baseValue, false) : null;

						return (
							<TableCell
								key={`${sim.id}-principal`}
								className="text-right text-green-600 dark:text-green-400"
							>
								<div>{yearData ? formatEuro(value) : "—"}</div>
								{diff && (
									<div className={`text-xs font-normal ${diff.className}`}>
										{diff.text}
									</div>
								)}
							</TableCell>
						);
					})}

				{/* Overpayments columns for all simulations */}
				{visibleColumns.overpayments &&
					simulations.map((sim) => {
						const yearData = sim.yearlySchedule[yearIndex];
						const value = yearData?.totalOverpayments ?? 0;

						return (
							<TableCell key={`${sim.id}-overpayments`} className="text-right">
								{yearData && value > 0 ? formatEuro(value) : "—"}
							</TableCell>
						);
					})}

				{/* Total Paid columns for all simulations */}
				{visibleColumns.totalPaid &&
					simulations.map((sim, simIndex) => {
						const yearData = sim.yearlySchedule[yearIndex];
						const value = yearData?.totalPayments ?? 0;
						const baseValue = baseYearData?.totalPayments ?? 0;
						const diff =
							simIndex > 0 ? formatDiff(value, baseValue, true) : null;

						return (
							<TableCell
								key={`${sim.id}-totalPaid`}
								className="text-right font-medium"
							>
								<div>{yearData ? formatEuro(value) : "—"}</div>
								{diff && (
									<div className={`text-xs font-normal ${diff.className}`}>
										{diff.text}
									</div>
								)}
							</TableCell>
						);
					})}

				{/* Closing Balance columns for all simulations */}
				{visibleColumns.closing &&
					simulations.map((sim, simIndex) => {
						const yearData = sim.yearlySchedule[yearIndex];
						const value = yearData?.closingBalance ?? 0;
						const baseValue = baseYearData?.closingBalance ?? 0;
						const diff =
							simIndex > 0 ? formatDiff(value, baseValue, true) : null;

						return (
							<TableCell key={`${sim.id}-closing`} className="text-right">
								<div>{yearData ? formatEuro(value) : "—"}</div>
								{diff && (
									<div className={`text-xs font-normal ${diff.className}`}>
										{diff.text}
									</div>
								)}
							</TableCell>
						);
					})}
			</TableRow>

			{/* Expanded content */}
			{isExpanded && (
				<>
					{/* Rate periods row */}
					{ratePeriodsBySimulation.length > 0 && (
						<TableRow className="bg-muted/30">
							<TableCell
								colSpan={
									2 +
									(visibleColumns.opening ? simulations.length : 0) +
									(visibleColumns.interest ? simulations.length : 0) +
									(visibleColumns.principal ? simulations.length : 0) +
									(visibleColumns.overpayments ? simulations.length : 0) +
									(visibleColumns.totalPaid ? simulations.length : 0) +
									(visibleColumns.closing ? simulations.length : 0)
								}
								className="py-2 pl-12 text-sm"
							>
								<span className="text-muted-foreground">Rate periods: </span>
								{ratePeriodsBySimulation.map((simData, index) => (
									<span key={simData?.name}>
										{index > 0 && " | "}
										<span className="font-medium">{simData?.name}:</span>{" "}
										{simData?.periods.join(", ")}
									</span>
								))}
							</TableCell>
						</TableRow>
					)}

					{/* Monthly breakdown */}
					{baseYearData?.months.map((month, monthIndex) => (
						<CompareMonthRow
							key={`month-${month.month}`}
							yearIndex={yearIndex}
							monthIndex={monthIndex}
							simulations={simulations}
							visibleColumns={visibleColumns}
						/>
					))}

					{/* Year total row */}
					<TableRow className="bg-muted/40 text-sm font-medium border-t">
						<TableCell className="sticky left-0 bg-muted/40" />
						<TableCell className="pl-8 sticky left-10 bg-muted/40">
							Year {yearNum} Total
						</TableCell>

						{visibleColumns.opening &&
							simulations.map((sim) => {
								const yearData = sim.yearlySchedule[yearIndex];
								return (
									<TableCell
										key={`${sim.id}-opening-total`}
										className="text-right"
									>
										{yearData ? formatEuro(yearData.openingBalance) : "—"}
									</TableCell>
								);
							})}

						{visibleColumns.interest &&
							simulations.map((sim) => {
								const yearData = sim.yearlySchedule[yearIndex];
								return (
									<TableCell
										key={`${sim.id}-interest-total`}
										className="text-right text-red-600 dark:text-red-400"
									>
										{yearData ? formatEuro(yearData.totalInterest) : "—"}
									</TableCell>
								);
							})}

						{visibleColumns.principal &&
							simulations.map((sim) => {
								const yearData = sim.yearlySchedule[yearIndex];
								return (
									<TableCell
										key={`${sim.id}-principal-total`}
										className="text-right text-green-600 dark:text-green-400"
									>
										{yearData ? formatEuro(yearData.totalPrincipal) : "—"}
									</TableCell>
								);
							})}

						{visibleColumns.overpayments &&
							simulations.map((sim) => {
								const yearData = sim.yearlySchedule[yearIndex];
								return (
									<TableCell
										key={`${sim.id}-overpayments-total`}
										className="text-right"
									>
										{yearData && yearData.totalOverpayments > 0
											? formatEuro(yearData.totalOverpayments)
											: "—"}
									</TableCell>
								);
							})}

						{visibleColumns.totalPaid &&
							simulations.map((sim) => {
								const yearData = sim.yearlySchedule[yearIndex];
								return (
									<TableCell
										key={`${sim.id}-totalPaid-total`}
										className="text-right"
									>
										{yearData ? formatEuro(yearData.totalPayments) : "—"}
									</TableCell>
								);
							})}

						{visibleColumns.closing &&
							simulations.map((sim) => {
								const yearData = sim.yearlySchedule[yearIndex];
								return (
									<TableCell
										key={`${sim.id}-closing-total`}
										className="text-right"
									>
										{yearData ? formatEuro(yearData.closingBalance) : "—"}
									</TableCell>
								);
							})}
					</TableRow>
				</>
			)}
		</Fragment>
	);
}
