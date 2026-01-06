import {
	Coins,
	type LucideIcon,
	PiggyBank,
	TriangleAlert,
	X,
} from "lucide-react";
import {
	getLender,
	type Lender,
	type MortgageRate,
	type Perk,
	resolvePerks,
} from "@/lib/data";
import { useIsDesktop } from "@/lib/hooks";
import { cn, formatCurrency } from "@/lib/utils";
import { LenderLogo } from "../lenders";
import { ShareButton } from "../ShareButton";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

// Map perk icon names to lucide components
const PERK_ICONS: Record<string, LucideIcon> = {
	PiggyBank,
	Coins,
};

import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "../ui/table";

interface RateRow extends MortgageRate {
	monthlyPayment: number;
	followOnRate?: MortgageRate;
	followOnLtv: number;
	monthlyFollowOn?: number;
	totalRepayable?: number;
	costOfCreditPct?: number;
	combinedPerks: string[];
	isCustom?: boolean;
	customLenderName?: string;
	indicativeAprc?: number;
	usesFixedRateForWholeTerm?: boolean;
}

interface CompareRatesModalProps {
	rates: RateRow[];
	lenders: Lender[];
	perks: Perk[];
	mortgageAmount: number;
	mortgageTerm: number;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onShare: () => Promise<string>;
}

// Comparison data rows to display (same order as main table)
const COMPARISON_ROWS = [
	{ key: "perks", label: "Perks" },
	{ key: "type", label: "Type" },
	{ key: "period", label: "Period" },
	{ key: "rate", label: "Rate" },
	{ key: "aprc", label: "APRC" },
	{ key: "monthly", label: "Monthly" },
	{ key: "followOnProduct", label: "Follow-On Product" },
	{ key: "followOnRate", label: "Follow-On Rate" },
	{ key: "followOnMonthly", label: "Follow-On Monthly" },
	{ key: "totalRepayable", label: "Total Repayable" },
	{ key: "costOfCredit", label: "Cost of Credit %" },
] as const;

type ComparisonKey = (typeof COMPARISON_ROWS)[number]["key"];

function getComparisonValue(rate: RateRow, key: ComparisonKey): string {
	switch (key) {
		case "perks":
			return ""; // Handled specially in render
		case "type":
			return rate.type === "fixed" ? "Fixed" : "Variable";
		case "period":
			return rate.type === "fixed" && rate.fixedTerm
				? `${rate.fixedTerm} yr`
				: "—";
		case "rate":
			return `${rate.rate.toFixed(2)}%`;
		case "aprc":
			return rate.indicativeAprc ? `${rate.indicativeAprc.toFixed(2)}%` : "—";
		case "monthly":
			return formatCurrency(rate.monthlyPayment, { showCents: true });
		case "followOnProduct":
			return ""; // Handled specially in render
		case "followOnRate":
			return rate.followOnRate ? `${rate.followOnRate.rate.toFixed(2)}%` : "—";
		case "followOnMonthly":
			return rate.monthlyFollowOn
				? formatCurrency(rate.monthlyFollowOn, { showCents: true })
				: "—";
		case "totalRepayable":
			return rate.totalRepayable
				? formatCurrency(rate.totalRepayable, { showCents: true })
				: "—";
		case "costOfCredit":
			return rate.costOfCreditPct !== undefined
				? `${rate.costOfCreditPct.toFixed(1)}%`
				: "—";
		default:
			return "—";
	}
}

function getNumericValue(
	rate: RateRow,
	key: ComparisonKey,
): number | undefined {
	switch (key) {
		case "rate":
			return rate.rate;
		case "aprc":
			return rate.indicativeAprc;
		case "monthly":
			return rate.monthlyPayment;
		case "followOnRate":
			return rate.followOnRate?.rate;
		case "followOnMonthly":
			return rate.monthlyFollowOn;
		case "totalRepayable":
			return rate.totalRepayable;
		case "costOfCredit":
			return rate.costOfCreditPct;
		default:
			return undefined;
	}
}

// Find all best and worst indices for highlighting (lowest is best for most metrics)
function getBestWorstIndices(
	rates: RateRow[],
	key: ComparisonKey,
): { bestIndices: number[]; worstIndices: number[] } {
	if (rates.length < 2) return { bestIndices: [], worstIndices: [] };

	// Only highlight numeric comparison fields
	const numericKeys: ComparisonKey[] = [
		"rate",
		"aprc",
		"monthly",
		"followOnRate",
		"followOnMonthly",
		"totalRepayable",
		"costOfCredit",
	];

	if (!numericKeys.includes(key)) {
		return { bestIndices: [], worstIndices: [] };
	}

	// First pass: find best and worst values
	let bestValue = Number.POSITIVE_INFINITY;
	let worstValue = Number.NEGATIVE_INFINITY;
	let validCount = 0;

	rates.forEach((rate) => {
		const value = getNumericValue(rate, key);
		if (value !== undefined) {
			validCount++;
			if (value < bestValue) bestValue = value;
			if (value > worstValue) worstValue = value;
		}
	});

	// Only show best/worst if we have at least 2 valid values and they differ
	if (validCount < 2 || bestValue === worstValue) {
		return { bestIndices: [], worstIndices: [] };
	}

	// Second pass: collect all indices that match best/worst values
	const bestIndices: number[] = [];
	const worstIndices: number[] = [];

	rates.forEach((rate, index) => {
		const value = getNumericValue(rate, key);
		if (value !== undefined) {
			if (value === bestValue) bestIndices.push(index);
			if (value === worstValue) worstIndices.push(index);
		}
	});

	return { bestIndices, worstIndices };
}

export function CompareRatesModal({
	rates,
	lenders,
	perks,
	mortgageAmount,
	mortgageTerm,
	open,
	onOpenChange,
	onShare,
}: CompareRatesModalProps) {
	// Track if we're on desktop (lg breakpoint) for sticky columns
	const isDesktop = useIsDesktop();

	const handleShare = async (): Promise<boolean> => {
		try {
			await onShare();
			return true;
		} catch {
			return false;
		}
	};

	if (rates.length === 0) return null;

	// Calculate modal width based on number of rates
	// 2 rates = smaller, 5 rates = larger
	const getModalWidth = () => {
		switch (rates.length) {
			case 2:
				return "sm:max-w-2xl";
			case 3:
				return "sm:max-w-3xl";
			case 4:
				return "sm:max-w-4xl";
			default:
				return "sm:max-w-5xl";
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className={cn(getModalWidth(), "flex flex-col overflow-hidden p-0")}
				showCloseButton={false}
			>
				{/* Header */}
				<div className="sticky top-0 bg-background z-10 px-6 pt-6 pb-4 border-b">
					<DialogHeader>
						<div className="flex items-start justify-between gap-3">
							<div>
								<DialogTitle>Compare Rates</DialogTitle>
								<DialogDescription>
									Comparing {rates.length} mortgage rates •{" "}
									{formatCurrency(mortgageAmount)} over {mortgageTerm} years
								</DialogDescription>
							</div>
							<DialogClose className="cursor-pointer rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
								<X className="h-4 w-4" />
								<span className="sr-only">Close</span>
							</DialogClose>
						</div>
					</DialogHeader>
				</div>

				{/* Scrollable Content */}
				<div className="flex-1 overflow-auto px-6 pb-6 pt-4">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead
									className={cn(
										"w-[140px] py-1",
										isDesktop && "sticky left-0 z-20 bg-background",
									)}
								>
									<span className="sr-only">Metric</span>
								</TableHead>
								{rates.map((rate) => {
									const lender = getLender(lenders, rate.lenderId);
									const displayName =
										rate.isCustom && rate.customLenderName
											? rate.customLenderName
											: (lender?.name ?? rate.lenderId);

									return (
										<TableHead
											key={rate.id}
											className="text-center min-w-[140px] px-3 py-1"
										>
											<div className="flex items-center gap-2 justify-center">
												<LenderLogo
													lenderId={rate.lenderId}
													size={28}
													isCustom={rate.isCustom}
												/>
												<div className="text-xs text-left max-w-[160px]">
													<p className="font-medium text-foreground whitespace-nowrap">
														{displayName}
													</p>
													<p className="text-muted-foreground font-normal whitespace-normal">
														{rate.name}
													</p>
												</div>
											</div>
										</TableHead>
									);
								})}
							</TableRow>
						</TableHeader>
						<TableBody>
							{COMPARISON_ROWS.map((row) => {
								const { bestIndices, worstIndices } = getBestWorstIndices(
									rates,
									row.key,
								);

								// Check if we need to show warnings for this row
								const showWarnings =
									row.key === "aprc" ||
									row.key === "totalRepayable" ||
									row.key === "costOfCredit";

								return (
									<TableRow key={row.key}>
										<TableCell
											className={cn(
												"font-medium text-muted-foreground",
												isDesktop && "sticky left-0 z-10 bg-background",
											)}
										>
											{row.label}
										</TableCell>
										{rates.map((rate, index) => {
											const isBest = bestIndices.includes(index);
											const isWorst = worstIndices.includes(index);

											// Handle perks specially
											if (row.key === "perks") {
												const resolvedPerks = resolvePerks(
													perks,
													rate.combinedPerks,
												);
												return (
													<TableCell key={rate.id} className="text-center">
														{resolvedPerks.length > 0 ? (
															<div className="flex items-center justify-center gap-1">
																{resolvedPerks.map((perk) => {
																	const IconComponent = PERK_ICONS[perk.icon];
																	return (
																		<Tooltip key={perk.id}>
																			<TooltipTrigger asChild>
																				<span className="inline-flex items-center justify-center p-1 rounded hover:bg-muted cursor-help">
																					{IconComponent && (
																						<IconComponent className="h-4 w-4 text-muted-foreground" />
																					)}
																				</span>
																			</TooltipTrigger>
																			<TooltipContent>
																				<p className="font-medium">
																					{perk.label}
																				</p>
																				{perk.description && (
																					<p className="text-xs text-muted-foreground">
																						{perk.description}
																					</p>
																				)}
																			</TooltipContent>
																		</Tooltip>
																	);
																})}
															</div>
														) : (
															<span className="text-muted-foreground">—</span>
														)}
													</TableCell>
												);
											}

											// Handle follow-on product specially
											if (row.key === "followOnProduct") {
												const isFixed = rate.type === "fixed";

												// For variable rates, no follow-on expected
												if (!isFixed) {
													return (
														<TableCell
															key={rate.id}
															className="text-center text-muted-foreground"
														>
															—
														</TableCell>
													);
												}

												// Fixed rate with no follow-on - show warning
												if (!rate.followOnRate) {
													return (
														<TableCell key={rate.id} className="text-center">
															<Tooltip>
																<TooltipTrigger asChild>
																	<span className="inline-flex items-center gap-1.5 text-destructive cursor-help">
																		<TriangleAlert className="h-4 w-4 shrink-0" />
																		<span className="text-xs">Not found</span>
																	</span>
																</TooltipTrigger>
																<TooltipContent className="max-w-xs">
																	<p className="font-medium">
																		Missing Variable Rate
																	</p>
																	<p className="text-xs text-muted-foreground">
																		Could not find a matching variable rate.
																		Total repayable and cost of credit assume
																		the fixed rate continues for the entire
																		term.
																	</p>
																</TooltipContent>
															</Tooltip>
														</TableCell>
													);
												}

												// Has follow-on - show product name
												return (
													<TableCell key={rate.id} className="text-center">
														<p className="text-xs font-medium">
															{rate.followOnRate.name}
														</p>
													</TableCell>
												);
											}

											const value = getComparisonValue(rate, row.key);
											const hasWarning =
												showWarnings && rate.usesFixedRateForWholeTerm;

											return (
												<TableCell
													key={rate.id}
													className={cn(
														"text-center",
														isBest && "text-green-600 font-semibold",
														isWorst && "text-red-600 font-semibold",
													)}
												>
													<span className="inline-flex items-center justify-center gap-1">
														{value}
														{hasWarning && (
															<Tooltip>
																<TooltipTrigger asChild>
																	<span className="inline-flex items-center justify-center cursor-help">
																		<TriangleAlert className="h-3.5 w-3.5 text-yellow-500" />
																	</span>
																</TooltipTrigger>
																<TooltipContent className="max-w-xs">
																	<p className="font-medium">
																		Fixed Rate Used for Whole Term
																	</p>
																	<p className="text-xs text-muted-foreground">
																		No matching follow-on variable rate was
																		found. This calculation assumes the fixed
																		rate continues for the entire term.
																	</p>
																</TooltipContent>
															</Tooltip>
														)}
													</span>
												</TableCell>
											);
										})}
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</div>

				{/* Sticky Footer */}
				<div className="sticky bottom-0 bg-background z-10 px-6 py-4 border-t flex justify-end">
					<ShareButton onShare={handleShare} label="Share Comparison" />
				</div>
			</DialogContent>
		</Dialog>
	);
}
