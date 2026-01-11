import { describe, expect, it } from "vitest";
import {
	calculateJointMaxTerm,
	calculateMaxTermByAge,
	calculateMonthlyPayment,
	calculateMortgageMetrics,
	isApplicantTooOld,
} from "../borrowing";

// Helper to create a date for a specific age
function createDateForAge(age: number): Date {
	const today = new Date();
	return new Date(today.getFullYear() - age, today.getMonth(), today.getDate());
}

describe("calculateMaxTermByAge", () => {
	describe("standard cases", () => {
		it("returns 35 years for 30-year-old (max term limit)", () => {
			const birthDate = createDateForAge(30);
			const result = calculateMaxTermByAge(birthDate);

			// 68 - 30 = 38, but capped at 35
			expect(result).toBe(35);
		});

		it("returns 35 years for 33-year-old (exactly at max term)", () => {
			const birthDate = createDateForAge(33);
			const result = calculateMaxTermByAge(birthDate);

			// 68 - 33 = 35
			expect(result).toBe(35);
		});

		it("returns 28 years for 40-year-old", () => {
			const birthDate = createDateForAge(40);
			const result = calculateMaxTermByAge(birthDate);

			// 68 - 40 = 28
			expect(result).toBe(28);
		});

		it("returns 18 years for 50-year-old", () => {
			const birthDate = createDateForAge(50);
			const result = calculateMaxTermByAge(birthDate);

			// 68 - 50 = 18
			expect(result).toBe(18);
		});

		it("returns 8 years for 60-year-old", () => {
			const birthDate = createDateForAge(60);
			const result = calculateMaxTermByAge(birthDate);

			// 68 - 60 = 8
			expect(result).toBe(8);
		});
	});

	describe("edge cases", () => {
		it("returns 0 for 68-year-old", () => {
			const birthDate = createDateForAge(68);
			const result = calculateMaxTermByAge(birthDate);

			// 68 - 68 = 0
			expect(result).toBe(0);
		});

		it("returns 0 for applicants over 68", () => {
			const birthDate = createDateForAge(70);
			const result = calculateMaxTermByAge(birthDate);

			// 68 - 70 = -2, clamped to 0
			expect(result).toBe(0);
		});

		it("returns null for undefined birthDate", () => {
			const result = calculateMaxTermByAge(undefined);
			expect(result).toBeNull();
		});
	});
});

describe("calculateJointMaxTerm", () => {
	describe("single applicant", () => {
		it("returns first applicant term when not joint", () => {
			const birthDate1 = createDateForAge(40);
			const birthDate2 = createDateForAge(30);

			const result = calculateJointMaxTerm(birthDate1, birthDate2, false);

			// Should only use birthDate1: 68 - 40 = 28
			expect(result).toBe(28);
		});

		it("returns null when single applicant has no birthDate", () => {
			const result = calculateJointMaxTerm(
				undefined,
				createDateForAge(30),
				false,
			);
			expect(result).toBeNull();
		});
	});

	describe("joint applicants", () => {
		it("uses minimum of both terms (oldest applicant)", () => {
			const birthDate1 = createDateForAge(40); // 28 years max
			const birthDate2 = createDateForAge(50); // 18 years max

			const result = calculateJointMaxTerm(birthDate1, birthDate2, true);

			expect(result).toBe(18); // Uses older applicant
		});

		it("uses minimum even when second is younger", () => {
			const birthDate1 = createDateForAge(50); // 18 years max
			const birthDate2 = createDateForAge(30); // 35 years max (capped)

			const result = calculateJointMaxTerm(birthDate1, birthDate2, true);

			expect(result).toBe(18);
		});

		it("returns first term when second birthDate is undefined", () => {
			const birthDate1 = createDateForAge(40);

			const result = calculateJointMaxTerm(birthDate1, undefined, true);

			expect(result).toBe(28);
		});

		it("returns second term when first birthDate is undefined", () => {
			const birthDate2 = createDateForAge(45);

			const result = calculateJointMaxTerm(undefined, birthDate2, true);

			// 68 - 45 = 23
			expect(result).toBe(23);
		});

		it("returns null when both birthDates are undefined", () => {
			const result = calculateJointMaxTerm(undefined, undefined, true);
			expect(result).toBeNull();
		});
	});
});

describe("isApplicantTooOld", () => {
	describe("single applicant", () => {
		it("returns false for 63-year-old (at limit)", () => {
			const birthDate = createDateForAge(63);
			const result = isApplicantTooOld(birthDate, undefined, false);
			expect(result).toBe(false);
		});

		it("returns true for 64-year-old (over limit)", () => {
			const birthDate = createDateForAge(64);
			const result = isApplicantTooOld(birthDate, undefined, false);
			expect(result).toBe(true);
		});

		it("returns false for undefined birthDate", () => {
			const result = isApplicantTooOld(undefined, undefined, false);
			expect(result).toBe(false);
		});
	});

	describe("joint applicants", () => {
		it("returns true if first applicant is too old", () => {
			const birthDate1 = createDateForAge(65);
			const birthDate2 = createDateForAge(40);

			const result = isApplicantTooOld(birthDate1, birthDate2, true);

			expect(result).toBe(true);
		});

		it("returns true if second applicant is too old", () => {
			const birthDate1 = createDateForAge(40);
			const birthDate2 = createDateForAge(70);

			const result = isApplicantTooOld(birthDate1, birthDate2, true);

			expect(result).toBe(true);
		});

		it("returns false if both applicants are within limit", () => {
			const birthDate1 = createDateForAge(55);
			const birthDate2 = createDateForAge(50);

			const result = isApplicantTooOld(birthDate1, birthDate2, true);

			expect(result).toBe(false);
		});

		it("ignores second applicant when not joint", () => {
			const birthDate1 = createDateForAge(40);
			const birthDate2 = createDateForAge(70); // Would be too old

			const result = isApplicantTooOld(birthDate1, birthDate2, false);

			expect(result).toBe(false); // Only checks first applicant
		});
	});
});

describe("calculateMonthlyPayment", () => {
	describe("standard calculations", () => {
		it("calculates payment for €300k at 3.5% over 30 years", () => {
			const principal = 300000;
			const annualRate = 0.035; // 3.5% as decimal
			const months = 360;

			const result = calculateMonthlyPayment(principal, annualRate, months);

			expect(result).toBeCloseTo(1347.13, 0);
		});

		it("calculates payment for €250k at 4% over 25 years", () => {
			const principal = 250000;
			const annualRate = 0.04;
			const months = 300;

			const result = calculateMonthlyPayment(principal, annualRate, months);

			expect(result).toBeCloseTo(1319.21, 0);
		});

		it("calculates payment for €100k at 5% over 15 years", () => {
			const principal = 100000;
			const annualRate = 0.05;
			const months = 180;

			const result = calculateMonthlyPayment(principal, annualRate, months);

			expect(result).toBeCloseTo(790.79, 0);
		});
	});

	describe("edge cases", () => {
		it("handles 0% interest rate", () => {
			const principal = 120000;
			const annualRate = 0;
			const months = 120;

			const result = calculateMonthlyPayment(principal, annualRate, months);

			// Simple division when no interest
			expect(result).toBe(1000);
		});

		it("handles very short term", () => {
			const principal = 50000;
			const annualRate = 0.04;
			const months = 12;

			const result = calculateMonthlyPayment(principal, annualRate, months);

			expect(result).toBeCloseTo(4257.5, 0);
		});

		it("handles high interest rate", () => {
			const principal = 200000;
			const annualRate = 0.1; // 10%
			const months = 240;

			const result = calculateMonthlyPayment(principal, annualRate, months);

			expect(result).toBeCloseTo(1929.66, 0);
		});
	});
});

describe("calculateMortgageMetrics", () => {
	describe("LTV calculations", () => {
		it("calculates 80% LTV correctly", () => {
			const { ltv } = calculateMortgageMetrics(320000, 400000, 100000);
			expect(ltv).toBe(80);
		});

		it("calculates 90% LTV correctly", () => {
			const { ltv } = calculateMortgageMetrics(360000, 400000, 100000);
			expect(ltv).toBe(90);
		});

		it("calculates 70% LTV correctly (BTL)", () => {
			const { ltv } = calculateMortgageMetrics(280000, 400000, 100000);
			expect(ltv).toBe(70);
		});

		it("returns 0 LTV when property value is 0", () => {
			const { ltv } = calculateMortgageMetrics(300000, 0, 100000);
			expect(ltv).toBe(0);
		});
	});

	describe("LTI calculations", () => {
		it("calculates 4x LTI correctly (FTB limit)", () => {
			const { lti } = calculateMortgageMetrics(240000, 300000, 60000);
			expect(lti).toBe(4);
		});

		it("calculates 3.5x LTI correctly (mover limit)", () => {
			const { lti } = calculateMortgageMetrics(175000, 250000, 50000);
			expect(lti).toBe(3.5);
		});

		it("calculates fractional LTI", () => {
			const { lti } = calculateMortgageMetrics(200000, 300000, 55000);
			expect(lti).toBeCloseTo(3.636, 2);
		});

		it("returns 0 LTI when income is 0", () => {
			const { lti } = calculateMortgageMetrics(300000, 400000, 0);
			expect(lti).toBe(0);
		});
	});

	describe("combined metrics", () => {
		it("returns both LTV and LTI together", () => {
			const result = calculateMortgageMetrics(360000, 400000, 90000);

			expect(result.ltv).toBe(90);
			expect(result.lti).toBe(4);
		});

		it("handles real-world scenario: FTB buying €350k property", () => {
			const propertyValue = 350000;
			const deposit = 35000; // 10% deposit
			const mortgage = propertyValue - deposit;
			const income = 80000;

			const result = calculateMortgageMetrics(mortgage, propertyValue, income);

			expect(result.ltv).toBe(90);
			expect(result.lti).toBeCloseTo(3.9375, 2);
		});
	});
});
