import { describe, expect, it } from "vitest";
import {
	calculateAmortization,
	calculateBufferSuggestions,
	resolveRatePeriod,
} from "@/lib/mortgage/simulation";
import type { ResolvedRatePeriod } from "@/lib/schemas/simulate";
import {
	createLender,
	createRate,
	createRatePeriod,
	createSimulationState,
} from "./fixtures";

/**
 * Helper to compute resolved rate periods for a simulation state.
 */
function computeResolvedRatePeriods(
	ratePeriods: ReturnType<typeof createRatePeriod>[],
	rates: ReturnType<typeof createRate>[],
	lenders: ReturnType<typeof createLender>[],
): ResolvedRatePeriod[] {
	const resolved: ResolvedRatePeriod[] = [];
	let startMonth = 1;

	for (const period of ratePeriods) {
		const r = resolveRatePeriod(period, startMonth, rates, [], lenders);
		if (r) {
			resolved.push(r);
		}
		startMonth += period.durationMonths;
	}

	return resolved;
}

describe("Buffer Suggestion Integration Tests", () => {
	describe("fixed-to-fixed transitions", () => {
		it("suggests buffer when fixed period transitions directly to another fixed", () => {
			const mortgageAmount = 30000000; // €300k
			const propertyValue = 35000000; // €350k

			// Create a fixed rate with a matching variable follow-on
			const fixedRate = createRate({
				id: "fixed-3yr",
				rate: 3.0,
				type: "fixed",
				fixedTerm: 3,
				minLtv: 0,
				maxLtv: 90,
			});
			const variableRate = createRate({
				id: "variable",
				rate: 4.0,
				type: "variable",
				minLtv: 0,
				maxLtv: 90,
			});
			const nextFixedRate = createRate({
				id: "fixed-5yr",
				rate: 3.5,
				type: "fixed",
				fixedTerm: 5,
				minLtv: 0,
				maxLtv: 90,
			});
			const rates = [fixedRate, variableRate, nextFixedRate];
			const lenders = [createLender()];

			const ratePeriods = [
				createRatePeriod({
					id: "period-1",
					rateId: "fixed-3yr",
					durationMonths: 36,
				}),
				createRatePeriod({
					id: "period-2",
					rateId: "fixed-5yr",
					durationMonths: 0, // Until end
				}),
			];

			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 300,
					propertyValue,
					ber: "B2",
				},
				ratePeriods,
			});

			const result = calculateAmortization(state, rates, [], lenders, []);
			const resolvedPeriods = computeResolvedRatePeriods(
				ratePeriods,
				rates,
				lenders,
			);

			const suggestions = calculateBufferSuggestions(
				state,
				rates,
				[],
				resolvedPeriods,
				result.months,
			);

			// Should suggest a variable buffer after the first fixed period
			expect(suggestions.length).toBe(1);
			expect(suggestions[0].afterIndex).toBe(0);
			expect(suggestions[0].fixedRate.id).toBe("fixed-3yr");
			expect(suggestions[0].suggestedRate.id).toBe("variable");
			expect(suggestions[0].lenderName).toBe("Test Bank");
		});

		it("does not suggest buffer when natural follow-on is already used", () => {
			const mortgageAmount = 30000000;
			const propertyValue = 35000000;

			const fixedRate = createRate({
				id: "fixed-3yr",
				rate: 3.0,
				type: "fixed",
				fixedTerm: 3,
				minLtv: 0,
				maxLtv: 90,
			});
			const variableRate = createRate({
				id: "variable",
				rate: 4.0,
				type: "variable",
				minLtv: 0,
				maxLtv: 90,
			});
			const rates = [fixedRate, variableRate];
			const lenders = [createLender()];

			// Fixed followed by its natural variable follow-on
			const ratePeriods = [
				createRatePeriod({
					id: "period-1",
					rateId: "fixed-3yr",
					durationMonths: 36,
				}),
				createRatePeriod({
					id: "period-2",
					rateId: "variable",
					durationMonths: 0,
				}),
			];

			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 300,
					propertyValue,
					ber: "B2",
				},
				ratePeriods,
			});

			const result = calculateAmortization(state, rates, [], lenders, []);
			const resolvedPeriods = computeResolvedRatePeriods(
				ratePeriods,
				rates,
				lenders,
			);

			const suggestions = calculateBufferSuggestions(
				state,
				rates,
				[],
				resolvedPeriods,
				result.months,
			);

			// No suggestions - natural follow-on is already in place
			expect(suggestions.length).toBe(0);
		});
	});

	describe("trailing fixed rate suggestions", () => {
		it("suggests buffer when last period is fixed and doesn't cover term", () => {
			const mortgageAmount = 25000000;
			const propertyValue = 30000000;

			const fixedRate = createRate({
				id: "fixed-5yr",
				rate: 3.2,
				type: "fixed",
				fixedTerm: 5,
				minLtv: 0,
				maxLtv: 90,
			});
			const variableRate = createRate({
				id: "variable",
				rate: 4.0,
				type: "variable",
				minLtv: 0,
				maxLtv: 90,
			});
			const rates = [fixedRate, variableRate];
			const lenders = [createLender()];

			// Only a 5-year fixed period on a 25-year mortgage
			const ratePeriods = [
				createRatePeriod({
					id: "period-1",
					rateId: "fixed-5yr",
					durationMonths: 60, // Not covering full term
				}),
			];

			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 300,
					propertyValue,
					ber: "B2",
				},
				ratePeriods,
			});

			const result = calculateAmortization(state, rates, [], lenders, []);
			const resolvedPeriods = computeResolvedRatePeriods(
				ratePeriods,
				rates,
				lenders,
			);

			const suggestions = calculateBufferSuggestions(
				state,
				rates,
				[],
				resolvedPeriods,
				result.months,
			);

			// Should suggest trailing buffer
			expect(suggestions.length).toBe(1);
			expect(suggestions[0].isTrailing).toBe(true);
			expect(suggestions[0].afterIndex).toBe(0);
			expect(suggestions[0].suggestedRate.id).toBe("variable");
		});

		it("does not suggest trailing buffer when fixed period covers full term", () => {
			const mortgageAmount = 20000000;
			const propertyValue = 25000000;

			const fixedRate = createRate({
				id: "fixed-3yr",
				rate: 3.0,
				type: "fixed",
				fixedTerm: 3,
				minLtv: 0,
				maxLtv: 90,
			});
			const variableRate = createRate({
				id: "variable",
				rate: 4.0,
				type: "variable",
				minLtv: 0,
				maxLtv: 90,
			});
			const rates = [fixedRate, variableRate];
			const lenders = [createLender()];

			// Fixed period with durationMonths: 0 = until end
			const ratePeriods = [
				createRatePeriod({
					id: "period-1",
					rateId: "fixed-3yr",
					durationMonths: 0, // Until end of mortgage
				}),
			];

			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 300,
					propertyValue,
					ber: "B2",
				},
				ratePeriods,
			});

			const result = calculateAmortization(state, rates, [], lenders, []);
			const resolvedPeriods = computeResolvedRatePeriods(
				ratePeriods,
				rates,
				lenders,
			);

			const suggestions = calculateBufferSuggestions(
				state,
				rates,
				[],
				resolvedPeriods,
				result.months,
			);

			// No trailing suggestion needed
			expect(suggestions.length).toBe(0);
		});
	});

	describe("variable rate periods", () => {
		it("does not suggest buffer after variable rate periods", () => {
			const mortgageAmount = 30000000;
			const propertyValue = 35000000;

			const variableRate = createRate({
				id: "variable",
				rate: 4.0,
				type: "variable",
				minLtv: 0,
				maxLtv: 90,
			});
			const fixedRate = createRate({
				id: "fixed-3yr",
				rate: 3.0,
				type: "fixed",
				fixedTerm: 3,
				minLtv: 0,
				maxLtv: 90,
			});
			const rates = [variableRate, fixedRate];
			const lenders = [createLender()];

			// Variable followed by fixed
			const ratePeriods = [
				createRatePeriod({
					id: "period-1",
					rateId: "variable",
					durationMonths: 12,
				}),
				createRatePeriod({
					id: "period-2",
					rateId: "fixed-3yr",
					durationMonths: 0,
				}),
			];

			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 300,
					propertyValue,
					ber: "B2",
				},
				ratePeriods,
			});

			const result = calculateAmortization(state, rates, [], lenders, []);
			const resolvedPeriods = computeResolvedRatePeriods(
				ratePeriods,
				rates,
				lenders,
			);

			const suggestions = calculateBufferSuggestions(
				state,
				rates,
				[],
				resolvedPeriods,
				result.months,
			);

			// No suggestions - variable doesn't need buffer
			expect(suggestions.length).toBe(0);
		});
	});

	describe("LTV calculation at period end", () => {
		it("calculates correct LTV at end of fixed period", () => {
			const mortgageAmount = 27000000; // €270k
			const propertyValue = 30000000; // €300k → 90% LTV

			const fixedRate = createRate({
				id: "fixed-3yr",
				rate: 3.0,
				type: "fixed",
				fixedTerm: 3,
				minLtv: 0,
				maxLtv: 90,
			});
			// Variable rate for lower LTV band
			const variableRate = createRate({
				id: "variable",
				rate: 3.5,
				type: "variable",
				minLtv: 0,
				maxLtv: 90,
			});
			const nextFixedRate = createRate({
				id: "fixed-5yr",
				rate: 3.2,
				type: "fixed",
				fixedTerm: 5,
				minLtv: 0,
				maxLtv: 90,
			});
			const rates = [fixedRate, variableRate, nextFixedRate];
			const lenders = [createLender()];

			const ratePeriods = [
				createRatePeriod({
					id: "period-1",
					rateId: "fixed-3yr",
					durationMonths: 36,
				}),
				createRatePeriod({
					id: "period-2",
					rateId: "fixed-5yr",
					durationMonths: 0,
				}),
			];

			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 300,
					propertyValue,
					ber: "B2",
				},
				ratePeriods,
			});

			const result = calculateAmortization(state, rates, [], lenders, []);
			const resolvedPeriods = computeResolvedRatePeriods(
				ratePeriods,
				rates,
				lenders,
			);

			const suggestions = calculateBufferSuggestions(
				state,
				rates,
				[],
				resolvedPeriods,
				result.months,
			);

			// Should have LTV calculated based on balance at month 36
			expect(suggestions.length).toBe(1);
			expect(suggestions[0].ltvAtEnd).toBeDefined();
			expect(suggestions[0].ltvAtEnd).toBeLessThan(90); // LTV dropped from payments
			expect(suggestions[0].ltvAtEnd).toBeGreaterThan(80); // Still relatively high
		});
	});

	describe("edge cases", () => {
		it("handles empty rate periods", () => {
			const mortgageAmount = 20000000;
			const propertyValue = 25000000;

			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 300,
					propertyValue,
					ber: "B2",
				},
				ratePeriods: [],
			});

			const suggestions = calculateBufferSuggestions(state, [], [], [], []);

			expect(suggestions).toEqual([]);
		});

		it("handles zero property value", () => {
			const mortgageAmount = 20000000;
			const propertyValue = 0;

			const fixedRate = createRate({
				id: "fixed-3yr",
				rate: 3.0,
				type: "fixed",
				fixedTerm: 3,
			});
			const variableRate = createRate({
				id: "variable",
				rate: 4.0,
				type: "variable",
			});
			const rates = [fixedRate, variableRate];
			const lenders = [createLender()];

			const ratePeriods = [
				createRatePeriod({
					id: "period-1",
					rateId: "fixed-3yr",
					durationMonths: 36,
				}),
			];

			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 300,
					propertyValue,
					ber: "B2",
				},
				ratePeriods,
			});

			const result = calculateAmortization(state, rates, [], lenders, []);
			const resolvedPeriods = computeResolvedRatePeriods(
				ratePeriods,
				rates,
				lenders,
			);

			const suggestions = calculateBufferSuggestions(
				state,
				rates,
				[],
				resolvedPeriods,
				result.months,
			);

			// Should return empty with zero property value
			expect(suggestions).toEqual([]);
		});

		it("handles no variable follow-on available", () => {
			const mortgageAmount = 25000000;
			const propertyValue = 30000000;

			// Only fixed rates, no variable
			const fixedRate1 = createRate({
				id: "fixed-3yr",
				rate: 3.0,
				type: "fixed",
				fixedTerm: 3,
			});
			const fixedRate2 = createRate({
				id: "fixed-5yr",
				rate: 3.5,
				type: "fixed",
				fixedTerm: 5,
			});
			const rates = [fixedRate1, fixedRate2];
			const lenders = [createLender()];

			const ratePeriods = [
				createRatePeriod({
					id: "period-1",
					rateId: "fixed-3yr",
					durationMonths: 36,
				}),
				createRatePeriod({
					id: "period-2",
					rateId: "fixed-5yr",
					durationMonths: 0,
				}),
			];

			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 300,
					propertyValue,
					ber: "B2",
				},
				ratePeriods,
			});

			const result = calculateAmortization(state, rates, [], lenders, []);
			const resolvedPeriods = computeResolvedRatePeriods(
				ratePeriods,
				rates,
				lenders,
			);

			const suggestions = calculateBufferSuggestions(
				state,
				rates,
				[],
				resolvedPeriods,
				result.months,
			);

			// No variable rate available, so no suggestion
			expect(suggestions.length).toBe(0);
		});

		it("handles multiple fixed-to-fixed transitions", () => {
			const mortgageAmount = 30000000;
			const propertyValue = 35000000;

			const fixed3yr = createRate({
				id: "fixed-3yr",
				rate: 3.0,
				type: "fixed",
				fixedTerm: 3,
				minLtv: 0,
				maxLtv: 90,
			});
			const fixed5yr = createRate({
				id: "fixed-5yr",
				rate: 3.2,
				type: "fixed",
				fixedTerm: 5,
				minLtv: 0,
				maxLtv: 90,
			});
			const fixed2yr = createRate({
				id: "fixed-2yr",
				rate: 2.8,
				type: "fixed",
				fixedTerm: 2,
				minLtv: 0,
				maxLtv: 90,
			});
			const variableRate = createRate({
				id: "variable",
				rate: 4.0,
				type: "variable",
				minLtv: 0,
				maxLtv: 90,
			});
			const rates = [fixed3yr, fixed5yr, fixed2yr, variableRate];
			const lenders = [createLender()];

			// Three fixed periods in sequence
			const ratePeriods = [
				createRatePeriod({
					id: "period-1",
					rateId: "fixed-3yr",
					durationMonths: 36,
				}),
				createRatePeriod({
					id: "period-2",
					rateId: "fixed-5yr",
					durationMonths: 60,
				}),
				createRatePeriod({
					id: "period-3",
					rateId: "fixed-2yr",
					durationMonths: 0,
				}),
			];

			const state = createSimulationState({
				input: {
					mortgageAmount,
					mortgageTermMonths: 300,
					propertyValue,
					ber: "B2",
				},
				ratePeriods,
			});

			const result = calculateAmortization(state, rates, [], lenders, []);
			const resolvedPeriods = computeResolvedRatePeriods(
				ratePeriods,
				rates,
				lenders,
			);

			const suggestions = calculateBufferSuggestions(
				state,
				rates,
				[],
				resolvedPeriods,
				result.months,
			);

			// Should suggest buffers after first two fixed periods
			expect(suggestions.length).toBe(2);
			expect(suggestions[0].afterIndex).toBe(0);
			expect(suggestions[1].afterIndex).toBe(1);
		});
	});
});
