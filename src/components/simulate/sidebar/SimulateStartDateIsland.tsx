import { useStore } from "@nanostores/react";
import { CalendarIcon, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	$hasRequiredData,
	$simulationState,
	setInput,
} from "@/lib/stores/simulate";
import { formatDateLocal, formatMonthYear } from "@/lib/utils/date";

export function SimulateStartDateIsland() {
	const simulationState = useStore($simulationState);
	const hasRequiredData = useStore($hasRequiredData);
	const [calendarOpen, setCalendarOpen] = useState(false);

	if (!hasRequiredData) {
		return null;
	}

	const startDate = simulationState.input.startDate;
	const currentDate = startDate ? new Date(startDate) : new Date();

	const handleDateSelect = (date: Date) => {
		setInput({ startDate: formatDateLocal(date) });
		setCalendarOpen(false);
	};

	const handleClearDate = () => {
		setInput({ startDate: undefined });
	};

	return (
		<Card className="py-0 gap-0">
			<CardHeader className="py-3 px-4">
				<CardTitle className="text-sm font-medium">Start Date</CardTitle>
			</CardHeader>
			<CardContent className="pt-0 px-4 pb-4">
				<Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
					<div className="flex items-center gap-2">
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								className="h-8 flex-1 justify-start gap-2 text-sm font-normal"
							>
								<CalendarIcon className="h-4 w-4" />
								{formatMonthYear(startDate)}
							</Button>
						</PopoverTrigger>
						{startDate && (
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
								onClick={handleClearDate}
							>
								<X className="h-4 w-4" />
							</Button>
						)}
					</div>
					<PopoverContent className="w-full p-0" align="start">
						<MonthYearPicker
							selected={startDate ? currentDate : undefined}
							onSelect={handleDateSelect}
						/>
					</PopoverContent>
				</Popover>
			</CardContent>
		</Card>
	);
}
