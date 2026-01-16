import type { CompareChartToggleConfig } from "@/lib/stores/simulate/simulate-compare-chart";

interface SimulationLegendItem {
	id: string;
	name: string;
	color: string;
}

interface CompareStaticLegendProps {
	toggles: CompareChartToggleConfig[];
	simulations: SimulationLegendItem[];
}

/**
 * Non-interactive legend for PDF chart exports in comparison view.
 * Shows both data series toggles and simulation identifiers.
 */
export function CompareStaticLegend({
	toggles,
	simulations,
}: CompareStaticLegendProps) {
	return (
		<div className="space-y-2 px-2 pb-2 text-xs" style={{ color: "#374151" }}>
			{/* Data series legend */}
			{toggles.length > 0 && (
				<div className="flex flex-wrap items-center gap-x-4 gap-y-1">
					{toggles.map((toggle) => (
						<div key={toggle.key} className="flex items-center gap-1.5">
							{toggle.lineStyle ? (
								<svg
									className="w-4 h-2.5 shrink-0"
									viewBox="0 0 16 10"
									aria-hidden="true"
								>
									<line
										x1="0"
										y1="5"
										x2="16"
										y2="5"
										strokeWidth="2"
										style={{
											stroke: toggle.color ?? "var(--primary)",
											strokeDasharray:
												toggle.lineStyle === "dashed" ? "4 2" : undefined,
										}}
									/>
								</svg>
							) : (
								<div
									className="h-2.5 w-2.5 rounded-sm shrink-0"
									style={{
										backgroundColor: toggle.color ?? "var(--primary)",
										opacity: toggle.opacity ?? 1,
									}}
								/>
							)}
							<span>{toggle.label}</span>
						</div>
					))}
				</div>
			)}

			{/* Simulation legend */}
			{simulations.length > 0 && (
				<div className="flex flex-wrap items-center gap-x-4 gap-y-1">
					{simulations.map((sim) => (
						<div key={sim.id} className="flex items-center gap-1.5">
							<div
								className="h-2.5 w-2.5 rounded-full shrink-0"
								style={{ backgroundColor: sim.color }}
							/>
							<span className="truncate max-w-[150px]">{sim.name}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
