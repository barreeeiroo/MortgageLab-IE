import { Info } from "lucide-react";
import { LenderLogo } from "@/components/lenders/LenderLogo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type {
    OverpaymentFrequency,
    ResolvedRatePeriod,
} from "@/lib/schemas/simulate";
import { formatCurrencyInput } from "@/lib/utils/currency";
import { formatTransitionDate } from "@/lib/utils/date";
import {
    SimulateTimingSelector,
    type TimingMode,
} from "./SimulateTimingSelector";

interface SimulateOverpaymentFormProps {
    type: "one_time" | "recurring";
    frequency?: OverpaymentFrequency;
    setFrequency?: (freq: OverpaymentFrequency) => void;
    amount: string;
    setAmount: (amount: string) => void;
    startMonth: number;
    setStartMonth: (month: number) => void;
    endMonth?: number | undefined;
    setEndMonth?: (month: number | undefined) => void;
    effect: "reduce_term" | "reduce_payment";
    setEffect: (effect: "reduce_term" | "reduce_payment") => void;
    label: string;
    setLabel: (label: string) => void;
    totalMonths: number;
    startDate?: string;
    timingMode: TimingMode;
    setTimingMode: (mode: TimingMode) => void;
    // Rate period selection props
    resolvedRatePeriods: ResolvedRatePeriod[];
    selectedRatePeriodId: string;
    setSelectedRatePeriodId: (id: string) => void;
    periodBounds: { startMonth: number; endMonth: number } | null;
    isFixedPeriod: boolean;
    isEditing: boolean;
}

export function SimulateOverpaymentForm({
    type,
    frequency = "monthly",
    setFrequency,
    amount,
    setAmount,
    startMonth,
    setStartMonth,
    endMonth,
    setEndMonth,
    effect,
    setEffect,
    label,
    setLabel,
    totalMonths,
    startDate,
    timingMode,
    setTimingMode,
    resolvedRatePeriods,
    selectedRatePeriodId,
    setSelectedRatePeriodId,
    periodBounds,
    isFixedPeriod,
    isEditing,
}: SimulateOverpaymentFormProps) {
    return (
        <>
            {/* Rate Period Selection */}
            <div className="space-y-2">
                <Label>Rate Period</Label>
                <Select
                    value={selectedRatePeriodId}
                    onValueChange={setSelectedRatePeriodId}
                    disabled={isEditing}
                >
                    <SelectTrigger
                        className={`w-full ${isEditing ? "opacity-60" : ""}`}
                    >
                        <SelectValue placeholder="Select a rate period" />
                    </SelectTrigger>
                    <SelectContent>
                        {resolvedRatePeriods.map((period) => (
                            <SelectItem key={period.id} value={period.id}>
                                <div className="flex items-center gap-2">
                                    <LenderLogo
                                        lenderId={period.lenderId}
                                        size={20}
                                        isCustom={period.isCustom}
                                    />
                                    <span>{period.rateName}</span>
                                    <span className="text-muted-foreground">
                                        (
                                        {formatTransitionDate(
                                            startDate,
                                            period.startMonth,
                                            {
                                                short: true,
                                            },
                                        )}
                                        )
                                    </span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Info message for fixed periods (only when adding) */}
                {!isEditing && isFixedPeriod && (
                    <div className="flex items-start gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 rounded-md p-2">
                        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <p>
                            This is a fixed rate period. Consider using the
                            Maximize tab for optimal fee-free overpayments.
                        </p>
                    </div>
                )}
            </div>

            {/* Frequency Selection (for recurring only) */}
            {type === "recurring" && setFrequency && (
                <div className="space-y-2">
                    <Label>Frequency</Label>
                    <RadioGroup
                        value={frequency}
                        onValueChange={(v) =>
                            setFrequency(v as OverpaymentFrequency)
                        }
                        className="flex gap-4"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="monthly" id="freq_monthly" />
                            <Label
                                htmlFor="freq_monthly"
                                className="font-normal cursor-pointer"
                            >
                                Monthly
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem
                                value="quarterly"
                                id="freq_quarterly"
                            />
                            <Label
                                htmlFor="freq_quarterly"
                                className="font-normal cursor-pointer"
                            >
                                Quarterly
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yearly" id="freq_yearly" />
                            <Label
                                htmlFor="freq_yearly"
                                className="font-normal cursor-pointer"
                            >
                                Yearly
                            </Label>
                        </div>
                    </RadioGroup>
                </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
                <Label htmlFor="overpayment_amount">
                    Amount
                    {type === "recurring" &&
                        (frequency === "monthly"
                            ? " (per month)"
                            : frequency === "quarterly"
                              ? " (per quarter)"
                              : " (per year)")}
                </Label>
                <Input
                    id="overpayment_amount"
                    type="text"
                    inputMode="numeric"
                    placeholder="€1,000"
                    value={amount ? formatCurrencyInput(amount) : ""}
                    onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, "");
                        setAmount(raw);
                    }}
                    className="w-full"
                />
            </div>

            {/* Timing Section */}
            <SimulateTimingSelector
                type={type}
                startMonth={startMonth}
                setStartMonth={setStartMonth}
                endMonth={endMonth}
                setEndMonth={setEndMonth}
                totalMonths={totalMonths}
                startDate={startDate}
                timingMode={timingMode}
                setTimingMode={setTimingMode}
                periodBounds={periodBounds}
            />

            {/* Effect */}
            <div className="space-y-2">
                <Label>Effect</Label>
                <Select
                    value={effect}
                    onValueChange={(v) =>
                        setEffect(v as "reduce_term" | "reduce_payment")
                    }
                >
                    <SelectTrigger className="w-full">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="reduce_term">
                            <span>
                                Reduce term{" "}
                                <span className="text-muted-foreground">
                                    (keep payment, pay off faster)
                                </span>
                            </span>
                        </SelectItem>
                        <SelectItem value="reduce_payment">
                            <span>
                                Reduce payment{" "}
                                <span className="text-muted-foreground">
                                    (keep term, lower monthly payment)
                                </span>
                            </span>
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Label */}
            <div className="space-y-2">
                <Label htmlFor="overpayment_label">Note</Label>
                <Input
                    id="overpayment_label"
                    placeholder="e.g., Annual bonus"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                />
            </div>
        </>
    );
}
