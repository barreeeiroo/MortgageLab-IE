import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { CompareValidation } from "@/lib/stores/simulate/simulate-compare";

interface SimulateCompareWarningProps {
    errors: CompareValidation["errors"];
    warnings: CompareValidation["warnings"];
    infos: CompareValidation["infos"];
}

/**
 * Display validation errors, warnings, and infos for comparison
 */
export function SimulateCompareWarning({
    errors,
    warnings,
    infos,
}: SimulateCompareWarningProps) {
    if (errors.length === 0 && warnings.length === 0 && infos.length === 0)
        return null;

    return (
        <div className="space-y-3 mb-6">
            {/* Errors */}
            {errors.map((error) => (
                <Alert key={error.type} variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Cannot Compare</AlertTitle>
                    <AlertDescription>{error.message}</AlertDescription>
                </Alert>
            ))}

            {/* Warnings */}
            {warnings.map((warning) => (
                <Alert key={warning.type} variant="default">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertTitle>{warning.message}</AlertTitle>
                    {warning.details && (
                        <AlertDescription>{warning.details}</AlertDescription>
                    )}
                </Alert>
            ))}

            {/* Infos */}
            {infos.map((info) => (
                <Alert key={info.type} variant="default">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertTitle>{info.message}</AlertTitle>
                    {info.details && (
                        <AlertDescription>{info.details}</AlertDescription>
                    )}
                </Alert>
            ))}
        </div>
    );
}
