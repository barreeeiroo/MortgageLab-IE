import { LenderLogo } from "@/components/lenders/LenderLogo";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { TrendsBreakdownDimension } from "@/lib/stores/rates/rates-history-filters";
import { formatShortMonthYearFromString } from "@/lib/utils/date";

export interface RateStat {
	rateId: string;
	rateName: string;
	lenderId: string;
	lenderName: string;
	min: { rate: number; date: string } | null;
	max: { rate: number; date: string } | null;
	current: { rate: number; date: string } | null;
}

export interface MarketOverviewStats {
	currentAverage: number;
	currentMin: number;
	currentMax: number;
	currentDate: string;
	historicalLowest: number;
	historicalLowestDate: string;
	historicalHighest: number;
	historicalHighestDate: string;
	lendersIncluded: number;
	ratesIncluded: number;
}

interface TrendsStatsTableProps {
	rateStats: RateStat[];
	marketStats?: MarketOverviewStats | null;
	isGroupedMode?: boolean;
	breakdownBy?: TrendsBreakdownDimension[];
}

export function TrendsStatsTable({
	rateStats,
	marketStats,
	isGroupedMode = false,
	breakdownBy = [],
}: TrendsStatsTableProps) {
	// Market overview mode
	if (marketStats) {
		return (
			<div className="rounded-lg border overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/50">
							<TableHead className="font-medium">Metric</TableHead>
							<TableHead className="text-right font-medium">Value</TableHead>
							<TableHead className="text-right font-medium">Date</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						<TableRow>
							<TableCell className="font-medium">Current Average</TableCell>
							<TableCell className="text-right">
								<span className="font-mono font-medium">
									{marketStats.currentAverage.toFixed(2)}%
								</span>
							</TableCell>
							<TableCell className="text-right text-muted-foreground">
								Today
							</TableCell>
						</TableRow>
						<TableRow>
							<TableCell className="font-medium">Current Range</TableCell>
							<TableCell className="text-right">
								<span className="font-mono">
									{marketStats.currentMin.toFixed(2)}% -{" "}
									{marketStats.currentMax.toFixed(2)}%
								</span>
							</TableCell>
							<TableCell className="text-right text-muted-foreground">
								Today
							</TableCell>
						</TableRow>
						<TableRow>
							<TableCell className="font-medium">Historical Lowest</TableCell>
							<TableCell className="text-right">
								<span className="font-mono text-green-600 dark:text-green-500">
									{marketStats.historicalLowest.toFixed(2)}%
								</span>
							</TableCell>
							<TableCell className="text-right text-muted-foreground">
								{formatShortMonthYearFromString(
									marketStats.historicalLowestDate,
								)}
							</TableCell>
						</TableRow>
						<TableRow>
							<TableCell className="font-medium">Historical Highest</TableCell>
							<TableCell className="text-right">
								<span className="font-mono text-red-600 dark:text-red-500">
									{marketStats.historicalHighest.toFixed(2)}%
								</span>
							</TableCell>
							<TableCell className="text-right text-muted-foreground">
								{formatShortMonthYearFromString(
									marketStats.historicalHighestDate,
								)}
							</TableCell>
						</TableRow>
						<TableRow>
							<TableCell className="font-medium">Lenders Included</TableCell>
							<TableCell className="text-right">
								<span className="font-mono">{marketStats.lendersIncluded}</span>
							</TableCell>
							<TableCell className="text-right text-muted-foreground">
								—
							</TableCell>
						</TableRow>
						<TableRow>
							<TableCell className="font-medium">Rates Included</TableCell>
							<TableCell className="text-right">
								<span className="font-mono">{marketStats.ratesIncluded}</span>
							</TableCell>
							<TableCell className="text-right text-muted-foreground">
								—
							</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</div>
		);
	}

	// Individual rates mode or breakdown mode
	if (rateStats.length === 0) {
		return null;
	}

	// Breakdown mode: simplified table with group names
	if (isGroupedMode) {
		const showLenderLogo =
			breakdownBy.length === 1 && breakdownBy.includes("lender");
		return (
			<div className="rounded-lg border overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/50">
							<TableHead className="font-medium">Group</TableHead>
							<TableHead className="text-right font-medium">
								Min (Avg)
							</TableHead>
							<TableHead className="text-right font-medium">
								Max (Avg)
							</TableHead>
							<TableHead className="text-right font-medium">
								Current (Avg)
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rateStats.map((stat) => (
							<TableRow key={stat.rateId}>
								<TableCell>
									<div className="flex items-center gap-2">
										{showLenderLogo && stat.lenderId && (
											<LenderLogo lenderId={stat.lenderId} size={36} />
										)}
										<span className="font-medium">{stat.rateName}</span>
									</div>
								</TableCell>
								<TableCell className="text-right">
									{stat.min ? (
										<div>
											<div className="font-mono text-green-600 dark:text-green-500">
												{stat.min.rate.toFixed(2)}%
											</div>
											<div className="text-xs text-muted-foreground">
												{formatShortMonthYearFromString(stat.min.date)}
											</div>
										</div>
									) : (
										"—"
									)}
								</TableCell>
								<TableCell className="text-right">
									{stat.max ? (
										<div>
											<div className="font-mono text-red-600 dark:text-red-500">
												{stat.max.rate.toFixed(2)}%
											</div>
											<div className="text-xs text-muted-foreground">
												{formatShortMonthYearFromString(stat.max.date)}
											</div>
										</div>
									) : (
										"—"
									)}
								</TableCell>
								<TableCell className="text-right">
									{stat.current ? (
										<div className="font-mono font-medium">
											{stat.current.rate.toFixed(2)}%
										</div>
									) : (
										"—"
									)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		);
	}

	// Individual rates mode
	return (
		<div className="rounded-lg border overflow-hidden">
			<Table>
				<TableHeader>
					<TableRow className="bg-muted/50">
						<TableHead className="font-medium">Lender</TableHead>
						<TableHead className="font-medium">Rate</TableHead>
						<TableHead className="text-right font-medium">Min</TableHead>
						<TableHead className="text-right font-medium">Max</TableHead>
						<TableHead className="text-right font-medium">Current</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{rateStats.map((stat) => (
						<TableRow key={stat.rateId}>
							<TableCell>
								<div className="flex items-center gap-2">
									<LenderLogo lenderId={stat.lenderId} size={36} />
									<span className="font-medium">{stat.lenderName}</span>
								</div>
							</TableCell>
							<TableCell className="text-muted-foreground">
								{stat.rateName}
							</TableCell>
							<TableCell className="text-right">
								{stat.min ? (
									<div>
										<div className="font-mono">{stat.min.rate.toFixed(2)}%</div>
										<div className="text-xs text-muted-foreground">
											{formatShortMonthYearFromString(stat.min.date)}
										</div>
									</div>
								) : (
									"—"
								)}
							</TableCell>
							<TableCell className="text-right">
								{stat.max ? (
									<div>
										<div className="font-mono">{stat.max.rate.toFixed(2)}%</div>
										<div className="text-xs text-muted-foreground">
											{formatShortMonthYearFromString(stat.max.date)}
										</div>
									</div>
								) : (
									"—"
								)}
							</TableCell>
							<TableCell className="text-right">
								{stat.current ? (
									<div className="font-mono font-medium">
										{stat.current.rate.toFixed(2)}%
									</div>
								) : (
									"—"
								)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
