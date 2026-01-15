import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import type {
	CompareChartDataPoint,
	CompareSimulationData,
} from "@/lib/stores/simulate/simulate-compare-calculations";
import {
	ANIMATION_DURATION,
	createCompareChartConfig,
	formatChartCurrency,
	formatChartCurrencyShort,
} from "./CompareChartConfig";

interface CompareCumulativeChartProps {
	data: CompareChartDataPoint[];
	simulations: CompareSimulationData[];
	showInterest?: boolean;
	showTotal?: boolean;
	animate?: boolean;
}

/**
 * Cumulative costs comparison chart showing total interest and total paid
 */
export function CompareCumulativeChart({
	data,
	simulations,
	showInterest = true,
	showTotal = false,
	animate = false,
}: CompareCumulativeChartProps) {
	const chartConfig = createCompareChartConfig(simulations);

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
					width={60}
					tickFormatter={formatChartCurrencyShort}
					domain={[0, "auto"]}
				/>
				<ChartTooltip
					content={({ active, payload }) => {
						if (!active || !payload?.length) return null;

						const dataPoint = payload[0].payload as CompareChartDataPoint;

						return (
							<div className="border-border/50 bg-background rounded-lg border px-3 py-2 shadow-xl">
								<div className="font-medium mb-2">{dataPoint.period}</div>
								<div className="space-y-2">
									{simulations.map((sim) => {
										const interest = dataPoint[`${sim.id}_interest`];
										const total = dataPoint[`${sim.id}_total`];
										if (interest === undefined) return null;
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
													{showInterest && (
														<div className="flex justify-between text-sm">
															<span className="text-muted-foreground">
																Interest
															</span>
															<span className="font-mono">
																{formatChartCurrency(interest as number)}
															</span>
														</div>
													)}
													{showTotal && total !== undefined && (
														<div className="flex justify-between text-sm">
															<span className="text-muted-foreground">
																Total
															</span>
															<span className="font-mono">
																{formatChartCurrency(total as number)}
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
				{/* Interest lines (solid) */}
				{showInterest &&
					simulations.map((sim) => (
						<Line
							key={`${sim.id}_interest`}
							type="monotone"
							dataKey={`${sim.id}_interest`}
							name={`${sim.name} Interest`}
							stroke={sim.color}
							strokeWidth={2}
							dot={false}
							isAnimationActive={animate}
							animationDuration={ANIMATION_DURATION}
							connectNulls
						/>
					))}
				{/* Total lines (dashed) */}
				{showTotal &&
					simulations.map((sim) => (
						<Line
							key={`${sim.id}_total`}
							type="monotone"
							dataKey={`${sim.id}_total`}
							name={`${sim.name} Total`}
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
