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

interface CompareOverpaymentChartProps {
	data: CompareChartDataPoint[];
	simulations: CompareSimulationData[];
	animate?: boolean;
}

/**
 * Overpayment comparison chart showing cumulative overpayments for each simulation
 */
export function CompareOverpaymentChart({
	data,
	simulations,
	animate = false,
}: CompareOverpaymentChartProps) {
	const chartConfig = createCompareChartConfig(simulations);

	// Check if any simulation has overpayments
	const hasAnyOverpayments = simulations.some(
		(sim) => sim.overpaymentConfigs.length > 0,
	);

	if (!hasAnyOverpayments) {
		return (
			<div className="h-[300px] flex items-center justify-center text-muted-foreground">
				<p>No overpayments configured in any simulation</p>
			</div>
		);
	}

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
								<div className="space-y-1">
									{simulations.map((sim) => {
										const overpayment = dataPoint[`${sim.id}_overpayment`];
										if (overpayment === undefined) return null;
										const hasOverpayments = sim.overpaymentConfigs.length > 0;
										return (
											<div
												key={sim.id}
												className="flex items-center justify-between gap-4"
											>
												<div className="flex items-center gap-1.5">
													<div
														className="h-2.5 w-2.5 rounded-full shrink-0"
														style={{
															backgroundColor: hasOverpayments
																? sim.color
																: "var(--muted)",
														}}
													/>
													<span className="text-muted-foreground text-sm truncate max-w-[100px]">
														{sim.name}
													</span>
												</div>
												<span className="font-mono font-medium text-sm">
													{hasOverpayments
														? formatChartCurrency(overpayment as number)
														: "-"}
												</span>
											</div>
										);
									})}
								</div>
							</div>
						);
					}}
				/>
				{simulations
					.filter((sim) => sim.overpaymentConfigs.length > 0)
					.map((sim) => (
						<Line
							key={sim.id}
							type="monotone"
							dataKey={`${sim.id}_overpayment`}
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
