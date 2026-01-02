import { ArrowLeft, Plus, X } from "lucide-react";
import { useCallback } from "react";
import { LenderLogo } from "@/components/LenderLogo";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { Lender } from "@/lib/data";
import type { BuyerType } from "@/lib/schemas/buyer";
import type { Perk } from "@/lib/schemas/perk";
import type { StoredCustomRate } from "@/lib/stores";
import { type CustomLenderInfo, CustomRateForm } from "./CustomRateForm";

interface AddCustomRateDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	lenders: Lender[];
	customLenders: CustomLenderInfo[];
	perks: Perk[];
	currentBuyerType: BuyerType;
	onAddRate: (rate: StoredCustomRate) => void;
	onBack?: () => void;
}

export function AddCustomRateDialog({
	open,
	onOpenChange,
	lenders,
	customLenders,
	perks,
	currentBuyerType,
	onAddRate,
	onBack,
}: AddCustomRateDialogProps) {
	const handleSubmit = useCallback(
		(rate: StoredCustomRate) => {
			onAddRate(rate);
			onOpenChange(false);
		},
		[onAddRate, onOpenChange],
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="sm:max-w-xl max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden p-0"
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
								<LenderLogo lenderId="custom" size={40} isCustom />
								<div>
									<DialogTitle>Add Custom Rate</DialogTitle>
									<DialogDescription>
										Create a custom rate to compare against lender rates.
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

				<CustomRateForm
					lenders={lenders}
					customLenders={customLenders}
					perks={perks}
					currentBuyerType={currentBuyerType}
					onSubmit={handleSubmit}
					showAprcCalculation
					submitButton={({ onClick, disabled }) => (
						<Button onClick={onClick} disabled={disabled} className="gap-1.5">
							<Plus className="h-4 w-4" />
							Create Rate
						</Button>
					)}
				/>
			</DialogContent>
		</Dialog>
	);
}
