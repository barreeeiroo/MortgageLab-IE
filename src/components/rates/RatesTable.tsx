import type { Column, ColumnDef, FilterFn } from "@tanstack/react-table";
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	ListFilter,
	TriangleAlert,
} from "lucide-react";
import { useMemo } from "react";
import {
	getAvailableFixedTerms,
	getLender,
	type Lender,
	type MortgageRate,
} from "@/lib/data";
import { useLocalStorage } from "@/lib/hooks";
import { cn, formatCurrency } from "@/lib/utils";
import { LenderLogo } from "../LenderLogo";
import { Button } from "../ui/button";
import { ColumnVisibilityToggle } from "../ui/column-visibility-toggle";
import {
	type ColumnFiltersState,
	DataTable,
	type SortingState,
	type VisibilityState,
} from "../ui/data-table";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { RateUpdatesDialog } from "./RateUpdatesDialog";

interface RatesMetadata {
	lenderId: string;
	lastScrapedAt: string;
	lastUpdatedAt: string;
}

interface RatesTableProps {
	rates: MortgageRate[];
	lenders: Lender[];
	ratesMetadata: RatesMetadata[];
	mortgageAmount: number;
	mortgageTerm: number;
}

interface RateRow extends MortgageRate {
	monthlyPayment: number;
}

function calculateMonthlyPayment(
	principal: number,
	annualRate: number,
	years: number,
): number {
	const monthlyRate = annualRate / 100 / 12;
	const numPayments = years * 12;

	if (monthlyRate === 0) {
		return principal / numPayments;
	}

	return (
		(principal * (monthlyRate * (1 + monthlyRate) ** numPayments)) /
		((1 + monthlyRate) ** numPayments - 1)
	);
}

// Custom filter function for array-based multi-select filtering
const arrayIncludesFilter: FilterFn<RateRow> = (row, columnId, filterValue) => {
	if (!filterValue || filterValue.length === 0) return true;
	const value = row.getValue(columnId);
	return filterValue.includes(value);
};

function SortIcon({ isSorted }: { isSorted: false | "asc" | "desc" }) {
	if (isSorted === "asc") {
		return <ArrowUp className="ml-1.5 h-4 w-4 text-primary" />;
	}
	if (isSorted === "desc") {
		return <ArrowDown className="ml-1.5 h-4 w-4 text-primary" />;
	}
	return <ArrowUpDown className="ml-1.5 h-4 w-4" />;
}

interface ColumnHeaderProps<TData> {
	column: Column<TData>;
	title: string;
	filterOptions?: { label: string; value: string | number }[];
	align?: "left" | "center" | "right";
}

function ColumnHeader<TData>({
	column,
	title,
	filterOptions,
	align = "left",
}: ColumnHeaderProps<TData>) {
	const selectedValues = new Set(
		(column.getFilterValue() as (string | number)[]) ?? [],
	);
	const hasFilter = selectedValues.size > 0;
	const isSorted = column.getIsSorted();

	return (
		<div
			className={cn(
				"flex items-center gap-0.5",
				align === "center" && "justify-center",
				align === "right" && "justify-end",
			)}
		>
			<Button
				variant="ghost"
				size="sm"
				onClick={() => column.toggleSorting(isSorted === "asc")}
				className="h-8 px-2"
			>
				{title}
				<SortIcon isSorted={isSorted} />
			</Button>
			{filterOptions && (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							className={cn(
								"relative h-8 w-8 p-0",
								hasFilter && "text-primary",
							)}
						>
							<ListFilter className="h-4 w-4" />
							{hasFilter && (
								<span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
									{selectedValues.size}
								</span>
							)}
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align={align === "right" ? "end" : "start"}>
						{filterOptions.map((option) => {
							const isSelected = selectedValues.has(option.value);
							return (
								<DropdownMenuCheckboxItem
									key={String(option.value)}
									checked={isSelected}
									onCheckedChange={(checked) => {
										const newValues = new Set(selectedValues);
										if (checked) {
											newValues.add(option.value);
										} else {
											newValues.delete(option.value);
										}
										column.setFilterValue(
											newValues.size > 0 ? Array.from(newValues) : undefined,
										);
									}}
								>
									{option.label}
								</DropdownMenuCheckboxItem>
							);
						})}
						{hasFilter && (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuCheckboxItem
									checked={false}
									onCheckedChange={() => column.setFilterValue(undefined)}
									className="justify-center text-center"
								>
									Clear
								</DropdownMenuCheckboxItem>
							</>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			)}
		</div>
	);
}

function SortableHeader<TData>({
	column,
	title,
	align = "left",
}: {
	column: Column<TData>;
	title: string;
	align?: "left" | "right";
}) {
	const isSorted = column.getIsSorted();

	return (
		<div className={cn("flex", align === "right" && "justify-end")}>
			<Button
				variant="ghost"
				size="sm"
				onClick={() => column.toggleSorting(isSorted === "asc")}
				className="h-8 px-2"
			>
				{title}
				<SortIcon isSorted={isSorted} />
			</Button>
		</div>
	);
}

const typeOptions = [
	{ label: "Fixed", value: "fixed" },
	{ label: "Variable", value: "variable" },
];

const COLUMN_LABELS: Record<string, string> = {
	lenderId: "Lender",
	name: "Product",
	type: "Type",
	fixedTerm: "Period",
	rate: "Rate",
	apr: "APR",
	monthlyPayment: "Monthly",
};

const DEFAULT_VISIBILITY: VisibilityState = {};
const DEFAULT_SORTING: SortingState = [{ id: "monthlyPayment", desc: false }];
const DEFAULT_FILTERS: ColumnFiltersState = [];

const STORAGE_KEYS = {
	columns: "rates-table-columns",
	sorting: "rates-table-sorting",
	filters: "rates-table-filters",
} as const;

function createColumns(
	rates: MortgageRate[],
	lenders: Lender[],
): ColumnDef<RateRow>[] {
	const availableFixedTerms = getAvailableFixedTerms(rates);
	const periodOptions = availableFixedTerms.map((term) => ({
		label: `${term} year`,
		value: term,
	}));
	const lenderOptions = lenders.map((lender) => ({
		label: lender.name,
		value: lender.id,
	}));

	return [
		{
			accessorKey: "lenderId",
			header: ({ column }) => (
				<ColumnHeader
					column={column}
					title="Lender"
					filterOptions={lenderOptions}
				/>
			),
			cell: ({ row }) => {
				const lender = getLender(lenders, row.original.lenderId);
				return (
					<div className="flex items-center gap-2">
						<LenderLogo lenderId={row.original.lenderId} size={36} />
						<span className="font-medium">
							{lender?.name ?? row.original.lenderId.toUpperCase()}
						</span>
					</div>
				);
			},
			filterFn: arrayIncludesFilter,
			enableHiding: false,
		},
		{
			accessorKey: "name",
			header: "Product",
			cell: ({ row }) => (
				<div className="flex items-start gap-1.5">
					<div>
						<p className="font-medium">{row.original.name}</p>
						<p className="text-xs text-muted-foreground">
							LTV {row.original.minLtv > 0 ? `${row.original.minLtv}-` : "≤"}
							{row.original.maxLtv}%
						</p>
					</div>
					{row.original.warning && (
						<Tooltip>
							<TooltipTrigger asChild>
								<TriangleAlert className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
							</TooltipTrigger>
							<TooltipContent className="max-w-xs">
								{row.original.warning}
							</TooltipContent>
						</Tooltip>
					)}
				</div>
			),
			enableHiding: false,
		},
		{
			accessorKey: "type",
			header: ({ column }) => (
				<ColumnHeader
					column={column}
					title="Type"
					filterOptions={typeOptions}
					align="center"
				/>
			),
			cell: ({ row }) => (
				<div className="text-center capitalize">{row.original.type}</div>
			),
			filterFn: arrayIncludesFilter,
		},
		{
			accessorKey: "fixedTerm",
			header: ({ column }) => (
				<ColumnHeader
					column={column}
					title="Period"
					filterOptions={periodOptions}
					align="center"
				/>
			),
			cell: ({ row }) => (
				<div className="text-center">
					{row.original.type === "fixed" && row.original.fixedTerm
						? `${row.original.fixedTerm} yr`
						: "—"}
				</div>
			),
			sortingFn: (rowA, rowB) => {
				const a = rowA.original.fixedTerm ?? 0;
				const b = rowB.original.fixedTerm ?? 0;
				return a - b;
			},
			filterFn: arrayIncludesFilter,
		},
		{
			accessorKey: "rate",
			header: ({ column }) => (
				<SortableHeader column={column} title="Rate" align="right" />
			),
			cell: ({ row }) => (
				<div className="text-right font-medium">
					{row.original.rate.toFixed(2)}%
				</div>
			),
		},
		{
			accessorKey: "apr",
			header: ({ column }) => (
				<SortableHeader column={column} title="APR" align="right" />
			),
			cell: ({ row }) => (
				<div className="text-right text-muted-foreground">
					{row.original.apr ? `${row.original.apr.toFixed(2)}%` : "—"}
				</div>
			),
			sortingFn: (rowA, rowB) => {
				const a = rowA.original.apr ?? 0;
				const b = rowB.original.apr ?? 0;
				return a - b;
			},
		},
		{
			accessorKey: "monthlyPayment",
			header: ({ column }) => (
				<SortableHeader column={column} title="Monthly" align="right" />
			),
			cell: ({ row }) => (
				<div className="text-right font-medium">
					{formatCurrency(row.original.monthlyPayment, { showCents: true })}
				</div>
			),
		},
	];
}

export function RatesTable({
	rates,
	lenders,
	ratesMetadata,
	mortgageAmount,
	mortgageTerm,
}: RatesTableProps) {
	const [sorting, setSorting] = useLocalStorage<SortingState>(
		STORAGE_KEYS.sorting,
		DEFAULT_SORTING,
	);
	const [columnFilters, setColumnFilters] = useLocalStorage<ColumnFiltersState>(
		STORAGE_KEYS.filters,
		DEFAULT_FILTERS,
	);
	const [columnVisibility, setColumnVisibility] =
		useLocalStorage<VisibilityState>(STORAGE_KEYS.columns, DEFAULT_VISIBILITY);

	const columns = useMemo(
		() => createColumns(rates, lenders),
		[rates, lenders],
	);

	const data = useMemo<RateRow[]>(
		() =>
			rates.map((rate) => ({
				...rate,
				monthlyPayment: calculateMonthlyPayment(
					mortgageAmount,
					rate.rate,
					mortgageTerm,
				),
			})),
		[rates, mortgageAmount, mortgageTerm],
	);

	if (rates.length === 0) {
		return (
			<div className="text-center py-8 text-muted-foreground">
				No rates match your criteria. Try adjusting your filters.
			</div>
		);
	}

	return (
		<DataTable
			columns={columns}
			data={data}
			emptyMessage="No rates match your filters. Try adjusting your selection."
			sorting={sorting}
			onSortingChange={setSorting}
			columnFilters={columnFilters}
			onColumnFiltersChange={setColumnFilters}
			columnVisibility={columnVisibility}
			onColumnVisibilityChange={setColumnVisibility}
			toolbar={(table) => (
				<div className="flex justify-between">
					<RateUpdatesDialog lenders={lenders} ratesMetadata={ratesMetadata} />
					<ColumnVisibilityToggle table={table} columnLabels={COLUMN_LABELS} />
				</div>
			)}
		/>
	);
}
