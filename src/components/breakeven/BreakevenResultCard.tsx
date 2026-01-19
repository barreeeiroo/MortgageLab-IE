import { AlertCircle, ChevronDown, Trophy } from "lucide-react";
import type {
	CashbackBreakevenResult,
	RemortgageResult,
	RemortgageYearlyComparison,
	RentVsBuyResult,
} from "@/lib/mortgage/breakeven";
import { formatBreakevenPeriod } from "@/lib/mortgage/breakeven";
import type { OverpaymentAllowanceInfo } from "@/lib/stores/breakeven";
import { formatCurrency } from "@/lib/utils/currency";
import { formatTermDisplay } from "@/lib/utils/term";
import { Card, CardContent } from "../ui/card";
import { CashbackComparisonChart } from "./chart/CashbackComparisonChart";
import { EquityRecoveryChart } from "./chart/EquityRecoveryChart";
import { InterestComparisonChart } from "./chart/InterestComparisonChart";
import { NetWorthBreakevenChart } from "./chart/NetWorthBreakevenChart";
import { SaleBreakevenChart } from "./chart/SaleBreakevenChart";
import { SavingsBreakevenChart } from "./chart/SavingsBreakevenChart";

// --- Rent vs Buy Result Card ---

interface RentVsBuyResultCardProps {
	result: RentVsBuyResult;
	monthlyRent: number;
	saleCostRate: number;
}

export function RentVsBuyResultCard({
	result,
	monthlyRent,
	saleCostRate,
}: RentVsBuyResultCardProps) {
	// Calculate breakeven years for chart reference lines
	const netWorthBreakevenYear = result.breakevenMonth
		? Math.ceil(result.breakevenMonth / 12)
		: null;
	const saleBreakevenYear = result.breakEvenOnSaleMonth
		? Math.ceil(result.breakEvenOnSaleMonth / 12)
		: null;
	const equityBreakevenYear = result.equityRecoveryMonth
		? Math.ceil(result.equityRecoveryMonth / 12)
		: null;
	const hasNetWorthBreakeven = result.breakevenMonth !== null;
	const hasBreakEvenOnSale = result.breakEvenOnSaleMonth !== null;
	const hasEquityRecovery = result.equityRecoveryMonth !== null;

	// Get key yearly snapshots
	const year1 = result.yearlyBreakdown.find((y) => y.year === 1);
	const year5 = result.yearlyBreakdown.find((y) => y.year === 5);
	const year10 = result.yearlyBreakdown.find((y) => y.year === 10);

	const cardStyles = hasNetWorthBreakeven
		? "bg-primary/5 border-primary/20"
		: "bg-amber-500/10 border-amber-500/30";

	return (
		<Card className={cardStyles}>
			<CardContent>
				{/* Breakeven Points - Multiple Metrics */}
				<div className="mb-6">
					<p className="text-sm font-medium mb-3">Breakeven Analysis</p>
					<div className="grid gap-3">
						{/* Net Worth Breakeven - Primary */}
						<div className="p-3 rounded-lg bg-background border">
							<div className="flex items-start justify-between">
								<div>
									<p className="text-sm font-medium">Net Worth Breakeven</p>
									<p className="text-xs text-muted-foreground mt-0.5">
										When buying is financially better than renting
									</p>
								</div>
								<p
									className={`text-lg font-bold whitespace-nowrap ml-4 ${hasNetWorthBreakeven ? "text-primary" : "text-amber-600"}`}
								>
									{formatBreakevenPeriod(result.breakevenMonth)}
								</p>
							</div>
							{result.breakevenDetails && result.breakevenMonth && (
								<details className="mt-2 group">
									<summary className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1 hover:text-foreground">
										<ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
										Why {formatBreakevenPeriod(result.breakevenMonth)}?
									</summary>
									<div className="mt-2 text-xs text-muted-foreground space-y-1 pl-4 border-l-2 border-muted">
										<p>
											By then, you'll have paid{" "}
											<strong className="text-foreground">
												{formatCurrency(result.breakevenDetails.cumulativeRent)}
											</strong>{" "}
											in rent.
										</p>
										<p>
											Your net ownership cost will be{" "}
											<strong className="text-foreground">
												{formatCurrency(
													result.breakevenDetails.netOwnershipCost,
												)}
											</strong>{" "}
											(total paid{" "}
											{formatCurrency(
												result.breakevenDetails.cumulativeOwnership,
											)}{" "}
											− equity {formatCurrency(result.breakevenDetails.equity)}
											).
										</p>
										<p>
											Since{" "}
											{formatCurrency(result.breakevenDetails.netOwnershipCost)}{" "}
											&lt;{" "}
											{formatCurrency(result.breakevenDetails.cumulativeRent)},
											buying wins.
										</p>
									</div>
									<NetWorthBreakevenChart
										data={result.yearlyBreakdown}
										monthlyData={result.monthlyBreakdown}
										breakevenYear={netWorthBreakevenYear}
										breakevenMonth={result.breakevenMonth}
									/>
								</details>
							)}
						</div>

						{/* Break-even on Sale */}
						<div className="p-3 rounded-lg bg-background border">
							<div className="flex items-start justify-between">
								<div>
									<p className="text-sm font-medium">Break-even on Sale</p>
									<p className="text-xs text-muted-foreground mt-0.5">
										When you can sell and recover your upfront costs
									</p>
								</div>
								<p
									className={`text-lg font-bold whitespace-nowrap ml-4 ${hasBreakEvenOnSale ? "text-green-600" : "text-amber-600"}`}
								>
									{formatBreakevenPeriod(result.breakEvenOnSaleMonth)}
								</p>
							</div>
							{result.breakEvenOnSaleDetails && result.breakEvenOnSaleMonth && (
								<details className="mt-2 group">
									<summary className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1 hover:text-foreground">
										<ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
										Why {formatBreakevenPeriod(result.breakEvenOnSaleMonth)}?
									</summary>
									<div className="mt-2 text-xs text-muted-foreground space-y-1 pl-4 border-l-2 border-muted">
										<p>
											Home value:{" "}
											<strong className="text-foreground">
												{formatCurrency(
													result.breakEvenOnSaleDetails.homeValue,
												)}
											</strong>
										</p>
										<p>
											Sale costs (agent fees):{" "}
											<strong className="text-foreground">
												−
												{formatCurrency(
													result.breakEvenOnSaleDetails.saleCosts,
												)}
											</strong>
										</p>
										<p>
											Mortgage balance to pay off:{" "}
											<strong className="text-foreground">
												−
												{formatCurrency(
													result.breakEvenOnSaleDetails.mortgageBalance,
												)}
											</strong>
										</p>
										<p>
											You'd walk away with:{" "}
											<strong className="text-green-600">
												{formatCurrency(
													result.breakEvenOnSaleDetails.saleProceeds,
												)}
											</strong>{" "}
											(exceeds your{" "}
											{formatCurrency(
												result.breakEvenOnSaleDetails.upfrontCosts,
											)}{" "}
											upfront)
										</p>
									</div>
									<SaleBreakevenChart
										data={result.yearlyBreakdown}
										monthlyData={result.monthlyBreakdown}
										upfrontCosts={result.upfrontCosts}
										saleCostRate={saleCostRate}
										breakevenYear={saleBreakevenYear}
										breakevenMonth={result.breakEvenOnSaleMonth}
									/>
								</details>
							)}
						</div>

						{/* Equity Recovery Breakeven */}
						<div className="p-3 rounded-lg bg-background border">
							<div className="flex items-start justify-between">
								<div>
									<p className="text-sm font-medium">Equity Recovery</p>
									<p className="text-xs text-muted-foreground mt-0.5">
										When your equity exceeds upfront costs
									</p>
								</div>
								<p
									className={`text-lg font-bold whitespace-nowrap ml-4 ${hasEquityRecovery ? "text-green-600" : "text-amber-600"}`}
								>
									{formatBreakevenPeriod(result.equityRecoveryMonth)}
								</p>
							</div>
							{result.equityRecoveryDetails && result.equityRecoveryMonth && (
								<details className="mt-2 group">
									<summary className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1 hover:text-foreground">
										<ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
										Why {formatBreakevenPeriod(result.equityRecoveryMonth)}?
									</summary>
									<div className="mt-2 text-xs text-muted-foreground space-y-1 pl-4 border-l-2 border-muted">
										<p>
											Home value:{" "}
											<strong className="text-foreground">
												{formatCurrency(result.equityRecoveryDetails.homeValue)}
											</strong>
										</p>
										<p>
											Mortgage balance:{" "}
											<strong className="text-foreground">
												−
												{formatCurrency(
													result.equityRecoveryDetails.mortgageBalance,
												)}
											</strong>
										</p>
										<p>
											Your equity:{" "}
											<strong className="text-green-600">
												{formatCurrency(result.equityRecoveryDetails.equity)}
											</strong>{" "}
											(exceeds your{" "}
											{formatCurrency(
												result.equityRecoveryDetails.upfrontCosts,
											)}{" "}
											upfront)
										</p>
									</div>
									<EquityRecoveryChart
										data={result.yearlyBreakdown}
										monthlyData={result.monthlyBreakdown}
										upfrontCosts={result.upfrontCosts}
										breakevenYear={equityBreakevenYear}
										breakevenMonth={result.equityRecoveryMonth}
									/>
								</details>
							)}
						</div>
					</div>
				</div>

				{/* Monthly Comparison */}
				<div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-border">
					<div>
						<p className="text-sm text-muted-foreground">
							Current Monthly Rent
						</p>
						<p className="text-xl font-bold">
							{formatCurrency(monthlyRent, { showCents: true })}
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">
							Monthly Mortgage Payment
						</p>
						<p className="text-xl font-bold text-primary">
							{formatCurrency(result.monthlyMortgagePayment, {
								showCents: true,
							})}
						</p>
					</div>
				</div>

				{/* Upfront Costs Breakdown */}
				<div className="pt-4 border-t border-border mt-4">
					<p className="text-sm font-medium mb-2">Upfront Costs to Buy</p>
					<div className="grid gap-2 sm:grid-cols-2 text-sm">
						<div className="p-3 rounded-lg bg-background border">
							<p className="text-muted-foreground mb-1">Deposit</p>
							<p className="text-lg font-semibold">
								{formatCurrency(result.deposit)}
							</p>
							<p className="text-xs text-muted-foreground">
								Mortgage: {formatCurrency(result.mortgageAmount)}
							</p>
						</div>
						<div className="p-3 rounded-lg bg-background border">
							<p className="text-muted-foreground mb-1">Purchase Costs</p>
							<p className="text-lg font-semibold">
								{formatCurrency(result.purchaseCosts)}
							</p>
							<p className="text-xs text-muted-foreground">
								Stamp Duty: {formatCurrency(result.stampDuty)} + Legal:{" "}
								{formatCurrency(result.legalFees)}
							</p>
						</div>
					</div>
					<div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
						<div className="flex justify-between items-center">
							<p className="text-muted-foreground">Total Cash Required</p>
							<p className="text-xl font-bold text-primary">
								{formatCurrency(result.upfrontCosts)}
							</p>
						</div>
					</div>
				</div>

				{/* Net Position Over Time */}
				{(year1 || year5 || year10) && (
					<div className="pt-4 border-t border-border mt-4">
						<p className="text-sm font-medium mb-2">Net Position Over Time</p>
						<p className="text-xs text-muted-foreground mb-3">
							Net ownership cost = unrecoverable costs (interest, maintenance,
							fees) + opportunity cost of not investing your deposit.
						</p>
						<div className="grid gap-4 sm:grid-cols-3 text-sm">
							{year1 && (
								<YearSnapshot
									year={1}
									cumulativeRent={year1.cumulativeRent}
									netOwnership={year1.netOwnershipCost}
									equity={year1.equity}
								/>
							)}
							{year5 && (
								<YearSnapshot
									year={5}
									cumulativeRent={year5.cumulativeRent}
									netOwnership={year5.netOwnershipCost}
									equity={year5.equity}
								/>
							)}
							{year10 && (
								<YearSnapshot
									year={10}
									cumulativeRent={year10.cumulativeRent}
									netOwnership={year10.netOwnershipCost}
									equity={year10.equity}
								/>
							)}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

interface YearSnapshotProps {
	year: number;
	cumulativeRent: number;
	netOwnership: number;
	equity: number;
}

function YearSnapshot({
	year,
	cumulativeRent,
	netOwnership,
	equity,
}: YearSnapshotProps) {
	const difference = cumulativeRent - netOwnership;
	const isBuyingAhead = difference > 0;

	return (
		<div className="p-3 rounded-lg bg-background border">
			<p className="font-medium mb-2">Year {year}</p>
			<div className="space-y-1 text-xs">
				<div className="flex justify-between">
					<span className="text-muted-foreground">Rent Paid:</span>
					<span>{formatCurrency(cumulativeRent)}</span>
				</div>
				<div className="flex justify-between">
					<span className="text-muted-foreground">Net Own Cost:</span>
					<span>{formatCurrency(netOwnership)}</span>
				</div>
				<div className="flex justify-between">
					<span className="text-muted-foreground">Equity Built:</span>
					<span className="text-primary">{formatCurrency(equity)}</span>
				</div>
				<div className="flex justify-between pt-1 border-t">
					<span className="text-muted-foreground">Difference:</span>
					<span
						className={`font-semibold ${isBuyingAhead ? "text-green-600" : "text-amber-600"}`}
					>
						{isBuyingAhead ? "+" : ""}
						{formatCurrency(difference)}
					</span>
				</div>
			</div>
		</div>
	);
}

// --- Remortgage Result Card ---

interface RemortgageResultCardProps {
	result: RemortgageResult;
	remainingTermMonths: number;
	fixedPeriodMonths: number | null; // null = variable rate
}

export function RemortgageResultCard({
	result,
	remainingTermMonths,
	fixedPeriodMonths,
}: RemortgageResultCardProps) {
	const hasBreakeven =
		Number.isFinite(result.breakevenMonths) && result.breakevenMonths > 0;
	const isWorthSwitching = hasBreakeven && result.totalSavingsOverTerm > 0;
	const breakevenText = formatBreakevenPeriod(
		hasBreakeven ? result.breakevenMonths : null,
	);

	// Calculate breakeven year for chart reference line
	const breakevenYear = hasBreakeven
		? Math.ceil(result.breakevenMonths / 12)
		: null;

	// Fixed period vs variable rate warnings
	const isVariableRate = fixedPeriodMonths === null;
	const breakevenExceedsFixedPeriod =
		hasBreakeven &&
		fixedPeriodMonths !== null &&
		result.breakevenMonths > fixedPeriodMonths;
	const fixedPeriodYears = fixedPeriodMonths
		? Math.round(fixedPeriodMonths / 12)
		: null;

	// Check if interest is actually saved
	const hasInterestSaved = result.interestSavingsDetails.interestSaved > 0;

	// Get key yearly snapshots
	const year1 = result.yearlyBreakdown.find((y) => y.year === 1);
	const year5 = result.yearlyBreakdown.find((y) => y.year === 5);
	const year10 = result.yearlyBreakdown.find((y) => y.year === 10);

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
									{result.yearlyBreakdown.length > 0 && (
										<SavingsBreakevenChart
											data={result.yearlyBreakdown}
											monthlyData={result.monthlyBreakdown}
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
							{breakevenExceedsFixedPeriod && (
								<div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/30">
									<p className="text-xs text-amber-700 dark:text-amber-400">
										<strong>Warning:</strong> Breakeven ({breakevenText})
										exceeds your {fixedPeriodYears}-year fixed period. After the
										fixed period ends, your rate may change, affecting your
										actual savings.
									</p>
								</div>
							)}
							{isVariableRate && hasBreakeven && (
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
							{result.yearlyBreakdown.length > 0 && (
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
									<InterestComparisonChart data={result.yearlyBreakdown} />
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
								Total Savings ({formatTermDisplay(remainingTermMonths)})
							</p>
							<p
								className={`text-lg font-bold ${result.totalSavingsOverTerm > 0 ? "text-green-600" : "text-amber-600"}`}
							>
								{result.totalSavingsOverTerm > 0 ? "+" : ""}
								{formatCurrency(result.totalSavingsOverTerm)}
							</p>
							<p className="text-xs text-muted-foreground">
								Over the remaining mortgage term
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

// --- Cashback Comparison Result Card ---

interface CashbackResultCardProps {
	result: CashbackBreakevenResult;
	mortgageTermMonths: number;
	overpaymentAllowances?: OverpaymentAllowanceInfo[];
}

export function CashbackResultCard({
	result,
	mortgageTermMonths,
	overpaymentAllowances,
}: CashbackResultCardProps) {
	const cheapestOption = result.options[result.cheapestNetCostIndex];
	const worstOption = result.options.reduce(
		(worst, opt) => (opt.netCost > worst.netCost ? opt : worst),
		result.options[0],
	);

	// Format comparison period description
	const comparisonPeriodText = result.allVariable
		? `Full mortgage term (${Math.floor(mortgageTermMonths / 12)} years)`
		: `${result.comparisonPeriodYears} year${result.comparisonPeriodYears !== 1 ? "s" : ""} (max fixed period)`;

	// Get yearly data up to comparison period
	const yearlyDataForTable = result.yearlyBreakdown;
	const comparisonYears = Math.floor(result.comparisonPeriodYears);

	return (
		<Card className="bg-primary/5 border-primary/20">
			<CardContent>
				{/* Comparison Period Info */}
				<div className="mb-4 p-3 rounded-lg bg-background border">
					<p className="text-sm text-muted-foreground">
						<span className="font-medium text-foreground">
							Comparing over:{" "}
						</span>
						{comparisonPeriodText}
					</p>
					{!result.allVariable && (
						<p className="text-xs text-muted-foreground mt-1">
							Fixed rates only apply during their fixed period, so we compare up
							to the longest fixed period.
						</p>
					)}
				</div>

				{/* Winner Summary */}
				<div className="mb-6">
					<div className="flex items-center gap-2 mb-3">
						<div className="p-2 rounded-lg bg-primary/10">
							<Trophy className="h-5 w-5 text-primary" />
						</div>
						<div>
							<p className="font-semibold">
								Best Option: {cheapestOption.label}
							</p>
							<p className="text-sm text-muted-foreground">
								{cheapestOption.rate}% rate with{" "}
								{formatCurrency(cheapestOption.cashbackAmount)} cashback
							</p>
						</div>
					</div>
					<div className="p-3 rounded-lg bg-background border">
						<div className="flex items-center justify-between">
							<span className="text-sm text-muted-foreground">
								Saves over comparison period vs {worstOption.label}
							</span>
							<span className="text-lg font-bold text-green-600">
								{formatCurrency(result.savingsVsWorst)}
							</span>
						</div>
					</div>
				</div>

				{/* Options Comparison Table - Transposed (metrics as rows, options as columns) */}
				<div className="mb-6">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b">
								<th className="text-left py-2 pr-3" />
								{result.options.map((opt, index) => {
									const isNetCostWinner = index === result.cheapestNetCostIndex;
									return (
										<th
											key={opt.label}
											className={`text-right py-2 px-3 ${isNetCostWinner ? "bg-primary/5" : ""}`}
										>
											<span className="font-medium">{opt.label}</span>
											{opt.fixedPeriodYears > 0 && (
												<span className="ml-1 text-xs text-muted-foreground font-normal">
													({opt.fixedPeriodYears}y)
												</span>
											)}
											{isNetCostWinner && (
												<span className="ml-1 text-xs text-primary">Best</span>
											)}
										</th>
									);
								})}
							</tr>
						</thead>
						<tbody>
							<tr className="border-b">
								<td className="py-2 pr-3 text-muted-foreground">Rate</td>
								{result.options.map((opt, index) => (
									<td
										key={opt.label}
										className={`text-right py-2 px-3 ${index === result.cheapestNetCostIndex ? "bg-primary/5" : ""}`}
									>
										{opt.rate}%
									</td>
								))}
							</tr>
							<tr className="border-b">
								<td className="py-2 pr-3 text-muted-foreground">
									Monthly Payment
								</td>
								{result.options.map((opt, index) => {
									const isMonthlyWinner = index === result.cheapestMonthlyIndex;
									return (
										<td
											key={opt.label}
											className={`text-right py-2 px-3 ${isMonthlyWinner ? "text-green-600 font-medium" : ""} ${index === result.cheapestNetCostIndex ? "bg-primary/5" : ""}`}
										>
											{formatCurrency(opt.monthlyPayment, { showCents: true })}
										</td>
									);
								})}
							</tr>
							<tr className="border-b">
								<td className="py-2 pr-3 text-muted-foreground">
									Monthly Diff
								</td>
								{result.options.map((opt, index) => (
									<td
										key={opt.label}
										className={`text-right py-2 px-3 text-muted-foreground ${index === result.cheapestNetCostIndex ? "bg-primary/5" : ""}`}
									>
										{opt.monthlyPaymentDiff > 0
											? `+${formatCurrency(opt.monthlyPaymentDiff, { showCents: true })}`
											: "—"}
									</td>
								))}
							</tr>
							<tr className="border-b">
								<td className="py-2 pr-3 text-muted-foreground">Cashback</td>
								{result.options.map((opt, index) => (
									<td
										key={opt.label}
										className={`text-right py-2 px-3 text-green-600 ${index === result.cheapestNetCostIndex ? "bg-primary/5" : ""}`}
									>
										{formatCurrency(opt.cashbackAmount)}
									</td>
								))}
							</tr>
							<tr className="border-b bg-muted/30">
								<td className="py-2 pr-3 text-muted-foreground">
									Interest ({comparisonYears}y)
								</td>
								{result.options.map((opt, index) => (
									<td
										key={opt.label}
										className={`text-right py-2 px-3 ${index === result.cheapestNetCostIndex ? "bg-primary/5" : ""}`}
									>
										{formatCurrency(opt.interestPaid)}
									</td>
								))}
							</tr>
							<tr className="border-b bg-muted/30">
								<td className="py-2 pr-3 text-muted-foreground">
									Principal ({comparisonYears}y)
								</td>
								{result.options.map((opt, index) => (
									<td
										key={opt.label}
										className={`text-right py-2 px-3 ${index === result.cheapestNetCostIndex ? "bg-primary/5" : ""}`}
									>
										{formatCurrency(opt.principalPaid)}
									</td>
								))}
							</tr>
							<tr className="border-b bg-muted/30">
								<td className="py-2 pr-3 text-muted-foreground">
									Balance After
								</td>
								{result.options.map((opt, index) => (
									<td
										key={opt.label}
										className={`text-right py-2 px-3 text-muted-foreground ${index === result.cheapestNetCostIndex ? "bg-primary/5" : ""}`}
									>
										{formatCurrency(opt.balanceAtEnd)}
									</td>
								))}
							</tr>
							<tr className="border-b font-medium">
								<td className="py-2 pr-3">Net Cost</td>
								{result.options.map((opt, index) => {
									const isNetCostWinner = index === result.cheapestNetCostIndex;
									return (
										<td
											key={opt.label}
											className={`text-right py-2 px-3 ${isNetCostWinner ? "text-green-600 bg-primary/5" : ""}`}
										>
											{formatCurrency(opt.netCost)}
										</td>
									);
								})}
							</tr>
						</tbody>
					</table>
					<p className="text-xs text-muted-foreground mt-2">
						Net cost = interest paid - cashback. Values for {comparisonYears}
						-year comparison period.
					</p>
				</div>

				{/* Net Cost Chart */}
				<div className="mb-6">
					<p className="text-sm font-medium mb-3">Net Cost Over Time</p>
					<CashbackComparisonChart
						yearlyData={result.yearlyBreakdown}
						options={result.options}
						projectionYear={result.projectionYear}
					/>
				</div>

				{/* Time Horizon Comparison */}
				{yearlyDataForTable.length > 0 && (
					<div className="mb-6">
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b">
										<th className="text-left py-2 pr-3">Option</th>
										{yearlyDataForTable.map((y) => (
											<th key={y.year} className="text-right py-2 px-3">
												Year {y.year}
											</th>
										))}
										{result.projectionYear && (
											<th className="text-right py-2 pl-3 text-muted-foreground border-l">
												Year {result.projectionYear.year}*
											</th>
										)}
									</tr>
								</thead>
								<tbody>
									{result.options.map((opt, index) => {
										return (
											<tr key={opt.label} className="border-b">
												<td className="py-2 pr-3 font-medium">{opt.label}</td>
												{yearlyDataForTable.map((yearData) => {
													// Find cheapest at this year
													const minAtYear = Math.min(...yearData.netCosts);
													const isCheapestAtYear =
														yearData.netCosts[index] === minAtYear;
													return (
														<td
															key={yearData.year}
															className={`text-right py-2 px-3 ${isCheapestAtYear ? "text-green-600 font-medium" : ""}`}
														>
															{formatCurrency(yearData.netCosts[index])}
														</td>
													);
												})}
												{result.projectionYear && (
													<td className="text-right py-2 pl-3 text-muted-foreground border-l">
														{formatCurrency(
															result.projectionYear.netCosts[index],
														)}
													</td>
												)}
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
						<p className="text-xs text-muted-foreground mt-2">
							Green = cheapest at that point. Values = cumulative interest −
							cashback.
							{result.projectionYear &&
								" *Projection beyond comparison period for reference only."}
						</p>
					</div>
				)}

				{/* Breakeven Points */}
				{result.breakevens.some((be) => be.breakevenMonth !== null) && (
					<div>
						<p className="text-sm font-medium mb-3">Breakeven Points</p>
						<div className="space-y-2">
							{result.breakevens
								.filter((be) => be.breakevenMonth !== null)
								.map((be) => (
									<div
										key={`${be.optionAIndex}-${be.optionBIndex}`}
										className="p-2 rounded-lg bg-background border text-sm"
									>
										<span className="text-muted-foreground">
											{be.optionALabel} vs {be.optionBLabel}:
										</span>{" "}
										<span className="font-medium">
											{formatBreakevenPeriod(be.breakevenMonth)}
										</span>
									</div>
								))}
						</div>
					</div>
				)}

				{/* Overpayment Allowances */}
				{overpaymentAllowances && overpaymentAllowances.length > 0 && (
					<div className="mt-6">
						<p className="text-sm font-medium mb-3">
							Overpayment Allowances ({result.comparisonPeriodYears}y)
						</p>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b">
										<th className="text-left py-2 pr-3">Option</th>
										<th className="text-right py-2 pl-3">
											Total ({result.comparisonPeriodYears}y)
										</th>
									</tr>
								</thead>
								<tbody>
									{overpaymentAllowances.map((allowance, index) => (
										<tr
											key={result.options[index].label}
											className="border-b last:border-b-0"
										>
											<td className="py-2 pr-3">
												<span className="font-medium">
													{result.options[index].label}
												</span>
											</td>
											<td className="text-right py-2 pl-3 font-medium">
												{allowance.policy ? (
													formatCurrency(allowance.totalAllowance)
												) : (
													<span className="text-muted-foreground text-xs flex items-center justify-end gap-1">
														<AlertCircle className="h-3 w-3" />
														Breakage fee
													</span>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<p className="text-xs text-muted-foreground mt-2">
							Overpayment allowance per lender policy. Exceeding may incur
							charges.
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
