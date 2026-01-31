import { TableCell, TableRow } from "@/components/ui/table";
import type { CompareSimulationData } from "@/lib/stores/simulate/simulate-compare-calculations";
import type { CompareTableColumnVisibility } from "@/lib/stores/simulate/simulate-compare-table";
import { formatCurrency } from "@/lib/utils/currency";
import { formatMonthYear } from "@/lib/utils/date";

interface CompareMonthRowProps {
    yearIndex: number;
    monthIndex: number;
    simulations: CompareSimulationData[];
    visibleColumns: CompareTableColumnVisibility;
}

function formatEuro(cents: number): string {
    return formatCurrency(cents / 100, { showCents: true });
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

export function CompareMonthRow({
    yearIndex,
    monthIndex,
    simulations,
    visibleColumns,
}: CompareMonthRowProps) {
    if (simulations.length === 0) return null;

    // Find the longest simulation to use as reference for month data
    const longestSim = simulations.reduce(
        (longest, sim) =>
            sim.yearlySchedule.length > longest.yearlySchedule.length
                ? sim
                : longest,
        simulations[0],
    );

    // Get month data from longest simulation (or any sim that has this year/month)
    const referenceYearData =
        longestSim?.yearlySchedule[yearIndex] ??
        simulations.find((s) => s.yearlySchedule[yearIndex])?.yearlySchedule[
            yearIndex
        ];
    const referenceMonthData = referenceYearData?.months[monthIndex];

    if (!referenceMonthData) return null;

    // Use first simulation as base for diff calculations (if it has data)
    const baseSimulation = simulations[0];
    const baseYearData = baseSimulation.yearlySchedule[yearIndex];
    const baseMonthData = baseYearData?.months[monthIndex];

    // Format month label - full month name when date available
    const monthLabel = referenceMonthData.date
        ? formatMonthYear(referenceMonthData.date)
        : `Month ${referenceMonthData.month}`;

    return (
        <TableRow className="bg-muted/20 text-sm">
            <TableCell className="sticky left-0 bg-muted/20" />
            <TableCell className="pl-12 sticky left-10 bg-muted/20 text-muted-foreground">
                {monthLabel}
            </TableCell>

            {/* Opening Balance columns */}
            {visibleColumns.opening &&
                simulations.map((sim, simIndex) => {
                    const yearData = sim.yearlySchedule[yearIndex];
                    const monthData = yearData?.months[monthIndex];
                    const value = monthData?.openingBalance ?? 0;
                    const baseValue = baseMonthData?.openingBalance ?? 0;
                    const diff =
                        simIndex > 0
                            ? formatDiff(value, baseValue, true)
                            : null;

                    return (
                        <TableCell
                            key={`${sim.id}-opening`}
                            className="text-right"
                        >
                            <div>{monthData ? formatEuro(value) : "—"}</div>
                            {diff && (
                                <div
                                    className={`text-xs font-normal ${diff.className}`}
                                >
                                    {diff.text}
                                </div>
                            )}
                        </TableCell>
                    );
                })}

            {/* Interest columns */}
            {visibleColumns.interest &&
                simulations.map((sim, simIndex) => {
                    const yearData = sim.yearlySchedule[yearIndex];
                    const monthData = yearData?.months[monthIndex];
                    const value = monthData?.interestPortion ?? 0;
                    const baseValue = baseMonthData?.interestPortion ?? 0;
                    const diff =
                        simIndex > 0
                            ? formatDiff(value, baseValue, true)
                            : null;

                    return (
                        <TableCell
                            key={`${sim.id}-interest`}
                            className="text-right text-red-600 dark:text-red-400"
                        >
                            <div>{monthData ? formatEuro(value) : "—"}</div>
                            {diff && (
                                <div
                                    className={`text-xs font-normal ${diff.className}`}
                                >
                                    {diff.text}
                                </div>
                            )}
                        </TableCell>
                    );
                })}

            {/* Principal columns */}
            {visibleColumns.principal &&
                simulations.map((sim, simIndex) => {
                    const yearData = sim.yearlySchedule[yearIndex];
                    const monthData = yearData?.months[monthIndex];
                    const value = monthData?.principalPortion ?? 0;
                    const baseValue = baseMonthData?.principalPortion ?? 0;
                    const diff =
                        simIndex > 0
                            ? formatDiff(value, baseValue, false)
                            : null;

                    return (
                        <TableCell
                            key={`${sim.id}-principal`}
                            className="text-right text-green-600 dark:text-green-400"
                        >
                            <div>{monthData ? formatEuro(value) : "—"}</div>
                            {diff && (
                                <div
                                    className={`text-xs font-normal ${diff.className}`}
                                >
                                    {diff.text}
                                </div>
                            )}
                        </TableCell>
                    );
                })}

            {/* Overpayments columns */}
            {visibleColumns.overpayments &&
                simulations.map((sim) => {
                    const yearData = sim.yearlySchedule[yearIndex];
                    const monthData = yearData?.months[monthIndex];
                    const value = monthData?.overpayment ?? 0;

                    return (
                        <TableCell
                            key={`${sim.id}-overpayments`}
                            className="text-right"
                        >
                            {monthData && value > 0 ? formatEuro(value) : "—"}
                        </TableCell>
                    );
                })}

            {/* Total Paid columns */}
            {visibleColumns.totalPaid &&
                simulations.map((sim, simIndex) => {
                    const yearData = sim.yearlySchedule[yearIndex];
                    const monthData = yearData?.months[monthIndex];
                    const value = monthData?.totalPayment ?? 0;
                    const baseValue = baseMonthData?.totalPayment ?? 0;
                    const diff =
                        simIndex > 0
                            ? formatDiff(value, baseValue, true)
                            : null;

                    return (
                        <TableCell
                            key={`${sim.id}-totalPaid`}
                            className="text-right"
                        >
                            <div>{monthData ? formatEuro(value) : "—"}</div>
                            {diff && (
                                <div
                                    className={`text-xs font-normal ${diff.className}`}
                                >
                                    {diff.text}
                                </div>
                            )}
                        </TableCell>
                    );
                })}

            {/* Closing Balance columns */}
            {visibleColumns.closing &&
                simulations.map((sim, simIndex) => {
                    const yearData = sim.yearlySchedule[yearIndex];
                    const monthData = yearData?.months[monthIndex];
                    const value = monthData?.closingBalance ?? 0;
                    const baseValue = baseMonthData?.closingBalance ?? 0;
                    const diff =
                        simIndex > 0
                            ? formatDiff(value, baseValue, true)
                            : null;

                    return (
                        <TableCell
                            key={`${sim.id}-closing`}
                            className="text-right"
                        >
                            <div>{monthData ? formatEuro(value) : "—"}</div>
                            {diff && (
                                <div
                                    className={`text-xs font-normal ${diff.className}`}
                                >
                                    {diff.text}
                                </div>
                            )}
                        </TableCell>
                    );
                })}
        </TableRow>
    );
}
