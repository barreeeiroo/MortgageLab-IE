import { describe, expect, it } from "vitest";
import { MAX_WHATS_NEW_DISPLAY_ITEMS, WHATS_NEW_ITEMS } from "../whats-new";

describe("whats-new constants", () => {
	it("should not have more items than the display limit", () => {
		expect(WHATS_NEW_ITEMS.length).toBeLessThanOrEqual(
			MAX_WHATS_NEW_DISPLAY_ITEMS,
		);
	});

	it("should have unique item IDs", () => {
		const ids = WHATS_NEW_ITEMS.map((item) => item.id);
		const uniqueIds = new Set(ids);
		expect(uniqueIds.size).toBe(ids.length);
	});

	it("should have a title for each item", () => {
		for (const item of WHATS_NEW_ITEMS) {
			expect(item.title).toBeTruthy();
		}
	});
});
