import { ArrowLeft, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
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
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
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
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { StoredCustomPerk } from "@/lib/stores/custom-perks";
import { formatShortDate } from "@/lib/utils/date";
import { AddCustomPerkDialog } from "./AddCustomPerkDialog";
import { PERK_ICON_OPTIONS } from "./CustomPerkForm";
import { EditCustomPerkDialog } from "./EditCustomPerkDialog";

interface ManageCustomPerksDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	customPerks: StoredCustomPerk[];
	onAddPerk: (perk: StoredCustomPerk) => void;
	onUpdatePerk: (perk: StoredCustomPerk) => void;
	onDeletePerk: (perkId: string) => void;
	onBack?: () => void;
}

export function ManageCustomPerksDialog({
	open,
	onOpenChange,
	customPerks,
	onAddPerk,
	onUpdatePerk,
	onDeletePerk,
	onBack,
}: ManageCustomPerksDialogProps) {
	const [addOpen, setAddOpen] = useState(false);
	const [editingPerk, setEditingPerk] = useState<StoredCustomPerk | null>(null);
	const [deleteConfirmPerk, setDeleteConfirmPerk] =
		useState<StoredCustomPerk | null>(null);

	// Sort by createdAt ascending (oldest first)
	const sortedPerks = useMemo(() => {
		return [...customPerks].sort((a, b) => {
			const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
			const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
			return dateA - dateB;
		});
	}, [customPerks]);

	const handleOpenAdd = useCallback(() => {
		onOpenChange(false);
		setAddOpen(true);
	}, [onOpenChange]);

	const handleBackFromAdd = useCallback(() => {
		setAddOpen(false);
		onOpenChange(true);
	}, [onOpenChange]);

	const handleAddPerk = useCallback(
		(perk: StoredCustomPerk) => {
			onAddPerk(perk);
			setAddOpen(false);
			onOpenChange(true);
		},
		[onAddPerk, onOpenChange],
	);

	const handleEditPerk = useCallback(
		(perk: StoredCustomPerk) => {
			onOpenChange(false);
			setEditingPerk(perk);
		},
		[onOpenChange],
	);

	const handleBackFromEdit = useCallback(() => {
		setEditingPerk(null);
		onOpenChange(true);
	}, [onOpenChange]);

	const handleUpdatePerk = useCallback(
		(perk: StoredCustomPerk) => {
			onUpdatePerk(perk);
			setEditingPerk(null);
			onOpenChange(true);
		},
		[onUpdatePerk, onOpenChange],
	);

	const handleConfirmDelete = useCallback(() => {
		if (deleteConfirmPerk) {
			onDeletePerk(deleteConfirmPerk.id);
			setDeleteConfirmPerk(null);
		}
	}, [deleteConfirmPerk, onDeletePerk]);

	const renderPerkIcon = useCallback((iconName: string) => {
		const IconComponent = PERK_ICON_OPTIONS[iconName];
		if (!IconComponent) {
			// Fallback to Sparkles if icon not found
			return <Sparkles className="h-4 w-4 text-muted-foreground" />;
		}
		return <IconComponent className="h-4 w-4 text-muted-foreground" />;
	}, []);

	return (
		<>
			{/* Main Manage Dialog */}
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent
					className="sm:max-w-2xl max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden p-0"
					showCloseButton={false}
				>
					{/* Sticky Header */}
					<div className="sticky top-0 bg-background z-10 px-6 pt-6 pb-4 border-b">
						<DialogHeader>
							<div className="flex items-start justify-between gap-3">
								<div className="flex items-center gap-3">
									{onBack && (
										<button
											type="button"
											onClick={onBack}
											className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 mr-1"
										>
											<ArrowLeft className="h-5 w-5" />
											<span className="sr-only">Back</span>
										</button>
									)}
									<div>
										<DialogTitle>Custom Perks</DialogTitle>
										<DialogDescription>
											Manage your custom perks for use with custom rates.
										</DialogDescription>
									</div>
								</div>
								<DialogClose className="cursor-pointer rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
									<X className="h-4 w-4" />
									<span className="sr-only">Close</span>
								</DialogClose>
							</div>
						</DialogHeader>
					</div>

					{/* Scrollable Content */}
					<div className="flex-1 overflow-y-auto">
						{customPerks.length === 0 ? (
							<div className="px-6 py-12 text-center text-muted-foreground">
								<p className="text-sm">No custom perks yet.</p>
								<p className="text-xs mt-1">
									Add a custom perk to use with your custom rates.
								</p>
							</div>
						) : (
							<div className="px-6 py-4">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-[40px]">Icon</TableHead>
											<TableHead>Label</TableHead>
											<TableHead>Description</TableHead>
											<TableHead>Created</TableHead>
											<TableHead>Modified</TableHead>
											<TableHead className="w-[100px]" />
										</TableRow>
									</TableHeader>
									<TableBody>
										{sortedPerks.map((perk) => (
											<TableRow key={perk.id}>
												<TableCell>{renderPerkIcon(perk.icon)}</TableCell>
												<TableCell>
													<span className="text-sm font-medium">
														{perk.label}
													</span>
												</TableCell>
												<TableCell>
													<span className="text-sm text-muted-foreground line-clamp-1">
														{perk.description || "—"}
													</span>
												</TableCell>
												<TableCell>
													<span className="text-sm text-muted-foreground whitespace-nowrap">
														{formatShortDate(perk.createdAt)}
													</span>
												</TableCell>
												<TableCell>
													<span className="text-sm text-muted-foreground whitespace-nowrap">
														{formatShortDate(perk.lastUpdatedAt)}
													</span>
												</TableCell>
												<TableCell>
													<div className="flex items-center justify-end gap-1">
														<Tooltip>
															<TooltipTrigger asChild>
																<Button
																	variant="ghost"
																	size="icon"
																	className="h-8 w-8"
																	onClick={() => handleEditPerk(perk)}
																>
																	<Pencil className="h-4 w-4" />
																	<span className="sr-only">Edit</span>
																</Button>
															</TooltipTrigger>
															<TooltipContent>Edit</TooltipContent>
														</Tooltip>
														<Tooltip>
															<TooltipTrigger asChild>
																<Button
																	variant="ghost"
																	size="icon"
																	className="h-8 w-8 text-destructive hover:text-destructive"
																	onClick={() => setDeleteConfirmPerk(perk)}
																>
																	<Trash2 className="h-4 w-4" />
																	<span className="sr-only">Delete</span>
																</Button>
															</TooltipTrigger>
															<TooltipContent>Delete</TooltipContent>
														</Tooltip>
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</div>

					{/* Sticky Footer */}
					<div className="sticky bottom-0 bg-background z-10 px-6 py-4 border-t flex items-center justify-between">
						<p className="text-xs text-muted-foreground">
							{customPerks.length === 0
								? "Custom perks are stored locally in your browser."
								: `${customPerks.length} custom perk${customPerks.length === 1 ? "" : "s"}`}
						</p>
						<Button onClick={handleOpenAdd} className="gap-1.5">
							<Plus className="h-4 w-4" />
							Add Custom Perk
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Add Dialog */}
			<AddCustomPerkDialog
				open={addOpen}
				onOpenChange={setAddOpen}
				onAddPerk={handleAddPerk}
				onBack={handleBackFromAdd}
			/>

			{/* Edit Dialog */}
			{editingPerk && (
				<EditCustomPerkDialog
					open={!!editingPerk}
					onOpenChange={(open) => !open && setEditingPerk(null)}
					perk={editingPerk}
					onUpdatePerk={handleUpdatePerk}
					onBack={handleBackFromEdit}
				/>
			)}

			{/* Delete Confirmation */}
			<AlertDialog
				open={!!deleteConfirmPerk}
				onOpenChange={(open) => !open && setDeleteConfirmPerk(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Custom Perk</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete "{deleteConfirmPerk?.label}"? This
							action cannot be undone. Custom rates using this perk will no
							longer display it.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
