import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LenderLogo } from "@/components/lenders";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Lender } from "@/lib/schemas/lender";
import type { MortgageRate } from "@/lib/schemas/rate";
import type { RatePeriod } from "@/lib/schemas/simulate";
import type { CustomRate } from "@/lib/stores/custom-rates";
import { getCalendarDate } from "@/lib/utils/date";

type DurationMode = "calendar" | "duration" | "end";

interface AddRatePeriodDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onAdd: (period: Omit<RatePeriod, "id">) => void;
	rates: MortgageRate[];
	customRates: CustomRate[];
	lenders: Lender[];
	totalMonths: number;
	mortgageAmount: number;
	propertyValue: number;
	editingPeriod?: RatePeriod;
	/** Whether this is editing the last rate period (controls duration editing for variable rates) */
	isLastPeriod?: boolean;
	/** Start date of the mortgage (ISO string), for calendar mode */
	startDate?: string;
	/** The month this rate period starts (1-indexed), for calendar calculations */
	periodStartMonth?: number;
}

interface RateOption {
	id: string;
	lenderId: string;
	lenderName: string;
	name: string;
	rate: number;
	type: "fixed" | "variable";
	fixedTerm?: number;
	isCustom: boolean;
}

export function SimulateAddRatePeriodDialog({
	open,
	onOpenChange,
	onAdd,
	rates,
	customRates,
	lenders,
	totalMonths,
	mortgageAmount,
	propertyValue,
	editingPeriod,
	isLastPeriod = true,
	startDate,
	periodStartMonth = 1,
}: AddRatePeriodDialogProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedRate, setSelectedRate] = useState<RateOption | null>(null);
	const [durationMode, setDurationMode] = useState<DurationMode>("duration");
	const [durationYears, setDurationYears] = useState(0);
	const [durationExtraMonths, setDurationExtraMonths] = useState(0);
	// Calendar mode: target year/month
	const [targetYear, setTargetYear] = useState(new Date().getFullYear());
	const [targetMonth, setTargetMonth] = useState(1);
	const [customLabel, setCustomLabel] = useState("");

	// Compute effective duration based on mode
	const durationMonths = useMemo(() => {
		if (durationMode === "end") return 0;
		if (durationMode === "calendar") {
			if (startDate) {
				// Calendar mode with actual dates
				const periodStartDate = getCalendarDate(
					startDate,
					periodStartMonth - 1,
				);
				const periodStartYear = periodStartDate.getFullYear();
				const periodStartMonthNum = periodStartDate.getMonth() + 1;
				const periodStartTotal =
					periodStartYear * 12 + (periodStartMonthNum - 1);
				const targetTotal = targetYear * 12 + (targetMonth - 1);
				return Math.max(0, targetTotal - periodStartTotal);
			}
			// Calendar mode with incremental year/month (no startDate)
			// targetYear is Year 1, 2, 3... targetMonth is 1-12
			const targetAbsoluteMonth = (targetYear - 1) * 12 + targetMonth;
			return Math.max(0, targetAbsoluteMonth - periodStartMonth);
		}
		return durationYears * 12 + durationExtraMonths;
	}, [
		durationMode,
		durationYears,
		durationExtraMonths,
		startDate,
		periodStartMonth,
		targetYear,
		targetMonth,
	]);

	// Calculate LTV for filtering
	const ltv = propertyValue > 0 ? (mortgageAmount / propertyValue) * 100 : 0;

	// Build rate options from database rates and custom rates
	const rateOptions = useMemo(() => {
		const options: RateOption[] = [];

		// Add database rates
		for (const rate of rates) {
			// Filter by LTV
			if (rate.minLtv && ltv < rate.minLtv) continue;
			if (rate.maxLtv && ltv > rate.maxLtv) continue;
			// Filter by min loan
			if (rate.minLoan && mortgageAmount < rate.minLoan) continue;

			const lender = lenders.find((l) => l.id === rate.lenderId);
			options.push({
				id: rate.id,
				lenderId: rate.lenderId,
				lenderName: lender?.name || rate.lenderId,
				name: rate.name,
				rate: rate.rate,
				type: rate.type,
				fixedTerm: rate.fixedTerm,
				isCustom: false,
			});
		}

		// Add custom rates
		for (const rate of customRates) {
			// Filter by LTV
			if (rate.minLtv && ltv < rate.minLtv) continue;
			if (rate.maxLtv && ltv > rate.maxLtv) continue;
			// Filter by min loan
			if (rate.minLoan && mortgageAmount < rate.minLoan) continue;

			options.push({
				id: rate.id,
				lenderId: rate.lenderId,
				lenderName: rate.customLenderName || "Custom",
				name: rate.name,
				rate: rate.rate,
				type: rate.type,
				fixedTerm: rate.fixedTerm,
				isCustom: true,
			});
		}

		return options;
	}, [rates, customRates, lenders, ltv, mortgageAmount]);

	// Filter by search query
	const filteredRates = useMemo(() => {
		if (!searchQuery.trim()) return rateOptions;
		const query = searchQuery.toLowerCase();
		return rateOptions.filter(
			(r) =>
				r.lenderName.toLowerCase().includes(query) ||
				r.name.toLowerCase().includes(query) ||
				r.rate.toString().includes(query),
		);
	}, [rateOptions, searchQuery]);

	// Group by lender
	const groupedRates = useMemo(() => {
		const groups = new Map<string, RateOption[]>();
		for (const rate of filteredRates) {
			const key = rate.isCustom ? `custom-${rate.lenderId}` : rate.lenderId;
			const existing = groups.get(key) || [];
			existing.push(rate);
			groups.set(key, existing);
		}
		return groups;
	}, [filteredRates]);

	// Helper to calculate calendar values from duration
	const calcCalendarFromDuration = useCallback(
		(months: number) => {
			if (startDate) {
				const targetDate = getCalendarDate(
					startDate,
					periodStartMonth - 1 + months,
				);
				return {
					year: targetDate.getFullYear(),
					month: targetDate.getMonth() + 1,
				};
			}
			// Incremental mode
			const targetAbsMonth = periodStartMonth + months;
			return {
				year: Math.ceil(targetAbsMonth / 12),
				month: ((targetAbsMonth - 1) % 12) + 1,
			};
		},
		[startDate, periodStartMonth],
	);

	// Reset form when opening
	useEffect(() => {
		if (open) {
			if (editingPeriod) {
				// Find the rate option for editing
				const rate = rateOptions.find(
					(r) =>
						r.id === editingPeriod.rateId &&
						r.lenderId === editingPeriod.lenderId &&
						r.isCustom === editingPeriod.isCustom,
				);
				setSelectedRate(rate || null);

				// Set duration values
				setDurationYears(Math.floor(editingPeriod.durationMonths / 12));
				setDurationExtraMonths(editingPeriod.durationMonths % 12);

				// Set calendar values from duration
				const calVals = calcCalendarFromDuration(editingPeriod.durationMonths);
				setTargetYear(calVals.year);
				setTargetMonth(calVals.month);

				// Determine mode: end if 0, calendar if startDate, else duration
				if (editingPeriod.durationMonths === 0) {
					setDurationMode("end");
				} else if (startDate) {
					setDurationMode("calendar");
				} else {
					setDurationMode("duration");
				}

				setCustomLabel(editingPeriod.label || "");
			} else {
				setSelectedRate(null);
				setDurationMode(startDate ? "calendar" : "duration");
				setDurationYears(0);
				setDurationExtraMonths(0);
				setCustomLabel("");
				// Initialize calendar target to a reasonable default (period start + 1 year)
				const calVals = calcCalendarFromDuration(12);
				setTargetYear(calVals.year);
				setTargetMonth(calVals.month);
			}
			setSearchQuery("");
		}
	}, [open, editingPeriod, rateOptions, startDate, calcCalendarFromDuration]);

	// Track previous duration mode to detect transitions
	const [prevDurationMode, setPrevDurationMode] = useState<DurationMode | null>(
		null,
	);

	// Sync values when switching between modes
	useEffect(() => {
		if (prevDurationMode === "duration" && durationMode === "calendar") {
			// Just switched to Calendar from Duration: sync calendar values
			const months = durationYears * 12 + durationExtraMonths;
			if (startDate) {
				const targetDate = getCalendarDate(
					startDate,
					periodStartMonth - 1 + months,
				);
				setTargetYear(targetDate.getFullYear());
				setTargetMonth(targetDate.getMonth() + 1);
			} else {
				const targetAbsMonth = periodStartMonth + months;
				setTargetYear(Math.ceil(targetAbsMonth / 12));
				setTargetMonth(((targetAbsMonth - 1) % 12) + 1);
			}
		} else if (prevDurationMode === "calendar" && durationMode === "duration") {
			// Just switched to Duration from Calendar: sync duration values
			setDurationYears(Math.floor(durationMonths / 12));
			setDurationExtraMonths(durationMonths % 12);
		}
		setPrevDurationMode(durationMode);
	}, [
		durationMode,
		prevDurationMode,
		durationYears,
		durationExtraMonths,
		durationMonths,
		startDate,
		periodStartMonth,
	]);

	// Update duration when rate changes (for fixed rates - always lock to fixed term)
	useEffect(() => {
		if (selectedRate?.type === "fixed" && selectedRate.fixedTerm) {
			// Fixed rates MUST use their fixed term duration
			setDurationYears(selectedRate.fixedTerm);
			setDurationExtraMonths(0);
		}
	}, [selectedRate]);

	// Check if duration is locked:
	// - Fixed rates always have locked duration (based on fixedTerm)
	// - Variable rates: locked when editing a non-last period
	const isDurationLocked =
		(selectedRate?.type === "fixed" && !!selectedRate.fixedTerm) ||
		(editingPeriod && !isLastPeriod);

	// Check if rate selection is disabled (always disabled when editing)
	const isRateSelectionDisabled = !!editingPeriod;

	const handleSubmit = () => {
		if (!selectedRate) return;

		const label =
			customLabel ||
			(selectedRate.type === "fixed" && selectedRate.fixedTerm
				? `${selectedRate.lenderName} ${selectedRate.fixedTerm}-Year Fixed @ ${selectedRate.rate}%`
				: `${selectedRate.lenderName} Variable @ ${selectedRate.rate}%`);

		onAdd({
			lenderId: selectedRate.lenderId,
			rateId: selectedRate.id,
			isCustom: selectedRate.isCustom,
			durationMonths,
			label,
		});

		onOpenChange(false);
	};

	const isValid = selectedRate !== null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{editingPeriod ? "Edit Rate Period" : "Add Rate Period"}
					</DialogTitle>
					<DialogDescription>
						Select a rate and configure when it applies to your mortgage.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{/* Rate Search */}
					<div className="space-y-2">
						<Label>Rate</Label>
						{isRateSelectionDisabled && selectedRate ? (
							<div className="flex items-center gap-3 rounded-md border border-input bg-muted p-3">
								<LenderLogo
									lenderId={selectedRate.lenderId}
									size={32}
									isCustom={selectedRate.isCustom}
								/>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2">
										<span className="font-medium text-sm truncate">
											{selectedRate.name}
										</span>
										<span
											className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
												selectedRate.type === "fixed"
													? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
													: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
											}`}
										>
											{selectedRate.type === "fixed" ? "Fix" : "Var"}
										</span>
									</div>
									<div className="flex items-center gap-2 text-xs text-muted-foreground">
										<span>{selectedRate.lenderName}</span>
										<span>•</span>
										<span className="font-medium text-foreground">
											{selectedRate.rate.toFixed(2)}%
										</span>
										{selectedRate.type === "fixed" &&
											selectedRate.fixedTerm && (
												<>
													<span>•</span>
													<span>{selectedRate.fixedTerm}-year term</span>
												</>
											)}
									</div>
								</div>
							</div>
						) : (
							<div className="relative">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="Search rates..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pl-9"
								/>
							</div>
						)}

						{/* Rate Selection - only show when not editing */}
						{!isRateSelectionDisabled && (
							<ScrollArea className="h-48 border rounded-lg">
								<div className="p-2 space-y-2">
									{groupedRates.size === 0 ? (
										<p className="text-sm text-muted-foreground text-center py-4">
											No rates match your criteria
										</p>
									) : (
										Array.from(groupedRates.entries()).map(
											([lenderId, lenderRates]) => {
												const firstRate = lenderRates[0];
												return (
													<div key={lenderId}>
														<div className="flex items-center gap-2 px-2 py-1">
															<LenderLogo
																lenderId={firstRate.lenderId}
																size={20}
																isCustom={firstRate.isCustom}
															/>
															<span className="text-sm font-medium">
																{firstRate.lenderName}
															</span>
														</div>
														<div className="space-y-1 ml-7">
															{lenderRates.map((rate) => (
																<button
																	key={`${rate.lenderId}-${rate.id}-${rate.isCustom}`}
																	type="button"
																	className={`w-full text-left px-2 py-1.5 rounded-lg text-sm hover:bg-muted transition-colors ${
																		selectedRate?.id === rate.id &&
																		selectedRate?.lenderId === rate.lenderId &&
																		selectedRate?.isCustom === rate.isCustom
																			? "bg-primary/10 border border-primary"
																			: ""
																	}`}
																	onClick={() => setSelectedRate(rate)}
																>
																	<div className="flex items-center justify-between">
																		<span>{rate.name}</span>
																		<span className="font-medium">
																			{rate.rate.toFixed(2)}%
																		</span>
																	</div>
																	<div className="text-xs text-muted-foreground">
																		{rate.type === "fixed" && rate.fixedTerm
																			? `${rate.fixedTerm} year fixed`
																			: "Variable"}
																		{rate.isCustom && " • Custom"}
																	</div>
																</button>
															))}
														</div>
													</div>
												);
											},
										)
									)}
								</div>
							</ScrollArea>
						)}
					</div>

					{/* Duration */}
					<div className="space-y-2">
						<Label>Until</Label>
						{isDurationLocked ? (
							<div className="space-y-1.5">
								<div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm">
									{selectedRate?.type === "fixed" && selectedRate.fixedTerm ? (
										<>
											{selectedRate.fixedTerm} year
											{selectedRate.fixedTerm !== 1 && "s"} (fixed term)
										</>
									) : durationMonths === 0 ? (
										"End of mortgage"
									) : (
										<>
											{durationYears > 0 &&
												`${durationYears} year${durationYears !== 1 ? "s" : ""}`}
											{durationYears > 0 && durationExtraMonths > 0 && " "}
											{durationExtraMonths > 0 &&
												`${durationExtraMonths} month${durationExtraMonths !== 1 ? "s" : ""}`}
										</>
									)}
								</div>
								<p className="text-xs text-muted-foreground">
									{selectedRate?.type === "fixed"
										? "Fixed rate duration is determined by the rate's fixed term"
										: "Duration cannot be changed for earlier rate periods"}
								</p>
							</div>
						) : (
							<Tabs
								value={durationMode}
								onValueChange={(v) => setDurationMode(v as DurationMode)}
							>
								<TabsList>
									<TabsTrigger value="calendar">Calendar</TabsTrigger>
									<TabsTrigger value="duration">Duration</TabsTrigger>
									<TabsTrigger value="end">End</TabsTrigger>
								</TabsList>

								<TabsContent value="calendar" className="mt-3">
									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-1">
											<Label
												htmlFor="targetYear"
												className="text-xs text-muted-foreground"
											>
												Year
											</Label>
											<Select
												key={`year-${durationMode}-${targetYear}`}
												value={String(targetYear)}
												onValueChange={(v) => setTargetYear(Number(v))}
											>
												<SelectTrigger id="targetYear" className="w-full">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{startDate
														? Array.from({ length: 40 }, (_, i) => {
																const year = new Date().getFullYear() + i;
																return (
																	<SelectItem key={year} value={String(year)}>
																		{year}
																	</SelectItem>
																);
															})
														: Array.from(
																{
																	length: Math.max(
																		Math.ceil(totalMonths / 12) + 1,
																		targetYear + 1,
																	),
																},
																(_, i) => i + 1,
															).map((year) => (
																<SelectItem key={year} value={String(year)}>
																	Year {year}
																</SelectItem>
															))}
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-1">
											<Label
												htmlFor="targetMonth"
												className="text-xs text-muted-foreground"
											>
												Month
											</Label>
											<Select
												key={`month-${durationMode}-${targetMonth}`}
												value={String(targetMonth)}
												onValueChange={(v) => setTargetMonth(Number(v))}
											>
												<SelectTrigger id="targetMonth" className="w-full">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{Array.from({ length: 12 }, (_, i) => i + 1).map(
														(month) =>
															startDate ? (
																<SelectItem key={month} value={String(month)}>
																	{new Date(2000, month - 1).toLocaleString(
																		"en-IE",
																		{ month: "long" },
																	)}
																</SelectItem>
															) : (
																<SelectItem key={month} value={String(month)}>
																	Month {month}
																</SelectItem>
															),
													)}
												</SelectContent>
											</Select>
										</div>
									</div>
								</TabsContent>

								<TabsContent value="duration" className="mt-3">
									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-1">
											<Label
												htmlFor="durationYears"
												className="text-xs text-muted-foreground"
											>
												Years
											</Label>
											<Select
												value={String(durationYears)}
												onValueChange={(v) => setDurationYears(Number(v))}
											>
												<SelectTrigger id="durationYears" className="w-full">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{Array.from(
														{ length: Math.ceil(totalMonths / 12) + 1 },
														(_, i) => i,
													).map((year) => (
														<SelectItem key={year} value={String(year)}>
															{year} year{year !== 1 && "s"}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-1">
											<Label
												htmlFor="durationMonths"
												className="text-xs text-muted-foreground"
											>
												Months
											</Label>
											<Select
												value={String(durationExtraMonths)}
												onValueChange={(v) => setDurationExtraMonths(Number(v))}
											>
												<SelectTrigger id="durationMonths" className="w-full">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{Array.from({ length: 12 }, (_, i) => i).map(
														(month) => (
															<SelectItem key={month} value={String(month)}>
																{month} month{month !== 1 && "s"}
															</SelectItem>
														),
													)}
												</SelectContent>
											</Select>
										</div>
									</div>
								</TabsContent>

								<TabsContent value="end" className="mt-3">
									<p className="text-sm text-muted-foreground">
										This rate will apply until the end of the mortgage.
									</p>
								</TabsContent>

								{/* Show computed duration for calendar mode */}
								{durationMode === "calendar" && durationMonths > 0 && (
									<p className="text-xs text-muted-foreground mt-2">
										= {Math.floor(durationMonths / 12)} year
										{Math.floor(durationMonths / 12) !== 1 && "s"}
										{durationMonths % 12 > 0 &&
											` ${durationMonths % 12} month${durationMonths % 12 !== 1 ? "s" : ""}`}
									</p>
								)}
							</Tabs>
						)}
					</div>

					{/* Custom Label */}
					<div className="space-y-2">
						<Label htmlFor="label">Label (optional)</Label>
						<Input
							id="label"
							placeholder="e.g., Initial Fixed Rate"
							value={customLabel}
							onChange={(e) => setCustomLabel(e.target.value)}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={!isValid}>
						{editingPeriod ? "Save Changes" : "Add Rate Period"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
