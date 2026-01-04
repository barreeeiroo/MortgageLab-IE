import { Info, Sparkles } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { calculateMonthlyPayment } from "@/lib/mortgage/payments";
import type { OverpaymentPolicy } from "@/lib/schemas/overpayment-policy";
import type {
	OverpaymentConfig,
	OverpaymentFrequency,
	ResolvedRatePeriod,
} from "@/lib/schemas/simulate";
import {
	formatCurrency,
	formatCurrencyInput,
	parseCurrency,
} from "@/lib/utils";

interface AddOverpaymentDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onAdd: (config: Omit<OverpaymentConfig, "id">) => void;
	totalMonths: number;
	mortgageAmount: number;
	resolvedRatePeriods: ResolvedRatePeriod[];
	overpaymentPolicies: OverpaymentPolicy[];
	editingConfig?: OverpaymentConfig;
	existingConfigs?: OverpaymentConfig[];
}

// Helper: Format duration
function formatDuration(months: number): string {
	if (months === 0) return "Until end";
	const years = Math.floor(months / 12);
	const remainingMonths = months % 12;
	if (years === 0)
		return `${remainingMonths} month${remainingMonths !== 1 ? "s" : ""}`;
	if (remainingMonths === 0) return `${years} year${years !== 1 ? "s" : ""}`;
	return `${years}y ${remainingMonths}m`;
}

// Helper: Calculate maximum monthly overpayment for a single year
function calculateMaxMonthlyOverpaymentForYear(
	policy: OverpaymentPolicy,
	balance: number,
	monthlyPayment: number,
): number {
	let amount = 0;

	switch (policy.allowanceType) {
		case "percentage":
			if (policy.allowanceBasis === "balance") {
				// e.g., 10% of balance per year → divide by 12 for monthly
				const yearlyAmount = (balance * policy.allowanceValue) / 100;
				amount = Math.floor(yearlyAmount / 12);
			} else if (policy.allowanceBasis === "monthly") {
				// e.g., 10% of monthly payment per month
				amount = Math.floor((monthlyPayment * policy.allowanceValue) / 100);
			}
			break;
		case "flat":
			// e.g., €5,000 per year → divide by 12 for monthly (value is in cents)
			amount = Math.floor((policy.allowanceValue * 100) / 12);
			break;
	}

	// Apply minimum amount if specified (e.g., BOI's €65 minimum)
	// minAmount is in euros, convert to cents
	if (policy.minAmount !== undefined && policy.minAmount > 0) {
		const minAmountCents = policy.minAmount * 100;
		amount = Math.max(amount, minAmountCents);
	}

	return amount;
}

// Represents a yearly overpayment plan
interface YearlyOverpaymentPlan {
	year: number;
	startMonth: number;
	endMonth: number;
	monthlyAmount: number;
	estimatedBalance: number;
}

// Check if a policy has a constant allowance (doesn't depend on balance)
function isConstantAllowancePolicy(policy: OverpaymentPolicy): boolean {
	// Monthly-payment-based policies: amount is constant since monthly payment is fixed
	if (
		policy.allowanceType === "percentage" &&
		policy.allowanceBasis === "monthly"
	) {
		return true;
	}
	// Flat policies: amount is always the same
	if (policy.allowanceType === "flat") {
		return true;
	}
	return false;
}

// Helper: Calculate yearly overpayment plans for a fixed rate period
function calculateYearlyOverpaymentPlans(
	policy: OverpaymentPolicy,
	period: ResolvedRatePeriod,
	mortgageAmount: number,
	totalMonths: number,
): YearlyOverpaymentPlan[] {
	const plans: YearlyOverpaymentPlan[] = [];
	const periodDurationMonths =
		period.durationMonths || totalMonths - period.startMonth + 1;
	const periodEndMonth = period.startMonth + periodDurationMonths - 1;

	// Calculate monthly payment ONCE at start of period (same as actual amortization)
	const remainingMonthsAtStart = totalMonths - period.startMonth + 1;
	const fixedMonthlyPayment =
		calculateMonthlyPayment(
			mortgageAmount / 100, // Convert cents to euros
			period.rate,
			remainingMonthsAtStart,
		) * 100; // Convert back to cents

	// For constant-allowance policies (monthly-based or flat), create a single plan
	// for the entire period since the amount doesn't change
	if (isConstantAllowancePolicy(policy)) {
		const monthlyAmount = calculateMaxMonthlyOverpaymentForYear(
			policy,
			mortgageAmount, // Balance doesn't matter for these policies
			fixedMonthlyPayment,
		);

		if (monthlyAmount > 0) {
			plans.push({
				year: 1,
				startMonth: period.startMonth,
				endMonth: periodEndMonth,
				monthlyAmount,
				estimatedBalance: mortgageAmount,
			});
		}
		return plans;
	}

	// For balance-based policies, calculate per-year since amount decreases
	const numYears = Math.ceil(periodDurationMonths / 12);
	let estimatedBalance = mortgageAmount;
	const monthlyRate = period.rate / 100 / 12;

	for (let yearIndex = 0; yearIndex < numYears; yearIndex++) {
		const yearStartMonth = period.startMonth + yearIndex * 12;
		const yearEndMonth = Math.min(yearStartMonth + 11, periodEndMonth);

		// Calculate max monthly overpayment for this year based on balance at year start
		const monthlyAmount = calculateMaxMonthlyOverpaymentForYear(
			policy,
			estimatedBalance,
			fixedMonthlyPayment,
		);

		if (monthlyAmount > 0) {
			plans.push({
				year: yearIndex + 1,
				startMonth: yearStartMonth,
				endMonth: yearEndMonth,
				monthlyAmount,
				estimatedBalance,
			});
		}

		// Estimate balance at start of next year
		const monthsInThisYear = yearEndMonth - yearStartMonth + 1;

		for (let m = 0; m < monthsInThisYear; m++) {
			const interestPortion = estimatedBalance * monthlyRate;
			const principalPortion = fixedMonthlyPayment - interestPortion;
			const overpayment = monthlyAmount;
			estimatedBalance = Math.max(
				0,
				estimatedBalance - principalPortion - overpayment,
			);
		}

		if (estimatedBalance <= 0) break;
	}

	return plans;
}

export function SimulateAddOverpaymentDialog({
	open,
	onOpenChange,
	onAdd,
	totalMonths,
	mortgageAmount,
	resolvedRatePeriods,
	overpaymentPolicies,
	editingConfig,
	existingConfigs = [],
}: AddOverpaymentDialogProps) {
	// Tab mode
	const [mode, setMode] = useState<"maximize" | "custom">("maximize");

	// Maximize mode state
	const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");

	// Custom mode state
	const [type, setType] = useState<"one_time" | "recurring">("one_time");
	const [frequency, setFrequency] = useState<OverpaymentFrequency>("monthly");
	const [amount, setAmount] = useState("");
	const [startYear, setStartYear] = useState(1);
	const [startMonthOfYear, setStartMonthOfYear] = useState(1);
	const [endYear, setEndYear] = useState<number | undefined>(undefined);
	const [endMonthOfYear, setEndMonthOfYear] = useState<number | undefined>(
		undefined,
	);
	const [effect, setEffect] = useState<"reduce_term" | "reduce_payment">(
		"reduce_term",
	);
	const [label, setLabel] = useState("");

	// Calculate actual month numbers from year and month (custom mode)
	const startMonth = (startYear - 1) * 12 + startMonthOfYear;
	const endMonth =
		endYear !== undefined && endMonthOfYear !== undefined
			? (endYear - 1) * 12 + endMonthOfYear
			: undefined;

	// Filter fixed rate periods for maximize mode
	const fixedRatePeriods = useMemo(
		() => resolvedRatePeriods.filter((p) => p.type === "fixed"),
		[resolvedRatePeriods],
	);

	// Check which fixed periods already have max overpayments configured
	const periodsWithMaxOverpayment = useMemo(() => {
		const periodIds = new Set<string>();
		for (const config of existingConfigs) {
			// Check if this config is a "Max overpayment" type
			if (config.label?.startsWith("Max overpayment")) {
				// Find which fixed rate period this config overlaps with
				for (const period of fixedRatePeriods) {
					const periodEnd =
						period.durationMonths > 0
							? period.startMonth + period.durationMonths - 1
							: totalMonths;
					// Check if config overlaps with this period
					const configEnd = config.endMonth || totalMonths;
					if (
						config.startMonth <= periodEnd &&
						configEnd >= period.startMonth
					) {
						periodIds.add(period.id);
					}
				}
			}
		}
		return periodIds;
	}, [existingConfigs, fixedRatePeriods, totalMonths]);

	// Filter to only show periods that don't already have max overpayments
	const availableFixedPeriods = useMemo(
		() => fixedRatePeriods.filter((p) => !periodsWithMaxOverpayment.has(p.id)),
		[fixedRatePeriods, periodsWithMaxOverpayment],
	);

	// Get selected period and its policy
	const selectedPeriod = useMemo(
		() => availableFixedPeriods.find((p) => p.id === selectedPeriodId),
		[availableFixedPeriods, selectedPeriodId],
	);

	const selectedPolicy = useMemo(() => {
		if (!selectedPeriod?.overpaymentPolicyId) return undefined;
		return overpaymentPolicies.find(
			(p) => p.id === selectedPeriod.overpaymentPolicyId,
		);
	}, [selectedPeriod, overpaymentPolicies]);

	// Calculate yearly overpayment plans for selected period
	const yearlyPlans = useMemo(() => {
		if (!selectedPeriod || !selectedPolicy) return [];

		return calculateYearlyOverpaymentPlans(
			selectedPolicy,
			selectedPeriod,
			mortgageAmount,
			totalMonths,
		);
	}, [selectedPeriod, selectedPolicy, mortgageAmount, totalMonths]);

	// Summary for display
	const maximizeSummary = useMemo(() => {
		if (yearlyPlans.length === 0) return null;

		const totalMonthlyAverage =
			yearlyPlans.reduce((sum, p) => sum + p.monthlyAmount, 0) /
			yearlyPlans.length;

		return {
			yearCount: yearlyPlans.length,
			firstYearAmount: yearlyPlans[0].monthlyAmount,
			lastYearAmount: yearlyPlans[yearlyPlans.length - 1].monthlyAmount,
			averageAmount: Math.floor(totalMonthlyAverage),
			policyDescription:
				selectedPolicy?.allowanceType === "percentage" &&
				selectedPolicy?.allowanceBasis === "balance"
					? `${selectedPolicy.allowanceValue}% of balance per year`
					: selectedPolicy?.allowanceType === "percentage" &&
							selectedPolicy?.allowanceBasis === "monthly"
						? `${selectedPolicy.allowanceValue}% of monthly payment`
						: selectedPolicy?.allowanceType === "flat"
							? `€${((selectedPolicy?.allowanceValue ?? 0) / 100).toLocaleString()} per year`
							: "No allowance",
		};
	}, [yearlyPlans, selectedPolicy]);

	// Reset form when opening
	useEffect(() => {
		if (open) {
			if (editingConfig) {
				// Editing mode - always use custom tab
				setMode("custom");
				setType(editingConfig.type);
				setFrequency(editingConfig.frequency ?? "monthly");
				setAmount(String(Math.round(editingConfig.amount / 100)));
				setStartYear(Math.ceil(editingConfig.startMonth / 12));
				setStartMonthOfYear(((editingConfig.startMonth - 1) % 12) + 1);
				if (editingConfig.endMonth) {
					setEndYear(Math.ceil(editingConfig.endMonth / 12));
					setEndMonthOfYear(((editingConfig.endMonth - 1) % 12) + 1);
				} else {
					setEndYear(undefined);
					setEndMonthOfYear(undefined);
				}
				setEffect(editingConfig.effect);
				setLabel(editingConfig.label || "");
			} else {
				// Adding new - default to maximize if available fixed periods exist
				setMode(availableFixedPeriods.length > 0 ? "maximize" : "custom");
				setSelectedPeriodId(availableFixedPeriods[0]?.id ?? "");
				setType("one_time");
				setFrequency("monthly");
				setAmount("");
				setStartYear(1);
				setStartMonthOfYear(1);
				setEndYear(undefined);
				setEndMonthOfYear(undefined);
				setEffect("reduce_term");
				setLabel("");
			}
		}
	}, [open, editingConfig, availableFixedPeriods]);

	const handleMaximizeSubmit = () => {
		if (yearlyPlans.length === 0 || !selectedPeriod || !selectedPolicy) return;

		// For constant-allowance policies (single plan), use simpler label
		const isSinglePlan =
			yearlyPlans.length === 1 && isConstantAllowancePolicy(selectedPolicy);

		for (const plan of yearlyPlans) {
			onAdd({
				type: "recurring",
				frequency: "monthly",
				amount: plan.monthlyAmount,
				startMonth: plan.startMonth,
				endMonth: plan.endMonth,
				effect: "reduce_term",
				label: isSinglePlan
					? `Max overpayment - ${selectedPeriod.lenderName}`
					: `Max overpayment Y${plan.year} - ${selectedPeriod.lenderName}`,
			});
		}

		onOpenChange(false);
	};

	const handleCustomSubmit = () => {
		const amountValue = parseCurrency(amount);
		const amountCents = Math.round(amountValue * 100);
		if (amountCents <= 0) return;

		onAdd({
			type,
			amount: amountCents,
			startMonth,
			endMonth: type === "recurring" ? endMonth : undefined,
			frequency: type === "recurring" ? frequency : undefined,
			effect,
			label: label || undefined,
		});

		onOpenChange(false);
	};

	const customAmountNum = parseCurrency(amount);
	const isCustomValid = customAmountNum > 0 && startMonth >= 1;
	const isMaximizeValid = selectedPeriod && yearlyPlans.length > 0;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{editingConfig ? "Edit Overpayment" : "Add Overpayment"}
					</DialogTitle>
					<DialogDescription>
						Configure an overpayment to see how it affects your mortgage.
					</DialogDescription>
				</DialogHeader>

				{/* Only show tabs when adding new (not editing) */}
				{!editingConfig && fixedRatePeriods.length > 0 ? (
					<Tabs
						value={mode}
						onValueChange={(v) => setMode(v as "maximize" | "custom")}
					>
						<TabsList className="grid w-full grid-cols-2">
							<TabsTrigger value="maximize" className="gap-1.5">
								<Sparkles className="h-3.5 w-3.5" />
								Maximize
							</TabsTrigger>
							<TabsTrigger value="custom">Custom</TabsTrigger>
						</TabsList>

						<TabsContent value="maximize" className="mt-4 space-y-4">
							{/* Period Selection */}
							{availableFixedPeriods.length === 0 ? (
								<div className="rounded-lg border border-muted bg-muted/50 p-4">
									<p className="text-sm text-muted-foreground">
										All fixed rate periods already have maximum overpayments
										configured. Use the Custom tab to add additional
										overpayments.
									</p>
								</div>
							) : (
								<div className="space-y-2">
									<Label>Fixed Rate Period</Label>
									<Select
										value={selectedPeriodId}
										onValueChange={setSelectedPeriodId}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select a fixed rate period" />
										</SelectTrigger>
										<SelectContent>
											{availableFixedPeriods.map((period) => (
												<SelectItem key={period.id} value={period.id}>
													<div className="flex items-center gap-2">
														<LenderLogo
															lenderId={period.lenderId}
															size={20}
															isCustom={period.isCustom}
														/>
														<span>{period.rateName}</span>
														<span className="text-muted-foreground">
															({formatDuration(period.durationMonths)})
														</span>
													</div>
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}

							{/* Calculated Result */}
							{selectedPeriod &&
								selectedPolicy &&
								yearlyPlans.length > 0 &&
								maximizeSummary && (
									<div className="rounded-lg border bg-muted/50 p-4 space-y-3">
										<div className="flex items-start gap-3">
											<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
												<Sparkles className="h-5 w-5 text-primary" />
											</div>
											<div className="flex-1">
												<div className="text-2xl font-bold">
													{formatCurrency(
														maximizeSummary.firstYearAmount / 100,
													)}
													<span className="text-base font-normal text-muted-foreground">
														/month
													</span>
												</div>
												<p className="text-sm text-muted-foreground">
													{yearlyPlans.length > 1
														? `Year 1 (decreases yearly as balance drops)`
														: "Maximum overpayment without fees"}
												</p>
											</div>
										</div>

										<div className="space-y-1.5 text-sm">
											<div className="flex justify-between">
												<span className="text-muted-foreground">Policy</span>
												<span className="font-medium">
													{selectedPolicy.label}
												</span>
											</div>
											<div className="flex justify-between">
												<span className="text-muted-foreground">Allowance</span>
												<span>{maximizeSummary.policyDescription}</span>
											</div>
										</div>

										{/* Yearly breakdown */}
										{yearlyPlans.length > 1 && (
											<div className="pt-2 border-t space-y-1.5">
												<span className="text-xs text-muted-foreground font-medium">
													Yearly Breakdown
												</span>
												<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
													{yearlyPlans.map((plan) => (
														<div
															key={plan.year}
															className="flex justify-between"
														>
															<span className="text-muted-foreground">
																Year {plan.year}
															</span>
															<span className="font-medium">
																{formatCurrency(plan.monthlyAmount / 100)}/mo
															</span>
														</div>
													))}
												</div>
											</div>
										)}

										<div className="flex items-start gap-2 pt-2 border-t text-xs text-muted-foreground">
											<Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
											<p>
												{yearlyPlans.length > 1
													? `This creates ${yearlyPlans.length} separate yearly overpayments, each adjusted for the decreasing balance.`
													: "This creates a recurring monthly overpayment for the duration of the fixed rate period."}
											</p>
										</div>
									</div>
								)}

							{selectedPeriod && !selectedPolicy && (
								<div className="rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 p-4">
									<p className="text-sm text-yellow-800 dark:text-yellow-200">
										This lender doesn't have an overpayment policy configured.
										Use the Custom tab to manually enter an overpayment.
									</p>
								</div>
							)}
						</TabsContent>

						<TabsContent value="custom" className="mt-4 space-y-4">
							<CustomOverpaymentForm
								type={type}
								setType={setType}
								frequency={frequency}
								setFrequency={setFrequency}
								amount={amount}
								setAmount={setAmount}
								startYear={startYear}
								setStartYear={setStartYear}
								startMonthOfYear={startMonthOfYear}
								setStartMonthOfYear={setStartMonthOfYear}
								endYear={endYear}
								setEndYear={setEndYear}
								endMonthOfYear={endMonthOfYear}
								setEndMonthOfYear={setEndMonthOfYear}
								effect={effect}
								setEffect={setEffect}
								label={label}
								setLabel={setLabel}
								totalMonths={totalMonths}
							/>
						</TabsContent>
					</Tabs>
				) : (
					<div className="space-y-4 py-4">
						<CustomOverpaymentForm
							type={type}
							setType={setType}
							frequency={frequency}
							setFrequency={setFrequency}
							amount={amount}
							setAmount={setAmount}
							startYear={startYear}
							setStartYear={setStartYear}
							startMonthOfYear={startMonthOfYear}
							setStartMonthOfYear={setStartMonthOfYear}
							endYear={endYear}
							setEndYear={setEndYear}
							endMonthOfYear={endMonthOfYear}
							setEndMonthOfYear={setEndMonthOfYear}
							effect={effect}
							setEffect={setEffect}
							label={label}
							setLabel={setLabel}
							totalMonths={totalMonths}
						/>
					</div>
				)}

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					{mode === "maximize" && !editingConfig ? (
						<Button onClick={handleMaximizeSubmit} disabled={!isMaximizeValid}>
							Add Overpayment
						</Button>
					) : (
						<Button onClick={handleCustomSubmit} disabled={!isCustomValid}>
							{editingConfig ? "Save Changes" : "Add Overpayment"}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// Extracted custom form to avoid repetition
interface CustomOverpaymentFormProps {
	type: "one_time" | "recurring";
	setType: (type: "one_time" | "recurring") => void;
	frequency: OverpaymentFrequency;
	setFrequency: (freq: OverpaymentFrequency) => void;
	amount: string;
	setAmount: (amount: string) => void;
	startYear: number;
	setStartYear: (year: number) => void;
	startMonthOfYear: number;
	setStartMonthOfYear: (month: number) => void;
	endYear: number | undefined;
	setEndYear: (year: number | undefined) => void;
	endMonthOfYear: number | undefined;
	setEndMonthOfYear: (month: number | undefined) => void;
	effect: "reduce_term" | "reduce_payment";
	setEffect: (effect: "reduce_term" | "reduce_payment") => void;
	label: string;
	setLabel: (label: string) => void;
	totalMonths: number;
}

function CustomOverpaymentForm({
	type,
	setType,
	frequency,
	setFrequency,
	amount,
	setAmount,
	startYear,
	setStartYear,
	startMonthOfYear,
	setStartMonthOfYear,
	endYear,
	setEndYear,
	endMonthOfYear,
	setEndMonthOfYear,
	effect,
	setEffect,
	label,
	setLabel,
	totalMonths,
}: CustomOverpaymentFormProps) {
	return (
		<>
			{/* Type Selection */}
			<div className="space-y-2">
				<Label>Type</Label>
				<RadioGroup
					value={type}
					onValueChange={(v) => setType(v as "one_time" | "recurring")}
					className="flex gap-4"
				>
					<div className="flex items-center space-x-2">
						<RadioGroupItem value="one_time" id="one_time" />
						<Label htmlFor="one_time" className="font-normal cursor-pointer">
							One-time lump sum
						</Label>
					</div>
					<div className="flex items-center space-x-2">
						<RadioGroupItem value="recurring" id="recurring" />
						<Label htmlFor="recurring" className="font-normal cursor-pointer">
							Recurring
						</Label>
					</div>
				</RadioGroup>
			</div>

			{/* Frequency Selection (for recurring) */}
			{type === "recurring" && (
				<div className="space-y-2">
					<Label>Frequency</Label>
					<RadioGroup
						value={frequency}
						onValueChange={(v) => setFrequency(v as OverpaymentFrequency)}
						className="flex gap-4"
					>
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="monthly" id="custom_monthly" />
							<Label
								htmlFor="custom_monthly"
								className="font-normal cursor-pointer"
							>
								Monthly
							</Label>
						</div>
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="yearly" id="custom_yearly" />
							<Label
								htmlFor="custom_yearly"
								className="font-normal cursor-pointer"
							>
								Yearly
							</Label>
						</div>
					</RadioGroup>
				</div>
			)}

			{/* Amount */}
			<div className="space-y-2">
				<Label htmlFor="custom_amount">
					Amount{" "}
					{type === "recurring" &&
						(frequency === "monthly" ? "(per month)" : "(per year)")}
				</Label>
				<Input
					id="custom_amount"
					type="text"
					inputMode="numeric"
					placeholder="€1,000"
					value={amount ? formatCurrencyInput(amount) : ""}
					onChange={(e) => {
						const raw = e.target.value.replace(/[^0-9]/g, "");
						setAmount(raw);
					}}
					className="w-full"
				/>
			</div>

			{/* Timing - Start */}
			<div className="space-y-2">
				<Label>{type === "one_time" ? "When" : "Starts at"}</Label>
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-1">
						<Label
							htmlFor="custom_startYear"
							className="text-xs text-muted-foreground"
						>
							Year
						</Label>
						<Select
							value={String(startYear)}
							onValueChange={(v) => setStartYear(Number(v))}
						>
							<SelectTrigger id="custom_startYear" className="w-full">
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
							htmlFor="custom_startMonthOfYear"
							className="text-xs text-muted-foreground"
						>
							Month
						</Label>
						<Select
							value={String(startMonthOfYear)}
							onValueChange={(v) => setStartMonthOfYear(Number(v))}
						>
							<SelectTrigger id="custom_startMonthOfYear" className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
									<SelectItem key={month} value={String(month)}>
										Month {month}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>

			{/* Timing - End (for recurring) */}
			{type === "recurring" && (
				<div className="space-y-2">
					<Label>Ends at (optional)</Label>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1">
							<Label
								htmlFor="custom_endYear"
								className="text-xs text-muted-foreground"
							>
								Year
							</Label>
							<Select
								value={endYear !== undefined ? String(endYear) : "until_end"}
								onValueChange={(v) => {
									if (v === "until_end") {
										setEndYear(undefined);
										setEndMonthOfYear(undefined);
									} else {
										setEndYear(Number(v));
										if (endMonthOfYear === undefined) {
											setEndMonthOfYear(12);
										}
									}
								}}
							>
								<SelectTrigger id="custom_endYear" className="w-full">
									<SelectValue placeholder="Until end" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="until_end">Until end</SelectItem>
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
								htmlFor="custom_endMonthOfYear"
								className="text-xs text-muted-foreground"
							>
								Month
							</Label>
							<Select
								value={
									endMonthOfYear !== undefined ? String(endMonthOfYear) : ""
								}
								onValueChange={(v) =>
									setEndMonthOfYear(v ? Number(v) : undefined)
								}
								disabled={endYear === undefined}
							>
								<SelectTrigger id="custom_endMonthOfYear" className="w-full">
									<SelectValue placeholder="-" />
								</SelectTrigger>
								<SelectContent>
									{Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
										<SelectItem key={month} value={String(month)}>
											Month {month}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>
			)}

			{/* Effect */}
			<div className="space-y-2">
				<Label>Effect</Label>
				<Select
					value={effect}
					onValueChange={(v) =>
						setEffect(v as "reduce_term" | "reduce_payment")
					}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="reduce_term">
							<div>
								<div>Reduce term</div>
								<div className="text-xs text-muted-foreground">
									Keep payment, pay off faster
								</div>
							</div>
						</SelectItem>
						<SelectItem value="reduce_payment">
							<div>
								<div>Reduce payment</div>
								<div className="text-xs text-muted-foreground">
									Keep term, lower monthly payment
								</div>
							</div>
						</SelectItem>
					</SelectContent>
				</Select>
				<p className="text-xs text-muted-foreground">
					During fixed rate periods, overpayments may only reduce the remaining
					principal for the follow-on rate.
				</p>
			</div>

			{/* Label */}
			<div className="space-y-2">
				<Label htmlFor="custom_label">Note (optional)</Label>
				<Input
					id="custom_label"
					placeholder="e.g., Annual bonus"
					value={label}
					onChange={(e) => setLabel(e.target.value)}
				/>
			</div>
		</>
	);
}
