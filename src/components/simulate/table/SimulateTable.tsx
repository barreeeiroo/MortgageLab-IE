import { Info, Table2 } from "lucide-react";
import { useState } from "react";
import {
	type GlossaryTermId,
	GlossaryTermTooltip,
} from "@/components/tooltips/GlossaryTermTooltip";
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
import type {
	AmortizationYear,
	Milestone,
	OverpaymentConfig,
	SimulationSummary,
	SimulationWarning,
} from "@/lib/schemas/simulate";
import { formatCurrency } from "@/lib/utils/currency";
import { SimulateYearRow } from "./SimulateYearRow";

interface SimulateTableProps {
	yearlySchedule: AmortizationYear[];
	summary: SimulationSummary;
	warnings: SimulationWarning[];
	ratePeriodLabels: Map<string, string>;
	milestones: Milestone[];
	overpaymentConfigs: OverpaymentConfig[];
	mortgageAmount: number;
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
	glossaryId: GlossaryTermId;
	align?: "left" | "right";
}) {
	return (
		<div
			className={`flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}
		>
			<span>{label}</span>
			<GlossaryTermTooltip termId={glossaryId} side="top" />
		</div>
	);
}

export function SimulateTable({
	yearlySchedule,
	summary,
	warnings,
	ratePeriodLabels,
	milestones,
	overpaymentConfigs,
	mortgageAmount,
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

	// Helper to find which year contains a given month
	const findYearForMonth = (month: number): number | undefined => {
		for (const year of yearlySchedule) {
			if (year.months.some((m) => m.month === month)) {
				return year.year;
			}
		}
		return undefined;
	};

	// Check for warnings by year
	const warningsByYear = new Map<number, SimulationWarning[]>();
	for (const warning of warnings) {
		const year =
			findYearForMonth(warning.month) ?? Math.ceil(warning.month / 12);
		const existing = warningsByYear.get(year) || [];
		existing.push(warning);
		warningsByYear.set(year, existing);
	}

	// Group milestones by year (using the same year key as yearlySchedule)
	const milestonesByYear = new Map<number, Milestone[]>();
	for (const milestone of milestones) {
		const year =
			findYearForMonth(milestone.month) ?? Math.ceil(milestone.month / 12);
		const existing = milestonesByYear.get(year) || [];
		existing.push(milestone);
		milestonesByYear.set(year, existing);
	}

	// Generate display label for an overpayment config
	const getOverpaymentDisplayLabel = (config: OverpaymentConfig): string => {
		if (config.label) return config.label;

		const amount = formatEuro(config.amount);
		if (config.type === "one_time") {
			return `${amount} Once`;
		}
		// Recurring
		const frequencyLabel =
			config.frequency === "yearly"
				? "Yearly"
				: config.frequency === "quarterly"
					? "Quarterly"
					: "Monthly";
		return `${amount} ${frequencyLabel}`;
	};

	// Group overpayments by year with display labels (counting duplicates)
	const overpaymentCountsByYear = new Map<number, Map<string, number>>();
	for (const config of overpaymentConfigs) {
		const displayLabel = getOverpaymentDisplayLabel(config);

		// Find all years this overpayment is active in
		const endMonth = config.endMonth ?? Number.MAX_SAFE_INTEGER;
		for (const yearData of yearlySchedule) {
			const yearStartMonth = yearData.months[0]?.month ?? 1;
			const yearEndMonth =
				yearData.months[yearData.months.length - 1]?.month ?? yearStartMonth;

			// Check if overpayment is active during this year
			if (config.startMonth <= yearEndMonth && endMonth >= yearStartMonth) {
				const yearCounts =
					overpaymentCountsByYear.get(yearData.year) ||
					new Map<string, number>();
				yearCounts.set(displayLabel, (yearCounts.get(displayLabel) || 0) + 1);
				overpaymentCountsByYear.set(yearData.year, yearCounts);
			}
		}
	}

	// Convert counts to display labels (e.g., "€100 Monthly (x2)")
	const overpaymentLabelsByYear = new Map<number, string[]>();
	for (const [year, counts] of overpaymentCountsByYear) {
		const labels: string[] = [];
		for (const [label, count] of counts) {
			labels.push(count > 1 ? `${label} (x${count})` : label);
		}
		overpaymentLabelsByYear.set(year, labels);
	}

	return (
		<Card>
			<CardHeader className="pb-2">
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-2">
						<Table2 className="h-4 w-4 text-muted-foreground" />
						<CardTitle>Amortization Schedule</CardTitle>
					</div>
					<div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
						<div>
							<span className="text-muted-foreground">Total Interest: </span>
							<span className="font-medium">
								{formatEuro(summary.totalInterest)}
								{mortgageAmount > 0 && (
									<span className="text-muted-foreground font-normal">
										{" "}
										(
										{((summary.totalInterest / mortgageAmount) * 100).toFixed(
											1,
										)}
										%)
									</span>
								)}
							</span>
						</div>
						<div>
							<span className="text-muted-foreground">Total Paid: </span>
							<span className="font-medium">
								{formatEuro(summary.totalPaid)}
							</span>
						</div>
						{summary.extraInterestFromSelfBuild !== undefined &&
							summary.extraInterestFromSelfBuild > 0 && (
								<Tooltip>
									<TooltipTrigger asChild>
										<div className="flex items-center gap-1 text-red-600 dark:text-red-500 cursor-help">
											<span className="font-medium">
												{formatEuro(summary.extraInterestFromSelfBuild)} extra
											</span>
											<Info className="h-3.5 w-3.5" />
										</div>
									</TooltipTrigger>
									<TooltipContent>
										<p>
											Extra interest vs paying principal during construction
										</p>
									</TooltipContent>
								</Tooltip>
							)}
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
										{formatEuro(summary.interestSaved)} in interest saved with
										your overpayments
									</p>
								</TooltipContent>
							</Tooltip>
						)}
						{summary.monthsSaved === 0 && summary.interestSaved > 0 && (
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="flex items-center gap-1 text-green-600 dark:text-green-500 cursor-help">
										<span className="font-medium">
											{formatEuro(summary.interestSaved)} saved
										</span>
										<Info className="h-3.5 w-3.5" />
									</div>
								</TooltipTrigger>
								<TooltipContent>
									<p>Interest saved with your overpayments</p>
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
									milestones={milestonesByYear.get(year.year) || []}
									ratePeriodLabels={ratePeriodLabels}
									overpaymentLabels={
										overpaymentLabelsByYear.get(year.year) || []
									}
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
