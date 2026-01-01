import { atom, type WritableAtom } from "nanostores";

export interface DataStore<T> {
	$data: WritableAtom<T[]>;
	fetch: () => Promise<void>;
	isFetched: () => boolean;
	markFetched: () => void;
}

/**
 * Creates a data store with fetch deduplication and caching.
 * @param fetchFn - Async function that fetches the data
 * @returns Store object with atom, fetch, isFetched, and markFetched
 */
export function createDataStore<T>(fetchFn: () => Promise<T[]>): DataStore<T> {
	const $data = atom<T[]>([]);
	let fetched = false;
	let fetchPromise: Promise<void> | null = null;

	async function fetch(): Promise<void> {
		if (fetched) return;
		if (fetchPromise) {
			await fetchPromise;
			return;
		}

		fetchPromise = (async () => {
			const data = await fetchFn();
			if (data.length > 0) {
				$data.set(data);
				fetched = true;
			}
		})();

		await fetchPromise;
	}

	function isFetched(): boolean {
		return fetched;
	}

	function markFetched(): void {
		fetched = true;
	}

	return { $data, fetch, isFetched, markFetched };
}
