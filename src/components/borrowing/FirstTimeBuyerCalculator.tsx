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
	type FtbShareState,
	hasBorrowingShareParam,
	parseBorrowingShareState,
} from "@/lib/share";
import {
	loadFtbForm,
	saveFtbForm,
	saveRatesForm,
	saveRentVsBuyForm,
} from "@/lib/storage";
import {
	calculateJointMaxTerm,
	formatCurrency,
	formatCurrencyInput,
	getPath,
	isApplicantTooOld,
	parseCurrency,
} from "@/lib/utils";
import { ESTIMATED_LEGAL_FEES } from "@/lib/utils/fees";
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
import { Checkbox } from "../ui/checkbox";
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
	const [shouldAutoCalculate, setShouldAutoCalculate] = useState(false);

	// Self Build state
	const [isSelfBuild, setIsSelfBuild] = useState(false);
	const [siteValue, setSiteValue] = useState("");

	// Load from shared URL or localStorage on mount
	useEffect(() => {
		// Check for shared URL first
		if (hasBorrowingShareParam()) {
			const shared = parseBorrowingShareState();
			if (shared && shared.type === "ftb") {
				setApplicationType(shared.applicationType);
				setIncome1(shared.income1);
				setIncome2(shared.income2);
				setBirthDate1(
					shared.birthDate1 ? new Date(shared.birthDate1) : undefined,
				);
				setBirthDate2(
					shared.birthDate2 ? new Date(shared.birthDate2) : undefined,
				);
				setSavings(shared.savings);
				setBerRating(shared.berRating);
				// Self Build fields
				if (shared.isSelfBuild) {
					setIsSelfBuild(true);
					setSiteValue(shared.siteValue ?? "");
				}
				clearBorrowingShareParam();
				setShouldAutoCalculate(true);
				return;
			}
		}

		// Fall back to localStorage
		const saved = loadFtbForm();
		if (saved.applicationType) setApplicationType(saved.applicationType);
		if (saved.income1) setIncome1(saved.income1);
		if (saved.income2) setIncome2(saved.income2);
		if (saved.birthDate1) setBirthDate1(new Date(saved.birthDate1));
		if (saved.birthDate2) setBirthDate2(new Date(saved.birthDate2));
		if (saved.savings) setSavings(saved.savings);
		if (saved.berRating) setBerRating(saved.berRating);
		// Self Build fields
		if (saved.isSelfBuild) setIsSelfBuild(saved.isSelfBuild);
		if (saved.siteValue) setSiteValue(saved.siteValue);
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
			// Self Build fields
			isSelfBuild,
			siteValue,
		});
	}, [
		applicationType,
		income1,
		income2,
		birthDate1,
		birthDate2,
		savings,
		berRating,
		isSelfBuild,
		siteValue,
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

	// Self Build validation
	const hasSiteValue = parseCurrency(siteValue) > 0;

	const isFormComplete =
		hasIncome1 &&
		birthDate1 !== undefined &&
		(isSelfBuild ? hasSiteValue : hasSavings) &&
		(!isJoint || (hasIncome2 && birthDate2 !== undefined));

	const calculate = useCallback(() => {
		const totalIncome =
			parseCurrency(income1) + (isJoint ? parseCurrency(income2) : 0);

		if (totalIncome <= 0 || maxMortgageTerm === null) return;

		// Calculate deposit based on mode
		let totalDeposit: number;
		if (isSelfBuild) {
			// Self Build: site value counts as equity + savings
			totalDeposit = parseCurrency(siteValue) + parseCurrency(savings);
		} else {
			// Standard: just savings
			totalDeposit = parseCurrency(savings);
		}

		// Maximum mortgage based on LTI rule
		const maxMortgageByIncome = totalIncome * FTB_LTI_LIMIT;
		// Minimum deposit required for max mortgage (10% of property value)
		const requiredDepositForMaxMortgage = maxMortgageByIncome / 9;

		// Check if deposit is sufficient for maximum mortgage
		const hasSavingsShortfall = totalDeposit < requiredDepositForMaxMortgage;

		let propertyValue: number;
		let mortgageAmount: number;

		if (hasSavingsShortfall) {
			// Deposit constrained: max property based on 10% deposit
			propertyValue = totalDeposit / (1 - FTB_MAX_LTV);
			mortgageAmount = propertyValue * FTB_MAX_LTV;
		} else {
			// Income constrained: use max mortgage + all deposit
			mortgageAmount = maxMortgageByIncome;
			propertyValue = mortgageAmount + totalDeposit;
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
	}, [
		income1,
		income2,
		isJoint,
		savings,
		maxMortgageTerm,
		berRating,
		isSelfBuild,
		siteValue,
	]);

	// Auto-calculate when loaded from shared URL
	useEffect(() => {
		if (shouldAutoCalculate && isFormComplete && !isAnyAgeTooOld) {
			calculate();
			setShouldAutoCalculate(false);
		}
	}, [shouldAutoCalculate, isFormComplete, isAnyAgeTooOld, calculate]);

	const handleShare = async (): Promise<boolean> => {
		const state: FtbShareState = {
			type: "ftb",
			applicationType,
			income1,
			income2,
			birthDate1: birthDate1?.toISOString() ?? null,
			birthDate2: birthDate2?.toISOString() ?? null,
			savings,
			berRating,
			// Self Build fields
			...(isSelfBuild && {
				isSelfBuild: true,
				siteValue,
			}),
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

						{/* Self Build Toggle */}
						<div className="flex items-center space-x-2">
							<Checkbox
								id="selfBuild"
								checked={isSelfBuild}
								onCheckedChange={(checked) => setIsSelfBuild(checked === true)}
							/>
							<Label
								htmlFor="selfBuild"
								className="text-sm font-normal cursor-pointer"
							>
								Self Build (building on land you own)
							</Label>
						</div>

						{isSelfBuild && (
							<div className="space-y-2">
								<Label htmlFor="siteValue">Site Value</Label>
								<Input
									id="siteValue"
									type="text"
									inputMode="numeric"
									placeholder="€100,000"
									value={formatCurrencyInput(siteValue)}
									onChange={(e) =>
										setSiteValue(e.target.value.replace(/[^0-9]/g, ""))
									}
								/>
								<p className="text-xs text-muted-foreground">
									Value of the land you own.
								</p>
							</div>
						)}

						<div className="space-y-2">
							<Label htmlFor="savings">
								{isSelfBuild
									? "Additional Savings"
									: "Total Savings for Deposit"}
							</Label>
							<Input
								id="savings"
								type="text"
								inputMode="numeric"
								placeholder={isSelfBuild ? "€20,000" : "€30,000"}
								value={formatCurrencyInput(savings)}
								onChange={(e) =>
									setSavings(e.target.value.replace(/[^0-9]/g, ""))
								}
							/>
							<p className="text-xs text-muted-foreground">
								{isSelfBuild
									? "Include Help to Buy if eligible."
									: "Include any gifts or Help to Buy funds. Exclude Stamp Duty and legal fees."}
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
							<div className="space-y-4">
								<MortgageResultCard
									result={calculationResult.result}
									maxLtv={LTV_LIMITS.FTB}
									maxLti={FTB_LTI_LIMIT}
									isConstrained={calculationResult.hasSavingsShortfall}
								/>
								{/* Rent vs Buy Link */}
								<Card className="bg-muted/30">
									<CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
										<div>
											<p className="font-medium">
												Should you buy or keep renting?
											</p>
											<p className="text-sm text-muted-foreground">
												Compare long-term costs of buying vs renting with your
												mortgage details.
											</p>
										</div>
										<Button
											variant="outline"
											className="shrink-0"
											onClick={() => {
												const { result } = calculationResult;
												const deposit =
													result.propertyValue - result.mortgageAmount;
												saveRentVsBuyForm({
													propertyValue: Math.round(
														result.propertyValue,
													).toString(),
													deposit: Math.round(deposit).toString(),
													mortgageTerm: (result.mortgageTerm * 12).toString(),
													interestRate: "",
													berRating: result.berRating,
													currentRent: "",
													legalFees: ESTIMATED_LEGAL_FEES.toString(),
													rentInflation: "3",
													homeAppreciation: "3",
													maintenanceRate: "1",
													opportunityCost: "4",
													saleCost: "3",
													serviceCharge: "0",
													serviceChargeIncrease: "3",
												});
												window.location.href = getPath(
													"/breakeven/rent-vs-buy",
												);
											}}
										>
											Rent vs Buy Calculator
											<ExternalLink className="h-4 w-4 ml-2" />
										</Button>
									</CardContent>
								</Card>
							</div>
						)}
					</AlertDialogBody>
					<AlertDialogFooter className="sm:justify-between">
						<ShareButton size="default" onShare={handleShare} />
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
										mortgageTerm: (result.mortgageTerm * 12).toString(),
										berRating: result.berRating,
										buyerType: "ftb",
										currentLender: "",
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
