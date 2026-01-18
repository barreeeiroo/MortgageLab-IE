import { useCallback, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMonthName, getCalendarDate } from "@/lib/utils/date";

export type TimingMode = "calendar" | "duration";

interface SimulateTimingSelectorProps {
	type: "one_time" | "recurring";
	startMonth: number;
	setStartMonth: (month: number) => void;
	endMonth?: number | undefined;
	setEndMonth?: (month: number | undefined) => void;
	totalMonths: number;
	startDate?: string;
	timingMode: TimingMode;
	setTimingMode: (mode: TimingMode) => void;
	periodBounds: { startMonth: number; endMonth: number } | null;
}

export function SimulateTimingSelector({
	type,
	startMonth,
	setStartMonth,
	endMonth,
	setEndMonth,
	totalMonths,
	startDate,
	timingMode,
	setTimingMode,
	periodBounds,
}: SimulateTimingSelectorProps) {
	// Check if the selected period goes until the end of mortgage
	const isPeriodUntilEnd = periodBounds?.endMonth === totalMonths;

	// Get the effective bounds (default to full mortgage if no period bounds)
	const minMonth = periodBounds?.startMonth ?? 1;
	const maxMonth = periodBounds?.endMonth ?? totalMonths;

	// Calendar mode values (derived from startMonth/endMonth + startDate)
	const getCalendarValues = useCallback(
		(month: number) => {
			if (startDate) {
				const date = getCalendarDate(startDate, month - 1);
				return {
					year: date.getFullYear(),
					monthOfYear: date.getMonth() + 1,
				};
			}
			// Fallback to mortgage year/month
			return {
				year: Math.ceil(month / 12),
				monthOfYear: ((month - 1) % 12) + 1,
			};
		},
		[startDate],
	);

	const startCalendarValues = getCalendarValues(startMonth);
	const endCalendarValues =
		endMonth !== undefined ? getCalendarValues(endMonth) : undefined;

	// Get calendar values for period bounds
	const minCalendarValues = getCalendarValues(minMonth);
	const maxCalendarValues = getCalendarValues(maxMonth);

	// Convert calendar values back to absolute month
	const calendarToMonth = useCallback(
		(calYear: number, calMonth: number) => {
			if (startDate) {
				// Parse start date
				const [sYear, sMonth] = startDate.split("-").map(Number);
				const startTotal = sYear * 12 + (sMonth - 1);
				const targetTotal = calYear * 12 + (calMonth - 1);
				return Math.max(1, targetTotal - startTotal + 1);
			}
			// Fallback: mortgage year/month
			return (calYear - 1) * 12 + calMonth;
		},
		[startDate],
	);

	// Convert duration values to absolute month
	const durationToMonth = (years: number, months: number) => {
		return years * 12 + months;
	};

	// Handle start changes with bounds clamping
	const handleStartCalendarChange = (year: number, month: number) => {
		let newMonth = calendarToMonth(year, month);
		// Clamp to period bounds
		newMonth = Math.max(minMonth, Math.min(maxMonth, newMonth));
		setStartMonth(newMonth);
	};

	const handleStartDurationChange = (years: number, months: number) => {
		let newMonth = durationToMonth(years, months);
		// Clamp to period bounds
		newMonth = Math.max(minMonth, Math.min(maxMonth, newMonth));
		setStartMonth(newMonth);
	};

	// Handle end changes with bounds clamping
	const handleEndCalendarChange = (
		year: number | undefined,
		month: number | undefined,
	) => {
		if (!setEndMonth) return;
		if (year === undefined || month === undefined) {
			setEndMonth(undefined);
		} else {
			let newMonth = calendarToMonth(year, month);
			// Clamp to period bounds
			newMonth = Math.max(minMonth, Math.min(maxMonth, newMonth));
			setEndMonth(newMonth);
		}
	};

	const handleEndDurationChange = (
		years: number | undefined,
		months: number | undefined,
	) => {
		if (!setEndMonth) return;
		if (years === undefined || months === undefined) {
			setEndMonth(undefined);
		} else {
			let newMonth = durationToMonth(years, months);
			// Clamp to period bounds
			newMonth = Math.max(minMonth, Math.min(maxMonth, newMonth));
			setEndMonth(newMonth);
		}
	};

	// Generate year options for calendar mode - limited to period bounds
	const calendarYearOptions = useMemo(() => {
		if (startDate) {
			const years: number[] = [];
			for (let y = minCalendarValues.year; y <= maxCalendarValues.year; y++) {
				years.push(y);
			}
			return years;
		}
		// Fallback to mortgage years within bounds
		const minYear = Math.ceil(minMonth / 12);
		const maxYear = Math.ceil(maxMonth / 12);
		return Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);
	}, [
		startDate,
		minMonth,
		maxMonth,
		minCalendarValues.year,
		maxCalendarValues.year,
	]);

	// Generate month options for calendar mode based on selected year
	const getCalendarMonthOptions = useCallback(
		(selectedYear: number) => {
			let minM = 1;
			let maxM = 12;

			if (selectedYear === minCalendarValues.year) {
				minM = minCalendarValues.monthOfYear;
			}
			if (selectedYear === maxCalendarValues.year) {
				maxM = maxCalendarValues.monthOfYear;
			}

			return Array.from({ length: maxM - minM + 1 }, (_, i) => minM + i);
		},
		[minCalendarValues, maxCalendarValues],
	);

	// Duration bounds
	const minDurationYears = Math.floor((minMonth - 1) / 12);
	const minDurationMonths = ((minMonth - 1) % 12) + 1;
	const maxDurationYears = Math.floor((maxMonth - 1) / 12);
	const maxDurationMonths = ((maxMonth - 1) % 12) + 1;

	// Current duration values (derived from startMonth/endMonth)
	const startDurationYears = Math.floor((startMonth - 1) / 12);
	const startDurationMonths = ((startMonth - 1) % 12) + 1;
	const endDurationYears =
		endMonth !== undefined ? Math.floor((endMonth - 1) / 12) : undefined;
	const endDurationMonths =
		endMonth !== undefined ? ((endMonth - 1) % 12) + 1 : undefined;

	// Generate year options for duration mode - limited to period bounds
	const durationYearOptions = useMemo(() => {
		return Array.from(
			{ length: maxDurationYears - minDurationYears + 1 },
			(_, i) => minDurationYears + i,
		);
	}, [minDurationYears, maxDurationYears]);

	// Generate month options for duration mode based on selected year
	const getDurationMonthOptions = useCallback(
		(selectedYears: number) => {
			let minM = 1;
			let maxM = 12;

			if (selectedYears === minDurationYears) {
				minM = minDurationMonths;
			}
			if (selectedYears === maxDurationYears) {
				maxM = maxDurationMonths;
			}

			return Array.from({ length: maxM - minM + 1 }, (_, i) => minM + i);
		},
		[minDurationYears, minDurationMonths, maxDurationYears, maxDurationMonths],
	);

	// Get options for current selections
	const startCalendarMonthOptions = getCalendarMonthOptions(
		startCalendarValues.year,
	);
	const endCalendarMonthOptions = endCalendarValues
		? getCalendarMonthOptions(endCalendarValues.year)
		: [];
	const startDurationMonthOptions = getDurationMonthOptions(startDurationYears);
	const endDurationMonthOptions =
		endDurationYears !== undefined
			? getDurationMonthOptions(endDurationYears)
			: [];

	return (
		<div className="space-y-2">
			<Label>{type === "one_time" ? "When" : "Timing"}</Label>
			<Tabs
				value={timingMode}
				onValueChange={(v) => setTimingMode(v as TimingMode)}
			>
				<TabsList className="h-8">
					<TabsTrigger value="calendar" className="text-xs px-2">
						Natural Calendar
					</TabsTrigger>
					<TabsTrigger value="duration" className="text-xs px-2">
						Mortgage Duration
					</TabsTrigger>
				</TabsList>

				<TabsContent value="calendar" className="mt-3 space-y-4">
					{/* Start - Calendar */}
					<div className="space-y-2">
						{type === "recurring" && (
							<Label className="text-xs text-muted-foreground">Starts at</Label>
						)}
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-1">
								<Label
									htmlFor="start_cal_year"
									className="text-xs text-muted-foreground"
								>
									Year
								</Label>
								<Select
									value={String(startCalendarValues.year)}
									onValueChange={(v) =>
										handleStartCalendarChange(
											Number(v),
											startCalendarValues.monthOfYear,
										)
									}
								>
									<SelectTrigger id="start_cal_year" className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{calendarYearOptions.map((year) => (
											<SelectItem key={year} value={String(year)}>
												{startDate ? year : `Year ${year}`}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1">
								<Label
									htmlFor="start_cal_month"
									className="text-xs text-muted-foreground"
								>
									Month
								</Label>
								<Select
									value={String(startCalendarValues.monthOfYear)}
									onValueChange={(v) =>
										handleStartCalendarChange(
											startCalendarValues.year,
											Number(v),
										)
									}
								>
									<SelectTrigger id="start_cal_month" className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{startCalendarMonthOptions.map((m) => (
											<SelectItem key={m} value={String(m)}>
												{startDate ? formatMonthName(m) : `Month ${m}`}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>

					{/* End - Calendar (for recurring) */}
					{type === "recurring" && setEndMonth && (
						<div className="space-y-3">
							{/* Only show "Until end of mortgage" checkbox for final rate periods */}
							{isPeriodUntilEnd && (
								<div className="flex items-center space-x-2">
									<Checkbox
										id="until_end_cal"
										checked={endMonth === undefined}
										onCheckedChange={(checked) => {
											if (checked) {
												handleEndCalendarChange(undefined, undefined);
											} else {
												// Set to current start values as default
												handleEndCalendarChange(
													startCalendarValues.year,
													startCalendarValues.monthOfYear,
												);
											}
										}}
									/>
									<Label
										htmlFor="until_end_cal"
										className="text-sm font-normal cursor-pointer"
									>
										Until end of mortgage
									</Label>
								</div>
							)}

							{/* Always show end date picker if not "until end" (or if non-final period) */}
							{(endMonth !== undefined || !isPeriodUntilEnd) && (
								<div className="space-y-2">
									<Label className="text-xs text-muted-foreground">
										Ends at
									</Label>
									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-1">
											<Label
												htmlFor="end_cal_year"
												className="text-xs text-muted-foreground"
											>
												Year
											</Label>
											<Select
												value={String(
													endCalendarValues?.year ?? maxCalendarValues.year,
												)}
												onValueChange={(v) =>
													handleEndCalendarChange(
														Number(v),
														endCalendarValues?.monthOfYear ??
															maxCalendarValues.monthOfYear,
													)
												}
											>
												<SelectTrigger id="end_cal_year" className="w-full">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{calendarYearOptions.map((year) => (
														<SelectItem key={year} value={String(year)}>
															{startDate ? year : `Year ${year}`}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-1">
											<Label
												htmlFor="end_cal_month"
												className="text-xs text-muted-foreground"
											>
												Month
											</Label>
											<Select
												value={String(
													endCalendarValues?.monthOfYear ??
														maxCalendarValues.monthOfYear,
												)}
												onValueChange={(v) =>
													handleEndCalendarChange(
														endCalendarValues?.year ?? maxCalendarValues.year,
														Number(v),
													)
												}
											>
												<SelectTrigger id="end_cal_month" className="w-full">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{endCalendarMonthOptions.length > 0
														? endCalendarMonthOptions.map((m) => (
																<SelectItem key={m} value={String(m)}>
																	{startDate
																		? formatMonthName(m)
																		: `Month ${m}`}
																</SelectItem>
															))
														: getCalendarMonthOptions(
																endCalendarValues?.year ??
																	maxCalendarValues.year,
															).map((m) => (
																<SelectItem key={m} value={String(m)}>
																	{startDate
																		? formatMonthName(m)
																		: `Month ${m}`}
																</SelectItem>
															))}
												</SelectContent>
											</Select>
										</div>
									</div>
								</div>
							)}
						</div>
					)}
				</TabsContent>

				<TabsContent value="duration" className="mt-3 space-y-4">
					{/* Start - Duration */}
					<div className="space-y-2">
						{type === "recurring" && (
							<Label className="text-xs text-muted-foreground">Starts at</Label>
						)}
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-1">
								<Label
									htmlFor="start_dur_years"
									className="text-xs text-muted-foreground"
								>
									Years
								</Label>
								<Select
									value={String(startDurationYears)}
									onValueChange={(v) =>
										handleStartDurationChange(Number(v), startDurationMonths)
									}
								>
									<SelectTrigger id="start_dur_years" className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{durationYearOptions.map((y) => (
											<SelectItem key={y} value={String(y)}>
												{y} year{y !== 1 && "s"}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1">
								<Label
									htmlFor="start_dur_months"
									className="text-xs text-muted-foreground"
								>
									Months
								</Label>
								<Select
									value={String(startDurationMonths)}
									onValueChange={(v) =>
										handleStartDurationChange(startDurationYears, Number(v))
									}
								>
									<SelectTrigger id="start_dur_months" className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{startDurationMonthOptions.map((m) => (
											<SelectItem key={m} value={String(m)}>
												{m} month{m !== 1 && "s"}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						{startDate && (
							<p className="text-xs text-muted-foreground">
								= {formatMonthName(startCalendarValues.monthOfYear)}{" "}
								{startCalendarValues.year}
							</p>
						)}
					</div>

					{/* End - Duration (for recurring) */}
					{type === "recurring" && setEndMonth && (
						<div className="space-y-3">
							{/* Only show "Until end of mortgage" checkbox for final rate periods */}
							{isPeriodUntilEnd && (
								<div className="flex items-center space-x-2">
									<Checkbox
										id="until_end_dur"
										checked={endMonth === undefined}
										onCheckedChange={(checked) => {
											if (checked) {
												handleEndDurationChange(undefined, undefined);
											} else {
												// Set to current start values as default
												handleEndDurationChange(
													startDurationYears,
													startDurationMonths,
												);
											}
										}}
									/>
									<Label
										htmlFor="until_end_dur"
										className="text-sm font-normal cursor-pointer"
									>
										Until end of mortgage
									</Label>
								</div>
							)}

							{/* Always show end date picker if not "until end" (or if non-final period) */}
							{(endMonth !== undefined || !isPeriodUntilEnd) && (
								<div className="space-y-2">
									<Label className="text-xs text-muted-foreground">
										Ends at
									</Label>
									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-1">
											<Label
												htmlFor="end_dur_years"
												className="text-xs text-muted-foreground"
											>
												Years
											</Label>
											<Select
												value={String(endDurationYears ?? maxDurationYears)}
												onValueChange={(v) =>
													handleEndDurationChange(
														Number(v),
														endDurationMonths ?? maxDurationMonths,
													)
												}
											>
												<SelectTrigger id="end_dur_years" className="w-full">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{durationYearOptions.map((y) => (
														<SelectItem key={y} value={String(y)}>
															{y} year{y !== 1 && "s"}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-1">
											<Label
												htmlFor="end_dur_months"
												className="text-xs text-muted-foreground"
											>
												Months
											</Label>
											<Select
												value={String(endDurationMonths ?? maxDurationMonths)}
												onValueChange={(v) =>
													handleEndDurationChange(
														endDurationYears ?? maxDurationYears,
														Number(v),
													)
												}
											>
												<SelectTrigger id="end_dur_months" className="w-full">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{endDurationMonthOptions.length > 0
														? endDurationMonthOptions.map((m) => (
																<SelectItem key={m} value={String(m)}>
																	{m} month{m !== 1 && "s"}
																</SelectItem>
															))
														: getDurationMonthOptions(
																endDurationYears ?? maxDurationYears,
															).map((m) => (
																<SelectItem key={m} value={String(m)}>
																	{m} month{m !== 1 && "s"}
																</SelectItem>
															))}
												</SelectContent>
											</Select>
										</div>
									</div>
									{startDate &&
										(endCalendarValues?.year !== undefined ||
											!isPeriodUntilEnd) && (
											<p className="text-xs text-muted-foreground">
												={" "}
												{formatMonthName(
													endCalendarValues?.monthOfYear ??
														maxCalendarValues.monthOfYear,
												)}{" "}
												{endCalendarValues?.year ?? maxCalendarValues.year}
											</p>
										)}
								</div>
							)}
						</div>
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}
