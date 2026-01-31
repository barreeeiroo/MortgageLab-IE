import { Scissors } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import type { AmortizationMonth } from "@/lib/schemas/simulate";

interface TrimOption {
    label: string;
    description: string;
    durationMonths: number;
}

interface SimulateTrimDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onTrim: (durationMonths: number) => void;
    periodStartMonth: number;
    propertyValue: number;
    amortizationSchedule: AmortizationMonth[];
    /** Whether this is the first rate period in the simulation */
    isFirstRate?: boolean;
}

export function SimulateTrimDialog({
    open,
    onOpenChange,
    onTrim,
    periodStartMonth,
    propertyValue,
    amortizationSchedule,
    isFirstRate = false,
}: SimulateTrimDialogProps) {
    // Calculate available trim options based on LTV thresholds
    const trimOptions = useMemo(() => {
        const options: TrimOption[] = [];

        // Show "Trim to 1 month" option only for non-first rates
        // (first rate needs at least some duration before switching)
        if (!isFirstRate) {
            options.push({
                label: "Trim to 1 month",
                description:
                    "Reduces this rate period to 1 month. Useful to apply an overpayment before switching to a different rate.",
                durationMonths: 1,
            });
        }

        if (propertyValue <= 0 || amortizationSchedule.length === 0) {
            return options;
        }

        // Find the balance at the start of this rate period
        const startMonthData = amortizationSchedule.find(
            (m) => m.month === periodStartMonth,
        );
        const startBalance =
            startMonthData?.openingBalance ??
            amortizationSchedule[0]?.openingBalance;

        if (!startBalance) {
            return options;
        }

        const startLtv = (startBalance / propertyValue) * 100;

        // LTV thresholds to check (in descending order)
        // Based on Irish mortgage market rate bands
        const ltvThresholds = [
            { ltv: 80, label: "below 80% LTV" },
            { ltv: 70, label: "below 70% LTV" },
            { ltv: 60, label: "below 60% LTV" },
            { ltv: 50, label: "below 50% LTV" },
        ];

        for (const threshold of ltvThresholds) {
            // Only show if starting LTV is above this threshold
            if (startLtv <= threshold.ltv) {
                continue;
            }

            // Find the first month where balance drops below this LTV threshold
            const targetBalance = propertyValue * (threshold.ltv / 100);
            const targetMonth = amortizationSchedule.find(
                (m) =>
                    m.month >= periodStartMonth &&
                    m.closingBalance < targetBalance,
            );

            if (targetMonth) {
                const durationMonths = targetMonth.month - periodStartMonth + 1;

                // Calculate what month/year this represents
                const years = Math.floor(durationMonths / 12);
                const months = durationMonths % 12;
                const durationText =
                    years > 0
                        ? months > 0
                            ? `${years}y ${months}m`
                            : `${years} year${years !== 1 ? "s" : ""}`
                        : `${months} month${months !== 1 ? "s" : ""}`;

                options.push({
                    label: `Trim to ${threshold.label}`,
                    description: `Ends after ${durationText} when your LTV drops below ${threshold.ltv}%.`,
                    durationMonths,
                });
            }
        }

        return options;
    }, [periodStartMonth, propertyValue, amortizationSchedule, isFirstRate]);

    const handleSelect = (option: TrimOption) => {
        onTrim(option.durationMonths);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Scissors className="h-3.5 w-3.5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Trim Rate Period</DialogTitle>
                    <DialogDescription>
                        Choose how to shorten this variable rate period.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 pt-2">
                    {trimOptions.map((option) => (
                        <button
                            key={option.durationMonths}
                            type="button"
                            className="w-full flex flex-col gap-0.5 p-3 rounded-lg border text-left transition-colors hover:bg-muted/50 cursor-pointer"
                            onClick={() => handleSelect(option)}
                        >
                            <span className="font-medium text-sm">
                                {option.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {option.description}
                            </span>
                        </button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
