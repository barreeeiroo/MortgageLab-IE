import { atom, computed } from "nanostores";
import {
	DEFAULT_BER,
	DEFAULT_TERM_MONTHS,
	type RatesMode,
} from "@/lib/constants";
import { parseCurrency } from "@/lib/utils";

export interface RatesInputValues {
	mode: RatesMode;
	propertyValue: string;
	mortgageAmount: string;
	monthlyRepayment: string;
	/** Total mortgage term in months (e.g., "360" for 30 years) */
	mortgageTerm: string;
	berRating: string;
	buyerType: string;
	currentLender: string;
}

// Default form values (mortgageTerm stored as total months)
export const DEFAULT_VALUES: RatesInputValues = {
	mode: "first-mortgage",
	propertyValue: "",
	mortgageAmount: "",
	monthlyRepayment: "",
	mortgageTerm: String(DEFAULT_TERM_MONTHS),
	berRating: DEFAULT_BER,
	buyerType: "ftb",
	currentLender: "",
};

// Form state atom
export const $formValues = atom<RatesInputValues>(DEFAULT_VALUES);

// Computed values derived from form
export const $isRemortgage = computed(
	$formValues,
	(values) => values.mode === "remortgage",
);

export const $property = computed($formValues, (values) =>
	parseCurrency(values.propertyValue),
);

export const $mortgage = computed($formValues, (values) =>
	parseCurrency(values.mortgageAmount),
);

export const $monthly = computed($formValues, (values) =>
	parseCurrency(values.monthlyRepayment),
);

export const $deposit = computed(
	[$property, $mortgage],
	(property, mortgage) => (property > 0 ? property - mortgage : 0),
);

export const $ltv = computed([$property, $mortgage], (property, mortgage) =>
	property > 0 ? (mortgage / property) * 100 : 0,
);

// mortgageTerm is stored as total months
export const $mortgageTerm = computed(
	$formValues,
	(values) => Number.parseInt(values.mortgageTerm, 10) || DEFAULT_TERM_MONTHS,
);

export const $berRating = computed($formValues, (values) => values.berRating);

export const $isPrimaryResidence = computed(
	$formValues,
	(values) =>
		values.buyerType === "ftb" ||
		values.buyerType === "mover" ||
		values.buyerType === "switcher-pdh",
);

export const $maxLtv = computed($isPrimaryResidence, (isPrimary) =>
	isPrimary ? 90 : 70,
);

// Actions
export function setFormValues(values: RatesInputValues): void {
	$formValues.set(values);
}

export function updateFormValue<K extends keyof RatesInputValues>(
	key: K,
	value: RatesInputValues[K],
): void {
	$formValues.set({ ...$formValues.get(), [key]: value });
}

// Map buyer type when switching modes
export function handleModeSwitch(
	prevMode: RatesMode,
	newMode: RatesMode,
): void {
	const values = $formValues.get();
	const isRemortgage = newMode === "remortgage";

	if (prevMode !== newMode) {
		if (isRemortgage) {
			// Switching to remortgage: map to switcher types
			if (values.buyerType === "ftb" || values.buyerType === "mover") {
				updateFormValue("buyerType", "switcher-pdh");
			} else if (values.buyerType === "btl") {
				updateFormValue("buyerType", "switcher-btl");
			}
		} else {
			// Switching to first-mortgage: map from switcher types
			if (values.buyerType === "switcher-pdh") {
				updateFormValue("buyerType", "mover");
			} else if (values.buyerType === "switcher-btl") {
				updateFormValue("buyerType", "btl");
			}
		}
	}
}
