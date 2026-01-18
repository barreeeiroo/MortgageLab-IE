import { useStore } from "@nanostores/react";
import {
	ArrowDown,
	ArrowUp,
	Calendar,
	History,
	Info,
	Minus,
	Pencil,
	Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LenderLogo } from "@/components/lenders/LenderLogo";
import { LenderSelector } from "@/components/lenders/LenderSelector";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { fetchAllRates } from "@/lib/data/fetch";
import type { Lender } from "@/lib/schemas/lender";
import type { MortgageRate } from "@/lib/schemas/rate";
import type { RatesHistoryFile } from "@/lib/schemas/rate-history";
import {
	getRateTimeSeries,
	reconstructRatesAtDate,
} from "@/lib/stores/rates/rates-history";
import {
	$changesFilter,
	$comparisonDate,
	$comparisonEndDate,
	setChangesFilter,
	setComparisonDate,
	setComparisonEndDate,
} from "@/lib/stores/rates/rates-history-filters";
import { cn } from "@/lib/utils/cn";
import { SHORT_MONTH_NAMES } from "@/lib/utils/date";

interface RateChangesProps {
	historyData: Map<string, RatesHistoryFile>;
	lenders: Lender[];
}

interface FieldChange {
	field: string;
	previousValue: unknown;
	newValue: unknown;
}

interface ComparisonRate {
	rate: MortgageRate;
	historicalRate?: number;
	currentRate?: number;
	change?: number;
	changePercent?: number;
	status:
		| "unchanged"
		| "increased"
		| "decreased"
		| "new"
		| "removed"
		| "modified";
	fieldChanges?: FieldChange[];
}

// Common rate types to filter by
const RATE_TYPES = [
	{ value: "all", label: "All Rate Types" },
	{ value: "fixed-1", label: "1-Year Fixed" },
	{ value: "fixed-2", label: "2-Year Fixed" },
	{ value: "fixed-3", label: "3-Year Fixed" },
	{ value: "fixed-4", label: "4-Year Fixed" },
	{ value: "fixed-5", label: "5-Year Fixed" },
	{ value: "fixed-7", label: "7-Year Fixed" },
	{ value: "fixed-10", label: "10-Year Fixed" },
	{ value: "variable", label: "Variable" },
];

// Buyer categories (Primary Residence and BTL are mutually exclusive mortgage types)
const BUYER_CATEGORIES = [
	{ value: "all", label: "All Buyers" },
	{ value: "pdh", label: "Primary Residence" },
	{ value: "btl", label: "Buy to Let" },
] as const;

// Buyer types that belong to each category
const PDH_BUYER_TYPES = ["ftb", "mover", "switcher-pdh"] as const;
const BTL_BUYER_TYPES = ["btl", "switcher-btl"] as const;

/**
 * Extract rate type from rate name/type
 */
function getRateTypeKey(rate: { type: string; fixedTerm?: number }): string {
	if (rate.type === "variable") return "variable";
	if (rate.fixedTerm) return `fixed-${rate.fixedTerm}`;
	return "other";
}

/**
 * Format a date for display
 */
function formatDate(date: Date): string {
	return `${date.getDate()} ${SHORT_MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Format a date string to full date with year
 */
function formatDateFromString(dateStr: string): string {
	return formatDate(new Date(dateStr));
}

/**
 * Get a human-readable mortgage type label
 */
function getMortgageTypeLabel(rate: MortgageRate): string {
	if (rate.type === "variable") return "Variable";
	if (rate.fixedTerm) return `${rate.fixedTerm}-Year Fixed`;
	return rate.type;
}

// Fields to compare between rate objects (excluding rate which is handled separately)
const COMPARABLE_FIELDS: (keyof MortgageRate)[] = [
	"apr",
	"name",
	"minLtv",
	"maxLtv",
	"buyerTypes",
	"berEligible",
	"perks",
	"fixedTerm",
	"minLoan",
	"newBusiness",
	"warning",
];

/**
 * Compares two values for equality (handles arrays and primitives)
 */
function valuesEqual(a: unknown, b: unknown): boolean {
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false;
		const sortedA = [...a].sort();
		const sortedB = [...b].sort();
		return sortedA.every((val, idx) => val === sortedB[idx]);
	}
	return a === b;
}

/**
 * Detects field changes between two rate objects (excluding rate field)
 */
function detectFieldChanges(
	historical: MortgageRate,
	current: MortgageRate,
): FieldChange[] {
	const changes: FieldChange[] = [];

	for (const field of COMPARABLE_FIELDS) {
		const previousValue = historical[field];
		const newValue = current[field];

		if (!valuesEqual(previousValue, newValue)) {
			changes.push({
				field,
				previousValue,
				newValue,
			});
		}
	}

	return changes;
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
	};
	return names[field] ?? field;
}

/**
 * Format a field value for display
 */
function formatFieldValue(field: string, value: unknown): string {
	if (value === undefined || value === null) return "—";
	if (Array.isArray(value)) {
		if (value.length === 0) return "None";
		return value.join(", ");
	}
	if (typeof value === "boolean") return value ? "Yes" : "No";
	if (typeof value === "number") {
		if (field === "apr") return `${value.toFixed(2)}%`;
		if (field.includes("Ltv") || field.includes("ltv")) return `${value}%`;
		return String(value);
	}
	return String(value);
}

/**
 * Get the earliest date available in history
 */
function getEarliestDate(historyData: Map<string, RatesHistoryFile>): Date {
	let earliest = new Date();

	for (const history of historyData.values()) {
		const baselineDate = new Date(history.baseline.timestamp);
		if (baselineDate < earliest) {
			earliest = baselineDate;
		}
	}

	return earliest;
}

export function RateChanges({ historyData, lenders }: RateChangesProps) {
	const comparisonDateStr = useStore($comparisonDate);
	const comparisonEndDateStr = useStore($comparisonEndDate);
	const changesFilter = useStore($changesFilter);
	const [currentRates, setCurrentRates] = useState<MortgageRate[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [activeStatuses, setActiveStatuses] = useState<
		Set<ComparisonRate["status"]>
	>(
		() => new Set(["decreased", "increased", "modified", "new", "removed"]), // All except "unchanged"
	);

	const comparisonDate = comparisonDateStr
		? new Date(comparisonDateStr)
		: undefined;
	const comparisonEndDate = comparisonEndDateStr
		? new Date(comparisonEndDateStr)
		: undefined;
	const isEndDateToday = !comparisonEndDate;

	// Extract filter values
	const selectedLenderIds = changesFilter.lenderIds;
	const selectedLenderSet = useMemo(
		() => new Set(selectedLenderIds),
		[selectedLenderIds],
	);

	// Load current rates
	useEffect(() => {
		async function loadCurrentRates() {
			setLoading(true);
			try {
				const { rates } = await fetchAllRates(lenders);
				setCurrentRates(rates);
			} catch (_err) {
				// Ignore errors, will show empty
			}
			setLoading(false);
		}

		loadCurrentRates();
	}, [lenders]);

	// Create lender lookup map
	const lenderMap = useMemo(() => {
		const map = new Map<string, Lender>();
		for (const lender of lenders) {
			map.set(lender.id, lender);
		}
		return map;
	}, [lenders]);

	// Calculate earliest available date
	const earliestDate = useMemo(
		() => getEarliestDate(historyData),
		[historyData],
	);

	// Helper function to check if a rate matches the current filters
	const matchesFilters = useCallback(
		(rate: MortgageRate): boolean => {
			// Filter by lender (empty = all lenders)
			if (
				selectedLenderIds.length > 0 &&
				!selectedLenderSet.has(rate.lenderId)
			) {
				return false;
			}

			// Filter by rate type
			if (changesFilter.rateType) {
				const rateTypeKey = getRateTypeKey(rate);
				if (rateTypeKey !== changesFilter.rateType) return false;
			}

			// Filter by buyer category
			if (changesFilter.buyerCategory !== "all") {
				const allowedTypes =
					changesFilter.buyerCategory === "pdh"
						? PDH_BUYER_TYPES
						: BTL_BUYER_TYPES;
				const hasAllowedType = rate.buyerTypes.some((bt) =>
					(allowedTypes as readonly string[]).includes(bt),
				);
				if (!hasAllowedType) return false;
			}

			return true;
		},
		[
			selectedLenderIds.length,
			selectedLenderSet,
			changesFilter.rateType,
			changesFilter.buyerCategory,
		],
	);

	// Get end date rates (either current or reconstructed from history)
	const endRates = useMemo(() => {
		if (isEndDateToday) {
			// Use current rates when comparing to today
			return currentRates;
		}
		// Reconstruct rates at the end date
		const rates: MortgageRate[] = [];
		for (const [lenderId, history] of historyData) {
			// Filter by lender if specified
			if (selectedLenderIds.length > 0 && !selectedLenderSet.has(lenderId))
				continue;
			const reconstructed = reconstructRatesAtDate(
				history,
				comparisonEndDate as Date,
			);
			rates.push(...reconstructed);
		}
		return rates;
	}, [
		isEndDateToday,
		currentRates,
		historyData,
		comparisonEndDate,
		selectedLenderIds,
		selectedLenderSet,
	]);

	// Reconstruct historical rates and compare
	const comparisonRates = useMemo(() => {
		if (!comparisonDate || loading) return [];

		const comparisons: ComparisonRate[] = [];
		const processedRateIds = new Set<string>();

		// Get historical rates for each lender
		for (const [lenderId, history] of historyData) {
			// Filter by lender if specified
			if (selectedLenderIds.length > 0 && !selectedLenderSet.has(lenderId))
				continue;

			const historicalRates = reconstructRatesAtDate(history, comparisonDate);

			// Process historical rates
			for (const histRate of historicalRates) {
				// Apply filters to historical rate
				if (!matchesFilters(histRate)) continue;

				processedRateIds.add(histRate.id);

				// Find rate at end date with same ID
				const endRate = endRates.find((r) => r.id === histRate.id);

				if (!endRate || !matchesFilters(endRate)) {
					// Rate was removed (or doesn't match filters at end date)
					comparisons.push({
						rate: histRate,
						historicalRate: histRate.rate,
						currentRate: undefined,
						status: "removed",
					});
				} else {
					// Detect field changes between historical and current
					const fieldChanges = detectFieldChanges(histRate, endRate);
					const hasRateChange = endRate.rate !== histRate.rate;

					if (hasRateChange) {
						// Rate changed (possibly with other field changes)
						const change = endRate.rate - histRate.rate;
						const changePercent = (change / histRate.rate) * 100;
						comparisons.push({
							rate: endRate,
							historicalRate: histRate.rate,
							currentRate: endRate.rate,
							change,
							changePercent,
							status: change > 0 ? "increased" : "decreased",
							fieldChanges: fieldChanges.length > 0 ? fieldChanges : undefined,
						});
					} else if (fieldChanges.length > 0) {
						// Only non-rate fields changed
						comparisons.push({
							rate: endRate,
							historicalRate: histRate.rate,
							currentRate: endRate.rate,
							change: 0,
							changePercent: 0,
							status: "modified",
							fieldChanges,
						});
					} else {
						// Completely unchanged
						comparisons.push({
							rate: endRate,
							historicalRate: histRate.rate,
							currentRate: endRate.rate,
							change: 0,
							changePercent: 0,
							status: "unchanged",
						});
					}
				}
			}
		}

		// Find new rates (in end rates but not in historical)
		for (const endRate of endRates) {
			if (processedRateIds.has(endRate.id)) continue;
			// Apply filters
			if (!matchesFilters(endRate)) continue;

			// Check if this lender had history data
			const history = historyData.get(endRate.lenderId);
			if (!history) continue;

			// Check if baseline date is before comparison date
			const baselineDate = new Date(history.baseline.timestamp);
			if (baselineDate > comparisonDate) continue;

			comparisons.push({
				rate: endRate,
				historicalRate: undefined,
				currentRate: endRate.rate,
				status: "new",
			});
		}

		// Sort by change amount (biggest decreases first)
		return comparisons.sort((a, b) => {
			// Decreases first, then modified, then unchanged, then increases, then new, then removed
			const statusOrder: Record<ComparisonRate["status"], number> = {
				decreased: 0,
				modified: 1,
				unchanged: 2,
				increased: 3,
				new: 4,
				removed: 5,
			};
			const statusDiff = statusOrder[a.status] - statusOrder[b.status];
			if (statusDiff !== 0) return statusDiff;

			// Within same status, sort by change amount
			return (a.change ?? 0) - (b.change ?? 0);
		});
	}, [
		comparisonDate,
		historyData,
		endRates,
		selectedLenderIds,
		selectedLenderSet,
		loading,
		matchesFilters,
	]);

	// Filter by search query
	const searchFilteredRates = useMemo(() => {
		if (!searchQuery.trim()) return comparisonRates;

		const query = searchQuery.toLowerCase().trim();
		return comparisonRates.filter((comp) => {
			const lender = lenderMap.get(comp.rate.lenderId);
			const lenderName = lender?.name ?? comp.rate.lenderId;
			return (
				comp.rate.name.toLowerCase().includes(query) ||
				lenderName.toLowerCase().includes(query)
			);
		});
	}, [comparisonRates, searchQuery, lenderMap]);

	// Calculate summary stats (based on search-filtered rates)
	const stats = useMemo(() => {
		const decreased = searchFilteredRates.filter(
			(r) => r.status === "decreased",
		);
		const increased = searchFilteredRates.filter(
			(r) => r.status === "increased",
		);
		const modified = searchFilteredRates.filter((r) => r.status === "modified");
		const unchanged = searchFilteredRates.filter(
			(r) => r.status === "unchanged",
		);
		const newRates = searchFilteredRates.filter((r) => r.status === "new");
		const removed = searchFilteredRates.filter((r) => r.status === "removed");

		return { decreased, increased, modified, unchanged, newRates, removed };
	}, [searchFilteredRates]);

	// Filter by active status toggles (for display)
	const displayRates = useMemo(() => {
		return searchFilteredRates.filter((comp) =>
			activeStatuses.has(comp.status),
		);
	}, [searchFilteredRates, activeStatuses]);

	// Toggle a status filter
	const toggleStatus = (status: ComparisonRate["status"]) => {
		setActiveStatuses((prev) => {
			const next = new Set(prev);
			if (next.has(status)) {
				next.delete(status);
			} else {
				next.add(status);
			}
			return next;
		});
	};

	return (
		<div className="space-y-4">
			{/* Controls */}
			<div className="flex flex-wrap items-start gap-4 p-4 rounded-lg bg-muted/50">
				{/* Date Range */}
				<div className="space-y-1.5">
					<Label className="text-xs">Date Range</Label>
					<div className="flex items-center gap-2">
						<Popover>
							<PopoverTrigger asChild>
								<Button variant="outline" className="gap-2 h-8">
									<Calendar className="h-4 w-4" />
									{comparisonDate ? formatDate(comparisonDate) : "Select date"}
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-auto p-0" align="start">
								<CalendarComponent
									mode="single"
									selected={comparisonDate}
									onSelect={(date) =>
										setComparisonDate(date ? date.toISOString() : null)
									}
									disabled={(date) =>
										date > (comparisonEndDate ?? new Date()) ||
										date < earliestDate
									}
								/>
							</PopoverContent>
						</Popover>

						<span className="text-sm text-muted-foreground">to</span>

						<Popover>
							<PopoverTrigger asChild>
								<Button variant="outline" className="gap-2 h-8">
									<Calendar className="h-4 w-4" />
									{comparisonEndDate ? formatDate(comparisonEndDate) : "Today"}
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-auto p-0" align="start">
								<div className="p-2 border-b">
									<Button
										variant="ghost"
										size="sm"
										className="w-full justify-start"
										onClick={() => setComparisonEndDate(null)}
									>
										Today (default)
									</Button>
								</div>
								<CalendarComponent
									mode="single"
									selected={comparisonEndDate}
									onSelect={(date) =>
										setComparisonEndDate(date ? date.toISOString() : null)
									}
									disabled={(date) =>
										date > new Date() ||
										(comparisonDate
											? date < comparisonDate
											: date < earliestDate)
									}
								/>
							</PopoverContent>
						</Popover>
					</div>
				</div>

				{/* Rate Type Filter */}
				<div className="space-y-1.5">
					<Label className="text-xs">Rate Type</Label>
					<Select
						value={changesFilter.rateType ?? "all"}
						onValueChange={(v) =>
							setChangesFilter({ rateType: v === "all" ? null : v })
						}
					>
						<SelectTrigger className="w-[140px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{RATE_TYPES.map((type) => (
								<SelectItem key={type.value} value={type.value}>
									{type.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Buyer Category Filter */}
				<div className="space-y-1.5">
					<Label className="text-xs">Buyer Type</Label>
					<Select
						value={changesFilter.buyerCategory}
						onValueChange={(v) =>
							setChangesFilter({
								buyerCategory: v as "all" | "pdh" | "btl",
							})
						}
					>
						<SelectTrigger className="w-[180px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{BUYER_CATEGORIES.map((cat) => (
								<SelectItem key={cat.value} value={cat.value}>
									{cat.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Lender Selection */}
				<div className="space-y-1.5">
					<Label className="text-xs">Lenders</Label>
					<LenderSelector
						lenders={lenders}
						value={selectedLenderIds}
						onChange={(ids) => setChangesFilter({ lenderIds: ids })}
						multiple
						placeholder="All Lenders"
						className="w-[260px]"
					/>
				</div>
			</div>

			{/* Search Input */}
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<Input
					type="text"
					placeholder="Search by product name or lender..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="pl-9"
				/>
			</div>

			{/* Content */}
			{!comparisonDate ? (
				<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
					<Calendar className="h-8 w-8 mb-4" />
					<p>Select a date to compare rates</p>
					<p className="text-xs mt-1">
						Data available from {formatDate(earliestDate)}
					</p>
				</div>
			) : loading ? (
				<div className="flex items-center justify-center py-12 text-muted-foreground">
					Loading...
				</div>
			) : (
				<>
					{/* Summary Stats - Clickable Filters */}
					<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
						<button
							type="button"
							onClick={() => toggleStatus("decreased")}
							className={cn(
								"p-3 rounded-lg text-center transition-all cursor-pointer hover:opacity-80",
								activeStatuses.has("decreased")
									? "bg-green-500/10 ring-2 ring-green-500/50"
									: "bg-muted/30 opacity-50 hover:opacity-70",
							)}
						>
							<div
								className={cn(
									"text-2xl font-bold",
									activeStatuses.has("decreased")
										? "text-green-600"
										: "text-muted-foreground",
								)}
							>
								{stats.decreased.length}
							</div>
							<div className="text-xs text-muted-foreground">Decreased</div>
						</button>
						<button
							type="button"
							onClick={() => toggleStatus("increased")}
							className={cn(
								"p-3 rounded-lg text-center transition-all cursor-pointer hover:opacity-80",
								activeStatuses.has("increased")
									? "bg-destructive/10 ring-2 ring-destructive/50"
									: "bg-muted/30 opacity-50 hover:opacity-70",
							)}
						>
							<div
								className={cn(
									"text-2xl font-bold",
									activeStatuses.has("increased")
										? "text-destructive"
										: "text-muted-foreground",
								)}
							>
								{stats.increased.length}
							</div>
							<div className="text-xs text-muted-foreground">Increased</div>
						</button>
						<button
							type="button"
							onClick={() => toggleStatus("modified")}
							className={cn(
								"p-3 rounded-lg text-center transition-all cursor-pointer hover:opacity-80",
								activeStatuses.has("modified")
									? "bg-amber-500/10 ring-2 ring-amber-500/50"
									: "bg-muted/30 opacity-50 hover:opacity-70",
							)}
						>
							<div
								className={cn(
									"text-2xl font-bold",
									activeStatuses.has("modified")
										? "text-amber-600"
										: "text-muted-foreground",
								)}
							>
								{stats.modified.length}
							</div>
							<div className="text-xs text-muted-foreground">Modified</div>
						</button>
						<button
							type="button"
							onClick={() => toggleStatus("unchanged")}
							className={cn(
								"p-3 rounded-lg text-center transition-all cursor-pointer hover:opacity-80",
								activeStatuses.has("unchanged")
									? "bg-muted/50 ring-2 ring-muted-foreground/30"
									: "bg-muted/30 opacity-50 hover:opacity-70",
							)}
						>
							<div
								className={cn(
									"text-2xl font-bold",
									activeStatuses.has("unchanged")
										? "text-foreground"
										: "text-muted-foreground",
								)}
							>
								{stats.unchanged.length}
							</div>
							<div className="text-xs text-muted-foreground">Unchanged</div>
						</button>
						<button
							type="button"
							onClick={() => toggleStatus("new")}
							className={cn(
								"p-3 rounded-lg text-center transition-all cursor-pointer hover:opacity-80",
								activeStatuses.has("new")
									? "bg-blue-500/10 ring-2 ring-blue-500/50"
									: "bg-muted/30 opacity-50 hover:opacity-70",
							)}
						>
							<div
								className={cn(
									"text-2xl font-bold",
									activeStatuses.has("new")
										? "text-blue-600"
										: "text-muted-foreground",
								)}
							>
								{stats.newRates.length}
							</div>
							<div className="text-xs text-muted-foreground">New</div>
						</button>
						<button
							type="button"
							onClick={() => toggleStatus("removed")}
							className={cn(
								"p-3 rounded-lg text-center transition-all cursor-pointer hover:opacity-80",
								activeStatuses.has("removed")
									? "bg-muted/50 ring-2 ring-muted-foreground/30"
									: "bg-muted/30 opacity-50 hover:opacity-70",
							)}
						>
							<div
								className={cn(
									"text-2xl font-bold",
									activeStatuses.has("removed")
										? "text-muted-foreground"
										: "text-muted-foreground/50",
								)}
							>
								{stats.removed.length}
							</div>
							<div className="text-xs text-muted-foreground">Removed</div>
						</button>
					</div>

					{/* Rate Changes List */}
					<div className="space-y-2">
						{displayRates.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground">
								{searchQuery
									? "No rates match your search"
									: activeStatuses.size === 0
										? "Select a status filter above"
										: "No rates to compare for this selection"}
							</div>
						) : (
							displayRates.map((comp) => {
								const lender = lenderMap.get(comp.rate.lenderId);
								const history = historyData.get(comp.rate.lenderId);
								const timeSeries = history
									? getRateTimeSeries(history, comp.rate.id)
									: null;

								return (
									<Popover key={comp.rate.id}>
										<PopoverTrigger asChild>
											<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2 px-3 rounded-lg bg-background border cursor-pointer hover:bg-muted/50 transition-colors">
												<div className="flex items-center gap-3 min-w-0">
													{/* Status Icon */}
													{comp.status === "decreased" ? (
														<div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-green-500/10">
															<ArrowDown className="h-3.5 w-3.5 text-green-600" />
															{comp.fieldChanges &&
																comp.fieldChanges.length > 0 && (
																	<span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">
																		{comp.fieldChanges.length}
																	</span>
																)}
														</div>
													) : comp.status === "increased" ? (
														<div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-destructive/10">
															<ArrowUp className="h-3.5 w-3.5 text-destructive" />
															{comp.fieldChanges &&
																comp.fieldChanges.length > 0 && (
																	<span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">
																		{comp.fieldChanges.length}
																	</span>
																)}
														</div>
													) : comp.status === "modified" ? (
														<div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/10">
															<Pencil className="h-3.5 w-3.5 text-amber-600" />
														</div>
													) : comp.status === "new" ? (
														<div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10">
															<span className="text-xs font-bold text-blue-600">
																N
															</span>
														</div>
													) : comp.status === "removed" ? (
														<div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted">
															<span className="text-xs font-bold text-muted-foreground">
																R
															</span>
														</div>
													) : (
														<div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted">
															<Minus className="h-3.5 w-3.5 text-muted-foreground" />
														</div>
													)}

													{/* Lender & Rate Info */}
													<div className="flex items-center gap-2">
														<LenderLogo
															lenderId={comp.rate.lenderId}
															size={24}
														/>
														<div>
															<div className="text-sm font-medium truncate max-w-[200px]">
																{comp.rate.name}
															</div>
															<div className="text-xs text-muted-foreground">
																{lender?.name ?? comp.rate.lenderId} •{" "}
																{getMortgageTypeLabel(comp.rate)}
															</div>
														</div>
													</div>
												</div>

												{/* Rate Values */}
												<div className="text-sm font-mono sm:text-right pl-9 sm:pl-0 shrink-0">
													{comp.status === "new" ? (
														<span className="text-blue-600">
															{comp.currentRate?.toFixed(2)}% (new)
														</span>
													) : comp.status === "removed" ? (
														<span className="text-muted-foreground line-through">
															{comp.historicalRate?.toFixed(2)}%
														</span>
													) : comp.status === "modified" ? (
														<div className="flex items-center gap-1.5">
															<span>{comp.currentRate?.toFixed(2)}%</span>
															<span className="text-amber-600 text-xs">
																({comp.fieldChanges?.length} field
																{comp.fieldChanges?.length !== 1 ? "s" : ""})
															</span>
														</div>
													) : (
														<div className="flex items-center gap-1.5 flex-wrap">
															<span className="text-muted-foreground">
																{comp.historicalRate?.toFixed(2)}%
															</span>
															<span className="text-muted-foreground">→</span>
															<span
																className={
																	comp.status === "increased"
																		? "text-destructive font-medium"
																		: comp.status === "decreased"
																			? "text-green-600 font-medium"
																			: ""
																}
															>
																{comp.currentRate?.toFixed(2)}%
															</span>
															{comp.change !== undefined &&
																comp.change !== 0 && (
																	<span
																		className={`text-xs ${
																			comp.change > 0
																				? "text-destructive"
																				: "text-green-600"
																		}`}
																	>
																		({comp.change > 0 ? "+" : ""}
																		{comp.change.toFixed(2)})
																	</span>
																)}
															{comp.fieldChanges &&
																comp.fieldChanges.length > 0 && (
																	<span className="text-amber-600 text-xs">
																		+{comp.fieldChanges.length}
																	</span>
																)}
														</div>
													)}
												</div>
											</div>
										</PopoverTrigger>
										<PopoverContent className="w-80" align="start">
											<div className="space-y-3">
												<div className="flex items-center gap-2">
													<History className="h-4 w-4 text-muted-foreground" />
													<span className="font-medium">Rate Details</span>
												</div>
												<div className="text-sm text-muted-foreground">
													{comp.rate.name}
												</div>

												{/* Field Changes Section */}
												{comp.fieldChanges && comp.fieldChanges.length > 0 && (
													<div className="border-t pt-3">
														<div className="flex items-center gap-2 mb-2">
															<Info className="h-4 w-4 text-amber-600" />
															<span className="text-sm font-medium">
																Field Changes
															</span>
														</div>
														<div className="space-y-1.5">
															{comp.fieldChanges.map((fc) => (
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
																			{formatFieldValue(fc.field, fc.newValue)}
																		</span>
																	</div>
																</div>
															))}
														</div>
													</div>
												)}

												{/* Rate History Section */}
												{(() => {
													if (
														!timeSeries ||
														timeSeries.dataPoints.length === 0 ||
														!comparisonDate
													) {
														return (
															<div className="text-sm text-muted-foreground py-2">
																No history available
															</div>
														);
													}

													const endDate = comparisonEndDate ?? new Date();

													// Find the baseline rate at the start date (most recent point before or on start date)
													let baselinePoint: {
														timestamp: string;
														rate: number;
													} | null = null;
													for (const point of timeSeries.dataPoints) {
														const pointDate = new Date(point.timestamp);
														if (pointDate <= comparisonDate) {
															baselinePoint = point;
														} else {
															break;
														}
													}

													// Get changes within the period (after start date, up to end date)
													const changesInPeriod = timeSeries.dataPoints.filter(
														(point) => {
															const pointDate = new Date(point.timestamp);
															return (
																pointDate > comparisonDate &&
																pointDate <= endDate
															);
														},
													);

													// Build display points: baseline + changes
													const displayPoints: Array<{
														timestamp: string;
														rate: number;
														isBaseline?: boolean;
													}> = [];

													if (baselinePoint) {
														displayPoints.push({
															timestamp: comparisonDate.toISOString(),
															rate: baselinePoint.rate,
															isBaseline: true,
														});
													}

													for (const point of changesInPeriod) {
														displayPoints.push(point);
													}

													if (displayPoints.length === 0) {
														return (
															<div className="text-sm text-muted-foreground py-2">
																No history available
															</div>
														);
													}

													return (
														<div className="space-y-1 max-h-[200px] overflow-y-auto">
															{displayPoints
																.slice()
																.reverse()
																.map((point, idx, arr) => {
																	const prevPoint = arr[idx + 1];
																	const change = prevPoint
																		? point.rate - prevPoint.rate
																		: null;
																	return (
																		<div
																			key={point.timestamp}
																			className="flex items-center justify-between py-1.5 border-b last:border-0"
																		>
																			<span className="text-xs text-muted-foreground">
																				{formatDateFromString(point.timestamp)}
																			</span>
																			<div className="flex items-center gap-2">
																				<span className="font-mono text-sm">
																					{point.rate.toFixed(2)}%
																				</span>
																				{change !== null && change !== 0 && (
																					<span
																						className={`text-xs ${
																							change > 0
																								? "text-destructive"
																								: "text-green-600"
																						}`}
																					>
																						{change > 0 ? "+" : ""}
																						{change.toFixed(2)}
																					</span>
																				)}
																			</div>
																		</div>
																	);
																})}
														</div>
													);
												})()}
											</div>
										</PopoverContent>
									</Popover>
								);
							})
						)}
					</div>
				</>
			)}
		</div>
	);
}
