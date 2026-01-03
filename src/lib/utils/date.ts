/**
 * Calculate age from birth date
 */
export function calculateAge(birthDate: Date | undefined): number | null {
	if (!birthDate) return null;
	const today = new Date();
	return today.getFullYear() - birthDate.getFullYear();
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
