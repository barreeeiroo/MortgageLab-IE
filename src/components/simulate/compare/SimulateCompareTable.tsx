import { useStore } from "@nanostores/react";
import { Table2 } from "lucide-react";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Toggle } from "@/components/ui/toggle";
import type { CompareSimulationData } from "@/lib/stores/simulate/simulate-compare-calculations";
import {
	$compareTableExpandedYears,
	$compareTableSettings,
	$compareTableVisibleSimulations,
	COMPARE_TABLE_COLUMNS,
	initializeCompareTableVisibleSimulations,
	toggleCompareTableColumn,
	toggleCompareTableSimulation,
	toggleCompareTableYear,
} from "@/lib/stores/simulate/simulate-compare-table";
import { formatCurrency } from "@/lib/utils/currency";
import { CompareYearRow } from "./table/CompareYearRow";

interface SimulateCompareTableProps {
	simulations: CompareSimulationData[];
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

export function SimulateCompareTable({
	simulations,
}: SimulateCompareTableProps) {
	const settings = useStore($compareTableSettings);
	const expandedYears = useStore($compareTableExpandedYears);
	const visibleSimulations = useStore($compareTableVisibleSimulations);

	// Initialize visible simulations when simulations change
	useEffect(() => {
		initializeCompareTableVisibleSimulations(simulations.map((s) => s.id));
	}, [simulations]);

	if (simulations.length === 0) return null;

	const { visibleColumns } = settings;

	// Filter simulations based on visibility
	const displayedSimulations = simulations.filter((s) =>
		visibleSimulations.has(s.id),
	);

	// Find max years across all simulations
	const maxYears = Math.max(...simulations.map((s) => s.yearlySchedule.length));

	const baseSimulation = displayedSimulations[0];

	return (
		<Card>
			<CardHeader className="pb-2">
				<div className="flex items-center gap-2">
					<Table2 className="h-4 w-4 text-muted-foreground" />
					<CardTitle>Amortization Comparison</CardTitle>
				</div>

				{/* Toggle controls row */}
				<div className="flex flex-wrap items-center justify-between gap-4 pt-2">
					{/* Left side: Column visibility toggles */}
					<div className="flex flex-wrap items-center gap-2">
						{COMPARE_TABLE_COLUMNS.map((col) => (
							<Toggle
								key={col.key}
								pressed={visibleColumns[col.key]}
								onPressedChange={() => toggleCompareTableColumn(col.key)}
								size="sm"
								className="h-7 gap-1.5 text-xs cursor-pointer hover:bg-muted data-[state=on]:bg-accent"
							>
								{col.color && (
									<div
										className="h-2.5 w-2.5 rounded-sm shrink-0"
										style={{ backgroundColor: col.color }}
									/>
								)}
								{col.label}
							</Toggle>
						))}
					</div>

					{/* Right side: Simulation visibility toggles */}
					<div className="flex flex-wrap items-center gap-2">
						{simulations.map((sim) => (
							<Toggle
								key={sim.id}
								pressed={visibleSimulations.has(sim.id)}
								onPressedChange={() => toggleCompareTableSimulation(sim.id)}
								size="sm"
								className="h-7 gap-1.5 text-xs cursor-pointer hover:bg-muted data-[state=on]:bg-accent"
							>
								<div
									className="h-2.5 w-2.5 rounded-full shrink-0"
									style={{ backgroundColor: sim.color }}
								/>
								<span className="truncate max-w-[100px]">{sim.name}</span>
							</Toggle>
						))}
					</div>
				</div>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="rounded-md border overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-10 sticky left-0 bg-background" />
								<TableHead className="w-20 sticky left-10 bg-background">
									Year
								</TableHead>

								{/* Opening Balance column headers */}
								{visibleColumns.opening &&
									displayedSimulations.map((sim) => (
										<TableHead
											key={`${sim.id}-opening`}
											className="text-right min-w-[90px]"
										>
											<div className="flex items-center justify-end gap-1">
												<div
													className="h-2 w-2 rounded-full shrink-0"
													style={{ backgroundColor: sim.color }}
												/>
												<span className="truncate">Opening</span>
											</div>
										</TableHead>
									))}

								{/* Interest column headers */}
								{visibleColumns.interest &&
									displayedSimulations.map((sim) => (
										<TableHead
											key={`${sim.id}-interest`}
											className="text-right min-w-[90px]"
										>
											<div className="flex items-center justify-end gap-1">
												<div
													className="h-2 w-2 rounded-full shrink-0"
													style={{ backgroundColor: sim.color }}
												/>
												<span className="truncate text-red-600 dark:text-red-400">
													Interest
												</span>
											</div>
										</TableHead>
									))}

								{/* Principal column headers */}
								{visibleColumns.principal &&
									displayedSimulations.map((sim) => (
										<TableHead
											key={`${sim.id}-principal`}
											className="text-right min-w-[90px]"
										>
											<div className="flex items-center justify-end gap-1">
												<div
													className="h-2 w-2 rounded-full shrink-0"
													style={{ backgroundColor: sim.color }}
												/>
												<span className="truncate text-green-600 dark:text-green-400">
													Principal
												</span>
											</div>
										</TableHead>
									))}

								{/* Overpayments column headers */}
								{visibleColumns.overpayments &&
									displayedSimulations.map((sim) => (
										<TableHead
											key={`${sim.id}-overpayments`}
											className="text-right min-w-[100px]"
										>
											<div className="flex items-center justify-end gap-1">
												<div
													className="h-2 w-2 rounded-full shrink-0"
													style={{ backgroundColor: sim.color }}
												/>
												<span className="truncate">Overpay</span>
											</div>
										</TableHead>
									))}

								{/* Total Paid column headers */}
								{visibleColumns.totalPaid &&
									displayedSimulations.map((sim) => (
										<TableHead
											key={`${sim.id}-totalPaid`}
											className="text-right min-w-[90px]"
										>
											<div className="flex items-center justify-end gap-1">
												<div
													className="h-2 w-2 rounded-full shrink-0"
													style={{ backgroundColor: sim.color }}
												/>
												<span className="truncate">Total</span>
											</div>
										</TableHead>
									))}

								{/* Closing Balance column headers */}
								{visibleColumns.closing &&
									displayedSimulations.map((sim) => (
										<TableHead
											key={`${sim.id}-closing`}
											className="text-right min-w-[90px]"
										>
											<div className="flex items-center justify-end gap-1">
												<div
													className="h-2 w-2 rounded-full shrink-0"
													style={{ backgroundColor: sim.color }}
												/>
												<span className="truncate">Closing</span>
											</div>
										</TableHead>
									))}
							</TableRow>
						</TableHeader>
						<TableBody>
							{Array.from({ length: maxYears }, (_, yearIndex) => (
								<CompareYearRow
									key={`year-${yearIndex + 1}`}
									yearIndex={yearIndex}
									simulations={displayedSimulations}
									visibleColumns={visibleColumns}
									isExpanded={expandedYears.has(yearIndex + 1)}
									onToggle={() => toggleCompareTableYear(yearIndex + 1)}
								/>
							))}

							{/* Totals row */}
							{displayedSimulations.length > 0 && (
								<TableRow className="bg-muted/50 font-medium border-t-2">
									<td className="sticky left-0 bg-muted/50" />
									<td className="p-4 sticky left-10 bg-muted/50 font-medium">
										Total
									</td>

									{/* Opening totals (initial mortgage amount) */}
									{visibleColumns.opening &&
										displayedSimulations.map((sim) => {
											const opening =
												sim.yearlySchedule[0]?.openingBalance ?? 0;
											return (
												<td
													key={`${sim.id}-opening-total`}
													className="p-4 text-right"
												>
													{formatEuro(opening)}
												</td>
											);
										})}

									{/* Interest totals */}
									{visibleColumns.interest &&
										displayedSimulations.map((sim, simIndex) => {
											const total = sim.summary.totalInterest;
											const baseTotal = baseSimulation?.summary.totalInterest;
											const diff =
												simIndex > 0
													? formatDiff(total, baseTotal ?? 0, true)
													: null;

											return (
												<td
													key={`${sim.id}-interest-total`}
													className="p-4 text-right text-red-600 dark:text-red-400"
												>
													<div>{formatEuro(total)}</div>
													{diff && (
														<div
															className={`text-xs font-normal ${diff.className}`}
														>
															{diff.text}
														</div>
													)}
												</td>
											);
										})}

									{/* Principal totals */}
									{visibleColumns.principal &&
										displayedSimulations.map((sim) => {
											const total = sim.yearlySchedule.reduce(
												(sum, y) => sum + y.totalPrincipal,
												0,
											);
											return (
												<td
													key={`${sim.id}-principal-total`}
													className="p-4 text-right text-green-600 dark:text-green-400"
												>
													{formatEuro(total)}
												</td>
											);
										})}

									{/* Overpayments totals */}
									{visibleColumns.overpayments &&
										displayedSimulations.map((sim) => {
											const total = sim.yearlySchedule.reduce(
												(sum, y) => sum + y.totalOverpayments,
												0,
											);
											return (
												<td
													key={`${sim.id}-overpayments-total`}
													className="p-4 text-right"
												>
													{total > 0 ? formatEuro(total) : "—"}
												</td>
											);
										})}

									{/* Total Paid totals */}
									{visibleColumns.totalPaid &&
										displayedSimulations.map((sim, simIndex) => {
											const total = sim.summary.totalPaid;
											const baseTotal = baseSimulation?.summary.totalPaid;
											const diff =
												simIndex > 0
													? formatDiff(total, baseTotal ?? 0, true)
													: null;

											return (
												<td
													key={`${sim.id}-totalPaid-total`}
													className="p-4 text-right"
												>
													<div>{formatEuro(total)}</div>
													{diff && (
														<div
															className={`text-xs font-normal ${diff.className}`}
														>
															{diff.text}
														</div>
													)}
												</td>
											);
										})}

									{/* Closing totals (final balance = 0) */}
									{visibleColumns.closing &&
										displayedSimulations.map((sim) => (
											<td
												key={`${sim.id}-closing-total`}
												className="p-4 text-right"
											>
												{formatEuro(0)}
											</td>
										))}
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	);
}
