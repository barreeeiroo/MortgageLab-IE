import { AlertCircle, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { CompareValidation } from "@/lib/stores/simulate/simulate-compare";

interface SimulateCompareWarningProps {
	errors: CompareValidation["errors"];
	warnings: CompareValidation["warnings"];
}

/**
 * Display validation errors and warnings for comparison
 */
export function SimulateCompareWarning({
	errors,
	warnings,
}: SimulateCompareWarningProps) {
	if (errors.length === 0 && warnings.length === 0) return null;

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
		</div>
	);
}
