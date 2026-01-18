import { useStore } from "@nanostores/react";
import { LenderSelector } from "@/components/lenders/LenderSelector";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Lender } from "@/lib/schemas/lender";
import {
	$trendsFilter,
	$trendsSelectedLenders,
	setTrendsFilter,
	setTrendsSelectedLenders,
} from "@/lib/stores/rates/rates-history-filters";

interface TrendsFiltersProps {
	lenders: Lender[];
}

// Common rate types to filter by
const RATE_TYPES = [
	{ value: "all", label: "All Rate Types" },
	{ value: "fixed-1", label: "1-Year Fixed" },
	{ value: "fixed-2", label: "2-Year Fixed" },
	{ value: "fixed-3", label: "3-Year Fixed" },
	{ value: "fixed-4", label: "4-Year Fixed" },
	{ value: "fixed-5", label: "5-Year Fixed" },
	{ value: "fixed-7", label: "7-Year Fixed" },
	{ value: "fixed-10", label: "10-Year Fixed" },
	{ value: "variable", label: "Variable" },
];

// LTV ranges to filter by
const LTV_RANGES = [
	{ value: "all", label: "All LTV" },
	{ value: "50", label: "Up to 50% LTV" },
	{ value: "60", label: "Up to 60% LTV" },
	{ value: "70", label: "Up to 70% LTV" },
	{ value: "80", label: "Up to 80% LTV" },
	{ value: "90", label: "Up to 90% LTV" },
];

// Buyer categories (Primary Residence and BTL are mutually exclusive mortgage types)
const BUYER_CATEGORIES = [
	{ value: "pdh", label: "Primary Residence" },
	{ value: "btl", label: "Buy to Let" },
	{ value: "all", label: "All Buyers" },
] as const;

export function TrendsFilters({ lenders }: TrendsFiltersProps) {
	const filter = useStore($trendsFilter);
	const selectedLenders = useStore($trendsSelectedLenders);

	// Parse LTV filter value
	const ltvValue = filter.ltvRange ? String(filter.ltvRange[1]) : "all";

	return (
		<div className="flex flex-wrap items-start gap-4 p-4 rounded-lg bg-muted/50">
			{/* Rate Type Filter */}
			<div className="space-y-1.5">
				<Label className="text-xs">Rate Type</Label>
				<Select
					value={filter.rateType ?? "all"}
					onValueChange={(v) =>
						setTrendsFilter({ rateType: v === "all" ? null : v })
					}
				>
					<SelectTrigger className="w-[140px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{RATE_TYPES.map((type) => (
							<SelectItem key={type.value} value={type.value}>
								{type.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* LTV Filter */}
			<div className="space-y-1.5">
				<Label className="text-xs">Max LTV</Label>
				<Select
					value={ltvValue}
					onValueChange={(v) =>
						setTrendsFilter({
							ltvRange: v === "all" ? null : [0, Number.parseInt(v, 10)],
						})
					}
				>
					<SelectTrigger className="w-[120px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{LTV_RANGES.map((ltv) => (
							<SelectItem key={ltv.value} value={ltv.value}>
								{ltv.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Buyer Category Filter */}
			<div className="space-y-1.5">
				<Label className="text-xs">Buyer Type</Label>
				<Select
					value={filter.buyerCategory}
					onValueChange={(v) =>
						setTrendsFilter({
							buyerCategory: v as "all" | "pdh" | "btl",
						})
					}
				>
					<SelectTrigger className="w-[180px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{BUYER_CATEGORIES.map((cat) => (
							<SelectItem key={cat.value} value={cat.value}>
								{cat.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Lender Selection */}
			<div className="space-y-1.5">
				<Label className="text-xs">Lenders</Label>
				<LenderSelector
					lenders={lenders}
					value={selectedLenders}
					onChange={setTrendsSelectedLenders}
					multiple
					placeholder="Select lenders"
					className="w-[260px]"
				/>
			</div>
		</div>
	);
}
