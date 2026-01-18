import { useStore } from "@nanostores/react";
import { TrendingUp } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import type { Lender } from "@/lib/schemas/lender";
import type {
	RatesHistoryFile,
	RateTimeSeries,
} from "@/lib/schemas/rate-history";
import { getRateTimeSeries } from "@/lib/stores/rates/rates-history";
import {
	$trendsFilter,
	$trendsLendersFirstVisit,
	$trendsSelectedLenders,
	setTrendsSelectedLenders,
} from "@/lib/stores/rates/rates-history-filters";
import { type MarketDataPoint, RatesTrendChart } from "./RatesTrendChart";
import { TrendsFilters } from "./TrendsFilters";
import {
	type MarketOverviewStats,
	type RateStat,
	TrendsStatsTable,
} from "./TrendsStatsTable";

interface RatesTrendsProps {
	historyData: Map<string, RatesHistoryFile>;
	lenders: Lender[];
}

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
 * Get display label for rate type key
 */
function getRateTypeLabel(key: string): string {
	if (key === "variable") return "Variable";
	if (key.startsWith("fixed-")) {
		const term = key.replace("fixed-", "");
		return `${term}-Year Fixed`;
	}
	return key;
}

/**
 * Get LTV bucket key for a rate
 */
function getLtvKey(maxLtv: number): string {
	if (maxLtv <= 50) return "ltv-50";
	if (maxLtv <= 60) return "ltv-60";
	if (maxLtv <= 70) return "ltv-70";
	if (maxLtv <= 80) return "ltv-80";
	return "ltv-90";
}

/**
 * Get display label for LTV key
 */
function getLtvLabel(key: string): string {
	const ltv = key.replace("ltv-", "");
	return `≤${ltv}% LTV`;
}

/**
 * Get buyer type category key for a rate
 */
function getBuyerTypeKey(buyerTypes: string[]): string {
	const hasPdh = buyerTypes.some((bt) =>
		(PDH_BUYER_TYPES as readonly string[]).includes(bt),
	);
	const hasBtl = buyerTypes.some((bt) =>
		(BTL_BUYER_TYPES as readonly string[]).includes(bt),
	);
	if (hasPdh && hasBtl) return "buyer-both";
	if (hasBtl) return "buyer-btl";
	return "buyer-pdh";
}

/**
 * Get display label for buyer type key
 */
function getBuyerTypeLabel(key: string): string {
	if (key === "buyer-pdh") return "Primary Residence";
	if (key === "buyer-btl") return "Buy to Let";
	if (key === "buyer-both") return "All Buyers";
	return key;
}

export function RatesTrends({ historyData, lenders }: RatesTrendsProps) {
	const filter = useStore($trendsFilter);
	const selectedLenders = useStore($trendsSelectedLenders);
	const isFirstVisit = useStore($trendsLendersFirstVisit);

	const isMarketOverview = filter.displayMode === "market-overview";

	// Initialize selected lenders to all lenders ONLY on first visit (no localStorage data)
	// This ensures user's explicit "clear all" selection is preserved on refresh
	const initializedRef = useRef(false);
	useEffect(() => {
		if (!initializedRef.current && lenders.length > 0 && isFirstVisit) {
			initializedRef.current = true;
			// First visit: inject all lenders as default, then mark as no longer first visit
			setTrendsSelectedLenders(lenders.map((l) => l.id));
			$trendsLendersFirstVisit.set(false);
		}
	}, [lenders, isFirstVisit]);

	// Get available rates that have history
	const availableRates = useMemo(() => {
		const rates: Array<{
			id: string;
			name: string;
			lenderId: string;
			type: string;
			fixedTerm?: number;
			maxLtv: number;
			buyerTypes: string[];
		}> = [];

		for (const [lenderId, history] of historyData) {
			// Get rates from baseline
			for (const rate of history.baseline.rates) {
				rates.push({
					id: rate.id,
					name: rate.name,
					lenderId,
					type: rate.type,
					fixedTerm: rate.fixedTerm,
					maxLtv: rate.maxLtv,
					buyerTypes: rate.buyerTypes,
				});
			}

			// Also check changesets for added rates
			for (const changeset of history.changesets) {
				for (const op of changeset.operations) {
					if (op.op === "add") {
						rates.push({
							id: op.rate.id,
							name: op.rate.name,
							lenderId,
							type: op.rate.type,
							fixedTerm: op.rate.fixedTerm,
							maxLtv: op.rate.maxLtv,
							buyerTypes: op.rate.buyerTypes,
						});
					}
				}
			}
		}

		// Remove duplicates
		const seen = new Set<string>();
		return rates.filter((r) => {
			if (seen.has(r.id)) return false;
			seen.add(r.id);
			return true;
		});
	}, [historyData]);

	// Filter rates based on current filters
	const filteredRates = useMemo(() => {
		const selectedSet = new Set(selectedLenders);
		return availableRates.filter((rate) => {
			// Filter by selected lenders
			if (!selectedSet.has(rate.lenderId)) return false;

			// Filter by rate type
			if (filter.rateType && filter.rateType !== "all") {
				const rateTypeKey = getRateTypeKey(rate);
				if (rateTypeKey !== filter.rateType) return false;
			}

			// Filter by LTV
			if (filter.ltvRange) {
				const [, maxLtv] = filter.ltvRange;
				if (rate.maxLtv > maxLtv) return false;
			}

			// Filter by buyer category (PDH and BTL are mutually exclusive)
			if (filter.buyerCategory !== "all") {
				const allowedTypes =
					filter.buyerCategory === "pdh" ? PDH_BUYER_TYPES : BTL_BUYER_TYPES;
				const hasAllowedType = rate.buyerTypes.some((bt) =>
					(allowedTypes as readonly string[]).includes(bt),
				);
				if (!hasAllowedType) return false;
			}

			return true;
		});
	}, [availableRates, selectedLenders, filter]);

	// Create lender map for quick lookup
	const lenderMap = useMemo(() => {
		return new Map(lenders.map((l) => [l.id, l]));
	}, [lenders]);

	// Get time series for filtered rates
	const timeSeries = useMemo(() => {
		const series: RateTimeSeries[] = [];
		const showLenderPrefix = selectedLenders.length > 1;

		for (const rate of filteredRates) {
			const history = historyData.get(rate.lenderId);
			if (!history) continue;

			const rateSeries = getRateTimeSeries(history, rate.id);
			if (rateSeries && rateSeries.dataPoints.length >= 1) {
				// Prefix rate name with lender short name when multiple lenders selected
				if (showLenderPrefix) {
					const lender = lenderMap.get(rate.lenderId);
					const prefix = lender?.shortName ?? rate.lenderId;
					series.push({
						...rateSeries,
						rateName: `${prefix} ${rateSeries.rateName}`,
					});
				} else {
					series.push(rateSeries);
				}
			}
		}

		return series;
	}, [filteredRates, historyData, selectedLenders.length, lenderMap]);

	// Calculate average time series across all rates (for individual mode)
	const averageSeries = useMemo((): RateTimeSeries | null => {
		if (timeSeries.length < 2 || isMarketOverview) return null;

		// Collect all unique timestamps
		const timestampSet = new Set<string>();
		for (const series of timeSeries) {
			for (const point of series.dataPoints) {
				timestampSet.add(point.timestamp);
			}
		}

		// Add today's date to show average extending to present
		timestampSet.add(new Date().toISOString());

		// Sort timestamps chronologically
		const timestamps = Array.from(timestampSet).sort(
			(a, b) => new Date(a).getTime() - new Date(b).getTime(),
		);

		// For each timestamp, calculate the average of all rates that have data at or before that time
		const dataPoints: Array<{ timestamp: string; rate: number }> = [];

		for (const ts of timestamps) {
			const tsTime = new Date(ts).getTime();
			const ratesAtTime: number[] = [];

			for (const series of timeSeries) {
				// Find the most recent rate at or before this timestamp
				let lastRate: number | null = null;
				for (const point of series.dataPoints) {
					if (new Date(point.timestamp).getTime() <= tsTime) {
						lastRate = point.rate;
					} else {
						break;
					}
				}
				if (lastRate !== null) {
					ratesAtTime.push(lastRate);
				}
			}

			if (ratesAtTime.length > 0) {
				const avg =
					ratesAtTime.reduce((sum, r) => sum + r, 0) / ratesAtTime.length;
				dataPoints.push({ timestamp: ts, rate: avg });
			}
		}

		return {
			rateId: "average",
			rateName: "Average",
			lenderId: "",
			dataPoints,
		};
	}, [timeSeries, isMarketOverview]);

	// Calculate market data (min/avg/max per timestamp) for market overview mode
	const marketData = useMemo((): MarketDataPoint[] => {
		if (!isMarketOverview || timeSeries.length === 0) return [];
		// Skip when grouped mode is active - we use breakdownSeries instead
		if (filter.marketChartStyle === "grouped") return [];

		// Collect all unique timestamps
		const timestampSet = new Set<string>();
		for (const series of timeSeries) {
			for (const point of series.dataPoints) {
				timestampSet.add(point.timestamp);
			}
		}

		// Add today's date
		timestampSet.add(new Date().toISOString());

		// Sort timestamps chronologically
		const timestamps = Array.from(timestampSet).sort(
			(a, b) => new Date(a).getTime() - new Date(b).getTime(),
		);

		const dataPoints: MarketDataPoint[] = [];

		for (const ts of timestamps) {
			const tsTime = new Date(ts).getTime();
			const ratesAtTime: number[] = [];

			for (const series of timeSeries) {
				// Find the most recent rate at or before this timestamp
				let lastRate: number | null = null;
				for (const point of series.dataPoints) {
					if (new Date(point.timestamp).getTime() <= tsTime) {
						lastRate = point.rate;
					} else {
						break;
					}
				}
				if (lastRate !== null) {
					ratesAtTime.push(lastRate);
				}
			}

			if (ratesAtTime.length > 0) {
				const min = Math.min(...ratesAtTime);
				const max = Math.max(...ratesAtTime);
				const avg =
					ratesAtTime.reduce((sum, r) => sum + r, 0) / ratesAtTime.length;
				dataPoints.push({ timestamp: ts, min, max, avg });
			}
		}

		return dataPoints;
	}, [timeSeries, isMarketOverview, filter.marketChartStyle]);

	// Calculate breakdown series - grouped by selected dimensions
	const breakdownSeries = useMemo((): RateTimeSeries[] => {
		if (!isMarketOverview || filter.marketChartStyle !== "grouped") return [];

		// Build compound group key for a rate based on selected dimensions
		const getGroupKey = (rate: {
			lenderId: string;
			type: string;
			fixedTerm?: number;
			maxLtv: number;
			buyerTypes: string[];
		}): string => {
			const parts: string[] = [];
			for (const dim of filter.breakdownBy) {
				if (dim === "lender") parts.push(rate.lenderId);
				else if (dim === "rate-type") parts.push(getRateTypeKey(rate));
				else if (dim === "ltv") parts.push(getLtvKey(rate.maxLtv));
				else if (dim === "buyer-type")
					parts.push(getBuyerTypeKey(rate.buyerTypes));
			}
			return parts.join("|");
		};

		// Build display label from compound key
		const getGroupLabel = (key: string): string => {
			const parts = key.split("|");
			const labels: string[] = [];
			let dimIndex = 0;
			for (const dim of filter.breakdownBy) {
				const part = parts[dimIndex++];
				if (dim === "lender") labels.push(lenderMap.get(part)?.name ?? part);
				else if (dim === "rate-type") labels.push(getRateTypeLabel(part));
				else if (dim === "ltv") labels.push(getLtvLabel(part));
				else if (dim === "buyer-type") labels.push(getBuyerTypeLabel(part));
			}
			return labels.join(" · ");
		};

		// Get lender ID from compound key (for logo display)
		const getLenderIdFromKey = (key: string): string => {
			if (!filter.breakdownBy.includes("lender")) return "";
			const lenderIndex = filter.breakdownBy.indexOf("lender");
			return key.split("|")[lenderIndex] ?? "";
		};

		// Group filtered rates by compound key
		const groups = new Map<
			string,
			Array<{
				id: string;
				lenderId: string;
				type: string;
				fixedTerm?: number;
				maxLtv: number;
				buyerTypes: string[];
			}>
		>();

		for (const rate of filteredRates) {
			const key = getGroupKey(rate);
			if (!groups.has(key)) {
				groups.set(key, []);
			}
			groups.get(key)?.push(rate);
		}

		// For each group, calculate average time series
		const series: RateTimeSeries[] = [];

		for (const [groupKey, rates] of groups) {
			// Get time series for all rates in this group
			const groupTimeSeries: RateTimeSeries[] = [];
			for (const rate of rates) {
				const history = historyData.get(rate.lenderId);
				if (!history) continue;

				const rateSeries = getRateTimeSeries(history, rate.id);
				if (rateSeries && rateSeries.dataPoints.length >= 1) {
					groupTimeSeries.push(rateSeries);
				}
			}

			if (groupTimeSeries.length === 0) continue;

			// Collect all unique timestamps
			const timestampSet = new Set<string>();
			for (const ts of groupTimeSeries) {
				for (const point of ts.dataPoints) {
					timestampSet.add(point.timestamp);
				}
			}
			timestampSet.add(new Date().toISOString());

			// Sort timestamps chronologically
			const timestamps = Array.from(timestampSet).sort(
				(a, b) => new Date(a).getTime() - new Date(b).getTime(),
			);

			// Calculate average at each timestamp
			const dataPoints: Array<{ timestamp: string; rate: number }> = [];

			for (const ts of timestamps) {
				const tsTime = new Date(ts).getTime();
				const ratesAtTime: number[] = [];

				for (const groupTs of groupTimeSeries) {
					let lastRate: number | null = null;
					for (const point of groupTs.dataPoints) {
						if (new Date(point.timestamp).getTime() <= tsTime) {
							lastRate = point.rate;
						} else {
							break;
						}
					}
					if (lastRate !== null) {
						ratesAtTime.push(lastRate);
					}
				}

				if (ratesAtTime.length > 0) {
					const avg =
						ratesAtTime.reduce((sum, r) => sum + r, 0) / ratesAtTime.length;
					dataPoints.push({ timestamp: ts, rate: avg });
				}
			}

			series.push({
				rateId: groupKey,
				rateName: getGroupLabel(groupKey),
				lenderId: getLenderIdFromKey(groupKey),
				dataPoints,
			});
		}

		// Sort series for consistent ordering
		return series.sort((a, b) => a.rateName.localeCompare(b.rateName));
	}, [
		isMarketOverview,
		filter.marketChartStyle,
		filter.breakdownBy,
		filteredRates,
		historyData,
		lenderMap,
	]);

	// Calculate market overview statistics
	const marketOverviewStats = useMemo((): MarketOverviewStats | null => {
		if (!isMarketOverview || marketData.length === 0) return null;

		const currentPoint = marketData[marketData.length - 1];

		// Find historical lowest and highest averages
		let lowestAvgPoint = marketData[0];
		let highestAvgPoint = marketData[0];

		for (const point of marketData) {
			if (point.avg < lowestAvgPoint.avg) lowestAvgPoint = point;
			if (point.avg > highestAvgPoint.avg) highestAvgPoint = point;
		}

		// Count unique lenders included
		const lenderSet = new Set<string>();
		for (const rate of filteredRates) {
			lenderSet.add(rate.lenderId);
		}

		return {
			currentAverage: currentPoint.avg,
			currentMin: currentPoint.min,
			currentMax: currentPoint.max,
			currentDate: currentPoint.timestamp,
			historicalLowest: lowestAvgPoint.avg,
			historicalLowestDate: lowestAvgPoint.timestamp,
			historicalHighest: highestAvgPoint.avg,
			historicalHighestDate: highestAvgPoint.timestamp,
			lendersIncluded: lenderSet.size,
			ratesIncluded: timeSeries.length,
		};
	}, [marketData, isMarketOverview, filteredRates, timeSeries.length]);

	// Calculate breakdown statistics (per-group stats for grouped mode)
	const breakdownStats = useMemo((): RateStat[] => {
		if (!isMarketOverview || filter.marketChartStyle !== "grouped") return [];

		return breakdownSeries.map((series) => {
			const points = series.dataPoints;

			if (points.length === 0) {
				return {
					rateId: series.rateId,
					rateName: series.rateName,
					lenderId: series.lenderId,
					lenderName: series.rateName,
					min: null,
					max: null,
					current: null,
				};
			}

			let minPoint = points[0];
			let maxPoint = points[0];

			for (const point of points) {
				if (point.rate < minPoint.rate) minPoint = point;
				if (point.rate > maxPoint.rate) maxPoint = point;
			}

			const currentPoint = points[points.length - 1];

			return {
				rateId: series.rateId,
				rateName: series.rateName,
				lenderId: series.lenderId,
				lenderName: series.rateName,
				min: { rate: minPoint.rate, date: minPoint.timestamp },
				max: { rate: maxPoint.rate, date: maxPoint.timestamp },
				current: { rate: currentPoint.rate, date: currentPoint.timestamp },
			};
		});
	}, [isMarketOverview, filter.marketChartStyle, breakdownSeries]);

	// Calculate min/max/current stats for each rate (individual mode)
	const rateStats = useMemo((): RateStat[] => {
		if (isMarketOverview) return [];

		return timeSeries.map((series) => {
			const lender = lenders.find((l) => l.id === series.lenderId);
			const points = series.dataPoints;

			if (points.length === 0) {
				return {
					rateId: series.rateId,
					rateName: series.rateName,
					lenderId: series.lenderId,
					lenderName: lender?.name ?? series.lenderId,
					min: null,
					max: null,
					current: null,
				};
			}

			let minPoint = points[0];
			let maxPoint = points[0];

			for (const point of points) {
				if (point.rate < minPoint.rate) minPoint = point;
				if (point.rate > maxPoint.rate) maxPoint = point;
			}

			const currentPoint = points[points.length - 1];

			return {
				rateId: series.rateId,
				rateName: series.rateName,
				lenderId: series.lenderId,
				lenderName: lender?.name ?? series.lenderId,
				min: { rate: minPoint.rate, date: minPoint.timestamp },
				max: { rate: maxPoint.rate, date: maxPoint.timestamp },
				current: { rate: currentPoint.rate, date: currentPoint.timestamp },
			};
		});
	}, [timeSeries, lenders, isMarketOverview]);

	// Determine if grouped mode is active
	const isGroupedActive =
		isMarketOverview && filter.marketChartStyle === "grouped";

	// Count unique lenders for info text
	const uniqueLenderCount = useMemo(() => {
		const lenderSet = new Set<string>();
		for (const rate of filteredRates) {
			lenderSet.add(rate.lenderId);
		}
		return lenderSet.size;
	}, [filteredRates]);

	return (
		<div className="space-y-4">
			{/* Filters */}
			<TrendsFilters lenders={lenders} />

			{/* Chart */}
			{timeSeries.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
					<TrendingUp className="h-8 w-8 mb-4" />
					<p>No rates match your filters</p>
					<p className="text-xs mt-1">
						Try selecting different lenders or rate types
					</p>
				</div>
			) : (
				<div className="space-y-4">
					<div className="text-sm text-muted-foreground">
						{isGroupedActive ? (
							<>
								Showing {breakdownSeries.length} group
								{breakdownSeries.length !== 1 ? "s" : ""} based on{" "}
								{timeSeries.length} rate{timeSeries.length !== 1 ? "s" : ""}
							</>
						) : isMarketOverview ? (
							<>
								Market overview based on {timeSeries.length} rate
								{timeSeries.length !== 1 ? "s" : ""} from {uniqueLenderCount}{" "}
								lender{uniqueLenderCount !== 1 ? "s" : ""}
							</>
						) : (
							<>
								Showing {timeSeries.length} rate
								{timeSeries.length !== 1 ? "s" : ""} with historical data
							</>
						)}
					</div>

					<RatesTrendChart
						data={
							isGroupedActive
								? breakdownSeries
								: isMarketOverview
									? []
									: timeSeries
						}
						averageSeries={isMarketOverview ? null : averageSeries}
						marketData={
							isMarketOverview && !isGroupedActive ? marketData : undefined
						}
						displayStyle={
							isGroupedActive
								? "lines"
								: isMarketOverview
									? filter.marketChartStyle === "range-band"
										? "range-band"
										: "average"
									: "lines"
						}
						showLegend={!isMarketOverview || isGroupedActive}
						height={350}
						animate={false}
					/>

					{/* Stats Table */}
					<TrendsStatsTable
						rateStats={
							isGroupedActive
								? breakdownStats
								: isMarketOverview
									? []
									: rateStats
						}
						marketStats={
							isMarketOverview && !isGroupedActive ? marketOverviewStats : null
						}
						isGroupedMode={isGroupedActive}
						breakdownBy={filter.breakdownBy}
					/>
				</div>
			)}
		</div>
	);
}
