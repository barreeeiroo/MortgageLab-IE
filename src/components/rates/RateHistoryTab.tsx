import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useEffect, useState } from "react";
import type { RateChange, RateTimeSeries } from "@/lib/schemas/rate-history";
import {
	fetchLenderHistoryData,
	getRateChanges,
	getRateTimeSeries,
} from "@/lib/stores/rates/rates-history";
import { SHORT_MONTH_NAMES } from "@/lib/utils/date";
import { RateTrendChart } from "./history/RateTrendChart";

interface RateHistoryTabProps {
	rateId: string;
	rateName?: string;
	lenderId: string;
	currentRate?: number;
}

/**
 * Format a timestamp to a readable date string
 */
function formatDate(timestamp: string): string {
	const date = new Date(timestamp);
	return `${date.getDate()} ${SHORT_MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Get the rate change since a specific period ago
 */
function getRateChangeSince(
	timeSeries: RateTimeSeries,
	monthsAgo: number,
): { change: number; percent: number } | null {
	if (timeSeries.dataPoints.length < 2) return null;

	const now = new Date();
	const cutoffDate = new Date(now);
	cutoffDate.setMonth(cutoffDate.getMonth() - monthsAgo);

	// Find the data point closest to the cutoff date
	const sortedPoints = [...timeSeries.dataPoints].sort(
		(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
	);

	// Find first point at or after cutoff
	const pastPoint = sortedPoints.find(
		(p) => new Date(p.timestamp).getTime() >= cutoffDate.getTime(),
	);

	if (!pastPoint) return null;

	const currentPoint = sortedPoints[sortedPoints.length - 1];
	const change = currentPoint.rate - pastPoint.rate;
	const percent = (change / pastPoint.rate) * 100;

	return { change, percent };
}

export function RateHistoryTab({ rateId, lenderId }: RateHistoryTabProps) {
	const [loading, setLoading] = useState(true);
	const [timeSeries, setTimeSeries] = useState<RateTimeSeries | null>(null);
	const [changes, setChanges] = useState<RateChange[]>([]);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function loadHistory() {
			setLoading(true);
			setError(null);

			try {
				const history = await fetchLenderHistoryData(lenderId);

				if (cancelled) return;

				if (!history) {
					setError("No historical data available for this lender");
					setLoading(false);
					return;
				}

				// Get time series for this rate
				const series = getRateTimeSeries(history, rateId);
				setTimeSeries(series);

				// Get all changes for this lender, then filter to this rate
				const allChanges = getRateChanges(history);
				const rateChanges = allChanges
					.filter((c) => c.rateId === rateId)
					.sort(
						(a, b) =>
							new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
					);
				setChanges(rateChanges);

				setLoading(false);
			} catch (_err) {
				if (!cancelled) {
					setError("Failed to load historical data");
					setLoading(false);
				}
			}
		}

		loadHistory();

		return () => {
			cancelled = true;
		};
	}, [lenderId, rateId]);

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12 text-muted-foreground">
				Loading historical data...
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center py-12 text-muted-foreground">
				{error}
			</div>
		);
	}

	if (!timeSeries || timeSeries.dataPoints.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
				<p>No historical data available for this rate</p>
				<p className="text-sm mt-1">
					This rate may be new or unchanged since tracking began
				</p>
			</div>
		);
	}

	// Calculate summary stats
	const change6m = getRateChangeSince(timeSeries, 6);
	const change12m = getRateChangeSince(timeSeries, 12);

	// Get earliest and latest dates
	const sortedPoints = [...timeSeries.dataPoints].sort(
		(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
	);
	const earliestDate = formatDate(sortedPoints[0].timestamp);
	const latestDate = formatDate(
		sortedPoints[sortedPoints.length - 1].timestamp,
	);

	return (
		<div className="space-y-6">
			{/* Rate Trend Chart */}
			<div>
				<h4 className="text-sm font-medium mb-3">Rate Trend</h4>
				<RateTrendChart
					data={timeSeries}
					showApr={true}
					height={200}
					animate={false}
					showCurrentRate={true}
				/>
				<p className="text-xs text-muted-foreground mt-2">
					Data from {earliestDate} to {latestDate}
				</p>
			</div>

			{/* Summary Stats */}
			{(change6m || change12m) && (
				<div>
					<h4 className="text-sm font-medium mb-3">Rate Movement</h4>
					<div className="grid grid-cols-2 gap-3">
						{change6m && (
							<div className="rounded-lg border p-3">
								<div className="text-xs text-muted-foreground mb-1">
									Last 6 months
								</div>
								<div className="flex items-center gap-1.5">
									{change6m.change > 0 ? (
										<ArrowUp className="h-4 w-4 text-destructive" />
									) : change6m.change < 0 ? (
										<ArrowDown className="h-4 w-4 text-green-600" />
									) : (
										<Minus className="h-4 w-4 text-muted-foreground" />
									)}
									<span
										className={`font-mono font-medium ${
											change6m.change > 0
												? "text-destructive"
												: change6m.change < 0
													? "text-green-600"
													: ""
										}`}
									>
										{change6m.change > 0 ? "+" : ""}
										{change6m.change.toFixed(2)}%
									</span>
									<span className="text-xs text-muted-foreground">
										({change6m.percent > 0 ? "+" : ""}
										{change6m.percent.toFixed(1)}%)
									</span>
								</div>
							</div>
						)}
						{change12m && (
							<div className="rounded-lg border p-3">
								<div className="text-xs text-muted-foreground mb-1">
									Last 12 months
								</div>
								<div className="flex items-center gap-1.5">
									{change12m.change > 0 ? (
										<ArrowUp className="h-4 w-4 text-destructive" />
									) : change12m.change < 0 ? (
										<ArrowDown className="h-4 w-4 text-green-600" />
									) : (
										<Minus className="h-4 w-4 text-muted-foreground" />
									)}
									<span
										className={`font-mono font-medium ${
											change12m.change > 0
												? "text-destructive"
												: change12m.change < 0
													? "text-green-600"
													: ""
										}`}
									>
										{change12m.change > 0 ? "+" : ""}
										{change12m.change.toFixed(2)}%
									</span>
									<span className="text-xs text-muted-foreground">
										({change12m.percent > 0 ? "+" : ""}
										{change12m.percent.toFixed(1)}%)
									</span>
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Change History */}
			{changes.length > 0 && (
				<div>
					<h4 className="text-sm font-medium mb-3">Change History</h4>
					<div className="space-y-2 max-h-[200px] overflow-y-auto">
						{changes.map((change, idx) => (
							<div
								key={`${change.timestamp}-${idx}`}
								className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
							>
								<div className="flex items-center gap-2">
									{change.changeType === "changed" ? (
										change.changeAmount && change.changeAmount > 0 ? (
											<ArrowUp className="h-3.5 w-3.5 text-destructive" />
										) : (
											<ArrowDown className="h-3.5 w-3.5 text-green-600" />
										)
									) : change.changeType === "added" ? (
										<span className="text-xs font-medium text-blue-600">
											NEW
										</span>
									) : (
										<span className="text-xs font-medium text-muted-foreground">
											REMOVED
										</span>
									)}
									<span className="text-sm">
										{formatDate(change.timestamp)}
									</span>
								</div>
								<div className="text-sm font-mono">
									{change.changeType === "changed" ? (
										<>
											<span className="text-muted-foreground">
												{change.previousRate?.toFixed(2)}%
											</span>
											<span className="mx-1.5">→</span>
											<span
												className={
													change.changeAmount && change.changeAmount > 0
														? "text-destructive"
														: "text-green-600"
												}
											>
												{change.newRate?.toFixed(2)}%
											</span>
										</>
									) : change.changeType === "added" ? (
										<span>{change.newRate?.toFixed(2)}%</span>
									) : (
										<span className="text-muted-foreground">
											{change.previousRate?.toFixed(2)}%
										</span>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
