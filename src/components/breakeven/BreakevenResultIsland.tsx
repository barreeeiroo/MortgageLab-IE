import { useStore } from "@nanostores/react";
import { generateBreakevenShareUrl } from "@/lib/share/breakeven";
import {
	$remortgageDialogOpen,
	$remortgageResult,
	$rentVsBuyDialogOpen,
	$rentVsBuyResult,
	closeRemortgageDialog,
	closeRentVsBuyDialog,
} from "@/lib/stores/breakeven";
import { ShareButton } from "../ShareButton";
import {
	AlertDialog,
	AlertDialogBody,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "../ui/alert-dialog";
import {
	RemortgageResultCard,
	RentVsBuyResultCard,
} from "./BreakevenResultCard";

export function BreakevenResultIsland() {
	// Subscribe to both stores
	const rentVsBuyResult = useStore($rentVsBuyResult);
	const rentVsBuyDialogOpen = useStore($rentVsBuyDialogOpen);
	const remortgageResult = useStore($remortgageResult);
	const remortgageDialogOpen = useStore($remortgageDialogOpen);

	return (
		<>
			{/* Rent vs Buy Result Dialog */}
			<AlertDialog
				open={rentVsBuyDialogOpen}
				onOpenChange={(open) => {
					if (!open) closeRentVsBuyDialog();
				}}
			>
				<AlertDialogContent className="max-w-2xl">
					<AlertDialogHeader>
						<AlertDialogTitle>Rent vs Buy Analysis</AlertDialogTitle>
						<AlertDialogDescription>
							Based on your inputs, here's when buying becomes more
							cost-effective than renting.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogBody>
						{rentVsBuyResult && (
							<RentVsBuyResultCard
								result={rentVsBuyResult.result}
								monthlyRent={rentVsBuyResult.monthlyRent}
								saleCostRate={rentVsBuyResult.saleCostRate}
							/>
						)}
					</AlertDialogBody>
					<AlertDialogFooter className="sm:justify-between">
						{rentVsBuyResult && (
							<ShareButton
								size="default"
								onShare={async () =>
									generateBreakevenShareUrl(rentVsBuyResult.shareState)
								}
							/>
						)}
						<AlertDialogCancel>Close</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Remortgage Result Dialog */}
			<AlertDialog
				open={remortgageDialogOpen}
				onOpenChange={(open) => {
					if (!open) closeRemortgageDialog();
				}}
			>
				<AlertDialogContent className="max-w-2xl">
					<AlertDialogHeader>
						<AlertDialogTitle>Remortgage Analysis</AlertDialogTitle>
						<AlertDialogDescription>
							Based on your inputs, here's when switching will pay off.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogBody>
						{remortgageResult && (
							<RemortgageResultCard
								result={remortgageResult.result}
								remainingTermMonths={remortgageResult.remainingTermMonths}
								fixedPeriodMonths={remortgageResult.fixedPeriodMonths}
							/>
						)}
					</AlertDialogBody>
					<AlertDialogFooter className="sm:justify-between">
						{remortgageResult && (
							<ShareButton
								size="default"
								onShare={async () =>
									generateBreakevenShareUrl(remortgageResult.shareState)
								}
							/>
						)}
						<AlertDialogCancel>Close</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
