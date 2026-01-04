import { AlertTriangle, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import type { Lender } from "@/lib/schemas/lender";
import type { MortgageRate } from "@/lib/schemas/rate";
import type { RatePeriod } from "@/lib/schemas/simulate";
import type { CustomRate } from "@/lib/stores/custom-rates";

interface AddRatePeriodDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onAdd: (period: Omit<RatePeriod, "id">) => void;
	rates: MortgageRate[];
	customRates: CustomRate[];
	lenders: Lender[];
	existingPeriods: RatePeriod[];
	totalMonths: number;
	mortgageAmount: number;
	propertyValue: number;
	defaultStartMonth: number;
	editingPeriod?: RatePeriod;
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

// Check if two rate periods overlap
function periodsOverlap(
	a: { startMonth: number; durationMonths: number },
	b: { startMonth: number; durationMonths: number },
	maxMonths: number,
): boolean {
	// Calculate end months (0 duration means until end of mortgage)
	const aEnd =
		a.durationMonths === 0 ? maxMonths : a.startMonth + a.durationMonths - 1;
	const bEnd =
		b.durationMonths === 0 ? maxMonths : b.startMonth + b.durationMonths - 1;

	// Check for overlap
	return a.startMonth <= bEnd && aEnd >= b.startMonth;
}

export function SimulateAddRatePeriodDialog({
	open,
	onOpenChange,
	onAdd,
	rates,
	customRates,
	lenders,
	existingPeriods,
	totalMonths,
	mortgageAmount,
	propertyValue,
	defaultStartMonth,
	editingPeriod,
}: AddRatePeriodDialogProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedRate, setSelectedRate] = useState<RateOption | null>(null);
	const [startYear, setStartYear] = useState(Math.ceil(defaultStartMonth / 12));
	const [startMonthOfYear, setStartMonthOfYear] = useState(
		((defaultStartMonth - 1) % 12) + 1,
	);
	const [durationYears, setDurationYears] = useState(0);
	const [durationExtraMonths, setDurationExtraMonths] = useState(0);
	const durationMonths = durationYears * 12 + durationExtraMonths;
	const [customLabel, setCustomLabel] = useState("");

	// Calculate actual month number from year and month
	const startMonth = (startYear - 1) * 12 + startMonthOfYear;

	// Check for overlaps with existing periods
	const overlappingPeriod = useMemo(() => {
		const newPeriod = { startMonth, durationMonths };
		for (const existing of existingPeriods) {
			if (periodsOverlap(newPeriod, existing, totalMonths)) {
				return existing;
			}
		}
		return null;
	}, [startMonth, durationMonths, existingPeriods, totalMonths]);

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
				setStartYear(Math.ceil(editingPeriod.startMonth / 12));
				setStartMonthOfYear(((editingPeriod.startMonth - 1) % 12) + 1);
				setDurationYears(Math.floor(editingPeriod.durationMonths / 12));
				setDurationExtraMonths(editingPeriod.durationMonths % 12);
				setCustomLabel(editingPeriod.label || "");
			} else {
				setSelectedRate(null);
				setStartYear(Math.ceil(defaultStartMonth / 12));
				setStartMonthOfYear(((defaultStartMonth - 1) % 12) + 1);
				setDurationYears(0);
				setDurationExtraMonths(0);
				setCustomLabel("");
			}
			setSearchQuery("");
		}
	}, [open, editingPeriod, defaultStartMonth, rateOptions]);

	// Update duration when rate changes (for fixed rates - always lock to fixed term)
	useEffect(() => {
		if (selectedRate?.type === "fixed" && selectedRate.fixedTerm) {
			// Fixed rates MUST use their fixed term duration
			setDurationYears(selectedRate.fixedTerm);
			setDurationExtraMonths(0);
		}
	}, [selectedRate]);

	// Check if duration is locked (fixed rate selected)
	const isDurationLocked =
		selectedRate?.type === "fixed" && !!selectedRate.fixedTerm;

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
			startMonth,
			durationMonths,
			label,
		});

		onOpenChange(false);
	};

	const hasOverlap = overlappingPeriod !== null;
	const isValid = selectedRate !== null && startMonth >= 1 && !hasOverlap;

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
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search rates..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-9"
							/>
						</div>

						{/* Rate Selection */}
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
					</div>

					{/* Start Year and Month */}
					<div className="space-y-2">
						<Label>Starts at</Label>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-1">
								<Label
									htmlFor="startYear"
									className="text-xs text-muted-foreground"
								>
									Year
								</Label>
								<Select
									value={String(startYear)}
									onValueChange={(v) => setStartYear(Number(v))}
								>
									<SelectTrigger id="startYear" className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{Array.from(
											{ length: Math.ceil(totalMonths / 12) },
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
									htmlFor="startMonthOfYear"
									className="text-xs text-muted-foreground"
								>
									Month
								</Label>
								<Select
									value={String(startMonthOfYear)}
									onValueChange={(v) => setStartMonthOfYear(Number(v))}
								>
									<SelectTrigger id="startMonthOfYear" className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{Array.from({ length: 12 }, (_, i) => i + 1).map(
											(month) => (
												<SelectItem key={month} value={String(month)}>
													Month {month}
												</SelectItem>
											),
										)}
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>

					{/* Duration */}
					<div className="space-y-2">
						<Label>Duration</Label>
						{isDurationLocked ? (
							<div className="space-y-1.5">
								<div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm">
									{selectedRate?.fixedTerm} year
									{selectedRate?.fixedTerm !== 1 && "s"} (fixed term)
								</div>
								<p className="text-xs text-muted-foreground">
									Fixed rate duration is determined by the rate's fixed term
								</p>
							</div>
						) : (
							<div className="space-y-2">
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
								{durationMonths === 0 && (
									<p className="text-xs text-muted-foreground">
										0 years 0 months = Until end of mortgage
									</p>
								)}
							</div>
						)}
					</div>

					{/* Overlap Warning */}
					{hasOverlap && (
						<div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
							<AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
							<div>
								<p className="font-medium">
									This period overlaps with an existing rate period.
								</p>
								<p className="text-destructive/80 text-xs mt-1">
									Adjust the start date or duration to avoid conflicts.
								</p>
							</div>
						</div>
					)}

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
