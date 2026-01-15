import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import type {
	CompareChartDataPoint,
	CompareSimulationData,
} from "@/lib/stores/simulate/simulate-compare-calculations";
import {
	ANIMATION_DURATION,
	createCompareChartConfig,
	formatPercentage,
} from "./CompareChartConfig";

interface CompareRateChartProps {
	data: CompareChartDataPoint[];
	simulations: CompareSimulationData[];
	animate?: boolean;
}

/**
 * Rate timeline comparison chart showing interest rates over time
 */
export function CompareRateChart({
	data,
	simulations,
	animate = false,
}: CompareRateChartProps) {
	const chartConfig = createCompareChartConfig(simulations);

	// Calculate domain for Y axis with some padding
	const allRates = simulations.flatMap((sim) =>
		sim.resolvedRatePeriods.map((rp) => rp.rate),
	);
	const minRate = Math.min(...allRates);
	const maxRate = Math.max(...allRates);
	const padding = (maxRate - minRate) * 0.2 || 0.5;

	return (
		<ChartContainer
			config={chartConfig}
			className="aspect-auto h-[300px] w-full"
		>
			<LineChart
				data={data}
				margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
			>
				<CartesianGrid strokeDasharray="3 3" vertical={false} />
				<XAxis
					dataKey="period"
					tickLine={false}
					axisLine={false}
					tickMargin={8}
				/>
				<YAxis
					tickLine={false}
					axisLine={false}
					tickMargin={8}
					width={50}
					tickFormatter={(value) => `${value}%`}
					domain={[
						Math.max(0, Math.floor(minRate - padding)),
						Math.ceil(maxRate + padding),
					]}
				/>
				<ChartTooltip
					content={({ active, payload }) => {
						if (!active || !payload?.length) return null;

						const dataPoint = payload[0].payload as CompareChartDataPoint;

						return (
							<div className="border-border/50 bg-background rounded-lg border px-3 py-2 shadow-xl">
								<div className="font-medium mb-2">{dataPoint.period}</div>
								<div className="space-y-1">
									{simulations.map((sim) => {
										const rate = dataPoint[`${sim.id}_rate`];
										if (rate === undefined) return null;
										return (
											<div
												key={sim.id}
												className="flex items-center justify-between gap-4"
											>
												<div className="flex items-center gap-1.5">
													<div
														className="h-2.5 w-2.5 rounded-full shrink-0"
														style={{ backgroundColor: sim.color }}
													/>
													<span className="text-muted-foreground text-sm truncate max-w-[100px]">
														{sim.name}
													</span>
												</div>
												<span className="font-mono font-medium text-sm">
													{formatPercentage(rate as number)}
												</span>
											</div>
										);
									})}
								</div>
							</div>
						);
					}}
				/>
				{simulations.map((sim) => (
					<Line
						key={sim.id}
						type="stepAfter"
						dataKey={`${sim.id}_rate`}
						name={sim.name}
						stroke={sim.color}
						strokeWidth={2}
						dot={false}
						isAnimationActive={animate}
						animationDuration={ANIMATION_DURATION}
						connectNulls
					/>
				))}
			</LineChart>
		</ChartContainer>
	);
}
