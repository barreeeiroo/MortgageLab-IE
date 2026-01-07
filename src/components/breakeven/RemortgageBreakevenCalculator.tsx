import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DEFAULT_BER } from "@/lib/constants";
import {
	calculateRemortgageBreakeven,
	type RemortgageResult,
} from "@/lib/mortgage/breakeven";
import {
	clearBreakevenShareParam,
	copyBreakevenShareUrl,
	hasBreakevenShareParam,
	parseBreakevenShareState,
	type RemortgageBreakevenShareState,
} from "@/lib/share";
import {
	loadRemortgageBreakevenForm,
	saveRemortgageBreakevenForm,
} from "@/lib/storage";
import { formatCurrencyInput, parseCurrency } from "@/lib/utils";
import { ESTIMATED_REMORTGAGE_LEGAL_FEES } from "@/lib/utils/fees";
import { RatePicker } from "../rates/RatePicker";
import { ShareButton } from "../ShareButton";
import { BerSelector } from "../selectors/BerSelector";
import { MortgageTermSelector } from "../selectors/MortgageTermSelector";
import {
	AlertDialog,
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
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "../ui/collapsible";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { RemortgageResultCard } from "./BreakevenResultCard";

export function RemortgageBreakevenCalculator() {
	// Form state
	const [outstandingBalance, setOutstandingBalance] = useState("");
	const [propertyValue, setPropertyValue] = useState("");
	const [currentRate, setCurrentRate] = useState("");
	const [currentPayment, setCurrentPayment] = useState("");
	const [remainingTerm, setRemainingTerm] = useState("240"); // 20 years in months
	const [newRate, setNewRate] = useState("");
	const [rateInputMode, setRateInputMode] = useState<"picker" | "manual">(
		"picker",
	);
	const [berRating, setBerRating] = useState(DEFAULT_BER);
	const [legalFees, setLegalFees] = useState(
		ESTIMATED_REMORTGAGE_LEGAL_FEES.toString(),
	);

	// Advanced options
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [cashback, setCashback] = useState("0");

	// Result state
	const [calculationResult, setCalculationResult] =
		useState<RemortgageResult | null>(null);
	const [showResultDialog, setShowResultDialog] = useState(false);
	const [shouldAutoCalculate, setShouldAutoCalculate] = useState(false);

	// Computed values
	const outstandingBalanceNum = parseCurrency(outstandingBalance);
	const propertyValueNum = parseCurrency(propertyValue);
	const ltv =
		propertyValueNum > 0 ? (outstandingBalanceNum / propertyValueNum) * 100 : 0;

	// Load from shared URL or localStorage on mount
	useEffect(() => {
		// Check for shared URL first
		if (hasBreakevenShareParam()) {
			const shared = parseBreakevenShareState();
			if (shared && shared.type === "rmb") {
				setOutstandingBalance(shared.outstandingBalance);
				setPropertyValue(shared.propertyValue);
				setCurrentRate(shared.currentRate);
				setCurrentPayment(shared.currentPayment);
				setRemainingTerm(shared.remainingTerm);
				setNewRate(shared.newRate);
				setRateInputMode(shared.rateInputMode);
				setBerRating(shared.berRating);
				setLegalFees(shared.legalFees);
				if (shared.showAdvanced) {
					setShowAdvanced(true);
					if (shared.cashback) setCashback(shared.cashback);
				}
				clearBreakevenShareParam();
				setShouldAutoCalculate(true);
				return;
			}
		}

		// Fall back to localStorage
		const saved = loadRemortgageBreakevenForm();
		if (saved.outstandingBalance)
			setOutstandingBalance(saved.outstandingBalance);
		if (saved.propertyValue) setPropertyValue(saved.propertyValue);
		if (saved.currentRate) setCurrentRate(saved.currentRate);
		if (saved.currentPayment) setCurrentPayment(saved.currentPayment);
		if (saved.remainingTerm) setRemainingTerm(saved.remainingTerm);
		if (saved.newRate) setNewRate(saved.newRate);
		if (saved.rateInputMode) setRateInputMode(saved.rateInputMode);
		if (saved.berRating) setBerRating(saved.berRating);
		if (saved.legalFees) setLegalFees(saved.legalFees);
		if (saved.showAdvanced) setShowAdvanced(saved.showAdvanced);
		if (saved.cashback) setCashback(saved.cashback);
	}, []);

	// Save to localStorage when form changes
	useEffect(() => {
		saveRemortgageBreakevenForm({
			outstandingBalance,
			propertyValue,
			currentRate,
			currentPayment,
			remainingTerm,
			newRate,
			rateInputMode,
			berRating,
			legalFees,
			showAdvanced,
			cashback,
		});
	}, [
		outstandingBalance,
		propertyValue,
		currentRate,
		currentPayment,
		remainingTerm,
		newRate,
		rateInputMode,
		berRating,
		legalFees,
		showAdvanced,
		cashback,
	]);

	// Validation
	const hasBalance = outstandingBalanceNum > 0;
	const hasPropertyValue = propertyValueNum > 0;
	const hasValidBalance = outstandingBalanceNum <= propertyValueNum;
	const hasCurrentRate =
		currentRate !== "" && Number.parseFloat(currentRate) > 0;
	const hasNewRate = newRate !== "" && Number.parseFloat(newRate) > 0;

	const isFormComplete =
		hasBalance &&
		hasPropertyValue &&
		hasValidBalance &&
		hasCurrentRate &&
		hasNewRate;

	const calculate = useCallback(() => {
		if (!isFormComplete) return;

		const result = calculateRemortgageBreakeven({
			outstandingBalance: outstandingBalanceNum,
			currentRate: Number.parseFloat(currentRate),
			newRate: Number.parseFloat(newRate),
			remainingTermMonths: Number.parseInt(remainingTerm, 10),
			legalFees:
				Number.parseFloat(legalFees) || ESTIMATED_REMORTGAGE_LEGAL_FEES,
			cashback: showAdvanced ? parseCurrency(cashback) : 0,
		});

		setCalculationResult(result);
		setShowResultDialog(true);
	}, [
		isFormComplete,
		outstandingBalanceNum,
		currentRate,
		newRate,
		remainingTerm,
		legalFees,
		showAdvanced,
		cashback,
	]);

	// Auto-calculate when loaded from shared URL
	useEffect(() => {
		if (shouldAutoCalculate && isFormComplete) {
			calculate();
			setShouldAutoCalculate(false);
		}
	}, [shouldAutoCalculate, isFormComplete, calculate]);

	const handleShare = async (): Promise<boolean> => {
		const state: RemortgageBreakevenShareState = {
			type: "rmb",
			outstandingBalance,
			propertyValue,
			currentRate,
			currentPayment,
			remainingTerm,
			newRate,
			rateInputMode,
			berRating,
			legalFees,
			...(showAdvanced && {
				showAdvanced: true,
				cashback,
			}),
		};
		return copyBreakevenShareUrl(state);
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardContent>
					<div className="mb-6">
						<CardTitle className="text-lg mb-1">
							Is Switching Worth It?
						</CardTitle>
						<CardDescription>
							Enter your current mortgage details and a new rate to see how
							quickly the savings will offset switching costs.
						</CardDescription>
					</div>

					<div className="space-y-6">
						{/* Current Mortgage Details */}
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="outstandingBalance">Outstanding Balance</Label>
								<Input
									id="outstandingBalance"
									type="text"
									inputMode="numeric"
									placeholder="€250,000"
									value={formatCurrencyInput(outstandingBalance)}
									onChange={(e) =>
										setOutstandingBalance(e.target.value.replace(/[^0-9]/g, ""))
									}
								/>
								<p className="text-xs text-muted-foreground">
									Current remaining mortgage balance
								</p>
							</div>
							<div className="space-y-2">
								<Label htmlFor="propertyValue">Property Value</Label>
								<Input
									id="propertyValue"
									type="text"
									inputMode="numeric"
									placeholder="€400,000"
									value={formatCurrencyInput(propertyValue)}
									onChange={(e) =>
										setPropertyValue(e.target.value.replace(/[^0-9]/g, ""))
									}
								/>
								{hasPropertyValue && hasBalance && (
									<p className="text-xs text-muted-foreground">
										Current LTV: {ltv.toFixed(1)}%
									</p>
								)}
								{hasBalance && !hasValidBalance && (
									<p className="text-xs text-destructive">
										Balance cannot exceed property value
									</p>
								)}
							</div>
						</div>

						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="currentRate">Current Interest Rate (%)</Label>
								<Input
									id="currentRate"
									type="text"
									inputMode="decimal"
									placeholder="4.5"
									value={currentRate}
									onChange={(e) => {
										const val = e.target.value;
										if (val === "" || /^\d*\.?\d*$/.test(val)) {
											setCurrentRate(val);
										}
									}}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="currentPayment">
									Current Monthly Payment (optional)
								</Label>
								<Input
									id="currentPayment"
									type="text"
									inputMode="numeric"
									placeholder="€1,500"
									value={formatCurrencyInput(currentPayment)}
									onChange={(e) =>
										setCurrentPayment(e.target.value.replace(/[^0-9]/g, ""))
									}
								/>
								<p className="text-xs text-muted-foreground">
									For reference only
								</p>
							</div>
						</div>

						{/* Remaining Term and BER */}
						<div className="grid gap-4 sm:grid-cols-2">
							<MortgageTermSelector
								value={remainingTerm}
								onChange={setRemainingTerm}
								label="Remaining Term"
							/>
							<BerSelector value={berRating} onChange={setBerRating} />
						</div>

						{/* New Rate Picker */}
						<RatePicker
							value={newRate}
							onChange={setNewRate}
							mode={rateInputMode}
							onModeChange={setRateInputMode}
							ltv={ltv}
							buyerType="switcher-pdh"
							berRating={berRating}
							isRemortgage={true}
							label="New Interest Rate"
						/>

						{/* Legal Fees */}
						<div className="space-y-2">
							<Label htmlFor="legalFees">Estimated Legal Fees</Label>
							<Input
								id="legalFees"
								type="text"
								inputMode="numeric"
								placeholder="€1,350"
								value={formatCurrencyInput(legalFees)}
								onChange={(e) =>
									setLegalFees(e.target.value.replace(/[^0-9]/g, ""))
								}
							/>
							<p className="text-xs text-muted-foreground">
								Typical switching costs are €1,200-€1,500 including all outlays
							</p>
						</div>

						{/* Advanced Options */}
						<Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
							<CollapsibleTrigger asChild>
								<Button
									variant="ghost"
									className="flex items-center gap-2 p-0 h-auto font-normal hover:bg-transparent"
								>
									<ChevronDown
										className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
									/>
									Advanced Options
								</Button>
							</CollapsibleTrigger>
							<CollapsibleContent className="pt-4">
								<div className="p-4 border rounded-lg bg-muted/30">
									<div className="space-y-2">
										<Label htmlFor="cashback">Cashback from New Lender</Label>
										<Input
											id="cashback"
											type="text"
											inputMode="numeric"
											placeholder="€0"
											value={formatCurrencyInput(cashback)}
											onChange={(e) =>
												setCashback(e.target.value.replace(/[^0-9]/g, ""))
											}
										/>
										<p className="text-xs text-muted-foreground">
											Some lenders offer 1-3% cashback on the mortgage amount.
											This reduces your net switching cost.
										</p>
									</div>
								</div>
							</CollapsibleContent>
						</Collapsible>

						{/* Calculate Button */}
						<Button
							onClick={calculate}
							disabled={!isFormComplete}
							className="w-full"
							size="lg"
						>
							Calculate Breakeven
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Result Dialog */}
			<AlertDialog open={showResultDialog} onOpenChange={setShowResultDialog}>
				<AlertDialogContent className="max-w-2xl">
					<AlertDialogHeader>
						<AlertDialogTitle className="flex items-center justify-between">
							Remortgage Analysis
							<ShareButton onShare={handleShare} />
						</AlertDialogTitle>
						<AlertDialogDescription>
							Based on your inputs, here's when switching will pay off.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogBody>
						{calculationResult && (
							<RemortgageResultCard
								result={calculationResult}
								remainingTermMonths={Number.parseInt(remainingTerm, 10)}
							/>
						)}
					</AlertDialogBody>
					<AlertDialogFooter>
						<AlertDialogCancel>Close</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
