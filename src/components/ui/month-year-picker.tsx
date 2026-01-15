"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { SHORT_MONTH_NAMES } from "@/lib/utils/date";

interface MonthYearPickerProps {
	selected?: Date;
	onSelect?: (date: Date) => void;
	className?: string;
}

export function MonthYearPicker({
	selected,
	onSelect,
	className,
}: MonthYearPickerProps) {
	const currentDate = selected || new Date();
	const [viewYear, setViewYear] = React.useState(currentDate.getFullYear());

	const selectedYear = selected?.getFullYear();
	const selectedMonth = selected?.getMonth();

	const handleMonthClick = (monthIndex: number) => {
		const newDate = new Date(viewYear, monthIndex, 1);
		onSelect?.(newDate);
	};

	const handlePrevYear = () => {
		setViewYear((y) => y - 1);
	};

	const handleNextYear = () => {
		setViewYear((y) => y + 1);
	};

	return (
		<div className={cn("p-3 w-full min-w-[240px]", className)}>
			{/* Year navigation */}
			<div className="flex items-center justify-between mb-4">
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7"
					onClick={handlePrevYear}
				>
					<ChevronLeft className="h-4 w-4" />
				</Button>
				<span className="text-sm font-medium">{viewYear}</span>
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7"
					onClick={handleNextYear}
				>
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>

			{/* Month grid */}
			<div className="grid grid-cols-3 gap-2">
				{SHORT_MONTH_NAMES.map((month, index) => {
					const isSelected =
						selectedYear === viewYear && selectedMonth === index;
					return (
						<Button
							key={month}
							variant={isSelected ? "default" : "ghost"}
							size="sm"
							className={cn(
								"h-9",
								isSelected && "bg-primary text-primary-foreground",
							)}
							onClick={() => handleMonthClick(index)}
						>
							{month}
						</Button>
					);
				})}
			</div>
		</div>
	);
}
