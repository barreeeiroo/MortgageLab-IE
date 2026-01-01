import type { Column, ColumnDef, FilterFn } from "@tanstack/react-table";
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	Check,
	ChevronRight,
	Coins,
	HelpCircle,
	ListFilter,
	type LucideIcon,
	PiggyBank,
	Plus,
	Share2,
	TriangleAlert,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { GLOSSARY_TERMS_MAP, getMissingVariableRateUrl } from "@/lib/constants";
import {
	getAvailableFixedTerms,
	getLender,
	type Lender,
	type MortgageRate,
	type Perk,
	type RatesMetadata,
	resolvePerks,
} from "@/lib/data";
import { useLocalStorage } from "@/lib/hooks";
import {
	calculateMonthlyFollowUp,
	calculateMonthlyPayment,
	calculateRemainingBalance,
	calculateTotalRepayable,
	findVariableRate,
} from "@/lib/mortgage";
import type { RatesInputValues } from "@/lib/stores";
import { cn, formatCurrency } from "@/lib/utils";
import { LenderLogo } from "../LenderLogo";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { ColumnVisibilityToggle } from "../ui/column-visibility-toggle";
import {
	type ColumnFiltersState,
	DataTable,
	type SortingState,
	type VisibilityState,
} from "../ui/data-table";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "../ui/dialog";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { RateInfoModal } from "./RateInfoModal";
import { RateUpdatesDialog } from "./RateUpdatesDialog";
import { generateRatesShareUrl } from "./share";

interface RatesTableProps {
	rates: MortgageRate[];
	allRates: MortgageRate[]; // Unfiltered rates for follow-up calculation
	lenders: Lender[];
	perks: Perk[];
	ratesMetadata: RatesMetadata[];
	mortgageAmount: number;
	mortgageTerm: number;
	ltv: number;
	inputValues: RatesInputValues;
}

interface RateRow extends MortgageRate {
	monthlyPayment: number;
	followUpRate?: MortgageRate;
	followUpLtv: number; // LTV after fixed term ends (for variable rate matching)
	monthlyFollowUp?: number;
	totalRepayable?: number;
	costOfCreditPct?: number; // (totalRepayable - mortgageAmount) / mortgageAmount * 100
	combinedPerks: string[]; // Lender perks + rate perks (deduplicated)
}

// Custom filter function for array-based multi-select filtering
const arrayIncludesFilter: FilterFn<RateRow> = (row, columnId, filterValue) => {
	if (!filterValue || filterValue.length === 0) return true;
	const value = row.getValue(columnId);
	return filterValue.includes(value);
};

// Custom filter function for perks (uses combinedPerks which includes lender + rate perks)
const perksIncludesFilter: FilterFn<RateRow> = (
	row,
	_columnId,
	filterValue,
) => {
	if (!filterValue || filterValue.length === 0) return true;
	const combinedPerks = row.original.combinedPerks;
	if (!combinedPerks || combinedPerks.length === 0) return false;
	// Row matches if it has at least one of the selected perks
	return filterValue.some((perkId: string) => combinedPerks.includes(perkId));
};

// Map perk icon names to lucide components
const PERK_ICONS: Record<string, LucideIcon> = {
	PiggyBank,
	Coins,
};

function SortIcon({ isSorted }: { isSorted: false | "asc" | "desc" }) {
	if (isSorted === "asc") {
		return <ArrowUp className="h-4 w-4" />;
	}
	if (isSorted === "desc") {
		return <ArrowDown className="h-4 w-4" />;
	}
	return <ArrowUpDown className="h-4 w-4" />;
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
	const canSort = column.getCanSort();
	const isSorted = column.getIsSorted();

	return (
		<div
			className={cn(
				"flex items-center gap-0.5",
				align === "center" && "justify-center",
				align === "right" && "justify-end",
			)}
		>
			<span className="px-2 text-sm font-medium">{title}</span>
			{canSort && (
				<Button
					variant="ghost"
					size="sm"
					onClick={() => column.toggleSorting(isSorted === "asc")}
					className={cn("h-8 w-8 p-0", isSorted && "text-primary")}
				>
					<SortIcon isSorted={isSorted} />
				</Button>
			)}
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
		<div
			className={cn(
				"flex items-center gap-0.5",
				align === "right" && "justify-end",
			)}
		>
			<span className="px-2 text-sm font-medium">{title}</span>
			<Button
				variant="ghost"
				size="sm"
				onClick={() => column.toggleSorting(isSorted === "asc")}
				className={cn("h-8 w-8 p-0", isSorted && "text-primary")}
			>
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
	perks: "Perks",
	type: "Type",
	fixedTerm: "Period",
	rate: "Rate",
	apr: "APRC",
	monthlyPayment: "Monthly",
	followUpProduct: "Follow-Up Product",
	monthlyFollowUp: "Follow-Up Monthly",
	totalRepayable: "Total Repayable",
	costOfCreditPct: "Cost of Credit %",
};

const DEFAULT_VISIBILITY: VisibilityState = {
	perks: false,
	followUpProduct: false,
	monthlyFollowUp: false,
	costOfCreditPct: false,
};
const DEFAULT_SORTING: SortingState = [{ id: "monthlyPayment", desc: false }];
const DEFAULT_FILTERS: ColumnFiltersState = [];

const STORAGE_KEYS = {
	columns: "rates-table-columns",
	sorting: "rates-table-sorting",
	filters: "rates-table-filters",
	pageSize: "rates-table-page-size",
} as const;

function createColumns(
	rates: MortgageRate[],
	lenders: Lender[],
	perks: Perk[],
	inputValues: RatesInputValues,
	onProductClick: (rate: RateRow) => void,
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
	const perkOptions = perks.map((perk) => ({
		label: perk.label,
		value: perk.id,
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
					<div className="flex items-center justify-center lg:justify-start gap-2">
						<LenderLogo lenderId={row.original.lenderId} size={36} />
						<span className="font-medium hidden lg:inline">
							{lender?.name ?? row.original.lenderId.toUpperCase()}
						</span>
					</div>
				);
			},
			filterFn: arrayIncludesFilter,
			enableSorting: false,
			enableHiding: false,
			meta: { sticky: true },
		},
		{
			accessorKey: "name",
			header: "Product",
			cell: ({ row }) => (
				<Button
					variant="ghost"
					className="h-auto w-full justify-between gap-2 px-2 py-1 -ml-2 text-left hover:ring-1 hover:ring-primary/50"
					onClick={() => onProductClick(row.original)}
				>
					<div className="flex items-start gap-1.5">
						<div>
							<p className="font-medium text-primary">{row.original.name}</p>
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
					<ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
				</Button>
			),
			enableHiding: false,
			meta: { sticky: true },
		},
		{
			accessorKey: "perks",
			header: ({ column }) => (
				<ColumnHeader
					column={column}
					title="Perks"
					filterOptions={perkOptions}
					align="center"
				/>
			),
			cell: ({ row }) => {
				const allPerks = resolvePerks(perks, row.original.combinedPerks);

				if (allPerks.length === 0) {
					return <div className="text-center text-muted-foreground">—</div>;
				}
				return (
					<div className="flex items-center justify-center gap-1">
						{allPerks.map((perk) => {
							const IconComponent = PERK_ICONS[perk.icon];
							return (
								<Tooltip key={perk.id}>
									<TooltipTrigger asChild>
										<span className="inline-flex items-center justify-center p-1 rounded hover:bg-muted cursor-help">
											{IconComponent ? (
												<IconComponent className="h-4 w-4 text-muted-foreground" />
											) : null}
										</span>
									</TooltipTrigger>
									<TooltipContent>
										<p className="font-medium">{perk.label}</p>
										{perk.description && (
											<p className="text-xs text-muted-foreground">
												{perk.description}
											</p>
										)}
									</TooltipContent>
								</Tooltip>
							);
						})}
					</div>
				);
			},
			filterFn: perksIncludesFilter,
			enableSorting: false,
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
			enableSorting: false,
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
			header: ({ column }) => {
				const isSorted = column.getIsSorted();
				const aprcTerm = GLOSSARY_TERMS_MAP.aprc;
				return (
					<div className="flex items-center gap-0.5 justify-end">
						<span className="px-2 text-sm font-medium">APRC</span>
						<Tooltip>
							<TooltipTrigger asChild>
								<span className="inline-flex items-center justify-center cursor-help">
									<HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
								</span>
							</TooltipTrigger>
							<TooltipContent className="max-w-xs">
								<p className="font-medium">{aprcTerm.shortDescription}</p>
								<p className="text-xs text-muted-foreground mt-1">
									{aprcTerm.fullDescription}
								</p>
							</TooltipContent>
						</Tooltip>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => column.toggleSorting(isSorted === "asc")}
							className={cn("h-8 w-8 p-0", isSorted && "text-primary")}
						>
							<SortIcon isSorted={isSorted} />
						</Button>
					</div>
				);
			},
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
		{
			id: "followUpProduct",
			accessorFn: (row) => row.followUpRate?.name,
			header: () => {
				const term = GLOSSARY_TERMS_MAP.followUpProduct;
				return (
					<div className="flex items-center gap-0.5">
						<span className="px-2 text-sm font-medium">Follow-Up Product</span>
						<Tooltip>
							<TooltipTrigger asChild>
								<span className="inline-flex items-center justify-center cursor-help">
									<HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
								</span>
							</TooltipTrigger>
							<TooltipContent className="max-w-xs">
								<p className="font-medium">{term.shortDescription}</p>
								<p className="text-xs text-muted-foreground mt-1">
									{term.fullDescription}
								</p>
							</TooltipContent>
						</Tooltip>
					</div>
				);
			},
			cell: ({ row }) => {
				const followUpRate = row.original.followUpRate;
				const isFixed = row.original.type === "fixed";

				// For variable rates, no follow-up product is expected
				if (!isFixed) {
					return <div className="text-center text-muted-foreground">—</div>;
				}

				// For fixed rates without a matching variable rate, show warning
				if (!followUpRate) {
					const lender = getLender(lenders, row.original.lenderId);
					const reportUrl = getMissingVariableRateUrl({
						lenderId: row.original.lenderId,
						lenderName: lender?.name ?? row.original.lenderId,
						fixedRateId: row.original.id,
						fixedRateName: row.original.name,
						fixedRate: row.original.rate,
						fixedTerm: row.original.fixedTerm,
						ltv: row.original.followUpLtv,
						minLtv: row.original.minLtv,
						maxLtv: row.original.maxLtv,
						ratesUrl: lender?.ratesUrl,
						mode: inputValues.mode,
						buyerType: inputValues.buyerType,
						berRating: inputValues.berRating,
					});

					return (
						<Tooltip>
							<TooltipTrigger asChild>
								<a
									href={reportUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center gap-1.5 text-destructive hover:underline"
								>
									<TriangleAlert className="h-4 w-4 shrink-0" />
									<span className="text-xs">Not found</span>
								</a>
							</TooltipTrigger>
							<TooltipContent className="max-w-xs">
								<p className="font-medium">Missing Variable Rate</p>
								<p className="text-xs text-muted-foreground">
									Could not find a matching variable rate for this fixed
									product. Click to report this issue.
								</p>
							</TooltipContent>
						</Tooltip>
					);
				}

				return (
					<div>
						<p className="font-medium">{followUpRate.name}</p>
						<p className="text-xs text-muted-foreground">
							Variable Rate: {followUpRate.rate.toFixed(2)}%
						</p>
					</div>
				);
			},
		},
		{
			accessorKey: "monthlyFollowUp",
			header: ({ column }) => (
				<SortableHeader
					column={column}
					title="Follow-Up Monthly"
					align="right"
				/>
			),
			cell: ({ row }) => (
				<div className="text-right text-muted-foreground">
					{row.original.monthlyFollowUp
						? formatCurrency(row.original.monthlyFollowUp, { showCents: true })
						: "—"}
				</div>
			),
			sortingFn: (rowA, rowB) => {
				const a = rowA.original.monthlyFollowUp ?? 0;
				const b = rowB.original.monthlyFollowUp ?? 0;
				return a - b;
			},
		},
		{
			accessorKey: "totalRepayable",
			header: ({ column }) => {
				const isSorted = column.getIsSorted();
				const term = GLOSSARY_TERMS_MAP.totalRepayable;
				return (
					<div className="flex items-center gap-0.5 justify-end">
						<span className="px-2 text-sm font-medium">Total Repayable</span>
						<Tooltip>
							<TooltipTrigger asChild>
								<span className="inline-flex items-center justify-center cursor-help">
									<HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
								</span>
							</TooltipTrigger>
							<TooltipContent className="max-w-xs">
								<p className="font-medium">{term.shortDescription}</p>
								<p className="text-xs text-muted-foreground mt-1">
									{term.fullDescription}
								</p>
							</TooltipContent>
						</Tooltip>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => column.toggleSorting(isSorted === "asc")}
							className={cn("h-8 w-8 p-0", isSorted && "text-primary")}
						>
							<SortIcon isSorted={isSorted} />
						</Button>
					</div>
				);
			},
			cell: ({ row }) => (
				<div className="text-right">
					{row.original.totalRepayable
						? formatCurrency(row.original.totalRepayable, { showCents: true })
						: "—"}
				</div>
			),
			sortingFn: (rowA, rowB) => {
				const a = rowA.original.totalRepayable ?? 0;
				const b = rowB.original.totalRepayable ?? 0;
				return a - b;
			},
		},
		{
			accessorKey: "costOfCreditPct",
			header: ({ column }) => {
				const isSorted = column.getIsSorted();
				const term = GLOSSARY_TERMS_MAP.costOfCredit;
				return (
					<div className="flex items-center gap-0.5 justify-end">
						<span className="px-2 text-sm font-medium">Cost of Credit %</span>
						<Tooltip>
							<TooltipTrigger asChild>
								<span className="inline-flex items-center justify-center cursor-help">
									<HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
								</span>
							</TooltipTrigger>
							<TooltipContent className="max-w-xs">
								<p className="font-medium">{term.shortDescription}</p>
								<p className="text-xs text-muted-foreground mt-1">
									{term.fullDescription}
								</p>
							</TooltipContent>
						</Tooltip>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => column.toggleSorting(isSorted === "asc")}
							className={cn("h-8 w-8 p-0", isSorted && "text-primary")}
						>
							<SortIcon isSorted={isSorted} />
						</Button>
					</div>
				);
			},
			cell: ({ row }) => (
				<div className="text-right">
					{row.original.costOfCreditPct !== undefined
						? `${row.original.costOfCreditPct.toFixed(1)}%`
						: "—"}
				</div>
			),
			sortingFn: (rowA, rowB) => {
				const a = rowA.original.costOfCreditPct ?? 0;
				const b = rowB.original.costOfCreditPct ?? 0;
				return a - b;
			},
		},
		{
			id: "actions",
			header: () => <div className="text-center">Compare</div>,
			cell: ({ row }) => (
				<div className="flex justify-center">
					<Checkbox
						checked={row.getIsSelected()}
						onCheckedChange={(checked) => row.toggleSelected(!!checked)}
						aria-label="Select row for comparison"
					/>
				</div>
			),
			enableHiding: false,
			enableSorting: false,
			meta: { stickyRight: true },
		},
	];
}

export function RatesTable({
	rates,
	allRates,
	lenders,
	perks,
	ratesMetadata,
	mortgageAmount,
	mortgageTerm,
	ltv,
	inputValues,
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
	const [pageSize, setPageSize] = useLocalStorage<number>(
		STORAGE_KEYS.pageSize,
		10,
	);
	const [pageIndex, setPageIndex] = useState(0);
	const [copied, setCopied] = useState(false);
	const [selectedRate, setSelectedRate] = useState<RateRow | null>(null);

	const handleProductClick = useCallback((rate: RateRow) => {
		setSelectedRate(rate);
	}, []);

	const columns = useMemo(
		() => createColumns(rates, lenders, perks, inputValues, handleProductClick),
		[rates, lenders, perks, inputValues, handleProductClick],
	);

	const data = useMemo<RateRow[]>(
		() =>
			rates.map((rate) => {
				// Calculate LTV after fixed term ends (principal paid down)
				let followUpLtv = ltv;
				if (rate.type === "fixed" && rate.fixedTerm) {
					const totalMonths = mortgageTerm * 12;
					const fixedMonths = rate.fixedTerm * 12;
					const remainingBalance = calculateRemainingBalance(
						mortgageAmount,
						rate.rate,
						totalMonths,
						fixedMonths,
					);
					// remainingLtv = remainingBalance / propertyValue * 100
					// propertyValue = mortgageAmount / (ltv / 100)
					followUpLtv = (remainingBalance / mortgageAmount) * ltv;
				}

				// Use allRates to find follow-up rate (includes newBusiness: false rates)
				const followUpRate =
					rate.type === "fixed"
						? findVariableRate(
								rate,
								allRates,
								followUpLtv,
								inputValues.berRating,
							)
						: undefined;

				const totalMonths = mortgageTerm * 12;
				const monthlyPayment = calculateMonthlyPayment(
					mortgageAmount,
					rate.rate,
					totalMonths,
				);
				const monthlyFollowUp = calculateMonthlyFollowUp(
					rate,
					followUpRate,
					mortgageAmount,
					mortgageTerm,
				);

				const totalRepayable = calculateTotalRepayable(
					rate,
					monthlyPayment,
					monthlyFollowUp,
					mortgageTerm,
				);
				const costOfCreditPct = totalRepayable
					? ((totalRepayable - mortgageAmount) / mortgageAmount) * 100
					: undefined;

				// Combine lender perks with rate-specific perks (deduplicated)
				const lender = getLender(lenders, rate.lenderId);
				const lenderPerkIds = lender?.perks ?? [];
				const combinedPerks = [...new Set([...lenderPerkIds, ...rate.perks])];

				return {
					...rate,
					monthlyPayment,
					followUpRate,
					followUpLtv,
					monthlyFollowUp,
					totalRepayable,
					costOfCreditPct,
					combinedPerks,
				};
			}),
		[
			rates,
			allRates,
			lenders,
			mortgageAmount,
			mortgageTerm,
			ltv,
			inputValues.berRating,
		],
	);

	if (rates.length === 0) {
		return (
			<div className="text-center py-8 text-muted-foreground">
				No rates match your criteria. Try adjusting your filters.
			</div>
		);
	}

	return (
		<>
			<DataTable
				columns={columns}
				data={data}
				emptyMessage="No rates match your filters. Try adjusting your selection."
				sorting={sorting}
				onSortingChange={setSorting}
				columnFilters={columnFilters}
				onColumnFiltersChange={(filters) => {
					setColumnFilters(filters);
					setPageIndex(0);
				}}
				columnVisibility={columnVisibility}
				onColumnVisibilityChange={setColumnVisibility}
				pagination={{ pageIndex, pageSize }}
				onPaginationChange={(newPagination) => {
					setPageIndex(newPagination.pageIndex);
					if (newPagination.pageSize !== pageSize) {
						setPageSize(newPagination.pageSize);
					}
				}}
				toolbar={(table) => {
					const handleShare = async () => {
						const url = generateRatesShareUrl({
							input: inputValues,
							table: {
								columnVisibility,
								columnFilters,
								sorting,
							},
						});
						await navigator.clipboard.writeText(url);
						setCopied(true);
						setTimeout(() => setCopied(false), 2000);
					};

					return (
						<div className="flex justify-between">
							<div className="flex gap-2">
								<Dialog>
									<DialogTrigger asChild>
										<Button size="sm" className="h-8 gap-1.5">
											<Plus className="h-4 w-4" />
											<span className="hidden sm:inline">Add</span> Custom Rate
										</Button>
									</DialogTrigger>
									<DialogContent>
										<DialogHeader>
											<DialogTitle>Add Custom Rate</DialogTitle>
											<DialogDescription>
												Add a custom mortgage rate to compare against lender
												rates.
											</DialogDescription>
										</DialogHeader>
										<div className="py-4 text-muted-foreground text-center">
											Coming soon...
										</div>
									</DialogContent>
								</Dialog>
								<ColumnVisibilityToggle
									table={table}
									columnLabels={COLUMN_LABELS}
								/>
							</div>
							<div className="flex gap-2">
								<RateUpdatesDialog
									lenders={lenders}
									ratesMetadata={ratesMetadata}
								/>
								<Button
									variant="outline"
									size="sm"
									className="h-8 gap-1.5"
									onClick={handleShare}
								>
									{copied ? (
										<Check className="h-4 w-4" />
									) : (
										<Share2 className="h-4 w-4" />
									)}
									<span className="hidden sm:inline">
										{copied ? "Copied!" : "Share"}
									</span>
								</Button>
							</div>
						</div>
					);
				}}
			/>

			{/* Rate Details Modal */}
			<RateInfoModal
				rate={selectedRate}
				lender={
					selectedRate ? getLender(lenders, selectedRate.lenderId) : undefined
				}
				allRates={allRates}
				perks={perks}
				combinedPerks={selectedRate?.combinedPerks ?? []}
				mortgageAmount={mortgageAmount}
				mortgageTerm={mortgageTerm}
				ltv={ltv}
				berRating={inputValues.berRating}
				open={selectedRate !== null}
				onOpenChange={(open) => !open && setSelectedRate(null)}
			/>
		</>
	);
}
