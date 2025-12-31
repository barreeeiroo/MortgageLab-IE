import type { Column, ColumnDef, FilterFn } from "@tanstack/react-table";
import { ArrowUpDown, ListFilter } from "lucide-react";
import { useMemo } from "react";
import {
	getAvailableFixedTerms,
	getLender,
	lenders,
	type MortgageRate,
} from "@/lib/data";
import { cn, formatCurrency } from "@/lib/utils";
import { LenderLogo } from "../LenderLogo";
import { Button } from "../ui/button";
import { DataTable } from "../ui/data-table";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface RatesTableProps {
	rates: MortgageRate[];
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

interface ColumnHeaderProps<TData> {
	column: Column<TData>;
	title: string;
	filterOptions?: { label: string; value: string | number }[];
	align?: "left" | "right";
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
				<ArrowUpDown
					className={cn("ml-1.5 h-4 w-4", isSorted && "text-foreground")}
				/>
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
				<ArrowUpDown
					className={cn("ml-1.5 h-4 w-4", isSorted && "text-foreground")}
				/>
			</Button>
		</div>
	);
}

const typeOptions = [
	{ label: "Fixed", value: "fixed" },
	{ label: "Variable", value: "variable" },
];

function createColumns(): ColumnDef<RateRow>[] {
	const availableFixedTerms = getAvailableFixedTerms();
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
				const lender = getLender(row.original.lenderId);
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
		},
		{
			accessorKey: "name",
			header: "Product",
			cell: ({ row }) => (
				<div>
					<p className="font-medium">{row.original.name}</p>
					<p className="text-xs text-muted-foreground">
						LTV {row.original.minLtv > 0 ? `${row.original.minLtv}-` : "≤"}
						{row.original.maxLtv}%
					</p>
				</div>
			),
		},
		{
			accessorKey: "type",
			header: ({ column }) => (
				<ColumnHeader
					column={column}
					title="Type"
					filterOptions={typeOptions}
				/>
			),
			cell: ({ row }) => (
				<span className="capitalize">{row.original.type}</span>
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
				/>
			),
			cell: ({ row }) =>
				row.original.type === "fixed" && row.original.fixedTerm
					? `${row.original.fixedTerm} yr`
					: "—",
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
	mortgageAmount,
	mortgageTerm,
}: RatesTableProps) {
	const columns = useMemo(() => createColumns(), []);

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
		/>
	);
}
