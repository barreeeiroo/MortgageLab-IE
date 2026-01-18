import { LOCALE } from "@/lib/constants/site";

/**
 * Short month names for display (Jan, Feb, Mar, etc.)
 */
export const SHORT_MONTH_NAMES = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
] as const;

/**
 * Format a date to short month/year format (e.g., "Feb '26")
 */
export function formatShortMonthYear(date: Date): string {
	return date.toLocaleDateString(LOCALE, {
		month: "short",
		year: "2-digit",
	});
}

/**
 * Format an ISO date string to short month/year format (e.g., "Feb '26")
 */
export function formatShortMonthYearFromString(
	isoString: string | undefined,
): string {
	if (!isoString) return "";
	return formatShortMonthYear(new Date(isoString));
}

/**
 * Format a date to month/year format with full year (e.g., "Feb 2026")
 */
export function formatMonthYearShort(date: Date): string {
	return date.toLocaleDateString(LOCALE, {
		month: "short",
		year: "numeric",
	});
}

/**
 * Format an ISO date string to month/year format with full year (e.g., "Feb 2026")
 */
export function formatMonthYearShortFromString(
	isoString: string | undefined,
): string {
	if (!isoString) return "";
	return formatMonthYearShort(new Date(isoString));
}

/**
 * Add months to a date string (avoids timezone issues)
 * Returns empty string if no start date provided
 * @param dateStr - ISO date string "YYYY-MM-DD"
 * @param months - 1-indexed month number (1 = start date, 2 = one month later)
 */
export function addMonthsToDateString(
	dateStr: string | undefined,
	months: number,
): string {
	if (!dateStr) return "";

	// Parse date components directly to avoid timezone issues
	const [year, month, day] = dateStr.split("-").map(Number);

	// Calculate new date (months - 1 because month 1 = start date)
	const totalMonths = year * 12 + (month - 1) + (months - 1);
	const newYear = Math.floor(totalMonths / 12);
	const newMonth = (totalMonths % 12) + 1;

	return `${newYear}-${String(newMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Get the calendar year for a given month offset from start date
 * Returns undefined if no start date (for relative periods mode)
 * @param startDate - ISO date string "YYYY-MM-DD"
 * @param monthNumber - 1-indexed month number (1 = first month)
 */
export function getCalendarYearForMonth(
	startDate: string | undefined,
	monthNumber: number,
): number | undefined {
	if (!startDate) return undefined;

	const [startYear, startMonth] = startDate.split("-").map(Number);

	// Calculate total months from year 0
	const totalMonths = startYear * 12 + (startMonth - 1) + (monthNumber - 1);
	return Math.floor(totalMonths / 12);
}

/**
 * Check if a given month is the first month of a new calendar year
 * @param startDate - ISO date string "YYYY-MM-DD"
 * @param monthNumber - 1-indexed month number (1 = first month)
 */
export function isFirstMonthOfCalendarYear(
	startDate: string | undefined,
	monthNumber: number,
): boolean {
	if (!startDate) return false;
	if (monthNumber === 1) return true; // First month is always a "new year" for tracking

	const [startYear, startMonth] = startDate.split("-").map(Number);

	// Calculate the calendar month (1-12) for this month number
	const totalMonths = startYear * 12 + (startMonth - 1) + (monthNumber - 1);
	const calendarMonth = (totalMonths % 12) + 1;

	return calendarMonth === 1; // January
}

/**
 * Calculate age from birth date
 */
export function calculateAge(birthDate: Date | undefined): number | null {
	if (!birthDate) return null;
	const today = new Date();
	let age = today.getFullYear() - birthDate.getFullYear();
	const monthDiff = today.getMonth() - birthDate.getMonth();
	if (
		monthDiff < 0 ||
		(monthDiff === 0 && today.getDate() < birthDate.getDate())
	) {
		age--;
	}
	return age;
}

/**
 * Format an ISO date string to a short localized date (e.g., "3 Jan 2026")
 */
export function formatShortDate(isoString: string | undefined): string {
	if (!isoString) return "—";
	const date = new Date(isoString);
	return date.toLocaleDateString(LOCALE, {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

/**
 * Format an ISO date string to month/year format (e.g., "January 2026")
 */
export function formatMonthYear(isoString: string | undefined): string {
	if (!isoString) return "Not set";
	const date = new Date(isoString);
	return date.toLocaleDateString(LOCALE, {
		month: "long",
		year: "numeric",
	});
}

/**
 * Format a Date object to ISO date string (YYYY-MM-DD) without timezone issues
 */
export function formatDateLocal(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * Calculate calendar date from start date (ISO string) and month offset
 * @param startDate - ISO date string "YYYY-MM-DD" or "YYYY-MM"
 * @param monthOffset - Number of months to add (0-indexed, so 0 = start month)
 * @returns Date object for the target month
 */
export function getCalendarDate(startDate: string, monthOffset: number): Date {
	const [year, month] = startDate.split("-").map(Number);
	const totalMonths = year * 12 + (month - 1) + monthOffset;
	const newYear = Math.floor(totalMonths / 12);
	const newMonth = totalMonths % 12;
	return new Date(newYear, newMonth, 1);
}

/**
 * Format an incremental period (Year X, Month Y)
 * @param month - 1-indexed month of mortgage (1 = first month)
 */
export function formatIncrementalPeriod(month: number): string {
	const years = Math.floor((month - 1) / 12);
	const months = ((month - 1) % 12) + 1;
	if (years === 0) return `Month ${months}`;
	if (months === 1) return `Year ${years + 1}`;
	return `Year ${years + 1}, Month ${months}`;
}

/**
 * Format a transition date showing calendar date (if available) with incremental in parenthesis
 * @param startDate - ISO date string for mortgage start, or undefined
 * @param month - 1-indexed month of mortgage
 * @param options.short - If true, omits the incremental period part (e.g., "Jan 2026" instead of "Jan 2026 (Year 1)")
 */
export function formatTransitionDate(
	startDate: string | undefined,
	month: number,
	options?: { short?: boolean },
): string {
	const incremental = formatIncrementalPeriod(month);

	if (startDate) {
		const calendarDate = getCalendarDate(startDate, month - 1);
		const formatted = formatMonthYearShort(calendarDate);
		if (options?.short) {
			return formatted;
		}
		return `${formatted} (${incremental})`;
	}
	return incremental;
}

/**
 * Get the full month name for a given month number.
 * @param month - Month number (1-12)
 * @returns Full month name (e.g., "January", "February")
 */
export function formatMonthName(month: number): string {
	return new Date(2000, month - 1).toLocaleString(LOCALE, { month: "long" });
}

/**
 * Format a date as a full timestamp.
 * @param date - Date to format (defaults to now)
 * @returns Localized timestamp (e.g., "18/01/2026, 14:30:00")
 */
export function formatTimestamp(date: Date = new Date()): string {
	return date.toLocaleString(LOCALE);
}

/**
 * Format a date as month and day (e.g., "Jan 18").
 * @param date - Date to format
 * @returns Short month and day string
 */
export function formatMonthDay(date: Date): string {
	return date.toLocaleDateString(LOCALE, {
		month: "short",
		day: "numeric",
	});
}

/**
 * Format a date as a localized date string (e.g., "18/01/2026").
 * @param date - Date to format (defaults to now)
 * @returns Localized date string without time
 */
export function formatDateOnly(date: Date = new Date()): string {
	return date.toLocaleDateString(LOCALE);
}
