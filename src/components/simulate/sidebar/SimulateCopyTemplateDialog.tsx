import { useStore } from "@nanostores/react";
import { Banknote } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { $lenders, fetchLenders } from "@/lib/stores/lenders";
import {
    $selfBuildTemplates,
    fetchSelfBuildTemplates,
} from "@/lib/stores/self-build-templates";
import { $simulationState } from "@/lib/stores/simulate/simulate-state";
import { formatCurrency } from "@/lib/utils/currency";
import {
    formatIncrementalPeriod,
    formatTransitionDate,
} from "@/lib/utils/date";

interface SimulateCopyTemplateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mortgageAmount: number;
    onApplyTemplate: (
        stages: { month: number; amount: number; label: string }[],
    ) => void;
}

export function SimulateCopyTemplateDialog({
    open,
    onOpenChange,
    mortgageAmount,
    onApplyTemplate,
}: SimulateCopyTemplateDialogProps) {
    const templates = useStore($selfBuildTemplates);
    const lenders = useStore($lenders);
    const simulationState = useStore($simulationState);

    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

    // Load templates and lenders on mount
    useEffect(() => {
        fetchSelfBuildTemplates();
        fetchLenders();
    }, []);

    // Determine recommended template based on first rate period's lender
    const firstLenderId = simulationState.ratePeriods[0]?.lenderId;
    const firstLender = lenders.find((l) => l.id === firstLenderId);
    const recommendedTemplateId = firstLender?.selfBuildTemplateId;

    // Set default selection to recommended template when dialog opens
    useEffect(() => {
        if (open && recommendedTemplateId && !selectedTemplateId) {
            setSelectedTemplateId(recommendedTemplateId);
        } else if (open && !selectedTemplateId && templates.length > 0) {
            // Default to first non-custom template if no recommendation
            const firstNonCustom = templates.find((t) => t.id !== "custom");
            if (firstNonCustom) {
                setSelectedTemplateId(firstNonCustom.id);
            }
        }
    }, [open, recommendedTemplateId, selectedTemplateId, templates]);

    // Get selected template
    const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

    // Filter out "custom" template from the list
    const availableTemplates = templates.filter((t) => t.id !== "custom");

    // Get lender that owns a template (reverse lookup)
    const getLenderForTemplate = (templateId: string) => {
        return lenders.find((l) => l.selfBuildTemplateId === templateId);
    };

    // Calculate amounts for preview
    const getStageAmount = (percentOfTotal: number) => {
        return Math.round((mortgageAmount * percentOfTotal) / 100);
    };

    const handleApply = () => {
        if (!selectedTemplate || selectedTemplate.stages.length === 0) return;

        // Convert template stages to drawdown stages using defaultMonth from template
        const stages = selectedTemplate.stages.map((stage) => ({
            month: stage.defaultMonth,
            amount: getStageAmount(stage.percentOfTotal),
            label: stage.label,
        }));

        onApplyTemplate(stages);
        onOpenChange(false);
        setSelectedTemplateId("");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Copy from Template</DialogTitle>
                    <DialogDescription>
                        Select a template to pre-fill your drawdown stages. You
                        can adjust the amounts and timing after copying.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Template Selector */}
                    <div className="space-y-2">
                        <Label>Template</Label>
                        <Select
                            value={selectedTemplateId}
                            onValueChange={setSelectedTemplateId}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a template" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableTemplates.map((template) => {
                                    const isRecommended =
                                        template.id === recommendedTemplateId;
                                    const templateLender = isRecommended
                                        ? getLenderForTemplate(template.id)
                                        : null;

                                    return (
                                        <SelectItem
                                            key={template.id}
                                            value={template.id}
                                        >
                                            <div className="flex items-center gap-2">
                                                {templateLender && (
                                                    <LenderLogo
                                                        lenderId={
                                                            templateLender.id
                                                        }
                                                        size={20}
                                                    />
                                                )}
                                                <span>{template.name}</span>
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                        {recommendedTemplateId &&
                            selectedTemplateId === recommendedTemplateId && (
                                <p className="text-xs text-muted-foreground">
                                    Recommended based on your{" "}
                                    {firstLender?.name} mortgage
                                </p>
                            )}
                    </div>

                    {/* Stage Preview */}
                    {selectedTemplate && selectedTemplate.stages.length > 0 && (
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                                Preview ({selectedTemplate.stages.length}{" "}
                                stages)
                            </Label>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {selectedTemplate.stages.map((stage, index) => {
                                    const amount = getStageAmount(
                                        stage.percentOfTotal,
                                    );
                                    const cumulativePercent =
                                        selectedTemplate.stages
                                            .slice(0, index + 1)
                                            .reduce(
                                                (sum, s) =>
                                                    sum + s.percentOfTotal,
                                                0,
                                            );

                                    return (
                                        <Popover key={stage.label}>
                                            <PopoverTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="w-full flex items-center gap-3 p-2 rounded-lg border text-left transition-colors cursor-pointer hover:bg-muted/50"
                                                >
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
                                                        <Banknote className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-sm truncate">
                                                                {stage.label}
                                                            </span>
                                                            <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                                                {
                                                                    stage.percentOfTotal
                                                                }
                                                                %
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <span>
                                                                {formatCurrency(
                                                                    amount /
                                                                        100,
                                                                    {
                                                                        showCents: false,
                                                                    },
                                                                )}
                                                            </span>
                                                            <span>•</span>
                                                            <span>
                                                                {formatTransitionDate(
                                                                    simulationState
                                                                        .input
                                                                        .startDate,
                                                                    stage.defaultMonth,
                                                                    {
                                                                        short: true,
                                                                    },
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                className="w-64"
                                                align="start"
                                            >
                                                <div className="space-y-2">
                                                    <h4 className="font-medium text-sm">
                                                        {stage.label}
                                                    </h4>
                                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                                        <div
                                                            className={
                                                                simulationState
                                                                    .input
                                                                    .startDate
                                                                    ? ""
                                                                    : "col-span-2"
                                                            }
                                                        >
                                                            <span className="text-muted-foreground text-xs">
                                                                Date
                                                            </span>
                                                            <p className="font-medium">
                                                                {formatTransitionDate(
                                                                    simulationState
                                                                        .input
                                                                        .startDate,
                                                                    stage.defaultMonth,
                                                                    {
                                                                        short: true,
                                                                    },
                                                                )}
                                                            </p>
                                                        </div>
                                                        {simulationState.input
                                                            .startDate && (
                                                            <div>
                                                                <span className="text-muted-foreground text-xs">
                                                                    Since Start
                                                                </span>
                                                                <p className="font-medium">
                                                                    {formatIncrementalPeriod(
                                                                        stage.defaultMonth,
                                                                    )}
                                                                </p>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <span className="text-muted-foreground text-xs">
                                                                Amount
                                                            </span>
                                                            <p className="font-medium">
                                                                {formatCurrency(
                                                                    amount /
                                                                        100,
                                                                    {
                                                                        showCents: false,
                                                                    },
                                                                )}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground text-xs">
                                                                % of Mortgage
                                                            </span>
                                                            <p className="font-medium">
                                                                {
                                                                    stage.percentOfTotal
                                                                }
                                                                %
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground text-xs">
                                                                Cumulative %
                                                            </span>
                                                            <p className="font-medium">
                                                                {
                                                                    cumulativePercent
                                                                }
                                                                %
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground text-xs">
                                                                Stage
                                                            </span>
                                                            <p className="font-medium">
                                                                {index + 1} of{" "}
                                                                {
                                                                    selectedTemplate
                                                                        .stages
                                                                        .length
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleApply}
                        disabled={
                            !selectedTemplate ||
                            selectedTemplate.stages.length === 0
                        }
                    >
                        Apply Template
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
