import { useStore } from "@nanostores/react";
import { ChevronDown, FolderOpen, Pencil, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SavedSimulation } from "@/lib/schemas/simulate";
import {
	$savedSimulations,
	deleteSave,
	loadSave,
	renameSave,
	saveSimulation,
} from "@/lib/stores/simulate/simulate-saves";
import { $simulationState } from "@/lib/stores/simulate/simulate-state";

export function SimulateSavesDropdown() {
	const simulationState = useStore($simulationState);
	const savedSimulations = useStore($savedSimulations);

	const [saveDialogOpen, setSaveDialogOpen] = useState(false);
	const [renameDialogOpen, setRenameDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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

	const formatDate = (isoDate: string) => {
		const date = new Date(isoDate);
		return date.toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	return (
		<>
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

			{/* Load dropdown */}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" size="sm" className="gap-1.5">
						<FolderOpen className="h-4 w-4" />
						Load
						<ChevronDown className="h-3 w-3 opacity-50" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-64">
					{savedSimulations.length > 0 ? (
						savedSimulations.map((save) => (
							<div
								key={save.id}
								className="relative flex items-center gap-1 px-1 py-0.5"
							>
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
							</div>
						))
					) : (
						<div className="px-2 py-4 text-center text-sm text-muted-foreground">
							No saved simulations yet
						</div>
					)}
				</DropdownMenuContent>
			</DropdownMenu>

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
