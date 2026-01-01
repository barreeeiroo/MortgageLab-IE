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
import { type ReactNode, useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
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

	// Track sticky column widths for calculating left offsets
	const stickyWidthsRef = useRef<Map<string, number>>(new Map());
	const [stickyOffsets, setStickyOffsets] = useState<Map<string, number>>(
		new Map(),
	);

	// Find sticky column IDs and the last one for shadow styling
	const stickyLeftColumnIds = columns
		.filter((col) => (col.meta as { sticky?: boolean } | undefined)?.sticky)
		.map((col) =>
			"accessorKey" in col
				? String(col.accessorKey)
				: "id" in col
					? String(col.id)
					: "",
		);
	const lastStickyLeftColumnId =
		stickyLeftColumnIds[stickyLeftColumnIds.length - 1];

	// Find sticky-right column IDs
	const stickyRightColumnIds = columns
		.filter(
			(col) => (col.meta as { stickyRight?: boolean } | undefined)?.stickyRight,
		)
		.map((col) =>
			"accessorKey" in col
				? String(col.accessorKey)
				: "id" in col
					? String(col.id)
					: "",
		);
	const firstStickyRightColumnId = stickyRightColumnIds[0];

	// Callback to measure sticky column widths
	const measureStickyColumn = useCallback(
		(columnId: string, element: HTMLTableCellElement | null) => {
			if (!element) return;
			const width = element.offsetWidth;
			const currentWidth = stickyWidthsRef.current.get(columnId);
			if (currentWidth !== width) {
				stickyWidthsRef.current.set(columnId, width);
				// Recalculate all offsets
				const newOffsets = new Map<string, number>();
				let cumulative = 0;
				for (const col of columns) {
					const colId =
						"accessorKey" in col
							? String(col.accessorKey)
							: "id" in col
								? String(col.id)
								: "";
					const meta = col.meta as { sticky?: boolean } | undefined;
					if (meta?.sticky) {
						newOffsets.set(colId, cumulative);
						cumulative += stickyWidthsRef.current.get(colId) ?? 0;
					}
				}
				setStickyOffsets(newOffsets);
			}
		},
		[columns],
	);

	// Helper to get sticky styles for a column
	const getStickyStyles = (
		columnId: string,
		meta: { sticky?: boolean; stickyRight?: boolean } | undefined,
		isHeader: boolean,
	): React.CSSProperties | undefined => {
		if (meta?.sticky) {
			const left = stickyOffsets.get(columnId) ?? 0;
			return {
				position: "sticky",
				left,
				zIndex: isHeader ? 2 : 1,
			};
		}
		if (meta?.stickyRight) {
			return {
				position: "sticky",
				right: 0,
				zIndex: isHeader ? 2 : 1,
			};
		}
		return undefined;
	};

	// Check if column is the last sticky-left column (for shadow on right)
	const isLastStickyLeftColumn = (columnId: string): boolean => {
		return columnId === lastStickyLeftColumnId;
	};

	// Check if column is the first sticky-right column (for shadow on left)
	const isFirstStickyRightColumn = (columnId: string): boolean => {
		return columnId === firstStickyRightColumnId;
	};

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
							{headerGroup.headers.map((header) => {
								const meta = header.column.columnDef.meta as
									| { sticky?: boolean; stickyRight?: boolean }
									| undefined;
								const isSticky = meta?.sticky || meta?.stickyRight;
								const isLastStickyLeft = isLastStickyLeftColumn(
									header.column.id,
								);
								const isFirstStickyRight = isFirstStickyRightColumn(
									header.column.id,
								);
								const stickyStyles = getStickyStyles(
									header.column.id,
									meta,
									true,
								);
								return (
									<TableHead
										key={header.id}
										ref={
											meta?.sticky
												? (el) => measureStickyColumn(header.column.id, el)
												: undefined
										}
										className={cn(
											isSticky && "bg-background",
											isLastStickyLeft &&
												"shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",
											isFirstStickyRight &&
												"shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]",
										)}
										style={stickyStyles}
									>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								);
							})}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows?.length ? (
						table.getRowModel().rows.map((row) => (
							<TableRow
								key={row.id}
								data-state={row.getIsSelected() && "selected"}
								className="group"
							>
								{row.getVisibleCells().map((cell) => {
									const meta = cell.column.columnDef.meta as
										| { sticky?: boolean; stickyRight?: boolean }
										| undefined;
									const isSticky = meta?.sticky || meta?.stickyRight;
									const isLastStickyLeft = isLastStickyLeftColumn(
										cell.column.id,
									);
									const isFirstStickyRight = isFirstStickyRightColumn(
										cell.column.id,
									);
									const stickyStyles = getStickyStyles(
										cell.column.id,
										meta,
										false,
									);
									return (
										<TableCell
											key={cell.id}
											className={cn(
												isSticky &&
													"bg-background transition-colors group-hover:bg-muted",
												isLastStickyLeft &&
													"shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",
												isFirstStickyRight &&
													"shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]",
											)}
											style={stickyStyles}
										>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									);
								})}
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
