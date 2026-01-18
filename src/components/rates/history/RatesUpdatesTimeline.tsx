import { useStore } from "@nanostores/react";
import {
	ArrowDown,
	ArrowUp,
	ChevronDown,
	ChevronUp,
	Filter,
	Info,
	Pencil,
	Plus,
	Trash2,
	X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LenderLogo } from "@/components/lenders/LenderLogo";
import { LenderSelector } from "@/components/lenders/LenderSelector";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Lender } from "@/lib/schemas/lender";
import type { RateChange, RatesHistoryFile } from "@/lib/schemas/rate-history";
import { getRateChanges } from "@/lib/stores/rates/rates-history";
import {
	$updatesFilter,
	resetUpdatesFilter,
	setUpdatesFilter,
} from "@/lib/stores/rates/rates-history-filters";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/currency";
import { SHORT_MONTH_NAMES } from "@/lib/utils/date";

interface UpdatesTimelineProps {
	historyData: Map<string, RatesHistoryFile>;
	lenders: Lender[];
}

interface GroupedChanges {
	date: string;
	dateLabel: string;
	changes: (RateChange & { lenderId: string })[];
}

/**
 * Format a date string to a display label
 */
function formatDateLabel(dateStr: string): string {
	const date = new Date(dateStr);
	return `${date.getDate()} ${SHORT_MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Get date key from timestamp (YYYY-MM-DD)
 */
function getDateKey(timestamp: string): string {
	return timestamp.split("T")[0];
}

/**
 * Group changes by date and sort descending
 */
function groupChangesByDate(
	changes: (RateChange & { lenderId: string })[],
): GroupedChanges[] {
	const groups = new Map<string, (RateChange & { lenderId: string })[]>();

	for (const change of changes) {
		const dateKey = getDateKey(change.timestamp);
		const existing = groups.get(dateKey) ?? [];
		existing.push(change);
		groups.set(dateKey, existing);
	}

	// Sort by date descending
	const sortedKeys = Array.from(groups.keys()).sort(
		(a, b) => new Date(b).getTime() - new Date(a).getTime(),
	);

	return sortedKeys.map((dateKey) => ({
		date: dateKey,
		dateLabel: formatDateLabel(dateKey),
		changes: groups.get(dateKey) ?? [],
	}));
}

/**
 * Format a field name for display
 */
function formatFieldName(field: string): string {
	const names: Record<string, string> = {
		apr: "APR",
		name: "Name",
		minLtv: "Min LTV",
		maxLtv: "Max LTV",
		buyerTypes: "Buyer Types",
		berEligible: "BER Eligible",
		perks: "Perks",
		fixedTerm: "Fixed Term",
		minLoan: "Min Loan",
		newBusiness: "New Business",
		warning: "Warning",
		rate: "Rate",
	};
	return names[field] ?? field;
}

/** Buyer type labels for display */
const BUYER_TYPE_LABELS: Record<string, string> = {
	ftb: "First Time Buyer",
	mover: "Mover",
	btl: "Buy to Let",
	"switcher-pdh": "Switcher (Home)",
	"switcher-btl": "Switcher (BTL)",
};

/**
 * Format a perk ID to a readable label
 */
function formatPerkId(perkId: string): string {
	// Convert "cashback-2pct" to "Cashback 2%", "fee-free-banking" to "Fee Free Banking"
	return perkId
		.split("-")
		.map((word) => {
			if (word === "pct") return "%";
			return word.charAt(0).toUpperCase() + word.slice(1);
		})
		.join(" ")
		.replace(" %", "%");
}

/**
 * Format a field value for display
 */
function formatFieldValue(field: string, value: unknown): string {
	if (value === undefined || value === null) return "—";

	// Handle arrays based on field type
	if (Array.isArray(value)) {
		if (value.length === 0) return "None";
		if (field === "buyerTypes") {
			return value.map((v) => BUYER_TYPE_LABELS[v] ?? v).join(", ");
		}
		if (field === "perks") {
			return value.map((v) => formatPerkId(v)).join(", ");
		}
		// berEligible and others - show as-is
		return value.join(", ");
	}

	if (typeof value === "boolean") return value ? "Yes" : "No";

	if (typeof value === "number") {
		if (field === "apr" || field === "rate") return `${value.toFixed(2)}%`;
		if (field === "minLtv" || field === "maxLtv") return `${value}%`;
		if (field === "fixedTerm") return `${value} year${value !== 1 ? "s" : ""}`;
		if (field === "minLoan") {
			return formatCurrency(value);
		}
		return String(value);
	}

	return String(value);
}

export function RatesUpdatesTimeline({
	historyData,
	lenders,
}: UpdatesTimelineProps) {
	const filter = useStore($updatesFilter);
	const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
	const [expandedFieldChanges, setExpandedFieldChanges] = useState<Set<string>>(
		new Set(),
	);

	// Create lender lookup map
	const lenderMap = useMemo(() => {
		const map = new Map<string, Lender>();
		for (const lender of lenders) {
			map.set(lender.id, lender);
		}
		return map;
	}, [lenders]);

	// Get all changes from all lenders
	const allChanges = useMemo(() => {
		const changes: (RateChange & { lenderId: string })[] = [];

		// Parse date filters
		const startDate = filter.startDate ? new Date(filter.startDate) : undefined;
		const endDate = filter.endDate ? new Date(filter.endDate) : undefined;

		for (const [lenderId, history] of historyData) {
			// Skip if lender filter is set and this lender is not included
			if (filter.lenderIds.length > 0 && !filter.lenderIds.includes(lenderId)) {
				continue;
			}

			const lenderChanges = getRateChanges(history, startDate, endDate);

			for (const change of lenderChanges) {
				// Apply change type filter
				if (filter.changeType !== "all") {
					// Determine if this is a "modified only" change (has field changes but no rate change)
					const hasRateChange =
						change.changeAmount !== undefined && change.changeAmount !== 0;
					const hasFieldChanges =
						change.fieldChanges && change.fieldChanges.length > 0;
					const isModifiedOnly =
						change.changeType === "changed" &&
						!hasRateChange &&
						hasFieldChanges;

					if (filter.changeType === "increase") {
						if (change.changeType !== "changed") continue;
						if (
							!hasRateChange ||
							change.changeAmount === undefined ||
							change.changeAmount <= 0
						)
							continue;
					}
					if (filter.changeType === "decrease") {
						if (change.changeType !== "changed") continue;
						if (
							!hasRateChange ||
							change.changeAmount === undefined ||
							change.changeAmount >= 0
						)
							continue;
					}
					if (filter.changeType === "modified") {
						// Only show changes where the rate didn't change but other fields did
						if (!isModifiedOnly) continue;
					}
					if (filter.changeType === "added" && change.changeType !== "added")
						continue;
					if (
						filter.changeType === "removed" &&
						change.changeType !== "removed"
					)
						continue;
				}

				changes.push({ ...change, lenderId });
			}
		}

		return changes;
	}, [historyData, filter]);

	// Group changes by date
	const groupedChanges = useMemo(
		() => groupChangesByDate(allChanges),
		[allChanges],
	);

	// Extract unique years from grouped changes (descending order)
	const availableYears = useMemo(() => {
		const years = new Set<number>();
		for (const group of groupedChanges) {
			years.add(new Date(group.date).getFullYear());
		}
		return Array.from(years).sort((a, b) => b - a);
	}, [groupedChanges]);

	// Refs to track the first group element of each year
	const yearRefs = useRef<Map<number, HTMLDivElement>>(new Map());

	// Track active year based on scroll position
	const [activeYear, setActiveYear] = useState<number | null>(null);

	// Scroll to a specific year's first group
	const scrollToYear = (year: number) => {
		const element = yearRefs.current.get(year);
		if (element) {
			element.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	};

	// Use Intersection Observer to track active year on scroll
	// biome-ignore lint/correctness/useExhaustiveDependencies: yearRefs is populated during render based on availableYears
	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						const year = Number(entry.target.getAttribute("data-year"));
						if (!Number.isNaN(year)) {
							setActiveYear(year);
						}
						break;
					}
				}
			},
			{ rootMargin: "-100px 0px -80% 0px" },
		);

		for (const el of yearRefs.current.values()) {
			observer.observe(el);
		}
		return () => observer.disconnect();
	}, [availableYears]);

	// Initialize active year when years are available
	useEffect(() => {
		if (availableYears.length > 0 && activeYear === null) {
			setActiveYear(availableYears[0]);
		}
	}, [availableYears, activeYear]);

	// Toggle date expansion
	const toggleDate = (date: string) => {
		const newExpanded = new Set(expandedDates);
		if (newExpanded.has(date)) {
			newExpanded.delete(date);
		} else {
			newExpanded.add(date);
		}
		setExpandedDates(newExpanded);
	};

	// Check if any filters are active
	const hasActiveFilters =
		filter.lenderIds.length > 0 ||
		filter.changeType !== "all" ||
		filter.startDate !== null ||
		filter.endDate !== null;

	return (
		<div className="space-y-4">
			{/* Filter Bar */}
			<div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-muted/50">
				<Filter className="h-4 w-4 text-muted-foreground" />

				{/* Lender Filter */}
				<LenderSelector
					lenders={lenders}
					value={filter.lenderIds}
					onChange={(ids) => setUpdatesFilter({ lenderIds: ids })}
					className="w-[160px]"
				/>

				{/* Change Type Filter */}
				<Select
					value={filter.changeType}
					onValueChange={(v) =>
						setUpdatesFilter({
							changeType: v as typeof filter.changeType,
						})
					}
				>
					<SelectTrigger className="w-[130px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Changes</SelectItem>
						<SelectItem value="increase">Increases</SelectItem>
						<SelectItem value="decrease">Decreases</SelectItem>
						<SelectItem value="modified">Modified</SelectItem>
						<SelectItem value="added">New Rates</SelectItem>
						<SelectItem value="removed">Removed</SelectItem>
					</SelectContent>
				</Select>

				{/* Clear Filters */}
				{hasActiveFilters && (
					<Button
						variant="ghost"
						size="sm"
						className="h-8 gap-1"
						onClick={resetUpdatesFilter}
					>
						<X className="h-3 w-3" />
						Clear
					</Button>
				)}

				{/* Results Count */}
				<span className="ml-auto text-xs text-muted-foreground">
					{allChanges.length} change{allChanges.length !== 1 ? "s" : ""}
				</span>
			</div>

			{/* Timeline with Year Selector */}
			{groupedChanges.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
					<p>No rate changes found</p>
					{hasActiveFilters && (
						<Button
							variant="link"
							size="sm"
							className="mt-2"
							onClick={resetUpdatesFilter}
						>
							Clear filters
						</Button>
					)}
				</div>
			) : (
				<div className="flex gap-4">
					{/* Timeline content */}
					<div className="flex-1 space-y-3 min-w-0">
						{(() => {
							// Track years seen to know when to add refs
							const yearsSeen = new Set<number>();

							return groupedChanges.map((group) => {
								const groupYear = new Date(group.date).getFullYear();
								const isFirstOfYear = !yearsSeen.has(groupYear);
								if (isFirstOfYear) {
									yearsSeen.add(groupYear);
								}

								const isExpanded =
									expandedDates.has(group.date) || groupedChanges.length <= 3;
								const visibleChanges = isExpanded
									? group.changes
									: group.changes.slice(0, 3);
								const hasMore = group.changes.length > 3 && !isExpanded;

								return (
									<div
										key={group.date}
										className="space-y-2"
										ref={
											isFirstOfYear
												? (el) => {
														if (el) {
															yearRefs.current.set(groupYear, el);
														} else {
															yearRefs.current.delete(groupYear);
														}
													}
												: undefined
										}
										data-year={isFirstOfYear ? groupYear : undefined}
									>
										{/* Date Header */}
										<button
											type="button"
											onClick={() => toggleDate(group.date)}
											className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full cursor-pointer"
										>
											<span className="bg-muted px-2 py-0.5 rounded">
												{group.dateLabel}
											</span>
											<span className="text-xs">
												({group.changes.length} change
												{group.changes.length !== 1 ? "s" : ""})
											</span>
										</button>

										{/* Changes for this date */}
										<div className="ml-2 border-l-2 border-muted pl-4 space-y-2">
											{visibleChanges.map((change, idx) => {
												const lender = lenderMap.get(change.lenderId);

												// Determine if this is a "modified only" change
												const hasRateChange =
													change.changeAmount !== undefined &&
													change.changeAmount !== 0;
												const hasFieldChanges =
													change.fieldChanges && change.fieldChanges.length > 0;
												const isModifiedOnly =
													change.changeType === "changed" &&
													!hasRateChange &&
													hasFieldChanges;

												const changeKey = `${change.rateId}-${change.timestamp}-${idx}`;
												const isFieldsExpanded =
													expandedFieldChanges.has(changeKey);

												const toggleFieldsExpanded = () => {
													const newExpanded = new Set(expandedFieldChanges);
													if (isFieldsExpanded) {
														newExpanded.delete(changeKey);
													} else {
														newExpanded.add(changeKey);
													}
													setExpandedFieldChanges(newExpanded);
												};

												return (
													<div
														key={changeKey}
														className="rounded-lg bg-background border hover:border-border/80 transition-colors overflow-hidden"
													>
														<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 px-3 gap-2">
															<div className="flex items-center gap-3 min-w-0">
																{/* Change Type Icon */}
																<div className="shrink-0">
																	{change.changeType === "changed" ? (
																		isModifiedOnly ? (
																			<div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/10">
																				<Pencil className="h-3.5 w-3.5 text-amber-600" />
																			</div>
																		) : change.changeAmount &&
																			change.changeAmount > 0 ? (
																			<div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-destructive/10">
																				<ArrowUp className="h-3.5 w-3.5 text-destructive" />
																				{hasFieldChanges && (
																					<span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">
																						{change.fieldChanges?.length}
																					</span>
																				)}
																			</div>
																		) : (
																			<div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-green-500/10">
																				<ArrowDown className="h-3.5 w-3.5 text-green-600" />
																				{hasFieldChanges && (
																					<span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">
																						{change.fieldChanges?.length}
																					</span>
																				)}
																			</div>
																		)
																	) : change.changeType === "added" ? (
																		<div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10">
																			<Plus className="h-3.5 w-3.5 text-blue-600" />
																		</div>
																	) : (
																		<div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted">
																			<Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
																		</div>
																	)}
																</div>

																{/* Lender Logo & Info */}
																<div className="flex items-center gap-2 min-w-0">
																	<LenderLogo
																		lenderId={change.lenderId}
																		size={24}
																	/>
																	<div className="min-w-0">
																		<div className="text-sm font-medium truncate">
																			{lender?.name ?? change.lenderId}
																		</div>
																		<div className="text-xs text-muted-foreground truncate">
																			{change.rateName}
																		</div>
																	</div>
																</div>
															</div>

															<div className="flex items-center gap-2 sm:gap-3 justify-between sm:justify-end pl-9 sm:pl-0">
																{/* Field Changes Toggle */}
																{hasFieldChanges && (
																	<button
																		type="button"
																		onClick={toggleFieldsExpanded}
																		className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 cursor-pointer shrink-0"
																	>
																		<Info className="h-3 w-3" />
																		<span>
																			{change.fieldChanges?.length} field
																			{change.fieldChanges?.length !== 1
																				? "s"
																				: ""}
																		</span>
																		{isFieldsExpanded ? (
																			<ChevronUp className="h-3 w-3" />
																		) : (
																			<ChevronDown className="h-3 w-3" />
																		)}
																	</button>
																)}

																{/* Rate Values */}
																<div className="text-sm font-mono text-right shrink-0">
																	{change.changeType === "changed" ? (
																		isModifiedOnly ? (
																			<span>{change.newRate?.toFixed(2)}%</span>
																		) : (
																			<div className="flex items-center gap-1.5">
																				<span className="text-muted-foreground">
																					{change.previousRate?.toFixed(2)}%
																				</span>
																				<span className="text-muted-foreground">
																					→
																				</span>
																				<span
																					className={
																						change.changeAmount &&
																						change.changeAmount > 0
																							? "text-destructive font-medium"
																							: "text-green-600 font-medium"
																					}
																				>
																					{change.newRate?.toFixed(2)}%
																				</span>
																			</div>
																		)
																	) : change.changeType === "added" ? (
																		<span className="text-blue-600">
																			{change.newRate?.toFixed(2)}%
																		</span>
																	) : (
																		<span className="text-muted-foreground line-through">
																			{change.previousRate?.toFixed(2)}%
																		</span>
																	)}
																</div>
															</div>
														</div>

														{/* Expanded Field Changes */}
														{isFieldsExpanded && hasFieldChanges && (
															<div className="px-3 pb-3 pt-1 border-t border-border/50">
																<div className="space-y-1.5">
																	{change.fieldChanges?.map((fc) => (
																		<div
																			key={fc.field}
																			className="text-xs rounded bg-muted/50 px-2 py-1.5"
																		>
																			<span className="font-medium text-foreground">
																				{formatFieldName(fc.field)}:
																			</span>
																			<div className="flex items-center gap-1 mt-0.5 text-muted-foreground">
																				<span className="line-through">
																					{formatFieldValue(
																						fc.field,
																						fc.previousValue,
																					)}
																				</span>
																				<span>→</span>
																				<span className="text-foreground">
																					{formatFieldValue(
																						fc.field,
																						fc.newValue,
																					)}
																				</span>
																			</div>
																		</div>
																	))}
																</div>
															</div>
														)}
													</div>
												);
											})}

											{/* Show More Button */}
											{hasMore && (
												<button
													type="button"
													onClick={() => toggleDate(group.date)}
													className="text-xs text-muted-foreground hover:text-foreground transition-colors pl-2 cursor-pointer"
												>
													+ {group.changes.length - 3} more changes
												</button>
											)}
										</div>
									</div>
								);
							});
						})()}
					</div>

					{/* Year Selector - Desktop only, sticky below navbar */}
					{availableYears.length > 1 && (
						<div className="hidden lg:block w-14 shrink-0">
							<div className="sticky top-[4.5rem] space-y-0.5">
								{availableYears.map((year) => (
									<button
										key={year}
										type="button"
										onClick={() => scrollToYear(year)}
										className={cn(
											"w-full text-sm py-1 text-right transition-colors cursor-pointer",
											activeYear === year
												? "text-primary font-medium"
												: "text-muted-foreground hover:text-foreground",
										)}
									>
										{year}
									</button>
								))}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
