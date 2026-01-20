import { AlertCircle, Trophy } from "lucide-react";
import type { CashbackBreakevenResult } from "@/lib/mortgage/breakeven";
import { formatBreakevenPeriod } from "@/lib/mortgage/breakeven";
import type { OverpaymentAllowanceInfo } from "@/lib/stores/breakeven";
import { formatCurrency } from "@/lib/utils/currency";
import { Card, CardContent } from "../../ui/card";
import { CashbackComparisonChart } from "./chart/CashbackComparisonChart";

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
