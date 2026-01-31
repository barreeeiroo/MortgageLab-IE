import { describe, expect, it } from "vitest";
import {
    calculateAge,
    formatDateLocal,
    formatIncrementalPeriod,
    formatMonthYear,
    formatShortDate,
    formatTransitionDate,
    getCalendarDate,
} from "../date";

// Helper to create a date for a specific age
function createDateForAge(age: number): Date {
    const today = new Date();
    return new Date(
        today.getFullYear() - age,
        today.getMonth(),
        today.getDate(),
    );
}

describe("calculateAge", () => {
    describe("valid dates", () => {
        it("calculates age correctly for 30-year-old", () => {
            const birthDate = createDateForAge(30);
            expect(calculateAge(birthDate)).toBe(30);
        });

        it("calculates age correctly for 45-year-old", () => {
            const birthDate = createDateForAge(45);
            expect(calculateAge(birthDate)).toBe(45);
        });

        it("calculates age correctly for 65-year-old", () => {
            const birthDate = createDateForAge(65);
            expect(calculateAge(birthDate)).toBe(65);
        });

        it("calculates age of 0 for newborn", () => {
            const today = new Date();
            const birthDate = new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate(),
            );
            expect(calculateAge(birthDate)).toBe(0);
        });
    });

    describe("birthday edge cases", () => {
        it("returns correct age before birthday this year", () => {
            const today = new Date();
            // Birthday is next month
            const birthDate = new Date(
                today.getFullYear() - 30,
                today.getMonth() + 1,
                15,
            );
            expect(calculateAge(birthDate)).toBe(29);
        });

        it("returns correct age after birthday this year", () => {
            const today = new Date();
            // Birthday was last month
            const birthDate = new Date(
                today.getFullYear() - 30,
                today.getMonth() - 1,
                15,
            );
            expect(calculateAge(birthDate)).toBe(30);
        });

        it("handles birthday today", () => {
            const today = new Date();
            const birthDate = new Date(
                today.getFullYear() - 25,
                today.getMonth(),
                today.getDate(),
            );
            expect(calculateAge(birthDate)).toBe(25);
        });

        it("handles birthday tomorrow (same month)", () => {
            const today = new Date();
            const birthDate = new Date(
                today.getFullYear() - 25,
                today.getMonth(),
                today.getDate() + 1,
            );
            // If birthday is tomorrow, they're still previous age
            expect(calculateAge(birthDate)).toBe(24);
        });
    });

    describe("invalid inputs", () => {
        it("returns null for undefined", () => {
            expect(calculateAge(undefined)).toBeNull();
        });
    });
});

describe("formatShortDate", () => {
    describe("valid dates", () => {
        it("formats date correctly", () => {
            expect(formatShortDate("2026-01-15")).toBe("15 Jan 2026");
        });

        it("formats end of year date", () => {
            expect(formatShortDate("2025-12-25")).toBe("25 Dec 2025");
        });

        it("formats start of year date", () => {
            expect(formatShortDate("2024-01-01")).toBe("1 Jan 2024");
        });

        it("formats mid-year date", () => {
            expect(formatShortDate("2026-06-20")).toBe("20 Jun 2026");
        });
    });

    describe("invalid/empty inputs", () => {
        it("returns em dash for undefined", () => {
            expect(formatShortDate(undefined)).toBe("—");
        });

        it("returns em dash for empty string", () => {
            expect(formatShortDate("")).toBe("—");
        });
    });
});

describe("formatMonthYear", () => {
    describe("valid dates", () => {
        it("formats January correctly", () => {
            expect(formatMonthYear("2026-01-15")).toBe("January 2026");
        });

        it("formats December correctly", () => {
            expect(formatMonthYear("2025-12-01")).toBe("December 2025");
        });

        it("formats June correctly", () => {
            expect(formatMonthYear("2024-06-15")).toBe("June 2024");
        });

        it("ignores day of month", () => {
            expect(formatMonthYear("2026-03-01")).toBe("March 2026");
            expect(formatMonthYear("2026-03-31")).toBe("March 2026");
        });
    });

    describe("invalid/empty inputs", () => {
        it("returns 'Not set' for undefined", () => {
            expect(formatMonthYear(undefined)).toBe("Not set");
        });

        it("returns 'Not set' for empty string", () => {
            expect(formatMonthYear("")).toBe("Not set");
        });
    });
});

describe("formatDateLocal", () => {
    describe("formatting", () => {
        it("formats date with zero-padded month and day", () => {
            const date = new Date(2026, 0, 5); // January 5, 2026
            expect(formatDateLocal(date)).toBe("2026-01-05");
        });

        it("formats date without zero padding needed", () => {
            const date = new Date(2026, 10, 25); // November 25, 2026
            expect(formatDateLocal(date)).toBe("2026-11-25");
        });

        it("formats first day of year", () => {
            const date = new Date(2026, 0, 1);
            expect(formatDateLocal(date)).toBe("2026-01-01");
        });

        it("formats last day of year", () => {
            const date = new Date(2025, 11, 31);
            expect(formatDateLocal(date)).toBe("2025-12-31");
        });

        it("handles leap year date", () => {
            const date = new Date(2024, 1, 29); // Feb 29, 2024 (leap year)
            expect(formatDateLocal(date)).toBe("2024-02-29");
        });
    });

    describe("month indexing", () => {
        it("correctly converts 0-indexed month to 1-indexed", () => {
            // JavaScript months are 0-indexed
            const date = new Date(2026, 5, 15); // June (month 5) = 06
            expect(formatDateLocal(date)).toBe("2026-06-15");
        });

        it("handles December (month 11 = 12)", () => {
            const date = new Date(2026, 11, 15);
            expect(formatDateLocal(date)).toBe("2026-12-15");
        });
    });
});

describe("getCalendarDate", () => {
    describe("basic month offsets", () => {
        it("returns start date for offset 0", () => {
            const result = getCalendarDate("2026-01", 0);
            expect(result.getFullYear()).toBe(2026);
            expect(result.getMonth()).toBe(0); // January
        });

        it("advances one month for offset 1", () => {
            const result = getCalendarDate("2026-01", 1);
            expect(result.getFullYear()).toBe(2026);
            expect(result.getMonth()).toBe(1); // February
        });

        it("advances 11 months within same year", () => {
            const result = getCalendarDate("2026-01", 11);
            expect(result.getFullYear()).toBe(2026);
            expect(result.getMonth()).toBe(11); // December
        });
    });

    describe("year rollovers", () => {
        it("rolls over to next year after 12 months", () => {
            const result = getCalendarDate("2026-01", 12);
            expect(result.getFullYear()).toBe(2027);
            expect(result.getMonth()).toBe(0); // January
        });

        it("handles multi-year offset (30 years)", () => {
            const result = getCalendarDate("2026-01", 360); // 30 years
            expect(result.getFullYear()).toBe(2056);
            expect(result.getMonth()).toBe(0); // January
        });

        it("handles rollover from mid-year", () => {
            const result = getCalendarDate("2026-06", 8); // June + 8 = February next year
            expect(result.getFullYear()).toBe(2027);
            expect(result.getMonth()).toBe(1); // February
        });
    });

    describe("full date format", () => {
        it("handles YYYY-MM-DD format", () => {
            const result = getCalendarDate("2026-03-15", 0);
            expect(result.getFullYear()).toBe(2026);
            expect(result.getMonth()).toBe(2); // March
        });

        it("ignores day component in offset calculation", () => {
            const result1 = getCalendarDate("2026-03-01", 1);
            const result2 = getCalendarDate("2026-03-31", 1);
            expect(result1.getMonth()).toBe(result2.getMonth());
        });
    });

    describe("mortgage term scenarios", () => {
        it("calculates end of 25-year mortgage", () => {
            const result = getCalendarDate("2026-01", 300); // 25 years
            expect(result.getFullYear()).toBe(2051);
            expect(result.getMonth()).toBe(0); // January
        });

        it("calculates end of 35-year mortgage", () => {
            const result = getCalendarDate("2026-01", 420); // 35 years
            expect(result.getFullYear()).toBe(2061);
            expect(result.getMonth()).toBe(0); // January
        });
    });
});

describe("formatIncrementalPeriod", () => {
    describe("first year", () => {
        it("formats month 1 as 'Month 1'", () => {
            expect(formatIncrementalPeriod(1)).toBe("Month 1");
        });

        it("formats month 6 as 'Month 6'", () => {
            expect(formatIncrementalPeriod(6)).toBe("Month 6");
        });

        it("formats month 12 as 'Month 12'", () => {
            expect(formatIncrementalPeriod(12)).toBe("Month 12");
        });
    });

    describe("year transitions", () => {
        it("formats month 13 as 'Year 2'", () => {
            expect(formatIncrementalPeriod(13)).toBe("Year 2");
        });

        it("formats month 14 as 'Year 2, Month 2'", () => {
            expect(formatIncrementalPeriod(14)).toBe("Year 2, Month 2");
        });

        it("formats month 24 as 'Year 2, Month 12'", () => {
            expect(formatIncrementalPeriod(24)).toBe("Year 2, Month 12");
        });

        it("formats month 25 as 'Year 3'", () => {
            expect(formatIncrementalPeriod(25)).toBe("Year 3");
        });
    });

    describe("typical mortgage milestones", () => {
        it("formats 3-year fixed end (month 36) as 'Year 3, Month 12'", () => {
            expect(formatIncrementalPeriod(36)).toBe("Year 3, Month 12");
        });

        it("formats 5-year fixed end (month 60) as 'Year 5, Month 12'", () => {
            expect(formatIncrementalPeriod(60)).toBe("Year 5, Month 12");
        });

        it("formats 10-year mark (month 120) as 'Year 10, Month 12'", () => {
            expect(formatIncrementalPeriod(120)).toBe("Year 10, Month 12");
        });

        it("formats start of year 30 (month 349) as 'Year 30'", () => {
            expect(formatIncrementalPeriod(349)).toBe("Year 30");
        });
    });
});

describe("formatTransitionDate", () => {
    describe("with start date", () => {
        it("formats first month with calendar date", () => {
            const result = formatTransitionDate("2026-01", 1);
            expect(result).toBe("Jan 2026 (Month 1)");
        });

        it("formats month 12 with calendar date", () => {
            const result = formatTransitionDate("2026-01", 12);
            expect(result).toBe("Dec 2026 (Month 12)");
        });

        it("formats year transition with calendar date", () => {
            const result = formatTransitionDate("2026-01", 13);
            expect(result).toBe("Jan 2027 (Year 2)");
        });

        it("formats mid-year start correctly", () => {
            const result = formatTransitionDate("2026-06", 7);
            expect(result).toBe("Dec 2026 (Month 7)");
        });

        it("formats multi-year offset", () => {
            const result = formatTransitionDate("2026-01", 37);
            expect(result).toBe("Jan 2029 (Year 4)");
        });
    });

    describe("with short option", () => {
        it("omits incremental period when short is true", () => {
            const result = formatTransitionDate("2026-01", 1, { short: true });
            expect(result).toBe("Jan 2026");
        });

        it("shows full format when short is false", () => {
            const result = formatTransitionDate("2026-01", 1, { short: false });
            expect(result).toBe("Jan 2026 (Month 1)");
        });

        it("shows full format when options is undefined", () => {
            const result = formatTransitionDate("2026-01", 1);
            expect(result).toBe("Jan 2026 (Month 1)");
        });
    });

    describe("without start date", () => {
        it("returns only incremental period when no start date", () => {
            const result = formatTransitionDate(undefined, 1);
            expect(result).toBe("Month 1");
        });

        it("returns year format when no start date", () => {
            const result = formatTransitionDate(undefined, 13);
            expect(result).toBe("Year 2");
        });

        it("returns year and month when no start date", () => {
            const result = formatTransitionDate(undefined, 25);
            expect(result).toBe("Year 3");
        });

        it("ignores short option when no start date", () => {
            const result = formatTransitionDate(undefined, 1, { short: true });
            expect(result).toBe("Month 1");
        });
    });

    describe("typical mortgage scenarios", () => {
        it("formats 3-year fixed end", () => {
            const result = formatTransitionDate("2026-01", 36);
            expect(result).toBe("Dec 2028 (Year 3, Month 12)");
        });

        it("formats 5-year fixed start of variable", () => {
            const result = formatTransitionDate("2026-01", 61);
            expect(result).toBe("Jan 2031 (Year 6)");
        });

        it("formats 25-year mortgage end", () => {
            const result = formatTransitionDate("2026-01", 300);
            expect(result).toBe("Dec 2050 (Year 25, Month 12)");
        });
    });
});
