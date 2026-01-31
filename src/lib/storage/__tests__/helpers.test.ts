import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadFromStorage, saveToStorage } from "../helpers";

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

describe("helpers", () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    describe("loadFromStorage", () => {
        it("returns empty object when key does not exist", () => {
            const result = loadFromStorage("non-existent-key");
            expect(result).toEqual({});
        });

        it("returns parsed object from localStorage", () => {
            localStorageMock.store["test-key"] = JSON.stringify({
                name: "test",
                value: 123,
            });

            const result = loadFromStorage<{ name: string; value: number }>(
                "test-key",
            );

            expect(result).toEqual({ name: "test", value: 123 });
        });

        it("returns empty object for invalid JSON", () => {
            localStorageMock.store["test-key"] = "not valid json";

            const result = loadFromStorage("test-key");

            expect(result).toEqual({});
        });

        it("returns empty object for empty string", () => {
            localStorageMock.store["test-key"] = "";

            const result = loadFromStorage("test-key");

            expect(result).toEqual({});
        });

        it("preserves nested objects", () => {
            const data = {
                level1: {
                    level2: {
                        value: "deep",
                    },
                },
            };
            localStorageMock.store["test-key"] = JSON.stringify(data);

            const result = loadFromStorage<typeof data>("test-key");

            expect(result).toEqual(data);
        });

        it("preserves arrays", () => {
            const data = { items: [1, 2, 3] };
            localStorageMock.store["test-key"] = JSON.stringify(data);

            const result = loadFromStorage<typeof data>("test-key");

            expect(result).toEqual(data);
        });

        it("preserves boolean values", () => {
            const data = { enabled: true, disabled: false };
            localStorageMock.store["test-key"] = JSON.stringify(data);

            const result = loadFromStorage<typeof data>("test-key");

            expect(result).toEqual(data);
            expect(result.enabled).toBe(true);
            expect(result.disabled).toBe(false);
        });

        it("preserves null values", () => {
            const data = { nullValue: null, defined: "value" };
            localStorageMock.store["test-key"] = JSON.stringify(data);

            const result = loadFromStorage<typeof data>("test-key");

            expect(result).toEqual(data);
            expect(result.nullValue).toBeNull();
        });
    });

    describe("saveToStorage", () => {
        it("saves object to localStorage as JSON", () => {
            const data = { name: "test", value: 123 };

            saveToStorage("test-key", data);

            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                "test-key",
                JSON.stringify(data),
            );
        });

        it("overwrites existing data", () => {
            localStorageMock.store["test-key"] = JSON.stringify({
                old: "data",
            });

            saveToStorage("test-key", { new: "data" });

            expect(JSON.parse(localStorageMock.store["test-key"])).toEqual({
                new: "data",
            });
        });

        it("handles nested objects", () => {
            const data = {
                level1: {
                    level2: {
                        value: "deep",
                    },
                },
            };

            saveToStorage("test-key", data);

            expect(JSON.parse(localStorageMock.store["test-key"])).toEqual(
                data,
            );
        });

        it("handles arrays", () => {
            const data = { items: [1, 2, 3] };

            saveToStorage("test-key", data);

            expect(JSON.parse(localStorageMock.store["test-key"])).toEqual(
                data,
            );
        });

        it("handles empty objects", () => {
            saveToStorage("test-key", {});

            expect(JSON.parse(localStorageMock.store["test-key"])).toEqual({});
        });
    });

    describe("roundtrip", () => {
        it("saves and loads data correctly", () => {
            const data = {
                string: "test",
                number: 42,
                boolean: true,
                array: [1, 2, 3],
                nested: { a: { b: "deep" } },
            };

            saveToStorage("roundtrip-key", data);
            const result = loadFromStorage<typeof data>("roundtrip-key");

            expect(result).toEqual(data);
        });
    });
});
