import { STORAGE_KEYS } from "./forms";

export type ThemePreference = "dark" | "light";

export function getStoredTheme(): ThemePreference | null {
	if (typeof window === "undefined") return null;
	const stored = localStorage.getItem(STORAGE_KEYS.THEME);
	return stored === "dark" || stored === "light" ? stored : null;
}

export function saveTheme(theme: ThemePreference): void {
	if (typeof window === "undefined") return;
	localStorage.setItem(STORAGE_KEYS.THEME, theme);
}
