import { Pencil } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LenderOption } from "@/components/lenders/LenderOption";
import { GlossaryTermTooltip } from "@/components/tooltips/GlossaryTermTooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
    BER_GROUPS,
    GREEN_BER_GROUPS,
    OTHER_BER_GROUPS,
} from "@/lib/constants/ber";
import {
    BUYER_TYPE_LABELS,
    FIRST_MORTGAGE_BUYER_TYPES,
    SWITCHER_BUYER_TYPES,
} from "@/lib/constants/buyer";
import { type AprcConfig, calculateAprc } from "@/lib/mortgage/aprc";
import type { BuyerType } from "@/lib/schemas/buyer";
import type { Lender } from "@/lib/schemas/lender";
import { DEFAULT_APRC_FEES } from "@/lib/schemas/lender";
import type { Perk } from "@/lib/schemas/perk";
import type { MortgageRate } from "@/lib/schemas/rate";

// Extended perk type that may include isCustom flag
type ExtendedPerk = Perk & { isCustom?: boolean };

import { RATE_TYPES, type RateType } from "@/lib/schemas/rate";
import type { StoredCustomRate } from "@/lib/stores/custom-rates";

type AprcMode = "fees" | "direct";

// Standard APRC calculation config (per EU directive typical disclosure)
const DEFAULT_APRC_CONFIG: Omit<
    AprcConfig,
    "valuationFee" | "securityReleaseFee"
> = {
    loanAmount: 250000,
    termMonths: 240,
};

interface CustomLenderInfo {
    id: string;
    name: string;
}

export interface CustomRateFormProps {
    lenders: Lender[];
    customLenders: CustomLenderInfo[];
    perks: ExtendedPerk[];
    currentBuyerType: BuyerType;
    initialRate?: StoredCustomRate | null;
    onSubmit: (rate: StoredCustomRate) => void;
    submitButton: (props: {
        onClick: () => void;
        disabled: boolean;
    }) => React.ReactNode;
    /** Show fees inputs to calculate APRC (true) or direct APRC input (false) */
    showAprcCalculation?: boolean;
}

const CUSTOM_LENDER_VALUE = "__custom__";

// Customer eligibility options
type CustomerEligibility = "all" | "new" | "existing";

interface FormState {
    lenderId: string;
    customLenderName: string;
    name: string;
    type: RateType;
    rate: string;
    fixedTerm: string;
    ltvRange: [number, number];
    buyerTypes: string[];
    berEligible: string[];
    allBerEligible: boolean;
    customerEligibility: CustomerEligibility;
    aprcMode: AprcMode;
    valuationFee: string;
    securityReleaseFee: string;
    aprc: string;
    perks: string[];
}

function getDefaultBuyerTypes(buyerType: BuyerType): string[] {
    if (buyerType === "ftb" || buyerType === "mover") {
        return ["ftb", "mover"];
    }
    if (buyerType === "btl") {
        return ["btl"];
    }
    if (buyerType === "switcher-pdh") {
        return ["switcher-pdh"];
    }
    if (buyerType === "switcher-btl") {
        return ["switcher-btl"];
    }
    return ["ftb", "mover"];
}

function createInitialFormState(buyerType: BuyerType): FormState {
    return {
        lenderId: "",
        customLenderName: "",
        name: "",
        type: "fixed",
        rate: "",
        fixedTerm: "3",
        ltvRange: [0, 90],
        buyerTypes: getDefaultBuyerTypes(buyerType),
        berEligible: [],
        allBerEligible: true,
        customerEligibility: "all",
        aprcMode: "fees",
        valuationFee: "",
        securityReleaseFee: "",
        aprc: "",
        perks: [],
    };
}

function newBusinessToEligibility(
    newBusiness: boolean | undefined,
): CustomerEligibility {
    if (newBusiness === true) return "new";
    if (newBusiness === false) return "existing";
    return "all";
}

function createFormStateFromRate(
    rate: StoredCustomRate,
    lenders: Lender[],
): FormState {
    const isKnownLender = lenders.some((l) => l.id === rate.lenderId);
    const lender = lenders.find((l) => l.id === rate.lenderId);
    const defaultFees = lender?.aprcFees || DEFAULT_APRC_FEES;
    return {
        lenderId: isKnownLender ? rate.lenderId : CUSTOM_LENDER_VALUE,
        customLenderName: rate.customLenderName || "",
        name: rate.name,
        type: rate.type,
        rate: rate.rate.toString(),
        fixedTerm: rate.fixedTerm?.toString() || "3",
        ltvRange: [rate.minLtv, rate.maxLtv],
        buyerTypes: [...rate.buyerTypes],
        berEligible: rate.berEligible ? [...rate.berEligible] : [],
        allBerEligible: !rate.berEligible,
        customerEligibility: newBusinessToEligibility(rate.newBusiness),
        aprcMode: "direct", // When editing, default to direct APRC input
        valuationFee: defaultFees.valuationFee.toString(),
        securityReleaseFee: defaultFees.securityReleaseFee.toString(),
        aprc: rate.apr?.toString() || "",
        perks: rate.perks ? [...rate.perks] : [],
    };
}

export function CustomRateForm({
    lenders,
    customLenders,
    perks: availablePerks,
    currentBuyerType,
    initialRate,
    onSubmit,
    submitButton,
    showAprcCalculation = false,
}: CustomRateFormProps) {
    const [form, setForm] = useState<FormState>(() =>
        initialRate
            ? createFormStateFromRate(initialRate, lenders)
            : createInitialFormState(currentBuyerType),
    );

    // Filter out custom lenders that have the same ID as existing lenders
    const filteredCustomLenders = useMemo(() => {
        const existingLenderIds = new Set(lenders.map((l) => l.id));
        return customLenders.filter((cl) => !existingLenderIds.has(cl.id));
    }, [lenders, customLenders]);

    // Reset form when initialRate changes
    useEffect(() => {
        if (initialRate) {
            setForm(createFormStateFromRate(initialRate, lenders));
        } else {
            setForm(createInitialFormState(currentBuyerType));
        }
    }, [initialRate, currentBuyerType, lenders]);

    // Update fees when lender changes
    useEffect(() => {
        if (!form.lenderId || form.lenderId === CUSTOM_LENDER_VALUE) return;
        const lender = lenders.find((l) => l.id === form.lenderId);
        if (lender?.aprcFees) {
            const { aprcFees } = lender;
            setForm((prev) => ({
                ...prev,
                valuationFee: aprcFees.valuationFee.toString(),
                securityReleaseFee: aprcFees.securityReleaseFee.toString(),
            }));
        }
    }, [form.lenderId, lenders]);

    const isNewCustomLender = form.lenderId === CUSTOM_LENDER_VALUE;
    const isEditMode = !!initialRate;

    // Check if selected lender is a pre-existing custom lender
    const selectedCustomLender = useMemo(() => {
        return filteredCustomLenders.find((cl) => cl.id === form.lenderId);
    }, [filteredCustomLenders, form.lenderId]);

    const effectiveLenderId = useMemo(() => {
        if (isNewCustomLender) {
            return (
                form.customLenderName
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, "") || "custom"
            );
        }
        return form.lenderId;
    }, [isNewCustomLender, form.lenderId, form.customLenderName]);

    const isFormValid = useMemo(() => {
        if (!form.lenderId) return false;
        if (isNewCustomLender && !form.customLenderName.trim()) return false;
        if (!form.name.trim()) return false;
        if (
            !form.rate ||
            Number.isNaN(Number(form.rate)) ||
            Number(form.rate) <= 0
        )
            return false;
        if (
            form.type === "fixed" &&
            (!form.fixedTerm || Number(form.fixedTerm) <= 0)
        )
            return false;
        if (form.buyerTypes.length === 0) return false;
        const [minLtv, maxLtv] = form.ltvRange;
        if (minLtv < 0 || minLtv > 100 || maxLtv < 0 || maxLtv > 100)
            return false;
        if (minLtv > maxLtv) return false;

        // Validate APRC based on mode
        if (showAprcCalculation && form.aprcMode === "fees") {
            if (
                !form.valuationFee ||
                Number.isNaN(Number(form.valuationFee)) ||
                Number(form.valuationFee) < 0
            )
                return false;
            if (
                !form.securityReleaseFee ||
                Number.isNaN(Number(form.securityReleaseFee)) ||
                Number(form.securityReleaseFee) < 0
            )
                return false;
        } else {
            if (
                !form.aprc ||
                Number.isNaN(Number(form.aprc)) ||
                Number(form.aprc) <= 0
            )
                return false;
        }
        return true;
    }, [form, isNewCustomLender, showAprcCalculation]);

    const handleSubmit = useCallback(() => {
        if (!isFormValid) return;

        // Calculate APRC from fees or use direct input
        let apr: number;
        if (showAprcCalculation && form.aprcMode === "fees") {
            const aprcConfig: AprcConfig = {
                ...DEFAULT_APRC_CONFIG,
                valuationFee: Number(form.valuationFee),
                securityReleaseFee: Number(form.securityReleaseFee),
            };
            // For fixed rates, use fixed term; for variable, use 0 (entire term at this rate)
            const fixedTermMonths =
                form.type === "fixed" ? Number(form.fixedTerm) * 12 : 0;
            // Use the same rate as follow-on since we don't have a separate follow-on rate
            apr = calculateAprc(
                Number(form.rate),
                fixedTermMonths,
                Number(form.rate),
                aprcConfig,
            );
        } else {
            apr = Number(form.aprc);
        }

        // Convert customer eligibility to newBusiness field
        const newBusiness =
            form.customerEligibility === "new"
                ? true
                : form.customerEligibility === "existing"
                  ? false
                  : undefined;

        const customRate: StoredCustomRate = {
            id:
                initialRate?.id ||
                `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            name: form.name.trim(),
            lenderId: effectiveLenderId,
            type: form.type,
            rate: Number(form.rate),
            apr,
            fixedTerm:
                form.type === "fixed" ? Number(form.fixedTerm) : undefined,
            minLtv: form.ltvRange[0],
            maxLtv: form.ltvRange[1],
            buyerTypes: form.buyerTypes as MortgageRate["buyerTypes"],
            berEligible: form.allBerEligible
                ? undefined
                : (form.berEligible as MortgageRate["berEligible"]),
            newBusiness,
            perks: form.perks,
            customLenderName: isNewCustomLender
                ? form.customLenderName.trim()
                : selectedCustomLender?.name,
        };

        onSubmit(customRate);
    }, [
        form,
        isFormValid,
        effectiveLenderId,
        isNewCustomLender,
        selectedCustomLender,
        initialRate,
        onSubmit,
        showAprcCalculation,
    ]);

    const updateForm = useCallback(
        <K extends keyof FormState>(key: K, value: FormState[K]) => {
            setForm((prev) => ({ ...prev, [key]: value }));
        },
        [],
    );

    const toggleBuyerType = useCallback((type: string) => {
        setForm((prev) => ({
            ...prev,
            buyerTypes: prev.buyerTypes.includes(type)
                ? prev.buyerTypes.filter((t) => t !== type)
                : [...prev.buyerTypes, type],
        }));
    }, []);

    const toggleBerGroup = useCallback((group: keyof typeof BER_GROUPS) => {
        const groupRatings = BER_GROUPS[group];
        setForm((prev) => {
            const allSelected = groupRatings.every((r) =>
                prev.berEligible.includes(r),
            );
            if (allSelected) {
                return {
                    ...prev,
                    berEligible: prev.berEligible.filter(
                        (r) =>
                            !groupRatings.includes(
                                r as (typeof groupRatings)[number],
                            ),
                    ),
                };
            }
            return {
                ...prev,
                berEligible: [
                    ...new Set([...prev.berEligible, ...groupRatings]),
                ],
            };
        });
    }, []);

    const isGroupSelected = useCallback(
        (group: keyof typeof BER_GROUPS) => {
            const groupRatings = BER_GROUPS[group];
            return groupRatings.every((r) => form.berEligible.includes(r));
        },
        [form.berEligible],
    );

    const isGroupPartiallySelected = useCallback(
        (group: keyof typeof BER_GROUPS) => {
            const groupRatings = BER_GROUPS[group];
            const selected = groupRatings.filter((r) =>
                form.berEligible.includes(r),
            );
            return selected.length > 0 && selected.length < groupRatings.length;
        },
        [form.berEligible],
    );

    const togglePerk = useCallback((perkId: string) => {
        setForm((prev) => ({
            ...prev,
            perks: prev.perks.includes(perkId)
                ? prev.perks.filter((id) => id !== perkId)
                : [...prev.perks, perkId],
        }));
    }, []);

    return (
        <>
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
                <div className="space-y-6">
                    {/* Lender Selection */}
                    <div className="space-y-3">
                        <Label className="text-sm font-semibold text-muted-foreground">
                            Lender
                        </Label>
                        <Select
                            value={form.lenderId}
                            onValueChange={(value) =>
                                updateForm("lenderId", value)
                            }
                            disabled={isEditMode}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a lender..." />
                            </SelectTrigger>
                            <SelectContent>
                                {lenders.map((lender) => (
                                    <SelectItem
                                        key={lender.id}
                                        value={lender.id}
                                    >
                                        <LenderOption
                                            lenderId={lender.id}
                                            name={lender.name}
                                        />
                                    </SelectItem>
                                ))}
                                {filteredCustomLenders.length > 0 && (
                                    <>
                                        <SelectSeparator />
                                        {filteredCustomLenders.map(
                                            (customLender) => (
                                                <SelectItem
                                                    key={customLender.id}
                                                    value={customLender.id}
                                                >
                                                    <LenderOption
                                                        lenderId={
                                                            customLender.id
                                                        }
                                                        name={customLender.name}
                                                        isCustom
                                                    />
                                                </SelectItem>
                                            ),
                                        )}
                                    </>
                                )}
                                <SelectSeparator />
                                <SelectItem value={CUSTOM_LENDER_VALUE}>
                                    <div className="flex items-center gap-2">
                                        <Pencil className="h-4 w-4 text-muted-foreground" />
                                        <span>New custom lender...</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        {isNewCustomLender && (
                            <Input
                                placeholder="Enter custom lender name"
                                value={form.customLenderName}
                                onChange={(e) =>
                                    updateForm(
                                        "customLenderName",
                                        e.target.value,
                                    )
                                }
                                disabled={isEditMode}
                            />
                        )}
                    </div>

                    {/* Rate Name */}
                    <div className="space-y-2">
                        <Label htmlFor="rate-name">Rate Name</Label>
                        <Input
                            id="rate-name"
                            placeholder="e.g., Green Fixed 3 Year"
                            value={form.name}
                            onChange={(e) => updateForm("name", e.target.value)}
                        />
                    </div>

                    {/* Rate Type and Term */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Rate Type</Label>
                            <Select
                                value={form.type}
                                onValueChange={(value: RateType) =>
                                    updateForm("type", value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {RATE_TYPES.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {type.charAt(0).toUpperCase() +
                                                type.slice(1)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {form.type === "fixed" && (
                            <div className="space-y-2">
                                <Label htmlFor="fixed-term">
                                    Fixed Term (years)
                                </Label>
                                <Input
                                    id="fixed-term"
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={form.fixedTerm}
                                    onChange={(e) =>
                                        updateForm("fixedTerm", e.target.value)
                                    }
                                />
                            </div>
                        )}
                    </div>

                    {/* Interest Rate & APRC */}
                    <div className="space-y-3">
                        {/* APRC Mode Toggle - only shown when showAprcCalculation is true */}
                        <div className="flex items-center gap-4">
                            <p className="text-sm font-semibold text-muted-foreground">
                                Rate & APRC
                            </p>
                            {showAprcCalculation && (
                                <RadioGroup
                                    value={form.aprcMode}
                                    onValueChange={(value) =>
                                        updateForm(
                                            "aprcMode",
                                            value as "fees" | "direct",
                                        )
                                    }
                                    className="flex gap-3 ml-auto"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <RadioGroupItem
                                            value="fees"
                                            id="aprc-mode-fees"
                                            className="h-3.5 w-3.5"
                                        />
                                        <Label
                                            htmlFor="aprc-mode-fees"
                                            className="text-xs cursor-pointer text-muted-foreground font-normal"
                                        >
                                            Calculate from fees
                                        </Label>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <RadioGroupItem
                                            value="direct"
                                            id="aprc-mode-direct"
                                            className="h-3.5 w-3.5"
                                        />
                                        <Label
                                            htmlFor="aprc-mode-direct"
                                            className="text-xs cursor-pointer text-muted-foreground font-normal"
                                        >
                                            Enter APRC
                                        </Label>
                                    </div>
                                </RadioGroup>
                            )}
                        </div>

                        {/* Interest Rate + Fees/APRC in one row */}
                        <div className="flex gap-4">
                            {/* Interest Rate - always visible */}
                            <div className="space-y-2">
                                <Label htmlFor="rate">Interest Rate</Label>
                                <div className="relative w-28">
                                    <Input
                                        id="rate"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="3.45"
                                        value={form.rate}
                                        onChange={(e) =>
                                            updateForm("rate", e.target.value)
                                        }
                                        className="pr-7"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                        %
                                    </span>
                                </div>
                            </div>

                            {showAprcCalculation && form.aprcMode === "fees" ? (
                                <>
                                    <div className="space-y-2 flex-1">
                                        <Label
                                            htmlFor="valuation-fee"
                                            className="flex items-center gap-1"
                                        >
                                            Valuation Fee
                                            <GlossaryTermTooltip
                                                termId="valuationFee"
                                                showFull={false}
                                                side="top"
                                            />
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                                €
                                            </span>
                                            <Input
                                                id="valuation-fee"
                                                type="number"
                                                step="1"
                                                min="0"
                                                placeholder={DEFAULT_APRC_FEES.valuationFee.toString()}
                                                value={form.valuationFee}
                                                onChange={(e) =>
                                                    updateForm(
                                                        "valuationFee",
                                                        e.target.value,
                                                    )
                                                }
                                                className="pl-7"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2 flex-1">
                                        <Label
                                            htmlFor="security-fee"
                                            className="flex items-center gap-1"
                                        >
                                            Release Fee
                                            <GlossaryTermTooltip
                                                termId="securityReleaseFee"
                                                showFull={false}
                                                side="top"
                                            />
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                                €
                                            </span>
                                            <Input
                                                id="security-fee"
                                                type="number"
                                                step="1"
                                                min="0"
                                                placeholder={DEFAULT_APRC_FEES.securityReleaseFee.toString()}
                                                value={form.securityReleaseFee}
                                                onChange={(e) =>
                                                    updateForm(
                                                        "securityReleaseFee",
                                                        e.target.value,
                                                    )
                                                }
                                                className="pl-7"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="aprc"
                                        className="flex items-center gap-1"
                                    >
                                        APRC
                                        <GlossaryTermTooltip
                                            termId="aprc"
                                            showFull={false}
                                            side="top"
                                        />
                                    </Label>
                                    <div className="relative w-28">
                                        <Input
                                            id="aprc"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="4.50"
                                            value={form.aprc}
                                            onChange={(e) =>
                                                updateForm(
                                                    "aprc",
                                                    e.target.value,
                                                )
                                            }
                                            className="pr-7"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                            %
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* LTV Range */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>LTV Range</Label>
                            <span className="text-sm text-muted-foreground">
                                {form.ltvRange[0]}% – {form.ltvRange[1]}%
                            </span>
                        </div>
                        <Slider
                            value={form.ltvRange}
                            onValueChange={(value) =>
                                updateForm(
                                    "ltvRange",
                                    value as [number, number],
                                )
                            }
                            min={0}
                            max={90}
                            step={5}
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground px-1">
                            {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map(
                                (val) => (
                                    <span key={val} className="w-4 text-center">
                                        {val}
                                    </span>
                                ),
                            )}
                        </div>
                    </div>

                    {/* Customer Eligibility */}
                    <div className="space-y-2">
                        <Label>Customer Eligibility</Label>
                        <Select
                            value={form.customerEligibility}
                            onValueChange={(value: CustomerEligibility) =>
                                updateForm("customerEligibility", value)
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All customers
                                </SelectItem>
                                <SelectItem value="new">
                                    New customers only
                                </SelectItem>
                                <SelectItem value="existing">
                                    Existing customers only
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Buyer Types */}
                    <div className="space-y-4">
                        <p className="text-sm font-semibold text-muted-foreground">
                            Buyer Types
                        </p>

                        <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">
                                First Mortgage
                            </p>
                            <div className="flex flex-wrap gap-3">
                                {FIRST_MORTGAGE_BUYER_TYPES.map((type) => {
                                    const id = `buyer-type-${type}`;
                                    return (
                                        <div
                                            key={type}
                                            className="flex items-center gap-2"
                                        >
                                            <Checkbox
                                                id={id}
                                                checked={form.buyerTypes.includes(
                                                    type,
                                                )}
                                                onCheckedChange={() =>
                                                    toggleBuyerType(type)
                                                }
                                            />
                                            <label
                                                htmlFor={id}
                                                className="text-sm cursor-pointer"
                                            >
                                                {BUYER_TYPE_LABELS[type]}
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">
                                Mortgage Switch
                            </p>
                            <div className="flex flex-wrap gap-3">
                                {SWITCHER_BUYER_TYPES.map((type) => {
                                    const id = `buyer-type-${type}`;
                                    // Shorter labels for switcher types (avoid redundant "Switcher")
                                    const label =
                                        type === "switcher-pdh"
                                            ? "First Time Buyer / Mover"
                                            : "Buy To Let";
                                    return (
                                        <div
                                            key={type}
                                            className="flex items-center gap-2"
                                        >
                                            <Checkbox
                                                id={id}
                                                checked={form.buyerTypes.includes(
                                                    type,
                                                )}
                                                onCheckedChange={() =>
                                                    toggleBuyerType(type)
                                                }
                                            />
                                            <label
                                                htmlFor={id}
                                                className="text-sm cursor-pointer"
                                            >
                                                {label}
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* BER Eligibility */}
                    <div className="space-y-4">
                        <p className="text-sm font-semibold text-muted-foreground">
                            BER Eligibility
                        </p>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="all-ber-eligible"
                                checked={form.allBerEligible}
                                onCheckedChange={(checked) =>
                                    updateForm("allBerEligible", !!checked)
                                }
                            />
                            <label
                                htmlFor="all-ber-eligible"
                                className="text-sm cursor-pointer"
                            >
                                All BER ratings eligible
                            </label>
                        </div>
                        {!form.allBerEligible && (
                            <div className="space-y-3 pt-2">
                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">
                                        Green (A & B)
                                    </p>
                                    <div className="flex gap-4">
                                        {GREEN_BER_GROUPS.map((group) => (
                                            <div
                                                key={group}
                                                className="flex items-center gap-2"
                                            >
                                                <Checkbox
                                                    id={`ber-group-${group}`}
                                                    checked={isGroupSelected(
                                                        group,
                                                    )}
                                                    onCheckedChange={() =>
                                                        toggleBerGroup(group)
                                                    }
                                                    className={
                                                        isGroupPartiallySelected(
                                                            group,
                                                        )
                                                            ? "data-[state=unchecked]:bg-primary/30"
                                                            : ""
                                                    }
                                                />
                                                <label
                                                    htmlFor={`ber-group-${group}`}
                                                    className="text-sm cursor-pointer font-medium"
                                                >
                                                    {group}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">
                                        Other
                                    </p>
                                    <div className="flex flex-wrap gap-4">
                                        {OTHER_BER_GROUPS.map((group) => (
                                            <div
                                                key={group}
                                                className="flex items-center gap-2"
                                            >
                                                <Checkbox
                                                    id={`ber-group-${group}`}
                                                    checked={isGroupSelected(
                                                        group,
                                                    )}
                                                    onCheckedChange={() =>
                                                        toggleBerGroup(group)
                                                    }
                                                    className={
                                                        isGroupPartiallySelected(
                                                            group,
                                                        )
                                                            ? "data-[state=unchecked]:bg-primary/30"
                                                            : ""
                                                    }
                                                />
                                                <label
                                                    htmlFor={`ber-group-${group}`}
                                                    className="text-sm cursor-pointer font-medium"
                                                >
                                                    {group}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Perks (Optional) */}
                    {availablePerks.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-sm font-semibold text-muted-foreground">
                                Perks
                            </p>
                            <div className="flex flex-wrap gap-3">
                                {availablePerks.map((perk) => {
                                    const id = `perk-${perk.id}`;
                                    return (
                                        <div
                                            key={perk.id}
                                            className="flex items-center gap-2"
                                        >
                                            <Checkbox
                                                id={id}
                                                checked={form.perks.includes(
                                                    perk.id,
                                                )}
                                                onCheckedChange={() =>
                                                    togglePerk(perk.id)
                                                }
                                            />
                                            <label
                                                htmlFor={id}
                                                className="text-sm cursor-pointer flex items-center gap-1.5"
                                                title={perk.description}
                                            >
                                                {perk.label}
                                                {perk.isCustom && (
                                                    <span className="text-xs font-normal px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                                        Custom
                                                    </span>
                                                )}
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 bg-background z-10 px-6 py-4 border-t flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                    Custom rates are stored locally in your browser.
                </p>
                {submitButton({
                    onClick: handleSubmit,
                    disabled: !isFormValid,
                })}
            </div>
        </>
    );
}

export type { CustomLenderInfo };
