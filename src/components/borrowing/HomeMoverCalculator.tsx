import { ExternalLink } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	AGE_LIMITS,
	CENTRAL_BANK_MORTGAGE_MEASURES_URL,
	DEFAULT_BER,
	LENDER_ALLOWANCES,
	LTI_LIMITS,
	LTV_LIMITS,
} from "@/lib/constants";
import {
	clearBorrowingShareParam,
	copyBorrowingShareUrl,
	hasBorrowingShareParam,
	type MoverShareState,
	parseBorrowingShareState,
} from "@/lib/share";
import { loadMoverForm, saveMoverForm, saveRatesForm } from "@/lib/storage";
import {
	calculateJointMaxTerm,
	formatCurrency,
	formatCurrencyInput,
	getPath,
	isApplicantTooOld,
	parseCurrency,
} from "@/lib/utils";
import { ShareButton } from "../ShareButton";
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

const MOVER_LTI_LIMIT = LTI_LIMITS.MOVER;
const MOVER_MAX_LTV = LTV_LIMITS.MOVER / 100;

interface CalculationResult {
	result: MortgageResult;
	totalIncome: number;
	hasDepositShortfall: boolean;
	maxMortgageByIncome?: number;
	requiredDeposit?: number;
}

export function HomeMoverCalculator() {
	const [applicationType, setApplicationType] = useState<"sole" | "joint">(
		"sole",
	);
	const [income1, setIncome1] = useState("");
	const [income2, setIncome2] = useState("");
	const [birthDate1, setBirthDate1] = useState<Date | undefined>(undefined);
	const [birthDate2, setBirthDate2] = useState<Date | undefined>(undefined);
	const [currentPropertyValue, setCurrentPropertyValue] = useState("");
	const [outstandingMortgage, setOutstandingMortgage] = useState("");
	const [additionalSavings, setAdditionalSavings] = useState("");
	const [berRating, setBerRating] = useState(DEFAULT_BER);
	const [calculationResult, setCalculationResult] =
		useState<CalculationResult | null>(null);
	const [showResultDialog, setShowResultDialog] = useState(false);
	const [shouldAutoCalculate, setShouldAutoCalculate] = useState(false);

	// Load from shared URL or localStorage on mount
	useEffect(() => {
		// Check for shared URL first
		if (hasBorrowingShareParam()) {
			const shared = parseBorrowingShareState();
			if (shared && shared.type === "mover") {
				setApplicationType(shared.applicationType);
				setIncome1(shared.income1);
				setIncome2(shared.income2);
				setBirthDate1(
					shared.birthDate1 ? new Date(shared.birthDate1) : undefined,
				);
				setBirthDate2(
					shared.birthDate2 ? new Date(shared.birthDate2) : undefined,
				);
				setCurrentPropertyValue(shared.currentPropertyValue);
				setOutstandingMortgage(shared.outstandingMortgage);
				setAdditionalSavings(shared.additionalSavings);
				setBerRating(shared.berRating);
				clearBorrowingShareParam();
				setShouldAutoCalculate(true);
				return;
			}
		}

		// Fall back to localStorage
		const saved = loadMoverForm();
		if (saved.applicationType) setApplicationType(saved.applicationType);
		if (saved.income1) setIncome1(saved.income1);
		if (saved.income2) setIncome2(saved.income2);
		if (saved.birthDate1) setBirthDate1(new Date(saved.birthDate1));
		if (saved.birthDate2) setBirthDate2(new Date(saved.birthDate2));
		if (saved.currentPropertyValue)
			setCurrentPropertyValue(saved.currentPropertyValue);
		if (saved.outstandingMortgage)
			setOutstandingMortgage(saved.outstandingMortgage);
		if (saved.additionalSavings) setAdditionalSavings(saved.additionalSavings);
		if (saved.berRating) setBerRating(saved.berRating);
	}, []);

	// Save to localStorage when form changes
	useEffect(() => {
		saveMoverForm({
			applicationType,
			income1,
			income2,
			birthDate1: birthDate1?.toISOString() ?? null,
			birthDate2: birthDate2?.toISOString() ?? null,
			currentPropertyValue,
			outstandingMortgage,
			additionalSavings,
			berRating,
		});
	}, [
		applicationType,
		income1,
		income2,
		birthDate1,
		birthDate2,
		currentPropertyValue,
		outstandingMortgage,
		additionalSavings,
		berRating,
	]);

	const isJoint = applicationType === "joint";
	const maxMortgageTerm = calculateJointMaxTerm(
		birthDate1,
		birthDate2,
		isJoint,
	);
	const isAnyAgeTooOld = isApplicantTooOld(birthDate1, birthDate2, isJoint);

	// Calculate equity and total deposit
	const propertyVal = parseCurrency(currentPropertyValue);
	const mortgageVal = parseCurrency(outstandingMortgage);
	const equity = propertyVal > mortgageVal ? propertyVal - mortgageVal : 0;
	const savings = parseCurrency(additionalSavings);
	const totalDepositAvailable = equity + savings;

	// Validate required fields
	const hasIncome1 = parseCurrency(income1) > 0;
	const hasIncome2 = parseCurrency(income2) > 0;
	const hasDeposit = totalDepositAvailable > 0;
	const isFormComplete =
		hasIncome1 &&
		birthDate1 !== undefined &&
		hasDeposit &&
		(!isJoint || (hasIncome2 && birthDate2 !== undefined));

	const calculate = useCallback(() => {
		const totalIncome =
			parseCurrency(income1) + (isJoint ? parseCurrency(income2) : 0);

		if (totalIncome <= 0 || maxMortgageTerm === null) return;

		const maxMortgageByIncome = totalIncome * MOVER_LTI_LIMIT;
		const requiredDepositForMaxMortgage = maxMortgageByIncome / 9;
		const hasDepositShortfall =
			totalDepositAvailable < requiredDepositForMaxMortgage;

		let newPropertyValue: number;
		let mortgageAmount: number;

		if (hasDepositShortfall) {
			newPropertyValue = totalDepositAvailable / (1 - MOVER_MAX_LTV);
			mortgageAmount = newPropertyValue * MOVER_MAX_LTV;
		} else {
			mortgageAmount = maxMortgageByIncome;
			newPropertyValue = mortgageAmount + totalDepositAvailable;
		}

		const ltv = (mortgageAmount / newPropertyValue) * 100;
		const lti = mortgageAmount / totalIncome;

		setCalculationResult({
			result: {
				propertyValue: newPropertyValue,
				mortgageAmount,
				mortgageTerm: maxMortgageTerm,
				berRating,
				ltv,
				lti,
			},
			totalIncome,
			hasDepositShortfall,
			maxMortgageByIncome: hasDepositShortfall
				? maxMortgageByIncome
				: undefined,
			requiredDeposit: hasDepositShortfall
				? requiredDepositForMaxMortgage
				: undefined,
		});
		setShowResultDialog(true);
	}, [
		income1,
		income2,
		isJoint,
		maxMortgageTerm,
		berRating,
		totalDepositAvailable,
	]);

	// Auto-calculate when loaded from shared URL
	useEffect(() => {
		if (shouldAutoCalculate && isFormComplete && !isAnyAgeTooOld) {
			calculate();
			setShouldAutoCalculate(false);
		}
	}, [shouldAutoCalculate, isFormComplete, isAnyAgeTooOld, calculate]);

	const handleShare = async (): Promise<boolean> => {
		const state: MoverShareState = {
			type: "mover",
			applicationType,
			income1,
			income2,
			birthDate1: birthDate1?.toISOString() ?? null,
			birthDate2: birthDate2?.toISOString() ?? null,
			currentPropertyValue,
			outstandingMortgage,
			additionalSavings,
			berRating,
		};
		return copyBorrowingShareUrl(state);
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
							For homeowners selling their current property and buying a new
							primary residence. Enter your income, property details, and any
							additional savings.
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
									allows {MOVER_LTI_LIMIT}× income for second/subsequent buyers.
									Lenders can exceed this for {LENDER_ALLOWANCES.MOVER}% of
									their lending. Some may include overtime, bonuses, or other
									income.
								</>
							}
						/>

						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="currentPropertyValue">
									Current Property Value
								</Label>
								<Input
									id="currentPropertyValue"
									type="text"
									inputMode="numeric"
									placeholder="€350,000"
									value={formatCurrencyInput(currentPropertyValue)}
									onChange={(e) =>
										setCurrentPropertyValue(
											e.target.value.replace(/[^0-9]/g, ""),
										)
									}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="outstandingMortgage">
									Outstanding Mortgage
								</Label>
								<Input
									id="outstandingMortgage"
									type="text"
									inputMode="numeric"
									placeholder="€150,000"
									value={formatCurrencyInput(outstandingMortgage)}
									onChange={(e) =>
										setOutstandingMortgage(
											e.target.value.replace(/[^0-9]/g, ""),
										)
									}
								/>
							</div>
						</div>

						{equity > 0 && (
							<p className="text-sm text-muted-foreground">
								Equity from sale:{" "}
								<span className="font-medium text-foreground">
									{formatCurrency(equity)}
								</span>
							</p>
						)}

						<div className="space-y-2">
							<Label htmlFor="additionalSavings">
								Additional Savings (Optional)
							</Label>
							<Input
								id="additionalSavings"
								type="text"
								inputMode="numeric"
								placeholder="€0"
								value={formatCurrencyInput(additionalSavings)}
								onChange={(e) =>
									setAdditionalSavings(e.target.value.replace(/[^0-9]/g, ""))
								}
							/>
							<p className="text-xs text-muted-foreground">
								Any extra savings beyond your property equity. Exclude Stamp
								Duty and legal fees.
							</p>
						</div>

						{totalDepositAvailable > 0 && (
							<p className="text-sm text-muted-foreground">
								Total available for deposit:{" "}
								<span className="font-medium text-foreground">
									{formatCurrency(totalDepositAvailable)}
								</span>
							</p>
						)}

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
								younger to qualify for a mortgage.
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
							{calculationResult?.hasDepositShortfall
								? "Mortgage Summary (Adjusted for Deposit)"
								: "Your Mortgage Summary"}
						</AlertDialogTitle>
						{calculationResult?.hasDepositShortfall && (
							<AlertDialogDescription>
								Your maximum mortgage based on income would be{" "}
								<strong>
									{formatCurrency(calculationResult.maxMortgageByIncome ?? 0)}
								</strong>
								, but you would need{" "}
								<strong>
									{formatCurrency(calculationResult.requiredDeposit ?? 0)}
								</strong>{" "}
								for a 10% deposit. The figures below are adjusted based on your
								available funds (equity + savings).
							</AlertDialogDescription>
						)}
					</AlertDialogHeader>
					<AlertDialogBody>
						{calculationResult && (
							<MortgageResultCard
								result={calculationResult.result}
								maxLtv={LTV_LIMITS.MOVER}
								maxLti={MOVER_LTI_LIMIT}
								isConstrained={calculationResult.hasDepositShortfall}
							/>
						)}
					</AlertDialogBody>
					<AlertDialogFooter className="sm:justify-between">
						<ShareButton onShare={handleShare} />
						<div className="flex flex-col-reverse gap-2 sm:flex-row">
							<AlertDialogCancel>Close</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => {
									if (!calculationResult) return;
									const { result } = calculationResult;
									saveRatesForm({
										mode: "first-mortgage",
										propertyValue: Math.round(result.propertyValue).toString(),
										mortgageAmount: Math.round(
											result.mortgageAmount,
										).toString(),
										monthlyRepayment: "",
										mortgageTerm: result.mortgageTerm.toString(),
										berRating: result.berRating,
										buyerType: "mover",
									});
									window.location.href = getPath("/rates");
								}}
							>
								Compare Mortgage Rates
							</AlertDialogAction>
						</div>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
