import { atom, computed } from "nanostores";
import type { Perk } from "@/lib/schemas/perk";
import { $perks } from "./perks";

/**
 * Stored custom perk - what we save to localStorage
 * Doesn't include isCustom since all perks in custom-perks storage are custom by definition
 */
export interface StoredCustomPerk extends Perk {
	createdAt?: string;
	lastUpdatedAt?: string;
}

/**
 * Custom perk with isCustom flag - used in the app after loading from storage
 */
export interface CustomPerk extends StoredCustomPerk {
	isCustom: true;
}

/**
 * Combined perk type that can be either a standard Perk or a CustomPerk
 */
export type AnyPerk = Perk | CustomPerk;

/**
 * Check if a perk is a custom perk
 */
export function isCustomPerk(perk: AnyPerk): perk is CustomPerk {
	return "isCustom" in perk && perk.isCustom === true;
}

/**
 * Convert stored perks to custom perks (add isCustom flag)
 */
export function hydrateCustomPerks(stored: StoredCustomPerk[]): CustomPerk[] {
	return stored.map((perk) => ({ ...perk, isCustom: true as const }));
}

export const CUSTOM_PERKS_STORAGE_KEY = "custom-perks";

// Atom for stored custom perks (raw from localStorage)
export const $storedCustomPerks = atom<StoredCustomPerk[]>([]);

// Track initialization
let customPerksInitialized = false;

// Initialize custom perks from localStorage
export function initializeCustomPerks(): void {
	if (typeof window === "undefined" || customPerksInitialized) return;
	customPerksInitialized = true;

	try {
		const stored = localStorage.getItem(CUSTOM_PERKS_STORAGE_KEY);
		if (stored) {
			$storedCustomPerks.set(JSON.parse(stored));
		}
	} catch {
		// Ignore parse errors, use empty array
	}
}

// Computed: hydrated custom perks with isCustom flag
export const $customPerks = computed($storedCustomPerks, (stored) =>
	hydrateCustomPerks(stored),
);

// Computed: all perks (standard + custom)
export const $allPerks = computed(
	[$perks, $customPerks],
	(perks, customPerks): AnyPerk[] => [...perks, ...customPerks],
);

// Actions
export function addCustomPerk(perk: StoredCustomPerk): void {
	const now = new Date().toISOString();
	const perkWithTimestamps: StoredCustomPerk = {
		...perk,
		createdAt: now,
		lastUpdatedAt: now,
	};
	const current = $storedCustomPerks.get();
	const updated = [...current, perkWithTimestamps];
	$storedCustomPerks.set(updated);
	persistCustomPerks(updated);
}

export function removeCustomPerk(perkId: string): void {
	const current = $storedCustomPerks.get();
	const updated = current.filter((p) => p.id !== perkId);
	$storedCustomPerks.set(updated);
	persistCustomPerks(updated);
}

export function updateCustomPerk(perk: StoredCustomPerk): void {
	const current = $storedCustomPerks.get();
	const updated = current.map((p) =>
		p.id === perk.id
			? {
					...perk,
					createdAt: p.createdAt,
					lastUpdatedAt: new Date().toISOString(),
				}
			: p,
	);
	$storedCustomPerks.set(updated);
	persistCustomPerks(updated);
}

export function clearCustomPerks(): void {
	$storedCustomPerks.set([]);
	persistCustomPerks([]);
}

function persistCustomPerks(perks: StoredCustomPerk[]): void {
	if (typeof window !== "undefined") {
		localStorage.setItem(CUSTOM_PERKS_STORAGE_KEY, JSON.stringify(perks));
	}
}

/**
 * Merge shared custom perks with existing ones (used when loading from URL)
 * Deduplicates by ID, preserving existing perks over shared ones
 */
export function mergeCustomPerks(sharedPerks: StoredCustomPerk[]): void {
	const current = $storedCustomPerks.get();
	const existingIds = new Set(current.map((p) => p.id));
	const newPerks = sharedPerks.filter((p) => !existingIds.has(p.id));

	if (newPerks.length > 0) {
		const updated = [...current, ...newPerks];
		$storedCustomPerks.set(updated);
		persistCustomPerks(updated);
	}
}
