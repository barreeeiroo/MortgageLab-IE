import { useMemo } from "react";
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
	showPrincipal?: boolean;
	showInterest?: boolean;
	monthlyAverage?: boolean;
	granularity?: "yearly" | "quarterly" | "monthly";
	animate?: boolean;
}

// Colors for principal and interest portions
const PRINCIPAL_OPACITY = 1;
const INTEREST_OPACITY = 0.6;

/**
 * Payment comparison chart showing stacked principal + interest per simulation
 */
export function ComparePaymentChart({
	data,
	simulations,
	showPrincipal = true,
	showInterest = true,
	monthlyAverage = false,
	granularity = "yearly",
	animate = false,
}: ComparePaymentChartProps) {
	const chartConfig = createCompareChartConfig(simulations);

	// Calculate bar width based on number of simulations
	const barWidth = Math.max(8, 40 / simulations.length);

	// Calculate the divisor for monthly average
	const monthsPerPeriod =
		granularity === "yearly" ? 12 : granularity === "quarterly" ? 3 : 1;
	const shouldAverage = monthlyAverage && granularity !== "monthly";

	// Transform data for monthly average view
	const chartData = useMemo(() => {
		if (!shouldAverage) return data;

		return data.map((d) => {
			const transformed: CompareChartDataPoint = { ...d };
			for (const sim of simulations) {
				const principalKey = `${sim.id}_principalPortion`;
				const interestKey = `${sim.id}_interestPortion`;
				const paymentKey = `${sim.id}_payment`;

				if (d[principalKey] !== undefined) {
					transformed[principalKey] =
						(d[principalKey] as number) / monthsPerPeriod;
				}
				if (d[interestKey] !== undefined) {
					transformed[interestKey] =
						(d[interestKey] as number) / monthsPerPeriod;
				}
				if (d[paymentKey] !== undefined) {
					transformed[paymentKey] = (d[paymentKey] as number) / monthsPerPeriod;
				}
			}
			return transformed;
		});
	}, [data, shouldAverage, monthsPerPeriod, simulations]);

	return (
		<ChartContainer
			config={chartConfig}
			className="aspect-auto h-[300px] w-full"
		>
			<BarChart
				data={chartData}
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
							<div className="border-border/50 bg-background rounded-lg border px-3 py-2 shadow-xl min-w-[200px]">
								<div className="font-medium mb-2">
									{dataPoint.period}
									{shouldAverage && (
										<span className="text-muted-foreground font-normal text-xs ml-1">
											(monthly avg)
										</span>
									)}
								</div>
								<div className="space-y-2">
									{simulations.map((sim) => {
										const principal = dataPoint[`${sim.id}_principalPortion`];
										const interest = dataPoint[`${sim.id}_interestPortion`];
										const total = dataPoint[`${sim.id}_payment`];
										if (total === undefined) return null;

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
													{showPrincipal && principal !== undefined && (
														<div className="flex justify-between text-sm">
															<span className="text-green-600 dark:text-green-400">
																Principal
															</span>
															<span className="font-mono">
																{formatChartCurrency(principal as number)}
															</span>
														</div>
													)}
													{showInterest && interest !== undefined && (
														<div className="flex justify-between text-sm">
															<span className="text-red-600 dark:text-red-400">
																Interest
															</span>
															<span className="font-mono">
																{formatChartCurrency(interest as number)}
															</span>
														</div>
													)}
													<div className="flex justify-between text-sm border-t pt-0.5 mt-0.5">
														<span className="text-muted-foreground font-medium">
															{shouldAverage ? "Monthly Total" : "Total"}
														</span>
														<span className="font-mono font-medium">
															{formatChartCurrency(total as number)}
														</span>
													</div>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						);
					}}
				/>
				{/* Principal bars (bottom of stack) */}
				{showPrincipal &&
					simulations.map((sim) => (
						<Bar
							key={`${sim.id}_principal`}
							dataKey={`${sim.id}_principalPortion`}
							name={`${sim.name} Principal`}
							fill={sim.color}
							fillOpacity={PRINCIPAL_OPACITY}
							stackId={sim.id}
							radius={showInterest ? [0, 0, 0, 0] : [4, 4, 0, 0]}
							isAnimationActive={animate}
							animationDuration={ANIMATION_DURATION}
							barSize={barWidth}
						/>
					))}
				{/* Interest bars (top of stack) */}
				{showInterest &&
					simulations.map((sim) => (
						<Bar
							key={`${sim.id}_interest`}
							dataKey={`${sim.id}_interestPortion`}
							name={`${sim.name} Interest`}
							fill={sim.color}
							fillOpacity={INTEREST_OPACITY}
							stackId={sim.id}
							radius={[4, 4, 0, 0]}
							isAnimationActive={animate}
							animationDuration={ANIMATION_DURATION}
							barSize={barWidth}
						/>
					))}
			</BarChart>
		</ChartContainer>
	);
}
