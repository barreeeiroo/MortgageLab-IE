import { ChevronDown } from "lucide-react";
import type {
	RemortgageResult,
	RemortgageYearlyComparison,
} from "@/lib/mortgage/breakeven";
import { formatBreakevenPeriod } from "@/lib/mortgage/breakeven";
import { formatCurrency } from "@/lib/utils/currency";
import { formatTermDisplay } from "@/lib/utils/term";
import { Card, CardContent } from "../../ui/card";
import { InterestComparisonChart } from "./chart/InterestComparisonChart";
import { SavingsBreakevenChart } from "./chart/SavingsBreakevenChart";

interface RemortgageResultCardProps {
	result: RemortgageResult;
	fixedPeriodMonths: number | null; // null = variable rate (new rate)
	currentRateRemainingFixedMonths: number | null; // null = not on fixed or unknown
}

export function RemortgageResultCard({
	result,
	fixedPeriodMonths,
	currentRateRemainingFixedMonths,
}: RemortgageResultCardProps) {
	const hasBreakeven =
		Number.isFinite(result.breakevenMonths) && result.breakevenMonths > 0;
	const breakevenText = formatBreakevenPeriod(
		hasBreakeven ? result.breakevenMonths : null,
	);

	// Calculate breakeven year for chart reference line
	const breakevenYear = hasBreakeven
		? Math.ceil(result.breakevenMonths / 12)
		: null;

	// New rate: fixed period vs variable rate warnings
	const isNewRateVariable = fixedPeriodMonths === null;
	const breakevenExceedsNewFixedPeriod =
		hasBreakeven &&
		fixedPeriodMonths !== null &&
		result.breakevenMonths > fixedPeriodMonths;
	const newRateFixedPeriodYears = fixedPeriodMonths
		? Math.round(fixedPeriodMonths / 12)
		: null;

	// Current rate: check if breakeven exceeds remaining fixed term
	const breakevenExceedsCurrentFixed =
		hasBreakeven &&
		currentRateRemainingFixedMonths !== null &&
		currentRateRemainingFixedMonths > 0 &&
		result.breakevenMonths > currentRateRemainingFixedMonths;

	// Not worth switching NOW if breakeven exceeds current rate's remaining fixed term
	// (better to wait until fixed period ends to avoid ERC)
	const isWorthSwitching =
		hasBreakeven &&
		result.totalSavingsOverTerm > 0 &&
		!breakevenExceedsCurrentFixed;

	// Check if interest is actually saved
	const hasInterestSaved = result.interestSavingsDetails.interestSaved > 0;

	// Comparison period in years (for display)
	const comparisonPeriodYears = Math.ceil(result.comparisonPeriodMonths / 12);

	// Filter yearly breakdown to comparison period for charts
	const filteredYearlyBreakdown = result.yearlyBreakdown.filter(
		(y) => y.year <= comparisonPeriodYears,
	);

	// Get key yearly snapshots - only show years within comparison period
	const year1 =
		comparisonPeriodYears >= 1
			? result.yearlyBreakdown.find((y) => y.year === 1)
			: undefined;
	const year5 =
		comparisonPeriodYears >= 5
			? result.yearlyBreakdown.find((y) => y.year === 5)
			: undefined;
	const year10 =
		comparisonPeriodYears >= 10
			? result.yearlyBreakdown.find((y) => y.year === 10)
			: undefined;

	const cardStyles = isWorthSwitching
		? "bg-primary/5 border-primary/20"
		: "bg-amber-500/10 border-amber-500/30";

	return (
		<Card className={cardStyles}>
			<CardContent>
				{/* Breakeven Analysis - Multiple Metrics */}
				<div className="mb-6">
					<p className="text-sm font-medium mb-3">Breakeven Analysis</p>
					<div className="grid gap-3">
						{/* Cost Recovery Breakeven - Primary */}
						<div className="p-3 rounded-lg bg-background border">
							<div className="flex items-start justify-between">
								<div>
									<p className="text-sm font-medium">Cost Recovery</p>
									<p className="text-xs text-muted-foreground mt-0.5">
										When monthly savings exceed switching costs
									</p>
								</div>
								<p
									className={`text-lg font-bold whitespace-nowrap ml-4 ${hasBreakeven ? "text-primary" : "text-amber-600"}`}
								>
									{breakevenText}
								</p>
							</div>
							{result.breakevenDetails && hasBreakeven && (
								<details className="mt-2 group">
									<summary className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1 hover:text-foreground">
										<ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
										Why {breakevenText}?
									</summary>
									<div className="mt-2 text-xs text-muted-foreground space-y-1 pl-4 border-l-2 border-muted">
										<p>
											Monthly savings:{" "}
											<strong className="text-foreground">
												{formatCurrency(result.breakevenDetails.monthlySavings)}
											</strong>
										</p>
										<p>
											Switching costs:{" "}
											<strong className="text-foreground">
												{formatCurrency(result.breakevenDetails.switchingCosts)}
											</strong>
										</p>
										<p>
											After {breakevenText}, you'll have saved{" "}
											<strong className="text-green-600">
												{formatCurrency(
													result.breakevenDetails.cumulativeSavingsAtBreakeven,
												)}
											</strong>
											, exceeding your switching costs.
										</p>
									</div>
									{filteredYearlyBreakdown.length > 0 && (
										<SavingsBreakevenChart
											data={filteredYearlyBreakdown}
											monthlyData={result.monthlyBreakdown.filter(
												(m) => m.month <= result.comparisonPeriodMonths,
											)}
											switchingCosts={result.switchingCosts}
											breakevenYear={breakevenYear}
											breakevenMonth={result.breakevenMonths}
										/>
									)}
								</details>
							)}
							{!hasBreakeven && result.monthlySavings <= 0 && (
								<p className="mt-2 text-xs text-amber-600">
									The new rate doesn't offer monthly savings over your current
									rate.
								</p>
							)}
							{breakevenExceedsCurrentFixed && (
								<div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/30">
									<p className="text-xs text-amber-700 dark:text-amber-400">
										<strong>Consider waiting:</strong> Breakeven (
										{breakevenText}) exceeds your current rate's remaining{" "}
										{formatBreakevenPeriod(currentRateRemainingFixedMonths)}{" "}
										fixed period. You could wait until it ends to avoid any
										early repayment charges.
									</p>
								</div>
							)}
							{breakevenExceedsNewFixedPeriod && (
								<div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/30">
									<p className="text-xs text-amber-700 dark:text-amber-400">
										<strong>Warning:</strong> Breakeven ({breakevenText})
										exceeds the new rate's {newRateFixedPeriodYears}-year fixed
										period. After the fixed period ends, your rate may change,
										affecting your actual savings.
									</p>
								</div>
							)}
							{isNewRateVariable && hasBreakeven && (
								<div className="mt-2 p-2 rounded bg-blue-500/10 border border-blue-500/30">
									<p className="text-xs text-blue-700 dark:text-blue-400">
										<strong>Note:</strong> Variable rates can change at any time
										based on market conditions. Your actual breakeven may be
										shorter or longer depending on future rate changes by the
										lender.
									</p>
								</div>
							)}
						</div>

						{/* Total Interest Saved - Secondary */}
						<div className="p-3 rounded-lg bg-background border">
							<div className="flex items-start justify-between">
								<div>
									<p className="text-sm font-medium">Total Interest Saved</p>
									<p className="text-xs text-muted-foreground mt-0.5">
										Interest you'll avoid paying over the term
									</p>
								</div>
								<p
									className={`text-lg font-bold whitespace-nowrap ml-4 ${hasInterestSaved ? "text-green-600" : "text-amber-600"}`}
								>
									{hasInterestSaved ? "+" : ""}
									{formatCurrency(result.interestSavingsDetails.interestSaved)}
								</p>
							</div>
							{filteredYearlyBreakdown.length > 0 && (
								<details className="mt-2 group">
									<summary className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1 hover:text-foreground">
										<ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
										How is this calculated?
									</summary>
									<div className="mt-2 text-xs text-muted-foreground space-y-1 pl-4 border-l-2 border-muted">
										<p>
											Interest with current rate:{" "}
											<strong className="text-foreground">
												{formatCurrency(
													result.interestSavingsDetails.totalInterestCurrent,
												)}
											</strong>
										</p>
										<p>
											Interest with new rate:{" "}
											<strong className="text-foreground">
												{formatCurrency(
													result.interestSavingsDetails.totalInterestNew,
												)}
											</strong>
										</p>
										<p>
											Interest saved:{" "}
											<strong className="text-green-600">
												{formatCurrency(
													result.interestSavingsDetails.interestSaved,
												)}
											</strong>
										</p>
										<p>
											Net benefit (after costs):{" "}
											<strong
												className={
													result.interestSavingsDetails.netBenefit > 0
														? "text-green-600"
														: "text-amber-600"
												}
											>
												{result.interestSavingsDetails.netBenefit > 0
													? "+"
													: ""}
												{formatCurrency(
													result.interestSavingsDetails.netBenefit,
												)}
											</strong>
										</p>
									</div>
									<InterestComparisonChart data={filteredYearlyBreakdown} />
								</details>
							)}
						</div>
					</div>
				</div>

				{/* Monthly Comparison */}
				<div className="grid gap-4 sm:grid-cols-3 pt-4 border-t border-border">
					<div>
						<p className="text-sm text-muted-foreground">Current Payment</p>
						<p className="text-xl font-bold">
							{formatCurrency(result.currentMonthlyPayment, {
								showCents: true,
							})}
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">New Payment</p>
						<p className="text-xl font-bold text-primary">
							{formatCurrency(result.newMonthlyPayment, { showCents: true })}
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Monthly Savings</p>
						<p
							className={`text-xl font-bold ${result.monthlySavings > 0 ? "text-green-600" : "text-amber-600"}`}
						>
							{result.monthlySavings > 0 ? "+" : ""}
							{formatCurrency(result.monthlySavings, { showCents: true })}
						</p>
					</div>
				</div>

				{/* Switching Costs Breakdown */}
				<div className="pt-4 border-t border-border mt-4">
					<p className="text-sm font-medium mb-2">Switching Costs</p>
					<div
						className={`grid gap-2 text-sm ${result.erc > 0 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}
					>
						<div>
							<p className="text-muted-foreground">Legal Fees (est.)</p>
							<p className="font-semibold">
								{formatCurrency(result.legalFees)}
							</p>
						</div>
						{result.erc > 0 && (
							<div>
								<p className="text-muted-foreground">Early Repayment</p>
								<p className="font-semibold">{formatCurrency(result.erc)}</p>
							</div>
						)}
						<div>
							<p className="text-muted-foreground">Cashback</p>
							<p className="font-semibold text-green-600">
								-{formatCurrency(result.cashback)}
							</p>
						</div>
						<div>
							<p className="text-muted-foreground">Net Cost</p>
							<p className="font-semibold text-primary">
								{formatCurrency(result.switchingCosts)}
							</p>
						</div>
					</div>
				</div>

				{/* Savings Summary */}
				<div className="pt-4 border-t border-border mt-4">
					<p className="text-sm font-medium mb-2">Savings Summary</p>
					<div className="grid gap-4 sm:grid-cols-2 text-sm">
						<div className="p-3 rounded-lg bg-background border">
							<p className="text-muted-foreground mb-1">Year 1 Savings</p>
							<p
								className={`text-lg font-bold ${result.yearOneSavings > 0 ? "text-green-600" : "text-amber-600"}`}
							>
								{result.yearOneSavings > 0 ? "+" : ""}
								{formatCurrency(result.yearOneSavings)}
							</p>
							<p className="text-xs text-muted-foreground">
								After subtracting switching costs
							</p>
						</div>
						<div className="p-3 rounded-lg bg-background border">
							<p className="text-muted-foreground mb-1">
								Total Savings (
								{formatTermDisplay(result.comparisonPeriodMonths)})
							</p>
							<p
								className={`text-lg font-bold ${result.totalSavingsOverTerm > 0 ? "text-green-600" : "text-amber-600"}`}
							>
								{result.totalSavingsOverTerm > 0 ? "+" : ""}
								{formatCurrency(result.totalSavingsOverTerm)}
							</p>
							<p className="text-xs text-muted-foreground">
								Over the comparison period
							</p>
						</div>
					</div>
				</div>

				{/* Savings Over Time - Year Snapshots */}
				{(year1 || year5 || year10) && (
					<div className="pt-4 border-t border-border mt-4">
						<p className="text-sm font-medium mb-2">Savings Over Time</p>
						<p className="text-xs text-muted-foreground mb-3">
							Net savings = cumulative monthly savings − switching costs.
						</p>
						<div className="grid gap-4 sm:grid-cols-3 text-sm">
							{year1 && <RemortgageYearSnapshot year={1} data={year1} />}
							{year5 && <RemortgageYearSnapshot year={5} data={year5} />}
							{year10 && <RemortgageYearSnapshot year={10} data={year10} />}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

interface RemortgageYearSnapshotProps {
	year: number;
	data: RemortgageYearlyComparison;
}

function RemortgageYearSnapshot({ year, data }: RemortgageYearSnapshotProps) {
	const isAhead = data.netSavings > 0;

	return (
		<div className="p-3 rounded-lg bg-background border">
			<p className="font-medium mb-2">Year {year}</p>
			<div className="space-y-1 text-xs">
				<div className="flex justify-between">
					<span className="text-muted-foreground">Net Savings:</span>
					<span
						className={`font-semibold ${isAhead ? "text-green-600" : "text-amber-600"}`}
					>
						{isAhead ? "+" : ""}
						{formatCurrency(data.netSavings)}
					</span>
				</div>
				<div className="flex justify-between">
					<span className="text-muted-foreground">Interest Saved:</span>
					<span className="text-primary">
						{formatCurrency(data.interestSaved)}
					</span>
				</div>
				<div className="flex justify-between">
					<span className="text-muted-foreground">Balance Diff:</span>
					<span>
						{formatCurrency(
							data.remainingBalanceCurrent - data.remainingBalanceNew,
						)}
					</span>
				</div>
			</div>
		</div>
	);
}
