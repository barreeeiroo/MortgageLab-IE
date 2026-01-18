import { useStore } from "@nanostores/react";
import { ArrowDown, ArrowUp, Calendar, Minus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LenderLogo } from "@/components/lenders/LenderLogo";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
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
import { reconstructRatesAtDate } from "@/lib/stores/rates/rates-history";
import {
	$compareSelectedLender,
	$comparisonDate,
	setCompareSelectedLender,
	setComparisonDate,
} from "@/lib/stores/rates/rates-history-filters";
import { SHORT_MONTH_NAMES } from "@/lib/utils/date";

interface HistoricalComparisonProps {
	historyData: Map<string, RatesHistoryFile>;
	lenders: Lender[];
}

interface ComparisonRate {
	rate: MortgageRate;
	historicalRate?: number;
	currentRate?: number;
	change?: number;
	changePercent?: number;
	status: "unchanged" | "increased" | "decreased" | "new" | "removed";
}

/**
 * Format a date for display
 */
function formatDate(date: Date): string {
	return `${date.getDate()} ${SHORT_MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
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

export function HistoricalComparison({
	historyData,
	lenders,
}: HistoricalComparisonProps) {
	const comparisonDateStr = useStore($comparisonDate);
	const selectedLender = useStore($compareSelectedLender);
	const [currentRates, setCurrentRates] = useState<MortgageRate[]>([]);
	const [loading, setLoading] = useState(true);

	const comparisonDate = comparisonDateStr
		? new Date(comparisonDateStr)
		: undefined;

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

	// Reconstruct historical rates and compare
	const comparisonRates = useMemo(() => {
		if (!comparisonDate || loading) return [];

		const comparisons: ComparisonRate[] = [];
		const processedRateIds = new Set<string>();

		// Get historical rates for each lender
		for (const [lenderId, history] of historyData) {
			if (selectedLender !== "all" && lenderId !== selectedLender) continue;

			const historicalRates = reconstructRatesAtDate(history, comparisonDate);

			// Process historical rates
			for (const histRate of historicalRates) {
				processedRateIds.add(histRate.id);

				// Find current rate with same ID
				const currentRate = currentRates.find((r) => r.id === histRate.id);

				if (!currentRate) {
					// Rate was removed
					comparisons.push({
						rate: histRate,
						historicalRate: histRate.rate,
						currentRate: undefined,
						status: "removed",
					});
				} else if (currentRate.rate !== histRate.rate) {
					// Rate changed
					const change = currentRate.rate - histRate.rate;
					const changePercent = (change / histRate.rate) * 100;
					comparisons.push({
						rate: currentRate,
						historicalRate: histRate.rate,
						currentRate: currentRate.rate,
						change,
						changePercent,
						status: change > 0 ? "increased" : "decreased",
					});
				} else {
					// Rate unchanged
					comparisons.push({
						rate: currentRate,
						historicalRate: histRate.rate,
						currentRate: currentRate.rate,
						change: 0,
						changePercent: 0,
						status: "unchanged",
					});
				}
			}
		}

		// Find new rates (in current but not in historical)
		for (const currentRate of currentRates) {
			if (processedRateIds.has(currentRate.id)) continue;
			if (selectedLender !== "all" && currentRate.lenderId !== selectedLender)
				continue;

			// Check if this lender had history data
			const history = historyData.get(currentRate.lenderId);
			if (!history) continue;

			// Check if baseline date is before comparison date
			const baselineDate = new Date(history.baseline.timestamp);
			if (baselineDate > comparisonDate) continue;

			comparisons.push({
				rate: currentRate,
				historicalRate: undefined,
				currentRate: currentRate.rate,
				status: "new",
			});
		}

		// Sort by change amount (biggest decreases first)
		return comparisons.sort((a, b) => {
			// Decreases first, then unchanged, then increases, then new, then removed
			const statusOrder = {
				decreased: 0,
				unchanged: 1,
				increased: 2,
				new: 3,
				removed: 4,
			};
			const statusDiff = statusOrder[a.status] - statusOrder[b.status];
			if (statusDiff !== 0) return statusDiff;

			// Within same status, sort by change amount
			return (a.change ?? 0) - (b.change ?? 0);
		});
	}, [comparisonDate, historyData, currentRates, selectedLender, loading]);

	// Calculate summary stats
	const stats = useMemo(() => {
		const decreased = comparisonRates.filter((r) => r.status === "decreased");
		const increased = comparisonRates.filter((r) => r.status === "increased");
		const unchanged = comparisonRates.filter((r) => r.status === "unchanged");
		const newRates = comparisonRates.filter((r) => r.status === "new");
		const removed = comparisonRates.filter((r) => r.status === "removed");

		return { decreased, increased, unchanged, newRates, removed };
	}, [comparisonRates]);

	return (
		<div className="space-y-4">
			{/* Controls */}
			<div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/50">
				<span className="text-sm text-muted-foreground">
					Compare rates from
				</span>

				{/* Date Picker */}
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
							disabled={(date) => date > new Date() || date < earliestDate}
						/>
					</PopoverContent>
				</Popover>

				<span className="text-sm text-muted-foreground">to today</span>

				{/* Lender Filter */}
				<Select value={selectedLender} onValueChange={setCompareSelectedLender}>
					<SelectTrigger className="w-[140px] h-8">
						<SelectValue placeholder="All Lenders" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Lenders</SelectItem>
						{lenders.map((lender) => (
							<SelectItem key={lender.id} value={lender.id}>
								{lender.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
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
					{/* Summary Stats */}
					<div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
						<div className="p-3 rounded-lg bg-green-500/10 text-center">
							<div className="text-2xl font-bold text-green-600">
								{stats.decreased.length}
							</div>
							<div className="text-xs text-muted-foreground">Decreased</div>
						</div>
						<div className="p-3 rounded-lg bg-destructive/10 text-center">
							<div className="text-2xl font-bold text-destructive">
								{stats.increased.length}
							</div>
							<div className="text-xs text-muted-foreground">Increased</div>
						</div>
						<div className="p-3 rounded-lg bg-muted text-center">
							<div className="text-2xl font-bold">{stats.unchanged.length}</div>
							<div className="text-xs text-muted-foreground">Unchanged</div>
						</div>
						<div className="p-3 rounded-lg bg-blue-500/10 text-center">
							<div className="text-2xl font-bold text-blue-600">
								{stats.newRates.length}
							</div>
							<div className="text-xs text-muted-foreground">New</div>
						</div>
						<div className="p-3 rounded-lg bg-muted/50 text-center">
							<div className="text-2xl font-bold text-muted-foreground">
								{stats.removed.length}
							</div>
							<div className="text-xs text-muted-foreground">Removed</div>
						</div>
					</div>

					{/* Comparison Table */}
					<div className="space-y-2 max-h-[500px] overflow-y-auto">
						{comparisonRates.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground">
								No rates to compare for this selection
							</div>
						) : (
							comparisonRates.map((comp) => {
								const lender = lenderMap.get(comp.rate.lenderId);

								return (
									<div
										key={comp.rate.id}
										className="flex items-center justify-between py-2 px-3 rounded-lg bg-background border"
									>
										<div className="flex items-center gap-3">
											{/* Status Icon */}
											{comp.status === "decreased" ? (
												<div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500/10">
													<ArrowDown className="h-3.5 w-3.5 text-green-600" />
												</div>
											) : comp.status === "increased" ? (
												<div className="flex items-center justify-center w-6 h-6 rounded-full bg-destructive/10">
													<ArrowUp className="h-3.5 w-3.5 text-destructive" />
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
												<LenderLogo lenderId={comp.rate.lenderId} size={24} />
												<div>
													<div className="text-sm font-medium">
														{lender?.name ?? comp.rate.lenderId}
													</div>
													<div className="text-xs text-muted-foreground truncate max-w-[200px]">
														{comp.rate.name}
													</div>
												</div>
											</div>
										</div>

										{/* Rate Values */}
										<div className="text-sm font-mono text-right">
											{comp.status === "new" ? (
												<span className="text-blue-600">
													{comp.currentRate?.toFixed(2)}% (new)
												</span>
											) : comp.status === "removed" ? (
												<span className="text-muted-foreground line-through">
													{comp.historicalRate?.toFixed(2)}%
												</span>
											) : (
												<div className="flex items-center gap-1.5">
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
													{comp.change !== undefined && comp.change !== 0 && (
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
												</div>
											)}
										</div>
									</div>
								);
							})
						)}
					</div>
				</>
			)}
		</div>
	);
}
