import { useStore } from "@nanostores/react";
import { Flag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { $milestones } from "@/lib/stores/simulate/simulate-calculations";
import { $hasRequiredData } from "@/lib/stores/simulate/simulate-state";
import { SimulateMilestoneEvent } from "./SimulateEventCard";

export function SimulateMilestonesIsland() {
    const hasRequiredData = useStore($hasRequiredData);
    const milestones = useStore($milestones);

    if (!hasRequiredData || milestones.length === 0) {
        return null;
    }

    return (
        <Card className="py-0 gap-0">
            <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Flag className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm font-medium">
                            Milestones
                        </CardTitle>
                    </div>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {milestones.length}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="pt-0 px-3 pb-3">
                <div className="space-y-2">
                    {milestones.map((milestone) => (
                        <SimulateMilestoneEvent
                            key={`${milestone.type}-${milestone.month}`}
                            milestone={milestone}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
