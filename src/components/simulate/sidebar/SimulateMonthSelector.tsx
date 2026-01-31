import { useCallback, useMemo } from "react";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMonthName, getCalendarDate } from "@/lib/utils/date";

export type TimingMode = "calendar" | "duration";

interface SimulateMonthSelectorProps {
    label?: string;
    month: number;
    setMonth: (month: number) => void;
    minMonth?: number;
    maxMonth?: number;
    startDate?: string;
    timingMode: TimingMode;
    setTimingMode: (mode: TimingMode) => void;
}

export function SimulateMonthSelector({
    label = "When",
    month,
    setMonth,
    minMonth = 1,
    maxMonth = 36, // Default to 3 years for construction
    startDate,
    timingMode,
    setTimingMode,
}: SimulateMonthSelectorProps) {
    // Calendar mode values (derived from month + startDate)
    const getCalendarValues = useCallback(
        (m: number) => {
            if (startDate) {
                const date = getCalendarDate(startDate, m - 1);
                return {
                    year: date.getFullYear(),
                    monthOfYear: date.getMonth() + 1,
                };
            }
            // Fallback to mortgage year/month
            return {
                year: Math.ceil(m / 12),
                monthOfYear: ((m - 1) % 12) + 1,
            };
        },
        [startDate],
    );

    const calendarValues = getCalendarValues(month);
    const minCalendarValues = getCalendarValues(minMonth);
    const maxCalendarValues = getCalendarValues(maxMonth);

    // Convert calendar values back to absolute month
    const calendarToMonth = useCallback(
        (calYear: number, calMonth: number) => {
            if (startDate) {
                const [sYear, sMonth] = startDate.split("-").map(Number);
                const startTotal = sYear * 12 + (sMonth - 1);
                const targetTotal = calYear * 12 + (calMonth - 1);
                return Math.max(
                    minMonth,
                    Math.min(maxMonth, targetTotal - startTotal + 1),
                );
            }
            // Fallback: mortgage year/month
            return Math.max(
                minMonth,
                Math.min(maxMonth, (calYear - 1) * 12 + calMonth),
            );
        },
        [startDate, minMonth, maxMonth],
    );

    // Duration values (years and months from mortgage start)
    const durationYears = Math.floor(month / 12);
    const durationMonths = month % 12;

    // Convert duration to absolute month
    const durationToMonth = (years: number, months: number) => {
        const newMonth = years * 12 + months;
        return Math.max(minMonth, Math.min(maxMonth, newMonth));
    };

    // Handle calendar changes
    const handleCalendarChange = (year: number, monthOfYear: number) => {
        setMonth(calendarToMonth(year, monthOfYear));
    };

    // Duration bounds
    const minDurationYears = Math.floor(minMonth / 12);
    const maxDurationYears = Math.floor(maxMonth / 12);

    // Handle duration changes - clamp months to valid range for the selected year
    const handleDurationChange = (years: number, months: number) => {
        // Calculate valid month range for this year
        let minM = 0;
        let maxM = 11;
        if (years === minDurationYears) {
            minM = minMonth % 12;
        }
        if (years === maxDurationYears) {
            maxM = maxMonth % 12;
        }
        // Clamp months to valid range
        const clampedMonths = Math.max(minM, Math.min(maxM, months));
        setMonth(durationToMonth(years, clampedMonths));
    };

    // Generate year options for calendar mode
    const calendarYearOptions = useMemo(() => {
        if (startDate) {
            const years: number[] = [];
            for (
                let y = minCalendarValues.year;
                y <= maxCalendarValues.year;
                y++
            ) {
                years.push(y);
            }
            return years;
        }
        // Fallback to mortgage years
        const minYear = Math.ceil(minMonth / 12);
        const maxYear = Math.ceil(maxMonth / 12);
        return Array.from(
            { length: maxYear - minYear + 1 },
            (_, i) => minYear + i,
        );
    }, [
        startDate,
        minMonth,
        maxMonth,
        minCalendarValues.year,
        maxCalendarValues.year,
    ]);

    // Generate month options for calendar mode based on selected year
    const getCalendarMonthOptions = useCallback(
        (selectedYear: number) => {
            let minM = 1;
            let maxM = 12;

            if (selectedYear === minCalendarValues.year) {
                minM = minCalendarValues.monthOfYear;
            }
            if (selectedYear === maxCalendarValues.year) {
                maxM = maxCalendarValues.monthOfYear;
            }

            return Array.from({ length: maxM - minM + 1 }, (_, i) => minM + i);
        },
        [minCalendarValues, maxCalendarValues],
    );

    const calendarMonthOptions = getCalendarMonthOptions(calendarValues.year);

    // Generate duration year options
    const durationYearOptions = useMemo(() => {
        return Array.from(
            { length: maxDurationYears - minDurationYears + 1 },
            (_, i) => minDurationYears + i,
        );
    }, [minDurationYears, maxDurationYears]);

    // Generate duration month options based on selected year
    const getDurationMonthOptions = useCallback(
        (selectedYears: number) => {
            let minM = 0;
            let maxM = 11;

            if (selectedYears === minDurationYears) {
                minM = minMonth % 12;
            }
            if (selectedYears === maxDurationYears) {
                maxM = maxMonth % 12;
            }

            return Array.from({ length: maxM - minM + 1 }, (_, i) => minM + i);
        },
        [minDurationYears, maxDurationYears, minMonth, maxMonth],
    );

    const durationMonthOptions = getDurationMonthOptions(durationYears);

    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <Tabs
                value={timingMode}
                onValueChange={(v) => setTimingMode(v as TimingMode)}
            >
                <TabsList className="h-8">
                    <TabsTrigger value="calendar" className="text-xs px-2">
                        Natural Calendar
                    </TabsTrigger>
                    <TabsTrigger value="duration" className="text-xs px-2">
                        Mortgage Duration
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="calendar" className="mt-3">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label
                                htmlFor="cal_year"
                                className="text-xs text-muted-foreground"
                            >
                                Year
                            </Label>
                            <Select
                                value={String(calendarValues.year)}
                                onValueChange={(v) =>
                                    handleCalendarChange(
                                        Number(v),
                                        calendarValues.monthOfYear,
                                    )
                                }
                            >
                                <SelectTrigger id="cal_year" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {calendarYearOptions.map((year) => (
                                        <SelectItem
                                            key={year}
                                            value={String(year)}
                                        >
                                            {startDate ? year : `Year ${year}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label
                                htmlFor="cal_month"
                                className="text-xs text-muted-foreground"
                            >
                                Month
                            </Label>
                            <Select
                                value={String(calendarValues.monthOfYear)}
                                onValueChange={(v) =>
                                    handleCalendarChange(
                                        calendarValues.year,
                                        Number(v),
                                    )
                                }
                            >
                                <SelectTrigger
                                    id="cal_month"
                                    className="w-full"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {calendarMonthOptions.map((m) => (
                                        <SelectItem key={m} value={String(m)}>
                                            {startDate
                                                ? formatMonthName(m)
                                                : `Month ${m}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="duration" className="mt-3">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label
                                htmlFor="dur_years"
                                className="text-xs text-muted-foreground"
                            >
                                Years
                            </Label>
                            <Select
                                value={String(durationYears)}
                                onValueChange={(v) =>
                                    handleDurationChange(
                                        Number(v),
                                        durationMonths,
                                    )
                                }
                            >
                                <SelectTrigger
                                    id="dur_years"
                                    className="w-full"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {durationYearOptions.map((y) => (
                                        <SelectItem key={y} value={String(y)}>
                                            {y} year{y !== 1 && "s"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label
                                htmlFor="dur_months"
                                className="text-xs text-muted-foreground"
                            >
                                Months
                            </Label>
                            <Select
                                value={String(durationMonths)}
                                onValueChange={(v) =>
                                    handleDurationChange(
                                        durationYears,
                                        Number(v),
                                    )
                                }
                            >
                                <SelectTrigger
                                    id="dur_months"
                                    className="w-full"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {durationMonthOptions.map((m) => (
                                        <SelectItem key={m} value={String(m)}>
                                            {m} month{m !== 1 && "s"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {startDate && (
                        <p className="text-xs text-muted-foreground mt-2">
                            = {formatMonthName(calendarValues.monthOfYear)}{" "}
                            {calendarValues.year}
                        </p>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
