import { ChevronsUpDown } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "../ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { LenderLogo } from "./LenderLogo";
import { LenderOption } from "./LenderOption";

interface Lender {
	id: string;
	name: string;
}

interface LenderSelectorProps {
	lenders: Lender[];
	/** Selected lender IDs */
	value: string[];
	/** Called when selection changes */
	onChange: (value: string[]) => void;
	/** Allow multiple selection (default: false) */
	multiple?: boolean;
	/** Placeholder when nothing selected */
	placeholder?: string;
	/** Button class name */
	className?: string;
}

export function LenderSelector({
	lenders,
	value,
	onChange,
	multiple = false,
	placeholder = "All Lenders",
	className,
}: LenderSelectorProps) {
	const selectedSet = useMemo(() => new Set(value), [value]);

	const handleToggle = (lenderId: string) => {
		if (multiple) {
			// Multi-select: toggle the lender
			const newSet = new Set(selectedSet);
			if (newSet.has(lenderId)) {
				newSet.delete(lenderId);
			} else {
				newSet.add(lenderId);
			}
			onChange(Array.from(newSet));
		} else {
			// Single-select: set or clear
			if (selectedSet.has(lenderId)) {
				onChange([]);
			} else {
				onChange([lenderId]);
			}
		}
	};

	const handleSelectAll = () => {
		if (value.length === lenders.length) {
			onChange([]);
		} else {
			onChange(lenders.map((l) => l.id));
		}
	};

	const handleClearAll = () => {
		onChange([]);
	};

	// Display text for the button
	const displayText = useMemo(() => {
		if (value.length === 0) {
			return placeholder;
		}
		if (value.length === 1) {
			const lender = lenders.find((l) => l.id === value[0]);
			return lender?.name ?? value[0];
		}
		return `${value.length} lenders`;
	}, [value, lenders, placeholder]);

	// Display logo for single selection
	const singleLenderId = value.length === 1 ? value[0] : null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					className={cn("h-8 px-3 text-sm gap-1.5 justify-between", className)}
				>
					<span className="flex items-center gap-1.5">
						{singleLenderId && (
							<LenderLogo lenderId={singleLenderId} size={16} />
						)}
						<span className="truncate">{displayText}</span>
					</span>
					<ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-48">
				{multiple && (
					<>
						<div className="flex items-center justify-between px-2 py-1.5">
							<DropdownMenuLabel className="p-0 text-xs font-normal">
								{value.length} of {lenders.length} selected
							</DropdownMenuLabel>
							<Button
								variant="ghost"
								size="sm"
								className="h-6 px-2 text-xs"
								onClick={value.length > 0 ? handleClearAll : handleSelectAll}
							>
								{value.length > 0 ? "Clear" : "All"}
							</Button>
						</div>
						<DropdownMenuSeparator />
					</>
				)}
				{lenders.map((lender) => {
					const isSelected = selectedSet.has(lender.id);
					return (
						<DropdownMenuCheckboxItem
							key={lender.id}
							checked={isSelected}
							onCheckedChange={() => handleToggle(lender.id)}
							onSelect={(e) => e.preventDefault()}
							className="cursor-pointer"
						>
							<LenderOption lenderId={lender.id} name={lender.name} />
						</DropdownMenuCheckboxItem>
					);
				})}
				{multiple && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuCheckboxItem
							checked={value.length === lenders.length}
							onCheckedChange={handleSelectAll}
							onSelect={(e) => e.preventDefault()}
							className="cursor-pointer font-medium"
						>
							Select All
						</DropdownMenuCheckboxItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
