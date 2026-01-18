import { Button } from "@/components/ui/button";
import type {
	CompareSimulationData,
	CompareSummaryMetric,
} from "@/lib/stores/simulate/simulate-compare-calculations";
import { cn } from "@/lib/utils/cn";
import { formatCurrencyFromCents } from "@/lib/utils/currency";

interface SimulateCompareSummaryProps {
	simulations: CompareSimulationData[];
	summaryMetrics: CompareSummaryMetric[];
	onSimulationClick?: (simulation: CompareSimulationData) => void;
}

/**
 * Summary cards showing key metrics for each simulation
 */
export function SimulateCompareSummary({
	simulations,
	summaryMetrics,
	onSimulationClick,
}: SimulateCompareSummaryProps) {
	if (simulations.length === 0) return null;

	return (
		<div className="space-y-6">
			{/* Simulation summary cards */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
				{simulations.map((sim) => (
					<SimulationCard
						key={sim.id}
						simulation={sim}
						onClick={
							onSimulationClick ? () => onSimulationClick(sim) : undefined
						}
					/>
				))}
			</div>

			{/* Metrics comparison table */}
			<div className="rounded-lg border bg-card">
				<div className="p-4 border-b">
					<h3 className="font-semibold">Key Metrics</h3>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead>
							<tr className="border-b bg-muted/50">
								<th className="text-left p-3 font-medium text-sm">Metric</th>
								{simulations.map((sim) => (
									<th
										key={sim.id}
										className="text-right p-3 font-medium text-sm"
									>
										<div className="flex items-center justify-end gap-2">
											<div
												className="w-3 h-3 rounded-full"
												style={{ backgroundColor: sim.color }}
											/>
											<span
												className={`truncate max-w-[120px] ${sim.isCurrentView ? "italic" : ""}`}
											>
												{sim.name}
											</span>
										</div>
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{summaryMetrics.map((metric) => (
								<tr key={metric.key} className="border-b last:border-b-0">
									<td className="p-3 text-sm text-muted-foreground">
										{metric.label}
									</td>
									{metric.values.map((value) => (
										<td
											key={value.simulationId}
											className={cn(
												"p-3 text-right text-sm font-medium",
												value.isBest && "text-green-600",
												value.isWorst && "text-red-600",
											)}
										>
											{value.formatted}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}

/**
 * Individual simulation card showing inputs and key values
 */
function SimulationCard({
	simulation,
	onClick,
}: {
	simulation: CompareSimulationData;
	onClick?: () => void;
}) {
	const formatCurrency = (cents: number) => formatCurrencyFromCents(cents);

	const formatTerm = (months: number) => {
		const years = Math.floor(months / 12);
		const remainingMonths = months % 12;
		if (remainingMonths === 0) return `${years} years`;
		return `${years}y ${remainingMonths}m`;
	};

	return (
		<Button
			variant="outline"
			onClick={onClick}
			disabled={!onClick}
			className="h-full p-4 flex flex-col items-stretch gap-3 text-left justify-between"
		>
			{/* Top content */}
			<div className="space-y-3">
				{/* Header with color indicator */}
				<div className="flex items-center gap-2">
					<div
						className="w-3 h-3 rounded-full flex-shrink-0"
						style={{ backgroundColor: simulation.color }}
					/>
					<h4
						className={`font-semibold text-base truncate ${simulation.isCurrentView ? "italic" : ""}`}
						title={simulation.name}
					>
						{simulation.name}
					</h4>
					{simulation.isCurrentView && (
						<span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
							Current
						</span>
					)}
				</div>

				{/* Mortgage details */}
				<div className="space-y-1 text-sm w-full">
					<div className="flex justify-between">
						<span className="text-muted-foreground">Property Value</span>
						<span className="font-medium">
							{formatCurrency(simulation.input.propertyValue)}
						</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">Mortgage Amount</span>
						<span className="font-medium">
							{formatCurrency(simulation.input.mortgageAmount)}
						</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">Term</span>
						<span className="font-medium">
							{formatTerm(simulation.input.mortgageTermMonths)}
						</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">Rate Periods</span>
						<span className="font-medium">{simulation.ratePeriods.length}</span>
					</div>
					{simulation.overpaymentConfigs.length > 0 && (
						<div className="flex justify-between">
							<span className="text-muted-foreground">Overpayments</span>
							<span className="font-medium">
								{simulation.overpaymentConfigs.length}
							</span>
						</div>
					)}
				</div>
			</div>

			{/* Key outcome - pushed to bottom */}
			<div className="pt-2 border-t w-full">
				<div className="flex justify-between items-baseline">
					<span className="text-xs text-muted-foreground">Total Interest</span>
					<span className="font-semibold text-lg">
						{formatCurrency(simulation.summary.totalInterest)}
					</span>
				</div>
			</div>
		</Button>
	);
}
