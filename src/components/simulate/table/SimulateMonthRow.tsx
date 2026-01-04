import { format } from "date-fns";
import { CheckCircle2, Flag, Percent } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
	AmortizationMonth,
	Milestone,
	MilestoneType,
} from "@/lib/schemas/simulate";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils/index";

// Milestone icon mapping
const MILESTONE_ICONS: Record<MilestoneType, typeof Flag> = {
	mortgage_start: Flag,
	principal_25_percent: Percent,
	principal_50_percent: Percent,
	principal_75_percent: Percent,
	ltv_80_percent: Percent,
	mortgage_complete: CheckCircle2,
};

// Milestone color classes for icons
const MILESTONE_ICON_COLORS: Record<MilestoneType, string> = {
	mortgage_start: "text-blue-600 dark:text-blue-400",
	principal_25_percent: "text-emerald-600 dark:text-emerald-400",
	principal_50_percent: "text-green-600 dark:text-green-400",
	principal_75_percent: "text-teal-600 dark:text-teal-400",
	ltv_80_percent: "text-cyan-600 dark:text-cyan-400",
	mortgage_complete: "text-violet-600 dark:text-violet-400",
};

function formatEuro(cents: number): string {
	return formatCurrency(cents / 100, { showCents: true });
}

function formatMonthLabel(
	date: string | undefined,
	monthOfYear: number,
): string {
	if (date) {
		const d = new Date(date);
		return format(d, "MMMM yyyy"); // Full month name + year
	}
	return `Month ${monthOfYear}`;
}

// Milestone icon component with tooltip
function MilestoneIcon({ milestone }: { milestone: Milestone }) {
	const Icon = MILESTONE_ICONS[milestone.type];
	const colorClass = MILESTONE_ICON_COLORS[milestone.type];

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span className="inline-flex cursor-help">
					<Icon className={cn("h-3.5 w-3.5", colorClass)} />
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

interface MonthRowProps {
	month: AmortizationMonth;
	hasWarnings: boolean;
	milestones?: Milestone[];
}

export function SimulateMonthRow({
	month,
	hasWarnings,
	milestones = [],
}: MonthRowProps) {
	return (
		<TableRow
			className={cn(
				"bg-muted/20 text-sm",
				hasWarnings && "bg-yellow-50 dark:bg-yellow-900/10",
			)}
		>
			<TableCell />
			<TableCell className="pl-8 text-muted-foreground">
				<div className="flex items-center gap-2">
					{formatMonthLabel(month.date, month.monthOfYear)}
					{milestones.map((m) => (
						<MilestoneIcon key={`${m.type}-${m.month}`} milestone={m} />
					))}
				</div>
			</TableCell>
			<TableCell className="text-right text-muted-foreground">
				{formatEuro(month.openingBalance)}
			</TableCell>
			<TableCell className="text-right text-red-500/70">
				{formatEuro(month.interestPortion)}
			</TableCell>
			<TableCell className="text-right text-green-500/70">
				{formatEuro(month.principalPortion)}
			</TableCell>
			<TableCell className="text-right text-muted-foreground">
				{month.overpayment > 0 ? formatEuro(month.overpayment) : "—"}
			</TableCell>
			<TableCell className="text-right">
				{formatEuro(month.totalPayment)}
			</TableCell>
			<TableCell className="text-right text-muted-foreground">
				{formatEuro(month.closingBalance)}
			</TableCell>
		</TableRow>
	);
}
