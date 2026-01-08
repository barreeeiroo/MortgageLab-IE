/**
 * Breakeven calculations for rent vs buy and remortgage scenarios
 */

import {
	calculateStampDuty,
	ESTIMATED_LEGAL_FEES,
	ESTIMATED_REMORTGAGE_LEGAL_FEES,
} from "@/lib/utils/fees";
import { calculateMonthlyPayment } from "./payments";

// Default values for advanced options
export const DEFAULT_RENT_INFLATION = 2; // 2% per year
export const DEFAULT_HOME_APPRECIATION = 4; // 4% per year (Irish long-term avg ~2.6%, recent ~7%)
export const DEFAULT_MAINTENANCE_RATE = 1; // 1% of property value per year
export const DEFAULT_OPPORTUNITY_COST_RATE = 6; // 6% annual return on investments (S&P 500 real return)
export const DEFAULT_SALE_COST_RATE = 3; // 3% of sale price (agent fees, etc.)
export const DEFAULT_SERVICE_CHARGE = 0; // Monthly service charge (apartments)
export const DEFAULT_SERVICE_CHARGE_INCREASE = 0; // Annual increase in service charge

// --- Rent vs Buy Types ---

export interface RentVsBuyInputs {
	propertyValue: number;
	deposit: number;
	mortgageTermMonths: number; // Mortgage term in months
	mortgageRate: number; // Annual rate as percentage (e.g., 3.5 for 3.5%)
	currentMonthlyRent: number;
	legalFees?: number; // Default ESTIMATED_LEGAL_FEES, user-editable
	// Advanced options
	rentInflationRate?: number; // Default 2%
	homeAppreciationRate?: number; // Default 2%
	maintenanceRate?: number; // Default 1% of property value per year
	opportunityCostRate?: number; // Default 6%
	saleCostRate?: number; // Default 3% of sale price
	serviceCharge?: number; // Monthly service charge (apartments), default 0
	serviceChargeIncrease?: number; // Annual increase in service charge, default 0%
}

export interface YearlyComparison {
	year: number;
	cumulativeRent: number;
	cumulativeOwnership: number;
	homeValue: number;
	mortgageBalance: number;
	equity: number;
	netOwnershipCost: number; // ownership cost - equity built
}

// Details at each breakeven point for "Why" explanations
export interface NetWorthBreakevenDetails {
	cumulativeRent: number;
	netOwnershipCost: number;
	cumulativeOwnership: number;
	equity: number;
}

export interface SaleBreakevenDetails {
	homeValue: number;
	saleCosts: number;
	mortgageBalance: number;
	saleProceeds: number;
	upfrontCosts: number;
}

export interface EquityBreakevenDetails {
	homeValue: number;
	mortgageBalance: number;
	equity: number;
	upfrontCosts: number;
}

export interface RentVsBuyResult {
	// Multiple breakeven metrics
	breakevenMonth: number | null; // Net worth breakeven - null if never
	breakevenDetails: NetWorthBreakevenDetails | null;
	breakEvenOnSaleMonth: number | null; // When sale proceeds > upfront costs - null if never
	breakEvenOnSaleDetails: SaleBreakevenDetails | null;
	equityRecoveryMonth: number | null; // When equity > upfront costs - null if never
	equityRecoveryDetails: EquityBreakevenDetails | null;
	// Financial details
	monthlyMortgagePayment: number;
	mortgageAmount: number;
	deposit: number;
	stampDuty: number;
	legalFees: number;
	purchaseCosts: number; // stamp duty + legal fees
	upfrontCosts: number; // deposit + stamp duty + legal fees
	yearlyBreakdown: YearlyComparison[];
}

// --- Remortgage Types ---

export interface RemortgageInputs {
	outstandingBalance: number;
	currentRate: number; // Annual rate as percentage
	newRate: number; // Annual rate as percentage
	remainingTermMonths: number; // Remaining term in months
	legalFees?: number; // Default €1,350, user-editable
	// Advanced options
	cashback?: number; // Default €0
	erc?: number; // Early Repayment Charge, default €0
}

export interface RemortgageYearlyComparison {
	year: number;
	cumulativeSavings: number; // Monthly savings accumulated (gross)
	netSavings: number; // cumulativeSavings - switchingCosts
	remainingBalanceCurrent: number; // If stayed with current rate
	remainingBalanceNew: number; // With new rate
	interestPaidCurrent: number; // Cumulative interest (current path)
	interestPaidNew: number; // Cumulative interest (new path)
	interestSaved: number; // Difference
}

// Details at breakeven point for "Why" explanations
export interface RemortgageBreakevenDetails {
	monthlySavings: number;
	breakevenMonths: number;
	switchingCosts: number;
	cumulativeSavingsAtBreakeven: number;
}

// Details for total interest saved card
export interface InterestSavingsDetails {
	totalInterestCurrent: number; // Total interest if staying
	totalInterestNew: number; // Total interest if switching
	interestSaved: number; // Difference
	switchingCosts: number; // For net calculation
	netBenefit: number; // interestSaved - switchingCosts
}

export interface RemortgageResult {
	breakevenMonths: number;
	breakevenDetails: RemortgageBreakevenDetails | null;
	currentMonthlyPayment: number;
	newMonthlyPayment: number;
	monthlySavings: number;
	legalFees: number;
	cashback: number;
	erc: number;
	switchingCosts: number; // legalFees - cashback + erc
	totalSavingsOverTerm: number;
	yearOneSavings: number;
	// New fields for enhanced display
	interestSavingsDetails: InterestSavingsDetails;
	yearlyBreakdown: RemortgageYearlyComparison[];
}

// --- Rent vs Buy Calculations ---

/**
 * Calculate the breakeven point and comparison metrics for rent vs buy decision.
 *
 * The breakeven point is when the net cost of ownership (cumulative payments + upfront costs - equity)
 * becomes less than cumulative rent paid.
 */
export function calculateRentVsBuyBreakeven(
	inputs: RentVsBuyInputs,
): RentVsBuyResult {
	const {
		propertyValue,
		deposit,
		mortgageTermMonths,
		mortgageRate,
		currentMonthlyRent,
		legalFees = ESTIMATED_LEGAL_FEES,
		rentInflationRate = DEFAULT_RENT_INFLATION,
		homeAppreciationRate = DEFAULT_HOME_APPRECIATION,
		maintenanceRate = DEFAULT_MAINTENANCE_RATE,
		opportunityCostRate = DEFAULT_OPPORTUNITY_COST_RATE,
		saleCostRate = DEFAULT_SALE_COST_RATE,
		serviceCharge = DEFAULT_SERVICE_CHARGE,
		serviceChargeIncrease = DEFAULT_SERVICE_CHARGE_INCREASE,
	} = inputs;

	const mortgageAmount = propertyValue - deposit;
	const stampDuty = calculateStampDuty(propertyValue);
	const purchaseCosts = stampDuty + legalFees;
	const upfrontCosts = deposit + purchaseCosts;

	const totalMonths = mortgageTermMonths;
	const monthlyMortgagePayment = calculateMonthlyPayment(
		mortgageAmount,
		mortgageRate,
		totalMonths,
	);

	// Monthly rate for appreciation (converts annual to monthly compounding)
	const monthlyAppreciationRate =
		(1 + homeAppreciationRate / 100) ** (1 / 12) - 1;
	const monthlyOpportunityRate =
		(1 + opportunityCostRate / 100) ** (1 / 12) - 1;

	let cumulativeRent = 0;
	let cumulativeOwnership = upfrontCosts; // Start with upfront costs
	let homeValue = propertyValue;
	let mortgageBalance = mortgageAmount;
	let breakevenMonth: number | null = null;
	let breakevenDetails: NetWorthBreakevenDetails | null = null;
	let breakEvenOnSaleMonth: number | null = null;
	let breakEvenOnSaleDetails: SaleBreakevenDetails | null = null;
	let equityRecoveryMonth: number | null = null;
	let equityRecoveryDetails: EquityBreakevenDetails | null = null;
	const yearlyBreakdown: YearlyComparison[] = [];

	// Track what the renter's money could have grown to if invested instead
	// This includes: upfront costs + any monthly savings (when rent < ownership costs)
	let renterInvestmentValue = upfrontCosts;

	// Monthly interest rate for balance calculation
	const monthlyRate = mortgageRate / 100 / 12;

	// Current rent (increases annually)
	let currentRent = currentMonthlyRent;

	// Current service charge (increases annually)
	let currentServiceCharge = serviceCharge;

	for (let month = 1; month <= totalMonths; month++) {
		// Rent and service charge increase annually at the start of each new year (month 13, 25, 37, etc.)
		if (month > 1 && (month - 1) % 12 === 0) {
			currentRent = currentRent * (1 + rentInflationRate / 100);
			currentServiceCharge =
				currentServiceCharge * (1 + serviceChargeIncrease / 100);
		}
		cumulativeRent += currentRent;

		// Home appreciation (monthly compounding)
		homeValue = homeValue * (1 + monthlyAppreciationRate);

		// Maintenance cost: based on current home value, prorated monthly
		const maintenanceCost = (homeValue * (maintenanceRate / 100)) / 12;

		// Monthly ownership cost (excluding upfront, just recurring)
		const monthlyOwnershipCost =
			monthlyMortgagePayment + maintenanceCost + currentServiceCharge;

		// Renter's investment grows, and they add any monthly savings
		const renterGrowth = renterInvestmentValue * monthlyOpportunityRate;
		renterInvestmentValue += renterGrowth;

		// If renting is cheaper this month, renter invests the difference
		if (currentRent < monthlyOwnershipCost) {
			renterInvestmentValue += monthlyOwnershipCost - currentRent;
		}

		// Opportunity cost for buyer = growth of renter's investment portfolio
		const opportunityCostThisMonth = renterGrowth;

		// Add ownership costs
		cumulativeOwnership += monthlyOwnershipCost + opportunityCostThisMonth;

		// Mortgage balance reduction
		const interestPayment = mortgageBalance * monthlyRate;
		const principalPayment = monthlyMortgagePayment - interestPayment;
		mortgageBalance = Math.max(0, mortgageBalance - principalPayment);

		// Equity = home value - mortgage balance
		const equity = homeValue - mortgageBalance;

		// Sale proceeds = home value - selling costs - mortgage balance
		const saleCosts = homeValue * (saleCostRate / 100);
		const saleProceeds = homeValue - saleCosts - mortgageBalance;

		// Break-even on Sale: when sale proceeds > upfront costs
		if (breakEvenOnSaleMonth === null && saleProceeds > upfrontCosts) {
			breakEvenOnSaleMonth = month;
			breakEvenOnSaleDetails = {
				homeValue: Math.round(homeValue),
				saleCosts: Math.round(saleCosts),
				mortgageBalance: Math.round(mortgageBalance),
				saleProceeds: Math.round(saleProceeds),
				upfrontCosts: Math.round(upfrontCosts),
			};
		}

		// Equity Recovery Breakeven: when equity > upfront costs
		if (equityRecoveryMonth === null && equity > upfrontCosts) {
			equityRecoveryMonth = month;
			equityRecoveryDetails = {
				homeValue: Math.round(homeValue),
				mortgageBalance: Math.round(mortgageBalance),
				equity: Math.round(equity),
				upfrontCosts: Math.round(upfrontCosts),
			};
		}

		// Net ownership cost = cumulative payments - equity built
		const netOwnershipCost = cumulativeOwnership - equity;

		// Net Worth Breakeven: when net ownership cost < cumulative rent
		if (breakevenMonth === null && netOwnershipCost < cumulativeRent) {
			breakevenMonth = month;
			breakevenDetails = {
				cumulativeRent: Math.round(cumulativeRent),
				netOwnershipCost: Math.round(netOwnershipCost),
				cumulativeOwnership: Math.round(cumulativeOwnership),
				equity: Math.round(equity),
			};
		}

		// Store yearly snapshots
		if (month % 12 === 0) {
			yearlyBreakdown.push({
				year: month / 12,
				cumulativeRent: Math.round(cumulativeRent),
				cumulativeOwnership: Math.round(cumulativeOwnership),
				homeValue: Math.round(homeValue),
				mortgageBalance: Math.round(mortgageBalance),
				equity: Math.round(equity),
				netOwnershipCost: Math.round(netOwnershipCost),
			});
		}
	}

	return {
		breakevenMonth,
		breakevenDetails,
		breakEvenOnSaleMonth,
		breakEvenOnSaleDetails,
		equityRecoveryMonth,
		equityRecoveryDetails,
		monthlyMortgagePayment: Math.round(monthlyMortgagePayment * 100) / 100,
		mortgageAmount: Math.round(mortgageAmount),
		deposit: Math.round(deposit),
		stampDuty: Math.round(stampDuty),
		legalFees,
		purchaseCosts: Math.round(purchaseCosts),
		upfrontCosts: Math.round(upfrontCosts),
		yearlyBreakdown,
	};
}

// --- Remortgage Calculations ---

/**
 * Calculate the breakeven point and savings for remortgaging/switching.
 *
 * The breakeven point is when cumulative monthly savings exceed the switching costs.
 * Uses month-by-month simulation to track amortization on both paths.
 */
export function calculateRemortgageBreakeven(
	inputs: RemortgageInputs,
): RemortgageResult {
	const {
		outstandingBalance,
		currentRate,
		newRate,
		remainingTermMonths,
		legalFees = ESTIMATED_REMORTGAGE_LEGAL_FEES,
		cashback = 0,
		erc = 0,
	} = inputs;

	const remainingMonths = remainingTermMonths;

	const currentMonthlyPayment = calculateMonthlyPayment(
		outstandingBalance,
		currentRate,
		remainingMonths,
	);

	const newMonthlyPayment = calculateMonthlyPayment(
		outstandingBalance,
		newRate,
		remainingMonths,
	);

	const monthlySavings = currentMonthlyPayment - newMonthlyPayment;
	const switchingCosts = Math.max(0, legalFees - cashback + erc);

	// Monthly interest rates
	const currentMonthlyRate = currentRate / 100 / 12;
	const newMonthlyRate = newRate / 100 / 12;

	// Track balances and cumulative values
	let balanceCurrent = outstandingBalance;
	let balanceNew = outstandingBalance;
	let cumulativeSavings = 0;
	let cumulativeInterestCurrent = 0;
	let cumulativeInterestNew = 0;

	// Breakeven tracking
	let breakevenMonths: number = Number.POSITIVE_INFINITY;
	let breakevenDetails: RemortgageBreakevenDetails | null = null;

	// Yearly breakdown
	const yearlyBreakdown: RemortgageYearlyComparison[] = [];

	// Month-by-month simulation
	for (let month = 1; month <= remainingMonths; month++) {
		// Calculate interest for this month on both paths
		const interestCurrent = balanceCurrent * currentMonthlyRate;
		const interestNew = balanceNew * newMonthlyRate;

		// Add to cumulative interest
		cumulativeInterestCurrent += interestCurrent;
		cumulativeInterestNew += interestNew;

		// Calculate principal payments
		const principalCurrent = currentMonthlyPayment - interestCurrent;
		const principalNew = newMonthlyPayment - interestNew;

		// Update balances
		balanceCurrent = Math.max(0, balanceCurrent - principalCurrent);
		balanceNew = Math.max(0, balanceNew - principalNew);

		// Accumulate monthly savings
		cumulativeSavings += monthlySavings;

		// Check for breakeven (when cumulative savings exceed switching costs)
		if (
			breakevenDetails === null &&
			monthlySavings > 0 &&
			cumulativeSavings >= switchingCosts
		) {
			breakevenMonths = month;
			breakevenDetails = {
				monthlySavings: Math.round(monthlySavings * 100) / 100,
				breakevenMonths: month,
				switchingCosts,
				cumulativeSavingsAtBreakeven: Math.round(cumulativeSavings),
			};
		}

		// Store yearly snapshots
		if (month % 12 === 0) {
			yearlyBreakdown.push({
				year: month / 12,
				cumulativeSavings: Math.round(cumulativeSavings),
				netSavings: Math.round(cumulativeSavings - switchingCosts),
				remainingBalanceCurrent: Math.round(balanceCurrent),
				remainingBalanceNew: Math.round(balanceNew),
				interestPaidCurrent: Math.round(cumulativeInterestCurrent),
				interestPaidNew: Math.round(cumulativeInterestNew),
				interestSaved: Math.round(
					cumulativeInterestCurrent - cumulativeInterestNew,
				),
			});
		}
	}

	// Calculate total interest saved
	const totalInterestCurrent = cumulativeInterestCurrent;
	const totalInterestNew = cumulativeInterestNew;
	const interestSaved = totalInterestCurrent - totalInterestNew;

	const interestSavingsDetails: InterestSavingsDetails = {
		totalInterestCurrent: Math.round(totalInterestCurrent),
		totalInterestNew: Math.round(totalInterestNew),
		interestSaved: Math.round(interestSaved),
		switchingCosts,
		netBenefit: Math.round(interestSaved - switchingCosts),
	};

	const yearOneSavings =
		monthlySavings * Math.min(12, remainingMonths) - switchingCosts;
	const totalSavingsOverTerm =
		monthlySavings * remainingMonths - switchingCosts;

	return {
		breakevenMonths: Math.ceil(breakevenMonths),
		breakevenDetails,
		currentMonthlyPayment: Math.round(currentMonthlyPayment * 100) / 100,
		newMonthlyPayment: Math.round(newMonthlyPayment * 100) / 100,
		monthlySavings: Math.round(monthlySavings * 100) / 100,
		legalFees,
		cashback,
		erc,
		switchingCosts,
		yearOneSavings: Math.round(yearOneSavings),
		totalSavingsOverTerm: Math.round(totalSavingsOverTerm),
		interestSavingsDetails,
		yearlyBreakdown,
	};
}

/**
 * Format breakeven months as a human-readable string.
 * e.g., "3 months", "1 year 6 months", "Never"
 */
export function formatBreakevenPeriod(months: number | null): string {
	if (months === null || !Number.isFinite(months)) {
		return "Never";
	}

	const roundedMonths = Math.ceil(months);
	const years = Math.floor(roundedMonths / 12);
	const remainingMonths = roundedMonths % 12;

	if (years === 0) {
		return `${remainingMonths} month${remainingMonths !== 1 ? "s" : ""}`;
	}

	if (remainingMonths === 0) {
		return `${years} year${years !== 1 ? "s" : ""}`;
	}

	return `${years} year${years !== 1 ? "s" : ""} ${remainingMonths} month${remainingMonths !== 1 ? "s" : ""}`;
}
