import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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

interface ComparePaymentChartProps {
	data: CompareChartDataPoint[];
	simulations: CompareSimulationData[];
	animate?: boolean;
}

/**
 * Payment comparison chart showing total payments per period for each simulation
 */
export function ComparePaymentChart({
	data,
	simulations,
	animate = false,
}: ComparePaymentChartProps) {
	const chartConfig = createCompareChartConfig(simulations);

	return (
		<ChartContainer
			config={chartConfig}
			className="aspect-auto h-[300px] w-full"
		>
			<BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
								<div className="space-y-1">
									{simulations.map((sim) => {
										const payment = dataPoint[`${sim.id}_payment`];
										if (payment === undefined) return null;
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
													{formatChartCurrency(payment as number)}
												</span>
											</div>
										);
									})}
								</div>
							</div>
						);
					}}
				/>
				{simulations.map((sim, _index) => (
					<Bar
						key={sim.id}
						dataKey={`${sim.id}_payment`}
						name={sim.name}
						fill={sim.color}
						radius={[4, 4, 0, 0]}
						isAnimationActive={animate}
						animationDuration={ANIMATION_DURATION}
						// Offset bars for multiple simulations
						barSize={Math.max(8, 40 / simulations.length)}
					/>
				))}
			</BarChart>
		</ChartContainer>
	);
}
