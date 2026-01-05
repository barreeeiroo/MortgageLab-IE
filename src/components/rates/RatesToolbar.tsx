import type {
	ColumnFiltersState,
	SortingState,
	VisibilityState,
} from "@tanstack/react-table";
import { Settings2 } from "lucide-react";
import { useCallback } from "react";
import type { Lender, RatesMetadata } from "@/lib/schemas";
import { generateRatesShareUrl } from "@/lib/share";
import { $storedCustomRates, type RatesInputValues } from "@/lib/stores";
import { ShareButton } from "../ShareButton";
import { Button } from "../ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { RateUpdatesDialog } from "./RateUpdatesDialog";

// Column labels for the visibility toggle
const COLUMN_LABELS: Record<string, string> = {
	lenderId: "Lender",
	name: "Product",
	perks: "Perks",
	type: "Type",
	fixedTerm: "Period",
	rate: "Rate",
	apr: "APRC",
	monthlyPayment: "Monthly",
	followOnProduct: "Follow-On Product",
	monthlyFollowOn: "Follow-On Monthly",
	totalRepayable: "Total Repayable",
	costOfCreditPct: "Cost of Credit %",
};

// Columns that can be toggled (excludes lenderId, name, and actions)
const HIDEABLE_COLUMNS = [
	"perks",
	"type",
	"fixedTerm",
	"rate",
	"apr",
	"monthlyPayment",
	"followOnProduct",
	"monthlyFollowOn",
	"totalRepayable",
	"costOfCreditPct",
] as const;

export interface RatesToolbarProps {
	// Data for dialogs
	lenders: Lender[];
	ratesMetadata: RatesMetadata[];
	inputValues: RatesInputValues;
	// Table state
	columnVisibility: VisibilityState;
	columnFilters: ColumnFiltersState;
	sorting: SortingState;
	// Callbacks
	onColumnVisibilityChange: (visibility: VisibilityState) => void;
	// Disable Columns button when no minimal input
	disabled?: boolean;
}

export function RatesToolbar({
	lenders,
	ratesMetadata,
	inputValues,
	columnVisibility,
	columnFilters,
	sorting,
	onColumnVisibilityChange,
	disabled = false,
}: RatesToolbarProps) {
	const handleShare = useCallback(async (): Promise<boolean> => {
		try {
			// Read custom rates on demand (no subscription needed)
			const customRates = $storedCustomRates.get();
			const url = generateRatesShareUrl({
				input: inputValues,
				table: {
					columnVisibility,
					columnFilters,
					sorting,
				},
				customRates: customRates.length > 0 ? customRates : undefined,
			});
			await navigator.clipboard.writeText(url);
			return true;
		} catch {
			return false;
		}
	}, [inputValues, columnVisibility, columnFilters, sorting]);

	const toggleColumnVisibility = useCallback(
		(columnId: string, checked: boolean) => {
			onColumnVisibilityChange({
				...columnVisibility,
				[columnId]: checked,
			});
		},
		[columnVisibility, onColumnVisibilityChange],
	);

	return (
		<div className="flex justify-between">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						className="h-8 gap-1.5"
						disabled={disabled}
					>
						<Settings2 className="h-4 w-4" />
						<span className="hidden sm:inline">Columns</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-40">
					<DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
					<DropdownMenuSeparator />
					{HIDEABLE_COLUMNS.map((columnId) => {
						const label = COLUMN_LABELS[columnId] ?? columnId;
						// Column is visible if not explicitly set to false
						const isVisible = columnVisibility[columnId] !== false;
						return (
							<DropdownMenuCheckboxItem
								key={columnId}
								checked={isVisible}
								onCheckedChange={(checked) =>
									toggleColumnVisibility(columnId, checked)
								}
							>
								{label}
							</DropdownMenuCheckboxItem>
						);
					})}
				</DropdownMenuContent>
			</DropdownMenu>
			<div className="flex gap-2">
				<RateUpdatesDialog lenders={lenders} ratesMetadata={ratesMetadata} />
				<ShareButton onShare={handleShare} responsive className="h-8" />
			</div>
		</div>
	);
}
