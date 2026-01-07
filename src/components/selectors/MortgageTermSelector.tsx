import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { MAX_TERM_YEARS, MIN_TERM_YEARS } from "@/lib/constants";
import {
	cn,
	combineTerm,
	formatTermDisplay,
	isValidTermYears,
	splitTerm,
} from "@/lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";

const MORTGAGE_TERMS = [5, 10, 15, 20, 25, 30, 35] as const;
const PRESET_MONTHS = [0, 3, 6, 9] as const;

interface MortgageTermSelectorProps {
	value: string; // Total months as string
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
	const [customYears, setCustomYears] = useState("");
	const [customMonths, setCustomMonths] = useState("");
	const [withMonths, setWithMonths] = useState(false);

	// Parse value (total months) into years and months
	const totalMonths = Number.parseInt(value, 10) || 360;
	const { years, months } = splitTerm(totalMonths);

	// Auto-enable withMonths mode if there are months in the value
	const effectiveWithMonths = withMonths || months > 0;

	const handleSelectYear = (year: number) => {
		// Preserve months when selecting a new year (only in withMonths mode)
		const newMonths = effectiveWithMonths ? months : 0;
		onChange(combineTerm(year, newMonths).toString());
		if (!effectiveWithMonths) {
			setOpen(false);
		}
		setCustomYears("");
	};

	const handleSelectMonth = (month: number) => {
		onChange(combineTerm(years, month).toString());
		setCustomMonths("");
	};

	const handleCustomYearsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = e.target.value.replace(/[^0-9]/g, "");
		setCustomYears(raw);
	};

	const handleCustomMonthsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = e.target.value.replace(/[^0-9]/g, "");
		// Limit to 0-11
		const num = Number.parseInt(raw, 10);
		if (raw === "" || (num >= 0 && num <= 11)) {
			setCustomMonths(raw);
		}
	};

	const handleCustomYearsSubmit = () => {
		if (!customYears) return;
		const num = Number.parseInt(customYears, 10);
		if (isValidTermYears(num)) {
			const newMonths = effectiveWithMonths ? months : 0;
			onChange(combineTerm(num, newMonths).toString());
			setOpen(false);
			setCustomYears("");
		}
	};

	const handleCustomMonthsSubmit = () => {
		if (customMonths === "") return;
		const num = Number.parseInt(customMonths, 10);
		if (num >= 0 && num <= 11) {
			onChange(combineTerm(years, num).toString());
			setCustomMonths("");
		}
	};

	const handleYearsKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleCustomYearsSubmit();
		}
	};

	const handleMonthsKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleCustomMonthsSubmit();
		}
	};

	const handleToggleMode = (mode: boolean) => {
		setWithMonths(mode);
		// Reset months to 0 when switching to "Years Only"
		if (!mode && months > 0) {
			onChange(combineTerm(years, 0).toString());
		}
	};

	// Display value - use formatTermDisplay from utils
	const displayValue = value
		? formatTermDisplay(totalMonths, { compact })
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
			<PopoverContent className="p-0 w-[200px] md:w-[300px]" align="start">
				{/* Mode Toggle */}
				<div className="p-2 border-b">
					<Tabs
						value={effectiveWithMonths ? "with-months" : "years-only"}
						onValueChange={(v) => handleToggleMode(v === "with-months")}
						className="w-full"
					>
						<TabsList className="w-full h-8">
							<TabsTrigger
								value="years-only"
								className="text-xs flex-1 min-w-[70px]"
							>
								Years Only
							</TabsTrigger>
							<TabsTrigger
								value="with-months"
								className="text-xs flex-1 min-w-[70px]"
							>
								With Months
							</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>

				{/* Years and Months Selection */}
				<div
					className={cn(effectiveWithMonths ? "flex flex-col md:flex-row" : "")}
				>
					{/* Months Section (shown first on mobile when withMonths) */}
					{effectiveWithMonths && (
						<div className="border-b md:border-b-0 md:border-r md:order-2 md:w-[130px]">
							<div className="p-1">
								{PRESET_MONTHS.map((m) => (
									<button
										key={m}
										type="button"
										onClick={() => handleSelectMonth(m)}
										className={cn(
											"relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
										)}
									>
										{m} months
										{months === m && <Check className="ml-auto h-4 w-4" />}
									</button>
								))}
							</div>
							<div className="p-2 border-t">
								<div className="flex gap-1">
									<Input
										type="text"
										inputMode="numeric"
										placeholder="Custom"
										className="h-7 text-xs"
										value={customMonths}
										onChange={handleCustomMonthsChange}
										onKeyDown={handleMonthsKeyDown}
									/>
									<Button
										size="sm"
										className="h-7 px-2 text-xs"
										onClick={handleCustomMonthsSubmit}
										disabled={
											customMonths === "" ||
											Number.parseInt(customMonths, 10) < 0 ||
											Number.parseInt(customMonths, 10) > 11
										}
									>
										Go
									</Button>
								</div>
								<p className="text-xs text-muted-foreground mt-1">
									0-11 months
								</p>
							</div>
						</div>
					)}

					{/* Years Section */}
					<div className={cn("flex-1", effectiveWithMonths && "md:order-1")}>
						<div className="p-1">
							{MORTGAGE_TERMS.map((term) => (
								<button
									key={term}
									type="button"
									onClick={() => handleSelectYear(term)}
									className={cn(
										"relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
									)}
								>
									{term} years
									{years === term && <Check className="ml-auto h-4 w-4" />}
								</button>
							))}
						</div>
						<div className="p-2 border-t">
							<div className="flex gap-1">
								<Input
									type="text"
									inputMode="numeric"
									placeholder="Custom"
									className="h-8"
									value={customYears}
									onChange={handleCustomYearsChange}
									onKeyDown={handleYearsKeyDown}
								/>
								<Button
									size="sm"
									className="h-8 px-2"
									onClick={handleCustomYearsSubmit}
									disabled={
										!customYears ||
										!isValidTermYears(Number.parseInt(customYears, 10))
									}
								>
									Go
								</Button>
							</div>
							<p className="text-xs text-muted-foreground mt-1">
								{MIN_TERM_YEARS}-{MAX_TERM_YEARS} years
							</p>
						</div>
					</div>
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
