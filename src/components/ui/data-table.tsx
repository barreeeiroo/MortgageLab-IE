import {
	type ColumnDef,
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	type Table as TanstackTable,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";

export type {
	ColumnFiltersState,
	SortingState,
	TanstackTable,
	VisibilityState,
};

import { type ReactNode, useState } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "./table";

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	emptyMessage?: string;
	sorting?: SortingState;
	onSortingChange?: (sorting: SortingState) => void;
	columnFilters?: ColumnFiltersState;
	onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
	columnVisibility?: VisibilityState;
	onColumnVisibilityChange?: (visibility: VisibilityState) => void;
	toolbar?: (table: TanstackTable<TData>) => ReactNode;
}

export function DataTable<TData, TValue>({
	columns,
	data,
	emptyMessage = "No results.",
	sorting: sortingProp,
	onSortingChange,
	columnFilters: columnFiltersProp,
	onColumnFiltersChange,
	columnVisibility,
	onColumnVisibilityChange,
	toolbar,
}: DataTableProps<TData, TValue>) {
	// Use internal state if not controlled
	const [internalSorting, setInternalSorting] = useState<SortingState>([]);
	const [internalFilters, setInternalFilters] = useState<ColumnFiltersState>(
		[],
	);

	const sorting = sortingProp ?? internalSorting;
	const columnFilters = columnFiltersProp ?? internalFilters;

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		onSortingChange: (updater) => {
			const newSorting =
				typeof updater === "function" ? updater(sorting) : updater;
			if (onSortingChange) {
				onSortingChange(newSorting);
			} else {
				setInternalSorting(newSorting);
			}
		},
		getSortedRowModel: getSortedRowModel(),
		onColumnFiltersChange: (updater) => {
			const newFilters =
				typeof updater === "function" ? updater(columnFilters) : updater;
			if (onColumnFiltersChange) {
				onColumnFiltersChange(newFilters);
			} else {
				setInternalFilters(newFilters);
			}
		},
		getFilteredRowModel: getFilteredRowModel(),
		onColumnVisibilityChange: (updater) => {
			if (!onColumnVisibilityChange) return;
			const newVisibility =
				typeof updater === "function"
					? updater(columnVisibility ?? {})
					: updater;
			onColumnVisibilityChange(newVisibility);
		},
		state: {
			sorting,
			columnFilters,
			columnVisibility,
		},
	});

	return (
		<div className="space-y-4">
			{toolbar?.(table)}
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<TableHead key={header.id}>
									{header.isPlaceholder
										? null
										: flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows?.length ? (
						table.getRowModel().rows.map((row) => (
							<TableRow
								key={row.id}
								data-state={row.getIsSelected() && "selected"}
							>
								{row.getVisibleCells().map((cell) => (
									<TableCell key={cell.id}>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell
								colSpan={columns.length}
								className="h-24 text-center text-muted-foreground"
							>
								{emptyMessage}
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}
