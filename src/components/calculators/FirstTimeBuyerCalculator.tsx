import { ExternalLink } from "lucide-react";
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

interface CalculationResult {
	result: MortgageResult;
	totalIncome: number;
	hasSavingsShortfall: boolean;
	maxMortgageByIncome?: number;
	requiredDeposit?: number;
}

function ResultCard({
	data,
}: {
	data: CalculationResult;
}) {
	const { result, hasSavingsShortfall } = data;
	const stampDuty = calculateStampDuty(result.propertyValue);
	const legalFees = ESTIMATED_LEGAL_FEES;
	const totalFees = stampDuty + legalFees;
	const deposit = result.propertyValue - result.mortgageAmount;
	const totalCashRequired = deposit + totalFees;

	const cardStyles = hasSavingsShortfall
		? "bg-amber-500/10 border-amber-500/30"
		: "bg-primary/5 border-primary/20";

	return (
		<Card className={cardStyles}>
			<CardContent className="pt-6 pb-4">
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
					<div>
						<p className="text-sm text-muted-foreground">Maximum Property Value</p>
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
				<div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-border">
					<div>
						<p className="text-sm text-muted-foreground">Loan-to-Value (LTV)</p>
						<p
							className={`text-lg font-semibold ${result.ltv > 90 ? "text-destructive" : ""}`}
						>
							{result.ltv.toFixed(1)}%
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Loan-to-Income (LTI)</p>
						<p
							className={`text-lg font-semibold ${result.lti > FTB_LTI_LIMIT ? "text-destructive" : ""}`}
						>
							{result.lti.toFixed(1)}×
						</p>
					</div>
				</div>
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
						Legal fees typically range from €3,000 to €5,000 and include solicitor
						fees, searches, and registration.
					</p>
				</div>
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

const STORAGE_KEY = "ftb-calculator";

interface FormState {
	applicationType: "sole" | "joint";
	income1: string;
	income2: string;
	birthDate1: string | null;
	birthDate2: string | null;
	savings: string;
	berRating: string;
}

function loadFormState(): Partial<FormState> {
	if (typeof window === "undefined") return {};
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? JSON.parse(stored) : {};
	} catch {
		return {};
	}
}

function saveFormState(state: FormState): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch {
		// Ignore storage errors
	}
}

export function FirstTimeBuyerCalculator() {
	const [applicationType, setApplicationType] = useState<"sole" | "joint">("sole");
	const [income1, setIncome1] = useState("");
	const [income2, setIncome2] = useState("");
	const [birthDate1, setBirthDate1] = useState<Date | undefined>(undefined);
	const [birthDate2, setBirthDate2] = useState<Date | undefined>(undefined);
	const [savings, setSavings] = useState("");
	const [berRating, setBerRating] = useState("C1");
	const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
	const [showResultDialog, setShowResultDialog] = useState(false);

	// Load from localStorage on mount
	useEffect(() => {
		const saved = loadFormState();
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
		saveFormState({
			applicationType,
			income1,
			income2,
			birthDate1: birthDate1?.toISOString() ?? null,
			birthDate2: birthDate2?.toISOString() ?? null,
			savings,
			berRating,
		});
	}, [applicationType, income1, income2, birthDate1, birthDate2, savings, berRating]);

	// Calculate ages and validate
	const age1 = calculateAge(birthDate1);
	const age2 = applicationType === "joint" ? calculateAge(birthDate2) : null;

	const isAge1TooOld = age1 !== null && age1 > MAX_APPLICANT_AGE;
	const isAge2TooOld = age2 !== null && age2 > MAX_APPLICANT_AGE;
	const isAnyAgeTooOld = isAge1TooOld || isAge2TooOld;

	// Calculate max term based on oldest applicant (smallest max term)
	const maxTerm1 = calculateMaxTermByAge(birthDate1);
	const maxTerm2 = applicationType === "joint" ? calculateMaxTermByAge(birthDate2) : null;

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
		const requiredDepositForMaxMortgage = maxMortgageByIncome / 9;

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
			mortgageAmount = maxMortgageByIncome;
			propertyValue = mortgageAmount + totalSavings;
		}

		const ltv = (mortgageAmount / propertyValue) * 100;
		const lti = mortgageAmount / totalIncome;

		setCalculationResult({
			result: {
				propertyValue,
				mortgageAmount,
				mortgageTerm: maxMortgageTerm,
				berRating,
				ltv,
				lti,
			},
			totalIncome,
			hasSavingsShortfall,
			maxMortgageByIncome: hasSavingsShortfall ? maxMortgageByIncome : undefined,
			requiredDeposit: hasSavingsShortfall ? requiredDepositForMaxMortgage : undefined,
		});
		setShowResultDialog(true);
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardContent className="pt-6">
					<div className="mb-6">
						<CardTitle className="text-lg mb-1">How Much Can I Borrow?</CardTitle>
						<CardDescription>
							Enter your income and savings to see the maximum mortgage you could get
							as a first time buyer.{" "}
							<a
								href="https://www.centralbank.ie/consumer-hub/explainers/what-are-the-mortgage-measures"
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center hover:text-foreground"
								aria-label="Central Bank mortgage measures"
							>
								Central Bank rules
								<ExternalLink className="h-3 w-3 ml-1" />
							</a>
						</CardDescription>
					</div>

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
										<Label htmlFor="income2">Second Applicant's Gross Annual Salary</Label>
										<Input
											id="income2"
											type="text"
											inputMode="numeric"
											placeholder="€50,000"
											value={formatCurrencyInput(income2)}
											onChange={(e) => setIncome2(e.target.value.replace(/[^0-9]/g, ""))}
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
							considered.
						</p>

						<div className="space-y-2">
							<Label htmlFor="savings">Total Savings for Deposit</Label>
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
								id="berRating"
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
				</CardContent>
			</Card>

			<AlertDialog open={showResultDialog} onOpenChange={setShowResultDialog}>
				<AlertDialogContent className="sm:max-w-5xl">
					<AlertDialogHeader>
						<AlertDialogTitle>
							{calculationResult?.hasSavingsShortfall
								? "Mortgage Summary (Adjusted for Savings)"
								: "Your Mortgage Summary"}
						</AlertDialogTitle>
						{calculationResult?.hasSavingsShortfall && (
							<AlertDialogDescription>
								Your maximum mortgage based on income would be{" "}
								<strong>
									{formatCurrency(calculationResult.maxMortgageByIncome ?? 0)}
								</strong>
								, but you would need{" "}
								<strong>
									{formatCurrency(calculationResult.requiredDeposit ?? 0)}
								</strong>{" "}
								in savings for a 10% deposit. The figures below are adjusted
								based on your current savings.
							</AlertDialogDescription>
						)}
					</AlertDialogHeader>
					{calculationResult && <ResultCard data={calculationResult} />}
					<AlertDialogFooter>
						<AlertDialogCancel>Close</AlertDialogCancel>
						<AlertDialogAction>Compare Mortgage Rates</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
