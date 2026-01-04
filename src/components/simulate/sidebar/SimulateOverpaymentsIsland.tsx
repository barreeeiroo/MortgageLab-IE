import { useStore } from "@nanostores/react";
import { Plus, Trash2 } from "lucide-react";
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
import { $overpaymentPolicies } from "@/lib/stores/overpayment-policies";
import {
	$hasRequiredData,
	$simulationState,
	$totalMonths,
	addOverpaymentConfig,
	clearOverpaymentConfigs,
	removeOverpaymentConfig,
	updateOverpaymentConfig,
} from "@/lib/stores/simulate";
import {
	$resolvedRatePeriods,
	$simulationWarnings,
} from "@/lib/stores/simulate/simulate-calculations";
import { SimulateAddOverpaymentDialog } from "./SimulateAddOverpaymentDialog";
import { SimulateOverpaymentEvent } from "./SimulateEventCard";

export function SimulateOverpaymentsIsland() {
	const simulationState = useStore($simulationState);
	const hasRequiredData = useStore($hasRequiredData);
	const totalMonths = useStore($totalMonths);
	const warnings = useStore($simulationWarnings);
	const resolvedRatePeriods = useStore($resolvedRatePeriods);
	const overpaymentPolicies = useStore($overpaymentPolicies);

	const [showAddOverpayment, setShowAddOverpayment] = useState(false);
	const [editingOverpayment, setEditingOverpayment] = useState<
		(typeof simulationState.overpaymentConfigs)[0] | null
	>(null);
	const [deletingOverpayment, setDeletingOverpayment] = useState<string | null>(
		null,
	);
	const [showDeleteAll, setShowDeleteAll] = useState(false);

	if (!hasRequiredData) {
		return null;
	}

	const { overpaymentConfigs } = simulationState;

	// Sort overpayment configs by start month
	const sortedOverpayments = [...overpaymentConfigs].sort(
		(a, b) => a.startMonth - b.startMonth,
	);

	return (
		<Card className="py-0 gap-0">
			<CardHeader className="py-3 px-4">
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm font-medium">Overpayments</CardTitle>
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
				{sortedOverpayments.length === 0 ? (
					<p className="text-sm text-muted-foreground text-center py-4">
						No overpayments configured.
					</p>
				) : (
					<div className="space-y-2">
						{sortedOverpayments.map((config) => {
							const configWarnings = warnings.filter(
								(w) =>
									w.type === "allowance_exceeded" &&
									w.month >= config.startMonth &&
									(!config.endMonth || w.month <= config.endMonth),
							);

							return (
								<SimulateOverpaymentEvent
									key={config.id}
									config={config}
									warnings={configWarnings}
									onEdit={() => setEditingOverpayment(config)}
									onDelete={() => setDeletingOverpayment(config.id)}
								/>
							);
						})}
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
			/>

			{/* Edit Overpayment Dialog */}
			{editingOverpayment && (
				<SimulateAddOverpaymentDialog
					open={!!editingOverpayment}
					onOpenChange={(open) => !open && setEditingOverpayment(null)}
					onAdd={(config) => {
						updateOverpaymentConfig(editingOverpayment.id, config);
						setEditingOverpayment(null);
					}}
					totalMonths={totalMonths}
					mortgageAmount={simulationState.input.mortgageAmount}
					resolvedRatePeriods={resolvedRatePeriods}
					overpaymentPolicies={overpaymentPolicies}
					editingConfig={editingOverpayment}
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
