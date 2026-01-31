import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type {
    OverpaymentConfig,
    OverpaymentFrequency,
    ResolvedRatePeriod,
} from "@/lib/schemas/simulate";
import { parseCurrency } from "@/lib/utils/currency";
import { SimulateOverpaymentForm } from "./SimulateOverpaymentForm";
import type { TimingMode } from "./SimulateTimingSelector";

interface SimulateEditOverpaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (config: Omit<OverpaymentConfig, "id">) => void;
    editingConfig: OverpaymentConfig;
    totalMonths: number;
    resolvedRatePeriods: ResolvedRatePeriod[];
    startDate?: string;
}

export function SimulateEditOverpaymentDialog({
    open,
    onOpenChange,
    onSave,
    editingConfig,
    totalMonths,
    resolvedRatePeriods,
    startDate,
}: SimulateEditOverpaymentDialogProps) {
    // Form state
    const [ratePeriodId, setRatePeriodId] = useState(
        editingConfig.ratePeriodId,
    );
    const [frequency, setFrequency] = useState<OverpaymentFrequency>(
        editingConfig.frequency ?? "monthly",
    );
    const [amount, setAmount] = useState(
        String(Math.round(editingConfig.amount / 100)),
    );
    const [startMonth, setStartMonth] = useState(editingConfig.startMonth);
    const [endMonth, setEndMonth] = useState<number | undefined>(
        editingConfig.endMonth,
    );
    const [effect, setEffect] = useState<"reduce_term" | "reduce_payment">(
        editingConfig.effect,
    );
    const [label, setLabel] = useState(editingConfig.label || "");
    const [timingMode, setTimingMode] = useState<TimingMode>(
        startDate ? "calendar" : "duration",
    );

    // Get bounds for the rate period
    const periodBounds = useMemo(() => {
        const period = resolvedRatePeriods.find((p) => p.id === ratePeriodId);
        if (!period) return null;

        const periodEndMonth =
            period.durationMonths === 0
                ? totalMonths
                : period.startMonth + period.durationMonths - 1;

        return {
            startMonth: period.startMonth,
            endMonth: periodEndMonth,
            period,
        };
    }, [ratePeriodId, resolvedRatePeriods, totalMonths]);

    // Check if period is fixed
    const isFixedPeriod = periodBounds?.period?.type === "fixed";

    // Reset form when editingConfig changes
    useEffect(() => {
        setRatePeriodId(editingConfig.ratePeriodId);
        setFrequency(editingConfig.frequency ?? "monthly");
        setAmount(String(Math.round(editingConfig.amount / 100)));
        setStartMonth(editingConfig.startMonth);
        setEndMonth(editingConfig.endMonth);
        setEffect(editingConfig.effect);
        setLabel(editingConfig.label || "");
        setTimingMode(startDate ? "calendar" : "duration");
    }, [editingConfig, startDate]);

    // Ensure endMonth is set for non-final rate periods (no "until end" option)
    useEffect(() => {
        if (periodBounds && editingConfig.type === "recurring") {
            const isPeriodUntilEnd = periodBounds.endMonth === totalMonths;
            if (!isPeriodUntilEnd && endMonth === undefined) {
                setEndMonth(periodBounds.endMonth);
            }
        }
    }, [periodBounds, endMonth, totalMonths, editingConfig.type]);

    const handleSubmit = () => {
        const amountValue = parseCurrency(amount);
        const amountCents = Math.round(amountValue * 100);
        if (amountCents <= 0 || !ratePeriodId) return;

        onSave({
            ratePeriodId,
            type: editingConfig.type,
            amount: amountCents,
            startMonth,
            endMonth: editingConfig.type === "recurring" ? endMonth : undefined,
            frequency:
                editingConfig.type === "recurring" ? frequency : undefined,
            effect,
            enabled: true,
            label: label || undefined,
        });

        onOpenChange(false);
    };

    const amountNum = parseCurrency(amount);
    const isValid = amountNum > 0 && startMonth >= 1 && !!ratePeriodId;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
                <DialogHeader className="shrink-0">
                    <DialogTitle>
                        {editingConfig.type === "one_time"
                            ? "Edit One Time Overpayment"
                            : "Edit Recurring Overpayment"}
                    </DialogTitle>
                    <DialogDescription>
                        Modify this overpayment configuration.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
                    <div className="space-y-4 py-4">
                        <SimulateOverpaymentForm
                            type={editingConfig.type}
                            frequency={frequency}
                            setFrequency={setFrequency}
                            amount={amount}
                            setAmount={setAmount}
                            startMonth={startMonth}
                            setStartMonth={setStartMonth}
                            endMonth={endMonth}
                            setEndMonth={setEndMonth}
                            effect={effect}
                            setEffect={setEffect}
                            label={label}
                            setLabel={setLabel}
                            totalMonths={totalMonths}
                            startDate={startDate}
                            timingMode={timingMode}
                            setTimingMode={setTimingMode}
                            resolvedRatePeriods={resolvedRatePeriods}
                            selectedRatePeriodId={ratePeriodId}
                            setSelectedRatePeriodId={setRatePeriodId}
                            periodBounds={periodBounds}
                            isFixedPeriod={isFixedPeriod}
                            isEditing={true}
                        />
                    </div>
                </div>

                <DialogFooter className="shrink-0 border-t pt-4">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!isValid}>
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
