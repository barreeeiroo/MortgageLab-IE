import { useStore } from "@nanostores/react";
import { $hasRequiredData } from "@/lib/stores/simulate";
import {
	$milestones,
	$resolvedRatePeriods,
	$simulationSummary,
	$simulationWarnings,
	$yearlySchedule,
} from "@/lib/stores/simulate/simulate-calculations";
import { SimulateTable } from "./SimulateTable";

export function SimulateTableIsland() {
	const hasRequiredData = useStore($hasRequiredData);
	const yearlySchedule = useStore($yearlySchedule);
	const summary = useStore($simulationSummary);
	const warnings = useStore($simulationWarnings);
	const resolvedRatePeriods = useStore($resolvedRatePeriods);
	const milestones = useStore($milestones);

	if (!hasRequiredData) {
		return null;
	}

	// Create a map of rate period IDs to labels for display
	const ratePeriodLabels = new Map(
		resolvedRatePeriods.map((p) => [p.id, p.label]),
	);

	return (
		<SimulateTable
			yearlySchedule={yearlySchedule}
			summary={summary}
			warnings={warnings}
			ratePeriodLabels={ratePeriodLabels}
			milestones={milestones}
		/>
	);
}
