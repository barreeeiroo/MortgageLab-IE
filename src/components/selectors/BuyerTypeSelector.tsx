import type { BuyerType } from "@/lib/schemas/buyer";
import { Label } from "../ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";

const BUYER_TYPE_OPTIONS: { value: BuyerType; label: string }[] = [
	{ value: "ftb", label: "First Time Buyer" },
	{ value: "mover", label: "Home Mover (Primary Residence)" },
	{ value: "btl", label: "Other Buyer (2nd Home, Buy To Let, etc.)" },
];

const REMORTGAGE_TYPE_OPTIONS: { value: BuyerType; label: string }[] = [
	{ value: "switcher-pdh", label: "Owner Occupied (Primary Residence)" },
	{ value: "switcher-btl", label: "Other Switcher (2nd Home, Buy To Let, etc.)" },
];

interface BuyerTypeSelectorProps {
	value: string;
	onChange: (value: string) => void;
	id?: string;
	label?: string;
	compact?: boolean;
	variant?: "purchase" | "remortgage";
}

export function BuyerTypeSelector({
	value,
	onChange,
	id = "buyerType",
	label = "Buyer Type",
	compact = false,
	variant = "purchase",
}: BuyerTypeSelectorProps) {
	const options =
		variant === "remortgage" ? REMORTGAGE_TYPE_OPTIONS : BUYER_TYPE_OPTIONS;
	const placeholder =
		variant === "remortgage" ? "Remortgage Type" : "Buyer Type";

	if (compact) {
		return (
			<Select value={value} onValueChange={onChange}>
				<SelectTrigger id={id} className="h-9 w-full">
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		);
	}

	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<Select value={value} onValueChange={onChange}>
				<SelectTrigger id={id}>
					<SelectValue placeholder={`Select ${placeholder.toLowerCase()}`} />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
