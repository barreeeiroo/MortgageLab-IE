import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Perk } from "@/lib/schemas/perk";
import {
	$storedCustomPerks,
	addCustomPerk,
	type CustomPerk,
	clearCustomPerks,
	hydrateCustomPerks,
	isCustomPerk,
	mergeCustomPerks,
	removeCustomPerk,
	type StoredCustomPerk,
	updateCustomPerk,
} from "../custom-perks";

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

// Helper to create a minimal perk
function createStoredPerk(
	overrides: Partial<StoredCustomPerk> = {},
): StoredCustomPerk {
	return {
		id: "custom-perk-1",
		label: "Custom Perk",
		description: "A custom perk for testing",
		icon: "Gift",
		...overrides,
	};
}

describe("isCustomPerk", () => {
	it("returns true for perk with isCustom: true", () => {
		const customPerk: CustomPerk = {
			...createStoredPerk(),
			isCustom: true,
		};

		expect(isCustomPerk(customPerk)).toBe(true);
	});

	it("returns false for perk without isCustom property", () => {
		const regularPerk: Perk = {
			id: "regular-perk",
			label: "Regular Perk",
			description: "A regular perk",
			icon: "Gift",
		};

		expect(isCustomPerk(regularPerk)).toBe(false);
	});

	it("returns false for perk with isCustom: false", () => {
		const perk = {
			...createStoredPerk(),
			isCustom: false as unknown as true,
		};

		expect(isCustomPerk(perk as unknown as CustomPerk)).toBe(false);
	});
});

describe("hydrateCustomPerks", () => {
	it("adds isCustom: true to all perks", () => {
		const stored: StoredCustomPerk[] = [
			createStoredPerk({ id: "perk-1" }),
			createStoredPerk({ id: "perk-2" }),
		];

		const result = hydrateCustomPerks(stored);

		expect(result).toHaveLength(2);
		expect(result[0].isCustom).toBe(true);
		expect(result[1].isCustom).toBe(true);
	});

	it("preserves all other properties", () => {
		const stored: StoredCustomPerk[] = [
			createStoredPerk({
				id: "perk-1",
				label: "My Perk",
				description: "My custom description",
				icon: "Star",
			}),
		];

		const result = hydrateCustomPerks(stored);

		expect(result[0].id).toBe("perk-1");
		expect(result[0].label).toBe("My Perk");
		expect(result[0].description).toBe("My custom description");
		expect(result[0].icon).toBe("Star");
	});

	it("returns empty array for empty input", () => {
		const result = hydrateCustomPerks([]);

		expect(result).toEqual([]);
	});

	it("preserves timestamps", () => {
		const stored: StoredCustomPerk[] = [
			createStoredPerk({
				createdAt: "2025-01-01T00:00:00.000Z",
				lastUpdatedAt: "2025-01-15T00:00:00.000Z",
			}),
		];

		const result = hydrateCustomPerks(stored);

		expect(result[0].createdAt).toBe("2025-01-01T00:00:00.000Z");
		expect(result[0].lastUpdatedAt).toBe("2025-01-15T00:00:00.000Z");
	});
});

describe("custom perks store actions", () => {
	beforeEach(() => {
		localStorageMock.clear();
		vi.clearAllMocks();
		$storedCustomPerks.set([]);
	});

	describe("addCustomPerk", () => {
		it("adds perk to store", () => {
			const perk = createStoredPerk({ id: "new-perk" });

			addCustomPerk(perk);

			const stored = $storedCustomPerks.get();
			expect(stored).toHaveLength(1);
			expect(stored[0].id).toBe("new-perk");
		});

		it("adds timestamps to perk", () => {
			const perk = createStoredPerk({ id: "new-perk" });

			addCustomPerk(perk);

			const stored = $storedCustomPerks.get();
			expect(stored[0].createdAt).toBeDefined();
			expect(stored[0].lastUpdatedAt).toBeDefined();
		});

		it("persists to localStorage", () => {
			const perk = createStoredPerk({ id: "new-perk" });

			addCustomPerk(perk);

			expect(localStorageMock.setItem).toHaveBeenCalled();
		});
	});

	describe("removeCustomPerk", () => {
		it("removes perk from store", () => {
			$storedCustomPerks.set([
				createStoredPerk({ id: "perk-1" }),
				createStoredPerk({ id: "perk-2" }),
			]);

			removeCustomPerk("perk-1");

			const stored = $storedCustomPerks.get();
			expect(stored).toHaveLength(1);
			expect(stored[0].id).toBe("perk-2");
		});

		it("does nothing for non-existent perk", () => {
			$storedCustomPerks.set([createStoredPerk({ id: "perk-1" })]);

			removeCustomPerk("non-existent");

			const stored = $storedCustomPerks.get();
			expect(stored).toHaveLength(1);
		});
	});

	describe("updateCustomPerk", () => {
		it("updates existing perk", () => {
			$storedCustomPerks.set([
				createStoredPerk({ id: "perk-1", label: "Old Label" }),
			]);

			updateCustomPerk(createStoredPerk({ id: "perk-1", label: "New Label" }));

			const stored = $storedCustomPerks.get();
			expect(stored[0].label).toBe("New Label");
		});

		it("preserves createdAt but updates lastUpdatedAt", () => {
			$storedCustomPerks.set([
				createStoredPerk({
					id: "perk-1",
					createdAt: "2025-01-01T00:00:00.000Z",
					lastUpdatedAt: "2025-01-01T00:00:00.000Z",
				}),
			]);

			updateCustomPerk(createStoredPerk({ id: "perk-1", label: "New Label" }));

			const stored = $storedCustomPerks.get();
			expect(stored[0].createdAt).toBe("2025-01-01T00:00:00.000Z");
			expect(stored[0].lastUpdatedAt).not.toBe("2025-01-01T00:00:00.000Z");
		});
	});

	describe("clearCustomPerks", () => {
		it("removes all perks", () => {
			$storedCustomPerks.set([
				createStoredPerk({ id: "perk-1" }),
				createStoredPerk({ id: "perk-2" }),
			]);

			clearCustomPerks();

			expect($storedCustomPerks.get()).toEqual([]);
		});
	});

	describe("mergeCustomPerks", () => {
		it("adds new perks to existing ones", () => {
			$storedCustomPerks.set([createStoredPerk({ id: "existing" })]);

			mergeCustomPerks([createStoredPerk({ id: "new" })]);

			const stored = $storedCustomPerks.get();
			expect(stored).toHaveLength(2);
		});

		it("does not overwrite perks with same ID (keeps existing)", () => {
			$storedCustomPerks.set([
				createStoredPerk({ id: "perk-1", label: "Existing Label" }),
			]);

			mergeCustomPerks([
				createStoredPerk({ id: "perk-1", label: "New Label" }),
			]);

			const stored = $storedCustomPerks.get();
			expect(stored).toHaveLength(1);
			expect(stored[0].label).toBe("Existing Label");
		});

		it("only adds truly new perks", () => {
			$storedCustomPerks.set([createStoredPerk({ id: "existing" })]);

			mergeCustomPerks([
				createStoredPerk({ id: "existing" }),
				createStoredPerk({ id: "new" }),
			]);

			const stored = $storedCustomPerks.get();
			expect(stored).toHaveLength(2);
		});
	});
});
