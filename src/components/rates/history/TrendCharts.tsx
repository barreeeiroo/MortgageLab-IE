import { useStore } from "@nanostores/react";
import { TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { LenderLogo } from "@/components/lenders/LenderLogo";
import { LenderSelector } from "@/components/lenders/LenderSelector";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { Lender } from "@/lib/schemas/lender";
import type {
	RatesHistoryFile,
	RateTimeSeries,
} from "@/lib/schemas/rate-history";
import { getRateTimeSeries } from "@/lib/stores/rates/rates-history";
import {
	$trendsFilter,
	setTrendsFilter,
} from "@/lib/stores/rates/rates-history-ui";
import { formatShortMonthYearFromString } from "@/lib/utils/date";
import { RateTrendChart } from "./RateTrendChart";

interface TrendChartsProps {
	historyData: Map<string, RatesHistoryFile>;
	lenders: Lender[];
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

// LTV ranges to filter by
const LTV_RANGES = [
	{ value: "all", label: "All LTV" },
	{ value: "50", label: "Up to 50% LTV" },
	{ value: "60", label: "Up to 60% LTV" },
	{ value: "70", label: "Up to 70% LTV" },
	{ value: "80", label: "Up to 80% LTV" },
	{ value: "90", label: "Up to 90% LTV" },
];

// Buyer categories (Primary Residence and BTL are mutually exclusive mortgage types)
const BUYER_CATEGORIES = [
	{ value: "pdh", label: "Primary Residence" },
	{ value: "btl", label: "Buy to Let" },
	{ value: "all", label: "All Buyers" },
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

export function TrendCharts({ historyData, lenders }: TrendChartsProps) {
	const filter = useStore($trendsFilter);
	const [selectedLenders, setSelectedLenders] = useState<string[]>(
		lenders.slice(0, 1).map((l) => l.id),
	);

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

	// Get time series for filtered rates
	const timeSeries = useMemo(() => {
		const series: RateTimeSeries[] = [];

		for (const rate of filteredRates) {
			const history = historyData.get(rate.lenderId);
			if (!history) continue;

			const rateSeries = getRateTimeSeries(history, rate.id);
			if (rateSeries && rateSeries.dataPoints.length > 1) {
				series.push(rateSeries);
			}
		}

		return series;
	}, [filteredRates, historyData]);

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
	const rateStats = useMemo(() => {
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

	// Parse LTV filter value
	const ltvValue = filter.ltvRange ? String(filter.ltvRange[1]) : "all";

	return (
		<div className="space-y-4">
			{/* Filters */}
			<div className="flex flex-wrap items-start gap-4 p-4 rounded-lg bg-muted/50">
				{/* Rate Type Filter */}
				<div className="space-y-1.5">
					<Label className="text-xs">Rate Type</Label>
					<Select
						value={filter.rateType ?? "all"}
						onValueChange={(v) =>
							setTrendsFilter({ rateType: v === "all" ? null : v })
						}
					>
						<SelectTrigger className="w-[140px] h-8">
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

				{/* LTV Filter */}
				<div className="space-y-1.5">
					<Label className="text-xs">Max LTV</Label>
					<Select
						value={ltvValue}
						onValueChange={(v) =>
							setTrendsFilter({
								ltvRange: v === "all" ? null : [0, Number.parseInt(v, 10)],
							})
						}
					>
						<SelectTrigger className="w-[120px] h-8">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{LTV_RANGES.map((ltv) => (
								<SelectItem key={ltv.value} value={ltv.value}>
									{ltv.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Buyer Category Filter */}
				<div className="space-y-1.5">
					<Label className="text-xs">Buyer Type</Label>
					<Select
						value={filter.buyerCategory}
						onValueChange={(v) =>
							setTrendsFilter({
								buyerCategory: v as "all" | "pdh" | "btl",
							})
						}
					>
						<SelectTrigger className="w-[180px] h-8">
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
						value={selectedLenders}
						onChange={setSelectedLenders}
						multiple
						placeholder="Select lenders"
						className="w-[260px]"
					/>
				</div>
			</div>

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

					<RateTrendChart
						data={timeSeries}
						averageSeries={averageSeries}
						showLegend={true}
						height={350}
						animate={false}
					/>

					{/* Rate Stats Table */}
					{rateStats.length > 0 && (
						<div className="rounded-lg border overflow-hidden">
							<Table>
								<TableHeader>
									<TableRow className="bg-muted/50">
										<TableHead className="font-medium">Lender</TableHead>
										<TableHead className="font-medium">Rate</TableHead>
										<TableHead className="text-right font-medium">
											Min
										</TableHead>
										<TableHead className="text-right font-medium">
											Max
										</TableHead>
										<TableHead className="text-right font-medium">
											Current
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{rateStats.map((stat) => (
										<TableRow key={stat.rateId}>
											<TableCell>
												<div className="flex items-center gap-2">
													<LenderLogo lenderId={stat.lenderId} size={20} />
													<span className="font-medium">{stat.lenderName}</span>
												</div>
											</TableCell>
											<TableCell className="text-muted-foreground">
												{stat.rateName}
											</TableCell>
											<TableCell className="text-right">
												{stat.min ? (
													<div>
														<div className="font-mono">
															{stat.min.rate.toFixed(2)}%
														</div>
														<div className="text-xs text-muted-foreground">
															{formatShortMonthYearFromString(stat.min.date)}
														</div>
													</div>
												) : (
													"—"
												)}
											</TableCell>
											<TableCell className="text-right">
												{stat.max ? (
													<div>
														<div className="font-mono">
															{stat.max.rate.toFixed(2)}%
														</div>
														<div className="text-xs text-muted-foreground">
															{formatShortMonthYearFromString(stat.max.date)}
														</div>
													</div>
												) : (
													"—"
												)}
											</TableCell>
											<TableCell className="text-right">
												{stat.current ? (
													<div className="font-mono font-medium">
														{stat.current.rate.toFixed(2)}%
													</div>
												) : (
													"—"
												)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
