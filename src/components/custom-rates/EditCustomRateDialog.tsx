import { ArrowLeft, Pencil, X } from "lucide-react";
import { useCallback, useMemo } from "react";
import { LenderLogo } from "@/components/lenders/LenderLogo";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { BuyerType } from "@/lib/schemas/buyer";
import type { Lender } from "@/lib/schemas/lender";
import type { Perk } from "@/lib/schemas/perk";
import type { StoredCustomPerk } from "@/lib/stores/custom-perks";
import type { StoredCustomRate } from "@/lib/stores/custom-rates";
import { type CustomLenderInfo, CustomRateForm } from "./CustomRateForm";

interface EditCustomRateDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	rate: StoredCustomRate;
	lenders: Lender[];
	customLenders: CustomLenderInfo[];
	perks: Perk[];
	customPerks?: StoredCustomPerk[];
	currentBuyerType: BuyerType;
	onUpdateRate: (rate: StoredCustomRate) => void;
	onBack?: () => void;
}

export function EditCustomRateDialog({
	open,
	onOpenChange,
	rate,
	lenders,
	customLenders,
	perks,
	customPerks = [],
	currentBuyerType,
	onUpdateRate,
	onBack,
}: EditCustomRateDialogProps) {
	const handleSubmit = useCallback(
		(updatedRate: StoredCustomRate) => {
			onUpdateRate(updatedRate);
			onOpenChange(false);
		},
		[onUpdateRate, onOpenChange],
	);

	// Combine standard perks with custom perks (preserving isCustom flag)
	const allPerks = useMemo(() => {
		const customAsPerk = customPerks.map((cp) => ({
			id: cp.id,
			label: cp.label,
			description: cp.description,
			icon: cp.icon,
			isCustom: true as const,
		}));
		return [...perks, ...customAsPerk];
	}, [perks, customPerks]);

	// Find lender name for the header
	const lender = lenders.find((l) => l.id === rate.lenderId);
	const lenderName = lender?.name || rate.customLenderName || "Custom";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="sm:max-w-xl flex flex-col overflow-hidden p-0"
				showCloseButton={false}
			>
				{/* Sticky Header */}
				<div className="sticky top-0 bg-background z-10 px-6 pt-6 pb-4 border-b">
					<DialogHeader>
						<div className="flex items-start justify-between gap-3">
							<div className="flex items-center gap-3">
								{onBack && (
									<Button
										type="button"
										variant="ghost"
										size="icon"
										onClick={onBack}
										className="mr-1"
									>
										<ArrowLeft className="h-5 w-5" />
										<span className="sr-only">Back</span>
									</Button>
								)}
								<LenderLogo
									lenderId={rate.lenderId}
									size={40}
									isCustom={!!rate.customLenderName}
								/>
								<div>
									<DialogTitle>Edit Custom Rate</DialogTitle>
									<DialogDescription>
										Modify your custom rate for {lenderName}.
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
					perks={allPerks}
					currentBuyerType={currentBuyerType}
					initialRate={rate}
					onSubmit={handleSubmit}
					submitButton={({ onClick, disabled }) => (
						<Button onClick={onClick} disabled={disabled} className="gap-1.5">
							<Pencil className="h-4 w-4" />
							Save Changes
						</Button>
					)}
				/>
			</DialogContent>
		</Dialog>
	);
}
