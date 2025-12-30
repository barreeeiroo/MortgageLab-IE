export function loadFromStorage<T>(key: string): Partial<T> {
	if (typeof window === "undefined") return {};
	try {
		const stored = localStorage.getItem(key);
		return stored ? JSON.parse(stored) : {};
	} catch {
		return {};
	}
}

export function saveToStorage<T>(key: string, state: T): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(key, JSON.stringify(state));
	} catch {
		// Ignore storage errors
	}
}
