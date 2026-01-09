import { ChevronDown } from "lucide-react";
import type {
	RemortgageResult,
	RemortgageYearlyComparison,
	RentVsBuyResult,
} from "@/lib/mortgage/breakeven";
import { formatBreakevenPeriod } from "@/lib/mortgage/breakeven";
import { formatCurrency } from "@/lib/utils/currency";
import { formatTermDisplay } from "@/lib/utils/term";
import { Card, CardContent } from "../ui/card";
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
						<p className="text-xl font-bold">{formatCurrency(monthlyRent)}</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">
							Monthly Mortgage Payment
						</p>
						<p className="text-xl font-bold text-primary">
							{formatCurrency(result.monthlyMortgagePayment)}
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
							{formatCurrency(result.currentMonthlyPayment)}
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">New Payment</p>
						<p className="text-xl font-bold text-primary">
							{formatCurrency(result.newMonthlyPayment)}
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Monthly Savings</p>
						<p
							className={`text-xl font-bold ${result.monthlySavings > 0 ? "text-green-600" : "text-amber-600"}`}
						>
							{result.monthlySavings > 0 ? "+" : ""}
							{formatCurrency(result.monthlySavings)}
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
