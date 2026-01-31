import { Calendar, Check, Clock } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils/cn";

interface TimeRangeCommandProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    size?: "default" | "sm";
}

interface TimeRangeOption {
    value: string;
    label: string;
    description?: string;
}

/**
 * Get the current quarter string (e.g., "2026-Q1")
 */
function getCurrentQuarter(): string {
    const now = new Date();
    const quarter = Math.ceil((now.getMonth() + 1) / 3);
    return `${now.getFullYear()}-Q${quarter}`;
}

/**
 * Get the previous year string (e.g., "2025")
 */
function getPreviousYear(): string {
    const now = new Date();
    return String(now.getFullYear() - 1);
}

/**
 * Parse a time range value into a display label
 */
export function getTimeRangeLabel(value: string): string {
    if (value === "all") return "All Time";

    // Duration patterns: 5y, 3y, 1y, 6m, 3m
    const durationMatch = value.match(/^(\d+)(y|m)$/);
    if (durationMatch) {
        const num = Number.parseInt(durationMatch[1], 10);
        const unit = durationMatch[2];
        if (unit === "y") return `${num} Year${num > 1 ? "s" : ""}`;
        if (unit === "m") return `${num} Month${num > 1 ? "s" : ""}`;
    }

    // Quarter pattern: 2024-Q3
    const quarterMatch = value.match(/^(\d{4})-Q([1-4])$/);
    if (quarterMatch) {
        return `Q${quarterMatch[2]} ${quarterMatch[1]}`;
    }

    // Month pattern: 2024-01
    const monthMatch = value.match(/^(\d{4})-(\d{2})$/);
    if (monthMatch) {
        const year = monthMatch[1];
        const month = Number.parseInt(monthMatch[2], 10);
        const monthNames = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ];
        return `${monthNames[month - 1]} ${year}`;
    }

    // Year pattern: 2024
    const yearMatch = value.match(/^(\d{4})$/);
    if (yearMatch) {
        return value;
    }

    return value;
}

/**
 * Validate if a time range value is valid
 */
function isValidTimeRange(value: string): boolean {
    if (value === "all") return true;

    // Duration: 1-99 years or months
    if (/^(\d{1,2})(y|m)$/.test(value)) return true;

    // Year: 2000-2099
    if (/^20\d{2}$/.test(value)) return true;

    // Quarter: 2000-Q1 through 2099-Q4
    if (/^20\d{2}-Q[1-4]$/.test(value)) return true;

    // Month: 2000-01 through 2099-12
    if (/^20\d{2}-(0[1-9]|1[0-2])$/.test(value)) return true;

    return false;
}

/**
 * Try to parse user input into a valid time range
 */
function parseUserInput(input: string): string | null {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) return null;

    // Already valid
    if (isValidTimeRange(trimmed)) return trimmed;

    // Try to parse variations

    // "5 years", "5years", "5 year" -> "5y"
    const yearsMatch = trimmed.match(/^(\d+)\s*years?$/);
    if (yearsMatch) return `${yearsMatch[1]}y`;

    // "6 months", "6months", "6 month" -> "6m"
    const monthsMatch = trimmed.match(/^(\d+)\s*months?$/);
    if (monthsMatch) return `${monthsMatch[1]}m`;

    // "q1 2024", "Q1 2024" -> "2024-Q1"
    const quarterAltMatch = trimmed.match(/^q([1-4])\s*(\d{4})$/);
    if (quarterAltMatch) return `${quarterAltMatch[2]}-Q${quarterAltMatch[1]}`;

    // "2024 q1", "2024 Q1" -> "2024-Q1"
    const quarterAlt2Match = trimmed.match(/^(\d{4})\s*q([1-4])$/);
    if (quarterAlt2Match)
        return `${quarterAlt2Match[1]}-Q${quarterAlt2Match[2]}`;

    // "jan 2024", "january 2024" -> "2024-01"
    const monthNames: Record<string, string> = {
        jan: "01",
        january: "01",
        feb: "02",
        february: "02",
        mar: "03",
        march: "03",
        apr: "04",
        april: "04",
        may: "05",
        jun: "06",
        june: "06",
        jul: "07",
        july: "07",
        aug: "08",
        august: "08",
        sep: "09",
        september: "09",
        oct: "10",
        october: "10",
        nov: "11",
        november: "11",
        dec: "12",
        december: "12",
    };

    const monthNameMatch = trimmed.match(/^([a-z]+)\s*(\d{4})$/);
    if (monthNameMatch && monthNames[monthNameMatch[1]]) {
        return `${monthNameMatch[2]}-${monthNames[monthNameMatch[1]]}`;
    }

    // "2024 jan" -> "2024-01"
    const monthNameAltMatch = trimmed.match(/^(\d{4})\s*([a-z]+)$/);
    if (monthNameAltMatch && monthNames[monthNameAltMatch[2]]) {
        return `${monthNameAltMatch[1]}-${monthNames[monthNameAltMatch[2]]}`;
    }

    return null;
}

export function TimeRangeCommand({
    value,
    onChange,
    className,
    size = "default",
}: TimeRangeCommandProps) {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");

    // Build default options
    const defaultOptions = useMemo((): TimeRangeOption[] => {
        const currentQuarter = getCurrentQuarter();
        const previousYear = getPreviousYear();

        return [
            { value: "all", label: "All Time", description: "Show all data" },
            { value: "5y", label: "5 Years", description: "Last 5 years" },
            { value: "3y", label: "3 Years", description: "Last 3 years" },
            { value: "1y", label: "1 Year", description: "Last year" },
            { value: "6m", label: "6 Months", description: "Last 6 months" },
            { value: "3m", label: "3 Months", description: "Last 3 months" },
            {
                value: currentQuarter,
                label: getTimeRangeLabel(currentQuarter),
                description: "Current quarter",
            },
            {
                value: previousYear,
                label: previousYear,
                description: "Previous year",
            },
        ];
    }, []);

    // Filter options based on input
    const filteredOptions = useMemo(() => {
        if (!inputValue) return defaultOptions;

        const lower = inputValue.toLowerCase();
        return defaultOptions.filter(
            (opt) =>
                opt.label.toLowerCase().includes(lower) ||
                opt.value.toLowerCase().includes(lower) ||
                opt.description?.toLowerCase().includes(lower),
        );
    }, [inputValue, defaultOptions]);

    // Check if input could be a custom value
    const customValue = useMemo(() => {
        if (!inputValue) return null;
        const parsed = parseUserInput(inputValue);
        if (!parsed) return null;

        // Don't show custom if it matches an existing option
        if (defaultOptions.some((opt) => opt.value === parsed)) return null;

        return parsed;
    }, [inputValue, defaultOptions]);

    const handleSelect = (selectedValue: string) => {
        onChange(selectedValue);
        setOpen(false);
        setInputValue("");
    };

    const displayLabel = getTimeRangeLabel(value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "justify-start gap-2 font-normal",
                        size === "sm" ? "h-8 text-xs" : "h-9",
                        className,
                    )}
                >
                    <Clock className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    <span className="truncate">{displayLabel}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Type a range..."
                        value={inputValue}
                        onValueChange={setInputValue}
                    />
                    <CommandList>
                        <CommandEmpty>
                            {inputValue ? (
                                <span className="text-muted-foreground">
                                    Try: 5y, 2024, 2024-Q3, 2024-01
                                </span>
                            ) : (
                                "No results found."
                            )}
                        </CommandEmpty>

                        {/* Custom value option */}
                        {customValue && (
                            <CommandGroup heading="Custom">
                                <CommandItem
                                    value={customValue}
                                    onSelect={() => handleSelect(customValue)}
                                >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    {getTimeRangeLabel(customValue)}
                                    <Check
                                        className={cn(
                                            "ml-auto h-4 w-4",
                                            value === customValue
                                                ? "opacity-100"
                                                : "opacity-0",
                                        )}
                                    />
                                </CommandItem>
                            </CommandGroup>
                        )}

                        {/* Default options */}
                        {filteredOptions.length > 0 && (
                            <CommandGroup heading="Suggestions">
                                {filteredOptions.map((option) => (
                                    <CommandItem
                                        key={option.value}
                                        value={option.value}
                                        onSelect={() =>
                                            handleSelect(option.value)
                                        }
                                    >
                                        {option.value === "all" ? (
                                            <Clock className="mr-2 h-4 w-4" />
                                        ) : (
                                            <Calendar className="mr-2 h-4 w-4" />
                                        )}
                                        <span>{option.label}</span>
                                        {option.description && (
                                            <span className="ml-auto text-xs text-muted-foreground">
                                                {option.description}
                                            </span>
                                        )}
                                        <Check
                                            className={cn(
                                                "ml-2 h-4 w-4 shrink-0",
                                                value === option.value
                                                    ? "opacity-100"
                                                    : "opacity-0",
                                            )}
                                        />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
