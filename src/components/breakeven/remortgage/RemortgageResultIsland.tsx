import { useStore } from "@nanostores/react";
import { useCallback, useState } from "react";
import { exportRemortgageToPDF } from "@/lib/export/breakeven-export";
import { generateBreakevenShareUrl } from "@/lib/share/breakeven";
import {
	$remortgageDialogOpen,
	$remortgageResult,
	closeRemortgageDialog,
} from "@/lib/stores/breakeven";
import { parseCurrency } from "@/lib/utils/currency";
import { BreakevenResultDialog } from "../BreakevenResultDialog";
import { RemortgageResultCard } from "./RemortgageResultCard";

export function RemortgageResultIsland() {
	const remortgageResult = useStore($remortgageResult);
	const remortgageDialogOpen = useStore($remortgageDialogOpen);

	const [isExporting, setIsExporting] = useState(false);

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

	const handleShare = useCallback(async () => {
		if (!remortgageResult) return "";
		return generateBreakevenShareUrl(remortgageResult.shareState);
	}, [remortgageResult]);

	return (
		<BreakevenResultDialog
			open={remortgageDialogOpen}
			onOpenChange={(open) => {
				if (!open) closeRemortgageDialog();
			}}
			title="Remortgage Analysis"
			description="Based on your inputs, here's when switching will pay off."
			onExport={handleExportRemortgage}
			isExporting={isExporting}
			onShare={handleShare}
			hasResult={!!remortgageResult}
		>
			{remortgageResult && (
				<RemortgageResultCard
					result={remortgageResult.result}
					remainingTermMonths={remortgageResult.remainingTermMonths}
					fixedPeriodMonths={remortgageResult.fixedPeriodMonths}
				/>
			)}
		</BreakevenResultDialog>
	);
}
