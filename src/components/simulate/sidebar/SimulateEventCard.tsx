import {
	ArrowRightToLine,
	Building2,
	CheckCircle2,
	Eye,
	EyeOff,
	Flag,
	Pencil,
	Percent,
	PlayCircle,
	Repeat,
	Trash2,
	TrendingDown,
} from "lucide-react";
import { useMemo, useState } from "react";
import { LenderLogo } from "@/components/lenders/LenderLogo";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { OverpaymentPolicy } from "@/lib/schemas/overpayment-policy";
import type {
	AmortizationMonth,
	Milestone,
	MilestoneType,
	OverpaymentConfig,
	ResolvedRatePeriod,
	SimulationWarning,
} from "@/lib/schemas/simulate";
import { formatCurrency } from "@/lib/utils/currency";
import { SimulateTrimDialog } from "./SimulateTrimDialog";

// Helper to format month/year
function formatPeriod(month: number): string {
	const years = Math.floor((month - 1) / 12);
	const months = ((month - 1) % 12) + 1;
	if (years === 0) return `Month ${months}`;
	if (months === 1) return `Year ${years + 1}`;
	return `Year ${years + 1}, Month ${months}`;
}

// Helper to format duration
function formatDuration(months: number): string {
	if (months === 0) return "Until end of mortgage";
	const years = Math.floor(months / 12);
	const remainingMonths = months % 12;
	if (years === 0)
		return `${remainingMonths} month${remainingMonths !== 1 ? "s" : ""}`;
	if (remainingMonths === 0) return `${years} year${years !== 1 ? "s" : ""}`;
	return `${years}y ${remainingMonths}m`;
}

// Helper to format warning months list
function formatWarningMonths(warnings: SimulationWarning[]): string {
	const months = warnings.map((w) => w.month).sort((a, b) => a - b);
	if (months.length === 0) return "";
	if (months.length === 1) return formatPeriod(months[0]);

	// Group consecutive months into ranges
	const ranges: Array<{ start: number; end: number }> = [];
	let currentStart = months[0];
	let currentEnd = months[0];

	for (let i = 1; i < months.length; i++) {
		if (months[i] === currentEnd + 1) {
			currentEnd = months[i];
		} else {
			ranges.push({ start: currentStart, end: currentEnd });
			currentStart = months[i];
			currentEnd = months[i];
		}
	}
	ranges.push({ start: currentStart, end: currentEnd });

	// Format ranges
	return ranges
		.map((range) => {
			if (range.start === range.end) {
				return formatPeriod(range.start);
			}
			return `${formatPeriod(range.start)} – ${formatPeriod(range.end)}`;
		})
		.join(", ");
}

// Milestone icon mapping
const MILESTONE_ICONS: Record<MilestoneType, typeof Flag> = {
	mortgage_start: Flag,
	construction_complete: Building2,
	full_payments_start: PlayCircle,
	principal_25_percent: Percent,
	principal_50_percent: Percent,
	principal_75_percent: Percent,
	ltv_80_percent: Percent,
	mortgage_complete: CheckCircle2,
};

// Milestone color classes
const MILESTONE_COLORS: Record<MilestoneType, string> = {
	mortgage_start:
		"bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
	construction_complete:
		"bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
	full_payments_start:
		"bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
	principal_25_percent:
		"bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
	principal_50_percent:
		"bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
	principal_75_percent:
		"bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
	ltv_80_percent:
		"bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
	mortgage_complete:
		"bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
};

// Rate Period Event Component
interface RatePeriodEventProps {
	period: ResolvedRatePeriod;
	warnings: SimulationWarning[];
	overpaymentPolicy?: OverpaymentPolicy;
	onEdit: () => void;
	onDelete?: () => void;
	onTrim?: (durationMonths: number) => void;
	onExtend?: () => void;
	onRepeatUntilEnd?: () => void;
	// Additional props needed for trim dialog LTV calculations
	propertyValue?: number;
	amortizationSchedule?: AmortizationMonth[];
	/** Whether this is the first rate period in the simulation */
	isFirstRate?: boolean;
	/** Whether this is the last rate period in the simulation */
	isLastPeriod?: boolean;
	/** Whether this rate can be repeated (fixed rate not new-business-only) */
	canRepeat?: boolean;
}

export function SimulateRatePeriodEvent({
	period,
	warnings,
	overpaymentPolicy,
	onEdit,
	onDelete,
	onTrim,
	onExtend,
	onRepeatUntilEnd,
	propertyValue = 0,
	amortizationSchedule = [],
	isFirstRate = false,
	isLastPeriod = false,
	canRepeat = false,
}: RatePeriodEventProps) {
	const [trimDialogOpen, setTrimDialogOpen] = useState(false);
	const hasWarnings = warnings.length > 0;
	const hasError = warnings.some((w) => w.severity === "error");

	// Check if this rate period is orphaned (starts after mortgage is complete)
	// or has excess duration (extends beyond when mortgage ends)
	const { isOrphaned, hasExcessDuration } = useMemo(() => {
		const lastActiveMonth = amortizationSchedule.length;
		if (lastActiveMonth === 0) {
			return { isOrphaned: false, hasExcessDuration: false };
		}

		// Period starts after the mortgage is already complete
		const orphaned = period.startMonth > lastActiveMonth;

		// Period has explicit duration that extends beyond the mortgage
		const excessDuration =
			!orphaned &&
			period.durationMonths > 0 &&
			period.startMonth + period.durationMonths - 1 > lastActiveMonth;

		return { isOrphaned: orphaned, hasExcessDuration: excessDuration };
	}, [period, amortizationSchedule]);

	const isInvalid = isOrphaned || hasExcessDuration;

	// Calculate beginning and ending LTV for this rate period
	const { beginningLtv, endingLtv } = useMemo(() => {
		if (propertyValue <= 0 || amortizationSchedule.length === 0) {
			return { beginningLtv: null, endingLtv: null };
		}

		// Find beginning balance (opening balance of start month)
		const startMonthData = amortizationSchedule.find(
			(m) => m.month === period.startMonth,
		);
		const beginningBalance =
			startMonthData?.openingBalance ?? amortizationSchedule[0]?.openingBalance;

		// Find ending balance
		let endingBalance: number | undefined;
		if (period.durationMonths === 0) {
			// "Until end" - use the last month's closing balance
			endingBalance =
				amortizationSchedule[amortizationSchedule.length - 1]?.closingBalance;
		} else {
			// Find the closing balance of the last month in this period
			const endMonth = period.startMonth + period.durationMonths - 1;
			const endMonthData = amortizationSchedule.find(
				(m) => m.month === endMonth,
			);
			endingBalance = endMonthData?.closingBalance;
		}

		return {
			beginningLtv: beginningBalance
				? (beginningBalance / propertyValue) * 100
				: null,
			endingLtv: endingBalance ? (endingBalance / propertyValue) * 100 : null,
		};
	}, [period, propertyValue, amortizationSchedule]);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className={`w-full flex items-center gap-3 p-2 rounded-lg border text-left transition-colors cursor-pointer hover:bg-muted/50 ${
						isInvalid || hasError
							? "border-destructive/50"
							: hasWarnings
								? "border-yellow-500/50"
								: "border-border"
					}`}
				>
					<LenderLogo
						lenderId={period.lenderId}
						size={32}
						isCustom={period.isCustom}
					/>
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2">
							<span className="font-medium text-sm truncate">
								{period.rateName}
							</span>
							<span
								className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
									period.type === "fixed"
										? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
										: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
								}`}
							>
								{period.type === "fixed" ? "Fix" : "Var"}
							</span>
						</div>
						<div className="flex items-center gap-2 text-xs text-muted-foreground">
							<span>{period.lenderName}</span>
							<span>•</span>
							<span className="font-medium text-foreground">
								{period.rate.toFixed(2)}%
							</span>
						</div>
					</div>
				</button>
			</PopoverTrigger>
			<PopoverContent className="w-72" align="start">
				<div className="space-y-3">
					{/* Header */}
					<div className="flex items-start gap-3">
						<LenderLogo
							lenderId={period.lenderId}
							size={40}
							isCustom={period.isCustom}
						/>
						<div className="flex-1">
							<h4 className="font-medium text-sm flex items-center gap-2">
								{period.rateName}
								{period.isCustom && (
									<span className="text-xs font-normal px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
										Custom
									</span>
								)}
							</h4>
							<p className="text-xs text-muted-foreground">
								{period.lenderName}
							</p>
						</div>
					</div>

					{/* Details */}
					<div className="grid grid-cols-2 gap-2 text-sm">
						<div>
							<span className="text-muted-foreground text-xs">Rate</span>
							<p className="font-medium">{period.rate.toFixed(2)}%</p>
						</div>
						<div>
							<span className="text-muted-foreground text-xs">Type</span>
							<p className="font-medium">
								{period.type === "fixed"
									? `${period.fixedTerm}-Year Fixed`
									: "Variable"}
							</p>
						</div>
						<div>
							<span className="text-muted-foreground text-xs">Starts</span>
							<p className="font-medium">{formatPeriod(period.startMonth)}</p>
						</div>
						<div>
							<span className="text-muted-foreground text-xs">Duration</span>
							<p className="font-medium">
								{formatDuration(period.durationMonths)}
							</p>
						</div>
						{beginningLtv !== null && (
							<div>
								<span className="text-muted-foreground text-xs">
									Beginning LTV
								</span>
								<p className="font-medium">{beginningLtv.toFixed(1)}%</p>
							</div>
						)}
						{endingLtv !== null && (
							<div>
								<span className="text-muted-foreground text-xs">
									Ending LTV
								</span>
								<p className="font-medium">{endingLtv.toFixed(1)}%</p>
							</div>
						)}
					</div>

					{/* Overpayment Policy */}
					{period.type === "fixed" && overpaymentPolicy && (
						<div className="pt-2 border-t">
							<span className="text-muted-foreground text-xs">
								Max Overpayment (no fee)
							</span>
							<p className="text-sm font-medium">{overpaymentPolicy.label}</p>
						</div>
					)}

					{/* Invalid period warning */}
					{isInvalid && (
						<div className="pt-2 border-t">
							<p className="text-xs text-destructive">
								{isOrphaned
									? "This rate period starts after the mortgage is already paid off."
									: "This rate period extends beyond when the mortgage ends."}
							</p>
						</div>
					)}

					{/* Warnings */}
					{hasWarnings && (
						<div className="pt-2 border-t space-y-1">
							{warnings.map((warning) => (
								<p
									key={`${warning.type}-${warning.month}`}
									className={`text-xs ${
										warning.severity === "error"
											? "text-destructive"
											: "text-yellow-600 dark:text-yellow-500"
									}`}
								>
									{warning.message}
								</p>
							))}
						</div>
					)}

					{/* Actions */}
					<div className="flex gap-2 pt-2 border-t">
						{onTrim && (
							<SimulateTrimDialog
								open={trimDialogOpen}
								onOpenChange={setTrimDialogOpen}
								onTrim={onTrim}
								periodStartMonth={period.startMonth}
								propertyValue={propertyValue}
								amortizationSchedule={amortizationSchedule}
								isFirstRate={isFirstRate}
							/>
						)}
						{onExtend && (
							<Button variant="outline" size="sm" onClick={onExtend}>
								<ArrowRightToLine className="h-3.5 w-3.5" />
							</Button>
						)}
						{canRepeat && isLastPeriod && period.type === "fixed" && (
							<Button variant="outline" size="sm" onClick={onRepeatUntilEnd}>
								<Repeat className="h-3.5 w-3.5" />
							</Button>
						)}
						<Button
							variant="outline"
							size="sm"
							className="flex-1"
							onClick={onEdit}
						>
							<Pencil className="h-3.5 w-3.5 mr-1.5" />
							Edit
						</Button>
						{onDelete && (
							<Button
								variant="outline"
								size="sm"
								className="text-destructive hover:text-destructive hover:bg-destructive/10"
								onClick={onDelete}
							>
								<Trash2 className="h-3.5 w-3.5" />
							</Button>
						)}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}

// Overpayment Event Component
interface OverpaymentEventProps {
	config: OverpaymentConfig;
	warnings: SimulationWarning[];
	onEdit: () => void;
	onDelete: () => void;
	onToggleEnabled: () => void;
}

export function SimulateOverpaymentEvent({
	config,
	warnings,
	onEdit,
	onDelete,
	onToggleEnabled,
}: OverpaymentEventProps) {
	const hasWarnings = warnings.length > 0;
	const isEnabled = config.enabled !== false;
	const frequency = config.frequency ?? "monthly";
	const frequencyLabel =
		config.type === "one_time"
			? "Once"
			: frequency === "yearly"
				? "Yearly"
				: "Monthly";
	const frequencySuffix =
		config.type === "recurring" ? (frequency === "yearly" ? "/yr" : "/mo") : "";

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className={`w-full flex items-center gap-3 p-2 rounded-lg border text-left transition-colors cursor-pointer hover:bg-muted/50 ${
						!isEnabled
							? "opacity-50 border-dashed"
							: hasWarnings
								? "border-yellow-500/50"
								: "border-border"
					}`}
				>
					<div
						className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
							isEnabled ? "bg-green-100 dark:bg-green-900" : "bg-muted"
						}`}
					>
						<TrendingDown
							className={`h-4 w-4 ${
								isEnabled
									? "text-green-600 dark:text-green-400"
									: "text-muted-foreground"
							}`}
						/>
					</div>
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2">
							<span className="font-medium text-sm">
								{formatCurrency(config.amount / 100)}
								{frequencySuffix}
							</span>
							<span
								className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
									config.type === "one_time"
										? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
										: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
								}`}
							>
								{frequencyLabel}
							</span>
						</div>
						<div className="text-xs text-muted-foreground">
							{config.type === "one_time"
								? formatPeriod(config.startMonth)
								: `${formatPeriod(config.startMonth)} → ${config.endMonth ? formatPeriod(config.endMonth) : "End"}`}
						</div>
					</div>
				</button>
			</PopoverTrigger>
			<PopoverContent className="w-64" align="start">
				<div className="space-y-3">
					{/* Header */}
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
							<TrendingDown className="h-5 w-5 text-green-600 dark:text-green-400" />
						</div>
						<div>
							<h4 className="font-medium text-sm">
								{formatCurrency(config.amount / 100)}
								{config.type === "recurring" &&
									(frequency === "yearly" ? " /year" : " /month")}
							</h4>
							<p className="text-xs text-muted-foreground">
								{config.type === "one_time"
									? "One-time payment"
									: `Recurring ${frequencyLabel.toLowerCase()}`}
							</p>
						</div>
					</div>

					{/* Details */}
					<div className="grid grid-cols-2 gap-2 text-sm">
						<div>
							<span className="text-muted-foreground text-xs">
								{config.type === "one_time" ? "When" : "Starts"}
							</span>
							<p className="font-medium">{formatPeriod(config.startMonth)}</p>
						</div>
						{config.type === "recurring" && (
							<div>
								<span className="text-muted-foreground text-xs">Ends</span>
								<p className="font-medium">
									{config.endMonth
										? formatPeriod(config.endMonth)
										: "End of mortgage"}
								</p>
							</div>
						)}
						<div className={config.type === "one_time" ? "" : "col-span-2"}>
							<span className="text-muted-foreground text-xs">Effect</span>
							<p className="font-medium">
								{config.effect === "reduce_term"
									? "Reduce term"
									: "Reduce payment"}
							</p>
						</div>
					</div>

					{/* Label */}
					{config.label && (
						<div className="pt-2 border-t">
							<span className="text-muted-foreground text-xs">Note</span>
							<p className="text-sm">{config.label}</p>
						</div>
					)}

					{/* Warnings */}
					{hasWarnings && (
						<div className="pt-2 border-t space-y-1">
							<p className="text-xs font-medium">Exceeds free allowance</p>
							<p className="text-xs text-muted-foreground">
								{formatWarningMonths(warnings)}
							</p>
						</div>
					)}

					{/* Actions */}
					<div className="flex gap-2 pt-2 border-t">
						<Button
							variant="outline"
							size="sm"
							onClick={onToggleEnabled}
							title={isEnabled ? "Disable overpayment" : "Enable overpayment"}
						>
							{isEnabled ? (
								<Eye className="h-3.5 w-3.5" />
							) : (
								<EyeOff className="h-3.5 w-3.5" />
							)}
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="flex-1"
							onClick={onEdit}
						>
							<Pencil className="h-3.5 w-3.5 mr-1.5" />
							Edit
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="text-destructive hover:text-destructive hover:bg-destructive/10"
							onClick={onDelete}
						>
							<Trash2 className="h-3.5 w-3.5" />
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}

// Milestone Event Component
interface MilestoneEventProps {
	milestone: Milestone;
}

export function SimulateMilestoneEvent({ milestone }: MilestoneEventProps) {
	const Icon = MILESTONE_ICONS[milestone.type];
	const colorClass = MILESTONE_COLORS[milestone.type];

	const formattedDate = milestone.date
		? new Date(milestone.date).toLocaleDateString("en-IE", {
				month: "short",
				year: "numeric",
			})
		: formatPeriod(milestone.month);

	return (
		<div className="flex items-center gap-3 p-2 rounded-lg border border-dashed">
			<div
				className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass}`}
			>
				<Icon className="h-4 w-4" />
			</div>
			<div className="flex-1 min-w-0">
				<div className="font-medium text-sm">{milestone.label}</div>
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<span>{formattedDate}</span>
					{milestone.value !== undefined && milestone.value > 0 && (
						<>
							<span>•</span>
							<span className="font-medium text-foreground">
								{formatCurrency(milestone.value / 100)}
							</span>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
