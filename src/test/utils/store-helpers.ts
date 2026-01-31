import {
    $formValues,
    DEFAULT_VALUES,
    type RatesInputValues,
} from "@/lib/stores/rates/rates-form";

/**
 * Reset rates form store to default values
 */
export function resetRatesFormStore(): void {
    $formValues.set(DEFAULT_VALUES);
}

/**
 * Set up rates form store with specific values
 */
export function setupRatesFormStore(
    overrides: Partial<RatesInputValues> = {},
): void {
    $formValues.set({ ...DEFAULT_VALUES, ...overrides });
}

/**
 * Create default rates input values with optional overrides
 */
export function createRatesInputValues(
    overrides: Partial<RatesInputValues> = {},
): RatesInputValues {
    return {
        mode: "first-mortgage",
        propertyValue: "350000",
        mortgageAmount: "315000",
        monthlyRepayment: "",
        mortgageTerm: "360",
        berRating: "C1",
        buyerType: "ftb",
        currentLender: "",
        ...overrides,
    };
}

/**
 * Create remortgage input values
 */
export function createRemortgageInputValues(
    overrides: Partial<RatesInputValues> = {},
): RatesInputValues {
    return createRatesInputValues({
        mode: "remortgage",
        buyerType: "switcher-pdh",
        monthlyRepayment: "1500",
        currentLender: "aib",
        ...overrides,
    });
}
