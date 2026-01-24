import { describe, expect, it, vi } from "vitest";
import { createDataStore } from "../common";

describe("createDataStore", () => {
	it("creates store with empty initial data", () => {
		const store = createDataStore(async () => []);

		expect(store.$data.get()).toEqual([]);
	});

	it("returns isFetched as false initially", () => {
		const store = createDataStore(async () => [1, 2, 3]);

		expect(store.isFetched()).toBe(false);
	});

	it("fetches data and populates store", async () => {
		const mockData = [{ id: 1 }, { id: 2 }];
		const store = createDataStore(async () => mockData);

		await store.fetch();

		expect(store.$data.get()).toEqual(mockData);
	});

	it("marks as fetched after successful fetch", async () => {
		const store = createDataStore(async () => [{ id: 1 }]);

		await store.fetch();

		expect(store.isFetched()).toBe(true);
	});

	it("does not mark as fetched when fetch returns empty array", async () => {
		const store = createDataStore(async () => []);

		await store.fetch();

		expect(store.isFetched()).toBe(false);
	});

	it("calls fetch function only once (deduplication)", async () => {
		const fetchFn = vi.fn().mockResolvedValue([{ id: 1 }]);
		const store = createDataStore(fetchFn);

		await Promise.all([store.fetch(), store.fetch(), store.fetch()]);

		expect(fetchFn).toHaveBeenCalledTimes(1);
	});

	it("does not fetch again after first successful fetch", async () => {
		const fetchFn = vi.fn().mockResolvedValue([{ id: 1 }]);
		const store = createDataStore(fetchFn);

		await store.fetch();
		await store.fetch();
		await store.fetch();

		expect(fetchFn).toHaveBeenCalledTimes(1);
	});

	it("markFetched prevents future fetches", async () => {
		const fetchFn = vi.fn().mockResolvedValue([{ id: 1 }]);
		const store = createDataStore(fetchFn);

		store.markFetched();
		await store.fetch();

		expect(fetchFn).not.toHaveBeenCalled();
	});

	it("handles fetch errors gracefully", async () => {
		const fetchFn = vi.fn().mockRejectedValue(new Error("Network error"));
		const store = createDataStore(fetchFn);

		await expect(store.fetch()).rejects.toThrow("Network error");
	});

	it("concurrent fetches share the same promise", async () => {
		let resolveCount = 0;
		const fetchFn = vi.fn().mockImplementation(async () => {
			resolveCount++;
			await new Promise((r) => setTimeout(r, 10));
			return [{ id: resolveCount }];
		});
		const store = createDataStore(fetchFn);

		const _results = await Promise.all([
			store.fetch(),
			store.fetch(),
			store.fetch(),
		]);

		// All concurrent calls should resolve together
		expect(fetchFn).toHaveBeenCalledTimes(1);
		expect(store.$data.get()).toEqual([{ id: 1 }]);
	});

	it("works with different data types", async () => {
		const stringStore = createDataStore(async () => ["a", "b", "c"]);
		const objectStore = createDataStore(async () => [{ name: "test" }]);

		await stringStore.fetch();
		await objectStore.fetch();

		expect(stringStore.$data.get()).toEqual(["a", "b", "c"]);
		expect(objectStore.$data.get()).toEqual([{ name: "test" }]);
	});
});
