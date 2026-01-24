import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "../forms";
import { getStoredVersion, setStoredVersion } from "../whats-new";

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

describe("whats-new storage", () => {
	beforeEach(() => {
		localStorageMock.clear();
		vi.clearAllMocks();
	});

	describe("getStoredVersion", () => {
		it("returns null when no version is stored", () => {
			const result = getStoredVersion();
			expect(result).toBeNull();
		});

		it("returns parsed integer for valid stored version", () => {
			localStorageMock.store[STORAGE_KEYS.WHATS_NEW_VERSION] = "5";

			const result = getStoredVersion();

			expect(result).toBe(5);
		});

		it("returns 0 for version 0", () => {
			localStorageMock.store[STORAGE_KEYS.WHATS_NEW_VERSION] = "0";

			const result = getStoredVersion();

			expect(result).toBe(0);
		});

		it("returns null for empty string (falsy after parseInt)", () => {
			localStorageMock.store[STORAGE_KEYS.WHATS_NEW_VERSION] = "";

			// parseInt("", 10) returns NaN, but the function checks for falsy stored value first
			const result = getStoredVersion();

			expect(result).toBeNull();
		});

		it("handles large version numbers", () => {
			localStorageMock.store[STORAGE_KEYS.WHATS_NEW_VERSION] = "999";

			const result = getStoredVersion();

			expect(result).toBe(999);
		});

		it("parses string with leading zeros", () => {
			localStorageMock.store[STORAGE_KEYS.WHATS_NEW_VERSION] = "007";

			const result = getStoredVersion();

			expect(result).toBe(7);
		});

		it("returns NaN for non-numeric string (parseInt behavior)", () => {
			localStorageMock.store[STORAGE_KEYS.WHATS_NEW_VERSION] = "abc";

			const result = getStoredVersion();

			expect(result).toBeNaN();
		});

		it("parses numeric prefix for mixed string (parseInt behavior)", () => {
			localStorageMock.store[STORAGE_KEYS.WHATS_NEW_VERSION] = "42abc";

			const result = getStoredVersion();

			expect(result).toBe(42);
		});
	});

	describe("setStoredVersion", () => {
		it("saves version to localStorage as string", () => {
			setStoredVersion(5);

			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				STORAGE_KEYS.WHATS_NEW_VERSION,
				"5",
			);
		});

		it("saves version 0", () => {
			setStoredVersion(0);

			expect(localStorageMock.store[STORAGE_KEYS.WHATS_NEW_VERSION]).toBe("0");
		});

		it("overwrites existing version", () => {
			localStorageMock.store[STORAGE_KEYS.WHATS_NEW_VERSION] = "3";

			setStoredVersion(10);

			expect(localStorageMock.store[STORAGE_KEYS.WHATS_NEW_VERSION]).toBe("10");
		});

		it("handles large version numbers", () => {
			setStoredVersion(999);

			expect(localStorageMock.store[STORAGE_KEYS.WHATS_NEW_VERSION]).toBe(
				"999",
			);
		});
	});

	describe("roundtrip", () => {
		it("saves and retrieves version correctly", () => {
			setStoredVersion(7);
			const result = getStoredVersion();

			expect(result).toBe(7);
		});

		it("handles incrementing version", () => {
			setStoredVersion(1);
			expect(getStoredVersion()).toBe(1);

			setStoredVersion(2);
			expect(getStoredVersion()).toBe(2);

			setStoredVersion(3);
			expect(getStoredVersion()).toBe(3);
		});
	});
});
