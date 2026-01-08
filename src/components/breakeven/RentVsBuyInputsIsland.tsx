import { useCallback, useEffect, useState } from "react";
import { DEFAULT_BER, DEFAULT_TERM_MONTHS } from "@/lib/constants";
import {
	calculateRentVsBuyBreakeven,
	DEFAULT_HOME_APPRECIATION,
	DEFAULT_MAINTENANCE_RATE,
	DEFAULT_OPPORTUNITY_COST_RATE,
	DEFAULT_RENT_INFLATION,
	DEFAULT_SALE_COST_RATE,
	DEFAULT_SERVICE_CHARGE,
	DEFAULT_SERVICE_CHARGE_INCREASE,
} from "@/lib/mortgage/breakeven";
import {
	clearBreakevenShareParam,
	hasBreakevenShareParam,
	parseBreakevenShareState,
} from "@/lib/share";
import { loadRentVsBuyForm, saveRentVsBuyForm } from "@/lib/storage";
import { showRentVsBuyResult } from "@/lib/stores";
import {
	formatCurrency,
	formatCurrencyInput,
	parseCurrency,
} from "@/lib/utils";
import { calculateStampDuty, ESTIMATED_LEGAL_FEES } from "@/lib/utils/fees";
import { RatePicker } from "../rates/RatePicker";
import { BerSelector } from "../selectors/BerSelector";
import { MortgageTermSelector } from "../selectors/MortgageTermSelector";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

export function RentVsBuyInputsIsland() {
	// Form state
	const [propertyValue, setPropertyValue] = useState("");
	const [deposit, setDeposit] = useState("");
	const [mortgageTerm, setMortgageTerm] = useState(
		DEFAULT_TERM_MONTHS.toString(),
	);
	const [interestRate, setInterestRate] = useState("");
	// Rate input mode is UI-only state, always defaults to "manual" on load
	const [rateInputMode, setRateInputMode] = useState<"picker" | "manual">(
		"manual",
	);
	const [berRating, setBerRating] = useState(DEFAULT_BER);
	const [currentRent, setCurrentRent] = useState("");
	const [legalFees, setLegalFees] = useState(ESTIMATED_LEGAL_FEES.toString());

	// Advanced options (always visible below calculate)
	const [rentInflation, setRentInflation] = useState(
		DEFAULT_RENT_INFLATION.toString(),
	);
	const [homeAppreciation, setHomeAppreciation] = useState(
		DEFAULT_HOME_APPRECIATION.toString(),
	);
	const [maintenanceRate, setMaintenanceRate] = useState(
		DEFAULT_MAINTENANCE_RATE.toString(),
	);
	const [opportunityCost, setOpportunityCost] = useState(
		DEFAULT_OPPORTUNITY_COST_RATE.toString(),
	);
	const [saleCost, setSaleCost] = useState(DEFAULT_SALE_COST_RATE.toString());
	const [serviceCharge, setServiceCharge] = useState(
		DEFAULT_SERVICE_CHARGE.toString(),
	);
	const [serviceChargeIncrease, setServiceChargeIncrease] = useState(
		DEFAULT_SERVICE_CHARGE_INCREASE.toString(),
	);

	// Auto-calculate flag
	const [shouldAutoCalculate, setShouldAutoCalculate] = useState(false);

	// Computed values
	const propertyValueNum = parseCurrency(propertyValue);
	const depositNum = parseCurrency(deposit);
	const mortgageAmount = propertyValueNum - depositNum;
	const ltv =
		propertyValueNum > 0 ? (mortgageAmount / propertyValueNum) * 100 : 0;

	// Load from shared URL or localStorage on mount
	useEffect(() => {
		// Check for shared URL first
		if (hasBreakevenShareParam()) {
			const shared = parseBreakevenShareState();
			if (shared && shared.type === "rvb") {
				setPropertyValue(shared.propertyValue);
				setDeposit(shared.deposit);
				if (shared.mortgageTerm) setMortgageTerm(shared.mortgageTerm);
				setInterestRate(shared.interestRate);
				if (shared.berRating) setBerRating(shared.berRating);
				setCurrentRent(shared.currentRent);
				setLegalFees(shared.legalFees);
				if (shared.rentInflation) setRentInflation(shared.rentInflation);
				if (shared.homeAppreciation)
					setHomeAppreciation(shared.homeAppreciation);
				if (shared.maintenanceRate) setMaintenanceRate(shared.maintenanceRate);
				if (shared.opportunityCost) setOpportunityCost(shared.opportunityCost);
				if (shared.saleCost) setSaleCost(shared.saleCost);
				if (shared.serviceCharge) setServiceCharge(shared.serviceCharge);
				if (shared.serviceChargeIncrease)
					setServiceChargeIncrease(shared.serviceChargeIncrease);
				clearBreakevenShareParam();
				setShouldAutoCalculate(true);
				return;
			}
		}

		// Fall back to localStorage
		const saved = loadRentVsBuyForm();
		if (saved.propertyValue) setPropertyValue(saved.propertyValue);
		if (saved.deposit) setDeposit(saved.deposit);
		if (saved.mortgageTerm) setMortgageTerm(saved.mortgageTerm);
		if (saved.interestRate) setInterestRate(saved.interestRate);
		if (saved.berRating) setBerRating(saved.berRating);
		if (saved.currentRent) setCurrentRent(saved.currentRent);
		if (saved.legalFees) setLegalFees(saved.legalFees);
		if (saved.rentInflation) setRentInflation(saved.rentInflation);
		if (saved.homeAppreciation) setHomeAppreciation(saved.homeAppreciation);
		if (saved.maintenanceRate) setMaintenanceRate(saved.maintenanceRate);
		if (saved.opportunityCost) setOpportunityCost(saved.opportunityCost);
		if (saved.saleCost) setSaleCost(saved.saleCost);
		if (saved.serviceCharge) setServiceCharge(saved.serviceCharge);
		if (saved.serviceChargeIncrease)
			setServiceChargeIncrease(saved.serviceChargeIncrease);
	}, []);

	// Save to localStorage when form changes
	useEffect(() => {
		saveRentVsBuyForm({
			propertyValue,
			deposit,
			mortgageTerm,
			interestRate,
			berRating,
			currentRent,
			legalFees,
			rentInflation,
			homeAppreciation,
			maintenanceRate,
			opportunityCost,
			saleCost,
			serviceCharge,
			serviceChargeIncrease,
		});
	}, [
		propertyValue,
		deposit,
		mortgageTerm,
		interestRate,
		berRating,
		currentRent,
		legalFees,
		rentInflation,
		homeAppreciation,
		maintenanceRate,
		opportunityCost,
		saleCost,
		serviceCharge,
		serviceChargeIncrease,
	]);

	// Validation
	const hasPropertyValue = propertyValueNum > 0;
	const hasDeposit = depositNum > 0;
	const hasValidDeposit = depositNum <= propertyValueNum;
	const hasInterestRate =
		interestRate !== "" && Number.parseFloat(interestRate) > 0;
	const hasRent = parseCurrency(currentRent) > 0;

	const isFormComplete =
		hasPropertyValue &&
		hasDeposit &&
		hasValidDeposit &&
		hasInterestRate &&
		hasRent;

	const calculate = useCallback(() => {
		if (!isFormComplete) return;

		const result = calculateRentVsBuyBreakeven({
			propertyValue: propertyValueNum,
			deposit: depositNum,
			mortgageTermMonths: Number.parseInt(mortgageTerm, 10),
			mortgageRate: Number.parseFloat(interestRate),
			currentMonthlyRent: parseCurrency(currentRent),
			legalFees: Number.parseFloat(legalFees) || ESTIMATED_LEGAL_FEES,
			rentInflationRate: rentInflation ? Number.parseFloat(rentInflation) : 0,
			homeAppreciationRate: homeAppreciation
				? Number.parseFloat(homeAppreciation)
				: 0,
			maintenanceRate: maintenanceRate ? Number.parseFloat(maintenanceRate) : 0,
			opportunityCostRate: opportunityCost
				? Number.parseFloat(opportunityCost)
				: 0,
			saleCostRate: saleCost ? Number.parseFloat(saleCost) : 0,
			serviceCharge: serviceCharge ? parseCurrency(serviceCharge) : 0,
			serviceChargeIncrease: serviceChargeIncrease
				? Number.parseFloat(serviceChargeIncrease)
				: 0,
		});

		// Store the result and open the dialog via the shared store
		showRentVsBuyResult({
			result,
			monthlyRent: parseCurrency(currentRent),
			saleCostRate: saleCost ? Number.parseFloat(saleCost) : 0,
			shareState: {
				type: "rvb",
				propertyValue,
				deposit,
				mortgageTerm,
				interestRate,
				berRating,
				currentRent,
				legalFees,
				rentInflation,
				homeAppreciation,
				maintenanceRate,
				opportunityCost,
				saleCost,
				serviceCharge,
				serviceChargeIncrease,
			},
		});
	}, [
		isFormComplete,
		propertyValueNum,
		depositNum,
		mortgageTerm,
		interestRate,
		currentRent,
		legalFees,
		rentInflation,
		homeAppreciation,
		maintenanceRate,
		opportunityCost,
		saleCost,
		serviceCharge,
		serviceChargeIncrease,
		propertyValue,
		deposit,
		berRating,
	]);

	// Auto-calculate when loaded from shared URL
	useEffect(() => {
		if (shouldAutoCalculate && isFormComplete) {
			calculate();
			setShouldAutoCalculate(false);
		}
	}, [shouldAutoCalculate, isFormComplete, calculate]);

	// Auto-calculate deposit as 10% of property value
	const handlePropertyValueChange = (value: string) => {
		const cleanValue = value.replace(/[^0-9]/g, "");
		setPropertyValue(cleanValue);

		// Auto-fill deposit at 10% if deposit is empty
		if (!deposit) {
			const propValue = parseCurrency(cleanValue);
			if (propValue > 0) {
				setDeposit(Math.round(propValue * 0.1).toString());
			}
		}
	};

	return (
		<Card>
			<CardContent>
				<div className="mb-6">
					<CardTitle className="text-lg mb-1">Should I Rent or Buy?</CardTitle>
					<CardDescription>
						Compare the long-term costs of renting versus buying a home. Factor
						in rent increases, home appreciation, and building equity.
					</CardDescription>
				</div>

				<div className="space-y-6">
					{/* Property and Deposit Details */}
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="propertyValue">Property Value</Label>
							<Input
								id="propertyValue"
								type="text"
								inputMode="numeric"
								placeholder="€350,000"
								value={formatCurrencyInput(propertyValue)}
								onChange={(e) => handlePropertyValueChange(e.target.value)}
							/>
							{hasPropertyValue && (
								<p className="text-xs text-muted-foreground">
									Stamp Duty:{" "}
									{formatCurrency(calculateStampDuty(propertyValueNum))}
								</p>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="deposit">Deposit (excl. fees)</Label>
							<Input
								id="deposit"
								type="text"
								inputMode="numeric"
								placeholder="€35,000"
								value={formatCurrencyInput(deposit)}
								onChange={(e) =>
									setDeposit(e.target.value.replace(/[^0-9]/g, ""))
								}
							/>
							{hasPropertyValue && hasDeposit && (
								<p className="text-xs text-muted-foreground">
									LTV: {ltv.toFixed(1)}% (Mortgage:{" "}
									{formatCurrency(mortgageAmount)})
								</p>
							)}
							{hasDeposit && !hasValidDeposit && (
								<p className="text-xs text-destructive">
									Deposit cannot exceed property value
								</p>
							)}
						</div>
					</div>

					{/* Current Rent and Legal Fees */}
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="currentRent">Current Monthly Rent</Label>
							<Input
								id="currentRent"
								type="text"
								inputMode="numeric"
								placeholder="€2,000"
								value={formatCurrencyInput(currentRent)}
								onChange={(e) =>
									setCurrentRent(e.target.value.replace(/[^0-9]/g, ""))
								}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="legalFees">Estimated Legal Fees</Label>
							<Input
								id="legalFees"
								type="text"
								inputMode="numeric"
								placeholder="€4,000"
								value={formatCurrencyInput(legalFees)}
								onChange={(e) =>
									setLegalFees(e.target.value.replace(/[^0-9]/g, ""))
								}
							/>
							<p className="text-xs text-muted-foreground">
								Typical: €3,000-€5,000
							</p>
						</div>
					</div>

					{/* Interest Rate - Tab toggle between picker and manual */}
					<div className="space-y-3">
						<Label>Interest Rate</Label>
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
										value={mortgageTerm}
										onChange={setMortgageTerm}
									/>
									<BerSelector value={berRating} onChange={setBerRating} />
								</div>
								<RatePicker
									value={interestRate}
									onChange={setInterestRate}
									mode="picker"
									onModeChange={() => {}}
									ltv={ltv}
									buyerType="ftb"
									berRating={berRating}
									label=""
									showViewAllRates
									propertyValue={propertyValue}
									mortgageAmount={String(mortgageAmount)}
									mortgageTerm={mortgageTerm}
								/>
								<p className="text-xs text-muted-foreground">
									These rates are for illustrative purposes only. When your
									fixed rate period ends, you'll need to remortgage to secure a
									new fixed rate and avoid reverting to a potentially higher
									variable rate. See our{" "}
									<a
										href="/breakeven/remortgage"
										className="text-primary hover:underline"
									>
										Remortgage Calculator
									</a>{" "}
									to evaluate switching.
								</p>
							</TabsContent>
							<TabsContent value="manual" className="mt-4">
								<div className="grid gap-4 sm:grid-cols-2">
									<MortgageTermSelector
										value={mortgageTerm}
										onChange={setMortgageTerm}
									/>
									<div className="space-y-2">
										<Label htmlFor="interestRate">Rate</Label>
										<div className="flex items-center gap-2">
											<Input
												id="interestRate"
												type="text"
												inputMode="decimal"
												value={interestRate}
												onChange={(e) => {
													const val = e.target.value;
													if (val === "" || /^\d*\.?\d*$/.test(val)) {
														setInterestRate(val);
													}
												}}
												placeholder="e.g. 3.45"
											/>
											<span className="text-muted-foreground">%</span>
										</div>
									</div>
								</div>
							</TabsContent>
						</Tabs>
					</div>

					{/* Calculate Button */}
					<Button
						onClick={calculate}
						disabled={!isFormComplete}
						className="w-full"
						size="lg"
					>
						Calculate Breakeven
					</Button>

					{/* Advanced Options - always visible */}
					<div className="space-y-4">
						<p className="text-sm font-medium">Advanced Options</p>
						<div className="space-y-4">
							{/* If Renting Card */}
							<div className="p-4 border rounded-lg bg-muted/30">
								<p className="text-xs font-medium text-muted-foreground mb-3">
									If Renting
								</p>
								<div className="grid gap-4 sm:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="rentInflation">Annual Rent Increase</Label>
										<div className="flex items-center gap-2">
											<Input
												id="rentInflation"
												type="text"
												inputMode="decimal"
												placeholder="2"
												value={rentInflation}
												onChange={(e) => {
													const val = e.target.value;
													if (val === "" || /^\d*\.?\d*$/.test(val)) {
														setRentInflation(val);
													}
												}}
											/>
											<span className="text-muted-foreground">%</span>
										</div>
									</div>
									<div className="space-y-2">
										<Label htmlFor="opportunityCost">Investment Return</Label>
										<div className="flex items-center gap-2">
											<Input
												id="opportunityCost"
												type="text"
												inputMode="decimal"
												placeholder="4"
												value={opportunityCost}
												onChange={(e) => {
													const val = e.target.value;
													if (val === "" || /^\d*\.?\d*$/.test(val)) {
														setOpportunityCost(val);
													}
												}}
											/>
											<span className="text-muted-foreground">%</span>
										</div>
										<p className="text-xs text-muted-foreground">
											Post-tax return (account for CGT)
										</p>
									</div>
								</div>
							</div>

							{/* If Buying Card */}
							<div className="p-4 border rounded-lg bg-muted/30">
								<p className="text-xs font-medium text-muted-foreground mb-3">
									If Buying
								</p>
								<div className="space-y-4">
									<div className="grid gap-4 sm:grid-cols-3">
										<div className="space-y-2">
											<Label htmlFor="homeAppreciation">
												Home Appreciation
											</Label>
											<div className="flex items-center gap-2">
												<Input
													id="homeAppreciation"
													type="text"
													inputMode="decimal"
													placeholder="2"
													value={homeAppreciation}
													onChange={(e) => {
														const val = e.target.value;
														if (val === "" || /^\d*\.?\d*$/.test(val)) {
															setHomeAppreciation(val);
														}
													}}
												/>
												<span className="text-muted-foreground">%</span>
											</div>
											<p className="text-xs text-muted-foreground">
												Tax-free for primary residence
											</p>
										</div>
										<div className="space-y-2">
											<Label htmlFor="maintenanceRate">Maintenance</Label>
											<div className="flex items-center gap-2">
												<Input
													id="maintenanceRate"
													type="text"
													inputMode="decimal"
													placeholder="1"
													value={maintenanceRate}
													onChange={(e) => {
														const val = e.target.value;
														if (val === "" || /^\d*\.?\d*$/.test(val)) {
															setMaintenanceRate(val);
														}
													}}
												/>
												<span className="text-muted-foreground">%</span>
											</div>
										</div>
										<div className="space-y-2">
											<Label htmlFor="saleCost">Sale Costs</Label>
											<div className="flex items-center gap-2">
												<Input
													id="saleCost"
													type="text"
													inputMode="decimal"
													placeholder="3"
													value={saleCost}
													onChange={(e) => {
														const val = e.target.value;
														if (val === "" || /^\d*\.?\d*$/.test(val)) {
															setSaleCost(val);
														}
													}}
												/>
												<span className="text-muted-foreground">%</span>
											</div>
										</div>
									</div>
									<div className="grid gap-4 sm:grid-cols-2">
										<div className="space-y-2">
											<Label htmlFor="serviceCharge">Service Charge</Label>
											<Input
												id="serviceCharge"
												type="text"
												inputMode="decimal"
												placeholder="0"
												value={serviceCharge}
												onChange={(e) =>
													setServiceCharge(formatCurrencyInput(e.target.value))
												}
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="serviceChargeIncrease">
												Service Charge Annual Increase
											</Label>
											<div className="flex items-center gap-2">
												<Input
													id="serviceChargeIncrease"
													type="text"
													inputMode="decimal"
													placeholder="0"
													value={serviceChargeIncrease}
													onChange={(e) => {
														const val = e.target.value;
														if (val === "" || /^\d*\.?\d*$/.test(val)) {
															setServiceChargeIncrease(val);
														}
													}}
												/>
												<span className="text-muted-foreground">%</span>
											</div>
										</div>
									</div>
									<p className="text-xs text-muted-foreground">
										Service charges are typically for apartments/managed
										developments.
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
