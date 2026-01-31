/**
 * Perk data fetching and helper utilities.
 */

import { type Perk, PerksFileSchema } from "@/lib/schemas/perk";
import { getPath } from "@/lib/utils/path";

/**
 * Fetch perks data from the JSON file.
 * @returns Array of perks, or empty array on error
 */
export async function fetchPerksData(): Promise<Perk[]> {
    try {
        const res = await fetch(getPath("data/perks.json"));
        if (!res.ok) return [];
        const json = await res.json();
        return PerksFileSchema.parse(json);
    } catch {
        return [];
    }
}

/**
 * Get a perk by ID from a perks array
 */
export function getPerk(perks: Perk[], id: string): Perk | undefined {
    return perks.find((p) => p.id === id);
}

/**
 * Resolve an array of perk IDs to full Perk objects
 */
export function resolvePerks(perks: Perk[], perkIds: string[]): Perk[] {
    const perkMap = new Map<string, Perk>(perks.map((perk) => [perk.id, perk]));
    return perkIds.map((id) => perkMap.get(id)).filter((p): p is Perk => !!p);
}
