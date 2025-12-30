import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

const MORTGAGE_TERMS = [5, 10, 15, 20, 25, 30, 35] as const;
const MIN_TERM = 5;
const MAX_TERM = 35;

interface MortgageTermSelectorProps {
	value: string;
	onChange: (value: string) => void;
	id?: string;
	label?: string;
	compact?: boolean;
}

export function MortgageTermSelector({
	value,
	onChange,
	id = "mortgageTerm",
	label = "Mortgage Term",
	compact = false,
}: MortgageTermSelectorProps) {
	const [open, setOpen] = useState(false);
	const [customValue, setCustomValue] = useState("");

	const handleSelect = (term: number) => {
		onChange(term.toString());
		setOpen(false);
		setCustomValue("");
	};

	const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = e.target.value.replace(/[^0-9]/g, "");
		setCustomValue(raw);
	};

	const handleCustomSubmit = () => {
		if (!customValue) return;
		const num = Number.parseInt(customValue, 10);
		if (num >= MIN_TERM && num <= MAX_TERM) {
			onChange(num.toString());
			setOpen(false);
			setCustomValue("");
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleCustomSubmit();
		}
	};

	const displayValue = value
		? compact
			? `${value} yrs`
			: `${value} years`
		: compact
			? "Term"
			: "Select term";

	const combobox = (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					id={id}
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className={cn(
						"justify-between font-normal",
						compact ? "h-9 w-full" : "w-full",
						!value && "text-muted-foreground",
					)}
				>
					{displayValue}
					<ChevronsUpDown className="opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[160px] p-0" align="start">
				<div className="p-2 border-b">
					<div className="flex gap-1">
						<Input
							type="text"
							inputMode="numeric"
							placeholder="Custom"
							className="h-8"
							value={customValue}
							onChange={handleCustomChange}
							onKeyDown={handleKeyDown}
						/>
						<Button
							size="sm"
							className="h-8 px-2"
							onClick={handleCustomSubmit}
							disabled={
								!customValue ||
								Number.parseInt(customValue, 10) < MIN_TERM ||
								Number.parseInt(customValue, 10) > MAX_TERM
							}
						>
							Go
						</Button>
					</div>
					<p className="text-xs text-muted-foreground mt-1">
						{MIN_TERM}-{MAX_TERM} years
					</p>
				</div>
				<div className="p-1">
					{MORTGAGE_TERMS.map((term) => (
						<button
							key={term}
							type="button"
							onClick={() => handleSelect(term)}
							className={cn(
								"relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
							)}
						>
							{term} years
							{value === term.toString() && (
								<Check className="ml-auto h-4 w-4" />
							)}
						</button>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);

	if (compact) {
		return combobox;
	}

	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			{combobox}
		</div>
	);
}
