import { useStore } from "@nanostores/react";
import { TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { LenderSelector } from "@/components/lenders/LenderSelector";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
		lenders.slice(0, 3).map((l) => l.id),
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

		// Limit to 10 rates for readability
		return series.slice(0, 10);
	}, [filteredRates, historyData]);

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

				{/* Lender Selection */}
				<div className="space-y-1.5">
					<Label className="text-xs">Lenders</Label>
					<LenderSelector
						lenders={lenders}
						value={selectedLenders}
						onChange={setSelectedLenders}
						multiple
						placeholder="Select lenders"
						className="w-[180px]"
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
						showLegend={true}
						height={350}
						animate={false}
					/>

					{/* Rate List */}
					<div className="space-y-1">
						<Label className="text-xs text-muted-foreground">
							Rates shown in chart:
						</Label>
						<div className="flex flex-wrap gap-1">
							{timeSeries.map((series) => {
								const lender = lenders.find((l) => l.id === series.lenderId);
								return (
									<span
										key={series.rateId}
										className="text-xs px-2 py-0.5 rounded bg-muted"
									>
										{lender?.name}: {series.rateName}
									</span>
								);
							})}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
