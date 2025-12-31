import { Skeleton } from "../ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "../ui/table";

export function RatesTableSkeleton() {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Lender</TableHead>
					<TableHead>Product</TableHead>
					<TableHead>Type</TableHead>
					<TableHead>Period</TableHead>
					<TableHead className="text-right">Rate</TableHead>
					<TableHead className="text-right">APR</TableHead>
					<TableHead className="text-right">Monthly</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{Array.from({ length: 6 }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows never reorder
					<TableRow key={i}>
						<TableCell>
							<div className="flex items-center gap-2">
								<Skeleton className="h-9 w-9 rounded-md" />
								<Skeleton className="h-4 w-24" />
							</div>
						</TableCell>
						<TableCell>
							<div className="space-y-1">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-3 w-16" />
							</div>
						</TableCell>
						<TableCell>
							<Skeleton className="h-4 w-14" />
						</TableCell>
						<TableCell>
							<Skeleton className="h-4 w-10" />
						</TableCell>
						<TableCell>
							<div className="flex justify-end">
								<Skeleton className="h-4 w-14" />
							</div>
						</TableCell>
						<TableCell>
							<div className="flex justify-end">
								<Skeleton className="h-4 w-14" />
							</div>
						</TableCell>
						<TableCell>
							<div className="flex justify-end">
								<Skeleton className="h-4 w-20" />
							</div>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
