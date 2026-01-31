import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { DrawdownStage } from "@/lib/schemas/simulate";
import { SimulateDrawdownForm } from "./SimulateDrawdownForm";
import type { TimingMode } from "./SimulateMonthSelector";

interface SimulateAddDrawdownDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd: (stage: Omit<DrawdownStage, "id">) => void;
    mortgageAmount: number;
    totalDrawn: number;
    startDate?: string;
}

export function SimulateAddDrawdownDialog({
    open,
    onOpenChange,
    onAdd,
    mortgageAmount,
    totalDrawn,
    startDate,
}: SimulateAddDrawdownDialogProps) {
    const [month, setMonth] = useState(1);
    const [amount, setAmount] = useState(""); // Raw digits string (euros)
    const [label, setLabel] = useState<string>("Site Purchase");
    const [isCustomLabel, setIsCustomLabel] = useState(false);
    const [timingMode, setTimingMode] = useState<TimingMode>(
        startDate ? "calendar" : "duration",
    );

    const remainingAmount = mortgageAmount - totalDrawn;
    const isFirstStage = totalDrawn === 0;
    const amountEuros = Number.parseInt(amount, 10) || 0;
    const amountCents = amountEuros * 100;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (amountCents <= 0) return;

        onAdd({
            // First stage must be at month 1
            month: isFirstStage ? 1 : month,
            amount: amountCents,
            label: label || undefined,
        });

        // Reset form
        setMonth((prev) => prev + 3); // Default to 3 months later for next stage
        setAmount("");
        setLabel("Site Purchase");
        setIsCustomLabel(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add Drawdown Stage</DialogTitle>
                        <DialogDescription>
                            Add a stage when funds will be drawn from your
                            mortgage.
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
                            isFirstStage={isFirstStage}
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
                            Add Drawdown
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
