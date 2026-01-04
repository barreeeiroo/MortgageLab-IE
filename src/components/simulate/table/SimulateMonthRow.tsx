import { format } from "date-fns";
import { TableCell, TableRow } from "@/components/ui/table";
import type { AmortizationMonth } from "@/lib/schemas/simulate";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils/index";

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

interface MonthRowProps {
	month: AmortizationMonth;
	hasWarnings: boolean;
}

export function SimulateMonthRow({ month, hasWarnings }: MonthRowProps) {
	return (
		<TableRow
			className={cn(
				"bg-muted/20 text-sm",
				hasWarnings && "bg-yellow-50 dark:bg-yellow-900/10",
			)}
		>
			<TableCell />
			<TableCell className="pl-8 text-muted-foreground">
				{formatMonthLabel(month.date, month.monthOfYear)}
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
