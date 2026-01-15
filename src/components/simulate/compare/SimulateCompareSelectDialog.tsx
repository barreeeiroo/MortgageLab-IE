import { useStore } from "@nanostores/react";
import { GitCompareArrows } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	addSavedToCompare,
	clearCompare,
	navigateToCompare,
	setCurrentInCompare,
} from "@/lib/stores/simulate/simulate-compare";
import { $savedSimulations } from "@/lib/stores/simulate/simulate-saves";
import { $simulationState } from "@/lib/stores/simulate/simulate-state";
import { formatCurrency } from "@/lib/utils/currency";
import { formatTermDisplay } from "@/lib/utils/term";

interface SimulateCompareSelectDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	showCurrentSimulation: boolean;
}

export function SimulateCompareSelectDialog({
	open,
	onOpenChange,
	showCurrentSimulation,
}: SimulateCompareSelectDialogProps) {
	const savedSimulations = useStore($savedSimulations);
	const currentState = useStore($simulationState);

	// Local selection state (reset when dialog opens)
	const [selectedSaveIds, setSelectedSaveIds] = useState<Set<string>>(
		new Set(),
	);
	const [includeCurrentView, setIncludeCurrentView] = useState(false);

	// Reset selection when dialog opens
	useEffect(() => {
		if (open) {
			setSelectedSaveIds(new Set());
			setIncludeCurrentView(false);
		}
	}, [open]);

	const selectionCount = selectedSaveIds.size + (includeCurrentView ? 1 : 0);
	const canAddMore = selectionCount < 5;
	const canCompare = selectionCount >= 2;

	const handleToggleSave = (id: string) => {
		setSelectedSaveIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else if (canAddMore) {
				next.add(id);
			}
			return next;
		});
	};

	const handleToggleCurrent = () => {
		if (includeCurrentView) {
			setIncludeCurrentView(false);
		} else if (canAddMore) {
			setIncludeCurrentView(true);
		}
	};

	const handleCompare = () => {
		// Update the global compare state
		clearCompare();

		// Add selected saves
		for (const id of selectedSaveIds) {
			addSavedToCompare(id);
		}

		// Add current if selected
		if (includeCurrentView) {
			setCurrentInCompare(true);
		}

		// Close dialog and navigate
		onOpenChange(false);
		navigateToCompare();
	};

	const formatDate = (isoDate: string) => {
		const date = new Date(isoDate);
		return date.toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Select Simulations to Compare</DialogTitle>
					<DialogDescription>
						Select 2-5 simulations to compare side by side.
					</DialogDescription>
				</DialogHeader>

				<div className="py-4">
					<div className="rounded-md border max-h-80 overflow-y-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-[180px]">Name</TableHead>
									<TableHead className="text-right">Amount</TableHead>
									<TableHead className="text-right">Term</TableHead>
									<TableHead className="text-right">Rates</TableHead>
									<TableHead className="text-right">Overpay</TableHead>
									<TableHead className="text-right">Modified</TableHead>
									<TableHead className="w-10" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{/* Current simulation option */}
								{showCurrentSimulation && (
									<TableRow
										className="cursor-pointer hover:bg-muted/50"
										onClick={handleToggleCurrent}
									>
										<TableCell>
											<div className="flex items-center gap-2">
												<span className="font-medium italic truncate max-w-[140px]">
													Unnamed Simulation
												</span>
												<span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">
													Current
												</span>
											</div>
										</TableCell>
										<TableCell className="text-right">
											{formatCurrency(currentState.input.mortgageAmount / 100)}
										</TableCell>
										<TableCell className="text-right">
											{formatTermDisplay(currentState.input.mortgageTermMonths)}
										</TableCell>
										<TableCell className="text-right">
											{currentState.ratePeriods.length}
										</TableCell>
										<TableCell className="text-right">
											{currentState.overpaymentConfigs.length}
										</TableCell>
										<TableCell className="text-right text-muted-foreground">
											—
										</TableCell>
										<TableCell>
											<Checkbox
												checked={includeCurrentView}
												onCheckedChange={handleToggleCurrent}
												disabled={!includeCurrentView && !canAddMore}
												onClick={(e) => e.stopPropagation()}
											/>
										</TableCell>
									</TableRow>
								)}

								{/* Saved simulations */}
								{savedSimulations.map((save) => (
									<TableRow
										key={save.id}
										className="cursor-pointer hover:bg-muted/50"
										onClick={() => handleToggleSave(save.id)}
									>
										<TableCell>
											<span className="font-medium truncate max-w-[180px] block">
												{save.name}
											</span>
										</TableCell>
										<TableCell className="text-right">
											{formatCurrency(save.state.input.mortgageAmount / 100)}
										</TableCell>
										<TableCell className="text-right">
											{formatTermDisplay(save.state.input.mortgageTermMonths)}
										</TableCell>
										<TableCell className="text-right">
											{save.state.ratePeriods.length}
										</TableCell>
										<TableCell className="text-right">
											{save.state.overpaymentConfigs.length}
										</TableCell>
										<TableCell className="text-right text-muted-foreground">
											{formatDate(save.lastUpdatedAt)}
										</TableCell>
										<TableCell>
											<Checkbox
												checked={selectedSaveIds.has(save.id)}
												onCheckedChange={() => handleToggleSave(save.id)}
												disabled={!selectedSaveIds.has(save.id) && !canAddMore}
												onClick={(e) => e.stopPropagation()}
											/>
										</TableCell>
									</TableRow>
								))}

								{/* Empty state */}
								{savedSimulations.length === 0 && !showCurrentSimulation && (
									<TableRow>
										<TableCell
											colSpan={7}
											className="text-center py-8 text-muted-foreground"
										>
											No simulations available to compare.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>

					{/* Selection count */}
					<div className="mt-3 text-sm text-muted-foreground text-center">
						Selected: {selectionCount} of 5
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={handleCompare}
						disabled={!canCompare}
						className="gap-1.5"
					>
						<GitCompareArrows className="h-4 w-4" />
						Compare ({selectionCount})
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
