import {
	AlertTriangle,
	Banknote,
	CalendarClock,
	Home,
	Leaf,
	Percent,
	PiggyBank,
	RotateCcw,
} from "lucide-react";
import { ShareButton } from "@/components/ShareButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { BerRating } from "@/lib/constants/ber";
import type { SimulationCompleteness } from "@/lib/mortgage/simulation";
import { formatCurrency, formatCurrencyShort } from "@/lib/utils/currency";
import { formatTermDisplay } from "@/lib/utils/term";

interface SimulateHeaderProps {
	hasRequiredData: boolean;
	mortgageAmount: number;
	mortgageTermMonths: number;
	propertyValue: number;
	ber: BerRating;
	ratePeriodCount: number;
	overpaymentCount: number;
	completeness: SimulationCompleteness;
	onReset: () => void;
	onShare: () => Promise<string>;
}

export function SimulateHeader({
	hasRequiredData,
	mortgageAmount,
	mortgageTermMonths,
	propertyValue,
	ber,
	ratePeriodCount,
	overpaymentCount,
	completeness,
	onReset,
	onShare,
}: SimulateHeaderProps) {
	// Calculate LTV
	const ltv = propertyValue > 0 ? (mortgageAmount / propertyValue) * 100 : 0;

	return (
		<div className="space-y-4">
			{/* Page Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight mb-1">
						Mortgage Simulator
					</h1>
					<p className="text-muted-foreground text-sm">
						Simulate your mortgage with different rates, overpayments, and
						scenarios.
					</p>
				</div>
				{hasRequiredData && (
					<div className="flex gap-2">
						<ShareButton onShare={onShare} />
						<Button
							variant="outline"
							size="sm"
							className="gap-1.5"
							onClick={onReset}
						>
							<RotateCcw className="h-4 w-4" />
							Reset
						</Button>
					</div>
				)}
			</div>

			{/* Summary when data is present */}
			{hasRequiredData && (
				<Card className="py-4">
					<CardContent className="py-0">
						<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
							<div className="flex items-center gap-3">
								<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
									<Home className="h-4 w-4 text-primary" />
								</div>
								<div className="min-w-0">
									<p className="text-xs text-muted-foreground">
										Property Value
									</p>
									<p className="font-semibold truncate">
										{formatCurrencyShort(propertyValue / 100)}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
									<Banknote className="h-4 w-4 text-primary" />
								</div>
								<div className="min-w-0">
									<p className="text-xs text-muted-foreground">Mortgage</p>
									<p className="font-semibold truncate">
										{formatCurrencyShort(mortgageAmount / 100)}
										<span className="text-xs text-muted-foreground font-normal ml-1">
											({ltv.toFixed(0)}%)
										</span>
									</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
									<CalendarClock className="h-4 w-4 text-primary" />
								</div>
								<div className="min-w-0">
									<p className="text-xs text-muted-foreground">Original Term</p>
									<p className="font-semibold">
										{formatTermDisplay(mortgageTermMonths)}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
									<Leaf className="h-4 w-4 text-primary" />
								</div>
								<div className="min-w-0">
									<p className="text-xs text-muted-foreground">BER</p>
									<p className="font-semibold">{ber}</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
									<Percent className="h-4 w-4 text-primary" />
								</div>
								<div className="min-w-0">
									<p className="text-xs text-muted-foreground">Rates</p>
									<p className="font-semibold">{ratePeriodCount}</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
									<PiggyBank className="h-4 w-4 text-primary" />
								</div>
								<div className="min-w-0">
									<p className="text-xs text-muted-foreground">Overpayments</p>
									<p className="font-semibold">{overpaymentCount}</p>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Incomplete simulation warning */}
			{hasRequiredData &&
				!completeness.isComplete &&
				completeness.coveredMonths > 0 && (
					<Alert variant="destructive">
						<AlertTriangle className="h-4 w-4" />
						<AlertTitle>Incomplete Simulation</AlertTitle>
						<AlertDescription>
							Your rate periods only cover{" "}
							{formatTermDisplay(completeness.coveredMonths)} of{" "}
							{formatTermDisplay(completeness.totalMonths)}. There is a
							remaining balance of{" "}
							{formatCurrency(completeness.remainingBalance / 100)} that is not
							covered. Add more rate periods or overpayments to complete the
							simulation.
						</AlertDescription>
					</Alert>
				)}
		</div>
	);
}
