import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { calculateMilestones } from "@/lib/mortgage/simulation";
import type { CompareSimulationData } from "@/lib/stores/simulate/simulate-compare-calculations";
import { formatCurrencyFromCents } from "@/lib/utils/currency";
import {
    SimulateMilestoneEvent,
    SimulateOverpaymentEvent,
    SimulateRatePeriodEvent,
} from "../sidebar/SimulateEventCard";

interface SimulationDetailSheetProps {
    simulation: CompareSimulationData | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Sheet showing read-only details of a simulation
 * Displays rate periods, overpayments, self-build config, and milestones
 */
export function SimulationDetailSheet({
    simulation,
    open,
    onOpenChange,
}: SimulationDetailSheetProps) {
    // Calculate milestones for the simulation
    const milestones = useMemo(() => {
        if (!simulation) return [];
        return calculateMilestones(
            simulation.amortizationSchedule,
            simulation.input.mortgageAmount,
            simulation.input.propertyValue,
            simulation.input.startDate,
            simulation.selfBuildConfig,
        );
    }, [simulation]);

    if (!simulation) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="sm:max-w-md w-full">
                <SheetHeader className="border-b pb-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: simulation.color }}
                        />
                        <SheetTitle
                            className={simulation.isCurrentView ? "italic" : ""}
                            title={simulation.name}
                        >
                            {simulation.name}
                        </SheetTitle>
                    </div>
                    {simulation.isCurrentView && (
                        <SheetDescription>
                            Current simulation view
                        </SheetDescription>
                    )}
                </SheetHeader>

                <ScrollArea className="flex-1 h-[calc(100vh-120px)]">
                    <div className="space-y-6 p-4">
                        {/* Rate Periods Section */}
                        <section className="space-y-3">
                            <h3 className="font-semibold text-sm flex items-center gap-2">
                                <span>Rate Periods</span>
                                <span className="text-xs text-muted-foreground font-normal">
                                    ({simulation.resolvedRatePeriods.length})
                                </span>
                            </h3>
                            <div className="space-y-2">
                                {simulation.resolvedRatePeriods.map(
                                    (period) => (
                                        <SimulateRatePeriodEvent
                                            key={period.id}
                                            period={period}
                                            warnings={[]}
                                            propertyValue={
                                                simulation.input.propertyValue
                                            }
                                            amortizationSchedule={
                                                simulation.amortizationSchedule
                                            }
                                        />
                                    ),
                                )}
                            </div>
                        </section>

                        {/* Overpayments Section */}
                        {simulation.overpaymentConfigs.length > 0 && (
                            <section className="space-y-3">
                                <h3 className="font-semibold text-sm flex items-center gap-2">
                                    <span>Overpayments</span>
                                    <span className="text-xs text-muted-foreground font-normal">
                                        ({simulation.overpaymentConfigs.length})
                                    </span>
                                </h3>
                                <div className="space-y-2">
                                    {simulation.overpaymentConfigs.map(
                                        (config) => (
                                            <SimulateOverpaymentEvent
                                                key={config.id}
                                                config={config}
                                                warnings={[]}
                                            />
                                        ),
                                    )}
                                </div>
                            </section>
                        )}

                        {/* Self-Build Section */}
                        {simulation.selfBuildConfig?.enabled && (
                            <section className="space-y-3">
                                <h3 className="font-semibold text-sm">
                                    Self-Build
                                </h3>
                                <div className="rounded-lg border p-3 space-y-3">
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-muted-foreground text-xs">
                                                Repayment Type
                                            </span>
                                            <p className="font-medium">
                                                {simulation.selfBuildConfig
                                                    .constructionRepaymentType ===
                                                "interest_only"
                                                    ? "Interest Only"
                                                    : "Interest & Capital"}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground text-xs">
                                                Interest Only Period
                                            </span>
                                            <p className="font-medium">
                                                {
                                                    simulation.selfBuildConfig
                                                        .interestOnlyMonths
                                                }{" "}
                                                months
                                            </p>
                                        </div>
                                    </div>

                                    {simulation.selfBuildConfig.drawdownStages
                                        .length > 0 && (
                                        <div className="pt-2 border-t">
                                            <span className="text-muted-foreground text-xs block mb-2">
                                                Drawdown Stages
                                            </span>
                                            <div className="space-y-1">
                                                {simulation.selfBuildConfig.drawdownStages.map(
                                                    (stage) => (
                                                        <div
                                                            key={stage.id}
                                                            className="flex items-center justify-between text-sm"
                                                        >
                                                            <span className="text-muted-foreground">
                                                                Month{" "}
                                                                {stage.month}
                                                                {stage.label &&
                                                                    ` - ${stage.label}`}
                                                            </span>
                                                            <span className="font-medium">
                                                                {formatCurrencyFromCents(
                                                                    stage.amount,
                                                                )}
                                                            </span>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* Milestones Section */}
                        {milestones.length > 0 && (
                            <section className="space-y-3">
                                <h3 className="font-semibold text-sm flex items-center gap-2">
                                    <span>Milestones</span>
                                    <span className="text-xs text-muted-foreground font-normal">
                                        ({milestones.length})
                                    </span>
                                </h3>
                                <div className="space-y-2">
                                    {milestones.map((milestone) => (
                                        <SimulateMilestoneEvent
                                            key={`${milestone.type}-${milestone.month}`}
                                            milestone={milestone}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
