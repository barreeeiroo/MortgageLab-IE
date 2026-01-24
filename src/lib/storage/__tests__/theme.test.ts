import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "../forms";
import { getStoredTheme, saveTheme } from "../theme";

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] ?? null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		clear: () => {
			store = {};
		},
		get store() {
			return store;
		},
	};
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock });

describe("theme storage", () => {
	beforeEach(() => {
		localStorageMock.clear();
		vi.clearAllMocks();
	});

	describe("getStoredTheme", () => {
		it("returns null when no theme is stored", () => {
			const result = getStoredTheme();
			expect(result).toBeNull();
		});

		it("returns 'dark' when dark theme is stored", () => {
			localStorageMock.store[STORAGE_KEYS.THEME] = "dark";

			const result = getStoredTheme();

			expect(result).toBe("dark");
		});

		it("returns 'light' when light theme is stored", () => {
			localStorageMock.store[STORAGE_KEYS.THEME] = "light";

			const result = getStoredTheme();

			expect(result).toBe("light");
		});

		it("returns null for invalid stored values", () => {
			localStorageMock.store[STORAGE_KEYS.THEME] = "invalid";

			const result = getStoredTheme();

			expect(result).toBeNull();
		});

		it("returns null for empty string", () => {
			localStorageMock.store[STORAGE_KEYS.THEME] = "";

			const result = getStoredTheme();

			expect(result).toBeNull();
		});

		it("returns null for 'system' (not a valid preference)", () => {
			localStorageMock.store[STORAGE_KEYS.THEME] = "system";

			const result = getStoredTheme();

			expect(result).toBeNull();
		});
	});

	describe("saveTheme", () => {
		it("saves dark theme to localStorage", () => {
			saveTheme("dark");

			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				STORAGE_KEYS.THEME,
				"dark",
			);
			expect(localStorageMock.store[STORAGE_KEYS.THEME]).toBe("dark");
		});

		it("saves light theme to localStorage", () => {
			saveTheme("light");

			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				STORAGE_KEYS.THEME,
				"light",
			);
			expect(localStorageMock.store[STORAGE_KEYS.THEME]).toBe("light");
		});

		it("overwrites existing theme", () => {
			localStorageMock.store[STORAGE_KEYS.THEME] = "light";

			saveTheme("dark");

			expect(localStorageMock.store[STORAGE_KEYS.THEME]).toBe("dark");
		});
	});

	describe("roundtrip", () => {
		it("saves and retrieves dark theme correctly", () => {
			saveTheme("dark");
			const result = getStoredTheme();

			expect(result).toBe("dark");
		});

		it("saves and retrieves light theme correctly", () => {
			saveTheme("light");
			const result = getStoredTheme();

			expect(result).toBe("light");
		});
	});
});
