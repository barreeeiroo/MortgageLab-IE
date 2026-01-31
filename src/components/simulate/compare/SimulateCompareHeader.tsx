import {
    ArrowLeft,
    CalendarIcon,
    Download,
    GitCompareArrows,
    X,
} from "lucide-react";
import { useState } from "react";
import { ShareButton } from "@/components/ShareButton";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { formatDateLocal, formatMonthYear } from "@/lib/utils/date";

interface SimulateCompareHeaderProps {
    simulationCount: number;
    onShare: () => Promise<string>;
    onClose: () => void;
    onExportExcel: () => Promise<void>;
    onExportPDF: () => Promise<void>;
    onExportPDFWithCharts: () => Promise<void>;
    isExporting: boolean;
    canExport: boolean;
    displayStartDate?: string;
    onStartDateChange: (date: string | undefined) => void;
}

/**
 * Header for the comparison view
 */
export function SimulateCompareHeader({
    simulationCount,
    onShare,
    onClose,
    onExportExcel,
    onExportPDF,
    onExportPDFWithCharts,
    isExporting,
    canExport,
    displayStartDate,
    onStartDateChange,
}: SimulateCompareHeaderProps) {
    const [calendarOpen, setCalendarOpen] = useState(false);
    const currentDate = displayStartDate
        ? new Date(displayStartDate)
        : new Date();

    const handleDateSelect = (date: Date) => {
        onStartDateChange(formatDateLocal(date));
        setCalendarOpen(false);
    };

    const handleClearDate = () => {
        onStartDateChange(undefined);
    };

    return (
        <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    title="Back to simulator"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                </Button>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <GitCompareArrows className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold">
                        Compare Simulations
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Comparing {simulationCount} simulation
                        {simulationCount !== 1 ? "s" : ""}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {/* Start Date Selector */}
                <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground hidden sm:inline">
                        Start
                    </span>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <div className="flex items-center gap-1">
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-2 text-sm font-normal"
                                >
                                    {formatMonthYear(displayStartDate)}
                                </Button>
                            </PopoverTrigger>
                            {displayStartDate && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                                    onClick={handleClearDate}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                        <PopoverContent className="w-full p-0" align="end">
                            <MonthYearPicker
                                selected={
                                    displayStartDate ? currentDate : undefined
                                }
                                onSelect={handleDateSelect}
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="h-6 w-px bg-border" />

                {/* Export Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            disabled={!canExport || isExporting}
                        >
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">
                                {isExporting ? "Exporting..." : "Export"}
                            </span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={onExportExcel}>
                            Export as Excel
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onExportPDF}>
                            Export as PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onExportPDFWithCharts}>
                            Export as PDF (with charts)
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <ShareButton onShare={onShare} label="Share" />
            </div>
        </div>
    );
}
