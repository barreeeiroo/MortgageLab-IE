import { atom } from "nanostores";
import { fetchLendersData } from "@/lib/data/fetch";
import type { Lender } from "@/lib/schemas";

export const $lenders = atom<Lender[]>([]);

let fetched = false;
let fetchPromise: Promise<void> | null = null;

export async function fetchLenders(): Promise<void> {
	if (fetched) return;
	if (fetchPromise) {
		await fetchPromise;
		return;
	}

	fetchPromise = (async () => {
		const lenders = await fetchLendersData();
		if (lenders.length > 0) {
			$lenders.set(lenders);
			fetched = true;
		}
	})();

	await fetchPromise;
}

export function isLendersFetched(): boolean {
	return fetched;
}

export function markLendersFetched(): void {
	fetched = true;
}
