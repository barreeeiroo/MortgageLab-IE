import {
	AlertTriangle,
	Banknote,
	CalendarClock,
	CalendarIcon,
	Check,
	Layers,
	RotateCcw,
	Share2,
	X,
} from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { SimulationCompleteness } from "@/lib/stores/simulate/simulate-calculations";
import { formatCurrency } from "@/lib/utils";

interface SimulateHeaderProps {
	hasRequiredData: boolean;
	mortgageAmount: number;
	mortgageTermMonths: number;
	startDate?: string;
	ratePeriodCount: number;
	overpaymentCount: number;
	completeness: SimulationCompleteness;
	onReset: () => void;
	onShare: () => Promise<boolean>;
	onStartDateChange: (date: string | undefined) => void;
}

// Format date for display
function formatDateDisplay(dateStr: string): string {
	const date = new Date(dateStr);
	return date.toLocaleDateString("en-IE", {
		month: "short",
		year: "numeric",
	});
}

// Format a Date as YYYY-MM-DD without timezone issues
function formatDateLocal(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

// Format term in months as "X years" or "X years Y months"
function formatTermDisplay(months: number): string {
	const years = Math.floor(months / 12);
	const remainingMonths = months % 12;
	if (remainingMonths === 0) {
		return `${years} years`;
	}
	return `${years}y ${remainingMonths}m`;
}

export function SimulateHeader({
	hasRequiredData,
	mortgageAmount,
	mortgageTermMonths,
	startDate,
	ratePeriodCount,
	overpaymentCount,
	completeness,
	onReset,
	onShare,
	onStartDateChange,
}: SimulateHeaderProps) {
	const [copied, setCopied] = useState(false);
	const [calendarOpen, setCalendarOpen] = useState(false);

	// Parse the current start date
	const currentDate = startDate ? new Date(startDate) : new Date();

	// Handle date selection - MonthYearPicker already returns first of month
	const handleDateSelect = (date: Date) => {
		onStartDateChange(formatDateLocal(date));
		setCalendarOpen(false);
	};

	const handleShare = async () => {
		const success = await onShare();
		if (success) {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	return (
		<div className="space-y-4">
			{/* Page Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight mb-1">
						Mortgage Simulator
					</h1>
					<p className="text-muted-foreground text-sm">
						Simulate your mortgage with different rates, overpayments, and
						scenarios.
					</p>
				</div>
				{hasRequiredData && (
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							className="gap-1.5"
							onClick={handleShare}
						>
							{copied ? (
								<>
									<Check className="h-4 w-4" />
									Copied!
								</>
							) : (
								<>
									<Share2 className="h-4 w-4" />
									Share
								</>
							)}
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="gap-1.5"
							onClick={onReset}
						>
							<RotateCcw className="h-4 w-4" />
							Reset
						</Button>
					</div>
				)}
			</div>

			{/* Summary when data is present */}
			{hasRequiredData && (
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<Card>
						<CardHeader className="pb-2">
							<CardDescription className="flex items-center gap-1.5">
								<Banknote className="h-3.5 w-3.5" />
								Mortgage Amount
							</CardDescription>
							<CardTitle className="text-2xl">
								{new Intl.NumberFormat("en-IE", {
									style: "currency",
									currency: "EUR",
									maximumFractionDigits: 0,
								}).format(mortgageAmount / 100)}
							</CardTitle>
						</CardHeader>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardDescription className="flex items-center gap-1.5">
								<CalendarClock className="h-3.5 w-3.5" />
								Original Term
							</CardDescription>
							<CardTitle className="text-2xl">
								{formatTermDisplay(mortgageTermMonths)}
							</CardTitle>
						</CardHeader>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardDescription className="flex items-center gap-1.5">
								<CalendarIcon className="h-3.5 w-3.5" />
								Start Date
							</CardDescription>
							<Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
								<div className="flex items-center justify-between">
									<PopoverTrigger asChild>
										<Button
											variant="ghost"
											className="text-2xl font-semibold h-auto p-0 hover:bg-transparent gap-2"
										>
											{startDate ? formatDateDisplay(startDate) : "Not set"}
											<CalendarIcon className="h-4 w-4 text-muted-foreground" />
										</Button>
									</PopoverTrigger>
									{startDate && (
										<Button
											variant="ghost"
											size="icon"
											className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
											onClick={() => onStartDateChange(undefined)}
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
						</CardHeader>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardDescription className="flex items-center gap-1.5">
								<Layers className="h-3.5 w-3.5" />
								Rates / Overpayments
							</CardDescription>
							<CardTitle className="text-2xl">
								{ratePeriodCount} / {overpaymentCount}
							</CardTitle>
						</CardHeader>
					</Card>
				</div>
			)}

			{/* Incomplete simulation warning */}
			{hasRequiredData &&
				!completeness.isComplete &&
				completeness.coveredMonths > 0 && (
					<Alert variant="destructive">
						<AlertTriangle className="h-4 w-4" />
						<AlertTitle>Incomplete Simulation</AlertTitle>
						<AlertDescription>
							Your rate periods only cover {completeness.coveredMonths} of{" "}
							{completeness.totalMonths} months (
							{formatTermDisplay(mortgageTermMonths)}). There is a remaining
							balance of {formatCurrency(completeness.remainingBalance / 100)}{" "}
							that is not covered. Add more rate periods or overpayments to
							complete the simulation.
						</AlertDescription>
					</Alert>
				)}
		</div>
	);
}
