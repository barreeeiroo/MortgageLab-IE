import type {
	ColumnFiltersState,
	SortingState,
	VisibilityState,
} from "@tanstack/react-table";
import { FoldHorizontal, Settings2, UnfoldHorizontal } from "lucide-react";
import { useCallback } from "react";
import type { Lender } from "@/lib/schemas/lender";
import type { RatesMetadata } from "@/lib/schemas/rate";
import { generateRatesShareUrl } from "@/lib/share/rates";
import { $storedCustomPerks } from "@/lib/stores/custom-perks";
import { $storedCustomRates } from "@/lib/stores/custom-rates";
import type { RatesInputValues } from "@/lib/stores/rates-form";
import { cn } from "@/lib/utils/cn";
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
	compactMode: boolean;
	// Callbacks
	onColumnVisibilityChange: (visibility: VisibilityState) => void;
	onCompactModeChange: (compact: boolean) => void;
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
	compactMode,
	onColumnVisibilityChange,
	onCompactModeChange,
	disabled = false,
}: RatesToolbarProps) {
	const handleShare = useCallback(async (): Promise<string> => {
		// Read custom rates and perks on demand (no subscription needed)
		const customRates = $storedCustomRates.get();
		const customPerks = $storedCustomPerks.get();
		return generateRatesShareUrl({
			input: inputValues,
			table: {
				columnVisibility,
				columnFilters,
				sorting,
			},
			customRates: customRates.length > 0 ? customRates : undefined,
			customPerks: customPerks.length > 0 ? customPerks : undefined,
		});
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
			<div className="flex gap-2">
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
				<Button
					variant="ghost"
					size="sm"
					className={cn("h-8 gap-1.5", compactMode && "text-primary")}
					disabled={disabled}
					onClick={() => onCompactModeChange(!compactMode)}
				>
					{compactMode ? (
						<FoldHorizontal className="h-4 w-4" />
					) : (
						<UnfoldHorizontal className="h-4 w-4" />
					)}
					<span className="hidden sm:inline">Compact</span>
				</Button>
			</div>
			<div className="flex gap-2">
				<RateUpdatesDialog lenders={lenders} ratesMetadata={ratesMetadata} />
				<ShareButton onShare={handleShare} responsive className="h-8" />
			</div>
		</div>
	);
}
