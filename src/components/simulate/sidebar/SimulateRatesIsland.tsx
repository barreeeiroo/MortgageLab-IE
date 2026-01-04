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
import { $customRates } from "@/lib/stores/custom-rates";
import { $lenders } from "@/lib/stores/lenders";
import { $overpaymentPolicies } from "@/lib/stores/overpayment-policies";
import { $rates } from "@/lib/stores/rates";
import {
	$coveredMonths,
	$hasRequiredData,
	$simulationState,
	$totalMonths,
	addRatePeriod,
	removeRatePeriod,
	updateRatePeriod,
} from "@/lib/stores/simulate";
import {
	$resolvedRatePeriods,
	$simulationWarnings,
} from "@/lib/stores/simulate/simulate-calculations";
import { formatTransitionDate } from "@/lib/utils/date";
import { SimulateAddRatePeriodDialog } from "./SimulateAddRatePeriodDialog";
import { SimulateRatePeriodEvent } from "./SimulateEventCard";

export function SimulateRatesIsland() {
	const simulationState = useStore($simulationState);
	const hasRequiredData = useStore($hasRequiredData);
	const totalMonths = useStore($totalMonths);
	const coveredMonths = useStore($coveredMonths);
	const resolvedRatePeriods = useStore($resolvedRatePeriods);
	const warnings = useStore($simulationWarnings);
	const rates = useStore($rates);
	const customRates = useStore($customRates);
	const lenders = useStore($lenders);
	const overpaymentPolicies = useStore($overpaymentPolicies);

	// Check if mortgage duration is fully covered by rate periods
	// coveredMonths is -1 when last period is "until end", or a number when explicit
	const isFullyCovered = coveredMonths === -1 || coveredMonths >= totalMonths;

	const [showAddRatePeriod, setShowAddRatePeriod] = useState(false);
	const [editingRatePeriod, setEditingRatePeriod] = useState<
		(typeof simulationState.ratePeriods)[0] | null
	>(null);
	const [editingIsLastPeriod, setEditingIsLastPeriod] = useState(false);
	const [deletingRatePeriod, setDeletingRatePeriod] = useState<string | null>(
		null,
	);

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
							onClick={() => setShowAddRatePeriod(true)}
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
										onEdit={() => {
											setEditingRatePeriod(originalPeriod);
											setEditingIsLastPeriod(isLastPeriod);
										}}
										onDelete={
											canDelete
												? () => setDeletingRatePeriod(period.id)
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
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}
			</CardContent>

			{/* Add Rate Period Dialog */}
			<SimulateAddRatePeriodDialog
				open={showAddRatePeriod}
				onOpenChange={setShowAddRatePeriod}
				onAdd={addRatePeriod}
				rates={rates}
				customRates={customRates}
				lenders={lenders}
				totalMonths={totalMonths}
				mortgageAmount={simulationState.input.mortgageAmount}
				propertyValue={simulationState.input.propertyValue}
				startDate={simulationState.input.startDate}
				periodStartMonth={
					resolvedRatePeriods.length > 0
						? resolvedRatePeriods[resolvedRatePeriods.length - 1].startMonth +
							resolvedRatePeriods[resolvedRatePeriods.length - 1].durationMonths
						: 1
				}
			/>

			{/* Edit Rate Period Dialog */}
			{editingRatePeriod && (
				<SimulateAddRatePeriodDialog
					open={!!editingRatePeriod}
					onOpenChange={(open) => !open && setEditingRatePeriod(null)}
					onAdd={(period) => {
						updateRatePeriod(editingRatePeriod.id, period);
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
