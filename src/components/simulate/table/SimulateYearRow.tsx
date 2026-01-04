import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { Fragment } from "react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type {
	AmortizationYear,
	SimulationWarning,
} from "@/lib/schemas/simulate";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils/index";
import { SimulateMonthRow } from "./SimulateMonthRow";

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

interface YearRowProps {
	year: AmortizationYear;
	isExpanded: boolean;
	warnings: SimulationWarning[];
	ratePeriodLabels: Map<string, string>;
	onToggle: () => void;
}

export function SimulateYearRow({
	year,
	isExpanded,
	warnings,
	ratePeriodLabels,
	onToggle,
}: YearRowProps) {
	const hasWarnings = warnings.length > 0;

	return (
		<Fragment>
			<TableRow
				className={cn(
					"cursor-pointer hover:bg-muted/50",
					hasWarnings && "bg-yellow-50 dark:bg-yellow-900/10",
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
						{hasWarnings && (
							<AlertTriangle className="h-4 w-4 text-yellow-600" />
						)}
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
					{year.totalOverpayments > 0
						? formatEuro(year.totalOverpayments)
						: "—"}
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
					{/* Monthly breakdown */}
					{year.months.map((month) => {
						const monthWarnings = warnings.filter(
							(w) => w.month === month.month,
						);
						return (
							<SimulateMonthRow
								key={month.month}
								month={month}
								hasWarnings={monthWarnings.length > 0}
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
					{/* Warnings for this year */}
					{hasWarnings && (
						<TableRow className="bg-yellow-50 dark:bg-yellow-900/20">
							<TableCell colSpan={8} className="py-2 pl-12">
								<div className="space-y-1">
									{warnings.map((warning) => (
										<div
											key={`${warning.type}-${warning.month}`}
											className={cn(
												"text-sm flex items-center gap-2",
												warning.severity === "error"
													? "text-destructive"
													: "text-yellow-700 dark:text-yellow-500",
											)}
										>
											<AlertTriangle className="h-3.5 w-3.5" />
											{warning.message}
										</div>
									))}
								</div>
							</TableCell>
						</TableRow>
					)}
				</>
			)}
		</Fragment>
	);
}
