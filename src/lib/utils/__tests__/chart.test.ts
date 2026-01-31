import { describe, expect, it } from "vitest";
import {
    CHART_ANIMATION_DURATION,
    formatChartCurrency,
    formatChartCurrencyShort,
    formatChartPercentage,
    formatChartTerm,
} from "../chart";

describe("chart utilities", () => {
    describe("CHART_ANIMATION_DURATION", () => {
        it("is 400ms", () => {
            expect(CHART_ANIMATION_DURATION).toBe(400);
        });
    });

    describe("formatChartCurrency", () => {
        it("formats cents as euros without cents", () => {
            expect(formatChartCurrency(1234500)).toBe("€12,345");
        });

        it("handles zero", () => {
            expect(formatChartCurrency(0)).toBe("€0");
        });

        it("rounds partial cents", () => {
            expect(formatChartCurrency(1234567)).toBe("€12,346");
        });

        it("handles large amounts", () => {
            expect(formatChartCurrency(50000000)).toBe("€500,000");
        });
    });

    describe("formatChartCurrencyShort", () => {
        it("abbreviates thousands as k", () => {
            expect(formatChartCurrencyShort(1200000)).toBe("€12k");
        });

        it("abbreviates millions as M", () => {
            expect(formatChartCurrencyShort(150000000)).toBe("€1.5M");
        });

        it("handles small amounts without abbreviation", () => {
            expect(formatChartCurrencyShort(50000)).toBe("€500");
        });

        it("handles zero", () => {
            expect(formatChartCurrencyShort(0)).toBe("€0");
        });
    });

    describe("formatChartPercentage", () => {
        it("formats with 2 decimal places", () => {
            expect(formatChartPercentage(3.45)).toBe("3.45%");
        });

        it("pads to 2 decimal places", () => {
            expect(formatChartPercentage(5)).toBe("5.00%");
        });

        it("handles zero", () => {
            expect(formatChartPercentage(0)).toBe("0.00%");
        });

        it("handles high precision by rounding", () => {
            expect(formatChartPercentage(3.456789)).toBe("3.46%");
        });
    });

    describe("formatChartTerm", () => {
        it("formats full years without months", () => {
            expect(formatChartTerm(300)).toBe("25y");
        });

        it("formats years with remaining months", () => {
            expect(formatChartTerm(306)).toBe("25y 6m");
        });

        it("handles zero months", () => {
            expect(formatChartTerm(0)).toBe("0y");
        });

        it("handles months less than a year", () => {
            expect(formatChartTerm(6)).toBe("0y 6m");
        });

        it("handles exactly one year", () => {
            expect(formatChartTerm(12)).toBe("1y");
        });

        it("handles one year and one month", () => {
            expect(formatChartTerm(13)).toBe("1y 1m");
        });
    });
});
