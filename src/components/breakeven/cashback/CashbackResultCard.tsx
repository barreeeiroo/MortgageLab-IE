import { AlertCircle, ChevronDown, Trophy } from "lucide-react";
import type {
	CashbackBreakevenResult,
	CashbackOptionResult,
} from "@/lib/mortgage/breakeven";
import { formatBreakevenPeriod } from "@/lib/mortgage/breakeven";
import type { OverpaymentAllowanceInfo } from "@/lib/stores/breakeven";
import { formatCurrency } from "@/lib/utils/currency";
import { Card, CardContent } from "../../ui/card";
import {
	type CashbackChartMetric,
	CashbackComparisonChart,
} from "./chart/CashbackComparisonChart";

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
	const cheapestOption = result.options[result.cheapestAdjustedBalanceIndex];
	const worstOption = result.options.reduce(
		(worst, opt) => (opt.adjustedBalance > worst.adjustedBalance ? opt : worst),
		result.options[0],
	);

	// Format comparison period description
	const comparisonPeriodText = result.allVariable
		? `Full mortgage term (${Math.floor(mortgageTermMonths / 12)} years)`
		: `${result.comparisonPeriodYears} year${result.comparisonPeriodYears !== 1 ? "s" : ""} (max fixed period)`;

	return (
		<div className="space-y-4">
			{/* Comparison Period Info - Outside the result card */}
			<div className="p-3 rounded-lg bg-muted/50 border">
				<p className="text-sm text-muted-foreground">
					<span className="font-medium text-foreground">Comparing over: </span>
					{comparisonPeriodText}
				</p>
				{!result.allVariable && (
					<p className="text-xs text-muted-foreground mt-1">
						Fixed rates only apply during their fixed period, so we compare up
						to the longest fixed period.
					</p>
				)}
			</div>

			<Card className="bg-primary/5 border-primary/20">
				<CardContent>
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

					{/* Key Metrics - Vertically Stacked */}
					<div className="grid gap-3 mb-6">
						{/* Adjusted Balance */}
						<MetricRow
							title="Adjusted Balance"
							description="Balance if cashback was applied to principal at start"
							result={result}
							metric="adjustedBalances"
							getValue={(opt) => opt.adjustedBalance}
						/>

						{/* Net Cost */}
						<MetricRow
							title="Net Cost"
							description="Interest paid minus cashback received"
							result={result}
							metric="netCosts"
							getValue={(opt) => opt.netCost}
						/>

						{/* Balance After */}
						<MetricRow
							title="Balance After"
							description="Remaining mortgage balance after comparison period"
							result={result}
							metric="balances"
							getValue={(opt) => opt.balanceAtEnd}
						/>
					</div>

					{/* Options Comparison Table - Transposed (metrics as rows, options as columns) */}
					<div className="mb-6">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b">
									<th className="text-left py-2 pr-3" />
									{result.options.map((opt, index) => {
										const isWinner =
											index === result.cheapestAdjustedBalanceIndex;
										return (
											<th
												key={opt.label}
												className={`text-right py-2 px-3 ${isWinner ? "bg-primary/5" : ""}`}
											>
												<span className="font-medium">{opt.label}</span>
												{isWinner && (
													<span className="ml-1 text-xs text-primary">
														Best
													</span>
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
											className={`text-right py-2 px-3 ${index === result.cheapestAdjustedBalanceIndex ? "bg-primary/5" : ""}`}
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
										const isMonthlyWinner =
											index === result.cheapestMonthlyIndex;
										return (
											<td
												key={opt.label}
												className={`text-right py-2 px-3 ${isMonthlyWinner ? "text-green-600 font-medium" : ""} ${index === result.cheapestAdjustedBalanceIndex ? "bg-primary/5" : ""}`}
											>
												{formatCurrency(opt.monthlyPayment, {
													showCents: true,
												})}
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
											className={`text-right py-2 px-3 text-muted-foreground ${index === result.cheapestAdjustedBalanceIndex ? "bg-primary/5" : ""}`}
										>
											{opt.monthlyPaymentDiff > 0
												? `+${formatCurrency(opt.monthlyPaymentDiff, { showCents: true })}`
												: "—"}
										</td>
									))}
								</tr>
								<tr className="border-b">
									<td className="py-2 pr-3 text-muted-foreground">Cashback</td>
									{(() => {
										const maxCashback = Math.max(
											...result.options.map((o) => o.cashbackAmount),
										);
										return result.options.map((opt, index) => {
											const isBestCashback =
												opt.cashbackAmount === maxCashback && maxCashback > 0;
											return (
												<td
													key={opt.label}
													className={`text-right py-2 px-3 ${isBestCashback ? "text-green-600 font-medium" : ""} ${index === result.cheapestAdjustedBalanceIndex ? "bg-primary/5" : ""}`}
												>
													{formatCurrency(opt.cashbackAmount)}
												</td>
											);
										});
									})()}
								</tr>
								<tr className="border-b bg-muted/30">
									<td className="py-2 pr-3 text-muted-foreground">Interest</td>
									{(() => {
										const minInterest = Math.min(
											...result.options.map((o) => o.interestPaid),
										);
										return result.options.map((opt, index) => {
											const isBestInterest = opt.interestPaid === minInterest;
											return (
												<td
													key={opt.label}
													className={`text-right py-2 px-3 ${isBestInterest ? "text-green-600 font-medium" : ""} ${index === result.cheapestAdjustedBalanceIndex ? "bg-primary/5" : ""}`}
												>
													{formatCurrency(opt.interestPaid)}
												</td>
											);
										});
									})()}
								</tr>
								<tr className="border-b bg-muted/30">
									<td className="py-2 pr-3 text-muted-foreground">Principal</td>
									{(() => {
										const maxPrincipal = Math.max(
											...result.options.map((o) => o.principalPaid),
										);
										return result.options.map((opt, index) => {
											const isBestPrincipal =
												opt.principalPaid === maxPrincipal;
											return (
												<td
													key={opt.label}
													className={`text-right py-2 px-3 ${isBestPrincipal ? "text-green-600 font-medium" : ""} ${index === result.cheapestAdjustedBalanceIndex ? "bg-primary/5" : ""}`}
												>
													{formatCurrency(opt.principalPaid)}
												</td>
											);
										});
									})()}
								</tr>
								<tr className="border-b bg-muted/30">
									<td className="py-2 pr-3 font-medium">Adjusted Balance</td>
									{(() => {
										const minAdjusted = Math.min(
											...result.options.map((o) => o.adjustedBalance),
										);
										return result.options.map((opt, index) => {
											const isBestAdjusted =
												opt.adjustedBalance === minAdjusted;
											return (
												<td
													key={opt.label}
													className={`text-right py-2 px-3 font-medium ${isBestAdjusted ? "text-green-600" : ""} ${index === result.cheapestAdjustedBalanceIndex ? "bg-primary/5" : ""}`}
												>
													{formatCurrency(opt.adjustedBalance)}
												</td>
											);
										});
									})()}
								</tr>
								<tr className="border-b bg-muted/30">
									<td className="py-2 pr-3 font-medium">Net Cost</td>
									{(() => {
										const minNetCost = Math.min(
											...result.options.map((o) => o.netCost),
										);
										return result.options.map((opt, index) => {
											const isBestNetCost = opt.netCost === minNetCost;
											return (
												<td
													key={opt.label}
													className={`text-right py-2 px-3 font-medium ${isBestNetCost ? "text-green-600" : ""} ${index === result.cheapestAdjustedBalanceIndex ? "bg-primary/5" : ""}`}
												>
													{formatCurrency(opt.netCost)}
												</td>
											);
										});
									})()}
								</tr>
								<tr className="border-b bg-muted/30">
									<td className="py-2 pr-3 font-medium">Balance</td>
									{(() => {
										const minBalance = Math.min(
											...result.options.map((o) => o.balanceAtEnd),
										);
										return result.options.map((opt, index) => {
											const isBestBalance = opt.balanceAtEnd === minBalance;
											return (
												<td
													key={opt.label}
													className={`text-right py-2 px-3 font-medium ${isBestBalance ? "text-green-600" : ""} ${index === result.cheapestAdjustedBalanceIndex ? "bg-primary/5" : ""}`}
												>
													{formatCurrency(opt.balanceAtEnd)}
												</td>
											);
										});
									})()}
								</tr>
							</tbody>
						</table>
					</div>

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
													{allowance.policy && (
														<p className="text-xs text-muted-foreground">
															{allowance.policy.label}
														</p>
													)}
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
		</div>
	);
}

// =============================================================================
// MetricRow Component
// =============================================================================

interface MetricRowProps {
	title: string;
	description: string;
	result: CashbackBreakevenResult;
	metric: CashbackChartMetric;
	getValue: (opt: CashbackOptionResult) => number;
}

function MetricRow({
	title,
	description,
	result,
	metric,
	getValue,
}: MetricRowProps) {
	// Find the winner and runner-up for "Why?" explanation
	const sortedOptions = [...result.options].sort(
		(a, b) => getValue(a) - getValue(b),
	);
	const winner = sortedOptions[0];
	const runnerUp = sortedOptions[1];
	const diff = getValue(runnerUp) - getValue(winner);

	return (
		<div className="p-3 rounded-lg bg-background border">
			<div className="flex items-start justify-between">
				<div>
					<p className="text-sm font-medium">{title}</p>
					<p className="text-xs text-muted-foreground mt-0.5">{description}</p>
				</div>
				<div className="text-right ml-4">
					<p className="text-sm font-medium text-green-600">
						{formatCurrency(getValue(winner))}
					</p>
					<p className="text-xs text-muted-foreground">{winner.label}</p>
				</div>
			</div>
			<details className="mt-2 group">
				<summary className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1 hover:text-foreground">
					<ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
					Why these values?
				</summary>
				<div className="mt-2 text-xs text-muted-foreground space-y-1 pl-4 border-l-2 border-muted">
					<MetricExplanation
						metric={metric}
						winner={winner}
						runnerUp={runnerUp}
						diff={diff}
						comparisonPeriodYears={result.comparisonPeriodYears}
					/>
				</div>
				<div className="mt-3">
					<CashbackComparisonChart
						yearlyData={result.yearlyBreakdown}
						options={result.options}
						projectionYear={result.projectionYear}
						metric={metric}
					/>
					{result.yearlyBreakdown.length > 0 && (
						<div className="overflow-x-auto mt-3">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b">
										<th className="text-left py-2 pr-3">Option</th>
										{result.yearlyBreakdown.map((y) => (
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
												{result.yearlyBreakdown.map((yearData) => {
													const values = yearData[metric];
													const minAtYear = Math.min(...values);
													const isBestAtYear = values[index] === minAtYear;
													return (
														<td
															key={yearData.year}
															className={`text-right py-2 px-3 ${isBestAtYear ? "text-green-600 font-medium" : ""}`}
														>
															{formatCurrency(values[index])}
														</td>
													);
												})}
												{result.projectionYear && (
													<td className="text-right py-2 pl-3 text-muted-foreground border-l">
														{formatCurrency(
															result.projectionYear[metric][index],
														)}
													</td>
												)}
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
					<p className="text-xs text-muted-foreground mt-2">
						<MetricCaption
							metric={metric}
							hasProjection={result.projectionYear !== null}
						/>
					</p>
				</div>
			</details>
		</div>
	);
}

function MetricCaption({
	metric,
	hasProjection,
}: {
	metric: CashbackChartMetric;
	hasProjection: boolean;
}) {
	const projectionNote = hasProjection
		? " *Projection beyond comparison period for reference only."
		: "";

	switch (metric) {
		case "balances":
			return hasProjection ? projectionNote.trim() : null;
		case "netCosts":
			return <>Net cost = interest − cashback.{projectionNote}</>;
		case "adjustedBalances":
			return (
				<>
					Adjusted balance = balance if cashback applied to principal at start.
					{projectionNote}
				</>
			);
	}
}

// =============================================================================
// MetricExplanation Component
// =============================================================================

interface MetricExplanationProps {
	metric: CashbackChartMetric;
	winner: CashbackOptionResult;
	runnerUp: CashbackOptionResult;
	diff: number;
	comparisonPeriodYears: number;
}

function MetricExplanation({
	metric,
	winner,
	runnerUp,
	diff,
	comparisonPeriodYears,
}: MetricExplanationProps) {
	const periodLabel = `${comparisonPeriodYears} year${comparisonPeriodYears !== 1 ? "s" : ""}`;

	switch (metric) {
		case "balances":
			return (
				<>
					<p>By the end of the {periodLabel} comparison period:</p>
					<p>
						• <strong className="text-foreground">{winner.label}</strong> will
						have {formatCurrency(winner.balanceAtEnd)} remaining
					</p>
					<p>
						• <strong className="text-foreground">{runnerUp.label}</strong> will
						have {formatCurrency(runnerUp.balanceAtEnd)} remaining
					</p>
					<p className="pt-1">
						The {formatCurrency(diff)} difference comes from different principal
						payments due to different rates. A{" "}
						{winner.rate < runnerUp.rate ? "lower" : "higher"} rate means{" "}
						{winner.rate < runnerUp.rate ? "more" : "less"} principal paid each
						month.
					</p>
				</>
			);
		case "netCosts":
			return (
				<>
					<p>
						<strong>Net cost</strong> = Interest paid − Cashback received
					</p>
					<p className="pt-1">
						• <strong className="text-foreground">{winner.label}</strong>:{" "}
						{formatCurrency(winner.interestPaid)} interest −{" "}
						{formatCurrency(winner.cashbackAmount)} cashback ={" "}
						<strong className="text-green-600">
							{formatCurrency(winner.netCost)}
						</strong>
					</p>
					<p>
						• <strong className="text-foreground">{runnerUp.label}</strong>:{" "}
						{formatCurrency(runnerUp.interestPaid)} interest −{" "}
						{formatCurrency(runnerUp.cashbackAmount)} cashback ={" "}
						{formatCurrency(runnerUp.netCost)}
					</p>
					<p className="pt-1">
						<strong className="text-foreground">{winner.label}</strong> saves{" "}
						<strong className="text-green-600">{formatCurrency(diff)}</strong>{" "}
						in net cost over {periodLabel}.
					</p>
				</>
			);
		case "adjustedBalances":
			return (
				<>
					<p>
						<strong>Adjusted balance</strong> = Balance if cashback was applied
						to principal at start
					</p>
					<p className="text-muted-foreground">
						(Shows your effective debt if you use cashback to reduce your
						mortgage immediately)
					</p>
					<p className="pt-1">
						• <strong className="text-foreground">{winner.label}</strong>:{" "}
						{formatCurrency(winner.cashbackAmount)} cashback applied at start →{" "}
						<strong className="text-green-600">
							{formatCurrency(winner.adjustedBalance)}
						</strong>{" "}
						remaining
					</p>
					<p>
						• <strong className="text-foreground">{runnerUp.label}</strong>:{" "}
						{formatCurrency(runnerUp.cashbackAmount)} cashback applied at start
						→ {formatCurrency(runnerUp.adjustedBalance)} remaining
					</p>
					<p className="pt-1">
						<strong className="text-foreground">{winner.label}</strong> has{" "}
						<strong className="text-green-600">{formatCurrency(diff)}</strong>{" "}
						lower adjusted balance.
					</p>
				</>
			);
	}
}
