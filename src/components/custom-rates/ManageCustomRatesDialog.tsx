import { HandCoins, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { LenderLogo } from "@/components/lenders";
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
	DialogTrigger,
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
import type { Lender } from "@/lib/data";
import type { BuyerType } from "@/lib/schemas/buyer";
import type { Perk } from "@/lib/schemas/perk";
import type { StoredCustomRate } from "@/lib/stores";
import { formatShortDate } from "@/lib/utils/date";
import { AddCustomRateDialog } from "./AddCustomRateDialog";
import type { CustomLenderInfo } from "./CustomRateForm";
import { EditCustomRateDialog } from "./EditCustomRateDialog";

interface ManageCustomRatesDialogProps {
	customRates: StoredCustomRate[];
	lenders: Lender[];
	customLenders: CustomLenderInfo[];
	perks: Perk[];
	currentBuyerType: BuyerType;
	onAddRate: (rate: StoredCustomRate) => void;
	onUpdateRate: (rate: StoredCustomRate) => void;
	onDeleteRate: (rateId: string) => void;
}

const RATE_TYPE_LABELS: Record<string, string> = {
	fixed: "Fixed",
	variable: "Variable",
	tracker: "Tracker",
};

export function ManageCustomRatesDialog({
	customRates,
	lenders,
	customLenders,
	perks,
	currentBuyerType,
	onAddRate,
	onUpdateRate,
	onDeleteRate,
}: ManageCustomRatesDialogProps) {
	const [manageOpen, setManageOpen] = useState(false);
	const [addOpen, setAddOpen] = useState(false);
	const [editingRate, setEditingRate] = useState<StoredCustomRate | null>(null);
	const [deleteConfirmRate, setDeleteConfirmRate] =
		useState<StoredCustomRate | null>(null);

	// Sort by createdAt ascending (oldest first)
	const sortedRates = useMemo(() => {
		return [...customRates].sort((a, b) => {
			const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
			const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
			return dateA - dateB;
		});
	}, [customRates]);

	const handleOpenAdd = useCallback(() => {
		setManageOpen(false);
		setAddOpen(true);
	}, []);

	const handleBackFromAdd = useCallback(() => {
		setAddOpen(false);
		setManageOpen(true);
	}, []);

	const handleAddRate = useCallback(
		(rate: StoredCustomRate) => {
			onAddRate(rate);
			setAddOpen(false);
			setManageOpen(true);
		},
		[onAddRate],
	);

	const handleEditRate = useCallback((rate: StoredCustomRate) => {
		setManageOpen(false);
		setEditingRate(rate);
	}, []);

	const handleBackFromEdit = useCallback(() => {
		setEditingRate(null);
		setManageOpen(true);
	}, []);

	const handleUpdateRate = useCallback(
		(rate: StoredCustomRate) => {
			onUpdateRate(rate);
			setEditingRate(null);
			setManageOpen(true);
		},
		[onUpdateRate],
	);

	const handleConfirmDelete = useCallback(() => {
		if (deleteConfirmRate) {
			onDeleteRate(deleteConfirmRate.id);
			setDeleteConfirmRate(null);
		}
	}, [deleteConfirmRate, onDeleteRate]);

	const getLenderName = useCallback(
		(rate: StoredCustomRate) => {
			if (rate.customLenderName) return rate.customLenderName;
			const lender = lenders.find((l) => l.id === rate.lenderId);
			return lender?.name || rate.lenderId;
		},
		[lenders],
	);

	const formatPeriod = useCallback((rate: StoredCustomRate) => {
		if (rate.type === "fixed" && rate.fixedTerm) {
			return `${rate.fixedTerm} yr`;
		}
		return "—";
	}, []);

	return (
		<>
			{/* Main Manage Dialog */}
			<Dialog open={manageOpen} onOpenChange={setManageOpen}>
				<DialogTrigger asChild>
					<Button size="sm" className="h-8 gap-1.5">
						<HandCoins className="h-4 w-4" />
						Custom Rates
					</Button>
				</DialogTrigger>
				<DialogContent
					className="sm:max-w-4xl flex flex-col overflow-hidden p-0"
					showCloseButton={false}
				>
					{/* Sticky Header */}
					<div className="sticky top-0 bg-background z-10 px-6 pt-6 pb-4 border-b">
						<DialogHeader>
							<div className="flex items-start justify-between gap-3">
								<div>
									<DialogTitle>Custom Rates</DialogTitle>
									<DialogDescription>
										Manage your custom rates for comparison.
									</DialogDescription>
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
						{customRates.length === 0 ? (
							<div className="px-6 py-12 text-center text-muted-foreground">
								<p className="text-sm">No custom rates yet.</p>
								<p className="text-xs mt-1">
									Add a custom rate to compare against lender rates.
								</p>
							</div>
						) : (
							<div className="px-6 py-4">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Lender</TableHead>
											<TableHead>Product</TableHead>
											<TableHead>Type</TableHead>
											<TableHead>Period</TableHead>
											<TableHead className="text-right">Rate</TableHead>
											<TableHead>Created</TableHead>
											<TableHead>Modified</TableHead>
											<TableHead className="w-[100px]" />
										</TableRow>
									</TableHeader>
									<TableBody>
										{sortedRates.map((rate) => (
											<TableRow key={rate.id}>
												<TableCell>
													<div className="flex items-center gap-2">
														<LenderLogo
															lenderId={rate.lenderId}
															size={24}
															isCustom={!!rate.customLenderName}
														/>
														<span className="text-sm font-medium">
															{getLenderName(rate)}
														</span>
													</div>
												</TableCell>
												<TableCell>
													<span className="text-sm">{rate.name}</span>
												</TableCell>
												<TableCell>
													<span className="text-sm text-muted-foreground">
														{RATE_TYPE_LABELS[rate.type] || rate.type}
													</span>
												</TableCell>
												<TableCell>
													<span className="text-sm text-muted-foreground">
														{formatPeriod(rate)}
													</span>
												</TableCell>
												<TableCell className="text-right">
													<span className="text-sm font-medium tabular-nums">
														{rate.rate.toFixed(2)}%
													</span>
												</TableCell>
												<TableCell>
													<span className="text-sm text-muted-foreground whitespace-nowrap">
														{formatShortDate(rate.createdAt)}
													</span>
												</TableCell>
												<TableCell>
													<span className="text-sm text-muted-foreground whitespace-nowrap">
														{formatShortDate(rate.lastUpdatedAt)}
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
																	onClick={() => handleEditRate(rate)}
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
																	onClick={() => setDeleteConfirmRate(rate)}
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
							{customRates.length === 0
								? "Custom rates are stored locally in your browser."
								: `${customRates.length} custom rate${customRates.length === 1 ? "" : "s"}`}
						</p>
						<Button onClick={handleOpenAdd} className="gap-1.5">
							<Plus className="h-4 w-4" />
							Add Custom Rate
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Add Dialog */}
			<AddCustomRateDialog
				open={addOpen}
				onOpenChange={setAddOpen}
				lenders={lenders}
				customLenders={customLenders}
				perks={perks}
				currentBuyerType={currentBuyerType}
				onAddRate={handleAddRate}
				onBack={handleBackFromAdd}
			/>

			{/* Edit Dialog */}
			{editingRate && (
				<EditCustomRateDialog
					open={!!editingRate}
					onOpenChange={(open) => !open && setEditingRate(null)}
					rate={editingRate}
					lenders={lenders}
					customLenders={customLenders}
					perks={perks}
					currentBuyerType={currentBuyerType}
					onUpdateRate={handleUpdateRate}
					onBack={handleBackFromEdit}
				/>
			)}

			{/* Delete Confirmation */}
			<AlertDialog
				open={!!deleteConfirmRate}
				onOpenChange={(open) => !open && setDeleteConfirmRate(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Custom Rate</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete "{deleteConfirmRate?.name}"? This
							action cannot be undone.
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
