/**
 * Shared test fixtures for breakeven integration tests.
 *
 * All monetary values are in euros for readability.
 * These fixtures represent realistic Irish mortgage and rental scenarios.
 */

// Import for local use (aliased to avoid lint conflict with re-export)
import {
    DEFAULT_HOME_APPRECIATION as _HOME_APPRECIATION,
    DEFAULT_OPPORTUNITY_COST_RATE as _OPPORTUNITY_COST,
    DEFAULT_RENT_INFLATION as _RENT_INFLATION,
} from "@/lib/mortgage/breakeven";

// Re-export for test files
// biome-ignore lint/performance/noBarrelFile: test fixtures re-export for convenience
export {
    DEFAULT_HOME_APPRECIATION,
    DEFAULT_MAINTENANCE_RATE,
    DEFAULT_OPPORTUNITY_COST_RATE,
    DEFAULT_RENT_INFLATION,
    DEFAULT_SALE_COST_RATE,
} from "@/lib/mortgage/breakeven";

// Common property and rent combinations for Dublin
export const DUBLIN_SCENARIOS = {
    /** City center 1-bed apartment */
    cityCenter1Bed: {
        propertyValue: 350000,
        monthlyRent: 2000,
        deposit: 35000, // 10%
    },
    /** Suburban 2-bed apartment */
    suburban2Bed: {
        propertyValue: 400000,
        monthlyRent: 2200,
        deposit: 40000,
    },
    /** Suburban 3-bed house */
    suburban3Bed: {
        propertyValue: 500000,
        monthlyRent: 2500,
        deposit: 50000,
    },
    /** South Dublin family home */
    southDublinHouse: {
        propertyValue: 650000,
        monthlyRent: 3000,
        deposit: 65000,
    },
} as const;

// Regional property scenarios
export const REGIONAL_SCENARIOS = {
    /** Cork city apartment */
    corkApartment: {
        propertyValue: 300000,
        monthlyRent: 1600,
        deposit: 30000,
    },
    /** Galway house */
    galwayHouse: {
        propertyValue: 350000,
        monthlyRent: 1800,
        deposit: 35000,
    },
    /** Limerick starter home */
    limerickStarter: {
        propertyValue: 250000,
        monthlyRent: 1300,
        deposit: 25000,
    },
} as const;

// Common mortgage rate scenarios
export const RATE_SCENARIOS = {
    /** Current high rate environment (2024) */
    current: { rate: 4.0 },
    /** Mid-range rate */
    mid: { rate: 3.5 },
    /** Low rate (post-ECB cuts) */
    low: { rate: 3.0 },
    /** Very low rate (historical) */
    veryLow: { rate: 2.5 },
} as const;

// Remortgage scenarios
export const REMORTGAGE_SCENARIOS = {
    /** Coming off fixed rate to lower variable */
    fixedToVariable: {
        outstandingBalance: 280000,
        currentRate: 4.5,
        newRate: 3.8,
        remainingTermMonths: 240,
    },
    /** Switching lenders for better rate */
    lenderSwitch: {
        outstandingBalance: 350000,
        currentRate: 4.2,
        newRate: 3.5,
        remainingTermMonths: 300,
    },
    /** Small rate improvement */
    marginalImprovement: {
        outstandingBalance: 200000,
        currentRate: 4.0,
        newRate: 3.8,
        remainingTermMonths: 180,
    },
    /** Large balance, significant rate drop */
    largeBalanceDrop: {
        outstandingBalance: 450000,
        currentRate: 5.0,
        newRate: 3.5,
        remainingTermMonths: 300,
    },
} as const;

// Cashback offer scenarios
export const CASHBACK_SCENARIOS = {
    /** 2% cashback at higher rate */
    highCashback: {
        rate: 4.0,
        cashbackType: "percentage" as const,
        cashbackValue: 2,
    },
    /** 1% cashback at mid rate */
    midCashback: {
        rate: 3.7,
        cashbackType: "percentage" as const,
        cashbackValue: 1,
    },
    /** Flat €3000 cashback */
    flatCashback: {
        rate: 3.8,
        cashbackType: "flat" as const,
        cashbackValue: 3000,
    },
    /** No cashback, lowest rate */
    noCashback: {
        rate: 3.5,
        cashbackType: "flat" as const,
        cashbackValue: 0,
    },
} as const;

// Economic assumption scenarios
export const ECONOMIC_SCENARIOS = {
    /** Conservative assumptions */
    conservative: {
        homeAppreciationRate: 2,
        rentInflationRate: 2,
        opportunityCostRate: 4,
    },
    /** Moderate/default assumptions */
    moderate: {
        homeAppreciationRate: _HOME_APPRECIATION,
        rentInflationRate: _RENT_INFLATION,
        opportunityCostRate: _OPPORTUNITY_COST,
    },
    /** Optimistic assumptions */
    optimistic: {
        homeAppreciationRate: 6,
        rentInflationRate: 3,
        opportunityCostRate: 5,
    },
    /** Pessimistic (no appreciation) */
    pessimistic: {
        homeAppreciationRate: 0,
        rentInflationRate: 3,
        opportunityCostRate: 7,
    },
} as const;
