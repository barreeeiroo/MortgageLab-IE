import { useStore } from "@nanostores/react";
import {
	ArrowLeftRight,
	CalendarClock,
	RefreshCw,
	TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchLendersData } from "@/lib/data/fetch";
import { fetchAllHistory } from "@/lib/data/fetch-history";
import type { Lender } from "@/lib/schemas/lender";
import type { RatesHistoryFile } from "@/lib/schemas/rate-history";
import {
	$historyActiveTab,
	type HistoryTab,
	setHistoryTab,
} from "@/lib/stores/rates/rates-history-ui";
import { HistoricalComparison } from "./HistoricalComparison";
import { TrendCharts } from "./TrendCharts";
import { UpdatesTimeline } from "./UpdatesTimeline";

export function HistoryPageIsland() {
	const activeTab = useStore($historyActiveTab);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [historyData, setHistoryData] = useState<Map<string, RatesHistoryFile>>(
		new Map(),
	);
	const [lenders, setLenders] = useState<Lender[]>([]);

	// Load history data and lenders on mount
	useEffect(() => {
		let cancelled = false;

		async function loadData() {
			setLoading(true);
			setError(null);

			try {
				// First fetch lenders, then history (history needs lenders)
				const lenderData = await fetchLendersData();
				if (cancelled) return;

				const history = await fetchAllHistory(lenderData);
				if (cancelled) return;

				setHistoryData(history);
				setLenders(lenderData);
				setLoading(false);
			} catch (_err) {
				if (!cancelled) {
					setError("Failed to load historical data");
					setLoading(false);
				}
			}
		}

		loadData();

		return () => {
			cancelled = true;
		};
	}, []);

	if (loading) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
				<RefreshCw className="h-8 w-8 animate-spin mb-4" />
				<p>Loading historical data...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
				<p className="text-destructive">{error}</p>
			</div>
		);
	}

	if (historyData.size === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
				<p>No historical data available</p>
			</div>
		);
	}

	return (
		<Tabs
			value={activeTab}
			onValueChange={(v) => setHistoryTab(v as HistoryTab)}
			className="space-y-4"
		>
			<TabsList className="grid w-full grid-cols-3">
				<TabsTrigger value="updates" className="gap-1.5">
					<CalendarClock className="h-4 w-4" />
					<span className="hidden sm:inline">Updates</span>
				</TabsTrigger>
				<TabsTrigger value="compare" className="gap-1.5">
					<ArrowLeftRight className="h-4 w-4" />
					<span className="hidden sm:inline">Compare</span>
				</TabsTrigger>
				<TabsTrigger value="trends" className="gap-1.5">
					<TrendingUp className="h-4 w-4" />
					<span className="hidden sm:inline">Trends</span>
				</TabsTrigger>
			</TabsList>

			<TabsContent value="updates" className="mt-4">
				<UpdatesTimeline historyData={historyData} lenders={lenders} />
			</TabsContent>

			<TabsContent value="compare" className="mt-4">
				<HistoricalComparison historyData={historyData} lenders={lenders} />
			</TabsContent>

			<TabsContent value="trends" className="mt-4">
				<TrendCharts historyData={historyData} lenders={lenders} />
			</TabsContent>
		</Tabs>
	);
}
