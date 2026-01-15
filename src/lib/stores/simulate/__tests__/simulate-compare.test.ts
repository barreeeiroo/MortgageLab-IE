import { beforeEach, describe, expect, it } from "vitest";
import type { SavedSimulation } from "@/lib/schemas/simulate";

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] ?? null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
	};
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock });

// Import after mocking localStorage
import {
	__resetCompareInitialized,
	$compareSimulations,
	$compareState,
	$compareValidation,
	$hasValidComparison,
	addSavedToCompare,
	COMPARE_STATE_KEY,
	CURRENT_SIMULATION_ID,
	clearCompare,
	initializeCompareState,
	removeSavedFromCompare,
	setCompareState,
	toggleCurrentInCompare,
} from "../simulate-compare";
import { $savedSimulations } from "../simulate-saves";
import { $simulationState } from "../simulate-state";

describe("simulate-compare", () => {
	// Helper to create a mock saved simulation
	const createMockSave = (
		id: string,
		name: string,
		amount = 30000000,
	): SavedSimulation => ({
		id,
		name,
		state: {
			input: {
				mortgageAmount: amount,
				mortgageTermMonths: 300,
				propertyValue: 40000000,
				ber: "C1",
			},
			ratePeriods: [
				{
					id: "period-1",
					lenderId: "aib",
					rateId: "aib-fixed-3yr",
					isCustom: false,
					durationMonths: 36,
				},
			],
			overpaymentConfigs: [],
		},
		createdAt: "2026-01-01T00:00:00.000Z",
		lastUpdatedAt: "2026-01-01T00:00:00.000Z",
	});

	beforeEach(() => {
		localStorageMock.clear();
		__resetCompareInitialized();
		$compareState.set({ savedIds: [], includeCurrentView: false });
		$savedSimulations.set([]);
		$simulationState.set({
			input: {
				mortgageAmount: 30000000,
				mortgageTermMonths: 300,
				propertyValue: 40000000,
				ber: "C1",
			},
			ratePeriods: [
				{
					id: "period-1",
					lenderId: "aib",
					rateId: "aib-fixed-3yr",
					isCustom: false,
					durationMonths: 36,
				},
			],
			overpaymentConfigs: [],
			initialized: true,
		});
	});

	describe("CURRENT_SIMULATION_ID", () => {
		it("is a special identifier for unsaved current simulation", () => {
			expect(CURRENT_SIMULATION_ID).toBe("__current__");
		});
	});

	describe("setCompareState", () => {
		it("sets the compare state", () => {
			setCompareState({
				savedIds: ["sim-1", "sim-2"],
				includeCurrentView: true,
			});

			const state = $compareState.get();
			expect(state.savedIds).toEqual(["sim-1", "sim-2"]);
			expect(state.includeCurrentView).toBe(true);
		});
	});

	describe("addSavedToCompare", () => {
		it("adds a saved simulation to comparison", () => {
			$savedSimulations.set([createMockSave("sim-1", "Mortgage A")]);

			addSavedToCompare("sim-1");

			const state = $compareState.get();
			expect(state.savedIds).toContain("sim-1");
		});

		it("does not add duplicate IDs", () => {
			$savedSimulations.set([createMockSave("sim-1", "Mortgage A")]);

			addSavedToCompare("sim-1");
			addSavedToCompare("sim-1");

			const state = $compareState.get();
			expect(state.savedIds.filter((id) => id === "sim-1")).toHaveLength(1);
		});

		it("does not add if simulation does not exist", () => {
			addSavedToCompare("non-existent");

			const state = $compareState.get();
			expect(state.savedIds).not.toContain("non-existent");
		});

		it("enforces maximum of 5 total selections", () => {
			const saves = [
				createMockSave("sim-1", "A"),
				createMockSave("sim-2", "B"),
				createMockSave("sim-3", "C"),
				createMockSave("sim-4", "D"),
				createMockSave("sim-5", "E"),
			];
			$savedSimulations.set(saves);
			setCompareState({
				savedIds: ["sim-1", "sim-2", "sim-3", "sim-4"],
				includeCurrentView: true,
			});

			// This would make it 6 total, should not add
			addSavedToCompare("sim-5");

			const state = $compareState.get();
			expect(state.savedIds).not.toContain("sim-5");
			expect(state.savedIds).toHaveLength(4);
		});
	});

	describe("removeSavedFromCompare", () => {
		it("removes a saved simulation from comparison", () => {
			setCompareState({
				savedIds: ["sim-1", "sim-2"],
				includeCurrentView: false,
			});

			removeSavedFromCompare("sim-1");

			const state = $compareState.get();
			expect(state.savedIds).not.toContain("sim-1");
			expect(state.savedIds).toContain("sim-2");
		});
	});

	describe("toggleCurrentInCompare", () => {
		it("toggles current view inclusion", () => {
			expect($compareState.get().includeCurrentView).toBe(false);

			toggleCurrentInCompare();
			expect($compareState.get().includeCurrentView).toBe(true);

			toggleCurrentInCompare();
			expect($compareState.get().includeCurrentView).toBe(false);
		});
	});

	describe("clearCompare", () => {
		it("clears all comparison selections", () => {
			setCompareState({
				savedIds: ["sim-1", "sim-2"],
				includeCurrentView: true,
			});

			clearCompare();

			const state = $compareState.get();
			expect(state.savedIds).toHaveLength(0);
			expect(state.includeCurrentView).toBe(false);
		});
	});

	describe("$compareValidation", () => {
		it("is invalid with less than 2 simulations", () => {
			setCompareState({ savedIds: ["sim-1"], includeCurrentView: false });
			$savedSimulations.set([createMockSave("sim-1", "Mortgage A")]);

			const validation = $compareValidation.get();
			expect(validation.isValid).toBe(false);
			expect(validation.errors).toHaveLength(1);
			expect(validation.errors[0].type).toBe("insufficient_simulations");
			expect(validation.infos).toHaveLength(0);
		});

		it("is valid with 2 or more simulations", () => {
			const saves = [
				createMockSave("sim-1", "Mortgage A"),
				createMockSave("sim-2", "Mortgage B"),
			];
			$savedSimulations.set(saves);
			setCompareState({
				savedIds: ["sim-1", "sim-2"],
				includeCurrentView: false,
			});

			const validation = $compareValidation.get();
			expect(validation.isValid).toBe(true);
			expect(validation.errors).toHaveLength(0);
		});

		it("warns about different mortgage amounts", () => {
			const saves = [
				createMockSave("sim-1", "Mortgage A", 30000000),
				createMockSave("sim-2", "Mortgage B", 35000000),
			];
			$savedSimulations.set(saves);
			setCompareState({
				savedIds: ["sim-1", "sim-2"],
				includeCurrentView: false,
			});

			const validation = $compareValidation.get();
			expect(validation.isValid).toBe(true);
			expect(validation.warnings).toContainEqual(
				expect.objectContaining({ type: "different_amounts" }),
			);
		});

		it("warns about self-build mix", () => {
			const saveWithSelfBuild = createMockSave("sim-1", "Self Build");
			saveWithSelfBuild.state.selfBuildConfig = {
				enabled: true,
				drawdownStages: [],
				constructionRepaymentType: "interest_only",
				interestOnlyMonths: 0,
			};

			const saves = [saveWithSelfBuild, createMockSave("sim-2", "Standard")];
			$savedSimulations.set(saves);
			setCompareState({
				savedIds: ["sim-1", "sim-2"],
				includeCurrentView: false,
			});

			const validation = $compareValidation.get();
			expect(validation.isValid).toBe(true);
			expect(validation.warnings).toContainEqual(
				expect.objectContaining({ type: "self_build_mix" }),
			);
		});

		it("provides info about overpayment mix when comparing 2 identical simulations", () => {
			const saveWithOverpayments = createMockSave(
				"sim-1",
				"With Overpayments",
				30000000,
			);
			saveWithOverpayments.state.overpaymentConfigs = [
				{
					id: "overpayment-1",
					ratePeriodId: "period-1",
					type: "one_time",
					amount: 10000,
					startMonth: 1,
					effect: "reduce_term",
					enabled: true,
				},
			];

			const saveWithoutOverpayments = createMockSave(
				"sim-2",
				"Without Overpayments",
				30000000,
			);

			const saves = [saveWithOverpayments, saveWithoutOverpayments];
			$savedSimulations.set(saves);
			setCompareState({
				savedIds: ["sim-1", "sim-2"],
				includeCurrentView: false,
			});

			const validation = $compareValidation.get();
			expect(validation.isValid).toBe(true);
			expect(validation.infos).toHaveLength(1);
			expect(validation.infos[0].type).toBe("overpayment_mix");
			expect(validation.infos[0].message).toContain("Overpayment impact");
		});

		it("does not show overpayment info when all simulations have overpayments", () => {
			const saveWithOverpayments1 = createMockSave("sim-1", "Sim 1");
			saveWithOverpayments1.state.overpaymentConfigs = [
				{
					id: "overpayment-1",
					ratePeriodId: "period-1",
					type: "one_time",
					amount: 10000,
					startMonth: 1,
					effect: "reduce_term",
					enabled: true,
				},
			];

			const saveWithOverpayments2 = createMockSave("sim-2", "Sim 2");
			saveWithOverpayments2.state.overpaymentConfigs = [
				{
					id: "overpayment-2",
					ratePeriodId: "period-1",
					type: "one_time",
					amount: 20000,
					startMonth: 1,
					effect: "reduce_term",
					enabled: true,
				},
			];

			const saves = [saveWithOverpayments1, saveWithOverpayments2];
			$savedSimulations.set(saves);
			setCompareState({
				savedIds: ["sim-1", "sim-2"],
				includeCurrentView: false,
			});

			const validation = $compareValidation.get();
			expect(validation.isValid).toBe(true);
			expect(validation.infos).toHaveLength(0);
		});

		it("does not show overpayment info when no simulations have overpayments", () => {
			const saves = [
				createMockSave("sim-1", "Sim 1"),
				createMockSave("sim-2", "Sim 2"),
			];
			$savedSimulations.set(saves);
			setCompareState({
				savedIds: ["sim-1", "sim-2"],
				includeCurrentView: false,
			});

			const validation = $compareValidation.get();
			expect(validation.isValid).toBe(true);
			expect(validation.infos).toHaveLength(0);
		});

		it("does not show overpayment info when comparing 3+ simulations", () => {
			const saveWithOverpayments = createMockSave(
				"sim-1",
				"With Overpayments",
				30000000,
			);
			saveWithOverpayments.state.overpaymentConfigs = [
				{
					id: "overpayment-1",
					ratePeriodId: "period-1",
					type: "one_time",
					amount: 10000,
					startMonth: 1,
					effect: "reduce_term",
					enabled: true,
				},
			];

			const saves = [
				saveWithOverpayments,
				createMockSave("sim-2", "Without 1", 30000000),
				createMockSave("sim-3", "Without 2", 30000000),
			];
			$savedSimulations.set(saves);
			setCompareState({
				savedIds: ["sim-1", "sim-2", "sim-3"],
				includeCurrentView: false,
			});

			const validation = $compareValidation.get();
			expect(validation.isValid).toBe(true);
			expect(validation.infos).toHaveLength(0);
		});

		it("does not show overpayment info when amounts differ", () => {
			const saveWithOverpayments = createMockSave(
				"sim-1",
				"With Overpayments",
				30000000,
			);
			saveWithOverpayments.state.overpaymentConfigs = [
				{
					id: "overpayment-1",
					ratePeriodId: "period-1",
					type: "one_time",
					amount: 10000,
					startMonth: 1,
					effect: "reduce_term",
					enabled: true,
				},
			];

			const saveWithoutOverpayments = createMockSave(
				"sim-2",
				"Without Overpayments",
				35000000,
			);

			const saves = [saveWithOverpayments, saveWithoutOverpayments];
			$savedSimulations.set(saves);
			setCompareState({
				savedIds: ["sim-1", "sim-2"],
				includeCurrentView: false,
			});

			const validation = $compareValidation.get();
			expect(validation.isValid).toBe(true);
			expect(validation.infos).toHaveLength(0);
		});

		it("does not show overpayment info when terms differ", () => {
			const saveWithOverpayments = createMockSave(
				"sim-1",
				"With Overpayments",
				30000000,
			);
			saveWithOverpayments.state.overpaymentConfigs = [
				{
					id: "overpayment-1",
					ratePeriodId: "period-1",
					type: "one_time",
					amount: 10000,
					startMonth: 1,
					effect: "reduce_term",
					enabled: true,
				},
			];
			saveWithOverpayments.state.input.mortgageTermMonths = 300;

			const saveWithoutOverpayments = createMockSave(
				"sim-2",
				"Without Overpayments",
				30000000,
			);
			saveWithoutOverpayments.state.input.mortgageTermMonths = 360;

			const saves = [saveWithOverpayments, saveWithoutOverpayments];
			$savedSimulations.set(saves);
			setCompareState({
				savedIds: ["sim-1", "sim-2"],
				includeCurrentView: false,
			});

			const validation = $compareValidation.get();
			expect(validation.isValid).toBe(true);
			expect(validation.infos).toHaveLength(0);
		});

		it("does not show overpayment info when BER differs", () => {
			const saveWithOverpayments = createMockSave(
				"sim-1",
				"With Overpayments",
				30000000,
			);
			saveWithOverpayments.state.overpaymentConfigs = [
				{
					id: "overpayment-1",
					ratePeriodId: "period-1",
					type: "one_time",
					amount: 10000,
					startMonth: 1,
					effect: "reduce_term",
					enabled: true,
				},
			];
			saveWithOverpayments.state.input.ber = "A1";

			const saveWithoutOverpayments = createMockSave(
				"sim-2",
				"Without Overpayments",
				30000000,
			);
			saveWithoutOverpayments.state.input.ber = "C1";

			const saves = [saveWithOverpayments, saveWithoutOverpayments];
			$savedSimulations.set(saves);
			setCompareState({
				savedIds: ["sim-1", "sim-2"],
				includeCurrentView: false,
			});

			const validation = $compareValidation.get();
			expect(validation.isValid).toBe(true);
			expect(validation.infos).toHaveLength(0);
		});

		it("does not show overpayment info when rate periods differ", () => {
			const saveWithOverpayments = createMockSave(
				"sim-1",
				"With Overpayments",
				30000000,
			);
			saveWithOverpayments.state.overpaymentConfigs = [
				{
					id: "overpayment-1",
					ratePeriodId: "period-1",
					type: "one_time",
					amount: 10000,
					startMonth: 1,
					effect: "reduce_term",
					enabled: true,
				},
			];
			saveWithOverpayments.state.ratePeriods = [
				{
					id: "period-1",
					lenderId: "aib",
					rateId: "aib-fixed-3yr",
					isCustom: false,
					durationMonths: 36,
				},
			];

			const saveWithoutOverpayments = createMockSave(
				"sim-2",
				"Without Overpayments",
				30000000,
			);
			saveWithoutOverpayments.state.ratePeriods = [
				{
					id: "period-1",
					lenderId: "aib",
					rateId: "aib-fixed-3yr",
					isCustom: false,
					durationMonths: 36,
				},
				{
					id: "period-2",
					lenderId: "aib",
					rateId: "aib-variable",
					isCustom: false,
					durationMonths: 0,
				},
			];

			const saves = [saveWithOverpayments, saveWithoutOverpayments];
			$savedSimulations.set(saves);
			setCompareState({
				savedIds: ["sim-1", "sim-2"],
				includeCurrentView: false,
			});

			const validation = $compareValidation.get();
			expect(validation.isValid).toBe(true);
			expect(validation.infos).toHaveLength(0);
		});

		it("does not show overpayment info when self-build config differs", () => {
			const saveWithOverpayments = createMockSave(
				"sim-1",
				"With Overpayments",
				30000000,
			);
			saveWithOverpayments.state.overpaymentConfigs = [
				{
					id: "overpayment-1",
					ratePeriodId: "period-1",
					type: "one_time",
					amount: 10000,
					startMonth: 1,
					effect: "reduce_term",
					enabled: true,
				},
			];
			saveWithOverpayments.state.selfBuildConfig = {
				enabled: true,
				drawdownStages: [],
				constructionRepaymentType: "interest_only",
				interestOnlyMonths: 0,
			};

			const saveWithoutOverpayments = createMockSave(
				"sim-2",
				"Without Overpayments",
				30000000,
			);
			// No self-build config (disabled)

			const saves = [saveWithOverpayments, saveWithoutOverpayments];
			$savedSimulations.set(saves);
			setCompareState({
				savedIds: ["sim-1", "sim-2"],
				includeCurrentView: false,
			});

			const validation = $compareValidation.get();
			expect(validation.isValid).toBe(true);
			// Should show self_build_mix warning but no overpayment info
			expect(validation.warnings).toContainEqual(
				expect.objectContaining({ type: "self_build_mix" }),
			);
			expect(validation.infos).toHaveLength(0);
		});
	});

	describe("$hasValidComparison", () => {
		it("returns true when there are 2+ valid simulations", () => {
			const saves = [
				createMockSave("sim-1", "Mortgage A"),
				createMockSave("sim-2", "Mortgage B"),
			];
			$savedSimulations.set(saves);
			setCompareState({
				savedIds: ["sim-1", "sim-2"],
				includeCurrentView: false,
			});

			expect($hasValidComparison.get()).toBe(true);
		});

		it("returns false when there are less than 2 simulations", () => {
			$savedSimulations.set([createMockSave("sim-1", "Mortgage A")]);
			setCompareState({ savedIds: ["sim-1"], includeCurrentView: false });

			expect($hasValidComparison.get()).toBe(false);
		});
	});

	describe("$compareSimulations", () => {
		it("resolves saved simulations by ID", () => {
			const saves = [
				createMockSave("sim-1", "Mortgage A"),
				createMockSave("sim-2", "Mortgage B"),
			];
			$savedSimulations.set(saves);
			setCompareState({
				savedIds: ["sim-1", "sim-2"],
				includeCurrentView: false,
			});

			const resolved = $compareSimulations.get();
			expect(resolved).toHaveLength(2);
			expect(resolved[0].id).toBe("sim-1");
			expect(resolved[0].name).toBe("Mortgage A");
			expect(resolved[1].id).toBe("sim-2");
			expect(resolved[1].name).toBe("Mortgage B");
		});

		it("includes current simulation when includeCurrentView is true", () => {
			$savedSimulations.set([createMockSave("sim-1", "Mortgage A")]);
			setCompareState({ savedIds: ["sim-1"], includeCurrentView: true });

			const resolved = $compareSimulations.get();
			expect(resolved).toHaveLength(2);

			const currentSim = resolved.find((r) => r.id === CURRENT_SIMULATION_ID);
			expect(currentSim).toBeDefined();
			expect(currentSim?.name).toBe("Unnamed Simulation");
			expect(currentSim?.isCurrentView).toBe(true);
		});

		it("skips invalid saved IDs", () => {
			$savedSimulations.set([createMockSave("sim-1", "Mortgage A")]);
			setCompareState({
				savedIds: ["sim-1", "non-existent"],
				includeCurrentView: false,
			});

			const resolved = $compareSimulations.get();
			expect(resolved).toHaveLength(1);
			expect(resolved[0].id).toBe("sim-1");
		});
	});

	describe("initializeCompareState", () => {
		it("loads state from localStorage", () => {
			// Set up saved simulations first so IDs are valid
			$savedSimulations.set([
				createMockSave("sim-1", "Mortgage A"),
				createMockSave("sim-2", "Mortgage B"),
			]);
			const savedState = {
				savedIds: ["sim-1", "sim-2"],
				includeCurrentView: true,
			};
			localStorage.setItem(COMPARE_STATE_KEY, JSON.stringify(savedState));

			initializeCompareState();

			const state = $compareState.get();
			expect(state.savedIds).toEqual(["sim-1", "sim-2"]);
			expect(state.includeCurrentView).toBe(true);
		});

		it("cleans up invalid IDs on initialization", () => {
			$savedSimulations.set([createMockSave("sim-1", "Mortgage A")]);
			const savedState = {
				savedIds: ["sim-1", "non-existent"],
				includeCurrentView: false,
			};
			localStorage.setItem(COMPARE_STATE_KEY, JSON.stringify(savedState));

			initializeCompareState();

			const state = $compareState.get();
			expect(state.savedIds).toEqual(["sim-1"]);
		});
	});
});
