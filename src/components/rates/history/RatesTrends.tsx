import { useStore } from "@nanostores/react";
import { TrendingUp } from "lucide-react";
import { useEffect, useMemo } from "react";
import type { Lender } from "@/lib/schemas/lender";
import type {
	RatesHistoryFile,
	RateTimeSeries,
} from "@/lib/schemas/rate-history";
import { getRateTimeSeries } from "@/lib/stores/rates/rates-history";
import {
	$trendsFilter,
	$trendsSelectedLenders,
	setTrendsSelectedLenders,
} from "@/lib/stores/rates/rates-history-filters";
import { RatesTrendChart } from "./RatesTrendChart";
import { TrendsFilters } from "./TrendsFilters";
import { type RateStat, TrendsStatsTable } from "./TrendsStatsTable";

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

export function RatesTrends({ historyData, lenders }: RatesTrendsProps) {
	const filter = useStore($trendsFilter);
	const selectedLenders = useStore($trendsSelectedLenders);

	// Initialize selected lenders to first lender if empty
	useEffect(() => {
		if (selectedLenders.length === 0 && lenders.length > 0) {
			setTrendsSelectedLenders([lenders[0].id]);
		}
	}, [lenders, selectedLenders.length]);

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
			if (rateSeries && rateSeries.dataPoints.length > 1) {
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

	// Calculate average time series across all rates
	const averageSeries = useMemo((): RateTimeSeries | null => {
		if (timeSeries.length < 2) return null;

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
	}, [timeSeries]);

	// Calculate min/max/current stats for each rate
	const rateStats = useMemo((): RateStat[] => {
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
	}, [timeSeries, lenders]);

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
						Showing {timeSeries.length} rate
						{timeSeries.length !== 1 ? "s" : ""} with historical data
					</div>

					<RatesTrendChart
						data={timeSeries}
						averageSeries={averageSeries}
						showLegend={true}
						height={350}
						animate={false}
					/>

					{/* Rate Stats Table */}
					<TrendsStatsTable rateStats={rateStats} />
				</div>
			)}
		</div>
	);
}
