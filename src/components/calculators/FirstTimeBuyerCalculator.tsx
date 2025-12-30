import { Calculator, ExternalLink, HelpCircle } from "lucide-react";
import { useEffect, useState } from "react";
import {
	calculateStampDuty,
	ESTIMATED_LEGAL_FEES,
	formatCurrency,
	formatCurrencyInput,
	parseCurrency,
} from "@/lib/utils";
import { BerSelector } from "../selectors/BerSelector";
import { DateOfBirthPicker } from "../selectors/DateOfBirthPicker";
import { MortgageTermSelector } from "../selectors/MortgageTermSelector";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

// Central Bank rules for First Time Buyers
const FTB_LTI_LIMIT = 4; // 4x income
const FTB_MAX_LTV = 0.9; // 90% LTV (10% deposit minimum)

interface MortgageResult {
	propertyValue: number;
	mortgageAmount: number;
	mortgageTerm: number;
	berRating: string;
	ltv: number;
	lti: number;
}

function ResultCard({
	result,
	issues = [],
	showLti = true,
	showFees = true,
	variant = "default",
}: {
	result: MortgageResult;
	issues?: string[];
	showLti?: boolean;
	showFees?: boolean;
	variant?: "default" | "warning" | "danger";
}) {
	const hasIssues = issues.length > 0;
	const stampDuty = calculateStampDuty(result.propertyValue);
	const legalFees = ESTIMATED_LEGAL_FEES;
	const totalFees = stampDuty + legalFees;
	const deposit = result.propertyValue - result.mortgageAmount;
	const totalCashRequired = deposit + totalFees;

	const cardStyles = {
		default: "bg-primary/5 border-primary/20",
		warning: "bg-amber-500/10 border-amber-500/30",
		danger: "bg-destructive/5 border-destructive/20",
	};

	// Use danger if there are issues, otherwise use the provided variant
	const effectiveVariant = hasIssues ? "danger" : variant;

	return (
		<Card className={cardStyles[effectiveVariant]}>
			<CardHeader className="pb-2 pt-4">
				<CardTitle className="text-lg">
					{hasIssues ? "Issues Found" : "Your Mortgage Summary"}
				</CardTitle>
			</CardHeader>
			<CardContent className="pb-4">
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
					<div>
						<p className="text-sm text-muted-foreground">Property Value</p>
						<p className="text-xl font-bold">
							{formatCurrency(result.propertyValue)}
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Mortgage Amount</p>
						<p className="text-xl font-bold text-primary">
							{formatCurrency(result.mortgageAmount)}
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Mortgage Term</p>
						<p className="text-xl font-bold">{result.mortgageTerm} years</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">BER Rating</p>
						<p className="text-xl font-bold">{result.berRating}</p>
					</div>
				</div>
				<div
					className={`grid gap-4 ${showLti ? "sm:grid-cols-2" : ""} pt-4 border-t border-border`}
				>
					<div>
						<p className="text-sm text-muted-foreground">Loan-to-Value (LTV)</p>
						<p
							className={`text-lg font-semibold ${result.ltv > 90 ? "text-destructive" : ""}`}
						>
							{result.ltv.toFixed(1)}%
						</p>
					</div>
					{showLti && (
						<div>
							<p className="text-sm text-muted-foreground">
								Loan-to-Income (LTI)
							</p>
							<p
								className={`text-lg font-semibold ${result.lti > FTB_LTI_LIMIT ? "text-destructive" : ""}`}
							>
								{result.lti.toFixed(1)}×
							</p>
						</div>
					)}
				</div>
				{showFees && (
					<div className="pt-4 border-t border-border mt-4">
						<p className="text-sm font-medium mb-2">Cash Required</p>
						<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
							<div>
								<p className="text-muted-foreground">
									Deposit ({(100 - result.ltv).toFixed(0)}%)
								</p>
								<p className="font-semibold">{formatCurrency(deposit)}</p>
							</div>
							<div>
								<p className="text-muted-foreground">Stamp Duty</p>
								<p className="font-semibold">{formatCurrency(stampDuty)}</p>
							</div>
							<div>
								<p className="text-muted-foreground">Legal Fees (est.)</p>
								<p className="font-semibold">{formatCurrency(legalFees)}</p>
							</div>
							<div>
								<p className="text-muted-foreground">Total Cash Required</p>
								<p className="font-semibold text-primary">
									{formatCurrency(totalCashRequired)}
								</p>
							</div>
						</div>
						<p className="text-xs text-muted-foreground mt-2">
							Legal fees typically range from €3,000 to €5,000 and include
							solicitor fees, searches, and registration.
						</p>
					</div>
				)}
				{issues.length > 0 && (
					<div className="space-y-2 pt-4 border-t border-border mt-4">
						{issues.map((issue, i) => (
							<p key={i} className="text-sm text-destructive">
								{issue}
							</p>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

const DEFAULT_MAX_AGE = 68;
const MAX_MORTGAGE_TERM = 35;
const MAX_APPLICANT_AGE = 63;

function calculateAge(birthDate: Date | undefined): number | null {
	if (!birthDate) return null;
	const today = new Date();
	return today.getFullYear() - birthDate.getFullYear();
}

function calculateMaxTermByAge(birthDate: Date | undefined): number | null {
	const age = calculateAge(birthDate);
	if (age === null) return null;
	const maxTermByAge = DEFAULT_MAX_AGE - age;
	const maxTerm = Math.min(maxTermByAge, MAX_MORTGAGE_TERM);
	return maxTerm > 0 ? maxTerm : 0;
}

const GUIDED_STORAGE_KEY = "ftb-calculator-guided";

interface GuidedFormState {
	applicationType: "sole" | "joint";
	income1: string;
	income2: string;
	birthDate1: string | null;
	birthDate2: string | null;
	savings: string;
	berRating: string;
}

function loadGuidedFormState(): Partial<GuidedFormState> {
	if (typeof window === "undefined") return {};
	try {
		const stored = localStorage.getItem(GUIDED_STORAGE_KEY);
		return stored ? JSON.parse(stored) : {};
	} catch {
		return {};
	}
}

function saveGuidedFormState(state: GuidedFormState): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(GUIDED_STORAGE_KEY, JSON.stringify(state));
	} catch {
		// Ignore storage errors
	}
}

interface CalculationResult {
	result: MortgageResult;
	issues: string[];
	source: "guided" | "direct";
	// Only for guided calculator
	totalIncome?: number;
	hasSavingsShortfall?: boolean;
	maxMortgageByIncome?: number;
	requiredDeposit?: number;
}

interface GuidedCalculatorProps {
	onCalculate: (data: CalculationResult) => void;
}

function GuidedCalculator({ onCalculate }: GuidedCalculatorProps) {
	const [applicationType, setApplicationType] = useState<"sole" | "joint">(
		"sole",
	);
	const [income1, setIncome1] = useState("");
	const [income2, setIncome2] = useState("");
	const [birthDate1, setBirthDate1] = useState<Date | undefined>(undefined);
	const [birthDate2, setBirthDate2] = useState<Date | undefined>(undefined);
	const [savings, setSavings] = useState("");
	const [berRating, setBerRating] = useState("C1");

	// Load from localStorage on mount
	useEffect(() => {
		const saved = loadGuidedFormState();
		if (saved.applicationType) setApplicationType(saved.applicationType);
		if (saved.income1) setIncome1(saved.income1);
		if (saved.income2) setIncome2(saved.income2);
		if (saved.birthDate1) setBirthDate1(new Date(saved.birthDate1));
		if (saved.birthDate2) setBirthDate2(new Date(saved.birthDate2));
		if (saved.savings) setSavings(saved.savings);
		if (saved.berRating) setBerRating(saved.berRating);
	}, []);

	// Save to localStorage when form changes
	useEffect(() => {
		saveGuidedFormState({
			applicationType,
			income1,
			income2,
			birthDate1: birthDate1?.toISOString() ?? null,
			birthDate2: birthDate2?.toISOString() ?? null,
			savings,
			berRating,
		});
	}, [
		applicationType,
		income1,
		income2,
		birthDate1,
		birthDate2,
		savings,
		berRating,
	]);

	// Calculate ages and validate
	const age1 = calculateAge(birthDate1);
	const age2 = applicationType === "joint" ? calculateAge(birthDate2) : null;

	const isAge1TooOld = age1 !== null && age1 > MAX_APPLICANT_AGE;
	const isAge2TooOld = age2 !== null && age2 > MAX_APPLICANT_AGE;
	const isAnyAgeTooOld = isAge1TooOld || isAge2TooOld;

	// Calculate max term based on oldest applicant (smallest max term)
	const maxTerm1 = calculateMaxTermByAge(birthDate1);
	const maxTerm2 =
		applicationType === "joint" ? calculateMaxTermByAge(birthDate2) : null;

	let maxMortgageTerm: number | null = null;
	if (maxTerm1 !== null && maxTerm2 !== null) {
		maxMortgageTerm = Math.min(maxTerm1, maxTerm2);
	} else if (maxTerm1 !== null) {
		maxMortgageTerm = maxTerm1;
	} else if (maxTerm2 !== null) {
		maxMortgageTerm = maxTerm2;
	}

	const calculate = () => {
		const totalIncome =
			parseCurrency(income1) +
			(applicationType === "joint" ? parseCurrency(income2) : 0);
		const totalSavings = parseCurrency(savings);

		if (totalIncome <= 0 || maxMortgageTerm === null) return;

		// Maximum mortgage based on 4x income (LTI rule)
		const maxMortgageByIncome = totalIncome * FTB_LTI_LIMIT;
		// Minimum deposit required for max mortgage (10% of property value)
		const requiredDepositForMaxMortgage = maxMortgageByIncome / 9; // property * 0.1 where property = mortgage / 0.9

		// Check if savings are sufficient for maximum mortgage
		const hasSavingsShortfall = totalSavings < requiredDepositForMaxMortgage;

		let propertyValue: number;
		let mortgageAmount: number;

		if (hasSavingsShortfall) {
			// Savings constrained: max property based on 10% deposit
			propertyValue = totalSavings / (1 - FTB_MAX_LTV);
			mortgageAmount = propertyValue * FTB_MAX_LTV;
		} else {
			// Income constrained: use max mortgage + all savings as deposit
			// This maximizes property value while staying within 4x income
			mortgageAmount = maxMortgageByIncome;
			propertyValue = mortgageAmount + totalSavings;
		}

		const ltv = (mortgageAmount / propertyValue) * 100;
		const lti = mortgageAmount / totalIncome;

		onCalculate({
			result: {
				propertyValue,
				mortgageAmount,
				mortgageTerm: maxMortgageTerm,
				berRating,
				ltv,
				lti,
			},
			issues: [],
			source: "guided",
			totalIncome,
			hasSavingsShortfall,
			maxMortgageByIncome: hasSavingsShortfall ? maxMortgageByIncome : undefined,
			requiredDeposit: hasSavingsShortfall ? requiredDepositForMaxMortgage : undefined,
		});
	};

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<Label>Application Type</Label>
				<div className="flex gap-4">
					<Button
						type="button"
						variant={applicationType === "sole" ? "default" : "outline"}
						onClick={() => setApplicationType("sole")}
						className="flex-1"
					>
						Sole Applicant
					</Button>
					<Button
						type="button"
						variant={applicationType === "joint" ? "default" : "outline"}
						onClick={() => setApplicationType("joint")}
						className="flex-1"
					>
						Joint Applicants
					</Button>
				</div>
			</div>

			<div
				className={`grid gap-4 ${applicationType === "joint" ? "sm:grid-cols-2" : ""}`}
			>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="income1">
							{applicationType === "joint"
								? "Your Gross Annual Salary"
								: "Gross Annual Salary"}
						</Label>
						<Input
							id="income1"
							type="text"
							inputMode="numeric"
							placeholder="€50,000"
							value={formatCurrencyInput(income1)}
							onChange={(e) => setIncome1(e.target.value.replace(/[^0-9]/g, ""))}
						/>
					</div>
					<div>
						<DateOfBirthPicker
							value={birthDate1}
							onChange={setBirthDate1}
							id="birthDate1"
							label={
								applicationType === "joint"
									? "Your Date of Birth"
									: "Date of Birth"
							}
						/>
						{age1 !== null && (
							<p
								className={`text-xs mt-1 ${isAge1TooOld ? "text-destructive" : "text-muted-foreground"}`}
							>
								{age1} years old
							</p>
						)}
					</div>
				</div>
				{applicationType === "joint" && (
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="income2">
								Second Applicant's Gross Annual Salary
							</Label>
							<Input
								id="income2"
								type="text"
								inputMode="numeric"
								placeholder="€50,000"
								value={formatCurrencyInput(income2)}
								onChange={(e) =>
									setIncome2(e.target.value.replace(/[^0-9]/g, ""))
								}
							/>
						</div>
						<div>
							<DateOfBirthPicker
								value={birthDate2}
								onChange={setBirthDate2}
								id="birthDate2"
								label="Second Applicant's Date of Birth"
							/>
							{age2 !== null && (
								<p
									className={`text-xs mt-1 ${isAge2TooOld ? "text-destructive" : "text-muted-foreground"}`}
								>
									{age2} years old
								</p>
							)}
						</div>
					</div>
				)}
			</div>
			<p className="text-xs text-muted-foreground">
				Some lenders may take into account overtime, bonuses, benefit in kind,
				and other income. As a rule of thumb, only guaranteed salary is
				considered. You can adjust the mortgage amount later if you qualify for
				more.
			</p>

			<div className="space-y-2">
				<Label htmlFor="savings">Total Savings for Purchase</Label>
				<Input
					id="savings"
					type="text"
					inputMode="numeric"
					placeholder="€30,000"
					value={formatCurrencyInput(savings)}
					onChange={(e) => setSavings(e.target.value.replace(/[^0-9]/g, ""))}
				/>
				<p className="text-xs text-muted-foreground">
					Include any gifts or Help to Buy funds. Exclude Stamp Duty and legal
					fees.
				</p>
			</div>
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="maxMortgageTerm">Maximum Mortgage Term</Label>
					<Select value={maxMortgageTerm?.toString() ?? ""} disabled>
						<SelectTrigger id="maxMortgageTerm">
							<SelectValue placeholder="Select date of birth first" />
						</SelectTrigger>
						<SelectContent>
							{maxMortgageTerm !== null && (
								<SelectItem value={maxMortgageTerm.toString()}>
									{maxMortgageTerm} years
								</SelectItem>
							)}
						</SelectContent>
					</Select>
					<p className="text-xs text-muted-foreground">
						Based on age {DEFAULT_MAX_AGE} at end of term. Some lenders may
						offer longer.
					</p>
				</div>
				<BerSelector
					value={berRating}
					onChange={setBerRating}
					id="berRatingGuided"
					label="Expected BER Rating"
				/>
			</div>
			{isAnyAgeTooOld && (
				<p className="text-sm text-destructive">
					Applicants must be {MAX_APPLICANT_AGE} years old or younger to qualify
					for a first time buyer mortgage.
				</p>
			)}
			<Button
				onClick={calculate}
				disabled={isAnyAgeTooOld}
				className="w-full sm:w-auto"
			>
				Calculate
			</Button>
		</div>
	);
}

const DIRECT_STORAGE_KEY = "ftb-calculator-direct";

interface DirectFormState {
	propertyValue: string;
	deposit: string;
	mortgageTerm: string;
	berRating: string;
}

function loadDirectFormState(): Partial<DirectFormState> {
	if (typeof window === "undefined") return {};
	try {
		const stored = localStorage.getItem(DIRECT_STORAGE_KEY);
		return stored ? JSON.parse(stored) : {};
	} catch {
		return {};
	}
}

function saveDirectFormState(state: DirectFormState): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(DIRECT_STORAGE_KEY, JSON.stringify(state));
	} catch {
		// Ignore storage errors
	}
}

interface DirectCalculatorProps {
	onCalculate: (data: CalculationResult) => void;
	prefillData?: {
		propertyValue: string;
		deposit: string;
		mortgageTerm: string;
		berRating: string;
	} | null;
	onPrefillApplied?: () => void;
}

function DirectCalculator({
	onCalculate,
	prefillData,
	onPrefillApplied,
}: DirectCalculatorProps) {
	const [propertyValue, setPropertyValue] = useState("");
	const [deposit, setDeposit] = useState("");
	const [mortgageTerm, setMortgageTerm] = useState("30");
	const [berRating, setBerRating] = useState("C1");

	// Load from localStorage on mount
	useEffect(() => {
		const saved = loadDirectFormState();
		if (saved.propertyValue) setPropertyValue(saved.propertyValue);
		if (saved.deposit) setDeposit(saved.deposit);
		if (saved.mortgageTerm) setMortgageTerm(saved.mortgageTerm);
		if (saved.berRating) setBerRating(saved.berRating);
	}, []);

	// Apply prefill data when provided
	useEffect(() => {
		if (prefillData) {
			setPropertyValue(prefillData.propertyValue);
			setDeposit(prefillData.deposit);
			setMortgageTerm(prefillData.mortgageTerm);
			setBerRating(prefillData.berRating);
			onPrefillApplied?.();
		}
	}, [prefillData, onPrefillApplied]);

	// Save to localStorage when form changes
	useEffect(() => {
		saveDirectFormState({
			propertyValue,
			deposit,
			mortgageTerm,
			berRating,
		});
	}, [propertyValue, deposit, mortgageTerm, berRating]);

	const calculate = () => {
		const property = parseCurrency(propertyValue);
		const dep = parseCurrency(deposit);

		if (property <= 0) return;

		const mortgageAmount = property - dep;
		const ltv = (mortgageAmount / property) * 100;

		const issues: string[] = [];
		if (ltv > 90) {
			issues.push(
				`LTV of ${ltv.toFixed(1)}% exceeds the default 90% limit. Some lenders may offer higher LTV.`,
			);
		}

		onCalculate({
			result: {
				propertyValue: property,
				mortgageAmount,
				mortgageTerm: Number.parseInt(mortgageTerm),
				berRating,
				ltv,
				lti: 0,
			},
			issues,
			source: "direct",
		});
	};

	return (
		<div className="space-y-6">
			<p className="text-sm text-muted-foreground">
				Central Bank rules set a default of 4× income and 10% minimum deposit
				for first time buyers
				<a
					href="https://www.centralbank.ie/consumer-hub/explainers/what-are-the-mortgage-measures"
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center hover:text-foreground"
					aria-label="Central Bank mortgage measures"
				>
					<ExternalLink className="h-3 w-3 ml-1" />
				</a>
				, but some lenders may offer different terms. Enter your specific
				numbers below.
			</p>
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="propertyValue">Property Value</Label>
					<Input
						id="propertyValue"
						type="text"
						inputMode="numeric"
						placeholder="€350,000"
						value={formatCurrencyInput(propertyValue)}
						onChange={(e) =>
							setPropertyValue(e.target.value.replace(/[^0-9]/g, ""))
						}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="deposit">Your Deposit</Label>
					<Input
						id="deposit"
						type="text"
						inputMode="numeric"
						placeholder="€35,000"
						value={formatCurrencyInput(deposit)}
						onChange={(e) => setDeposit(e.target.value.replace(/[^0-9]/g, ""))}
					/>
				</div>
			</div>
			<div className="grid gap-4 sm:grid-cols-2">
				<MortgageTermSelector
					value={mortgageTerm}
					onChange={setMortgageTerm}
					id="mortgageTermDirect"
				/>
				<BerSelector
					value={berRating}
					onChange={setBerRating}
					id="berRatingDirect"
				/>
			</div>
			<Button onClick={calculate} className="w-full sm:w-auto">
				Calculate
			</Button>
		</div>
	);
}

const TAB_VALUES = ["guided", "direct"] as const;
type TabValue = (typeof TAB_VALUES)[number];

function getHashValue(): TabValue {
	if (typeof window === "undefined") return "guided";
	const hash = window.location.hash.slice(1);
	return TAB_VALUES.includes(hash as TabValue) ? (hash as TabValue) : "guided";
}

export function FirstTimeBuyerCalculator() {
	const [activeTab, setActiveTab] = useState<TabValue>("guided");
	const [showResultDialog, setShowResultDialog] = useState(false);
	const [calculationResult, setCalculationResult] =
		useState<CalculationResult | null>(null);
	const [directPrefillData, setDirectPrefillData] = useState<{
		propertyValue: string;
		deposit: string;
		mortgageTerm: string;
		berRating: string;
	} | null>(null);

	useEffect(() => {
		setActiveTab(getHashValue());

		const handleHashChange = () => setActiveTab(getHashValue());
		window.addEventListener("hashchange", handleHashChange);
		return () => window.removeEventListener("hashchange", handleHashChange);
	}, []);

	const handleTabChange = (value: string) => {
		const tabValue = value as TabValue;
		setActiveTab(tabValue);
		window.history.replaceState(null, "", `#${tabValue}`);
	};

	const handleCalculate = (data: CalculationResult) => {
		setCalculationResult(data);
		setShowResultDialog(true);
	};

	const handleProceedToDirectTab = () => {
		if (!calculationResult) return;

		// Prepare prefill data for DirectCalculator
		const actualDeposit =
			calculationResult.result.propertyValue -
			calculationResult.result.mortgageAmount;
		setDirectPrefillData({
			propertyValue: Math.round(calculationResult.result.propertyValue).toString(),
			deposit: Math.round(actualDeposit).toString(),
			mortgageTerm: calculationResult.result.mortgageTerm.toString(),
			berRating: calculationResult.result.berRating,
		});

		// Switch to direct tab
		setActiveTab("direct");
		window.history.replaceState(null, "", "#direct");
		setShowResultDialog(false);
	};

	const handleClearPrefill = () => {
		setDirectPrefillData(null);
	};

	return (
		<>
			<Tabs
				value={activeTab}
				onValueChange={handleTabChange}
				className="w-full"
			>
				<TabsList className="grid w-full grid-cols-2 mb-6">
					<TabsTrigger value="guided" className="gap-2">
						<HelpCircle className="h-4 w-4" />
						<span>How Much Can I Borrow?</span>
					</TabsTrigger>
					<TabsTrigger value="direct" className="gap-2">
						<Calculator className="h-4 w-4" />
						<span>I Know My Numbers</span>
					</TabsTrigger>
				</TabsList>
				<Card>
					<CardContent className="pt-6">
						<TabsContent value="guided" className="mt-0">
							<div className="mb-6">
								<CardTitle className="text-lg mb-1">
									How Much Can I Borrow?
								</CardTitle>
								<CardDescription>
									Enter your income and savings to see the maximum mortgage you
									could get.
								</CardDescription>
							</div>
							<GuidedCalculator onCalculate={handleCalculate} />
						</TabsContent>
						<TabsContent value="direct" className="mt-0">
							<div className="mb-6">
								<CardTitle className="text-lg mb-1">
									Check Your Numbers
								</CardTitle>
								<CardDescription>
									Already have a property in mind? Check if it meets Central
									Bank lending rules.
								</CardDescription>
							</div>
							<DirectCalculator
								onCalculate={handleCalculate}
								prefillData={directPrefillData}
								onPrefillApplied={handleClearPrefill}
							/>
						</TabsContent>
					</CardContent>
				</Card>
			</Tabs>

			<AlertDialog
				open={showResultDialog}
				onOpenChange={setShowResultDialog}
			>
				<AlertDialogContent className="sm:max-w-5xl">
					<AlertDialogHeader>
						<AlertDialogTitle>
							{calculationResult?.hasSavingsShortfall
								? "Mortgage Summary (Adjusted for Savings)"
								: "Your Mortgage Summary"}
						</AlertDialogTitle>
						{calculationResult?.hasSavingsShortfall && (
							<AlertDialogDescription asChild>
								<div className="space-y-2">
									<p>
										Your maximum mortgage based on income would be{" "}
										<strong>
											{formatCurrency(calculationResult.maxMortgageByIncome ?? 0)}
										</strong>
										, but you would need{" "}
										<strong>
											{formatCurrency(calculationResult.requiredDeposit ?? 0)}
										</strong>{" "}
										in savings for a 10% deposit.
									</p>
									<p>
										The figures below are adjusted based on your current savings.
									</p>
								</div>
							</AlertDialogDescription>
						)}
					</AlertDialogHeader>
					{calculationResult && (
						<ResultCard
							result={calculationResult.result}
							issues={calculationResult.issues}
							showLti={calculationResult.source === "guided"}
							showFees={true}
							variant={
								calculationResult.source === "guided" &&
								calculationResult.hasSavingsShortfall
									? "warning"
									: "default"
							}
						/>
					)}
					<AlertDialogFooter>
						<AlertDialogCancel>Close</AlertDialogCancel>
						<AlertDialogAction>Compare Mortgage Rates</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
