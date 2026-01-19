import { useStore } from "@nanostores/react";
import { Download } from "lucide-react";
import { useCallback, useState } from "react";
import {
	exportCashbackToPDF,
	exportRemortgageToPDF,
	exportRentVsBuyToPDF,
} from "@/lib/export/breakeven-export";
import { generateBreakevenShareUrl } from "@/lib/share/breakeven";
import {
	$cashbackDialogOpen,
	$cashbackResult,
	$remortgageDialogOpen,
	$remortgageResult,
	$rentVsBuyDialogOpen,
	$rentVsBuyResult,
	closeCashbackDialog,
	closeRemortgageDialog,
	closeRentVsBuyDialog,
} from "@/lib/stores/breakeven";
import { parseCurrency } from "@/lib/utils/currency";
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
import { Button } from "../ui/button";
import {
	CashbackResultCard,
	RemortgageResultCard,
	RentVsBuyResultCard,
} from "./BreakevenResultCard";

export function BreakevenResultIsland() {
	// Subscribe to all stores
	const rentVsBuyResult = useStore($rentVsBuyResult);
	const rentVsBuyDialogOpen = useStore($rentVsBuyDialogOpen);
	const remortgageResult = useStore($remortgageResult);
	const remortgageDialogOpen = useStore($remortgageDialogOpen);
	const cashbackResult = useStore($cashbackResult);
	const cashbackDialogOpen = useStore($cashbackDialogOpen);

	const [isExporting, setIsExporting] = useState(false);

	const handleExportRentVsBuy = useCallback(async () => {
		if (!rentVsBuyResult) return;
		setIsExporting(true);
		try {
			const shareUrl = generateBreakevenShareUrl(rentVsBuyResult.shareState);
			await exportRentVsBuyToPDF({
				result: rentVsBuyResult.result,
				monthlyRent: rentVsBuyResult.monthlyRent,
				saleCostRate: rentVsBuyResult.saleCostRate,
				propertyValue: parseCurrency(rentVsBuyResult.shareState.propertyValue),
				mortgageTerm:
					Number.parseInt(rentVsBuyResult.shareState.mortgageTerm, 10) * 12,
				interestRate: Number.parseFloat(
					rentVsBuyResult.shareState.interestRate,
				),
				shareUrl,
			});
		} finally {
			setIsExporting(false);
		}
	}, [rentVsBuyResult]);

	const handleExportRemortgage = useCallback(async () => {
		if (!remortgageResult) return;
		setIsExporting(true);
		try {
			const shareUrl = generateBreakevenShareUrl(remortgageResult.shareState);
			await exportRemortgageToPDF({
				result: remortgageResult.result,
				remainingTermMonths: remortgageResult.remainingTermMonths,
				fixedPeriodMonths: remortgageResult.fixedPeriodMonths,
				outstandingBalance: parseCurrency(
					remortgageResult.shareState.outstandingBalance,
				),
				currentRate: Number.parseFloat(remortgageResult.shareState.currentRate),
				newRate: Number.parseFloat(remortgageResult.shareState.newRate),
				shareUrl,
			});
		} finally {
			setIsExporting(false);
		}
	}, [remortgageResult]);

	const handleExportCashback = useCallback(async () => {
		if (!cashbackResult) return;
		setIsExporting(true);
		try {
			const shareUrl = generateBreakevenShareUrl(cashbackResult.shareState);
			await exportCashbackToPDF({
				result: cashbackResult.result,
				mortgageAmount: cashbackResult.mortgageAmount,
				mortgageTermMonths: cashbackResult.mortgageTermMonths,
				shareUrl,
			});
		} finally {
			setIsExporting(false);
		}
	}, [cashbackResult]);

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
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="default"
									className="gap-1.5"
									onClick={handleExportRentVsBuy}
									disabled={isExporting}
								>
									<Download className="h-4 w-4" />
									{isExporting ? "Exporting..." : "Export PDF"}
								</Button>
								<ShareButton
									size="default"
									onShare={async () =>
										generateBreakevenShareUrl(rentVsBuyResult.shareState)
									}
								/>
							</div>
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
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="default"
									className="gap-1.5"
									onClick={handleExportRemortgage}
									disabled={isExporting}
								>
									<Download className="h-4 w-4" />
									{isExporting ? "Exporting..." : "Export PDF"}
								</Button>
								<ShareButton
									size="default"
									onShare={async () =>
										generateBreakevenShareUrl(remortgageResult.shareState)
									}
								/>
							</div>
						)}
						<AlertDialogCancel>Close</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Cashback Comparison Result Dialog */}
			<AlertDialog
				open={cashbackDialogOpen}
				onOpenChange={(open) => {
					if (!open) closeCashbackDialog();
				}}
			>
				<AlertDialogContent className="max-w-2xl">
					<AlertDialogHeader>
						<AlertDialogTitle>Cashback Comparison</AlertDialogTitle>
						<AlertDialogDescription>
							Compare different rate and cashback combinations to find the
							cheapest option over time.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogBody>
						{cashbackResult && (
							<CashbackResultCard
								result={cashbackResult.result}
								mortgageTermMonths={cashbackResult.mortgageTermMonths}
								overpaymentAllowances={cashbackResult.overpaymentAllowances}
							/>
						)}
					</AlertDialogBody>
					<AlertDialogFooter className="sm:justify-between">
						{cashbackResult && (
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="default"
									className="gap-1.5"
									onClick={handleExportCashback}
									disabled={isExporting}
								>
									<Download className="h-4 w-4" />
									{isExporting ? "Exporting..." : "Export PDF"}
								</Button>
								<ShareButton
									size="default"
									onShare={async () =>
										generateBreakevenShareUrl(cashbackResult.shareState)
									}
								/>
							</div>
						)}
						<AlertDialogCancel>Close</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
