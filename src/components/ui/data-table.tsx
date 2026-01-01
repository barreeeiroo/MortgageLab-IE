import {
	type ColumnDef,
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type PaginationState,
	type SortingState,
	type Table as TanstackTable,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";

export type {
	ColumnFiltersState,
	PaginationState,
	SortingState,
	TanstackTable,
	VisibilityState,
};

import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "./button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./select";
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
	// Pagination
	pagination?: PaginationState;
	onPaginationChange?: (pagination: PaginationState) => void;
	pageSizeOptions?: number[];
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
	pagination: paginationProp,
	onPaginationChange,
	pageSizeOptions = [10, 25, 50, 100],
}: DataTableProps<TData, TValue>) {
	// Use internal state if not controlled
	const [internalSorting, setInternalSorting] = useState<SortingState>([]);
	const [internalFilters, setInternalFilters] = useState<ColumnFiltersState>(
		[],
	);
	const [internalPagination, setInternalPagination] = useState<PaginationState>(
		{ pageIndex: 0, pageSize: 25 },
	);

	const sorting = sortingProp ?? internalSorting;
	const columnFilters = columnFiltersProp ?? internalFilters;
	const pagination = paginationProp ?? internalPagination;

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
		getPaginationRowModel: getPaginationRowModel(),
		onPaginationChange: (updater) => {
			const newPagination =
				typeof updater === "function" ? updater(pagination) : updater;
			if (onPaginationChange) {
				onPaginationChange(newPagination);
			} else {
				setInternalPagination(newPagination);
			}
		},
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			pagination,
		},
	});

	const totalRows = table.getFilteredRowModel().rows.length;
	const currentPage = table.getState().pagination.pageIndex;
	const pageSize = table.getState().pagination.pageSize;
	const pageCount = table.getPageCount();

	// Generate page numbers to display (with ellipsis for many pages)
	const getPageNumbers = (): (number | "ellipsis")[] => {
		const pages: (number | "ellipsis")[] = [];
		const maxVisible = 5;

		if (pageCount <= maxVisible) {
			for (let i = 0; i < pageCount; i++) {
				pages.push(i);
			}
		} else {
			// Always show first page
			pages.push(0);

			if (currentPage > 2) {
				pages.push("ellipsis");
			}

			// Show pages around current page
			const start = Math.max(1, currentPage - 1);
			const end = Math.min(pageCount - 2, currentPage + 1);

			for (let i = start; i <= end; i++) {
				if (!pages.includes(i)) {
					pages.push(i);
				}
			}

			if (currentPage < pageCount - 3) {
				pages.push("ellipsis");
			}

			// Always show last page
			if (!pages.includes(pageCount - 1)) {
				pages.push(pageCount - 1);
			}
		}

		return pages;
	};

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

			{/* Pagination Controls */}
			{totalRows > 0 && (
				<div className="flex items-center justify-between text-sm">
					<div className="flex items-center gap-2 text-muted-foreground">
						<span>Rates per page</span>
						<Select
							value={String(pageSize)}
							onValueChange={(value) => {
								table.setPageSize(Number(value));
							}}
						>
							<SelectTrigger className="h-8 w-[70px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{pageSizeOptions.map((size) => (
									<SelectItem key={size} value={String(size)}>
										{size}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Page Number Buttons */}
					{pageCount > 1 && (
						<div className="flex items-center gap-1">
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								onClick={() => table.previousPage()}
								disabled={!table.getCanPreviousPage()}
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>
							{getPageNumbers().map((page, idx) =>
								page === "ellipsis" ? (
									<span
										key={`ellipsis-${idx}`}
										className="px-2 text-muted-foreground"
									>
										...
									</span>
								) : (
									<Button
										key={page}
										variant="ghost"
										size="sm"
										className={`h-8 w-8 p-0 ${
											currentPage === page
												? "bg-muted font-medium"
												: ""
										}`}
										onClick={() => table.setPageIndex(page)}
									>
										{page + 1}
									</Button>
								),
							)}
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8"
								onClick={() => table.nextPage()}
								disabled={!table.getCanNextPage()}
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>
					)}

					<span className="text-muted-foreground">
						{currentPage * pageSize + 1}-
						{Math.min((currentPage + 1) * pageSize, totalRows)} of {totalRows}
					</span>
				</div>
			)}
		</div>
	);
}
