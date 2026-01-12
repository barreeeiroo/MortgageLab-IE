import { useStore } from "@nanostores/react";
import { PiggyBank, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
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
import { $overpaymentPolicies } from "@/lib/stores/overpayment-policies";
import {
	$constructionEndMonth,
	$resolvedRatePeriods,
	$simulationWarnings,
} from "@/lib/stores/simulate/simulate-calculations";
import {
	$hasRequiredData,
	$simulationState,
	$totalMonths,
	addOverpaymentConfig,
	clearOverpaymentConfigs,
	removeOverpaymentConfig,
	toggleOverpaymentEnabled,
	updateOverpaymentConfig,
} from "@/lib/stores/simulate/simulate-state";
import { formatTransitionDate } from "@/lib/utils/date";
import { SimulateAddOverpaymentDialog } from "./SimulateAddOverpaymentDialog";
import { SimulateEditOverpaymentDialog } from "./SimulateEditOverpaymentDialog";
import { SimulateOverpaymentEvent } from "./SimulateEventCard";

export function SimulateOverpaymentsIsland() {
	const simulationState = useStore($simulationState);
	const hasRequiredData = useStore($hasRequiredData);
	const totalMonths = useStore($totalMonths);
	const warnings = useStore($simulationWarnings);
	const resolvedRatePeriods = useStore($resolvedRatePeriods);
	const overpaymentPolicies = useStore($overpaymentPolicies);
	const constructionEndMonth = useStore($constructionEndMonth);

	const [showAddOverpayment, setShowAddOverpayment] = useState(false);
	const [editingOverpayment, setEditingOverpayment] = useState<
		(typeof simulationState.overpaymentConfigs)[0] | null
	>(null);
	const [deletingOverpayment, setDeletingOverpayment] = useState<string | null>(
		null,
	);
	const [showDeleteAll, setShowDeleteAll] = useState(false);

	const { overpaymentConfigs, input } = simulationState;

	// Group overpayments by ratePeriodId, sorted by rate period start month
	const groupedOverpayments = useMemo(() => {
		// Group by ratePeriodId
		const groups = new Map<string, (typeof overpaymentConfigs)[number][]>();

		for (const config of overpaymentConfigs) {
			const existing = groups.get(config.ratePeriodId) || [];
			existing.push(config);
			groups.set(config.ratePeriodId, existing);
		}

		// Create sorted groups with period info
		const sortedGroups: Array<{
			periodId: string;
			period: (typeof resolvedRatePeriods)[number] | undefined;
			overpayments: (typeof overpaymentConfigs)[number][];
		}> = [];

		for (const [periodId, overpayments] of groups) {
			const period = resolvedRatePeriods.find((p) => p.id === periodId);
			sortedGroups.push({
				periodId,
				period,
				overpayments: overpayments.sort((a, b) => a.startMonth - b.startMonth),
			});
		}

		// Sort by period start month
		return sortedGroups.sort((a, b) => {
			const aStart = a.period?.startMonth ?? 0;
			const bStart = b.period?.startMonth ?? 0;
			return aStart - bStart;
		});
	}, [overpaymentConfigs, resolvedRatePeriods]);

	// Format group header text
	const formatGroupHeader = (
		period: (typeof resolvedRatePeriods)[number] | undefined,
	): string => {
		if (!period) return "Unknown period";

		// Use label if available, otherwise rate name
		const displayName = period.label || period.rateName;

		// Always include date info (short format to avoid double parentheses)
		const dateStr = formatTransitionDate(input.startDate, period.startMonth, {
			short: true,
		});
		return `${displayName} (${dateStr})`;
	};

	if (!hasRequiredData) {
		return null;
	}

	return (
		<Card className="py-0 gap-0">
			<CardHeader className="py-3 px-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<PiggyBank className="h-4 w-4 text-muted-foreground" />
						<CardTitle className="text-sm font-medium">Overpayments</CardTitle>
					</div>
					<div className="flex gap-1">
						{overpaymentConfigs.length > 0 && (
							<Button
								variant="ghost"
								size="sm"
								className="h-6 text-xs px-2 text-muted-foreground hover:text-destructive"
								onClick={() => setShowDeleteAll(true)}
							>
								<Trash2 className="h-3 w-3" />
							</Button>
						)}
						<Button
							variant="ghost"
							size="sm"
							className="h-6 gap-1 text-xs px-2"
							onClick={() => setShowAddOverpayment(true)}
						>
							<Plus className="h-3 w-3" />
							Add
						</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent className="pt-0 px-3 pb-3">
				{groupedOverpayments.length === 0 ? (
					<p className="text-sm text-muted-foreground text-center py-4">
						No overpayments configured.
					</p>
				) : (
					<div className="space-y-4">
						{groupedOverpayments.map(({ periodId, period, overpayments }) => (
							<div key={periodId} className="space-y-2">
								{/* Group header - ghost text */}
								<div className="text-xs text-muted-foreground px-1">
									{formatGroupHeader(period)}
								</div>
								{/* Overpayments in this group */}
								{overpayments.map((config) => {
									const configWarnings = warnings.filter(
										(w) =>
											w.type === "allowance_exceeded" &&
											w.configId === config.id,
									);

									return (
										<SimulateOverpaymentEvent
											key={config.id}
											config={config}
											warnings={configWarnings}
											onEdit={() => setEditingOverpayment(config)}
											onDelete={() => setDeletingOverpayment(config.id)}
											onToggleEnabled={() =>
												toggleOverpaymentEnabled(config.id)
											}
										/>
									);
								})}
							</div>
						))}
					</div>
				)}
			</CardContent>

			{/* Add Overpayment Dialog */}
			<SimulateAddOverpaymentDialog
				open={showAddOverpayment}
				onOpenChange={setShowAddOverpayment}
				onAdd={addOverpaymentConfig}
				totalMonths={totalMonths}
				mortgageAmount={simulationState.input.mortgageAmount}
				resolvedRatePeriods={resolvedRatePeriods}
				overpaymentPolicies={overpaymentPolicies}
				existingConfigs={overpaymentConfigs}
				startDate={simulationState.input.startDate}
				constructionEndMonth={
					constructionEndMonth > 0 ? constructionEndMonth : undefined
				}
			/>

			{/* Edit Overpayment Dialog */}
			{editingOverpayment && (
				<SimulateEditOverpaymentDialog
					open={!!editingOverpayment}
					onOpenChange={(open) => !open && setEditingOverpayment(null)}
					onSave={(config) => {
						updateOverpaymentConfig(editingOverpayment.id, config);
						setEditingOverpayment(null);
					}}
					editingConfig={editingOverpayment}
					totalMonths={totalMonths}
					resolvedRatePeriods={resolvedRatePeriods}
					startDate={simulationState.input.startDate}
				/>
			)}

			{/* Delete Overpayment Confirmation */}
			<AlertDialog
				open={!!deletingOverpayment}
				onOpenChange={(open) => !open && setDeletingOverpayment(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Overpayment?</AlertDialogTitle>
						<AlertDialogDescription>
							This will remove this overpayment configuration from your
							simulation. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={() => {
								if (deletingOverpayment) {
									removeOverpaymentConfig(deletingOverpayment);
									setDeletingOverpayment(null);
								}
							}}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Delete All Overpayments Confirmation */}
			<AlertDialog open={showDeleteAll} onOpenChange={setShowDeleteAll}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete All Overpayments?</AlertDialogTitle>
						<AlertDialogDescription>
							This will remove all {overpaymentConfigs.length} overpayment
							configurations from your simulation. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={() => {
								clearOverpaymentConfigs();
								setShowDeleteAll(false);
							}}
						>
							Delete All
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Card>
	);
}
