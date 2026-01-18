import {
	ArrowDown,
	ArrowLeft,
	ArrowUp,
	ChevronDown,
	ChevronUp,
	Copy,
	Info,
	Minus,
	Pencil,
	TriangleAlert,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { getIncorrectRateUrl } from "@/lib/constants/contact";
import type { Lender } from "@/lib/schemas/lender";
import type { MortgageRate } from "@/lib/schemas/rate";
import type { RateChange, RateTimeSeries } from "@/lib/schemas/rate-history";
import {
	addCustomRate,
	type StoredCustomRate,
} from "@/lib/stores/custom-rates";
import {
	fetchLenderHistoryData,
	getRateChanges,
	getRateTimeSeries,
} from "@/lib/stores/rates/rates-history";
import { SHORT_MONTH_NAMES } from "@/lib/utils/date";
import { LenderLogo } from "../lenders/LenderLogo";
import { RatesTrendChart } from "./history/RatesTrendChart";

interface RateHistoryModalProps {
	rate: MortgageRate | null;
	lender: Lender | undefined;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onBack: () => void;
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
		return value.join(", ");
	}

	if (typeof value === "boolean") return value ? "Yes" : "No";

	if (typeof value === "number") {
		if (field === "apr" || field === "rate") return `${value.toFixed(2)}%`;
		if (field === "minLtv" || field === "maxLtv") return `${value}%`;
		if (field === "fixedTerm") return `${value} year${value !== 1 ? "s" : ""}`;
		if (field === "minLoan") {
			return new Intl.NumberFormat("en-IE", {
				style: "currency",
				currency: "EUR",
				maximumFractionDigits: 0,
			}).format(value);
		}
		return String(value);
	}

	return String(value);
}

export function RateHistoryModal({
	rate,
	lender,
	open,
	onOpenChange,
	onBack,
}: RateHistoryModalProps) {
	const [loading, setLoading] = useState(true);
	const [timeSeries, setTimeSeries] = useState<RateTimeSeries | null>(null);
	const [changes, setChanges] = useState<RateChange[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [copiedTimestamp, setCopiedTimestamp] = useState<string | null>(null);
	const [expandedChanges, setExpandedChanges] = useState<Set<string>>(
		new Set(),
	);

	const isCustom = rate ? (rate as { isCustom?: boolean }).isCustom : false;
	const customLenderName =
		(rate as { customLenderName?: string })?.customLenderName ?? lender?.name;

	/** Copy a historical rate as a custom rate */
	const handleCopyAsCustom = (change: RateChange) => {
		if (!rate || isCustom) return;

		// Get the rate value to copy (newRate for 'added' or 'changed', previousRate for 'removed')
		const rateValue =
			change.changeType === "removed" ? change.previousRate : change.newRate;
		if (rateValue === null) return;

		// Format the date for the name
		const dateStr = formatDate(change.timestamp);
		const nameWithDate = `${rate.name} (${dateStr})`;

		const customRate: StoredCustomRate = {
			id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
			name: nameWithDate,
			lenderId: rate.lenderId,
			type: rate.type,
			rate: rateValue,
			apr: undefined, // Historical APR not tracked
			fixedTerm: rate.fixedTerm,
			minLtv: rate.minLtv,
			maxLtv: rate.maxLtv,
			minLoan: rate.minLoan,
			buyerTypes: [...rate.buyerTypes],
			berEligible: rate.berEligible ? [...rate.berEligible] : undefined,
			perks: [...rate.perks],
			customLenderName,
		};

		addCustomRate(customRate);
		setCopiedTimestamp(change.timestamp);

		// Reset copied state after 2 seconds
		setTimeout(() => setCopiedTimestamp(null), 2000);
	};

	// Load history data when modal opens
	useEffect(() => {
		if (!open || !rate) return;

		let cancelled = false;

		async function loadHistory() {
			if (!rate) return;

			setLoading(true);
			setError(null);

			try {
				const history = await fetchLenderHistoryData(rate.lenderId);

				if (cancelled) return;

				if (!history) {
					setError("No historical data available for this lender");
					setLoading(false);
					return;
				}

				// Get time series for this rate
				const series = getRateTimeSeries(history, rate.id);
				setTimeSeries(series);

				// Get all changes for this lender, then filter to this rate
				const allChanges = getRateChanges(history);
				const rateChanges = allChanges
					.filter((c) => c.rateId === rate.id)
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
	}, [open, rate]);

	// Reset state when rate changes
	useEffect(() => {
		if (rate) {
			setCopiedTimestamp(null);
			setExpandedChanges(new Set());
		}
	}, [rate]);

	if (!rate) return null;

	// Calculate summary stats
	const change6m = timeSeries ? getRateChangeSince(timeSeries, 6) : null;
	const change12m = timeSeries ? getRateChangeSince(timeSeries, 12) : null;

	// Get earliest and latest dates
	let earliestDate = "";
	let latestDate = "";
	if (timeSeries && timeSeries.dataPoints.length > 0) {
		const sortedPoints = [...timeSeries.dataPoints].sort(
			(a, b) =>
				new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
		);
		earliestDate = formatDate(sortedPoints[0].timestamp);
		latestDate = formatDate(sortedPoints[sortedPoints.length - 1].timestamp);
	}

	const renderContent = () => {
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

		return (
			<div className="space-y-6">
				{/* Rate Trend Chart */}
				<div>
					<h4 className="text-sm font-medium mb-3">Rate Trend</h4>
					<RatesTrendChart
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
						<div className="space-y-2 max-h-[300px] overflow-y-auto">
							{changes.map((change, idx) => {
								const isCopied = copiedTimestamp === change.timestamp;
								const canCopy =
									!isCustom &&
									(change.changeType !== "removed"
										? change.newRate !== null
										: change.previousRate !== null);
								const changeKey = `${change.timestamp}-${idx}`;
								const isExpanded = expandedChanges.has(changeKey);
								const hasFieldChanges =
									change.fieldChanges && change.fieldChanges.length > 0;
								const hasRateChange =
									change.changeAmount !== undefined &&
									change.changeAmount !== 0;
								const isModifiedOnly =
									change.changeType === "changed" &&
									!hasRateChange &&
									hasFieldChanges;

								const toggleExpanded = () => {
									const newExpanded = new Set(expandedChanges);
									if (isExpanded) {
										newExpanded.delete(changeKey);
									} else {
										newExpanded.add(changeKey);
									}
									setExpandedChanges(newExpanded);
								};

								return (
									<div
										key={changeKey}
										className="rounded-lg bg-muted/50 overflow-hidden"
									>
										<div className="flex items-center justify-between py-2 px-3">
											<div className="flex items-center gap-2">
												{change.changeType === "changed" ? (
													isModifiedOnly ? (
														<Pencil className="h-3.5 w-3.5 text-amber-600" />
													) : change.changeAmount && change.changeAmount > 0 ? (
														<div className="relative">
															<ArrowUp className="h-3.5 w-3.5 text-destructive" />
															{hasFieldChanges && (
																<span className="absolute -top-1 -right-2 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">
																	{change.fieldChanges?.length}
																</span>
															)}
														</div>
													) : (
														<div className="relative">
															<ArrowDown className="h-3.5 w-3.5 text-green-600" />
															{hasFieldChanges && (
																<span className="absolute -top-1 -right-2 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">
																	{change.fieldChanges?.length}
																</span>
															)}
														</div>
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
												{hasFieldChanges && (
													<button
														type="button"
														onClick={toggleExpanded}
														className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 cursor-pointer"
													>
														<Info className="h-3 w-3" />
														<span>
															{change.fieldChanges?.length} field
															{change.fieldChanges?.length !== 1 ? "s" : ""}
														</span>
														{isExpanded ? (
															<ChevronUp className="h-3 w-3" />
														) : (
															<ChevronDown className="h-3 w-3" />
														)}
													</button>
												)}
											</div>
											<div className="flex items-center gap-2">
												<div className="text-sm font-mono">
													{change.changeType === "changed" ? (
														isModifiedOnly ? (
															<span>{change.newRate?.toFixed(2)}%</span>
														) : (
															<>
																<span className="text-muted-foreground">
																	{change.previousRate?.toFixed(2)}%
																</span>
																<span className="mx-1.5">→</span>
																<span
																	className={
																		change.changeAmount &&
																		change.changeAmount > 0
																			? "text-destructive"
																			: "text-green-600"
																	}
																>
																	{change.newRate?.toFixed(2)}%
																</span>
															</>
														)
													) : change.changeType === "added" ? (
														<span>{change.newRate?.toFixed(2)}%</span>
													) : (
														<span className="text-muted-foreground">
															{change.previousRate?.toFixed(2)}%
														</span>
													)}
												</div>
												{canCopy && (
													<Tooltip>
														<TooltipTrigger asChild>
															<Button
																variant="ghost"
																size="icon"
																className="h-6 w-6"
																onClick={() => handleCopyAsCustom(change)}
																disabled={isCopied}
															>
																<Copy
																	className={`h-3.5 w-3.5 ${isCopied ? "text-green-600" : "text-muted-foreground"}`}
																/>
																<span className="sr-only">
																	Copy as custom rate
																</span>
															</Button>
														</TooltipTrigger>
														<TooltipContent>
															{isCopied ? "Copied!" : "Copy as custom rate"}
														</TooltipContent>
													</Tooltip>
												)}
											</div>
										</div>
										{/* Expanded Field Changes */}
										{isExpanded && hasFieldChanges && (
											<div className="px-3 pb-3 pt-1 border-t border-border/50">
												<div className="space-y-1.5">
													{change.fieldChanges?.map((fc) => (
														<div
															key={fc.field}
															className="text-xs rounded bg-background px-2 py-1.5"
														>
															<span className="font-medium text-foreground">
																{formatFieldName(fc.field)}:
															</span>
															<div className="flex items-center gap-1 mt-0.5 text-muted-foreground">
																<span className="line-through">
																	{formatFieldValue(fc.field, fc.previousValue)}
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
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="sm:max-w-3xl flex flex-col overflow-hidden p-0"
				showCloseButton={false}
			>
				{/* Sticky Header */}
				<div className="sticky top-0 bg-background z-10 px-6 pt-6 pb-4 border-b">
					<DialogHeader>
						<div className="flex items-start justify-between gap-3">
							<div className="flex items-center gap-3">
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={onBack}
									className="mr-1"
								>
									<ArrowLeft className="h-5 w-5" />
									<span className="sr-only">Back</span>
								</Button>
								<LenderLogo
									lenderId={rate.lenderId}
									size={40}
									isCustom={isCustom}
								/>
								<div>
									<DialogTitle className="flex items-center gap-2">
										{rate.name}
										{isCustom && (
											<span className="text-xs font-normal px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
												Custom
											</span>
										)}
									</DialogTitle>
									<DialogDescription>
										{customLenderName ?? rate.lenderId} • Rate History
									</DialogDescription>
								</div>
							</div>
							<DialogClose className="cursor-pointer rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
								<X className="h-4 w-4" />
								<span className="sr-only">Close</span>
							</DialogClose>
						</div>
					</DialogHeader>
				</div>

				{/* Scrollable Content */}
				<div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
					{renderContent()}
				</div>

				{/* Sticky Footer */}
				{!isCustom && (
					<div className="sticky bottom-0 bg-background z-10 px-6 py-4 border-t">
						<Button
							variant="ghost"
							size="sm"
							className="gap-1.5 text-muted-foreground hover:text-foreground"
							asChild
						>
							<a
								href={getIncorrectRateUrl({
									lenderId: rate.lenderId,
									rateName: rate.name,
									rateId: rate.id,
									sourceUrl: lender?.ratesUrl,
									reportSource: "Rate History dialog",
								})}
								target="_blank"
								rel="noopener noreferrer"
							>
								<TriangleAlert className="h-4 w-4" />
								Incorrect Info?
							</a>
						</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
