import { useStore } from "@nanostores/react";
import { ArrowDown, ArrowUp, Filter, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
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
} from "@/lib/stores/rates/rates-history-ui";
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

export function UpdatesTimeline({
	historyData,
	lenders,
}: UpdatesTimelineProps) {
	const filter = useStore($updatesFilter);
	const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

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
					if (
						filter.changeType === "increase" &&
						change.changeType !== "changed"
					)
						continue;
					if (
						filter.changeType === "increase" &&
						change.changeAmount !== undefined &&
						change.changeAmount <= 0
					)
						continue;
					if (
						filter.changeType === "decrease" &&
						change.changeType !== "changed"
					)
						continue;
					if (
						filter.changeType === "decrease" &&
						change.changeAmount !== undefined &&
						change.changeAmount >= 0
					)
						continue;
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
					<SelectTrigger className="w-[130px] h-8">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Changes</SelectItem>
						<SelectItem value="increase">Increases</SelectItem>
						<SelectItem value="decrease">Decreases</SelectItem>
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

			{/* Timeline */}
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
				<div className="space-y-3">
					{groupedChanges.map((group) => {
						const isExpanded =
							expandedDates.has(group.date) || groupedChanges.length <= 3;
						const visibleChanges = isExpanded
							? group.changes
							: group.changes.slice(0, 3);
						const hasMore = group.changes.length > 3 && !isExpanded;

						return (
							<div key={group.date} className="space-y-2">
								{/* Date Header */}
								<button
									type="button"
									onClick={() => toggleDate(group.date)}
									className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
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

										return (
											<div
												key={`${change.rateId}-${change.timestamp}-${idx}`}
												className="flex items-center justify-between py-2 px-3 rounded-lg bg-background border hover:border-border/80 transition-colors"
											>
												<div className="flex items-center gap-3">
													{/* Change Type Icon */}
													{change.changeType === "changed" ? (
														change.changeAmount && change.changeAmount > 0 ? (
															<div className="flex items-center justify-center w-6 h-6 rounded-full bg-destructive/10">
																<ArrowUp className="h-3.5 w-3.5 text-destructive" />
															</div>
														) : (
															<div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500/10">
																<ArrowDown className="h-3.5 w-3.5 text-green-600" />
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

													{/* Lender Logo & Info */}
													<div className="flex items-center gap-2">
														<LenderLogo lenderId={change.lenderId} size={24} />
														<div>
															<div className="text-sm font-medium">
																{lender?.name ?? change.lenderId}
															</div>
															<div className="text-xs text-muted-foreground truncate max-w-[200px]">
																{change.rateName}
															</div>
														</div>
													</div>
												</div>

												{/* Rate Values */}
												<div className="text-sm font-mono text-right">
													{change.changeType === "changed" ? (
														<div className="flex items-center gap-1.5">
															<span className="text-muted-foreground">
																{change.previousRate?.toFixed(2)}%
															</span>
															<span className="text-muted-foreground">→</span>
															<span
																className={
																	change.changeAmount && change.changeAmount > 0
																		? "text-destructive font-medium"
																		: "text-green-600 font-medium"
																}
															>
																{change.newRate?.toFixed(2)}%
															</span>
														</div>
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
										);
									})}

									{/* Show More Button */}
									{hasMore && (
										<button
											type="button"
											onClick={() => toggleDate(group.date)}
											className="text-xs text-muted-foreground hover:text-foreground transition-colors pl-2"
										>
											+ {group.changes.length - 3} more changes
										</button>
									)}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
