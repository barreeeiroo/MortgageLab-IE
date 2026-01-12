import {
	AlertTriangle,
	Building2,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Flag,
	Percent,
	PlayCircle,
} from "lucide-react";
import { Fragment } from "react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
	AmortizationYear,
	Milestone,
	MilestoneType,
	SimulationWarning,
} from "@/lib/schemas/simulate";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/currency";
import { SimulateMonthRow } from "./SimulateMonthRow";

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

// Milestone color classes for icons
const MILESTONE_ICON_COLORS: Record<MilestoneType, string> = {
	mortgage_start: "text-blue-600 dark:text-blue-400",
	construction_complete: "text-purple-600 dark:text-purple-400",
	full_payments_start: "text-indigo-600 dark:text-indigo-400",
	principal_25_percent: "text-emerald-600 dark:text-emerald-400",
	principal_50_percent: "text-green-600 dark:text-green-400",
	principal_75_percent: "text-teal-600 dark:text-teal-400",
	ltv_80_percent: "text-cyan-600 dark:text-cyan-400",
	mortgage_complete: "text-violet-600 dark:text-violet-400",
};

function formatEuro(cents: number): string {
	return formatCurrency(cents / 100, { showCents: true });
}

function formatYearLabel(year: AmortizationYear): string {
	// Use calendar year from the first month's date if available
	const firstMonth = year.months[0];
	if (firstMonth?.date) {
		const date = new Date(firstMonth.date);
		return String(date.getFullYear());
	}
	return `Year ${year.year}`;
}

// Milestone icon component with tooltip
function MilestoneIcon({ milestone }: { milestone: Milestone }) {
	const Icon = MILESTONE_ICONS[milestone.type];
	const colorClass = MILESTONE_ICON_COLORS[milestone.type];

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span className="inline-flex cursor-help">
					<Icon className={cn("h-4 w-4", colorClass)} />
				</span>
			</TooltipTrigger>
			<TooltipContent side="top">
				<p className="font-medium">{milestone.label}</p>
				{milestone.value !== undefined && milestone.value > 0 && (
					<p className="text-xs text-muted-foreground">
						Balance: {formatEuro(milestone.value)}
					</p>
				)}
			</TooltipContent>
		</Tooltip>
	);
}

interface YearRowProps {
	year: AmortizationYear;
	isExpanded: boolean;
	warnings: SimulationWarning[];
	milestones: Milestone[];
	ratePeriodLabels: Map<string, string>;
	overpaymentLabels: string[];
	onToggle: () => void;
}

export function SimulateYearRow({
	year,
	isExpanded,
	warnings,
	milestones,
	ratePeriodLabels,
	overpaymentLabels,
	onToggle,
}: YearRowProps) {
	const hasAllowanceWarnings = warnings.some(
		(w) => w.type === "allowance_exceeded",
	);

	return (
		<Fragment>
			<TableRow
				className={cn(
					"cursor-pointer hover:bg-muted/50",
					hasAllowanceWarnings && "bg-yellow-50 dark:bg-yellow-900/10",
				)}
				onClick={onToggle}
			>
				<TableCell className="p-2">
					<Button variant="ghost" size="icon" className="h-6 w-6">
						{isExpanded ? (
							<ChevronDown className="h-4 w-4" />
						) : (
							<ChevronRight className="h-4 w-4" />
						)}
					</Button>
				</TableCell>
				<TableCell className="font-medium">
					<div className="flex items-center gap-2">
						{formatYearLabel(year)}
						{/* Show milestones only when collapsed */}
						{!isExpanded &&
							milestones.map((m) => (
								<MilestoneIcon key={`${m.type}-${m.month}`} milestone={m} />
							))}
					</div>
				</TableCell>
				<TableCell className="text-right">
					{formatEuro(year.openingBalance)}
				</TableCell>
				<TableCell className="text-right text-red-600 dark:text-red-400">
					{formatEuro(year.totalInterest)}
				</TableCell>
				<TableCell className="text-right text-green-600 dark:text-green-400">
					{formatEuro(year.totalPrincipal)}
				</TableCell>
				<TableCell className="text-right">
					{year.totalOverpayments > 0 ? (
						<span className="inline-flex items-center gap-1 justify-end">
							{formatEuro(year.totalOverpayments)}
							{warnings.some((w) => w.type === "allowance_exceeded") && (
								<Tooltip>
									<TooltipTrigger asChild>
										<span className="inline-flex cursor-help">
											<AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
										</span>
									</TooltipTrigger>
									<TooltipContent side="top">
										<p className="text-xs">
											Some overpayments exceed free allowance
										</p>
									</TooltipContent>
								</Tooltip>
							)}
						</span>
					) : (
						"—"
					)}
				</TableCell>
				<TableCell className="text-right font-medium">
					{formatEuro(year.totalPayments)}
				</TableCell>
				<TableCell className="text-right">
					{formatEuro(year.closingBalance)}
				</TableCell>
			</TableRow>
			{isExpanded && (
				<>
					{/* Rate changes for this year */}
					{year.rateChanges.length > 0 && (
						<TableRow className="bg-muted/30">
							<TableCell colSpan={8} className="py-2 pl-12 text-sm">
								<span className="text-muted-foreground">Rate periods: </span>
								{year.rateChanges
									.map((id) => ratePeriodLabels.get(id) || id)
									.join(", ")}
							</TableCell>
						</TableRow>
					)}
					{/* Overpayments for this year */}
					{overpaymentLabels.length > 0 && (
						<TableRow className="bg-muted/30">
							<TableCell colSpan={8} className="py-2 pl-12 text-sm">
								<span className="text-muted-foreground">Overpayments: </span>
								{overpaymentLabels.join(", ")}
							</TableCell>
						</TableRow>
					)}
					{/* Monthly breakdown */}
					{year.months.map((month) => {
						const monthWarnings = warnings.filter(
							(w) => w.month === month.month,
						);
						const monthMilestones = milestones.filter(
							(m) => m.month === month.month,
						);
						return (
							<SimulateMonthRow
								key={month.month}
								month={month}
								warnings={monthWarnings}
								milestones={monthMilestones}
							/>
						);
					})}
					{/* Year totals row */}
					<TableRow className="bg-muted/40 text-sm font-medium border-t">
						<TableCell />
						<TableCell className="pl-8">Year Total</TableCell>
						<TableCell className="text-right">
							{formatEuro(year.openingBalance)}
						</TableCell>
						<TableCell className="text-right text-red-600 dark:text-red-400">
							{formatEuro(year.totalInterest)}
						</TableCell>
						<TableCell className="text-right text-green-600 dark:text-green-400">
							{formatEuro(year.totalPrincipal)}
						</TableCell>
						<TableCell className="text-right">
							{year.totalOverpayments > 0
								? formatEuro(year.totalOverpayments)
								: "—"}
						</TableCell>
						<TableCell className="text-right">
							{formatEuro(year.totalPayments)}
						</TableCell>
						<TableCell className="text-right">
							{formatEuro(year.closingBalance)}
						</TableCell>
					</TableRow>
				</>
			)}
		</Fragment>
	);
}
