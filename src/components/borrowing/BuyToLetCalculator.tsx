import { Download, ExternalLink, Info, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { type BerRating, DEFAULT_BER } from "@/lib/constants/ber";
import {
	AGE_LIMITS,
	CENTRAL_BANK_MORTGAGE_MEASURES_URL,
	LENDER_ALLOWANCES,
	LTI_LIMITS,
	LTV_LIMITS,
} from "@/lib/constants/central-bank";
import { exportAffordabilityToPDF } from "@/lib/export/affordability-export";
import {
	type BtlShareState,
	clearBorrowingShareParam,
	generateBorrowingShareUrl,
	hasBorrowingShareParam,
	parseBorrowingShareState,
} from "@/lib/share/borrowing";
import { loadBtlForm, saveBtlForm, saveRatesForm } from "@/lib/storage/forms";
import {
	calculateJointMaxTerm,
	calculateMonthlyPayment,
	isApplicantTooOld,
} from "@/lib/utils/borrowing";
import {
	formatCurrency,
	formatCurrencyInput,
	parseCurrency,
} from "@/lib/utils/currency";
import type { PropertyType } from "@/lib/utils/fees";
import { getPath } from "@/lib/utils/path";
import { ShareButton } from "../ShareButton";
import { BerSelector } from "../selectors/BerSelector";
import { PropertyTypeSelector } from "../selectors/PropertyTypeSelector";
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
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "../ui/tooltip";
import { ApplicantInputs } from "./ApplicantInputs";
import { type MortgageResult, MortgageResultCard } from "./MortgageResultCard";
import { MortgageTermDisplay } from "./MortgageTermDisplay";

const BTL_LTI_LIMIT = LTI_LIMITS.BTL;
const BTL_MAX_LTV = LTV_LIMITS.BTL / 100;
const RENTAL_COVERAGE_RATIO = 1.25;
const STRESS_TEST_RATE = 0.055;

interface BtlMortgageResult extends MortgageResult {
	monthlyRent: number;
	monthlyPayment: number;
	rentalCoverage: number;
}

interface CalculationResult {
	result: BtlMortgageResult;
	totalIncome: number;
	deposit: number;
	constrainedBy: "deposit" | "income" | "rental";
}

export function BuyToLetCalculator() {
	const [applicationType, setApplicationType] = useState<"sole" | "joint">(
		"sole",
	);
	const [income1, setIncome1] = useState("");
	const [income2, setIncome2] = useState("");
	const [birthDate1, setBirthDate1] = useState<Date | undefined>(undefined);
	const [birthDate2, setBirthDate2] = useState<Date | undefined>(undefined);
	const [deposit, setDeposit] = useState("");
	const [expectedRent, setExpectedRent] = useState("");
	const [berRating, setBerRating] = useState(DEFAULT_BER);
	const [calculationResult, setCalculationResult] =
		useState<CalculationResult | null>(null);
	const [showResultDialog, setShowResultDialog] = useState(false);
	const [shouldAutoCalculate, setShouldAutoCalculate] = useState(false);
	const [isExporting, setIsExporting] = useState(false);

	// Property type for VAT calculation
	const [propertyType, setPropertyType] = useState<PropertyType>("existing");
	const [priceIncludesVAT, setPriceIncludesVAT] = useState(true);

	// Load from shared URL or localStorage on mount
	useEffect(() => {
		// Check for shared URL first
		if (hasBorrowingShareParam()) {
			const shared = parseBorrowingShareState();
			if (shared && shared.type === "btl") {
				setApplicationType(shared.applicationType);
				setIncome1(shared.income1);
				setIncome2(shared.income2);
				setBirthDate1(
					shared.birthDate1 ? new Date(shared.birthDate1) : undefined,
				);
				setBirthDate2(
					shared.birthDate2 ? new Date(shared.birthDate2) : undefined,
				);
				setDeposit(shared.deposit);
				setExpectedRent(shared.expectedRent);
				setBerRating(shared.berRating);
				// Property type fields
				if (shared.propertyType) {
					setPropertyType(shared.propertyType);
					setPriceIncludesVAT(shared.priceIncludesVAT ?? true);
				}
				clearBorrowingShareParam();
				setShouldAutoCalculate(true);
				return;
			}
		}

		// Fall back to localStorage
		const saved = loadBtlForm();
		if (saved.applicationType) setApplicationType(saved.applicationType);
		if (saved.income1) setIncome1(saved.income1);
		if (saved.income2) setIncome2(saved.income2);
		if (saved.birthDate1) setBirthDate1(new Date(saved.birthDate1));
		if (saved.birthDate2) setBirthDate2(new Date(saved.birthDate2));
		if (saved.deposit) setDeposit(saved.deposit);
		if (saved.expectedRent) setExpectedRent(saved.expectedRent);
		if (saved.berRating) setBerRating(saved.berRating as BerRating);
		// Property type fields
		if (saved.propertyType) setPropertyType(saved.propertyType);
		if (saved.priceIncludesVAT !== undefined)
			setPriceIncludesVAT(saved.priceIncludesVAT);
	}, []);

	// Save to localStorage when form changes
	useEffect(() => {
		saveBtlForm({
			applicationType,
			income1,
			income2,
			birthDate1: birthDate1?.toISOString() ?? null,
			birthDate2: birthDate2?.toISOString() ?? null,
			deposit,
			expectedRent,
			berRating,
			// Property type fields
			propertyType,
			priceIncludesVAT,
		});
	}, [
		applicationType,
		income1,
		income2,
		birthDate1,
		birthDate2,
		deposit,
		expectedRent,
		berRating,
		propertyType,
		priceIncludesVAT,
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
	const hasDeposit = parseCurrency(deposit) > 0;
	const hasRent = parseCurrency(expectedRent) > 0;
	const isFormComplete =
		hasIncome1 &&
		birthDate1 !== undefined &&
		hasDeposit &&
		hasRent &&
		(!isJoint || (hasIncome2 && birthDate2 !== undefined));

	const calculate = useCallback(() => {
		const totalIncome =
			parseCurrency(income1) + (isJoint ? parseCurrency(income2) : 0);
		const totalDeposit = parseCurrency(deposit);
		const monthlyRent = parseCurrency(expectedRent);

		if (totalIncome <= 0 || maxMortgageTerm === null || monthlyRent <= 0)
			return;

		// Maximum mortgage based on LTI
		const maxMortgageByIncome = totalIncome * BTL_LTI_LIMIT;

		// Maximum mortgage based on rental coverage
		const maxMonthlyPayment = monthlyRent / RENTAL_COVERAGE_RATIO;
		const monthlyRate = STRESS_TEST_RATE / 12;
		const months = maxMortgageTerm * 12;
		const maxMortgageByRental =
			(maxMonthlyPayment * ((1 + monthlyRate) ** months - 1)) /
			(monthlyRate * (1 + monthlyRate) ** months);

		// Maximum mortgage based on deposit (70% LTV)
		const maxPropertyByDeposit = totalDeposit / (1 - BTL_MAX_LTV);
		const maxMortgageByDeposit = maxPropertyByDeposit * BTL_MAX_LTV;

		// Use the most constraining factor
		let constrainedBy: "deposit" | "income" | "rental" = "deposit";
		let mortgageAmount = maxMortgageByDeposit;

		if (maxMortgageByIncome < mortgageAmount) {
			mortgageAmount = maxMortgageByIncome;
			constrainedBy = "income";
		}
		if (maxMortgageByRental < mortgageAmount) {
			mortgageAmount = maxMortgageByRental;
			constrainedBy = "rental";
		}

		let propertyValue: number;
		if (constrainedBy === "deposit") {
			propertyValue = maxPropertyByDeposit;
		} else {
			propertyValue = mortgageAmount / BTL_MAX_LTV;
		}

		const actualDeposit = propertyValue - mortgageAmount;
		const ltv = (mortgageAmount / propertyValue) * 100;
		const lti = mortgageAmount / totalIncome;
		const monthlyPayment = calculateMonthlyPayment(
			mortgageAmount,
			STRESS_TEST_RATE,
			maxMortgageTerm * 12,
		);
		const rentalCoverage = (monthlyRent / monthlyPayment) * 100;

		setCalculationResult({
			result: {
				propertyValue,
				mortgageAmount,
				mortgageTerm: maxMortgageTerm,
				berRating,
				ltv,
				lti,
				monthlyRent,
				monthlyPayment,
				rentalCoverage,
			},
			totalIncome,
			deposit: actualDeposit,
			constrainedBy,
		});
		setShowResultDialog(true);
	}, [
		income1,
		income2,
		isJoint,
		deposit,
		expectedRent,
		maxMortgageTerm,
		berRating,
	]);

	// Auto-calculate when loaded from shared URL
	useEffect(() => {
		if (shouldAutoCalculate && isFormComplete && !isAnyAgeTooOld) {
			calculate();
			setShouldAutoCalculate(false);
		}
	}, [shouldAutoCalculate, isFormComplete, isAnyAgeTooOld, calculate]);

	const coverageColor = calculationResult
		? calculationResult.result.rentalCoverage >= RENTAL_COVERAGE_RATIO * 100
			? "text-green-600 dark:text-green-400"
			: "text-destructive"
		: "";

	const handleShare = useCallback(async (): Promise<string> => {
		const state: BtlShareState = {
			type: "btl",
			applicationType,
			income1,
			income2,
			birthDate1: birthDate1?.toISOString() ?? null,
			birthDate2: birthDate2?.toISOString() ?? null,
			deposit,
			expectedRent,
			berRating,
			// Property type fields (only include if non-default)
			...(propertyType !== "existing" && {
				propertyType,
				priceIncludesVAT,
			}),
		};
		return generateBorrowingShareUrl(state);
	}, [
		applicationType,
		income1,
		income2,
		birthDate1,
		birthDate2,
		deposit,
		expectedRent,
		berRating,
		propertyType,
		priceIncludesVAT,
	]);

	const handleExport = useCallback(async () => {
		if (!calculationResult) return;
		setIsExporting(true);
		try {
			const { result } = calculationResult;
			const annualRent = result.monthlyRent * 12;
			const rentalYield = (annualRent / result.propertyValue) * 100;
			const stressTestPassed =
				result.rentalCoverage >= RENTAL_COVERAGE_RATIO * 100;
			const shareUrl = await handleShare();
			await exportAffordabilityToPDF({
				calculatorType: "btl",
				result,
				totalIncome: calculationResult.totalIncome,
				propertyType,
				priceIncludesVAT,
				rentalIncome: result.monthlyRent,
				rentalYield,
				stressTestPassed,
				shareUrl,
			});
		} finally {
			setIsExporting(false);
		}
	}, [calculationResult, propertyType, priceIncludesVAT, handleShare]);

	return (
		<div className="space-y-6">
			<Card>
				<CardContent>
					<div className="mb-6">
						<CardTitle className="text-lg mb-1">
							How Much Can I Borrow?
						</CardTitle>
						<CardDescription>
							For investment or second properties without selling your current
							home. Enter your deposit, income, and expected rental income.
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
							incomeNote={`Buy-to-let mortgages are assessed primarily on rental income, but lenders may also apply LTI limits. Lenders can exceed limits for ${LENDER_ALLOWANCES.BTL}% of their BTL lending.`}
						/>

						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="deposit">Available Deposit</Label>
								<Input
									id="deposit"
									type="text"
									inputMode="numeric"
									placeholder="€100,000"
									value={formatCurrencyInput(deposit)}
									onChange={(e) =>
										setDeposit(e.target.value.replace(/[^0-9]/g, ""))
									}
								/>
								<p className="text-xs text-muted-foreground">
									<a
										href={CENTRAL_BANK_MORTGAGE_MEASURES_URL}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center hover:text-foreground"
									>
										Central Bank
										<ExternalLink className="h-3 w-3 ml-0.5" />
									</a>{" "}
									requires minimum 30% deposit for buy-to-let.
								</p>
							</div>
							<div className="space-y-2">
								<div className="flex items-center gap-1">
									<Label htmlFor="expectedRent">Expected Monthly Rent</Label>
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
											</TooltipTrigger>
											<TooltipContent className="max-w-xs">
												<p>
													Lenders typically stress-test at ~
													{(STRESS_TEST_RATE * 100).toFixed(1)}% and require
													rent to cover{" "}
													{(RENTAL_COVERAGE_RATIO * 100).toFixed(0)}% of the
													payment. These are common lender requirements, not
													Central Bank rules.
												</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								</div>
								<Input
									id="expectedRent"
									type="text"
									inputMode="numeric"
									placeholder="€1,500"
									value={formatCurrencyInput(expectedRent)}
									onChange={(e) =>
										setExpectedRent(e.target.value.replace(/[^0-9]/g, ""))
									}
								/>
								<p className="text-xs text-muted-foreground">
									Research comparable rental properties in the area.
								</p>
							</div>
						</div>

						<div className="grid gap-4 sm:grid-cols-3">
							<div className="w-full">
								<MortgageTermDisplay maxMortgageTerm={maxMortgageTerm} />
							</div>
							<BerSelector
								value={berRating}
								onChange={setBerRating}
								id="berRating"
								label="Expected BER Rating"
							/>
							<PropertyTypeSelector
								value={propertyType}
								onChange={setPropertyType}
								priceIncludesVAT={priceIncludesVAT}
								onPriceIncludesVATChange={setPriceIncludesVAT}
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
							{calculationResult?.constrainedBy === "rental"
								? "Mortgage Summary (Limited by Rental Income)"
								: calculationResult?.constrainedBy === "income"
									? "Mortgage Summary (Limited by Income)"
									: "Your Mortgage Summary"}
						</AlertDialogTitle>
						{calculationResult?.constrainedBy === "rental" && (
							<AlertDialogDescription>
								Your maximum mortgage is limited by expected rental income.
								Based on your deposit, you could borrow up to{" "}
								<strong>
									{formatCurrency(
										(parseCurrency(deposit) / (1 - BTL_MAX_LTV)) * BTL_MAX_LTV,
									)}
								</strong>
								, but rental coverage requirements limit you to the amount shown
								below.
							</AlertDialogDescription>
						)}
						{calculationResult?.constrainedBy === "income" && (
							<AlertDialogDescription>
								Your maximum mortgage is limited by income (LTI). Based on your
								deposit, you could borrow up to{" "}
								<strong>
									{formatCurrency(
										(parseCurrency(deposit) / (1 - BTL_MAX_LTV)) * BTL_MAX_LTV,
									)}
								</strong>
								, but income limits restrict you to the amount shown below.
							</AlertDialogDescription>
						)}
					</AlertDialogHeader>
					<AlertDialogBody>
						{calculationResult && (
							<MortgageResultCard
								result={calculationResult.result}
								maxLtv={LTV_LIMITS.BTL}
								maxLti={BTL_LTI_LIMIT}
								isConstrained={calculationResult.constrainedBy !== "deposit"}
								propertyType={propertyType}
								priceIncludesVAT={priceIncludesVAT}
								additionalMetrics={
									<>
										<div>
											<p className="text-sm text-muted-foreground">
												Est. Monthly Payment
											</p>
											<p className="text-lg font-semibold">
												{formatCurrency(
													calculationResult.result.monthlyPayment,
												)}
											</p>
										</div>
										<div>
											<p className="text-sm text-muted-foreground">
												Rental Coverage
											</p>
											<p className={`text-lg font-semibold ${coverageColor}`}>
												{calculationResult.result.rentalCoverage.toFixed(0)}%
											</p>
										</div>
									</>
								}
								additionalSections={
									<div className="pt-4 border-t border-border mt-4">
										<p className="text-sm font-medium mb-2">Rental Analysis</p>
										<div className="grid gap-2 sm:grid-cols-3 text-sm">
											<div>
												<p className="text-muted-foreground">
													Expected Monthly Rent
												</p>
												<p className="font-semibold">
													{formatCurrency(calculationResult.result.monthlyRent)}
												</p>
											</div>
											<div>
												<p className="text-muted-foreground">
													Est. Mortgage Payment
												</p>
												<p className="font-semibold">
													{formatCurrency(
														calculationResult.result.monthlyPayment,
													)}
												</p>
											</div>
											<div>
												<p className="text-muted-foreground">
													Net Monthly (before tax)
												</p>
												<p
													className={`font-semibold ${
														calculationResult.result.monthlyRent -
															calculationResult.result.monthlyPayment >=
														0
															? ""
															: "text-destructive"
													}`}
												>
													{formatCurrency(
														calculationResult.result.monthlyRent -
															calculationResult.result.monthlyPayment,
													)}
												</p>
											</div>
										</div>
										<p className="text-xs text-muted-foreground mt-2">
											Most lenders require rent to cover at least{" "}
											{(RENTAL_COVERAGE_RATIO * 100).toFixed(0)}% of the
											mortgage payment at a stress-tested rate of ~
											{(STRESS_TEST_RATE * 100).toFixed(1)}%. These are typical
											lender requirements, not Central Bank rules.
										</p>
									</div>
								}
							/>
						)}
					</AlertDialogBody>
					<AlertDialogFooter className="sm:justify-between">
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="default"
								className="gap-1.5"
								onClick={handleExport}
								disabled={isExporting}
							>
								<Download className="h-4 w-4" />
								{isExporting ? "Exporting..." : "Export PDF"}
							</Button>
							<ShareButton size="default" onShare={handleShare} />
						</div>
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
										buyerType: "btl",
										currentLender: "",
									});
									window.location.href = getPath("/rates");
								}}
							>
								<TrendingUp className="h-4 w-4" />
								Compare Mortgage Rates
							</AlertDialogAction>
						</div>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
