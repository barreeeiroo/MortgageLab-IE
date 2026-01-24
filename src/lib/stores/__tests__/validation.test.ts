import { beforeEach, describe, expect, it } from "vitest";
import { $formValues, DEFAULT_VALUES } from "@/lib/stores/rates/rates-form";
import {
	$errorMessage,
	$hasError,
	$hasWarning,
	$isFormValid,
	$isLtvAbove80Warning,
	$isLtvAboveMax,
	$isMortgageAboveProperty,
	$warningMessage,
} from "../validation";

describe("validation computed stores", () => {
	beforeEach(() => {
		$formValues.set(DEFAULT_VALUES);
	});

	describe("$isMortgageAboveProperty", () => {
		it("returns false when property and mortgage are both 0", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				propertyValue: "0",
				mortgageAmount: "0",
			});
			expect($isMortgageAboveProperty.get()).toBe(false);
		});

		it("returns false when mortgage is less than property", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				propertyValue: "400000",
				mortgageAmount: "300000",
			});
			expect($isMortgageAboveProperty.get()).toBe(false);
		});

		it("returns false when mortgage equals property", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				propertyValue: "300000",
				mortgageAmount: "300000",
			});
			expect($isMortgageAboveProperty.get()).toBe(false);
		});

		it("returns true when mortgage exceeds property", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				propertyValue: "300000",
				mortgageAmount: "350000",
			});
			expect($isMortgageAboveProperty.get()).toBe(true);
		});

		it("returns false when only property has value", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				propertyValue: "300000",
				mortgageAmount: "0",
			});
			expect($isMortgageAboveProperty.get()).toBe(false);
		});

		it("returns false when only mortgage has value", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				propertyValue: "0",
				mortgageAmount: "300000",
			});
			expect($isMortgageAboveProperty.get()).toBe(false);
		});
	});

	describe("$isLtvAboveMax", () => {
		it("returns false for 90% LTV with primary residence (FTB)", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				propertyValue: "400000",
				mortgageAmount: "360000", // 90% LTV
				buyerType: "ftb",
			});
			expect($isLtvAboveMax.get()).toBe(false);
		});

		it("returns true for 91% LTV with primary residence (FTB)", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				propertyValue: "400000",
				mortgageAmount: "364000", // 91% LTV
				buyerType: "ftb",
			});
			expect($isLtvAboveMax.get()).toBe(true);
		});

		it("returns true for 80% LTV with BTL (max is 70%)", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				propertyValue: "400000",
				mortgageAmount: "320000", // 80% LTV
				buyerType: "btl",
			});
			expect($isLtvAboveMax.get()).toBe(true);
		});

		it("returns false for 70% LTV with BTL", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				propertyValue: "400000",
				mortgageAmount: "280000", // 70% LTV
				buyerType: "btl",
			});
			expect($isLtvAboveMax.get()).toBe(false);
		});

		it("returns false for mover (primary residence) at 90%", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				propertyValue: "500000",
				mortgageAmount: "450000", // 90% LTV
				buyerType: "mover",
			});
			expect($isLtvAboveMax.get()).toBe(false);
		});
	});

	describe("$isLtvAbove80Warning", () => {
		it("returns false for first-mortgage mode", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				mode: "first-mortgage",
				propertyValue: "400000",
				mortgageAmount: "340000", // 85% LTV
				buyerType: "ftb",
			});
			expect($isLtvAbove80Warning.get()).toBe(false);
		});

		it("returns true for remortgage mode with PDH at 85% LTV", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				mode: "remortgage",
				propertyValue: "400000",
				mortgageAmount: "340000", // 85% LTV
				buyerType: "switcher-pdh",
			});
			expect($isLtvAbove80Warning.get()).toBe(true);
		});

		it("returns false for remortgage mode with PDH at 80% LTV", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				mode: "remortgage",
				propertyValue: "400000",
				mortgageAmount: "320000", // 80% LTV
				buyerType: "switcher-pdh",
			});
			expect($isLtvAbove80Warning.get()).toBe(false);
		});

		it("returns false for remortgage mode with BTL (not primary residence)", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				mode: "remortgage",
				propertyValue: "400000",
				mortgageAmount: "260000", // 65% LTV (above 80% would exceed BTL max)
				buyerType: "switcher-btl",
			});
			expect($isLtvAbove80Warning.get()).toBe(false);
		});

		it("returns false for remortgage mode at 91% (error, not warning)", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				mode: "remortgage",
				propertyValue: "400000",
				mortgageAmount: "364000", // 91% LTV
				buyerType: "switcher-pdh",
			});
			// LTV > 90 is an error, not just a warning
			expect($isLtvAbove80Warning.get()).toBe(false);
		});
	});

	describe("$hasError", () => {
		it("returns false when form is valid", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				propertyValue: "400000",
				mortgageAmount: "300000",
			});
			expect($hasError.get()).toBe(false);
		});

		it("returns true when mortgage exceeds property", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				propertyValue: "300000",
				mortgageAmount: "350000",
			});
			expect($hasError.get()).toBe(true);
		});

		it("returns true when LTV exceeds max", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				propertyValue: "400000",
				mortgageAmount: "380000", // 95% LTV
				buyerType: "ftb",
			});
			expect($hasError.get()).toBe(true);
		});
	});

	describe("$hasWarning", () => {
		it("returns false for first-mortgage mode", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				mode: "first-mortgage",
				propertyValue: "400000",
				mortgageAmount: "340000", // 85% LTV
			});
			expect($hasWarning.get()).toBe(false);
		});

		it("returns true for remortgage mode with high LTV", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				mode: "remortgage",
				propertyValue: "400000",
				mortgageAmount: "340000", // 85% LTV
				buyerType: "switcher-pdh",
			});
			expect($hasWarning.get()).toBe(true);
		});
	});

	describe("$errorMessage", () => {
		it("returns undefined when no errors", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				propertyValue: "400000",
				mortgageAmount: "300000",
			});
			expect($errorMessage.get()).toBeUndefined();
		});

		it("returns mortgage exceeds property message for first-mortgage", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				mode: "first-mortgage",
				propertyValue: "300000",
				mortgageAmount: "350000",
			});
			expect($errorMessage.get()).toBe(
				"Mortgage amount cannot exceed property value.",
			);
		});

		it("returns outstanding balance message for remortgage", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				mode: "remortgage",
				propertyValue: "300000",
				mortgageAmount: "350000",
				buyerType: "switcher-pdh",
			});
			expect($errorMessage.get()).toBe(
				"Outstanding balance cannot exceed property value.",
			);
		});

		it("returns LTV error for primary residence", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				propertyValue: "400000",
				mortgageAmount: "380000", // 95% LTV
				buyerType: "ftb",
			});
			expect($errorMessage.get()).toContain(
				"Maximum LTV for primary residence is 90%",
			);
		});

		it("returns LTV error for BTL", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				propertyValue: "400000",
				mortgageAmount: "300000", // 75% LTV
				buyerType: "btl",
			});
			expect($errorMessage.get()).toContain(
				"Maximum LTV for this buyer type is 70%",
			);
		});

		it("returns mortgage exceeds error when both errors present", () => {
			// Mortgage exceeds property takes precedence
			$formValues.set({
				...DEFAULT_VALUES,
				propertyValue: "100000",
				mortgageAmount: "150000", // Exceeds property AND exceeds max LTV
				buyerType: "ftb",
			});
			expect($errorMessage.get()).toBe(
				"Mortgage amount cannot exceed property value.",
			);
		});
	});

	describe("$warningMessage", () => {
		it("returns undefined when no warnings", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				propertyValue: "400000",
				mortgageAmount: "300000",
			});
			expect($warningMessage.get()).toBeUndefined();
		});

		it("returns warning message for remortgage with high LTV", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				mode: "remortgage",
				propertyValue: "400000",
				mortgageAmount: "340000", // 85% LTV
				buyerType: "switcher-pdh",
			});
			expect($warningMessage.get()).toContain("LTV above 80%");
			expect($warningMessage.get()).toContain("may limit lender options");
		});
	});

	describe("$isFormValid", () => {
		it("returns false when property and mortgage are empty", () => {
			$formValues.set(DEFAULT_VALUES);
			expect($isFormValid.get()).toBe(false);
		});

		it("returns false when only property has value", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				propertyValue: "400000",
				mortgageAmount: "",
			});
			expect($isFormValid.get()).toBe(false);
		});

		it("returns false when only mortgage has value", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				propertyValue: "",
				mortgageAmount: "300000",
			});
			expect($isFormValid.get()).toBe(false);
		});

		it("returns true when property and mortgage have valid values", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				propertyValue: "400000",
				mortgageAmount: "300000",
			});
			expect($isFormValid.get()).toBe(true);
		});

		it("returns false when LTV exceeds max", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				propertyValue: "400000",
				mortgageAmount: "380000", // 95% LTV
				buyerType: "ftb",
			});
			expect($isFormValid.get()).toBe(false);
		});

		it("returns false for remortgage mode without current lender", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				mode: "remortgage",
				propertyValue: "400000",
				mortgageAmount: "300000",
				currentLender: "",
				buyerType: "switcher-pdh",
			});
			expect($isFormValid.get()).toBe(false);
		});

		it("returns true for remortgage mode with current lender", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				mode: "remortgage",
				propertyValue: "400000",
				mortgageAmount: "300000",
				currentLender: "aib",
				buyerType: "switcher-pdh",
			});
			expect($isFormValid.get()).toBe(true);
		});

		it("returns true for first-mortgage mode without current lender", () => {
			$formValues.set({
				...DEFAULT_VALUES,
				mode: "first-mortgage",
				propertyValue: "400000",
				mortgageAmount: "300000",
				currentLender: "",
			});
			expect($isFormValid.get()).toBe(true);
		});
	});
});
