import { format, isValid, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

interface DateOfBirthPickerProps {
	value: Date | undefined;
	onChange: (date: Date | undefined) => void;
	id?: string;
	label?: string;
}

export function DateOfBirthPicker({
	value,
	onChange,
	id = "dateOfBirth",
	label = "Date of Birth",
}: DateOfBirthPickerProps) {
	const today = new Date();
	const minAge = 18;
	const maxAge = 100;
	const fromYear = today.getFullYear() - maxAge;
	const toYear = today.getFullYear() - minAge;

	const [inputValue, setInputValue] = useState(
		value ? format(value, "dd/MM/yyyy") : "",
	);
	const [isOpen, setIsOpen] = useState(false);

	// Sync input value when external value changes
	useEffect(() => {
		if (value) {
			setInputValue(format(value, "dd/MM/yyyy"));
		}
	}, [value]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		let val = e.target.value.replace(/[^0-9/]/g, "");

		// Auto-insert slashes
		if (val.length === 2 && !val.includes("/")) {
			val = `${val}/`;
		} else if (val.length === 5 && val.split("/").length === 2) {
			val = `${val}/`;
		}

		// Limit length to dd/MM/yyyy format
		if (val.length > 10) {
			val = val.slice(0, 10);
		}

		setInputValue(val);

		// Try to parse the date when we have a complete input
		if (val.length === 10) {
			const parsed = parse(val, "dd/MM/yyyy", new Date());
			if (isValid(parsed) && parsed <= today) {
				const year = parsed.getFullYear();
				if (year >= fromYear && year <= toYear) {
					onChange(parsed);
				}
			}
		} else if (val.length === 0) {
			onChange(undefined);
		}
	};

	const handleCalendarSelect = (date: Date | undefined) => {
		onChange(date);
		if (date) {
			setInputValue(format(date, "dd/MM/yyyy"));
		}
		setIsOpen(false);
	};

	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<div className="flex gap-2">
				<Input
					id={id}
					type="text"
					inputMode="numeric"
					placeholder="DD/MM/YYYY"
					value={inputValue}
					onChange={handleInputChange}
					className="flex-1"
				/>
				<Popover open={isOpen} onOpenChange={setIsOpen}>
					<PopoverTrigger asChild>
						<Button
							type="button"
							variant="outline"
							size="icon"
							aria-label="Open calendar"
						>
							<CalendarIcon className="h-4 w-4" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="end">
						<Calendar
							mode="single"
							selected={value}
							onSelect={handleCalendarSelect}
							captionLayout="dropdown"
							fromYear={fromYear}
							toYear={toYear}
							defaultMonth={value || new Date(toYear, 0)}
							disabled={(date) => date > today}
						/>
					</PopoverContent>
				</Popover>
			</div>
		</div>
	);
}
