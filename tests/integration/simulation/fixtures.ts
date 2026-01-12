/**
 * Shared test fixtures for simulation integration tests.
 *
 * All monetary values are in cents (€1 = 100 cents).
 * Example: €300,000 = 30000000
 */

import type { Lender } from "@/lib/schemas/lender";
import type { OverpaymentPolicy } from "@/lib/schemas/overpayment-policy";
import type { MortgageRate } from "@/lib/schemas/rate";
import type {
	OverpaymentConfig,
	RatePeriod,
	SimulationState,
} from "@/lib/schemas/simulate";

export function createRate(
	overrides: Partial<MortgageRate> = {},
): MortgageRate {
	return {
		id: "test-rate",
		lenderId: "test-lender",
		name: "Test Rate",
		rate: 3.5,
		type: "variable",
		maxLtv: 90,
		minLtv: 0,
		buyerTypes: ["ftb", "mover"],
		perks: [],
		...overrides,
	};
}

export function createLender(overrides: Partial<Lender> = {}): Lender {
	return {
		id: "test-lender",
		name: "Test Bank",
		mortgagesUrl: "https://example.com/mortgages",
		perks: [],
		...overrides,
	};
}

export function createPolicy(
	overrides: Partial<OverpaymentPolicy> = {},
): OverpaymentPolicy {
	return {
		id: "test-policy",
		label: "10% of balance",
		description: "10% of outstanding balance per year",
		icon: "Percent",
		allowanceType: "percentage",
		allowanceValue: 10,
		allowanceBasis: "balance",
		...overrides,
	};
}

export function createRatePeriod(
	overrides: Partial<RatePeriod> = {},
): RatePeriod {
	return {
		id: "period-1",
		lenderId: "test-lender",
		rateId: "test-rate",
		isCustom: false,
		durationMonths: 0, // Until end of mortgage
		...overrides,
	};
}

export function createOverpaymentConfig(
	overrides: Partial<OverpaymentConfig> = {},
): OverpaymentConfig {
	return {
		id: "overpayment-1",
		ratePeriodId: "period-1",
		type: "one_time",
		amount: 500000, // €5,000
		startMonth: 12,
		effect: "reduce_term",
		enabled: true,
		...overrides,
	};
}

export function createSimulationState(
	overrides: Partial<SimulationState> = {},
): SimulationState {
	return {
		input: {
			mortgageAmount: 30000000, // €300,000
			mortgageTermMonths: 360, // 30 years
			propertyValue: 35000000, // €350,000
			ber: "B2",
			...overrides.input,
		},
		ratePeriods: overrides.ratePeriods ?? [createRatePeriod()],
		overpaymentConfigs: overrides.overpaymentConfigs ?? [],
		selfBuildConfig: overrides.selfBuildConfig,
		initialized: true,
	};
}
