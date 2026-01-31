import { describe, expect, it } from "vitest";
import {
    combineTerm,
    formatTermDisplay,
    isValidTerm,
    isValidTermYears,
    splitTerm,
} from "../term";

describe("splitTerm", () => {
    describe("exact years", () => {
        it("splits 12 months into 1 year 0 months", () => {
            expect(splitTerm(12)).toEqual({ years: 1, months: 0 });
        });

        it("splits 60 months into 5 years 0 months", () => {
            expect(splitTerm(60)).toEqual({ years: 5, months: 0 });
        });

        it("splits 360 months into 30 years 0 months", () => {
            expect(splitTerm(360)).toEqual({ years: 30, months: 0 });
        });

        it("splits 420 months into 35 years 0 months", () => {
            expect(splitTerm(420)).toEqual({ years: 35, months: 0 });
        });
    });

    describe("years with remaining months", () => {
        it("splits 13 months into 1 year 1 month", () => {
            expect(splitTerm(13)).toEqual({ years: 1, months: 1 });
        });

        it("splits 18 months into 1 year 6 months", () => {
            expect(splitTerm(18)).toEqual({ years: 1, months: 6 });
        });

        it("splits 23 months into 1 year 11 months", () => {
            expect(splitTerm(23)).toEqual({ years: 1, months: 11 });
        });

        it("splits 366 months into 30 years 6 months", () => {
            expect(splitTerm(366)).toEqual({ years: 30, months: 6 });
        });
    });

    describe("edge cases", () => {
        it("splits 0 months into 0 years 0 months", () => {
            expect(splitTerm(0)).toEqual({ years: 0, months: 0 });
        });

        it("splits 1 month into 0 years 1 month", () => {
            expect(splitTerm(1)).toEqual({ years: 0, months: 1 });
        });

        it("splits 11 months into 0 years 11 months", () => {
            expect(splitTerm(11)).toEqual({ years: 0, months: 11 });
        });
    });
});

describe("combineTerm", () => {
    describe("exact years", () => {
        it("combines 1 year 0 months into 12 months", () => {
            expect(combineTerm(1, 0)).toBe(12);
        });

        it("combines 5 years 0 months into 60 months", () => {
            expect(combineTerm(5, 0)).toBe(60);
        });

        it("combines 30 years 0 months into 360 months", () => {
            expect(combineTerm(30, 0)).toBe(360);
        });

        it("combines 35 years 0 months into 420 months", () => {
            expect(combineTerm(35, 0)).toBe(420);
        });
    });

    describe("years with months", () => {
        it("combines 1 year 1 month into 13 months", () => {
            expect(combineTerm(1, 1)).toBe(13);
        });

        it("combines 1 year 6 months into 18 months", () => {
            expect(combineTerm(1, 6)).toBe(18);
        });

        it("combines 30 years 6 months into 366 months", () => {
            expect(combineTerm(30, 6)).toBe(366);
        });
    });

    describe("edge cases", () => {
        it("combines 0 years 0 months into 0 months", () => {
            expect(combineTerm(0, 0)).toBe(0);
        });

        it("combines 0 years 6 months into 6 months", () => {
            expect(combineTerm(0, 6)).toBe(6);
        });
    });

    describe("roundtrip with splitTerm", () => {
        it("roundtrips correctly for various values", () => {
            const testValues = [60, 120, 180, 240, 300, 360, 366, 420];
            for (const months of testValues) {
                const { years, months: m } = splitTerm(months);
                expect(combineTerm(years, m)).toBe(months);
            }
        });
    });
});

describe("formatTermDisplay", () => {
    describe("full format (default)", () => {
        it("formats exact years without months", () => {
            expect(formatTermDisplay(360)).toBe("30 years");
        });

        it("formats 1 year correctly", () => {
            expect(formatTermDisplay(12)).toBe("1 years");
        });

        it("formats years with months", () => {
            expect(formatTermDisplay(366)).toBe("30 years 6 months");
        });

        it("formats 1 year 1 month", () => {
            expect(formatTermDisplay(13)).toBe("1 years 1 months");
        });
    });

    describe("compact format", () => {
        it("formats exact years in compact form", () => {
            expect(formatTermDisplay(360, { compact: true })).toBe("30 yrs");
        });

        it("formats years with months in compact form", () => {
            expect(formatTermDisplay(366, { compact: true })).toBe("30y 6m");
        });

        it("formats 1 year in compact form", () => {
            expect(formatTermDisplay(12, { compact: true })).toBe("1 yrs");
        });

        it("formats 1 year 1 month in compact form", () => {
            expect(formatTermDisplay(13, { compact: true })).toBe("1y 1m");
        });
    });

    describe("typical mortgage terms", () => {
        it("formats 25-year mortgage", () => {
            expect(formatTermDisplay(300)).toBe("25 years");
        });

        it("formats 30-year mortgage", () => {
            expect(formatTermDisplay(360)).toBe("30 years");
        });

        it("formats 35-year mortgage", () => {
            expect(formatTermDisplay(420)).toBe("35 years");
        });

        it("formats 20-year 6-month term", () => {
            expect(formatTermDisplay(246)).toBe("20 years 6 months");
        });
    });
});

describe("isValidTerm", () => {
    describe("valid terms", () => {
        it("returns true for minimum term (60 months / 5 years)", () => {
            expect(isValidTerm(60)).toBe(true);
        });

        it("returns true for maximum term (480 months / 40 years)", () => {
            expect(isValidTerm(480)).toBe(true);
        });

        it("returns true for typical 25-year term", () => {
            expect(isValidTerm(300)).toBe(true);
        });

        it("returns true for typical 30-year term", () => {
            expect(isValidTerm(360)).toBe(true);
        });

        it("returns true for 35-year term", () => {
            expect(isValidTerm(420)).toBe(true);
        });

        it("returns true for mid-range term with months", () => {
            expect(isValidTerm(366)).toBe(true);
        });
    });

    describe("invalid terms", () => {
        it("returns false for term below minimum (59 months)", () => {
            expect(isValidTerm(59)).toBe(false);
        });

        it("returns false for term above maximum (481 months)", () => {
            expect(isValidTerm(481)).toBe(false);
        });

        it("returns false for 0 months", () => {
            expect(isValidTerm(0)).toBe(false);
        });

        it("returns false for negative term", () => {
            expect(isValidTerm(-12)).toBe(false);
        });

        it("returns false for very short term (1 year)", () => {
            expect(isValidTerm(12)).toBe(false);
        });
    });
});

describe("isValidTermYears", () => {
    describe("valid years", () => {
        it("returns true for minimum years (5)", () => {
            expect(isValidTermYears(5)).toBe(true);
        });

        it("returns true for maximum years (40)", () => {
            expect(isValidTermYears(40)).toBe(true);
        });

        it("returns true for typical 25 years", () => {
            expect(isValidTermYears(25)).toBe(true);
        });

        it("returns true for typical 30 years", () => {
            expect(isValidTermYears(30)).toBe(true);
        });

        it("returns true for 35 years", () => {
            expect(isValidTermYears(35)).toBe(true);
        });
    });

    describe("invalid years", () => {
        it("returns false for below minimum (4 years)", () => {
            expect(isValidTermYears(4)).toBe(false);
        });

        it("returns false for above maximum (41 years)", () => {
            expect(isValidTermYears(41)).toBe(false);
        });

        it("returns false for 0 years", () => {
            expect(isValidTermYears(0)).toBe(false);
        });

        it("returns false for negative years", () => {
            expect(isValidTermYears(-5)).toBe(false);
        });
    });
});
