import { useStore } from "@nanostores/react";
import { Plus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { FIXED_PERIOD_OPTIONS } from "@/lib/constants/rates";
import { getOverpaymentPolicy } from "@/lib/data/overpayment-policies";
import {
	type CashbackOption,
	calculateCashbackBreakeven,
	parseCashbackFromPerkId,
} from "@/lib/mortgage/breakeven";
import { calculateTotalOverpaymentAllowance } from "@/lib/mortgage/overpayments";
import type { OverpaymentPolicy } from "@/lib/schemas/overpayment-policy";
import type { MortgageRate } from "@/lib/schemas/rate";
import {
	type CashbackOptionShareState,
	clearBreakevenShareParam,
	hasBreakevenShareParam,
	parseBreakevenShareState,
} from "@/lib/share/breakeven";
import {
	type CashbackOptionFormState,
	loadCashbackBreakevenForm,
	saveCashbackBreakevenForm,
} from "@/lib/storage/forms";
import {
	type OverpaymentAllowanceInfo,
	showCashbackResult,
} from "@/lib/stores/breakeven";
import { $lenders, fetchLenders } from "@/lib/stores/lenders";
import {
	$overpaymentPolicies,
	fetchOverpaymentPolicies,
} from "@/lib/stores/overpayment-policies";
import {
	formatCurrency,
	formatCurrencyInput,
	parseCurrency,
} from "@/lib/utils/currency";
import { RatePicker } from "../../rates/RatePicker";
import { MortgageTermSelector } from "../../selectors/MortgageTermSelector";
import { Button } from "../../ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "../../ui/card";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "../../ui/toggle-group";

// Generate unique ID for options
let optionIdCounter = 0;
function generateOptionId(): string {
	return `opt-${Date.now()}-${++optionIdCounter}`;
}

function createOption(label: string): CashbackOptionFormState {
	return {
		id: generateOptionId(),
		label,
		rate: "",
		rateInputMode: "manual",
		cashbackType: "percentage",
		cashbackValue: "0",
		cashbackCap: "",
	};
}

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 5;

export function CashbackInputsIsland() {
	// Shared form state
	const [mortgageAmount, setMortgageAmount] = useState("");
	const [mortgageTerm, setMortgageTerm] = useState("300"); // 25 years in months
	const [fixedPeriod, setFixedPeriod] = useState("0"); // Shared fixed period for comparison

	// Options state
	const [options, setOptions] = useState<CashbackOptionFormState[]>(() => [
		createOption("Option 1"),
		createOption("Option 2"),
	]);

	// Auto-calculate flag
	const [shouldAutoCalculate, setShouldAutoCalculate] = useState(false);

	// Subscribe to lenders and overpayment policies for allowance calculation
	const lenders = useStore($lenders);
	const overpaymentPolicies = useStore($overpaymentPolicies);

	// Fetch lenders and policies on mount
	useEffect(() => {
		fetchLenders();
		fetchOverpaymentPolicies();
	}, []);

	// Computed values
	const mortgageAmountNum = parseCurrency(mortgageAmount);

	// Load from shared URL or localStorage on mount
	useEffect(() => {
		// Ensure options have IDs (for backward compatibility and shared state)
		const ensureIds = (
			opts: Partial<CashbackOptionFormState>[],
		): CashbackOptionFormState[] =>
			opts.map((opt) => ({
				id: opt.id ?? generateOptionId(),
				label: opt.label ?? "",
				rate: opt.rate ?? "",
				rateInputMode: opt.rateInputMode ?? "manual",
				cashbackType: opt.cashbackType ?? "percentage",
				cashbackValue: opt.cashbackValue ?? "0",
				cashbackCap: opt.cashbackCap ?? "",
				overpaymentPolicyId: opt.overpaymentPolicyId,
			}));

		// Check for shared URL first
		if (hasBreakevenShareParam()) {
			const shared = parseBreakevenShareState();
			if (shared && shared.type === "cb") {
				setMortgageAmount(shared.mortgageAmount);
				setMortgageTerm(shared.mortgageTerm);
				setFixedPeriod(shared.fixedPeriod);
				setOptions(ensureIds(shared.options));
				clearBreakevenShareParam();
				setShouldAutoCalculate(true);
				return;
			}
		}

		// Fall back to localStorage
		const saved = loadCashbackBreakevenForm();
		if (saved.mortgageAmount) setMortgageAmount(saved.mortgageAmount);
		if (saved.mortgageTerm) setMortgageTerm(saved.mortgageTerm);
		if (saved.fixedPeriod) setFixedPeriod(saved.fixedPeriod);
		if (saved.options && saved.options.length >= MIN_OPTIONS) {
			setOptions(ensureIds(saved.options));
		}
	}, []);

	// Save to localStorage when form changes
	useEffect(() => {
		saveCashbackBreakevenForm({
			mortgageAmount,
			mortgageTerm,
			fixedPeriod,
			options,
		});
	}, [mortgageAmount, mortgageTerm, fixedPeriod, options]);

	// Update a single option
	const updateOption = useCallback(
		(index: number, updates: Partial<CashbackOptionFormState>) => {
			setOptions((prev) =>
				prev.map((opt, i) => (i === index ? { ...opt, ...updates } : opt)),
			);
		},
		[],
	);

	// Add a new option
	const addOption = useCallback(() => {
		if (options.length >= MAX_OPTIONS) return;
		setOptions((prev) => [...prev, createOption(`Option ${prev.length + 1}`)]);
	}, [options.length]);

	// Remove an option
	const removeOption = useCallback(
		(index: number) => {
			if (options.length <= MIN_OPTIONS) return;
			setOptions((prev) => prev.filter((_, i) => i !== index));
		},
		[options.length],
	);

	// Handle rate selection from picker
	const handleRateSelect = useCallback(
		(index: number, rate: MortgageRate, lenderName: string) => {
			// Look up the lender's overpayment policy
			const lender = lenders.find((l) => l.id === rate.lenderId);
			const overpaymentPolicyId = lender?.overpaymentPolicy;

			const rateFixedPeriod =
				rate.type === "variable" ? 0 : (rate.fixedTerm ?? 0);

			// Default to 0% cashback, will be overwritten if rate has cashback perk
			const updates: Partial<CashbackOptionFormState> = {
				rate: rate.rate.toString(),
				label: `${lenderName} ${rate.name}`,
				overpaymentPolicyId, // Auto-select overpayment policy from lender
				cashbackType: "percentage",
				cashbackValue: "0",
				cashbackCap: "",
			};

			// Try to auto-populate cashback from perks
			if (rate.perks && rate.perks.length > 0) {
				for (const perkId of rate.perks) {
					const cashbackConfig = parseCashbackFromPerkId(perkId);
					if (cashbackConfig) {
						updates.cashbackType = cashbackConfig.type;
						updates.cashbackValue = cashbackConfig.value.toString();
						updates.cashbackCap = cashbackConfig.cap?.toString() ?? "";
						break;
					}
				}
			}

			updateOption(index, updates);

			// Auto-update shared fixed period if this rate's period is longer
			const currentFixedPeriod = Number.parseInt(fixedPeriod, 10) || 0;
			if (rateFixedPeriod > currentFixedPeriod) {
				setFixedPeriod(rateFixedPeriod.toString());
			}
		},
		[updateOption, lenders, fixedPeriod],
	);

	// Validation
	const hasMortgageAmount = mortgageAmountNum > 0;

	const isOptionValid = (opt: CashbackOptionFormState) => {
		const hasRate = opt.rate !== "" && Number.parseFloat(opt.rate) > 0;
		const hasCashbackValue =
			opt.cashbackValue !== "" && Number.parseFloat(opt.cashbackValue) >= 0;
		return hasRate && hasCashbackValue;
	};

	const allOptionsValid = options.every(isOptionValid);
	const isFormComplete = hasMortgageAmount && allOptionsValid;

	const calculate = useCallback(() => {
		if (!isFormComplete) return;

		// Use the shared fixed period for all options
		const sharedFixedPeriod = Number.parseInt(fixedPeriod, 10) || undefined;

		const cashbackOptions: CashbackOption[] = options.map((opt, index) => ({
			label: opt.label || `Option ${index + 1}`,
			rate: Number.parseFloat(opt.rate),
			cashbackType: opt.cashbackType,
			cashbackValue: Number.parseFloat(opt.cashbackValue) || 0,
			cashbackCap: opt.cashbackCap ? parseCurrency(opt.cashbackCap) : undefined,
			fixedPeriodYears: sharedFixedPeriod,
		}));

		const result = calculateCashbackBreakeven({
			mortgageAmount: mortgageAmountNum,
			mortgageTermMonths: Number.parseInt(mortgageTerm, 10),
			options: cashbackOptions,
		});

		// Calculate overpayment allowances for each option
		const overpaymentAllowances: OverpaymentAllowanceInfo[] = options.map(
			(opt, index) => {
				const policy = opt.overpaymentPolicyId
					? getOverpaymentPolicy(overpaymentPolicies, opt.overpaymentPolicyId)
					: undefined;
				const monthlyPayment = result.options[index].monthlyPayment;

				// Extract yearly balances for this option from the result
				const yearlyBalances = result.yearlyBreakdown.map(
					(y) => y.balances[index],
				);

				const totalAllowance = calculateTotalOverpaymentAllowance(
					policy,
					mortgageAmountNum,
					monthlyPayment,
					result.comparisonPeriodYears,
					yearlyBalances,
				);

				return {
					policy,
					totalAllowance,
				};
			},
		);

		const shareOptions: CashbackOptionShareState[] = options.map((opt) => ({
			label: opt.label,
			rate: opt.rate,
			rateInputMode: opt.rateInputMode,
			cashbackType: opt.cashbackType,
			cashbackValue: opt.cashbackValue,
			cashbackCap: opt.cashbackCap,
			overpaymentPolicyId: opt.overpaymentPolicyId,
		}));

		showCashbackResult({
			result,
			mortgageAmount: mortgageAmountNum,
			mortgageTermMonths: Number.parseInt(mortgageTerm, 10),
			shareState: {
				type: "cb",
				mortgageAmount,
				mortgageTerm,
				fixedPeriod,
				options: shareOptions,
			},
			overpaymentAllowances,
		});
	}, [
		isFormComplete,
		options,
		mortgageAmountNum,
		mortgageTerm,
		mortgageAmount,
		fixedPeriod,
		overpaymentPolicies,
	]);

	// Auto-calculate when loaded from shared URL
	useEffect(() => {
		if (!shouldAutoCalculate || !isFormComplete) return;

		// If any option has an overpayment policy, wait for policies to load
		const needsPolicies = options.some((opt) => opt.overpaymentPolicyId);
		if (needsPolicies && overpaymentPolicies.length === 0) return;

		calculate();
		setShouldAutoCalculate(false);
	}, [
		shouldAutoCalculate,
		isFormComplete,
		calculate,
		options,
		overpaymentPolicies,
	]);

	return (
		<Card>
			<CardContent>
				<div className="mb-6">
					<CardTitle className="text-lg mb-1">
						Compare Cashback Options
					</CardTitle>
					<CardDescription>
						Compare mortgages with different rates and cashback offers to find
						the cheapest option over time.
					</CardDescription>
				</div>

				<div className="space-y-6">
					{/* Shared Mortgage Details */}
					<div className="grid gap-4 sm:grid-cols-3">
						<div className="space-y-2">
							<Label htmlFor="mortgageAmount">Mortgage Amount</Label>
							<Input
								id="mortgageAmount"
								type="text"
								inputMode="numeric"
								placeholder="€300,000"
								value={formatCurrencyInput(mortgageAmount)}
								onChange={(e) =>
									setMortgageAmount(e.target.value.replace(/[^0-9]/g, ""))
								}
							/>
						</div>
						<MortgageTermSelector
							value={mortgageTerm}
							onChange={setMortgageTerm}
							label="Mortgage Term"
						/>
						<div className="space-y-2">
							<Label htmlFor="fixedPeriod">Fixed Period</Label>
							<Select value={fixedPeriod} onValueChange={setFixedPeriod}>
								<SelectTrigger id="fixedPeriod" className="w-full">
									<SelectValue placeholder="Select fixed period" />
								</SelectTrigger>
								<SelectContent>
									{FIXED_PERIOD_OPTIONS.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Options */}
					<div className="space-y-4">
						{options.map((option, index) => (
							<OptionCard
								key={option.id}
								index={index}
								option={option}
								mortgageAmount={mortgageAmountNum}
								canRemove={options.length > MIN_OPTIONS}
								overpaymentPolicies={overpaymentPolicies}
								onUpdate={(updates) => updateOption(index, updates)}
								onRemove={() => removeOption(index)}
								onRateSelect={(rate, lenderName) =>
									handleRateSelect(index, rate, lenderName)
								}
							/>
						))}
					</div>

					{/* Add Option Button */}
					{options.length < MAX_OPTIONS && (
						<Button
							variant="outline"
							onClick={addOption}
							className="w-full gap-2"
						>
							<Plus className="h-4 w-4" />
							Add Option
						</Button>
					)}

					{/* Calculate Button */}
					<Button
						onClick={calculate}
						disabled={!isFormComplete}
						className="w-full"
						size="lg"
					>
						Compare Options
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

interface OptionCardProps {
	index: number;
	option: CashbackOptionFormState;
	mortgageAmount: number;
	canRemove: boolean;
	overpaymentPolicies: OverpaymentPolicy[];
	onUpdate: (updates: Partial<CashbackOptionFormState>) => void;
	onRemove: () => void;
	onRateSelect: (rate: MortgageRate, lenderName: string) => void;
}

function OptionCard({
	index,
	option,
	mortgageAmount,
	canRemove,
	overpaymentPolicies,
	onUpdate,
	onRemove,
	onRateSelect,
}: OptionCardProps) {
	// Calculate actual cashback for display
	const cashbackValue = Number.parseFloat(option.cashbackValue) || 0;
	const cashbackCap = option.cashbackCap
		? parseCurrency(option.cashbackCap)
		: undefined;
	let actualCashback = 0;

	if (option.cashbackType === "flat") {
		actualCashback = cashbackValue;
	} else if (mortgageAmount > 0) {
		actualCashback = mortgageAmount * (cashbackValue / 100);
		if (cashbackCap !== undefined && actualCashback > cashbackCap) {
			actualCashback = cashbackCap;
		}
	}

	return (
		<div className="p-4 border rounded-lg bg-muted/30 space-y-4">
			<div className="flex items-center gap-2">
				<Input
					value={option.label}
					onChange={(e) => onUpdate({ label: e.target.value })}
					placeholder={`Option ${index + 1}`}
					className="flex-1 font-medium"
				/>
				{canRemove && (
					<Button
						variant="ghost"
						size="icon"
						onClick={onRemove}
						className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
					>
						<X className="h-4 w-4" />
						<span className="sr-only">Remove option</span>
					</Button>
				)}
			</div>

			{/* Rate Input */}
			<div className="space-y-3">
				<Label>Interest Rate</Label>
				<Tabs
					value={option.rateInputMode}
					onValueChange={(v) =>
						onUpdate({ rateInputMode: v as "picker" | "manual" })
					}
				>
					<TabsList>
						<TabsTrigger value="picker">Choose from rates</TabsTrigger>
						<TabsTrigger value="manual">Enter manually</TabsTrigger>
					</TabsList>
					<TabsContent value="picker" className="mt-3">
						<RatePicker
							value={option.rate}
							onChange={(rate) => onUpdate({ rate })}
							mode="picker"
							ltv={80}
							buyerType="ftb"
							berRating="C1"
							label=""
							withPerks
							paginate
							onRateSelect={(rate, lenderName) =>
								onRateSelect(rate, lenderName)
							}
						/>
					</TabsContent>
					<TabsContent value="manual" className="mt-3">
						<div className="flex items-center gap-2">
							<Input
								type="text"
								inputMode="decimal"
								value={option.rate}
								onChange={(e) => {
									const val = e.target.value;
									if (val === "" || /^\d*\.?\d*$/.test(val)) {
										onUpdate({ rate: val });
									}
								}}
								placeholder="e.g. 3.45"
								className="max-w-[120px]"
							/>
							<span className="text-muted-foreground">%</span>
						</div>
					</TabsContent>
				</Tabs>
			</div>

			{/* Cashback Input - always editable */}
			<div className="space-y-3">
				<Label>Cashback</Label>
				<div className="grid gap-3 sm:grid-cols-3">
					<div className="space-y-2">
						<ToggleGroup
							type="single"
							value={option.cashbackType}
							onValueChange={(v) => {
								if (v) onUpdate({ cashbackType: v as "percentage" | "flat" });
							}}
							variant="outline"
							size="sm"
						>
							<ToggleGroupItem value="percentage">
								Percentage (%)
							</ToggleGroupItem>
							<ToggleGroupItem value="flat">Flat Amount (€)</ToggleGroupItem>
						</ToggleGroup>
						<div className="flex items-center gap-2">
							<Input
								type="text"
								inputMode="decimal"
								value={option.cashbackValue}
								onChange={(e) => {
									const val = e.target.value;
									if (val === "" || /^\d*\.?\d*$/.test(val)) {
										onUpdate({ cashbackValue: val });
									}
								}}
								placeholder={
									option.cashbackType === "percentage" ? "2" : "5000"
								}
								className="max-w-[120px]"
							/>
							<span className="text-muted-foreground">
								{option.cashbackType === "percentage" ? "%" : "€"}
							</span>
						</div>
						{actualCashback > 0 && (
							<p className="text-xs text-muted-foreground">
								Cashback:{" "}
								<span className="text-green-600 font-medium">
									{formatCurrency(actualCashback)}
								</span>
							</p>
						)}
					</div>
					<div className="space-y-2">
						<Label className="text-sm text-muted-foreground">
							Cap (optional)
						</Label>
						<div className="flex items-center gap-2">
							<Input
								type="text"
								inputMode="numeric"
								value={formatCurrencyInput(option.cashbackCap)}
								onChange={(e) =>
									onUpdate({
										cashbackCap: e.target.value.replace(/[^0-9]/g, ""),
									})
								}
								placeholder="€10,000"
								className="max-w-[140px]"
								disabled={option.cashbackType === "flat"}
							/>
						</div>
					</div>
					<div className="space-y-2">
						<Label className="text-sm text-muted-foreground">
							Overpayment Policy
						</Label>
						<Select
							value={option.overpaymentPolicyId ?? "none"}
							onValueChange={(v) =>
								onUpdate({
									overpaymentPolicyId: v === "none" ? undefined : v,
								})
							}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Select policy" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">None / Breakage Fee</SelectItem>
								{overpaymentPolicies.map((policy) => (
									<SelectItem key={policy.id} value={policy.id}>
										{policy.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>
		</div>
	);
}
