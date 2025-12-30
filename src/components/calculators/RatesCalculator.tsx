import { HelpCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { loadRatesForm, type RatesMode, saveRatesForm } from "@/lib/storage";
import {
	calculateStampDuty,
	ESTIMATED_LEGAL_FEES,
	formatCurrency,
	formatCurrencyInput,
	parseCurrency,
} from "@/lib/utils";
import { BerSelector } from "../selectors/BerSelector";
import { BuyerTypeSelector } from "../selectors/BuyerTypeSelector";
import { MortgageTermSelector } from "../selectors/MortgageTermSelector";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "../ui/tooltip";

type LtvRange = "below-50" | "50-80" | "80-90" | "above-90";

function getLtvRange(ltv: number): LtvRange {
	if (ltv < 50) return "below-50";
	if (ltv < 80) return "50-80";
	if (ltv <= 90) return "80-90";
	return "above-90";
}

export function RatesCalculator() {
	const [mode, setMode] = useState<RatesMode>("first-mortgage");
	const [propertyValue, setPropertyValue] = useState("");
	const [mortgageAmount, setMortgageAmount] = useState("");
	const [monthlyRepayment, setMonthlyRepayment] = useState("");
	const [mortgageTerm, setMortgageTerm] = useState("30");
	const [berRating, setBerRating] = useState("C1");
	const [buyerType, setBuyerType] = useState("ftb");

	const isRemortgage = mode === "remortgage";

	// Reset buyer type when switching modes (ftb not valid for remortgage)
	useEffect(() => {
		if (isRemortgage && buyerType === "ftb") {
			setBuyerType("mover");
		}
	}, [isRemortgage, buyerType]);

	// Load from localStorage on mount
	useEffect(() => {
		const saved = loadRatesForm();
		if (saved.mode) setMode(saved.mode);
		if (saved.propertyValue) setPropertyValue(saved.propertyValue);
		if (saved.mortgageAmount) setMortgageAmount(saved.mortgageAmount);
		if (saved.monthlyRepayment) setMonthlyRepayment(saved.monthlyRepayment);
		if (saved.mortgageTerm) setMortgageTerm(saved.mortgageTerm);
		if (saved.berRating) setBerRating(saved.berRating);
		if (saved.buyerType) setBuyerType(saved.buyerType);
	}, []);

	// Save to localStorage when form changes
	useEffect(() => {
		saveRatesForm({
			mode,
			propertyValue,
			mortgageAmount,
			monthlyRepayment,
			mortgageTerm,
			berRating,
			buyerType,
		});
	}, [
		mode,
		propertyValue,
		mortgageAmount,
		monthlyRepayment,
		mortgageTerm,
		berRating,
		buyerType,
	]);

	// Calculated values
	const property = parseCurrency(propertyValue);
	const mortgage = parseCurrency(mortgageAmount);
	const deposit = property > 0 ? property - mortgage : 0;
	const ltv = property > 0 ? (mortgage / property) * 100 : 0;
	const ltvRange = getLtvRange(ltv);
	const stampDuty = calculateStampDuty(property);
	const legalFees = ESTIMATED_LEGAL_FEES;

	const compare = () => {
		// TODO: Navigate to results or filter rates
		console.log("Compare rates", {
			property,
			deposit,
			mortgage,
			ltv,
			mortgageTerm,
			berRating,
			buyerType,
		});
	};

	return (
		<TooltipProvider>
			<Tabs
				value={mode}
				onValueChange={(value) => setMode(value as RatesMode)}
				className="w-full"
			>
				<TabsList className="mb-3">
					<TabsTrigger value="first-mortgage">First Mortgage</TabsTrigger>
					<TabsTrigger value="remortgage">Mortgage Switch</TabsTrigger>
				</TabsList>
			</Tabs>
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
										value={formatCurrencyInput(propertyValue)}
										onChange={(e) =>
											setPropertyValue(e.target.value.replace(/[^0-9]/g, ""))
										}
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
										value={formatCurrencyInput(mortgageAmount)}
										onChange={(e) =>
											setMortgageAmount(e.target.value.replace(/[^0-9]/g, ""))
										}
									/>
								</div>
							</div>
							{/* Mobile Row 2: Deposit/Monthly Repayment, LTV - shown inline on lg */}
							<div className="flex gap-3 flex-1">
								{isRemortgage ? (
									<div className="space-y-1 flex-1">
										<Label htmlFor="monthlyRepayment" className="text-xs">
											Current Monthly Repayment
										</Label>
										<Input
											id="monthlyRepayment"
											type="text"
											inputMode="numeric"
											placeholder="€1,500"
											className="h-9"
											value={formatCurrencyInput(monthlyRepayment)}
											onChange={(e) =>
												setMonthlyRepayment(
													e.target.value.replace(/[^0-9]/g, ""),
												)
											}
										/>
									</div>
								) : (
									<div className="space-y-1 flex-1">
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
								<div className="space-y-1 w-20 lg:w-24">
									<Label htmlFor="ltvRange" className="text-xs">
										LTV
									</Label>
									<Input
										id="ltvRange"
										type="text"
										className={`h-9 bg-muted ${ltvRange === "above-90" ? "text-destructive" : ""}`}
										value={property > 0 ? `${ltv.toFixed(0)}%` : "—"}
										disabled
									/>
								</div>
							</div>
						</div>

						{/* Mobile Row 3: Buyer Type / Remortgage Type (alone) */}
						<div className="lg:hidden">
							<div className="space-y-1">
								<Label htmlFor="buyerTypeMobile" className="text-xs">
									{isRemortgage ? "Remortgage Type" : "Buyer Type"}
								</Label>
								<BuyerTypeSelector
									value={buyerType}
									onChange={setBuyerType}
									id="buyerTypeMobile"
									compact
									variant={isRemortgage ? "remortgage" : "purchase"}
								/>
							</div>
						</div>

						{/* Row 2 (lg) / Row 4 (mobile): Buyer Type / Remortgage Type, Term, BER, Compare */}
						<div className="flex gap-3 items-end">
							<div className="hidden lg:block space-y-1 flex-[1.5]">
								<Label htmlFor="buyerType" className="text-xs">
									{isRemortgage ? "Remortgage Type" : "Buyer Type"}
								</Label>
								<BuyerTypeSelector
									value={buyerType}
									onChange={setBuyerType}
									id="buyerType"
									compact
									variant={isRemortgage ? "remortgage" : "purchase"}
								/>
							</div>
							<div className="space-y-1 flex-1">
								<Label htmlFor="mortgageTerm" className="text-xs">
									Term
								</Label>
								<MortgageTermSelector
									value={mortgageTerm}
									onChange={setMortgageTerm}
									id="mortgageTerm"
									compact
								/>
							</div>
							<div className="space-y-1 flex-1">
								<Label htmlFor="berRating" className="text-xs">
									BER
								</Label>
								<BerSelector
									value={berRating}
									onChange={setBerRating}
									id="berRating"
									compact
								/>
							</div>
							<Button
								onClick={compare}
								className="h-9 flex-1"
								disabled={property <= 0 || mortgage <= 0}
							>
								Compare
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</TooltipProvider>
	);
}
