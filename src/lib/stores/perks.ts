import { atom } from "nanostores";
import { fetchPerksData } from "@/lib/data/fetch";
import type { Perk } from "@/lib/schemas";

export const $perks = atom<Perk[]>([]);

let fetched = false;
let fetchPromise: Promise<void> | null = null;

export async function fetchPerks(): Promise<void> {
	if (fetched) return;
	if (fetchPromise) {
		await fetchPromise;
		return;
	}

	fetchPromise = (async () => {
		const perks = await fetchPerksData();
		if (perks.length > 0) {
			$perks.set(perks);
			fetched = true;
		}
	})();

	await fetchPromise;
}

export function isPerksFetched(): boolean {
	return fetched;
}

export function markPerksFetched(): void {
	fetched = true;
}
