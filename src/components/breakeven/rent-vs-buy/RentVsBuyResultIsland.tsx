import { useStore } from "@nanostores/react";
import { useCallback, useState } from "react";
import { exportRentVsBuyToPDF } from "@/lib/export/breakeven-export";
import { generateBreakevenShareUrl } from "@/lib/share/breakeven";
import {
	$rentVsBuyDialogOpen,
	$rentVsBuyResult,
	closeRentVsBuyDialog,
} from "@/lib/stores/breakeven";
import { parseCurrency } from "@/lib/utils/currency";
import { BreakevenResultDialog } from "../BreakevenResultDialog";
import { RentVsBuyResultCard } from "./RentVsBuyResultCard";

export function RentVsBuyResultIsland() {
	const rentVsBuyResult = useStore($rentVsBuyResult);
	const rentVsBuyDialogOpen = useStore($rentVsBuyDialogOpen);

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

	const handleShare = useCallback(async () => {
		if (!rentVsBuyResult) return "";
		return generateBreakevenShareUrl(rentVsBuyResult.shareState);
	}, [rentVsBuyResult]);

	return (
		<BreakevenResultDialog
			open={rentVsBuyDialogOpen}
			onOpenChange={(open) => {
				if (!open) closeRentVsBuyDialog();
			}}
			title="Rent vs Buy Analysis"
			description="Based on your inputs, here's when buying becomes more cost-effective than renting."
			onExport={handleExportRentVsBuy}
			isExporting={isExporting}
			onShare={handleShare}
			hasResult={!!rentVsBuyResult}
		>
			{rentVsBuyResult && (
				<RentVsBuyResultCard
					result={rentVsBuyResult.result}
					monthlyRent={rentVsBuyResult.monthlyRent}
					saleCostRate={rentVsBuyResult.saleCostRate}
				/>
			)}
		</BreakevenResultDialog>
	);
}
