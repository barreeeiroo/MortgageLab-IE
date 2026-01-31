import { Info, Play, PlusCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type AlertMode = "simulate" | "simulate-add" | null;

export function SimulateRedirectAlert() {
    const [alertMode, setAlertMode] = useState<AlertMode>(null);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const fromParam = urlParams.get("from");

        if (fromParam === "simulate" || fromParam === "simulate-add") {
            setAlertMode(fromParam);

            // Clear the URL param without reloading
            urlParams.delete("from");
            const newUrl = urlParams.toString()
                ? `${window.location.pathname}?${urlParams.toString()}`
                : window.location.pathname;
            window.history.replaceState({}, "", newUrl);
        }
    }, []);

    if (!alertMode) {
        return null;
    }

    const isAddingRate = alertMode === "simulate-add";

    return (
        <Alert className="mb-4 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-800 dark:text-blue-200">
                {isAddingRate
                    ? "Add a rate to your simulation"
                    : "Select a rate to simulate"}
            </AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-300 block">
                {isAddingRate ? (
                    <>
                        Click on a product name to view details, then click{" "}
                        <PlusCircle className="inline h-3 w-3 -mt-0.5" />{" "}
                        <strong>Add to Simulation</strong> to add this rate
                        period to your existing simulation.
                    </>
                ) : (
                    <>
                        Click on a product name to view details, then click{" "}
                        <Play className="inline h-3 w-3 -mt-0.5" />{" "}
                        <strong>Simulate</strong> to model your mortgage with
                        that rate.
                    </>
                )}
            </AlertDescription>
            <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-6 w-6 text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-200 dark:hover:bg-blue-900"
                onClick={() => setAlertMode(null)}
            >
                <X className="h-4 w-4" />
            </Button>
        </Alert>
    );
}
