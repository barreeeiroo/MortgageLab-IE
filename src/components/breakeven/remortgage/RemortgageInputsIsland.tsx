import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { type BerRating, DEFAULT_BER } from "@/lib/constants/ber";
import { FIXED_PERIOD_OPTIONS } from "@/lib/constants/rates";
import { calculateRemortgageBreakeven } from "@/lib/mortgage/breakeven";
import type { MortgageRate } from "@/lib/schemas/rate";
import {
	clearBreakevenShareParam,
	hasBreakevenShareParam,
	parseBreakevenShareState,
} from "@/lib/share/breakeven";
import {
	loadRemortgageBreakevenForm,
	saveRemortgageBreakevenForm,
} from "@/lib/storage/forms";
import { showRemortgageResult } from "@/lib/stores/breakeven";
import { formatCurrencyInput, parseCurrency } from "@/lib/utils/currency";
import { ESTIMATED_REMORTGAGE_LEGAL_FEES } from "@/lib/utils/fees";
import { RatePicker } from "../../rates/RatePicker";
import { BerSelector } from "../../selectors/BerSelector";
import { MortgageTermSelector } from "../../selectors/MortgageTermSelector";
import { Button } from "../../ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "../../ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "../../ui/collapsible";
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

export function RemortgageInputsIsland() {
	// Form state
	const [outstandingBalance, setOutstandingBalance] = useState("");
	const [propertyValue, setPropertyValue] = useState("");
	const [currentRate, setCurrentRate] = useState("");
	const [remainingTerm, setRemainingTerm] = useState("240"); // 20 years in months
	const [newRate, setNewRate] = useState("");
	const [rateInputMode, setRateInputMode] = useState<"picker" | "manual">(
		"picker",
	);
	const [berRating, setBerRating] = useState(DEFAULT_BER);
	const [legalFees, setLegalFees] = useState(
		ESTIMATED_REMORTGAGE_LEGAL_FEES.toString(),
	);

	// Fixed period tracking (in years, 0 = variable, null = unknown)
	const [fixedPeriodYears, setFixedPeriodYears] = useState<string>("5"); // Default to 5 years

	// Advanced options (always visible now)
	const [cashback, setCashback] = useState("0");
	const [erc, setErc] = useState("0");

	// Handle rate selection from picker (captures fixed term)
	const handleRateSelect = useCallback((rate: MortgageRate) => {
		if (rate.type === "variable") {
			setFixedPeriodYears("0");
		} else {
			setFixedPeriodYears(rate.fixedTerm?.toString() ?? "5");
		}
	}, []);

	// Auto-calculate flag
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
				setRemainingTerm(shared.remainingTerm);
				setNewRate(shared.newRate);
				setRateInputMode(shared.rateInputMode);
				setBerRating(shared.berRating as BerRating);
				setLegalFees(shared.legalFees);
				if (shared.cashback) setCashback(shared.cashback);
				if (shared.erc) setErc(shared.erc);
				if (shared.fixedPeriodYears)
					setFixedPeriodYears(shared.fixedPeriodYears);
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
		if (saved.remainingTerm) setRemainingTerm(saved.remainingTerm);
		if (saved.newRate) setNewRate(saved.newRate);
		if (saved.rateInputMode) setRateInputMode(saved.rateInputMode);
		if (saved.berRating) setBerRating(saved.berRating as BerRating);
		if (saved.legalFees) setLegalFees(saved.legalFees);
		if (saved.cashback) setCashback(saved.cashback);
		if (saved.erc) setErc(saved.erc);
		if (saved.fixedPeriodYears) setFixedPeriodYears(saved.fixedPeriodYears);
	}, []);

	// Save to localStorage when form changes
	useEffect(() => {
		saveRemortgageBreakevenForm({
			outstandingBalance,
			propertyValue,
			currentRate,
			remainingTerm,
			newRate,
			rateInputMode,
			berRating,
			legalFees,
			fixedPeriodYears,
			cashback,
			erc,
		});
	}, [
		outstandingBalance,
		propertyValue,
		currentRate,
		remainingTerm,
		newRate,
		rateInputMode,
		berRating,
		legalFees,
		cashback,
		erc,
		fixedPeriodYears,
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
			cashback: parseCurrency(cashback),
			erc: parseCurrency(erc),
		});

		// Convert fixed period years to months (0 = variable)
		const fixedYears = Number.parseInt(fixedPeriodYears, 10);
		const fixedPeriodMonths = fixedYears === 0 ? null : fixedYears * 12;

		// Store the result and open the dialog via the shared store
		showRemortgageResult({
			result,
			remainingTermMonths: Number.parseInt(remainingTerm, 10),
			fixedPeriodMonths,
			shareState: {
				type: "rmb",
				outstandingBalance,
				propertyValue,
				currentRate,
				remainingTerm,
				newRate,
				rateInputMode,
				berRating,
				legalFees,
				cashback,
				erc,
				fixedPeriodYears,
			},
		});
	}, [
		isFormComplete,
		outstandingBalanceNum,
		currentRate,
		newRate,
		remainingTerm,
		legalFees,
		cashback,
		erc,
		outstandingBalance,
		propertyValue,
		rateInputMode,
		berRating,
		fixedPeriodYears,
	]);

	// Auto-calculate when loaded from shared URL
	useEffect(() => {
		if (shouldAutoCalculate && isFormComplete) {
			calculate();
			setShouldAutoCalculate(false);
		}
	}, [shouldAutoCalculate, isFormComplete, calculate]);

	return (
		<Card>
			<CardContent>
				<div className="mb-6">
					<CardTitle className="text-lg mb-1">Is Switching Worth It?</CardTitle>
					<CardDescription>
						Enter your current mortgage details and a new rate to see how
						quickly the savings will offset switching costs.
					</CardDescription>
				</div>

				<div className="space-y-6">
					{/* Current Mortgage Details */}
					<div className="grid gap-4 sm:grid-cols-2">
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
						</div>
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
								Typical: €1,200-€1,500
							</p>
						</div>
					</div>

					{/* New Interest Rate - Tab toggle between picker and manual */}
					<div className="space-y-3">
						<Label>New Interest Rate</Label>
						<Tabs
							value={rateInputMode}
							onValueChange={(v) => setRateInputMode(v as "picker" | "manual")}
						>
							<TabsList>
								<TabsTrigger value="picker">Choose from rates</TabsTrigger>
								<TabsTrigger value="manual">Enter manually</TabsTrigger>
							</TabsList>
							<TabsContent value="picker" className="mt-4 space-y-4">
								<div className="grid gap-4 sm:grid-cols-2">
									<MortgageTermSelector
										value={remainingTerm}
										onChange={setRemainingTerm}
										label="Remaining Term"
									/>
									<BerSelector value={berRating} onChange={setBerRating} />
								</div>
								<RatePicker
									value={newRate}
									onChange={setNewRate}
									mode="picker"
									ltv={ltv}
									buyerType="switcher-pdh"
									berRating={berRating}
									label=""
									onRateSelect={handleRateSelect}
									showViewAllRates
									isRemortgage
									propertyValue={propertyValue}
									mortgageAmount={outstandingBalance}
									mortgageTerm={remainingTerm}
								/>
							</TabsContent>
							<TabsContent value="manual" className="mt-4 space-y-4">
								<div className="grid gap-4 sm:grid-cols-2">
									<MortgageTermSelector
										value={remainingTerm}
										onChange={setRemainingTerm}
										label="Remaining Term"
									/>
									<div className="space-y-2">
										<Label htmlFor="newRate">Rate</Label>
										<div className="flex items-center gap-2">
											<Input
												id="newRate"
												type="text"
												inputMode="decimal"
												value={newRate}
												onChange={(e) => {
													const val = e.target.value;
													if (val === "" || /^\d*\.?\d*$/.test(val)) {
														setNewRate(val);
													}
												}}
												placeholder="e.g. 3.45"
											/>
											<span className="text-muted-foreground">%</span>
										</div>
									</div>
								</div>
								<div className="grid gap-4 sm:grid-cols-2">
									<div className="space-y-2 sm:col-span-2">
										<Label htmlFor="fixedPeriod">Rate Type</Label>
										<Select
											value={fixedPeriodYears}
											onValueChange={setFixedPeriodYears}
										>
											<SelectTrigger id="fixedPeriod">
												<SelectValue placeholder="Select rate type" />
											</SelectTrigger>
											<SelectContent>
												{FIXED_PERIOD_OPTIONS.map((opt) => (
													<SelectItem key={opt.value} value={opt.value}>
														{opt.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<p className="text-xs text-muted-foreground">
											Used to warn if breakeven exceeds fixed period
										</p>
									</div>
								</div>
							</TabsContent>
						</Tabs>
					</div>

					{/* Advanced Options - collapsible */}
					<Collapsible>
						<CollapsibleTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className="gap-1 px-2 [&[data-state=open]>svg]:rotate-180"
							>
								Advanced Options
								<ChevronDown className="h-4 w-4 transition-transform duration-200" />
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent>
							<div className="p-4 border rounded-lg bg-muted/30 mt-2">
								<div className="grid gap-4 sm:grid-cols-2">
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
											1-3% cashback reduces your net switching cost
										</p>
									</div>
									<div className="space-y-2">
										<Label htmlFor="erc">Early Repayment Charge (ERC)</Label>
										<Input
											id="erc"
											type="text"
											inputMode="numeric"
											placeholder="€0"
											value={formatCurrencyInput(erc)}
											onChange={(e) =>
												setErc(e.target.value.replace(/[^0-9]/g, ""))
											}
										/>
										<p className="text-xs text-muted-foreground">
											Check your terms for ERC on fixed rates
										</p>
									</div>
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
	);
}
