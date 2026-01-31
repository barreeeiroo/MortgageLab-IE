import { useStore } from "@nanostores/react";
import { useCallback, useState } from "react";
import { exportCashbackToPDF } from "@/lib/export/breakeven-export";
import { generateBreakevenShareUrl } from "@/lib/share/breakeven";
import {
    $cashbackDialogOpen,
    $cashbackResult,
    closeCashbackDialog,
} from "@/lib/stores/breakeven";
import { BreakevenResultDialog } from "../BreakevenResultDialog";
import { CashbackResultCard } from "./CashbackResultCard";

export function CashbackResultIsland() {
    const cashbackResult = useStore($cashbackResult);
    const cashbackDialogOpen = useStore($cashbackDialogOpen);

    const [isExporting, setIsExporting] = useState(false);

    const handleExportCashback = useCallback(async () => {
        if (!cashbackResult) return;
        setIsExporting(true);
        try {
            const shareUrl = generateBreakevenShareUrl(
                cashbackResult.shareState,
            );
            // Map overpayment allowances to export format
            const overpaymentAllowances =
                cashbackResult.overpaymentAllowances?.map(
                    (allowance, index) => ({
                        label: cashbackResult.result.options[index].label,
                        policyLabel: allowance.policy?.label,
                        totalAllowance: allowance.totalAllowance,
                    }),
                );
            await exportCashbackToPDF({
                result: cashbackResult.result,
                mortgageAmount: cashbackResult.mortgageAmount,
                mortgageTermMonths: cashbackResult.mortgageTermMonths,
                overpaymentAllowances,
                shareUrl,
            });
        } finally {
            setIsExporting(false);
        }
    }, [cashbackResult]);

    const handleShare = useCallback(async () => {
        if (!cashbackResult) return "";
        return generateBreakevenShareUrl(cashbackResult.shareState);
    }, [cashbackResult]);

    return (
        <BreakevenResultDialog
            open={cashbackDialogOpen}
            onOpenChange={(open) => {
                if (!open) closeCashbackDialog();
            }}
            title="Cashback Comparison"
            description="Compare different rate and cashback combinations to find the cheapest option over time."
            onExport={handleExportCashback}
            isExporting={isExporting}
            onShare={handleShare}
            hasResult={!!cashbackResult}
        >
            {cashbackResult && (
                <CashbackResultCard
                    result={cashbackResult.result}
                    mortgageTermMonths={cashbackResult.mortgageTermMonths}
                    overpaymentAllowances={cashbackResult.overpaymentAllowances}
                />
            )}
        </BreakevenResultDialog>
    );
}
