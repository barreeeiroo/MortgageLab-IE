import { ArrowLeft, Plus, Sparkles, X } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { StoredCustomPerk } from "@/lib/stores/custom-perks";
import { CustomPerkForm } from "./CustomPerkForm";

interface AddCustomPerkDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onAddPerk: (perk: StoredCustomPerk) => void;
	onBack?: () => void;
}

export function AddCustomPerkDialog({
	open,
	onOpenChange,
	onAddPerk,
	onBack,
}: AddCustomPerkDialogProps) {
	const handleSubmit = useCallback(
		(perk: StoredCustomPerk) => {
			onAddPerk(perk);
			onOpenChange(false);
		},
		[onAddPerk, onOpenChange],
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="sm:max-w-md max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden p-0"
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
								<div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
									<Sparkles className="h-5 w-5 text-primary" />
								</div>
								<div>
									<DialogTitle>Add Custom Perk</DialogTitle>
									<DialogDescription>
										Create a custom perk to use with your custom rates.
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

				<CustomPerkForm
					onSubmit={handleSubmit}
					submitButton={({ onClick, disabled }) => (
						<Button onClick={onClick} disabled={disabled} className="gap-1.5">
							<Plus className="h-4 w-4" />
							Create Perk
						</Button>
					)}
				/>
			</DialogContent>
		</Dialog>
	);
}
