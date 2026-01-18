import { useStore } from "@nanostores/react";
import {
	ChevronDown,
	FolderOpen,
	GitCompareArrows,
	Pencil,
	Save,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SavedSimulation } from "@/lib/schemas/simulate";
import {
	$compareState,
	$hasValidComparison,
	addSavedToCompare,
	navigateToCompare,
	removeSavedFromCompare,
	toggleCurrentInCompare,
} from "@/lib/stores/simulate/simulate-compare";
import {
	$savedSimulations,
	deleteSave,
	loadSave,
	renameSave,
	saveSimulation,
} from "@/lib/stores/simulate/simulate-saves";
import { $simulationState } from "@/lib/stores/simulate/simulate-state";
import { formatShortDate } from "@/lib/utils/date";

export function SimulateSavesDropdown() {
	const simulationState = useStore($simulationState);
	const savedSimulations = useStore($savedSimulations);
	const compareState = useStore($compareState);
	const hasValidComparison = useStore($hasValidComparison);

	const [saveDialogOpen, setSaveDialogOpen] = useState(false);
	const [renameDialogOpen, setRenameDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [compareMode, setCompareMode] = useState(false);
	const [selectedSave, setSelectedSave] = useState<SavedSimulation | null>(
		null,
	);
	const [saveName, setSaveName] = useState("");

	const hasData =
		simulationState.input.mortgageAmount > 0 &&
		simulationState.ratePeriods.length > 0;

	const canSave = saveName.trim().length > 0;

	// Check if name matches an existing save (case-insensitive)
	const matchingSave = savedSimulations.find(
		(s) => s.name.toLowerCase() === saveName.trim().toLowerCase(),
	);

	// Calculate selection count for compare
	const selectionCount =
		compareState.savedIds.length + (compareState.includeCurrentView ? 1 : 0);
	const canAddMore = selectionCount < 5;

	const handleSaveNew = () => {
		setSaveName("");
		setSaveDialogOpen(true);
	};

	const handleSaveSubmit = () => {
		if (!canSave) return;
		const isOverwrite = !!matchingSave;
		const saved = saveSimulation(saveName.trim());
		toast.success(`${isOverwrite ? "Updated" : "Saved"} "${saved.name}"`);
		setSaveDialogOpen(false);
		setSaveName("");
	};

	const handleOverwrite = (save: SavedSimulation) => {
		// Immediately overwrite by using the existing save's name
		const updated = saveSimulation(save.name);
		toast.success(`Updated "${updated.name}"`);
		setSaveDialogOpen(false);
		setSaveName("");
	};

	const handleLoad = (save: SavedSimulation) => {
		const success = loadSave(save.id);
		if (success) {
			toast.success(`Loaded "${save.name}"`);
		}
	};

	const handleRenameClick = (save: SavedSimulation) => {
		setSelectedSave(save);
		setSaveName(save.name);
		setRenameDialogOpen(true);
	};

	const handleRenameSubmit = () => {
		if (!selectedSave || !saveName.trim()) {
			toast.error("Please enter a name");
			return;
		}
		const success = renameSave(selectedSave.id, saveName.trim());
		if (success) {
			toast.success(`Renamed to "${saveName.trim()}"`);
		} else {
			toast.error("A save with that name already exists");
		}
		setRenameDialogOpen(false);
		setSelectedSave(null);
		setSaveName("");
	};

	const handleDeleteClick = (save: SavedSimulation) => {
		setSelectedSave(save);
		setDeleteDialogOpen(true);
	};

	const handleDeleteConfirm = () => {
		if (!selectedSave) return;
		deleteSave(selectedSave.id);
		toast.success(`Deleted "${selectedSave.name}"`);
		setDeleteDialogOpen(false);
		setSelectedSave(null);
	};

	const handleToggleSaveForCompare = (saveId: string) => {
		if (compareState.savedIds.includes(saveId)) {
			removeSavedFromCompare(saveId);
		} else if (canAddMore) {
			addSavedToCompare(saveId);
		}
	};

	const handleToggleCurrentForCompare = () => {
		if (compareState.includeCurrentView || canAddMore) {
			toggleCurrentInCompare();
		}
	};

	const handleCompare = () => {
		navigateToCompare();
	};

	const formatDate = (isoDate: string) => formatShortDate(isoDate);

	return (
		<>
			{/* Load dropdown */}
			<DropdownMenu
				onOpenChange={(open) => {
					if (!open) setCompareMode(false);
				}}
			>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" size="sm" className="gap-1.5">
						<FolderOpen className="h-4 w-4" />
						Load
						<ChevronDown className="h-3 w-3 opacity-50" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-72">
					{savedSimulations.length > 0 ? (
						<>
							{/* Compare mode toggle */}
							<div className="px-2 py-1.5 flex items-center justify-between">
								<span className="text-sm font-medium">
									{compareMode
										? `Compare (${selectionCount}/5 selected)`
										: "Saved Simulations"}
								</span>
								<Button
									variant={compareMode ? "secondary" : "ghost"}
									size="sm"
									className="h-7 gap-1.5"
									onClick={() => setCompareMode(!compareMode)}
								>
									<GitCompareArrows className="h-3.5 w-3.5" />
									{compareMode ? "Done" : "Compare"}
								</Button>
							</div>
							<DropdownMenuSeparator />

							{/* Current simulation option (in compare mode) */}
							{compareMode && hasData && (
								<>
									<div className="relative flex items-center gap-2 px-2 py-1.5">
										<Checkbox
											id="compare-current"
											checked={compareState.includeCurrentView}
											onCheckedChange={handleToggleCurrentForCompare}
											disabled={!compareState.includeCurrentView && !canAddMore}
										/>
										<label
											htmlFor="compare-current"
											className="flex-1 cursor-pointer"
										>
											<div className="text-sm font-medium">
												Current Simulation
											</div>
											<div className="text-xs text-muted-foreground">
												Unsaved changes
											</div>
										</label>
									</div>
									<DropdownMenuSeparator />
								</>
							)}

							{/* Saved simulations list */}
							{savedSimulations.map((save) => (
								<div
									key={save.id}
									className="relative flex items-center gap-1 px-1 py-0.5"
								>
									{compareMode ? (
										<>
											<Checkbox
												id={`compare-${save.id}`}
												checked={compareState.savedIds.includes(save.id)}
												onCheckedChange={() =>
													handleToggleSaveForCompare(save.id)
												}
												disabled={
													!compareState.savedIds.includes(save.id) &&
													!canAddMore
												}
												className="ml-1"
											/>
											<label
												htmlFor={`compare-${save.id}`}
												className="flex-1 cursor-pointer rounded-sm px-2 py-1.5"
											>
												<div className="truncate text-sm">{save.name}</div>
												<div className="text-xs text-muted-foreground">
													Last modified {formatDate(save.lastUpdatedAt)}
												</div>
											</label>
										</>
									) : (
										<>
											<button
												type="button"
												className="flex-1 text-left cursor-pointer rounded-sm px-2 py-1.5 hover:bg-accent focus:bg-accent outline-none"
												onClick={() => handleLoad(save)}
											>
												<div className="truncate text-sm">{save.name}</div>
												<div className="text-xs text-muted-foreground">
													Last modified {formatDate(save.lastUpdatedAt)}
												</div>
											</button>
											<Button
												variant="ghost"
												size="icon"
												className="h-7 w-7 shrink-0"
												onClick={(e) => {
													e.stopPropagation();
													handleRenameClick(save);
												}}
											>
												<Pencil className="h-3 w-3" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="h-7 w-7 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
												onClick={(e) => {
													e.stopPropagation();
													handleDeleteClick(save);
												}}
											>
												<Trash2 className="h-3 w-3" />
											</Button>
										</>
									)}
								</div>
							))}

							{/* Compare button */}
							{compareMode && (
								<>
									<DropdownMenuSeparator />
									<div className="px-2 py-1.5">
										<Button
											className="w-full gap-1.5"
											size="sm"
											disabled={!hasValidComparison}
											onClick={handleCompare}
										>
											<GitCompareArrows className="h-4 w-4" />
											Compare Selected ({selectionCount})
										</Button>
									</div>
								</>
							)}
						</>
					) : (
						<div className="px-2 py-4 text-center text-sm text-muted-foreground">
							No saved simulations yet
						</div>
					)}
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Save button */}
			{hasData && (
				<Button
					variant="outline"
					size="sm"
					className="gap-1.5"
					onClick={handleSaveNew}
				>
					<Save className="h-4 w-4" />
					Save
				</Button>
			)}

			{/* Save Dialog */}
			<Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Save Simulation</DialogTitle>
						<DialogDescription>
							Enter a name to create a new save.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="save-name">Name</Label>
							<Input
								id="save-name"
								value={saveName}
								onChange={(e) => setSaveName(e.target.value)}
								placeholder="My Mortgage Simulation"
								onKeyDown={(e) => {
									if (e.key === "Enter" && canSave) {
										handleSaveSubmit();
									}
								}}
							/>
							{matchingSave && (
								<p className="text-sm text-amber-600">
									This will overwrite "{matchingSave.name}"
								</p>
							)}
						</div>
						{savedSimulations.length > 0 && (
							<div className="grid gap-2">
								<Label className="text-muted-foreground">
									Or overwrite existing
								</Label>
								<div className="rounded-md border divide-y max-h-48 overflow-y-auto">
									{savedSimulations.map((save) => (
										<div
											key={save.id}
											className="flex items-center justify-between px-3 py-2"
										>
											<div className="min-w-0 flex-1">
												<div className="truncate text-sm">{save.name}</div>
												<div className="text-xs text-muted-foreground">
													Last modified {formatDate(save.lastUpdatedAt)}
												</div>
											</div>
											<Button
												variant="outline"
												size="sm"
												className="ml-3 shrink-0"
												onClick={() => handleOverwrite(save)}
											>
												Overwrite
											</Button>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleSaveSubmit} disabled={!canSave}>
							{matchingSave ? "Overwrite" : "Save"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Rename Dialog */}
			<Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Rename Simulation</DialogTitle>
						<DialogDescription>
							Enter a new name for this simulation.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="rename-name">Name</Label>
							<Input
								id="rename-name"
								value={saveName}
								onChange={(e) => setSaveName(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										handleRenameSubmit();
									}
								}}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setRenameDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button onClick={handleRenameSubmit} disabled={!saveName.trim()}>
							Rename
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Simulation</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete "{selectedSave?.name}"? This
							action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setDeleteDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={handleDeleteConfirm}
						>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
