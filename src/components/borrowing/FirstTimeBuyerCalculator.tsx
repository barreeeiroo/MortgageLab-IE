import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import {
	AGE_LIMITS,
	CENTRAL_BANK_MORTGAGE_MEASURES_URL,
	DEFAULT_BER,
	LENDER_ALLOWANCES,
	LTI_LIMITS,
	LTV_LIMITS,
} from "@/lib/constants";
import { loadFtbForm, saveFtbForm, saveRatesForm } from "@/lib/storage";
import {
	calculateJointMaxTerm,
	formatCurrency,
	formatCurrencyInput,
	getPath,
	isApplicantTooOld,
	parseCurrency,
} from "@/lib/utils";
import { BerSelector } from "../selectors/BerSelector";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogBody,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ApplicantInputs } from "./ApplicantInputs";
import { type MortgageResult, MortgageResultCard } from "./MortgageResultCard";
import { MortgageTermDisplay } from "./MortgageTermDisplay";

const FTB_LTI_LIMIT = LTI_LIMITS.FTB;
const FTB_MAX_LTV = LTV_LIMITS.FTB / 100;

interface CalculationResult {
	result: MortgageResult;
	totalIncome: number;
	hasSavingsShortfall: boolean;
	maxMortgageByIncome?: number;
	requiredDeposit?: number;
}

export function FirstTimeBuyerCalculator() {
	const [applicationType, setApplicationType] = useState<"sole" | "joint">(
		"sole",
	);
	const [income1, setIncome1] = useState("");
	const [income2, setIncome2] = useState("");
	const [birthDate1, setBirthDate1] = useState<Date | undefined>(undefined);
	const [birthDate2, setBirthDate2] = useState<Date | undefined>(undefined);
	const [savings, setSavings] = useState("");
	const [berRating, setBerRating] = useState(DEFAULT_BER);
	const [calculationResult, setCalculationResult] =
		useState<CalculationResult | null>(null);
	const [showResultDialog, setShowResultDialog] = useState(false);

	// Load from localStorage on mount
	useEffect(() => {
		const saved = loadFtbForm();
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
		saveFtbForm({
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

	const isJoint = applicationType === "joint";
	const maxMortgageTerm = calculateJointMaxTerm(
		birthDate1,
		birthDate2,
		isJoint,
	);
	const isAnyAgeTooOld = isApplicantTooOld(birthDate1, birthDate2, isJoint);

	// Validate required fields
	const hasIncome1 = parseCurrency(income1) > 0;
	const hasIncome2 = parseCurrency(income2) > 0;
	const hasSavings = parseCurrency(savings) > 0;
	const isFormComplete =
		hasIncome1 &&
		birthDate1 !== undefined &&
		hasSavings &&
		(!isJoint || (hasIncome2 && birthDate2 !== undefined));

	const calculate = () => {
		const totalIncome =
			parseCurrency(income1) + (isJoint ? parseCurrency(income2) : 0);
		const totalSavings = parseCurrency(savings);

		if (totalIncome <= 0 || maxMortgageTerm === null) return;

		// Maximum mortgage based on LTI rule
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
			maxMortgageByIncome: hasSavingsShortfall
				? maxMortgageByIncome
				: undefined,
			requiredDeposit: hasSavingsShortfall
				? requiredDepositForMaxMortgage
				: undefined,
		});
		setShowResultDialog(true);
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardContent>
					<div className="mb-6">
						<CardTitle className="text-lg mb-1">
							How Much Can I Borrow?
						</CardTitle>
						<CardDescription>
							Enter your income and savings to see the maximum mortgage you
							could get as a first time buyer.
						</CardDescription>
					</div>

					<div className="space-y-6">
						<ApplicantInputs
							applicationType={applicationType}
							onApplicationTypeChange={setApplicationType}
							income1={income1}
							onIncome1Change={setIncome1}
							income2={income2}
							onIncome2Change={setIncome2}
							birthDate1={birthDate1}
							onBirthDate1Change={setBirthDate1}
							birthDate2={birthDate2}
							onBirthDate2Change={setBirthDate2}
							incomeNote={
								<>
									<a
										href={CENTRAL_BANK_MORTGAGE_MEASURES_URL}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center hover:text-foreground"
									>
										Central Bank
										<ExternalLink className="h-3 w-3 ml-0.5" />
									</a>{" "}
									allows {FTB_LTI_LIMIT}× income for first-time buyers. Lenders
									can exceed this for {LENDER_ALLOWANCES.FTB}% of their lending.
									Some may include overtime, bonuses, or other income.
								</>
							}
						/>

						<div className="space-y-2">
							<Label htmlFor="savings">Total Savings for Deposit</Label>
							<Input
								id="savings"
								type="text"
								inputMode="numeric"
								placeholder="€30,000"
								value={formatCurrencyInput(savings)}
								onChange={(e) =>
									setSavings(e.target.value.replace(/[^0-9]/g, ""))
								}
							/>
							<p className="text-xs text-muted-foreground">
								Include any gifts or Help to Buy funds. Exclude Stamp Duty and
								legal fees.
							</p>
						</div>

						<div className="grid gap-4 sm:grid-cols-2">
							<MortgageTermDisplay maxMortgageTerm={maxMortgageTerm} />
							<BerSelector
								value={berRating}
								onChange={setBerRating}
								id="berRating"
								label="Expected BER Rating"
							/>
						</div>

						{isAnyAgeTooOld && (
							<p className="text-sm text-destructive">
								Applicants must be {AGE_LIMITS.MAX_APPLICANT_AGE} years old or
								younger to qualify for a first time buyer mortgage.
							</p>
						)}

						<Button
							onClick={calculate}
							disabled={!isFormComplete || isAnyAgeTooOld}
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
					<AlertDialogBody>
						{calculationResult && (
							<MortgageResultCard
								result={calculationResult.result}
								maxLtv={LTV_LIMITS.FTB}
								maxLti={FTB_LTI_LIMIT}
								isConstrained={calculationResult.hasSavingsShortfall}
							/>
						)}
					</AlertDialogBody>
					<AlertDialogFooter>
						<AlertDialogCancel>Close</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (!calculationResult) return;
								const { result } = calculationResult;
								saveRatesForm({
									mode: "first-mortgage",
									propertyValue: Math.round(result.propertyValue).toString(),
									mortgageAmount: Math.round(result.mortgageAmount).toString(),
									monthlyRepayment: "",
									mortgageTerm: result.mortgageTerm.toString(),
									berRating: result.berRating,
									buyerType: "ftb",
								});
								window.location.href = getPath("/rates");
							}}
						>
							Compare Mortgage Rates
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
