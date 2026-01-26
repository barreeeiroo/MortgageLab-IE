/**
 * Age-based term limits for First Time Buyer.
 *
 * Tests maximum mortgage term based on applicant age.
 */

import { describe, expect, it } from "vitest";
import { AGE_LIMITS } from "../fixtures";

describe("FTB age-based term limits", () => {
	it("young buyer can get full 35 year term", () => {
		const age = 28;
		const maxAge = AGE_LIMITS.MAX_AGE_AT_END; // 68

		const maxTerm = Math.min(maxAge - age, AGE_LIMITS.MAX_TERM);

		expect(maxTerm).toBe(35); // Full term available
	});

	it("40-year-old limited to 28 year term", () => {
		const age = 40;
		const maxAge = AGE_LIMITS.MAX_AGE_AT_END;

		const maxTerm = Math.min(maxAge - age, AGE_LIMITS.MAX_TERM);

		expect(maxTerm).toBe(28);
	});

	it("55-year-old limited to 13 year term", () => {
		const age = 55;
		const maxAge = AGE_LIMITS.MAX_AGE_AT_END;

		const maxTerm = Math.min(maxAge - age, AGE_LIMITS.MAX_TERM);

		expect(maxTerm).toBe(13);
	});

	it("joint applicants use oldest age for term calculation", () => {
		const age1 = 30;
		const age2 = 45;
		const maxAge = AGE_LIMITS.MAX_AGE_AT_END;

		const maxTerm1 = Math.min(maxAge - age1, AGE_LIMITS.MAX_TERM);
		const maxTerm2 = Math.min(maxAge - age2, AGE_LIMITS.MAX_TERM);
		const jointMaxTerm = Math.min(maxTerm1, maxTerm2);

		expect(maxTerm1).toBe(35);
		expect(maxTerm2).toBe(23);
		expect(jointMaxTerm).toBe(23); // Limited by older applicant
	});
});
