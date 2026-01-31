import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { ResolvedDrawdownStage } from "@/lib/mortgage/self-build";
import type { DrawdownStage } from "@/lib/schemas/simulate";
import { SimulateDrawdownForm, STAGE_PRESETS } from "./SimulateDrawdownForm";
import type { TimingMode } from "./SimulateMonthSelector";

interface SimulateEditDrawdownDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (stage: Omit<DrawdownStage, "id">) => void;
    editingStage: ResolvedDrawdownStage;
    mortgageAmount: number;
    totalDrawn: number;
    startDate?: string;
}

export function SimulateEditDrawdownDialog({
    open,
    onOpenChange,
    onSave,
    editingStage,
    mortgageAmount,
    totalDrawn,
    startDate,
}: SimulateEditDrawdownDialogProps) {
    // Form state
    const [month, setMonth] = useState(editingStage.month);
    const [amount, setAmount] = useState(
        String(Math.round(editingStage.amount / 100)),
    );
    const [label, setLabel] = useState(editingStage.label || "");
    const [isCustomLabel, setIsCustomLabel] = useState(
        !STAGE_PRESETS.includes(
            editingStage.label as (typeof STAGE_PRESETS)[number],
        ),
    );
    const [timingMode, setTimingMode] = useState<TimingMode>(
        startDate ? "calendar" : "duration",
    );

    // Remaining amount excludes the currently editing stage's amount
    const remainingAmount = mortgageAmount - totalDrawn + editingStage.amount;

    const amountEuros = Number.parseInt(amount, 10) || 0;
    const amountCents = amountEuros * 100;

    // Reset form when editingStage changes
    useEffect(() => {
        setMonth(editingStage.month);
        setAmount(String(Math.round(editingStage.amount / 100)));
        setLabel(editingStage.label || "");
        setIsCustomLabel(
            !STAGE_PRESETS.includes(
                editingStage.label as (typeof STAGE_PRESETS)[number],
            ),
        );
        setTimingMode(startDate ? "calendar" : "duration");
    }, [editingStage, startDate]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (amountCents <= 0) return;

        onSave({
            month,
            amount: amountCents,
            label: label || undefined,
        });

        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Edit Drawdown Stage</DialogTitle>
                        <DialogDescription>
                            Modify this drawdown stage configuration.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <SimulateDrawdownForm
                            month={month}
                            setMonth={setMonth}
                            amount={amount}
                            setAmount={setAmount}
                            label={label}
                            setLabel={setLabel}
                            isCustomLabel={isCustomLabel}
                            setIsCustomLabel={setIsCustomLabel}
                            timingMode={timingMode}
                            setTimingMode={setTimingMode}
                            mortgageAmount={mortgageAmount}
                            remainingAmount={remainingAmount}
                            startDate={startDate}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={amountCents <= 0}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
