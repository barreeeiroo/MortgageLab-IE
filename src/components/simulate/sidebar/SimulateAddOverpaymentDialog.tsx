import { CircleDollarSign, Info, Repeat, Sparkles } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	calculateYearlyOverpaymentPlans,
	formatPolicyDescription,
	isConstantAllowancePolicy,
	type YearlyOverpaymentPlan,
} from "@/lib/mortgage/overpayments";
import type { OverpaymentPolicy } from "@/lib/schemas/overpayment-policy";
import type {
	OverpaymentConfig,
	OverpaymentFrequency,
	ResolvedRatePeriod,
} from "@/lib/schemas/simulate";
import { formatCurrency, parseCurrency } from "@/lib/utils";
import { formatTransitionDate } from "@/lib/utils/date";
import { SimulateOverpaymentForm } from "./SimulateOverpaymentForm";
import type { TimingMode } from "./SimulateTimingSelector";

interface SimulateAddOverpaymentDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onAdd: (config: Omit<OverpaymentConfig, "id">) => void;
	totalMonths: number;
	mortgageAmount: number;
	resolvedRatePeriods: ResolvedRatePeriod[];
	overpaymentPolicies: OverpaymentPolicy[];
	existingConfigs?: OverpaymentConfig[];
	startDate?: string;
}

type TabMode = "maximize" | "one_time" | "recurring";

export function SimulateAddOverpaymentDialog({
	open,
	onOpenChange,
	onAdd,
	totalMonths,
	mortgageAmount,
	resolvedRatePeriods,
	overpaymentPolicies,
	existingConfigs = [],
	startDate,
}: SimulateAddOverpaymentDialogProps) {
	// Tab mode - determines overpayment type
	const [mode, setMode] = useState<TabMode>("maximize");

	// Maximize mode state - for fixed rate period selection
	const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");

	// Custom mode (one_time/recurring) - rate period selection
	const [customRatePeriodId, setCustomRatePeriodId] = useState<string>("");

	// Shared state for one_time and recurring
	const [frequency, setFrequency] = useState<OverpaymentFrequency>("monthly");
	const [amount, setAmount] = useState("");
	const [startMonth, setStartMonth] = useState(1);
	const [endMonth, setEndMonth] = useState<number | undefined>(undefined);
	const [effect, setEffect] = useState<"reduce_term" | "reduce_payment">(
		"reduce_term",
	);
	const [label, setLabel] = useState("");
	const [timingMode, setTimingMode] = useState<TimingMode>(
		startDate ? "calendar" : "duration",
	);

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
			startDate,
		);
	}, [selectedPeriod, selectedPolicy, mortgageAmount, totalMonths, startDate]);

	// Summary for display
	const maximizeSummary = useMemo(() => {
		if (yearlyPlans.length === 0 || !selectedPolicy) return null;

		const totalMonthlyAverage =
			yearlyPlans.reduce((sum, p) => sum + p.monthlyAmount, 0) /
			yearlyPlans.length;

		return {
			yearCount: yearlyPlans.length,
			firstYearAmount: yearlyPlans[0].monthlyAmount,
			lastYearAmount: yearlyPlans[yearlyPlans.length - 1].monthlyAmount,
			averageAmount: Math.floor(totalMonthlyAverage),
			policyDescription: formatPolicyDescription(selectedPolicy),
		};
	}, [yearlyPlans, selectedPolicy]);

	// Get bounds for the selected custom rate period (for one-time/recurring)
	const customRatePeriodBounds = useMemo(() => {
		const period = resolvedRatePeriods.find((p) => p.id === customRatePeriodId);
		if (!period) return null;

		const periodEndMonth =
			period.durationMonths === 0
				? totalMonths
				: period.startMonth + period.durationMonths - 1;

		return {
			startMonth: period.startMonth,
			endMonth: periodEndMonth,
			period,
		};
	}, [customRatePeriodId, resolvedRatePeriods, totalMonths]);

	// Check if selected custom period is fixed (for info message)
	const isCustomPeriodFixed = customRatePeriodBounds?.period?.type === "fixed";

	// Reset form when opening
	useEffect(() => {
		if (open) {
			// Adding new - default to maximize if available fixed periods exist
			setMode(availableFixedPeriods.length > 0 ? "maximize" : "one_time");
			setSelectedPeriodId(availableFixedPeriods[0]?.id ?? "");
			// Default custom rate period to first period
			const firstPeriod = resolvedRatePeriods[0];
			setCustomRatePeriodId(firstPeriod?.id ?? "");
			setFrequency("monthly");
			setAmount("");
			// Start month defaults to first month of selected period
			setStartMonth(firstPeriod?.startMonth ?? 1);

			// Calculate end month based on first period
			// If period goes until end of mortgage, leave undefined (for "Until end" checkbox)
			// Otherwise, set to period's end month
			if (firstPeriod) {
				const periodEndMonth =
					firstPeriod.durationMonths === 0
						? totalMonths
						: firstPeriod.startMonth + firstPeriod.durationMonths - 1;
				const isPeriodUntilEnd = periodEndMonth === totalMonths;
				setEndMonth(isPeriodUntilEnd ? undefined : periodEndMonth);
			} else {
				setEndMonth(undefined);
			}

			setEffect("reduce_term");
			setLabel("");
			setTimingMode(startDate ? "calendar" : "duration");
		}
	}, [
		open,
		availableFixedPeriods,
		resolvedRatePeriods,
		startDate,
		totalMonths,
	]);

	// Reset timing when rate period changes - ALWAYS reset to period bounds
	useEffect(() => {
		const period = resolvedRatePeriods.find((p) => p.id === customRatePeriodId);
		if (!period) return;

		const periodEndMonth =
			period.durationMonths === 0
				? totalMonths
				: period.startMonth + period.durationMonths - 1;
		const isPeriodUntilEnd = periodEndMonth === totalMonths;

		// Always reset start to period's start
		setStartMonth(period.startMonth);

		// Always reset end: undefined for "until end" (last period), or period's end month
		setEndMonth(isPeriodUntilEnd ? undefined : periodEndMonth);
	}, [customRatePeriodId, resolvedRatePeriods, totalMonths]);

	const handleMaximizeSubmit = () => {
		if (yearlyPlans.length === 0 || !selectedPeriod || !selectedPolicy) return;

		// For constant-allowance policies (single plan), use simpler label
		const isSinglePlan =
			yearlyPlans.length === 1 && isConstantAllowancePolicy(selectedPolicy);

		for (const plan of yearlyPlans) {
			onAdd({
				ratePeriodId: selectedPeriod.id,
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
		if (amountCents <= 0 || !customRatePeriodId) return;

		const type = mode === "one_time" ? "one_time" : "recurring";

		onAdd({
			ratePeriodId: customRatePeriodId,
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
	const isCustomValid =
		customAmountNum > 0 && startMonth >= 1 && !!customRatePeriodId;
	const isMaximizeValid = selectedPeriod && yearlyPlans.length > 0;

	// Determine if we should show 2 or 3 tabs
	const hasFixedPeriods = fixedRatePeriods.length > 0;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
				<DialogHeader className="shrink-0">
					<DialogTitle>Add Overpayment</DialogTitle>
					<DialogDescription>
						Configure an overpayment to see how it affects your mortgage.
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
					<Tabs value={mode} onValueChange={(v) => setMode(v as TabMode)}>
						<TabsList
							className={`grid w-full ${hasFixedPeriods ? "grid-cols-3" : "grid-cols-2"}`}
						>
							{hasFixedPeriods && (
								<TabsTrigger value="maximize" className="gap-1.5">
									<Sparkles className="h-3.5 w-3.5" />
									Maximize
								</TabsTrigger>
							)}
							<TabsTrigger value="one_time" className="gap-1.5">
								<CircleDollarSign className="h-3.5 w-3.5" />
								One-time
							</TabsTrigger>
							<TabsTrigger value="recurring" className="gap-1.5">
								<Repeat className="h-3.5 w-3.5" />
								Recurring
							</TabsTrigger>
						</TabsList>

						{hasFixedPeriods && (
							<TabsContent value="maximize" className="mt-4 space-y-4">
								<MaximizeContent
									availableFixedPeriods={availableFixedPeriods}
									selectedPeriodId={selectedPeriodId}
									setSelectedPeriodId={setSelectedPeriodId}
									selectedPeriod={selectedPeriod}
									selectedPolicy={selectedPolicy}
									yearlyPlans={yearlyPlans}
									maximizeSummary={maximizeSummary}
									startDate={startDate}
								/>
							</TabsContent>
						)}

						<TabsContent value="one_time" className="mt-4 space-y-4">
							<SimulateOverpaymentForm
								type="one_time"
								amount={amount}
								setAmount={setAmount}
								startMonth={startMonth}
								setStartMonth={setStartMonth}
								effect={effect}
								setEffect={setEffect}
								label={label}
								setLabel={setLabel}
								totalMonths={totalMonths}
								startDate={startDate}
								timingMode={timingMode}
								setTimingMode={setTimingMode}
								resolvedRatePeriods={resolvedRatePeriods}
								selectedRatePeriodId={customRatePeriodId}
								setSelectedRatePeriodId={setCustomRatePeriodId}
								periodBounds={customRatePeriodBounds}
								isFixedPeriod={isCustomPeriodFixed}
								isEditing={false}
							/>
						</TabsContent>

						<TabsContent value="recurring" className="mt-4 space-y-4">
							<SimulateOverpaymentForm
								type="recurring"
								frequency={frequency}
								setFrequency={setFrequency}
								amount={amount}
								setAmount={setAmount}
								startMonth={startMonth}
								setStartMonth={setStartMonth}
								endMonth={endMonth}
								setEndMonth={setEndMonth}
								effect={effect}
								setEffect={setEffect}
								label={label}
								setLabel={setLabel}
								totalMonths={totalMonths}
								startDate={startDate}
								timingMode={timingMode}
								setTimingMode={setTimingMode}
								resolvedRatePeriods={resolvedRatePeriods}
								selectedRatePeriodId={customRatePeriodId}
								setSelectedRatePeriodId={setCustomRatePeriodId}
								periodBounds={customRatePeriodBounds}
								isFixedPeriod={isCustomPeriodFixed}
								isEditing={false}
							/>
						</TabsContent>
					</Tabs>
				</div>

				<DialogFooter className="shrink-0 border-t pt-4">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					{mode === "maximize" ? (
						<Button onClick={handleMaximizeSubmit} disabled={!isMaximizeValid}>
							Add Overpayment
						</Button>
					) : (
						<Button onClick={handleCustomSubmit} disabled={!isCustomValid}>
							Add Overpayment
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// Maximize tab content
interface MaximizeContentProps {
	availableFixedPeriods: ResolvedRatePeriod[];
	selectedPeriodId: string;
	setSelectedPeriodId: (id: string) => void;
	selectedPeriod: ResolvedRatePeriod | undefined;
	selectedPolicy: OverpaymentPolicy | undefined;
	yearlyPlans: YearlyOverpaymentPlan[];
	maximizeSummary: {
		yearCount: number;
		firstYearAmount: number;
		lastYearAmount: number;
		averageAmount: number;
		policyDescription: string;
	} | null;
	startDate?: string;
}

function MaximizeContent({
	availableFixedPeriods,
	selectedPeriodId,
	setSelectedPeriodId,
	selectedPeriod,
	selectedPolicy,
	yearlyPlans,
	maximizeSummary,
	startDate,
}: MaximizeContentProps) {
	return (
		<>
			{/* Period Selection */}
			{availableFixedPeriods.length === 0 ? (
				<div className="rounded-lg border border-muted bg-muted/50 p-4">
					<p className="text-sm text-muted-foreground">
						All fixed rate periods already have maximum overpayments configured.
						Use the One-time or Recurring tabs to add additional overpayments.
					</p>
				</div>
			) : (
				<div className="space-y-2">
					<Label>Fixed Rate Period</Label>
					<Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
						<SelectTrigger className="w-full">
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
											(
											{formatTransitionDate(startDate, period.startMonth, {
												short: true,
											})}
											)
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
									{formatCurrency(maximizeSummary.firstYearAmount / 100)}
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
								<span className="font-medium">{selectedPolicy.label}</span>
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
										<div key={plan.year} className="flex justify-between">
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
						This lender doesn't have an overpayment policy configured. Use the
						One-time or Recurring tabs to manually enter an overpayment.
					</p>
				</div>
			)}
		</>
	);
}
