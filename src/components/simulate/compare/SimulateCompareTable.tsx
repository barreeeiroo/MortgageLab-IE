import { Table2 } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
	CompareChartDataPoint,
	CompareSimulationData,
} from "@/lib/stores/simulate/simulate-compare-calculations";
import { formatCurrency } from "@/lib/utils/currency";

interface SimulateCompareTableProps {
	simulations: CompareSimulationData[];
	yearlyData: CompareChartDataPoint[];
	monthlyData: CompareChartDataPoint[];
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
	yearlyData,
	monthlyData,
}: SimulateCompareTableProps) {
	const [granularity, setGranularity] = useState<"yearly" | "monthly">(
		"yearly",
	);

	if (simulations.length === 0) return null;

	const data = granularity === "yearly" ? yearlyData : monthlyData;
	const baseSimulation = simulations[0];

	// Get max years/months for the table
	const maxPeriods = data.length;

	return (
		<Card>
			<CardHeader className="pb-2">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<Table2 className="h-4 w-4 text-muted-foreground" />
						<CardTitle>Amortization Comparison</CardTitle>
					</div>
					<Tabs
						value={granularity}
						onValueChange={(v) => setGranularity(v as "yearly" | "monthly")}
					>
						<TabsList className="h-8">
							<TabsTrigger value="yearly" className="text-xs px-2">
								<span className="sm:hidden">Y</span>
								<span className="hidden sm:inline">Yearly</span>
							</TabsTrigger>
							<TabsTrigger value="monthly" className="text-xs px-2">
								<span className="sm:hidden">M</span>
								<span className="hidden sm:inline">Monthly</span>
							</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>

				{/* Legend */}
				<div className="flex flex-wrap items-center gap-3 pt-2">
					{simulations.map((sim) => (
						<div key={sim.id} className="flex items-center gap-1.5 text-xs">
							<div
								className="h-2.5 w-2.5 rounded-full shrink-0"
								style={{ backgroundColor: sim.color }}
							/>
							<span className="truncate max-w-[120px]">{sim.name}</span>
						</div>
					))}
				</div>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="rounded-md border overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-16 sticky left-0 bg-background">
									{granularity === "yearly" ? "Year" : "Month"}
								</TableHead>
								{/* Balance columns */}
								{simulations.map((sim) => (
									<TableHead
										key={`${sim.id}-balance`}
										className="text-right min-w-[100px]"
									>
										<div className="flex items-center justify-end gap-1">
											<div
												className="h-2 w-2 rounded-full shrink-0"
												style={{ backgroundColor: sim.color }}
											/>
											<span className="truncate">Balance</span>
										</div>
									</TableHead>
								))}
								{/* Interest columns */}
								{simulations.map((sim) => (
									<TableHead
										key={`${sim.id}-interest`}
										className="text-right min-w-[100px]"
									>
										<div className="flex items-center justify-end gap-1">
											<div
												className="h-2 w-2 rounded-full shrink-0"
												style={{ backgroundColor: sim.color }}
											/>
											<span className="truncate">Interest</span>
										</div>
									</TableHead>
								))}
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.slice(0, maxPeriods).map((point, index) => {
								const periodNum = index + 1;
								return (
									<TableRow key={point.period}>
										<TableCell className="font-medium sticky left-0 bg-background">
											{periodNum}
										</TableCell>
										{/* Balance values */}
										{simulations.map((sim, simIndex) => {
											const balance =
												(point[`${sim.id}_balance`] as number) ?? 0;
											const baseBalance =
												(point[`${baseSimulation.id}_balance`] as number) ?? 0;
											const diff =
												simIndex > 0
													? formatDiff(balance, baseBalance, true)
													: null;

											return (
												<TableCell
													key={`${sim.id}-balance`}
													className="text-right"
												>
													<div>{formatEuro(balance)}</div>
													{diff && (
														<div className={`text-xs ${diff.className}`}>
															{diff.text}
														</div>
													)}
												</TableCell>
											);
										})}
										{/* Interest values */}
										{simulations.map((sim, simIndex) => {
											const interest =
												(point[`${sim.id}_interest`] as number) ?? 0;
											const baseInterest =
												(point[`${baseSimulation.id}_interest`] as number) ?? 0;
											const diff =
												simIndex > 0
													? formatDiff(interest, baseInterest, true)
													: null;

											return (
												<TableCell
													key={`${sim.id}-interest`}
													className="text-right"
												>
													<div>{formatEuro(interest)}</div>
													{diff && (
														<div className={`text-xs ${diff.className}`}>
															{diff.text}
														</div>
													)}
												</TableCell>
											);
										})}
									</TableRow>
								);
							})}

							{/* Totals row */}
							<TableRow className="bg-muted/50 font-medium border-t-2">
								<TableCell className="sticky left-0 bg-muted/50">
									Total
								</TableCell>
								{/* Balance totals (show final balance) */}
								{simulations.map((sim) => (
									<TableCell key={`${sim.id}-balance`} className="text-right">
										{formatEuro(0)}
									</TableCell>
								))}
								{/* Interest totals */}
								{simulations.map((sim, simIndex) => {
									const total = sim.summary.totalInterest;
									const baseTotal = baseSimulation.summary.totalInterest;
									const diff =
										simIndex > 0 ? formatDiff(total, baseTotal, true) : null;

									return (
										<TableCell
											key={`${sim.id}-interest`}
											className="text-right text-red-600 dark:text-red-400"
										>
											<div>{formatEuro(total)}</div>
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
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	);
}
