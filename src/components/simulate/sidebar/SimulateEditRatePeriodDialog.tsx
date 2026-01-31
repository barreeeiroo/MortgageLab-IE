import { AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LenderLogo } from "@/components/lenders/LenderLogo";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Lender } from "@/lib/schemas/lender";
import type { MortgageRate } from "@/lib/schemas/rate";
import type { OverpaymentConfig, RatePeriod } from "@/lib/schemas/simulate";
import type { CustomRate } from "@/lib/stores/custom-rates";
import { getAffectedOverpaymentsByDurationChange } from "@/lib/stores/simulate/simulate-state";
import { formatMonthName, getCalendarDate } from "@/lib/utils/date";

type DurationMode = "calendar" | "duration" | "end";

interface EditRatePeriodDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (period: Omit<RatePeriod, "id">) => void;
    rates: MortgageRate[];
    customRates: CustomRate[];
    lenders: Lender[];
    totalMonths: number;
    mortgageAmount: number;
    propertyValue: number;
    editingPeriod: RatePeriod;
    isLastPeriod?: boolean;
    startDate?: string;
    periodStartMonth?: number;
    // For overpayment adjustment warnings
    ratePeriods?: RatePeriod[];
    overpaymentConfigs?: OverpaymentConfig[];
}

interface RateInfo {
    rate: number;
    type: "fixed" | "variable";
    fixedTerm?: number;
    lenderName: string;
    name: string;
    isCustom: boolean;
}

export function SimulateEditRatePeriodDialog({
    open,
    onOpenChange,
    onSave,
    rates,
    customRates,
    lenders,
    totalMonths,
    editingPeriod,
    isLastPeriod = true,
    startDate,
    periodStartMonth = 1,
    ratePeriods = [],
    overpaymentConfigs = [],
}: EditRatePeriodDialogProps) {
    const [durationMode, setDurationMode] = useState<DurationMode>("duration");
    const [durationYears, setDurationYears] = useState(0);
    const [durationExtraMonths, setDurationExtraMonths] = useState(0);
    const [targetYear, setTargetYear] = useState(new Date().getFullYear());
    const [targetMonth, setTargetMonth] = useState(1);
    const [customLabel, setCustomLabel] = useState("");

    // Find the rate info for display
    const rateInfo = useMemo((): RateInfo | null => {
        if (editingPeriod.isCustom) {
            const rate = customRates.find((r) => r.id === editingPeriod.rateId);
            if (rate) {
                return {
                    rate: rate.rate,
                    type: rate.type,
                    fixedTerm: rate.fixedTerm,
                    lenderName: rate.customLenderName || "Custom",
                    name: rate.name,
                    isCustom: true,
                };
            }
        } else {
            const rate = rates.find(
                (r) =>
                    r.id === editingPeriod.rateId &&
                    r.lenderId === editingPeriod.lenderId,
            );
            if (rate) {
                const lender = lenders.find((l) => l.id === rate.lenderId);
                return {
                    rate: rate.rate,
                    type: rate.type,
                    fixedTerm: rate.fixedTerm,
                    lenderName: lender?.name || rate.lenderId,
                    name: rate.name,
                    isCustom: false,
                };
            }
        }
        return null;
    }, [editingPeriod, rates, customRates, lenders]);

    // Compute effective duration based on mode
    const durationMonths = useMemo(() => {
        if (durationMode === "end") return 0;
        if (durationMode === "calendar") {
            if (startDate) {
                const periodStartDate = getCalendarDate(
                    startDate,
                    periodStartMonth - 1,
                );
                const periodStartYear = periodStartDate.getFullYear();
                const periodStartMonthNum = periodStartDate.getMonth() + 1;
                const periodStartTotal =
                    periodStartYear * 12 + (periodStartMonthNum - 1);
                const targetTotal = targetYear * 12 + (targetMonth - 1);
                return Math.max(0, targetTotal - periodStartTotal);
            }
            const targetAbsoluteMonth = (targetYear - 1) * 12 + targetMonth;
            return Math.max(0, targetAbsoluteMonth - periodStartMonth);
        }
        return durationYears * 12 + durationExtraMonths;
    }, [
        durationMode,
        durationYears,
        durationExtraMonths,
        startDate,
        periodStartMonth,
        targetYear,
        targetMonth,
    ]);

    // Helper to calculate calendar values from duration
    const calcCalendarFromDuration = useCallback(
        (months: number) => {
            if (startDate) {
                const targetDate = getCalendarDate(
                    startDate,
                    periodStartMonth - 1 + months,
                );
                return {
                    year: targetDate.getFullYear(),
                    month: targetDate.getMonth() + 1,
                };
            }
            const targetAbsMonth = periodStartMonth + months;
            return {
                year: Math.ceil(targetAbsMonth / 12),
                month: ((targetAbsMonth - 1) % 12) + 1,
            };
        },
        [startDate, periodStartMonth],
    );

    // Reset form when opening
    useEffect(() => {
        if (open && editingPeriod) {
            setDurationYears(Math.floor(editingPeriod.durationMonths / 12));
            setDurationExtraMonths(editingPeriod.durationMonths % 12);

            const calVals = calcCalendarFromDuration(
                editingPeriod.durationMonths,
            );
            setTargetYear(calVals.year);
            setTargetMonth(calVals.month);

            if (editingPeriod.durationMonths === 0) {
                setDurationMode("end");
            } else if (startDate) {
                setDurationMode("calendar");
            } else {
                setDurationMode("duration");
            }

            setCustomLabel(editingPeriod.label || "");
        }
    }, [open, editingPeriod, startDate, calcCalendarFromDuration]);

    // Track previous duration mode
    const [prevDurationMode, setPrevDurationMode] =
        useState<DurationMode | null>(null);

    // Sync values when switching between modes
    useEffect(() => {
        if (prevDurationMode === "duration" && durationMode === "calendar") {
            const months = durationYears * 12 + durationExtraMonths;
            if (startDate) {
                const targetDate = getCalendarDate(
                    startDate,
                    periodStartMonth - 1 + months,
                );
                setTargetYear(targetDate.getFullYear());
                setTargetMonth(targetDate.getMonth() + 1);
            } else {
                const targetAbsMonth = periodStartMonth + months;
                setTargetYear(Math.ceil(targetAbsMonth / 12));
                setTargetMonth(((targetAbsMonth - 1) % 12) + 1);
            }
        } else if (
            prevDurationMode === "calendar" &&
            durationMode === "duration"
        ) {
            setDurationYears(Math.floor(durationMonths / 12));
            setDurationExtraMonths(durationMonths % 12);
        }
        setPrevDurationMode(durationMode);
    }, [
        durationMode,
        prevDurationMode,
        durationYears,
        durationExtraMonths,
        durationMonths,
        startDate,
        periodStartMonth,
    ]);

    // Check if duration is locked
    const isDurationLocked =
        (rateInfo?.type === "fixed" && !!rateInfo.fixedTerm) || !isLastPeriod;

    // Calculate affected overpayments when duration is shortened
    const affectedOverpayments = useMemo(() => {
        if (
            ratePeriods.length === 0 ||
            overpaymentConfigs.length === 0 ||
            isDurationLocked
        ) {
            return { toDelete: [], toAdjust: [] };
        }

        // Only calculate if duration is being shortened
        const currentDuration = editingPeriod.durationMonths;
        if (durationMonths >= currentDuration && currentDuration !== 0) {
            // Extending or keeping the same, or "until end" - no overpayments affected
            return { toDelete: [], toAdjust: [] };
        }

        // If changing FROM "until end" (0) to a specific duration, need to check
        // Or if shortening an existing duration
        return getAffectedOverpaymentsByDurationChange(
            ratePeriods,
            editingPeriod.id,
            durationMonths,
            totalMonths,
            overpaymentConfigs,
        );
    }, [
        ratePeriods,
        overpaymentConfigs,
        editingPeriod.id,
        editingPeriod.durationMonths,
        durationMonths,
        totalMonths,
        isDurationLocked,
    ]);

    const hasAffectedOverpayments =
        affectedOverpayments.toDelete.length > 0 ||
        affectedOverpayments.toAdjust.length > 0;

    const handleSubmit = () => {
        if (!rateInfo) return;

        const label =
            customLabel ||
            (rateInfo.type === "fixed" && rateInfo.fixedTerm
                ? `${rateInfo.lenderName} ${rateInfo.fixedTerm}-Year Fixed @ ${rateInfo.rate}%`
                : `${rateInfo.lenderName} Variable @ ${rateInfo.rate}%`);

        onSave({
            lenderId: editingPeriod.lenderId,
            rateId: editingPeriod.rateId,
            isCustom: editingPeriod.isCustom,
            durationMonths,
            label,
        });

        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
                <DialogHeader className="shrink-0">
                    <DialogTitle>Edit Rate Period</DialogTitle>
                    <DialogDescription>
                        {isLastPeriod && rateInfo?.type === "variable"
                            ? "Update the duration or label for this rate period."
                            : "Update the label for this rate period."}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
                    <div className="space-y-4 py-4">
                        {/* Rate Display (read-only) */}
                        <div className="space-y-2">
                            <Label>Rate</Label>
                            {rateInfo ? (
                                <div className="flex items-center gap-3 rounded-md border border-input bg-muted p-3">
                                    <LenderLogo
                                        lenderId={editingPeriod.lenderId}
                                        size={32}
                                        isCustom={rateInfo.isCustom}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm truncate">
                                                {rateInfo.name}
                                            </span>
                                            <span
                                                className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                    rateInfo.type === "fixed"
                                                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                                        : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                                }`}
                                            >
                                                {rateInfo.type === "fixed"
                                                    ? "Fix"
                                                    : "Var"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>{rateInfo.lenderName}</span>
                                            <span>•</span>
                                            <span className="font-medium text-foreground">
                                                {rateInfo.rate.toFixed(2)}%
                                            </span>
                                            {rateInfo.type === "fixed" &&
                                                rateInfo.fixedTerm && (
                                                    <>
                                                        <span>•</span>
                                                        <span>
                                                            {rateInfo.fixedTerm}
                                                            -year term
                                                        </span>
                                                    </>
                                                )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-md border border-input bg-muted p-3 text-sm text-muted-foreground">
                                    Rate not found
                                </div>
                            )}
                        </div>

                        {/* Duration */}
                        <div className="space-y-2">
                            <Label>Until</Label>
                            {isDurationLocked ? (
                                <div className="space-y-1.5">
                                    <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm">
                                        {rateInfo?.type === "fixed" &&
                                        rateInfo.fixedTerm ? (
                                            <>
                                                {rateInfo.fixedTerm} year
                                                {rateInfo.fixedTerm !== 1 &&
                                                    "s"}{" "}
                                                (fixed term)
                                            </>
                                        ) : durationMonths === 0 ? (
                                            "End of mortgage"
                                        ) : (
                                            <>
                                                {durationYears > 0 &&
                                                    `${durationYears} year${durationYears !== 1 ? "s" : ""}`}
                                                {durationYears > 0 &&
                                                    durationExtraMonths > 0 &&
                                                    " "}
                                                {durationExtraMonths > 0 &&
                                                    `${durationExtraMonths} month${durationExtraMonths !== 1 ? "s" : ""}`}
                                            </>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {rateInfo?.type === "fixed"
                                            ? "Fixed rate duration is determined by the rate's fixed term"
                                            : "Duration cannot be changed for earlier rate periods"}
                                    </p>
                                </div>
                            ) : (
                                <Tabs
                                    value={durationMode}
                                    onValueChange={(v) =>
                                        setDurationMode(v as DurationMode)
                                    }
                                >
                                    <TabsList>
                                        <TabsTrigger
                                            value="calendar"
                                            className="text-xs"
                                        >
                                            Natural Calendar
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="duration"
                                            className="text-xs"
                                        >
                                            Mortgage Duration
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="end"
                                            className="text-xs"
                                        >
                                            End Of Mortgage
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent
                                        value="calendar"
                                        className="mt-3"
                                    >
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label
                                                    htmlFor="targetYear"
                                                    className="text-xs text-muted-foreground"
                                                >
                                                    Year
                                                </Label>
                                                <Select
                                                    key={`year-${durationMode}-${targetYear}`}
                                                    value={String(targetYear)}
                                                    onValueChange={(v) =>
                                                        setTargetYear(Number(v))
                                                    }
                                                >
                                                    <SelectTrigger
                                                        id="targetYear"
                                                        className="w-full"
                                                    >
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {startDate
                                                            ? Array.from(
                                                                  {
                                                                      length: 40,
                                                                  },
                                                                  (_, i) => {
                                                                      const year =
                                                                          new Date().getFullYear() +
                                                                          i;
                                                                      return (
                                                                          <SelectItem
                                                                              key={
                                                                                  year
                                                                              }
                                                                              value={String(
                                                                                  year,
                                                                              )}
                                                                          >
                                                                              {
                                                                                  year
                                                                              }
                                                                          </SelectItem>
                                                                      );
                                                                  },
                                                              )
                                                            : Array.from(
                                                                  {
                                                                      length: Math.max(
                                                                          Math.ceil(
                                                                              totalMonths /
                                                                                  12,
                                                                          ) + 1,
                                                                          targetYear +
                                                                              1,
                                                                      ),
                                                                  },
                                                                  (_, i) =>
                                                                      i + 1,
                                                              ).map((year) => (
                                                                  <SelectItem
                                                                      key={year}
                                                                      value={String(
                                                                          year,
                                                                      )}
                                                                  >
                                                                      Year{" "}
                                                                      {year}
                                                                  </SelectItem>
                                                              ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label
                                                    htmlFor="targetMonth"
                                                    className="text-xs text-muted-foreground"
                                                >
                                                    Month
                                                </Label>
                                                <Select
                                                    key={`month-${durationMode}-${targetMonth}`}
                                                    value={String(targetMonth)}
                                                    onValueChange={(v) =>
                                                        setTargetMonth(
                                                            Number(v),
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger
                                                        id="targetMonth"
                                                        className="w-full"
                                                    >
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Array.from(
                                                            { length: 12 },
                                                            (_, i) => i + 1,
                                                        ).map((month) => (
                                                            <SelectItem
                                                                key={month}
                                                                value={String(
                                                                    month,
                                                                )}
                                                            >
                                                                {startDate
                                                                    ? formatMonthName(
                                                                          month,
                                                                      )
                                                                    : `Month ${month}`}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent
                                        value="duration"
                                        className="mt-3"
                                    >
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label
                                                    htmlFor="durationYears"
                                                    className="text-xs text-muted-foreground"
                                                >
                                                    Years
                                                </Label>
                                                <Select
                                                    value={String(
                                                        durationYears,
                                                    )}
                                                    onValueChange={(v) =>
                                                        setDurationYears(
                                                            Number(v),
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger
                                                        id="durationYears"
                                                        className="w-full"
                                                    >
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Array.from(
                                                            {
                                                                length:
                                                                    Math.ceil(
                                                                        totalMonths /
                                                                            12,
                                                                    ) + 1,
                                                            },
                                                            (_, i) => i,
                                                        ).map((year) => (
                                                            <SelectItem
                                                                key={year}
                                                                value={String(
                                                                    year,
                                                                )}
                                                            >
                                                                {year} year
                                                                {year !== 1 &&
                                                                    "s"}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label
                                                    htmlFor="durationMonths"
                                                    className="text-xs text-muted-foreground"
                                                >
                                                    Months
                                                </Label>
                                                <Select
                                                    value={String(
                                                        durationExtraMonths,
                                                    )}
                                                    onValueChange={(v) =>
                                                        setDurationExtraMonths(
                                                            Number(v),
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger
                                                        id="durationMonths"
                                                        className="w-full"
                                                    >
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Array.from(
                                                            { length: 12 },
                                                            (_, i) => i,
                                                        ).map((month) => (
                                                            <SelectItem
                                                                key={month}
                                                                value={String(
                                                                    month,
                                                                )}
                                                            >
                                                                {month} month
                                                                {month !== 1 &&
                                                                    "s"}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="end" className="mt-3">
                                        <p className="text-sm text-muted-foreground">
                                            This rate will apply until the end
                                            of the mortgage.
                                        </p>
                                    </TabsContent>

                                    {durationMode === "calendar" &&
                                        durationMonths > 0 && (
                                            <p className="text-xs text-muted-foreground mt-2">
                                                ={" "}
                                                {Math.floor(
                                                    durationMonths / 12,
                                                )}{" "}
                                                year
                                                {Math.floor(
                                                    durationMonths / 12,
                                                ) !== 1 && "s"}
                                                {durationMonths % 12 > 0 &&
                                                    ` ${durationMonths % 12} month${durationMonths % 12 !== 1 ? "s" : ""}`}
                                            </p>
                                        )}
                                </Tabs>
                            )}
                        </div>

                        {/* Custom Label */}
                        <div className="space-y-2">
                            <Label htmlFor="label">Label</Label>
                            <Input
                                id="label"
                                placeholder="e.g., Initial Fixed Rate"
                                value={customLabel}
                                onChange={(e) => setCustomLabel(e.target.value)}
                            />
                        </div>

                        {/* Overpayment Warning */}
                        {hasAffectedOverpayments && (
                            <div className="rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 p-3 space-y-1.5">
                                <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                                    <AlertTriangle className="h-4 w-4 shrink-0" />
                                    <span className="text-sm font-medium">
                                        Overpayments will be affected
                                    </span>
                                </div>
                                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-0.5 pl-6">
                                    {affectedOverpayments.toDelete.length >
                                        0 && (
                                        <li>
                                            {
                                                affectedOverpayments.toDelete
                                                    .length
                                            }{" "}
                                            overpayment
                                            {affectedOverpayments.toDelete
                                                .length !== 1 && "s"}{" "}
                                            will be deleted
                                        </li>
                                    )}
                                    {affectedOverpayments.toAdjust.length >
                                        0 && (
                                        <li>
                                            {
                                                affectedOverpayments.toAdjust
                                                    .length
                                            }{" "}
                                            recurring overpayment
                                            {affectedOverpayments.toAdjust
                                                .length !== 1 && "s"}{" "}
                                            will have end date adjusted
                                        </li>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="shrink-0 border-t pt-4">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!rateInfo}>
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
