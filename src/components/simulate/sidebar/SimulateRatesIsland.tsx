import { useStore } from "@nanostores/react";
import { ArrowDown, Plus } from "lucide-react";
import { useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { saveRatesForm } from "@/lib/storage";
import { $customRates } from "@/lib/stores/custom-rates";
import { $lenders } from "@/lib/stores/lenders";
import { $overpaymentPolicies } from "@/lib/stores/overpayment-policies";
import { $rates } from "@/lib/stores/rates";
import {
	$coveredMonths,
	$hasRequiredData,
	$simulationState,
	$totalMonths,
	getAffectedOverpaymentsByDurationChange,
	removeRatePeriod,
	updateRatePeriod,
	updateRatePeriodWithOverpaymentAdjustments,
} from "@/lib/stores/simulate";
import {
	$amortizationSchedule,
	$bufferSuggestions,
	$resolvedRatePeriods,
	$simulationWarnings,
} from "@/lib/stores/simulate/simulate-calculations";
import { formatTransitionDate } from "@/lib/utils/date";
import { getPath } from "@/lib/utils/path";
import { SimulateBufferSuggestion } from "./SimulateBufferSuggestion";
import { SimulateEditRatePeriodDialog } from "./SimulateEditRatePeriodDialog";
import { SimulateRatePeriodEvent } from "./SimulateEventCard";

export function SimulateRatesIsland() {
	const simulationState = useStore($simulationState);
	const hasRequiredData = useStore($hasRequiredData);
	const totalMonths = useStore($totalMonths);
	const coveredMonths = useStore($coveredMonths);
	const resolvedRatePeriods = useStore($resolvedRatePeriods);
	const amortizationSchedule = useStore($amortizationSchedule);
	const warnings = useStore($simulationWarnings);
	const bufferSuggestions = useStore($bufferSuggestions);
	const rates = useStore($rates);
	const customRates = useStore($customRates);
	const lenders = useStore($lenders);
	const overpaymentPolicies = useStore($overpaymentPolicies);

	// Check if mortgage duration is fully covered by rate periods
	// coveredMonths is -1 when last period is "until end", or a number when explicit
	const isFullyCovered = coveredMonths === -1 || coveredMonths >= totalMonths;

	const [editingRatePeriod, setEditingRatePeriod] = useState<
		(typeof simulationState.ratePeriods)[0] | null
	>(null);
	const [editingIsLastPeriod, setEditingIsLastPeriod] = useState(false);
	const [deletingRatePeriod, setDeletingRatePeriod] = useState<string | null>(
		null,
	);

	// Navigate to Rates page for adding a new rate period
	const handleAddRate = () => {
		const { input, ratePeriods } = simulationState;

		// Get the last covered month from the amortization schedule
		const lastCoveredMonth = amortizationSchedule.length;

		// Get the remaining balance and monthly payment from the last month
		const lastMonth = amortizationSchedule[amortizationSchedule.length - 1];
		const remainingBalance = lastMonth?.closingBalance ?? input.mortgageAmount;
		const lastMonthlyPayment = lastMonth?.scheduledPayment ?? 0;

		// Get the current lender from the last rate period
		const lastRatePeriod = ratePeriods[ratePeriods.length - 1];
		const currentLender = lastRatePeriod?.lenderId ?? "";

		// Calculate remaining term (from the last covered month to end of mortgage)
		const remainingMonths = Math.max(
			0,
			input.mortgageTermMonths - lastCoveredMonth,
		);

		// Convert cents to euros for the rates form
		const propertyValue = Math.round(input.propertyValue / 100);
		// Use remaining balance as the "mortgage amount" for rate comparison
		const mortgageAmount = Math.round(remainingBalance / 100);
		// Monthly repayment in euros (from cents)
		const monthlyRepayment = Math.round(lastMonthlyPayment / 100);

		// Save form values to localStorage so Rates page can load them
		saveRatesForm({
			mode: "remortgage",
			propertyValue: propertyValue.toString(),
			mortgageAmount: mortgageAmount.toString(),
			monthlyRepayment: monthlyRepayment.toString(),
			mortgageTerm: remainingMonths.toString(),
			berRating: input.ber,
			buyerType: "switcher-pdh",
			currentLender,
		});

		// Navigate to Rates page with indicator that we're adding to simulation
		window.location.href = `${getPath("/rates")}?from=simulate-add#remortgage`;
	};

	if (!hasRequiredData) {
		return null;
	}

	const { ratePeriods } = simulationState;

	// Stack-based model: periods are already in order, no sorting needed
	// resolvedRatePeriods has computed startMonth for each period

	return (
		<Card className="py-0 gap-0">
			<CardHeader className="py-3 px-4">
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm font-medium">Rate Periods</CardTitle>
					{isFullyCovered ? (
						<Tooltip>
							<TooltipTrigger asChild>
								<span>
									<Button
										variant="ghost"
										size="sm"
										className="h-6 gap-1 text-xs px-2"
										disabled
									>
										<Plus className="h-3 w-3" />
										Add
									</Button>
								</span>
							</TooltipTrigger>
							<TooltipContent>
								<p>Mortgage duration is fully covered</p>
							</TooltipContent>
						</Tooltip>
					) : (
						<Button
							variant="ghost"
							size="sm"
							className="h-6 gap-1 text-xs px-2"
							onClick={handleAddRate}
						>
							<Plus className="h-3 w-3" />
							Add
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent className="pt-0 px-3 pb-3">
				{resolvedRatePeriods.length === 0 ? (
					<p className="text-sm text-muted-foreground text-center py-4">
						No rate periods defined.
					</p>
				) : (
					<div className="space-y-1">
						{resolvedRatePeriods.map((period, index) => {
							const originalPeriod = ratePeriods.find(
								(p) => p.id === period.id,
							);
							if (!originalPeriod) return null;
							const periodWarnings = warnings.filter(
								(w) =>
									w.month >= period.startMonth &&
									(period.durationMonths === 0 ||
										w.month < period.startMonth + period.durationMonths),
							);

							// Find the overpayment policy for this period
							const overpaymentPolicy = period.overpaymentPolicyId
								? overpaymentPolicies.find(
										(p) => p.id === period.overpaymentPolicyId,
									)
								: undefined;

							// Stack-based: only allow deleting the last rate period
							const isLastPeriod = index === resolvedRatePeriods.length - 1;
							const canDelete = ratePeriods.length > 1 && isLastPeriod;

							// Allow trimming variable rate with "until end"
							const canTrim =
								isLastPeriod &&
								period.type === "variable" &&
								period.durationMonths === 0;

							// Allow extending variable rate with defined duration to "until end"
							const canExtend =
								isLastPeriod &&
								period.type === "variable" &&
								period.durationMonths > 0;

							// Calculate transition month for next period
							const nextPeriodStartMonth =
								period.durationMonths === 0
									? null
									: period.startMonth + period.durationMonths;
							const showTransition =
								!isLastPeriod &&
								nextPeriodStartMonth !== null &&
								period.durationMonths > 0;

							return (
								<div key={period.id}>
									<SimulateRatePeriodEvent
										period={period}
										warnings={periodWarnings}
										overpaymentPolicy={overpaymentPolicy}
										propertyValue={simulationState.input.propertyValue}
										amortizationSchedule={amortizationSchedule}
										isFirstRate={index === 0}
										onEdit={() => {
											setEditingRatePeriod(originalPeriod);
											setEditingIsLastPeriod(isLastPeriod);
										}}
										onDelete={
											canDelete
												? () => setDeletingRatePeriod(period.id)
												: undefined
										}
										onTrim={
											canTrim
												? (durationMonths: number) =>
														updateRatePeriod(period.id, { durationMonths })
												: undefined
										}
										onExtend={
											canExtend
												? () =>
														updateRatePeriod(period.id, { durationMonths: 0 })
												: undefined
										}
									/>
									{showTransition && nextPeriodStartMonth && (
										<div className="flex items-center gap-2 py-1.5 px-2">
											<ArrowDown className="h-3 w-3 text-muted-foreground" />
											<span className="text-xs text-muted-foreground">
												{formatTransitionDate(
													simulationState.input.startDate,
													nextPeriodStartMonth,
												)}
											</span>
											{/* Buffer suggestion warning */}
											{(() => {
												const suggestion = bufferSuggestions.find(
													(s) => s.afterIndex === index && !s.isTrailing,
												);
												return suggestion ? (
													<SimulateBufferSuggestion suggestion={suggestion} />
												) : null;
											})()}
										</div>
									)}
								</div>
							);
						})}
						{/* Trailing buffer suggestion for uncovered fixed periods */}
						{(() => {
							const trailingSuggestion = bufferSuggestions.find(
								(s) => s.isTrailing,
							);
							if (!trailingSuggestion) return null;

							const lastPeriod =
								resolvedRatePeriods[resolvedRatePeriods.length - 1];
							const nextMonth =
								lastPeriod.startMonth + lastPeriod.durationMonths;

							return (
								<div className="flex items-center gap-2 py-1.5 px-2">
									<ArrowDown className="h-3 w-3 text-muted-foreground" />
									<span className="text-xs text-muted-foreground">
										{formatTransitionDate(
											simulationState.input.startDate,
											nextMonth,
										)}
									</span>
									<SimulateBufferSuggestion suggestion={trailingSuggestion} />
								</div>
							);
						})()}
					</div>
				)}
			</CardContent>

			{/* Edit Rate Period Dialog */}
			{editingRatePeriod && (
				<SimulateEditRatePeriodDialog
					open={!!editingRatePeriod}
					onOpenChange={(open) => !open && setEditingRatePeriod(null)}
					onSave={(period) => {
						// Check if duration is being shortened and overpayments are affected
						const { ratePeriods, overpaymentConfigs } = simulationState;
						const affectedOverpayments =
							getAffectedOverpaymentsByDurationChange(
								ratePeriods,
								editingRatePeriod.id,
								period.durationMonths,
								totalMonths,
								overpaymentConfigs,
							);

						const hasAffectedOverpayments =
							affectedOverpayments.toDelete.length > 0 ||
							affectedOverpayments.toAdjust.length > 0;

						if (hasAffectedOverpayments) {
							// Use the special update function that handles overpayment adjustments
							const newEndMonth =
								period.durationMonths === 0
									? totalMonths
									: (resolvedRatePeriods.find(
											(p) => p.id === editingRatePeriod.id,
										)?.startMonth ?? 1) +
										period.durationMonths -
										1;

							updateRatePeriodWithOverpaymentAdjustments(
								editingRatePeriod.id,
								period,
								{
									toDelete: affectedOverpayments.toDelete.map((o) => o.id),
									toAdjust: affectedOverpayments.toAdjust.map((o) => ({
										id: o.id,
										newEndMonth,
									})),
								},
							);
						} else {
							updateRatePeriod(editingRatePeriod.id, period);
						}
						setEditingRatePeriod(null);
					}}
					rates={rates}
					customRates={customRates}
					lenders={lenders}
					totalMonths={totalMonths}
					mortgageAmount={simulationState.input.mortgageAmount}
					propertyValue={simulationState.input.propertyValue}
					editingPeriod={editingRatePeriod}
					isLastPeriod={editingIsLastPeriod}
					startDate={simulationState.input.startDate}
					periodStartMonth={
						resolvedRatePeriods.find((p) => p.id === editingRatePeriod.id)
							?.startMonth ?? 1
					}
					ratePeriods={simulationState.ratePeriods}
					overpaymentConfigs={simulationState.overpaymentConfigs}
				/>
			)}

			{/* Delete Rate Period Confirmation */}
			<AlertDialog
				open={!!deletingRatePeriod}
				onOpenChange={(open) => !open && setDeletingRatePeriod(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Rate Period?</AlertDialogTitle>
						<AlertDialogDescription>
							This will remove this rate period from your simulation. This
							action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={() => {
								if (deletingRatePeriod) {
									removeRatePeriod(deletingRatePeriod);
									setDeletingRatePeriod(null);
								}
							}}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Card>
	);
}
