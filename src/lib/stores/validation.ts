import { computed } from "nanostores";
import {
	$formValues,
	$isPrimaryResidence,
	$isRemortgage,
	$ltv,
	$maxLtv,
	$monthly,
	$mortgage,
	$property,
} from "./rates-form";

export const $isMortgageAboveProperty = computed(
	[$mortgage, $property],
	(mortgage, property) => mortgage > 0 && property > 0 && mortgage > property,
);

export const $isLtvAboveMax = computed(
	[$ltv, $maxLtv],
	(ltv, maxLtv) => ltv > maxLtv,
);

export const $isLtvAbove80Warning = computed(
	[$isRemortgage, $isPrimaryResidence, $ltv],
	(isRemortgage, isPrimary, ltv) =>
		isRemortgage && isPrimary && ltv > 80 && ltv <= 90,
);

export const $hasError = computed(
	[$isMortgageAboveProperty, $isLtvAboveMax],
	(aboveProperty, aboveMax) => aboveProperty || aboveMax,
);

export const $hasWarning = computed($isLtvAbove80Warning, (warning) => warning);

export const $errorMessage = computed(
	[
		$isMortgageAboveProperty,
		$isLtvAboveMax,
		$isRemortgage,
		$isPrimaryResidence,
		$maxLtv,
	],
	(aboveProperty, aboveMax, isRemortgage, isPrimary, maxLtv) => {
		if (aboveProperty) {
			return `${isRemortgage ? "Outstanding balance" : "Mortgage amount"} cannot exceed property value.`;
		}
		if (aboveMax) {
			const amountTerm = isRemortgage
				? "outstanding balance"
				: "mortgage amount";
			return `Maximum LTV for ${isPrimary ? "primary residence" : "this buyer type"} is ${maxLtv}%. Consider a smaller ${amountTerm} or higher property value.`;
		}
		return undefined;
	},
);

export const $warningMessage = computed($hasWarning, (hasWarning) =>
	hasWarning
		? "LTV above 80% may limit lender options. Some lenders require lower LTV for mortgage switches."
		: undefined,
);

export const $isFormValid = computed(
	[$property, $mortgage, $hasError, $isRemortgage, $monthly, $formValues],
	(property, mortgage, hasError, isRemortgage, monthly, values) =>
		property > 0 &&
		mortgage > 0 &&
		!hasError &&
		(!isRemortgage || (monthly > 0 && values.currentLender !== "")),
);
