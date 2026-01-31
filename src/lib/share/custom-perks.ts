import type { StoredCustomPerk } from "@/lib/stores/custom-perks";

/**
 * Custom perks URL sharing - compression/decompression
 * Used for including custom perks in shared URLs
 */

// Compressed custom perk format for URL (abbreviated keys)
export interface CompressedCustomPerk {
    id: string;
    l: string; // label
    d?: string; // description
    i: string; // icon
}

export function compressCustomPerk(
    perk: StoredCustomPerk,
): CompressedCustomPerk {
    return {
        id: perk.id,
        l: perk.label,
        d: perk.description,
        i: perk.icon,
    };
}

export function decompressCustomPerk(
    compressed: CompressedCustomPerk,
): StoredCustomPerk {
    return {
        id: compressed.id,
        label: compressed.l,
        description: compressed.d,
        icon: compressed.i,
    };
}

export function compressCustomPerks(
    perks: StoredCustomPerk[],
): CompressedCustomPerk[] {
    return perks.map(compressCustomPerk);
}

export function decompressCustomPerks(
    compressed: CompressedCustomPerk[],
): StoredCustomPerk[] {
    return compressed.map(decompressCustomPerk);
}
