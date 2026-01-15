import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import type { CompareChartDataPoint, CompareSimulationData } from "../types";
import {
	ANIMATION_DURATION,
	createCompareChartConfig,
	formatPercentage,
} from "./shared/chartConfig";

interface CompareRateChartProps {
	data: CompareChartDataPoint[];
	simulations: CompareSimulationData[];
	showRate?: boolean;
	showLtv?: boolean;
	animate?: boolean;
}

/**
 * Rate & LTV comparison chart showing interest rates and LTV over time
 */
export function CompareRateChart({
	data,
	simulations,
	showRate = true,
	showLtv = true,
	animate = false,
}: CompareRateChartProps) {
	const chartConfig = createCompareChartConfig(simulations);

	// Calculate domain for Y axis with some padding (for rate)
	const allRates = simulations.flatMap((sim) =>
		sim.resolvedRatePeriods.map((rp) => rp.rate),
	);
	const minRate = Math.min(...allRates);
	const maxRate = Math.max(...allRates);
	const padding = (maxRate - minRate) * 0.2 || 0.5;

	// When showing both, we need to use percentage scale for both
	// Rate is typically 0-10%, LTV is 0-100%
	// We'll use two Y axes
	const showBothAxes = showRate && showLtv;

	return (
		<ChartContainer
			config={chartConfig}
			className="aspect-auto h-[300px] w-full"
		>
			<LineChart
				data={data}
				margin={{ top: 10, right: showBothAxes ? 50 : 10, left: 0, bottom: 0 }}
			>
				<CartesianGrid strokeDasharray="3 3" vertical={false} />
				<XAxis
					dataKey="period"
					tickLine={false}
					axisLine={false}
					tickMargin={8}
				/>
				{/* Left Y-axis for Rate */}
				{showRate && (
					<YAxis
						yAxisId="rate"
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
				)}
				{/* Right Y-axis for LTV */}
				{showLtv && (
					<YAxis
						yAxisId="ltv"
						orientation={showRate ? "right" : "left"}
						tickLine={false}
						axisLine={false}
						tickMargin={8}
						width={50}
						tickFormatter={(value) => `${value}%`}
						domain={[0, 100]}
					/>
				)}
				<ChartTooltip
					content={({ active, payload }) => {
						if (!active || !payload?.length) return null;

						const dataPoint = payload[0].payload as CompareChartDataPoint;

						return (
							<div className="border-border/50 bg-background rounded-lg border px-3 py-2 shadow-xl min-w-[200px]">
								<div className="font-medium mb-2">{dataPoint.period}</div>
								<div className="space-y-2">
									{simulations.map((sim) => {
										const rate = dataPoint[`${sim.id}_rate`];
										const ltv = dataPoint[`${sim.id}_ltv`];
										if (rate === undefined && ltv === undefined) return null;

										return (
											<div key={sim.id} className="space-y-1">
												<div className="flex items-center gap-1.5">
													<div
														className="h-2.5 w-2.5 rounded-full shrink-0"
														style={{ backgroundColor: sim.color }}
													/>
													<span className="text-sm font-medium truncate max-w-[120px]">
														{sim.name}
													</span>
												</div>
												<div className="pl-4 space-y-0.5">
													{showRate && rate !== undefined && (
														<div className="flex justify-between text-sm">
															<span className="text-muted-foreground">
																Rate
															</span>
															<span className="font-mono">
																{formatPercentage(rate as number)}
															</span>
														</div>
													)}
													{showLtv && ltv !== undefined && (
														<div className="flex justify-between text-sm">
															<span className="text-muted-foreground">LTV</span>
															<span className="font-mono">
																{formatPercentage(ltv as number)}
															</span>
														</div>
													)}
												</div>
											</div>
										);
									})}
								</div>
							</div>
						);
					}}
				/>
				{/* Rate lines (solid) */}
				{showRate &&
					simulations.map((sim) => (
						<Line
							key={`${sim.id}_rate`}
							yAxisId="rate"
							type="stepAfter"
							dataKey={`${sim.id}_rate`}
							name={`${sim.name} Rate`}
							stroke={sim.color}
							strokeWidth={2}
							dot={false}
							isAnimationActive={animate}
							animationDuration={ANIMATION_DURATION}
							connectNulls
						/>
					))}
				{/* LTV lines (dashed) */}
				{showLtv &&
					simulations.map((sim) => (
						<Line
							key={`${sim.id}_ltv`}
							yAxisId="ltv"
							type="monotone"
							dataKey={`${sim.id}_ltv`}
							name={`${sim.name} LTV`}
							stroke={sim.color}
							strokeWidth={2}
							strokeDasharray="5 5"
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
