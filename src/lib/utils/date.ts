/**
 * Calculate age from birth date
 */
export function calculateAge(birthDate: Date | undefined): number | null {
	if (!birthDate) return null;
	const today = new Date();
	return today.getFullYear() - birthDate.getFullYear();
}
