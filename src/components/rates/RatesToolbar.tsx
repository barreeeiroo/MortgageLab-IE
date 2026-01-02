import type {
	ColumnFiltersState,
	SortingState,
	VisibilityState,
} from "@tanstack/react-table";
import { Check, Settings2, Share2 } from "lucide-react";
import { useCallback, useState } from "react";
import type { Lender, Perk, RatesMetadata } from "@/lib/schemas";
import { generateRatesShareUrl } from "@/lib/share";
import type { RatesInputValues, StoredCustomRate } from "@/lib/stores";
import { Button } from "../ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { AddCustomRateDialog } from "./AddCustomRateDialog";
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
	followUpProduct: "Follow-Up Product",
	monthlyFollowUp: "Follow-Up Monthly",
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
	"followUpProduct",
	"monthlyFollowUp",
	"totalRepayable",
	"costOfCreditPct",
] as const;

interface CustomLenderInfo {
	id: string;
	name: string;
}

export interface RatesToolbarProps {
	// Data for dialogs
	lenders: Lender[];
	customLenders: CustomLenderInfo[];
	customRates: StoredCustomRate[];
	perks: Perk[];
	ratesMetadata: RatesMetadata[];
	inputValues: RatesInputValues;
	// Table state
	columnVisibility: VisibilityState;
	columnFilters: ColumnFiltersState;
	sorting: SortingState;
	// Callbacks
	onColumnVisibilityChange: (visibility: VisibilityState) => void;
	onAddCustomRate: (rate: StoredCustomRate) => void;
	// Disable Add Custom Rate and Columns buttons when no minimal input
	disabled?: boolean;
}

export function RatesToolbar({
	lenders,
	customLenders,
	customRates,
	perks,
	ratesMetadata,
	inputValues,
	columnVisibility,
	columnFilters,
	sorting,
	onColumnVisibilityChange,
	onAddCustomRate,
	disabled = false,
}: RatesToolbarProps) {
	const [copied, setCopied] = useState(false);

	const handleShare = useCallback(async () => {
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
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [inputValues, columnVisibility, columnFilters, sorting, customRates]);

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
				<AddCustomRateDialog
					lenders={lenders}
					customLenders={customLenders}
					perks={perks}
					currentBuyerType={
						inputValues.buyerType as
							| "ftb"
							| "mover"
							| "btl"
							| "switcher-pdh"
							| "switcher-btl"
					}
					onAddRate={onAddCustomRate}
					disabled={disabled}
				/>
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
			</div>
			<div className="flex gap-2">
				<RateUpdatesDialog lenders={lenders} ratesMetadata={ratesMetadata} />
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
}
