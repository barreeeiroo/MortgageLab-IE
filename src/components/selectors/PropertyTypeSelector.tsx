import { HelpCircle } from "lucide-react";
import type { PropertyType } from "@/lib/utils/fees";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "../ui/tooltip";

const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
	{ value: "existing", label: "Existing Property" },
	{ value: "new-build", label: "New Build (13.5% VAT)" },
	{ value: "new-apartment", label: "New Apartment (9% VAT)" },
];

interface PropertyTypeSelectorProps {
	value: PropertyType;
	onChange: (value: PropertyType) => void;
	priceIncludesVAT: boolean;
	onPriceIncludesVATChange: (includes: boolean) => void;
	id?: string;
	label?: string;
	compact?: boolean;
}

export function PropertyTypeSelector({
	value,
	onChange,
	priceIncludesVAT,
	onPriceIncludesVATChange,
	id = "propertyType",
	label = "Property Type",
	compact = false,
}: PropertyTypeSelectorProps) {
	const showVATToggle = value === "new-build" || value === "new-apartment";

	const selector = (
		<Select value={value} onValueChange={(v) => onChange(v as PropertyType)}>
			<SelectTrigger id={id} className={compact ? "h-9 w-full" : "w-full"}>
				<SelectValue placeholder="Select property type" />
			</SelectTrigger>
			<SelectContent>
				{PROPERTY_TYPE_OPTIONS.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);

	const vatToggle = showVATToggle && (
		<div className="flex items-center gap-2 mt-2">
			<Checkbox
				id={`${id}-vat-inclusive`}
				checked={priceIncludesVAT}
				onCheckedChange={(checked) =>
					onPriceIncludesVATChange(checked === true)
				}
			/>
			<Label
				htmlFor={`${id}-vat-inclusive`}
				className="text-xs text-muted-foreground cursor-pointer"
			>
				Price includes VAT
			</Label>
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<button type="button" className="text-muted-foreground">
							<HelpCircle className="h-3 w-3" />
						</button>
					</TooltipTrigger>
					<TooltipContent className="max-w-xs">
						<p>
							New build prices are usually advertised with VAT included. Uncheck
							if you have a VAT-exclusive price (e.g., from a contract).
						</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</div>
	);

	if (compact) {
		return (
			<div>
				{selector}
				{vatToggle}
			</div>
		);
	}

	return (
		<div className="space-y-2">
			<div className="flex items-center gap-1">
				<Label htmlFor={id}>{label}</Label>
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<button type="button" className="text-muted-foreground">
								<HelpCircle className="h-3 w-3" />
							</button>
						</TooltipTrigger>
						<TooltipContent className="max-w-xs">
							<p className="font-medium mb-1">Property VAT in Ireland:</p>
							<ul className="text-xs space-y-1">
								<li>
									<strong>Existing:</strong> No VAT
								</li>
								<li>
									<strong>New Build:</strong> 13.5% VAT
								</li>
								<li>
									<strong>New Apartment:</strong> 9% VAT
								</li>
							</ul>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
			{selector}
			{vatToggle}
		</div>
	);
}
