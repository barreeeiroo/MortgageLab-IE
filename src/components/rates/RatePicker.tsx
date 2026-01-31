import { useStore } from "@nanostores/react";
import {
    ChevronLeft,
    ChevronRight,
    Coins,
    ExternalLink,
    Gift,
    PiggyBank,
} from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import type { BerRating } from "@/lib/constants/ber";
import { fetchLendersData, getLender } from "@/lib/data/lenders";
import { fetchAllRates, filterRates } from "@/lib/data/rates";
import type { BuyerType } from "@/lib/schemas/buyer";
import type { Lender } from "@/lib/schemas/lender";
import type { MortgageRate } from "@/lib/schemas/rate";
import { saveRatesForm } from "@/lib/storage/forms";
import { $perks, fetchPerks } from "@/lib/stores/perks";
import { cn } from "@/lib/utils/cn";
import { parseCurrency } from "@/lib/utils/currency";
import { LenderLogo } from "../lenders/LenderLogo";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Skeleton } from "../ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

// Map perk icon names to components
const PERK_ICONS: Record<
    string,
    React.ComponentType<{ className?: string }>
> = {
    Coins,
    PiggyBank,
    Gift,
};

interface RatePickerProps {
    value: string;
    onChange: (value: string) => void;
    mode: "picker" | "manual";
    onModeChange?: (mode: "picker" | "manual") => void;
    // Filter params
    ltv?: number;
    buyerType?: BuyerType;
    berRating?: BerRating;
    isRemortgage?: boolean;
    currentLender?: string;
    // Optional
    label?: string;
    id?: string;
    maxRates?: number;
    // Callback when a rate is selected (returns full rate info including lender name)
    onRateSelect?: (rate: MortgageRate, lenderName: string) => void;
    // Show "View All Rates" link with prefilled filters
    showViewAllRates?: boolean;
    // For generating prefilled rates page link
    propertyValue?: string;
    mortgageAmount?: string;
    mortgageTerm?: string;
    // Show perk icons with tooltips for rates that have perks
    withPerks?: boolean;
    // Enable pagination to browse through more rates
    paginate?: boolean;
}

interface RateOption {
    rate: MortgageRate;
    lender: Lender | undefined;
}

export function RatePicker({
    value,
    onChange,
    mode,
    onModeChange,
    ltv,
    buyerType,
    berRating,
    isRemortgage = false,
    currentLender,
    label = "Interest Rate",
    id = "interestRate",
    maxRates = 5,
    onRateSelect,
    showViewAllRates = false,
    propertyValue,
    mortgageAmount,
    mortgageTerm,
    withPerks = false,
    paginate = false,
}: RatePickerProps) {
    const [rates, setRates] = useState<MortgageRate[]>([]);
    const [lenders, setLenders] = useState<Lender[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Track selected rate ID for unique selection (since multiple rates can have same value)
    const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
    // Pagination state
    const [currentPage, setCurrentPage] = useState(0);
    // Unique ID for this instance to avoid conflicts when multiple pickers are rendered
    const instanceId = useId();

    // Subscribe to perks store
    const perks = useStore($perks);

    // Fetch rates, lenders, and perks on mount
    useEffect(() => {
        async function loadData() {
            setIsLoading(true);
            setError(null);
            try {
                const fetchedLenders = await fetchLendersData();
                setLenders(fetchedLenders);

                if (fetchedLenders.length > 0) {
                    const { rates: fetchedRates } =
                        await fetchAllRates(fetchedLenders);
                    setRates(fetchedRates);
                }

                // Fetch perks only if needed
                if (withPerks) {
                    fetchPerks();
                }
            } catch {
                setError("Failed to load rates");
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [withPerks]);

    // Filter and sort all rates - memoized to prevent unnecessary re-renders
    const allFilteredRates = useMemo((): RateOption[] => {
        if (rates.length === 0) return [];

        const filtered = filterRates(rates, {
            ltv,
            mortgageAmount: mortgageAmount
                ? parseCurrency(mortgageAmount)
                : undefined,
            buyerType,
            ber: berRating,
            currentLender: isRemortgage ? currentLender : undefined,
        });

        // Sort by rate ascending
        const sorted = [...filtered].sort((a, b) => a.rate - b.rate);

        return sorted.map((rate) => ({
            rate,
            lender: getLender(lenders, rate.lenderId),
        }));
    }, [
        rates,
        lenders,
        ltv,
        mortgageAmount,
        buyerType,
        berRating,
        isRemortgage,
        currentLender,
    ]);

    // Paginated or limited rate options
    const totalPages = paginate
        ? Math.ceil(allFilteredRates.length / maxRates)
        : 1;
    const rateOptions = useMemo(() => {
        if (paginate) {
            const start = currentPage * maxRates;
            return allFilteredRates.slice(start, start + maxRates);
        }
        return allFilteredRates.slice(0, maxRates);
    }, [allFilteredRates, paginate, currentPage, maxRates]);

    // Auto-navigate to the page containing the selected rate on first load
    useEffect(() => {
        if (
            allFilteredRates.length > 0 &&
            value &&
            !selectedRateId &&
            paginate
        ) {
            // Find the index of the rate that matches the current value
            const matchingIndex = allFilteredRates.findIndex(
                (opt) => opt.rate.rate.toString() === value,
            );
            if (matchingIndex >= 0) {
                const targetPage = Math.floor(matchingIndex / maxRates);
                setCurrentPage(targetPage);
                setSelectedRateId(allFilteredRates[matchingIndex].rate.id);
            }
        }
    }, [allFilteredRates, value, selectedRateId, paginate, maxRates]);

    // Sync selectedRateId when rates load and there's a pre-existing value (non-paginated mode)
    useEffect(() => {
        if (rateOptions.length > 0 && value && !selectedRateId && !paginate) {
            // Find a rate that matches the current value
            const matchingRate = rateOptions.find(
                (opt) => opt.rate.rate.toString() === value,
            );
            if (matchingRate) {
                setSelectedRateId(matchingRate.rate.id);
            }
        }
    }, [rateOptions, value, selectedRateId, paginate]);

    const handleRateSelect = (rateId: string) => {
        // Find the rate by ID and pass its value to onChange
        const selectedRate = rateOptions.find((opt) => opt.rate.id === rateId);
        if (selectedRate) {
            setSelectedRateId(rateId);
            onChange(selectedRate.rate.rate.toString());
            // Use shortName for compact display (e.g., "AIB" instead of "Allied Irish Banks")
            const lenderName =
                selectedRate.lender?.shortName ?? selectedRate.rate.lenderId;
            onRateSelect?.(selectedRate.rate, lenderName);
        }
    };

    // Determine which rate is currently selected
    // If we have a selectedRateId, use that; otherwise try to match by rate value
    const isRateSelected = (rate: MortgageRate): boolean => {
        if (selectedRateId) {
            return rate.id === selectedRateId;
        }
        // Fallback: match by rate value (for initial load from shared URL)
        return rate.rate.toString() === value;
    };

    const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Allow only valid decimal numbers
        const inputValue = e.target.value;
        if (inputValue === "" || /^\d*\.?\d*$/.test(inputValue)) {
            onChange(inputValue);
        }
    };

    const formatFixedTerm = (rate: MortgageRate): string => {
        if (rate.type === "variable") return "Variable";
        if (rate.fixedTerm === 1) return "1 Year Fixed";
        return `${rate.fixedTerm} Years Fixed`;
    };

    return (
        <div className="space-y-3">
            {label && (
                <div className="flex items-center justify-between">
                    <Label htmlFor={id}>{label}</Label>
                    {onModeChange && (
                        <button
                            type="button"
                            onClick={() =>
                                onModeChange(
                                    mode === "picker" ? "manual" : "picker",
                                )
                            }
                            className="text-sm text-primary hover:underline"
                        >
                            {mode === "picker"
                                ? "Enter manually"
                                : "Choose from rates"}
                        </button>
                    )}
                </div>
            )}

            {mode === "manual" ? (
                <div className="flex items-center gap-2">
                    <Input
                        id={id}
                        type="text"
                        inputMode="decimal"
                        value={value}
                        onChange={handleManualInput}
                        placeholder="e.g. 3.45"
                        className="w-32"
                    />
                    <span className="text-muted-foreground">%</span>
                </div>
            ) : (
                <div className="space-y-1.5">
                    {isLoading ? (
                        <div className="space-y-1.5">
                            {["skeleton-1", "skeleton-2", "skeleton-3"].map(
                                (key) => (
                                    <Skeleton
                                        key={key}
                                        className="h-[52px] w-full"
                                    />
                                ),
                            )}
                        </div>
                    ) : error ? (
                        <p className="text-sm text-destructive">{error}</p>
                    ) : rateOptions.length === 0 ? (
                        <div className="text-sm text-muted-foreground p-4 border rounded-lg bg-muted/50">
                            <p>No rates found for your criteria.</p>
                            <p className="mt-1">
                                Try adjusting LTV, BER rating
                                {onModeChange && (
                                    <>
                                        , or{" "}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onModeChange("manual")
                                            }
                                            className="text-primary hover:underline"
                                        >
                                            enter a rate manually
                                        </button>
                                    </>
                                )}
                                .
                            </p>
                        </div>
                    ) : (
                        <>
                            <RadioGroup
                                value={selectedRateId ?? ""}
                                onValueChange={handleRateSelect}
                                className="gap-1.5"
                            >
                                {rateOptions.map(({ rate, lender }) => (
                                    <label
                                        key={rate.id}
                                        htmlFor={`${instanceId}-rate-${rate.id}`}
                                        className={cn(
                                            "flex flex-col sm:flex-row sm:items-center gap-2 p-2 border rounded-lg cursor-pointer transition-colors",
                                            "hover:bg-muted/50",
                                            isRateSelected(rate) &&
                                                "border-primary bg-primary/5",
                                        )}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <RadioGroupItem
                                                value={rate.id}
                                                id={`${instanceId}-rate-${rate.id}`}
                                                className="shrink-0"
                                            />
                                            <LenderLogo
                                                lenderId={rate.lenderId}
                                                size={24}
                                            />
                                            <div className="min-w-0">
                                                <span className="font-medium text-sm truncate block">
                                                    {lender?.name ??
                                                        rate.lenderId}
                                                </span>
                                                <p className="text-xs text-muted-foreground">
                                                    {rate.name}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between gap-2 pl-8 sm:pl-0 sm:ml-auto">
                                            {/* Perk icons */}
                                            {withPerks &&
                                                rate.perks &&
                                                rate.perks.length > 0 && (
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {rate.perks.map(
                                                            (perkId) => {
                                                                const perk =
                                                                    perks.find(
                                                                        (p) =>
                                                                            p.id ===
                                                                            perkId,
                                                                    );
                                                                if (!perk)
                                                                    return null;
                                                                const IconComponent =
                                                                    PERK_ICONS[
                                                                        perk
                                                                            .icon
                                                                    ];
                                                                if (
                                                                    !IconComponent
                                                                )
                                                                    return null;
                                                                return (
                                                                    <Tooltip
                                                                        key={
                                                                            perkId
                                                                        }
                                                                    >
                                                                        <TooltipTrigger
                                                                            asChild
                                                                        >
                                                                            <div className="p-1 rounded bg-muted/50">
                                                                                <IconComponent className="h-3.5 w-3.5 text-muted-foreground" />
                                                                            </div>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p className="font-medium">
                                                                                {
                                                                                    perk.label
                                                                                }
                                                                            </p>
                                                                            {perk.description && (
                                                                                <p className="text-xs text-muted-foreground">
                                                                                    {
                                                                                        perk.description
                                                                                    }
                                                                                </p>
                                                                            )}
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                );
                                                            },
                                                        )}
                                                    </div>
                                                )}
                                            <div className="text-right shrink-0">
                                                <span className="font-semibold text-primary text-sm">
                                                    {rate.rate.toFixed(2)}%
                                                </span>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatFixedTerm(rate)}
                                                </p>
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </RadioGroup>
                            {/* Pagination controls */}
                            {paginate && totalPages > 1 && (
                                <div className="flex items-center justify-between mt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setCurrentPage((p) =>
                                                Math.max(0, p - 1),
                                            )
                                        }
                                        disabled={currentPage === 0}
                                        className="h-7 px-2"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        <span className="sr-only">
                                            Previous
                                        </span>
                                    </Button>
                                    <span className="text-xs text-muted-foreground">
                                        Page {currentPage + 1} of {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setCurrentPage((p) =>
                                                Math.min(totalPages - 1, p + 1),
                                            )
                                        }
                                        disabled={currentPage >= totalPages - 1}
                                        className="h-7 px-2"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                        <span className="sr-only">Next</span>
                                    </Button>
                                </div>
                            )}
                            {showViewAllRates && (
                                <div className="flex justify-end mt-2">
                                    <a
                                        href="/rates"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                                        onClick={() => {
                                            const mode = isRemortgage
                                                ? "remortgage"
                                                : "first-mortgage";
                                            saveRatesForm({
                                                mode,
                                                propertyValue:
                                                    propertyValue ?? "",
                                                mortgageAmount:
                                                    mortgageAmount ?? "",
                                                monthlyRepayment: "",
                                                mortgageTerm:
                                                    mortgageTerm ?? "300",
                                                berRating: berRating ?? "C1",
                                                buyerType: buyerType ?? "ftb",
                                                currentLender:
                                                    currentLender ??
                                                    (isRemortgage
                                                        ? "other"
                                                        : ""),
                                            });
                                        }}
                                    >
                                        View All Rates
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
