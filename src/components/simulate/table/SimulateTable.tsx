import { HelpCircle, Info } from "lucide-react";
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
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { GLOSSARY_TERMS_MAP } from "@/lib/constants/glossary";
import type {
	AmortizationYear,
	SimulationSummary,
	SimulationWarning,
} from "@/lib/schemas/simulate";
import { formatCurrency } from "@/lib/utils";
import { SimulateYearRow } from "./SimulateYearRow";

interface SimulateTableProps {
	yearlySchedule: AmortizationYear[];
	summary: SimulationSummary;
	warnings: SimulationWarning[];
	ratePeriodLabels: Map<string, string>;
}

function formatEuro(cents: number): string {
	return formatCurrency(cents / 100, { showCents: true });
}

// Helper component for header with glossary tooltip
function HeaderWithTooltip({
	label,
	glossaryId,
	align = "right",
}: {
	label: string;
	glossaryId: string;
	align?: "left" | "right";
}) {
	const term = GLOSSARY_TERMS_MAP[glossaryId];
	if (!term) {
		return <span>{label}</span>;
	}

	return (
		<div
			className={`flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}
		>
			<span>{label}</span>
			<Tooltip>
				<TooltipTrigger asChild>
					<span className="inline-flex items-center justify-center cursor-help">
						<HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
					</span>
				</TooltipTrigger>
				<TooltipContent side="top" className="max-w-xs">
					<p className="font-medium">{term.shortDescription}</p>
					<p className="text-xs text-muted-foreground mt-1">
						{term.fullDescription}
					</p>
				</TooltipContent>
			</Tooltip>
		</div>
	);
}

export function SimulateTable({
	yearlySchedule,
	summary,
	warnings,
	ratePeriodLabels,
}: SimulateTableProps) {
	const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());

	const toggleYear = (year: number) => {
		setExpandedYears((prev) => {
			const next = new Set(prev);
			if (next.has(year)) {
				next.delete(year);
			} else {
				next.add(year);
			}
			return next;
		});
	};

	// Check for warnings by year
	const warningsByYear = new Map<number, SimulationWarning[]>();
	for (const warning of warnings) {
		const year = Math.ceil(warning.month / 12);
		const existing = warningsByYear.get(year) || [];
		existing.push(warning);
		warningsByYear.set(year, existing);
	}

	return (
		<Card>
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<CardTitle>Amortization Schedule</CardTitle>
					<div className="flex gap-4 text-sm">
						<div>
							<span className="text-muted-foreground">Total Interest: </span>
							<span className="font-medium">
								{formatEuro(summary.totalInterest)}
							</span>
						</div>
						<div>
							<span className="text-muted-foreground">Total Paid: </span>
							<span className="font-medium">
								{formatEuro(summary.totalPaid)}
							</span>
						</div>
						{summary.monthsSaved > 0 && (
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="flex items-center gap-1 text-green-600 dark:text-green-500 cursor-help">
										<span className="font-medium">
											{Math.floor(summary.monthsSaved / 12) > 0 && (
												<>
													{Math.floor(summary.monthsSaved / 12)} year
													{Math.floor(summary.monthsSaved / 12) !== 1 &&
														"s"}{" "}
												</>
											)}
											{summary.monthsSaved % 12 > 0 && (
												<>
													{summary.monthsSaved % 12} month
													{summary.monthsSaved % 12 !== 1 && "s"}
												</>
											)}{" "}
											saved
										</span>
										<Info className="h-3.5 w-3.5" />
									</div>
								</TooltipTrigger>
								<TooltipContent>
									<p>
										With your overpayments, you have saved the equivalent to{" "}
										{formatEuro(summary.interestSaved)} in interest
									</p>
								</TooltipContent>
							</Tooltip>
						)}
					</div>
				</div>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-12" />
								<TableHead className="w-20">Year</TableHead>
								<TableHead className="text-right">
									<HeaderWithTooltip
										label="Opening"
										glossaryId="openingBalance"
									/>
								</TableHead>
								<TableHead className="text-right">
									<HeaderWithTooltip label="Interest" glossaryId="interest" />
								</TableHead>
								<TableHead className="text-right">
									<HeaderWithTooltip label="Principal" glossaryId="principal" />
								</TableHead>
								<TableHead className="text-right">
									<HeaderWithTooltip
										label="Overpayments"
										glossaryId="overpayment"
									/>
								</TableHead>
								<TableHead className="text-right">Total Paid</TableHead>
								<TableHead className="text-right">
									<HeaderWithTooltip
										label="Closing"
										glossaryId="closingBalance"
									/>
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{yearlySchedule.map((year) => (
								<SimulateYearRow
									key={year.year}
									year={year}
									isExpanded={expandedYears.has(year.year)}
									warnings={warningsByYear.get(year.year) || []}
									ratePeriodLabels={ratePeriodLabels}
									onToggle={() => toggleYear(year.year)}
								/>
							))}
							{/* Totals row */}
							{yearlySchedule.length > 0 && (
								<TableRow className="bg-muted/50 font-medium border-t-2">
									<TableCell />
									<TableCell>Total</TableCell>
									<TableCell className="text-right">
										{formatEuro(yearlySchedule[0]?.openingBalance ?? 0)}
									</TableCell>
									<TableCell className="text-right text-red-600 dark:text-red-400">
										{formatEuro(summary.totalInterest)}
									</TableCell>
									<TableCell className="text-right text-green-600 dark:text-green-400">
										{formatEuro(
											yearlySchedule.reduce(
												(sum, y) => sum + y.totalPrincipal,
												0,
											),
										)}
									</TableCell>
									<TableCell className="text-right">
										{formatEuro(
											yearlySchedule.reduce(
												(sum, y) => sum + y.totalOverpayments,
												0,
											),
										)}
									</TableCell>
									<TableCell className="text-right">
										{formatEuro(summary.totalPaid)}
									</TableCell>
									<TableCell className="text-right">
										{formatEuro(
											yearlySchedule[yearlySchedule.length - 1]
												?.closingBalance ?? 0,
										)}
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	);
}
