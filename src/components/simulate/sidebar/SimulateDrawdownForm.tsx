import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { formatCurrencyInput } from "@/lib/utils/currency";
import {
    SimulateMonthSelector,
    type TimingMode,
} from "./SimulateMonthSelector";

// Common stage label presets
export const STAGE_PRESETS = [
    "Site Purchase",
    "Foundations",
    "Substructure",
    "Floor Level",
    "Roof Level",
    "Finished Property",
    "Post Completion",
] as const;

interface SimulateDrawdownFormProps {
    month: number;
    setMonth: (month: number) => void;
    amount: string;
    setAmount: (amount: string) => void;
    label: string;
    setLabel: (label: string) => void;
    isCustomLabel: boolean;
    setIsCustomLabel: (isCustom: boolean) => void;
    timingMode: TimingMode;
    setTimingMode: (mode: TimingMode) => void;
    mortgageAmount: number;
    remainingAmount: number;
    startDate?: string;
    /** When true, month is locked to 1 (first stage must start at month 1) */
    isFirstStage?: boolean;
}

export function SimulateDrawdownForm({
    month,
    setMonth,
    amount,
    setAmount,
    label,
    setLabel,
    isCustomLabel,
    setIsCustomLabel,
    timingMode,
    setTimingMode,
    mortgageAmount,
    remainingAmount,
    startDate,
    isFirstStage = false,
}: SimulateDrawdownFormProps) {
    const handleLabelPreset = (preset: string) => {
        if (preset === "custom") {
            setIsCustomLabel(true);
            setLabel("");
        } else {
            setIsCustomLabel(false);
            setLabel(preset);
        }
    };

    return (
        <>
            {/* Month */}
            {isFirstStage ? (
                <div className="grid gap-2">
                    <Label>When</Label>
                    <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                        Month 1 (first stage)
                    </div>
                </div>
            ) : (
                <SimulateMonthSelector
                    label="When"
                    month={month}
                    setMonth={setMonth}
                    minMonth={1}
                    maxMonth={120}
                    startDate={startDate}
                    timingMode={timingMode}
                    setTimingMode={setTimingMode}
                />
            )}

            {/* Amount */}
            <div className="grid gap-2">
                <Label htmlFor="drawdown_amount">Amount</Label>
                <Input
                    id="drawdown_amount"
                    type="text"
                    inputMode="numeric"
                    placeholder="€50,000"
                    value={amount ? formatCurrencyInput(amount) : ""}
                    onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, "");
                        setAmount(raw);
                    }}
                />
                <div className="flex flex-wrap gap-1">
                    {[10, 15, 20, 25, 30, 35].map((pct) => {
                        // mortgageAmount is in cents, calculate euros
                        const pctAmount = Math.round(
                            (mortgageAmount / 100) * (pct / 100),
                        );
                        return (
                            <Button
                                key={pct}
                                type="button"
                                variant="ghost"
                                disabled={mortgageAmount === 0}
                                onClick={() => setAmount(String(pctAmount))}
                                className="h-5 px-1.5 text-[10px] text-muted-foreground"
                            >
                                {pct}%
                            </Button>
                        );
                    })}
                    {remainingAmount > 0 && (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() =>
                                setAmount(
                                    String(Math.round(remainingAmount / 100)),
                                )
                            }
                            className="h-5 px-1.5 text-[10px] text-muted-foreground"
                        >
                            Remaining
                        </Button>
                    )}
                </div>
            </div>

            {/* Label */}
            <div className="grid gap-2">
                <Label htmlFor="drawdown_label">Stage Label</Label>
                <Select
                    value={isCustomLabel ? "custom" : label}
                    onValueChange={handleLabelPreset}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select or enter custom" />
                    </SelectTrigger>
                    <SelectContent>
                        {STAGE_PRESETS.map((preset) => (
                            <SelectItem key={preset} value={preset}>
                                {preset}
                            </SelectItem>
                        ))}
                        <SelectItem value="custom">Custom...</SelectItem>
                    </SelectContent>
                </Select>
                {isCustomLabel && (
                    <Input
                        id="drawdown_label"
                        type="text"
                        placeholder="e.g., First Fix Complete"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                    />
                )}
            </div>
        </>
    );
}
