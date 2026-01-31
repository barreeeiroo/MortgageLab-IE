import { useStore } from "@nanostores/react";
import { History } from "lucide-react";
import { $lenders } from "@/lib/stores/lenders";
import { $ratesMetadata } from "@/lib/stores/rates/rates-state";
import { Button } from "../ui/button";
import { RateUpdatesDialog } from "./RateUpdatesDialog";

export function RatesHeaderActionsIsland() {
    const lenders = useStore($lenders);
    const ratesMetadata = useStore($ratesMetadata);

    return (
        <div className="flex gap-1">
            <RateUpdatesDialog
                lenders={lenders}
                ratesMetadata={ratesMetadata}
            />
            <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
                <a href="/rates/history">
                    <History className="h-4 w-4" />
                    Rate History
                </a>
            </Button>
        </div>
    );
}
