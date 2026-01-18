import { LenderLogo } from "@/components/lenders/LenderLogo";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
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

interface TrendsStatsTableProps {
	rateStats: RateStat[];
}

export function TrendsStatsTable({ rateStats }: TrendsStatsTableProps) {
	if (rateStats.length === 0) {
		return null;
	}

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
