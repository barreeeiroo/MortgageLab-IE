import { useStore } from "@nanostores/react";
import { LineChart } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import { elementToPngDataUrl } from "@/lib/export/format/chart-image";
import type {
	CompareChartDataPoint,
	CompareSimulationData,
} from "@/lib/stores/simulate/simulate-compare-calculations";
import {
	$pendingCompareChartCapture,
	completeCompareChartCapture,
} from "@/lib/stores/simulate/simulate-compare-chart-capture";
import { CompareBalanceChart } from "./charts/CompareBalanceChart";
import { CompareCumulativeChart } from "./charts/CompareCumulativeChart";
import { CompareOverpaymentChart } from "./charts/CompareOverpaymentChart";
import { ComparePaymentChart } from "./charts/ComparePaymentChart";
import { CompareRateChart } from "./charts/CompareRateChart";

type CompareChartType =
	| "balance"
	| "payments"
	| "cumulative"
	| "overpayments"
	| "rates";

const CHART_LABELS: Record<CompareChartType, string> = {
	balance: "Balance",
	payments: "Payments",
	cumulative: "Cumulative Costs",
	overpayments: "Overpayments",
	rates: "Interest Rates",
};

interface SimulateCompareChartsProps {
	simulations: CompareSimulationData[];
	yearlyData: CompareChartDataPoint[];
	quarterlyData: CompareChartDataPoint[];
	monthlyData: CompareChartDataPoint[];
}

const ANIMATION_DURATION = 400;

export function SimulateCompareCharts({
	simulations,
	yearlyData,
	quarterlyData,
	monthlyData,
}: SimulateCompareChartsProps) {
	const [activeChart, setActiveChart] = useState<CompareChartType>("balance");
	const [granularity, setGranularity] = useState<
		"yearly" | "quarterly" | "monthly"
	>("yearly");
	const [visibleSimulations, setVisibleSimulations] = useState<Set<string>>(
		() => new Set(simulations.map((s) => s.id)),
	);

	// Track if initial animation has completed
	const hasAnimated = useRef(false);

	// Refs for capturing charts for PDF export
	const captureRefs = useRef<Record<CompareChartType, HTMLDivElement | null>>({
		balance: null,
		payments: null,
		cumulative: null,
		overpayments: null,
		rates: null,
	});

	// Listen for capture requests
	const pendingCapture = useStore($pendingCompareChartCapture);

	useEffect(() => {
		const timer = setTimeout(() => {
			hasAnimated.current = true;
		}, ANIMATION_DURATION + 50);
		return () => clearTimeout(timer);
	}, []);

	// Handle chart capture requests for PDF export
	useEffect(() => {
		if (!pendingCapture) return;

		const waitForChartsAndCapture = async () => {
			const chartTypesToCapture: CompareChartType[] = [
				"balance",
				"cumulative",
				"payments",
			];

			// Wait for refs to be populated and charts to render
			const maxAttempts = 10;
			let attempts = 0;

			const tryCapture = async (): Promise<void> => {
				attempts++;
				const images: { title: string; imageDataUrl: string }[] = [];

				for (const chartType of chartTypesToCapture) {
					const element = captureRefs.current[chartType];
					// Check if element exists and has rendered content (SVG)
					if (element?.querySelector("svg")) {
						try {
							const imageDataUrl = await elementToPngDataUrl(element, {
								pixelRatio: 2,
								backgroundColor: "#ffffff",
							});
							images.push({
								title: CHART_LABELS[chartType],
								imageDataUrl,
							});
						} catch {
							// Skip if capture fails
						}
					}
				}

				// If we captured all charts or exceeded max attempts, complete
				if (
					images.length === chartTypesToCapture.length ||
					attempts >= maxAttempts
				) {
					completeCompareChartCapture(images);
				} else {
					// Retry after a short delay
					setTimeout(tryCapture, 200);
				}
			};

			// Initial delay to let React render the hidden container
			setTimeout(tryCapture, 300);
		};

		waitForChartsAndCapture();
	}, [pendingCapture]);

	// Update visible simulations when simulations change
	useEffect(() => {
		setVisibleSimulations(new Set(simulations.map((s) => s.id)));
	}, [simulations]);

	const toggleSimulationVisibility = (simId: string) => {
		setVisibleSimulations((prev) => {
			const next = new Set(prev);
			if (next.has(simId)) {
				// Don't allow hiding all simulations
				if (next.size > 1) {
					next.delete(simId);
				}
			} else {
				next.add(simId);
			}
			return next;
		});
	};

	const visibleSims = simulations.filter((s) => visibleSimulations.has(s.id));
	const data =
		granularity === "yearly"
			? yearlyData
			: granularity === "quarterly"
				? quarterlyData
				: monthlyData;
	const shouldAnimate = !hasAnimated.current;

	const chartTypes: CompareChartType[] = [
		"balance",
		"payments",
		"cumulative",
		"overpayments",
		"rates",
	];

	return (
		<>
			<Card className="overflow-hidden">
				<CardHeader className="pb-2">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div className="flex items-center gap-2 min-w-0">
							<LineChart className="h-4 w-4 shrink-0 text-muted-foreground" />
							<CardTitle className="truncate">Comparison Charts</CardTitle>
						</div>
						<Tabs
							value={granularity}
							onValueChange={(v) =>
								setGranularity(v as "yearly" | "quarterly" | "monthly")
							}
						>
							<TabsList className="h-8">
								<TabsTrigger value="yearly" className="text-xs px-2">
									<span className="sm:hidden">Y</span>
									<span className="hidden sm:inline">Yearly</span>
								</TabsTrigger>
								<TabsTrigger value="quarterly" className="text-xs px-2">
									<span className="sm:hidden">Q</span>
									<span className="hidden sm:inline">Quarterly</span>
								</TabsTrigger>
								<TabsTrigger value="monthly" className="text-xs px-2">
									<span className="sm:hidden">M</span>
									<span className="hidden sm:inline">Monthly</span>
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>

					{/* Chart type selector */}
					<div className="pt-2">
						<Tabs
							value={activeChart}
							onValueChange={(v) => setActiveChart(v as CompareChartType)}
						>
							<TabsList
								className="h-8 w-full justify-start overflow-x-auto"
								collapseOnMobile
							>
								{chartTypes.map((type) => (
									<TabsTrigger
										key={type}
										value={type}
										className="text-xs px-3 whitespace-nowrap"
									>
										{CHART_LABELS[type]}
									</TabsTrigger>
								))}
							</TabsList>
						</Tabs>
					</div>
				</CardHeader>

				{/* Simulation visibility toggles (legend) */}
				<div className="flex flex-wrap items-center gap-2 px-6 pb-2">
					{simulations.map((sim) => (
						<Toggle
							key={sim.id}
							pressed={visibleSimulations.has(sim.id)}
							onPressedChange={() => toggleSimulationVisibility(sim.id)}
							size="sm"
							className="h-7 gap-1.5 text-xs cursor-pointer hover:bg-muted data-[state=on]:bg-accent"
						>
							<div
								className="h-2.5 w-2.5 rounded-full shrink-0"
								style={{ backgroundColor: sim.color }}
							/>
							<span className="truncate max-w-[100px]">{sim.name}</span>
						</Toggle>
					))}
				</div>

				<CardContent className="pt-0">
					{activeChart === "balance" && (
						<CompareBalanceChart
							data={data}
							simulations={visibleSims}
							animate={shouldAnimate}
						/>
					)}
					{activeChart === "payments" && (
						<ComparePaymentChart
							data={data}
							simulations={visibleSims}
							animate={shouldAnimate}
						/>
					)}
					{activeChart === "cumulative" && (
						<CompareCumulativeChart
							data={data}
							simulations={visibleSims}
							showInterest
							showTotal
							animate={shouldAnimate}
						/>
					)}
					{activeChart === "overpayments" && (
						<CompareOverpaymentChart
							data={data}
							simulations={visibleSims}
							animate={shouldAnimate}
						/>
					)}
					{activeChart === "rates" && (
						<CompareRateChart
							data={data}
							simulations={visibleSims}
							animate={shouldAnimate}
						/>
					)}
				</CardContent>
			</Card>

			{/* Hidden container for capturing charts for PDF export */}
			{pendingCapture && (
				<div
					style={{
						position: "absolute",
						left: "-9999px",
						top: 0,
						width: "800px",
						background: "#ffffff",
					}}
					aria-hidden="true"
				>
					<div
						ref={(el) => {
							captureRefs.current.balance = el;
						}}
						style={{ padding: "16px" }}
					>
						<CompareBalanceChart
							data={yearlyData}
							simulations={simulations}
							animate={false}
						/>
					</div>
					<div
						ref={(el) => {
							captureRefs.current.cumulative = el;
						}}
						style={{ padding: "16px" }}
					>
						<CompareCumulativeChart
							data={yearlyData}
							simulations={simulations}
							showInterest
							showTotal
							animate={false}
						/>
					</div>
					<div
						ref={(el) => {
							captureRefs.current.payments = el;
						}}
						style={{ padding: "16px" }}
					>
						<ComparePaymentChart
							data={yearlyData}
							simulations={simulations}
							animate={false}
						/>
					</div>
				</div>
			)}
		</>
	);
}
