import { AlertCircle, HelpCircle, Info, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { BerRating, RatesMode } from "@/lib/constants";
import type { Lender } from "@/lib/schemas";
import type { RatesInputValues } from "@/lib/stores";
import {
	calculateStampDuty,
	ESTIMATED_LEGAL_FEES,
	formatCurrency,
	formatCurrencyInput,
} from "@/lib/utils";
import { LenderOption } from "../lenders";
import { BerSelector } from "../selectors/BerSelector";
import { BuyerTypeSelector } from "../selectors/BuyerTypeSelector";
import { MortgageTermSelector } from "../selectors/MortgageTermSelector";
import { GlossaryTermTooltip } from "../tooltips";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "../ui/tooltip";

export interface RatesInputProps {
	values: RatesInputValues;
	onChange: (values: RatesInputValues) => void;
	lenders: Lender[];
	// Computed values passed from parent
	deposit: number;
	ltv: number;
	isFormValid: boolean;
	hasError: boolean;
	hasWarning: boolean;
	errorMessage?: string;
	warningMessage?: string;
}

type LtvRange = "below-50" | "50-80" | "80-90" | "above-90";

function getLtvRange(ltv: number): LtvRange {
	if (ltv < 50) return "below-50";
	if (ltv < 80) return "50-80";
	if (ltv <= 90) return "80-90";
	return "above-90";
}

export function RatesInput({
	values,
	onChange,
	lenders,
	deposit,
	ltv,
	isFormValid,
	hasError,
	hasWarning,
	errorMessage,
	warningMessage,
}: RatesInputProps) {
	const {
		mode,
		propertyValue,
		mortgageAmount,
		monthlyRepayment,
		mortgageTerm,
		berRating,
		buyerType,
		currentLender,
	} = values;

	const isRemortgage = mode === "remortgage";
	const ltvRange = getLtvRange(ltv);
	const property = Number(propertyValue) || 0;
	const stampDuty = calculateStampDuty(property);
	const legalFees = ESTIMATED_LEGAL_FEES;

	// Local state for currency inputs (update parent on blur)
	const [localPropertyValue, setLocalPropertyValue] = useState(propertyValue);
	const [localMortgageAmount, setLocalMortgageAmount] =
		useState(mortgageAmount);
	const [localMonthlyRepayment, setLocalMonthlyRepayment] =
		useState(monthlyRepayment);

	// Track which field is focused to avoid overwriting while typing
	const focusedField = useRef<string | null>(null);

	// Sync local state from props when not focused
	useEffect(() => {
		if (focusedField.current !== "propertyValue") {
			setLocalPropertyValue(propertyValue);
		}
	}, [propertyValue]);

	useEffect(() => {
		if (focusedField.current !== "mortgageAmount") {
			setLocalMortgageAmount(mortgageAmount);
		}
	}, [mortgageAmount]);

	useEffect(() => {
		if (focusedField.current !== "monthlyRepayment") {
			setLocalMonthlyRepayment(monthlyRepayment);
		}
	}, [monthlyRepayment]);

	const updateField = <K extends keyof RatesInputValues>(
		field: K,
		value: RatesInputValues[K],
	) => {
		onChange({ ...values, [field]: value });
	};

	return (
		<TooltipProvider>
			<div className="mb-3">
				<Tabs
					value={mode}
					onValueChange={(value) => updateField("mode", value as RatesMode)}
				>
					<TabsList>
						<TabsTrigger value="first-mortgage">First Mortgage</TabsTrigger>
						<TabsTrigger value="remortgage">Mortgage Switch</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>
			<Card>
				<CardContent className="py-2">
					<div className="flex flex-col gap-3">
						{/* Row 1: Property Value, Mortgage Amount / Outstanding Balance */}
						<div className="flex flex-col lg:flex-row gap-3">
							<div className="flex gap-3 flex-1">
								<div className="space-y-1 flex-1">
									<Label htmlFor="propertyValue" className="text-xs">
										{isRemortgage ? "Current Property Value" : "Property Value"}
									</Label>
									<Input
										id="propertyValue"
										type="text"
										inputMode="numeric"
										placeholder="€350,000"
										className="h-9"
										value={formatCurrencyInput(localPropertyValue)}
										onFocus={() => {
											focusedField.current = "propertyValue";
										}}
										onChange={(e) =>
											setLocalPropertyValue(
												e.target.value.replace(/[^0-9]/g, ""),
											)
										}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												focusedField.current = null;
												updateField("propertyValue", localPropertyValue);
											}
										}}
										onBlur={() => {
											focusedField.current = null;
											updateField("propertyValue", localPropertyValue);
										}}
									/>
								</div>
								<div className="space-y-1 flex-1">
									<Label htmlFor="mortgageAmount" className="text-xs">
										{isRemortgage ? "Outstanding Balance" : "Mortgage Amount"}
									</Label>
									<Input
										id="mortgageAmount"
										type="text"
										inputMode="numeric"
										placeholder="€315,000"
										className="h-9"
										value={formatCurrencyInput(localMortgageAmount)}
										onFocus={() => {
											focusedField.current = "mortgageAmount";
										}}
										onChange={(e) =>
											setLocalMortgageAmount(
												e.target.value.replace(/[^0-9]/g, ""),
											)
										}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												focusedField.current = null;
												updateField("mortgageAmount", localMortgageAmount);
											}
										}}
										onBlur={() => {
											focusedField.current = null;
											updateField("mortgageAmount", localMortgageAmount);
										}}
									/>
									<div className="flex gap-1 pt-0.5">
										{(isRemortgage
											? [25, 50, 60, 70, 80]
											: [50, 70, 80, 90]
										).map((pct) => {
											const newAmount = String(
												Math.round(property * (pct / 100)),
											);
											return (
												<Button
													key={pct}
													type="button"
													variant="ghost"
													disabled={property === 0}
													onClick={() => {
														setLocalMortgageAmount(newAmount);
														updateField("mortgageAmount", newAmount);
													}}
													className="h-5 px-1.5 text-[10px] text-muted-foreground"
												>
													{pct}%
												</Button>
											);
										})}
									</div>
								</div>
							</div>
							{/* Mobile Row 2: Deposit/Monthly Repayment, LTV - shown inline on lg */}
							<div className="flex gap-3 flex-1">
								{isRemortgage ? (
									<div className="space-y-1 flex-2">
										<Label htmlFor="monthlyRepayment" className="text-xs">
											Current Monthly Repayment
										</Label>
										<Input
											id="monthlyRepayment"
											type="text"
											inputMode="numeric"
											placeholder="€1,500"
											className="h-9"
											value={formatCurrencyInput(localMonthlyRepayment)}
											onFocus={() => {
												focusedField.current = "monthlyRepayment";
											}}
											onChange={(e) =>
												setLocalMonthlyRepayment(
													e.target.value.replace(/[^0-9]/g, ""),
												)
											}
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													focusedField.current = null;
													updateField(
														"monthlyRepayment",
														localMonthlyRepayment,
													);
												}
											}}
											onBlur={() => {
												focusedField.current = null;
												updateField("monthlyRepayment", localMonthlyRepayment);
											}}
										/>
									</div>
								) : (
									<div className="space-y-1 flex-2">
										<div className="flex items-center gap-1">
											<Label htmlFor="deposit" className="text-xs">
												Deposit
											</Label>
											<Tooltip>
												<TooltipTrigger asChild>
													<button
														type="button"
														className="text-muted-foreground hover:text-foreground"
													>
														<HelpCircle className="h-3 w-3" />
													</button>
												</TooltipTrigger>
												<TooltipContent className="max-w-xs">
													<p className="font-medium mb-2">Additional costs:</p>
													<div className="space-y-1 text-sm">
														<div className="flex justify-between gap-4">
															<span>Stamp Duty:</span>
															<span className="font-medium">
																{formatCurrency(stampDuty)}
															</span>
														</div>
														<div className="flex justify-between gap-4">
															<span>Legal Fees:</span>
															<span className="font-medium">
																{formatCurrency(legalFees)}
															</span>
														</div>
														<div className="flex justify-between gap-4 pt-1 border-t">
															<span>Total Fees:</span>
															<span className="font-medium">
																{formatCurrency(stampDuty + legalFees)}
															</span>
														</div>
													</div>
													{deposit > 0 && (
														<div className="mt-2 pt-2 border-t text-sm">
															<div className="flex justify-between gap-4">
																<span>Total Cash Required:</span>
																<span className="font-medium">
																	{formatCurrency(
																		deposit + stampDuty + legalFees,
																	)}
																</span>
															</div>
														</div>
													)}
												</TooltipContent>
											</Tooltip>
										</div>
										<Input
											id="deposit"
											type="text"
											className="h-9 bg-muted"
											value={deposit > 0 ? formatCurrency(deposit) : "—"}
											disabled
										/>
									</div>
								)}
								<div className="space-y-1 flex-1">
									<div className="flex items-center gap-1">
										<Label htmlFor="ltvRange" className="text-xs">
											LTV
										</Label>
										<GlossaryTermTooltip termId="ltv" size="sm" />
									</div>
									<Input
										id="ltvRange"
										type="text"
										className={`h-9 bg-muted ${ltvRange === "above-90" ? "text-destructive" : ""}`}
										value={property > 0 ? `${ltv.toFixed(2)}%` : "—"}
										disabled
									/>
								</div>
							</div>
						</div>

						{/* Mobile Row 3: Buyer Type / Remortgage Type */}
						<div className="lg:hidden">
							{isRemortgage ? (
								<div className="space-y-1">
									<Label htmlFor="buyerTypeMobile" className="text-xs">
										Remortgage Type
									</Label>
									<BuyerTypeSelector
										value={buyerType}
										onChange={(v) => updateField("buyerType", v)}
										id="buyerTypeMobile"
										compact
										variant="remortgage"
									/>
								</div>
							) : (
								<div className="space-y-1">
									<Label htmlFor="buyerTypeMobile" className="text-xs">
										Buyer Type
									</Label>
									<BuyerTypeSelector
										value={buyerType}
										onChange={(v) => updateField("buyerType", v)}
										id="buyerTypeMobile"
										compact
										variant="purchase"
									/>
								</div>
							)}
						</div>

						{/* Row 4: Term, BER (+ Buyer Type/Remortgage Type + Current Lender on desktop) */}
						<div className="flex flex-wrap gap-3 items-end">
							{isRemortgage ? (
								<>
									<div className="hidden lg:block space-y-1 flex-1">
										<Label htmlFor="buyerType" className="text-xs">
											Remortgage Type
										</Label>
										<BuyerTypeSelector
											value={buyerType}
											onChange={(v) => updateField("buyerType", v)}
											id="buyerType"
											compact
											variant="remortgage"
										/>
									</div>
									<div className="space-y-1 w-full lg:w-auto lg:flex-1">
										<Label htmlFor="currentLender" className="text-xs">
											Current Lender
										</Label>
										<Select
											value={currentLender}
											onValueChange={(v) => updateField("currentLender", v)}
										>
											<SelectTrigger id="currentLender" className="h-9 w-full">
												<SelectValue placeholder="Select lender" />
											</SelectTrigger>
											<SelectContent>
												{lenders.map((lender) => (
													<SelectItem key={lender.id} value={lender.id}>
														<LenderOption
															lenderId={lender.id}
															name={lender.name}
														/>
													</SelectItem>
												))}
												<SelectItem value="other">Other</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</>
							) : (
								<div className="hidden lg:block space-y-1 flex-[1.5]">
									<Label htmlFor="buyerType" className="text-xs">
										Buyer Type
									</Label>
									<BuyerTypeSelector
										value={buyerType}
										onChange={(v) => updateField("buyerType", v)}
										id="buyerType"
										compact
										variant="purchase"
									/>
								</div>
							)}
							<div className="space-y-1 flex-1">
								<Label htmlFor="mortgageTerm" className="text-xs">
									{isRemortgage ? "Remaining Term" : "Term"}
								</Label>
								<MortgageTermSelector
									value={mortgageTerm}
									onChange={(v) => updateField("mortgageTerm", v)}
									id="mortgageTerm"
									compact
								/>
							</div>
							<div className="space-y-1 flex-1">
								<Label htmlFor="berRating" className="text-xs">
									BER
								</Label>
								<BerSelector
									value={berRating as BerRating}
									onChange={(v) => updateField("berRating", v)}
									id="berRating"
									compact
								/>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Status alerts below the input card */}
			{hasError && errorMessage && (
				<Card className="bg-destructive/10 border-destructive/30">
					<CardContent className="py-3 flex items-center gap-3">
						<AlertCircle className="h-5 w-5 text-destructive shrink-0" />
						<p className="text-sm text-destructive">{errorMessage}</p>
					</CardContent>
				</Card>
			)}

			{hasWarning && !hasError && warningMessage && (
				<Card className="bg-amber-500/10 border-amber-500/30">
					<CardContent className="py-3 flex items-center gap-3">
						<TriangleAlert className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0" />
						<p className="text-sm text-amber-600 dark:text-amber-500">
							{warningMessage}
						</p>
					</CardContent>
				</Card>
			)}

			{!isFormValid && !hasError && !hasWarning && (
				<Card className="bg-blue-500/10 border-blue-500/30">
					<CardContent className="py-3 flex items-center gap-3">
						<Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
						<p className="text-sm text-blue-600 dark:text-blue-400">
							Enter your property details above to compare mortgage rates from
							Irish lenders.
						</p>
					</CardContent>
				</Card>
			)}
		</TooltipProvider>
	);
}
