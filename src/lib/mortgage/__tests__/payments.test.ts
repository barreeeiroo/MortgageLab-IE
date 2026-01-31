import { describe, expect, it } from "vitest";
import type { MortgageRate } from "@/lib/schemas/rate";
import {
    calculateCostOfCreditPercent,
    calculateFollowOnLtv,
    calculateMonthlyFollowOn,
    calculateTotalRepayable,
} from "../payments";

describe("calculateMonthlyFollowOn", () => {
    const fixedRate: MortgageRate = {
        id: "fixed-3yr",
        name: "3 Year Fixed",
        lenderId: "test",
        type: "fixed",
        rate: 3.5,
        fixedTerm: 3,
        minLtv: 0,
        maxLtv: 90,
        buyerTypes: ["ftb", "mover"],
        perks: [],
    };

    const variableRate: MortgageRate = {
        id: "variable",
        name: "Variable Rate",
        lenderId: "test",
        type: "variable",
        rate: 4.5,
        minLtv: 0,
        maxLtv: 90,
        buyerTypes: ["ftb", "mover"],
        perks: [],
    };

    it("calculates follow-on payment after fixed term", () => {
        const result = calculateMonthlyFollowOn(
            fixedRate,
            variableRate,
            300000,
            360,
        );
        expect(result).toBeDefined();
        expect(result).toBeGreaterThan(0);
    });

    it("returns undefined for variable rates", () => {
        const result = calculateMonthlyFollowOn(
            variableRate,
            variableRate,
            300000,
            360,
        );
        expect(result).toBeUndefined();
    });

    it("returns undefined when no variable rate provided", () => {
        const result = calculateMonthlyFollowOn(
            fixedRate,
            undefined,
            300000,
            360,
        );
        expect(result).toBeUndefined();
    });

    it("returns undefined when remaining term is 0 or less", () => {
        const shortTermFixed: MortgageRate = {
            ...fixedRate,
            fixedTerm: 30, // 30 years fixed = no follow-on
        };
        const result = calculateMonthlyFollowOn(
            shortTermFixed,
            variableRate,
            300000,
            360,
        );
        expect(result).toBeUndefined();
    });
});

describe("calculateTotalRepayable", () => {
    const fixedRate: MortgageRate = {
        id: "fixed-3yr",
        name: "3 Year Fixed",
        lenderId: "test",
        type: "fixed",
        rate: 3.5,
        fixedTerm: 3,
        minLtv: 0,
        maxLtv: 90,
        buyerTypes: ["ftb", "mover"],
        perks: [],
    };

    const variableRate: MortgageRate = {
        id: "variable",
        name: "Variable Rate",
        lenderId: "test",
        type: "variable",
        rate: 4.5,
        minLtv: 0,
        maxLtv: 90,
        buyerTypes: ["ftb", "mover"],
        perks: [],
    };

    it("calculates total for fixed rate with follow-on", () => {
        const monthlyPayment = 1347.13;
        const monthlyFollowOn = 1500;
        const result = calculateTotalRepayable(
            fixedRate,
            monthlyPayment,
            monthlyFollowOn,
            360,
        );

        // 36 months at 1347.13 + 324 months at 1500
        const expected = monthlyPayment * 36 + monthlyFollowOn * 324;
        expect(result).toBeCloseTo(expected, 0);
    });

    it("calculates total for variable rate (no follow-on)", () => {
        const monthlyPayment = 1500;
        const result = calculateTotalRepayable(
            variableRate,
            monthlyPayment,
            undefined,
            360,
        );

        expect(result).toBe(monthlyPayment * 360);
    });
});

describe("calculateFollowOnLtv", () => {
    it("calculates reduced LTV after fixed term", () => {
        // After 3 years (36 months) of a 30-year mortgage, LTV should decrease
        const originalLtv = 90;
        const result = calculateFollowOnLtv(300000, 3.5, 360, 36, originalLtv);

        expect(result).toBeLessThan(originalLtv);
        expect(result).toBeGreaterThan(0);
    });

    it("LTV decreases more with higher rate (more principal paid)", () => {
        const originalLtv = 90;
        const ltvLowRate = calculateFollowOnLtv(
            300000,
            2.0,
            360,
            36,
            originalLtv,
        );
        const ltvHighRate = calculateFollowOnLtv(
            300000,
            5.0,
            360,
            36,
            originalLtv,
        );

        // Higher rate = less principal paid = higher remaining LTV
        expect(ltvHighRate).toBeGreaterThan(ltvLowRate);
    });
});

describe("calculateCostOfCreditPercent", () => {
    it("calculates cost as percentage of principal", () => {
        const totalRepayable = 500000;
        const principal = 300000;
        const result = calculateCostOfCreditPercent(totalRepayable, principal);

        // (500000 - 300000) / 300000 * 100 = 66.67%
        expect(result).toBeCloseTo(66.67, 2);
    });

    it("returns 0 when no interest paid", () => {
        const result = calculateCostOfCreditPercent(300000, 300000);
        expect(result).toBe(0);
    });

    it("returns undefined when totalRepayable is undefined", () => {
        const result = calculateCostOfCreditPercent(undefined, 300000);
        expect(result).toBeUndefined();
    });
});
