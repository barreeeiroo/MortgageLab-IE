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
	return date.toLocaleDateString("en-IE", {
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
	return date.toLocaleDateString("en-IE", {
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
 */
export function formatTransitionDate(
	startDate: string | undefined,
	month: number,
): string {
	const incremental = formatIncrementalPeriod(month);

	if (startDate) {
		const calendarDate = getCalendarDate(startDate, month - 1);
		const formatted = calendarDate.toLocaleDateString("en-IE", {
			month: "short",
			year: "numeric",
		});
		return `${formatted} (${incremental})`;
	}
	return incremental;
}
