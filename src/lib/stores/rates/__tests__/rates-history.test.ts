import { describe, expect, it } from "vitest";
import type { MortgageRate } from "@/lib/schemas/rate";
import type { RatesHistoryFile } from "@/lib/schemas/rate-history";
import {
    getRateChanges,
    getRateTimeSeries,
    reconstructRatesAtDate,
} from "../rates-history";

// Helper to create a minimal mortgage rate
function createRate(overrides: Partial<MortgageRate> = {}): MortgageRate {
    return {
        id: "test-rate-1",
        name: "Test Rate",
        lenderId: "test-lender",
        type: "fixed",
        rate: 3.5,
        apr: 3.6,
        minLtv: 0,
        maxLtv: 90,
        buyerTypes: ["ftb"],
        perks: [],
        ...overrides,
    };
}

// Helper to create a history file with baseline and changesets
function createHistoryFile(
    baseline: { timestamp: string; rates: MortgageRate[] },
    changesets: RatesHistoryFile["changesets"] = [],
): RatesHistoryFile {
    return {
        lenderId: "test-lender",
        baseline: {
            timestamp: baseline.timestamp,
            ratesHash: "baseline-hash",
            rates: baseline.rates,
        },
        changesets,
    };
}

describe("reconstructRatesAtDate", () => {
    it("returns empty array when target date is before baseline", () => {
        const history = createHistoryFile({
            timestamp: "2024-06-01T00:00:00.000Z",
            rates: [createRate({ id: "rate-1" })],
        });

        const result = reconstructRatesAtDate(
            history,
            new Date("2024-01-01T00:00:00.000Z"),
        );

        expect(result).toEqual([]);
    });

    it("returns baseline rates when target date equals baseline", () => {
        const rates = [
            createRate({ id: "rate-1", rate: 3.5 }),
            createRate({ id: "rate-2", rate: 4.0 }),
        ];
        const history = createHistoryFile({
            timestamp: "2024-06-01T00:00:00.000Z",
            rates,
        });

        const result = reconstructRatesAtDate(
            history,
            new Date("2024-06-01T00:00:00.000Z"),
        );

        expect(result).toHaveLength(2);
        expect(result.find((r) => r.id === "rate-1")?.rate).toBe(3.5);
        expect(result.find((r) => r.id === "rate-2")?.rate).toBe(4.0);
    });

    it("returns baseline rates when target date is after baseline with no changesets", () => {
        const rates = [createRate({ id: "rate-1", rate: 3.5 })];
        const history = createHistoryFile({
            timestamp: "2024-06-01T00:00:00.000Z",
            rates,
        });

        const result = reconstructRatesAtDate(
            history,
            new Date("2024-12-01T00:00:00.000Z"),
        );

        expect(result).toHaveLength(1);
        expect(result[0].rate).toBe(3.5);
    });

    it("applies add operation from changeset", () => {
        const history = createHistoryFile(
            {
                timestamp: "2024-06-01T00:00:00.000Z",
                rates: [createRate({ id: "rate-1" })],
            },
            [
                {
                    timestamp: "2024-07-01T00:00:00.000Z",
                    afterHash: "hash-1",
                    operations: [
                        {
                            op: "add",
                            rate: createRate({ id: "rate-2", rate: 4.0 }),
                        },
                    ],
                },
            ],
        );

        const result = reconstructRatesAtDate(
            history,
            new Date("2024-08-01T00:00:00.000Z"),
        );

        expect(result).toHaveLength(2);
        expect(result.find((r) => r.id === "rate-2")?.rate).toBe(4.0);
    });

    it("applies remove operation from changeset", () => {
        const history = createHistoryFile(
            {
                timestamp: "2024-06-01T00:00:00.000Z",
                rates: [
                    createRate({ id: "rate-1" }),
                    createRate({ id: "rate-2" }),
                ],
            },
            [
                {
                    timestamp: "2024-07-01T00:00:00.000Z",
                    afterHash: "hash-1",
                    operations: [{ op: "remove", id: "rate-2" }],
                },
            ],
        );

        const result = reconstructRatesAtDate(
            history,
            new Date("2024-08-01T00:00:00.000Z"),
        );

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("rate-1");
    });

    it("applies update operation from changeset", () => {
        const history = createHistoryFile(
            {
                timestamp: "2024-06-01T00:00:00.000Z",
                rates: [
                    createRate({ id: "rate-1", rate: 3.5, name: "Original" }),
                ],
            },
            [
                {
                    timestamp: "2024-07-01T00:00:00.000Z",
                    afterHash: "hash-1",
                    operations: [
                        {
                            op: "update",
                            id: "rate-1",
                            changes: {
                                id: "rate-1",
                                rate: 3.25,
                                name: "Updated",
                            },
                        },
                    ],
                },
            ],
        );

        const result = reconstructRatesAtDate(
            history,
            new Date("2024-08-01T00:00:00.000Z"),
        );

        expect(result).toHaveLength(1);
        expect(result[0].rate).toBe(3.25);
        expect(result[0].name).toBe("Updated");
    });

    it("applies multiple changesets in chronological order", () => {
        const history = createHistoryFile(
            {
                timestamp: "2024-01-01T00:00:00.000Z",
                rates: [createRate({ id: "rate-1", rate: 3.5 })],
            },
            [
                {
                    timestamp: "2024-03-01T00:00:00.000Z",
                    afterHash: "hash-1",
                    operations: [
                        {
                            op: "update",
                            id: "rate-1",
                            changes: { id: "rate-1", rate: 3.25 },
                        },
                    ],
                },
                {
                    timestamp: "2024-06-01T00:00:00.000Z",
                    afterHash: "hash-2",
                    operations: [
                        {
                            op: "update",
                            id: "rate-1",
                            changes: { id: "rate-1", rate: 3.0 },
                        },
                    ],
                },
            ],
        );

        // Check at different points in time
        const beforeFirst = reconstructRatesAtDate(
            history,
            new Date("2024-02-01T00:00:00.000Z"),
        );
        expect(beforeFirst[0].rate).toBe(3.5);

        const afterFirst = reconstructRatesAtDate(
            history,
            new Date("2024-04-01T00:00:00.000Z"),
        );
        expect(afterFirst[0].rate).toBe(3.25);

        const afterSecond = reconstructRatesAtDate(
            history,
            new Date("2024-07-01T00:00:00.000Z"),
        );
        expect(afterSecond[0].rate).toBe(3.0);
    });

    it("does not apply changesets after target date", () => {
        const history = createHistoryFile(
            {
                timestamp: "2024-06-01T00:00:00.000Z",
                rates: [createRate({ id: "rate-1", rate: 3.5 })],
            },
            [
                {
                    timestamp: "2024-09-01T00:00:00.000Z",
                    afterHash: "hash-1",
                    operations: [
                        {
                            op: "update",
                            id: "rate-1",
                            changes: { id: "rate-1", rate: 3.0 },
                        },
                    ],
                },
            ],
        );

        const result = reconstructRatesAtDate(
            history,
            new Date("2024-07-01T00:00:00.000Z"),
        );

        expect(result[0].rate).toBe(3.5);
    });

    it("handles unsorted changesets by sorting them", () => {
        const history = createHistoryFile(
            {
                timestamp: "2024-01-01T00:00:00.000Z",
                rates: [createRate({ id: "rate-1", rate: 3.5 })],
            },
            [
                // Changesets out of order
                {
                    timestamp: "2024-06-01T00:00:00.000Z",
                    afterHash: "hash-2",
                    operations: [
                        {
                            op: "update",
                            id: "rate-1",
                            changes: { id: "rate-1", rate: 3.0 },
                        },
                    ],
                },
                {
                    timestamp: "2024-03-01T00:00:00.000Z",
                    afterHash: "hash-1",
                    operations: [
                        {
                            op: "update",
                            id: "rate-1",
                            changes: { id: "rate-1", rate: 3.25 },
                        },
                    ],
                },
            ],
        );

        const result = reconstructRatesAtDate(
            history,
            new Date("2024-04-01T00:00:00.000Z"),
        );

        // Should apply March changeset but not June
        expect(result[0].rate).toBe(3.25);
    });

    it("ignores update for non-existent rate", () => {
        const history = createHistoryFile(
            {
                timestamp: "2024-06-01T00:00:00.000Z",
                rates: [createRate({ id: "rate-1" })],
            },
            [
                {
                    timestamp: "2024-07-01T00:00:00.000Z",
                    afterHash: "hash-1",
                    operations: [
                        {
                            op: "update",
                            id: "non-existent",
                            changes: { id: "non-existent", rate: 5.0 },
                        },
                    ],
                },
            ],
        );

        const result = reconstructRatesAtDate(
            history,
            new Date("2024-08-01T00:00:00.000Z"),
        );

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("rate-1");
    });
});

describe("getRateTimeSeries", () => {
    it("returns null for rate not in baseline or changesets", () => {
        const history = createHistoryFile({
            timestamp: "2024-06-01T00:00:00.000Z",
            rates: [createRate({ id: "rate-1" })],
        });

        const result = getRateTimeSeries(history, "non-existent");

        expect(result).toBeNull();
    });

    it("returns single data point for rate only in baseline", () => {
        const history = createHistoryFile({
            timestamp: "2024-06-01T00:00:00.000Z",
            rates: [createRate({ id: "rate-1", rate: 3.5, apr: 3.6 })],
        });

        const result = getRateTimeSeries(history, "rate-1");

        expect(result).not.toBeNull();
        expect(result?.rateId).toBe("rate-1");
        expect(result?.dataPoints).toHaveLength(1);
        expect(result?.dataPoints[0].rate).toBe(3.5);
        expect(result?.dataPoints[0].apr).toBe(3.6);
    });

    it("returns multiple data points when rate changes", () => {
        const history = createHistoryFile(
            {
                timestamp: "2024-01-01T00:00:00.000Z",
                rates: [createRate({ id: "rate-1", rate: 3.5 })],
            },
            [
                {
                    timestamp: "2024-06-01T00:00:00.000Z",
                    afterHash: "hash-1",
                    operations: [
                        {
                            op: "update",
                            id: "rate-1",
                            changes: { id: "rate-1", rate: 3.25 },
                        },
                    ],
                },
            ],
        );

        const result = getRateTimeSeries(history, "rate-1");

        expect(result?.dataPoints).toHaveLength(2);
        expect(result?.dataPoints[0].rate).toBe(3.5);
        expect(result?.dataPoints[1].rate).toBe(3.25);
    });

    it("tracks rate added in changeset", () => {
        const history = createHistoryFile(
            {
                timestamp: "2024-01-01T00:00:00.000Z",
                rates: [],
            },
            [
                {
                    timestamp: "2024-06-01T00:00:00.000Z",
                    afterHash: "hash-1",
                    operations: [
                        {
                            op: "add",
                            rate: createRate({
                                id: "new-rate",
                                name: "New Rate",
                                rate: 4.0,
                                apr: 4.1,
                            }),
                        },
                    ],
                },
            ],
        );

        const result = getRateTimeSeries(history, "new-rate");

        expect(result).not.toBeNull();
        expect(result?.rateName).toBe("New Rate");
        expect(result?.dataPoints).toHaveLength(1);
        expect(result?.dataPoints[0].rate).toBe(4.0);
    });

    it("does not add data point for non-rate field changes", () => {
        const history = createHistoryFile(
            {
                timestamp: "2024-01-01T00:00:00.000Z",
                rates: [
                    createRate({ id: "rate-1", rate: 3.5, name: "Original" }),
                ],
            },
            [
                {
                    timestamp: "2024-06-01T00:00:00.000Z",
                    afterHash: "hash-1",
                    operations: [
                        {
                            op: "update",
                            id: "rate-1",
                            changes: { id: "rate-1", name: "Updated Name" },
                        },
                    ],
                },
            ],
        );

        const result = getRateTimeSeries(history, "rate-1");

        // Only baseline data point (name change doesn't add a point)
        expect(result?.dataPoints).toHaveLength(1);
        // But the name should be updated
        expect(result?.rateName).toBe("Updated Name");
    });

    it("adds data point for APR-only changes", () => {
        const history = createHistoryFile(
            {
                timestamp: "2024-01-01T00:00:00.000Z",
                rates: [createRate({ id: "rate-1", rate: 3.5, apr: 3.6 })],
            },
            [
                {
                    timestamp: "2024-06-01T00:00:00.000Z",
                    afterHash: "hash-1",
                    operations: [
                        {
                            op: "update",
                            id: "rate-1",
                            changes: { id: "rate-1", apr: 3.7 },
                        },
                    ],
                },
            ],
        );

        const result = getRateTimeSeries(history, "rate-1");

        expect(result?.dataPoints).toHaveLength(2);
        expect(result?.dataPoints[1].apr).toBe(3.7);
    });

    it("sorts changesets chronologically", () => {
        const history = createHistoryFile(
            {
                timestamp: "2024-01-01T00:00:00.000Z",
                rates: [createRate({ id: "rate-1", rate: 3.5 })],
            },
            [
                // Out of order
                {
                    timestamp: "2024-09-01T00:00:00.000Z",
                    afterHash: "hash-2",
                    operations: [
                        {
                            op: "update",
                            id: "rate-1",
                            changes: { id: "rate-1", rate: 3.0 },
                        },
                    ],
                },
                {
                    timestamp: "2024-06-01T00:00:00.000Z",
                    afterHash: "hash-1",
                    operations: [
                        {
                            op: "update",
                            id: "rate-1",
                            changes: { id: "rate-1", rate: 3.25 },
                        },
                    ],
                },
            ],
        );

        const result = getRateTimeSeries(history, "rate-1");

        expect(result?.dataPoints).toHaveLength(3);
        expect(result?.dataPoints[0].rate).toBe(3.5);
        expect(result?.dataPoints[1].rate).toBe(3.25);
        expect(result?.dataPoints[2].rate).toBe(3.0);
    });
});

describe("getRateChanges", () => {
    it("returns baseline rates as added when in range", () => {
        const history = createHistoryFile({
            timestamp: "2024-06-01T00:00:00.000Z",
            rates: [createRate({ id: "rate-1", rate: 3.5 })],
        });

        const result = getRateChanges(
            history,
            new Date("2024-01-01T00:00:00.000Z"),
            new Date("2024-12-01T00:00:00.000Z"),
        );

        expect(result).toHaveLength(1);
        expect(result[0].changeType).toBe("added");
        expect(result[0].newRate).toBe(3.5);
        expect(result[0].previousRate).toBeNull();
    });

    it("excludes baseline rates before date range", () => {
        const history = createHistoryFile({
            timestamp: "2024-01-01T00:00:00.000Z",
            rates: [createRate({ id: "rate-1" })],
        });

        const result = getRateChanges(
            history,
            new Date("2024-06-01T00:00:00.000Z"),
            new Date("2024-12-01T00:00:00.000Z"),
        );

        // No changes because baseline is before our range
        expect(result).toHaveLength(0);
    });

    it("includes added rates from changesets", () => {
        const history = createHistoryFile(
            {
                timestamp: "2024-01-01T00:00:00.000Z",
                rates: [],
            },
            [
                {
                    timestamp: "2024-06-15T00:00:00.000Z",
                    afterHash: "hash-1",
                    operations: [
                        {
                            op: "add",
                            rate: createRate({ id: "new-rate", rate: 4.0 }),
                        },
                    ],
                },
            ],
        );

        const result = getRateChanges(
            history,
            new Date("2024-06-01T00:00:00.000Z"),
            new Date("2024-12-01T00:00:00.000Z"),
        );

        expect(result).toHaveLength(1);
        expect(result[0].changeType).toBe("added");
        expect(result[0].rateId).toBe("new-rate");
    });

    it("includes removed rates from changesets", () => {
        const history = createHistoryFile(
            {
                timestamp: "2024-01-01T00:00:00.000Z",
                rates: [createRate({ id: "rate-1", rate: 3.5 })],
            },
            [
                {
                    timestamp: "2024-06-15T00:00:00.000Z",
                    afterHash: "hash-1",
                    operations: [{ op: "remove", id: "rate-1" }],
                },
            ],
        );

        const result = getRateChanges(
            history,
            new Date("2024-06-01T00:00:00.000Z"),
            new Date("2024-12-01T00:00:00.000Z"),
        );

        expect(result).toHaveLength(1);
        expect(result[0].changeType).toBe("removed");
        expect(result[0].previousRate).toBe(3.5);
        expect(result[0].newRate).toBeNull();
    });

    it("includes rate changes with change amount and percent", () => {
        const history = createHistoryFile(
            {
                timestamp: "2024-01-01T00:00:00.000Z",
                rates: [createRate({ id: "rate-1", rate: 4.0 })],
            },
            [
                {
                    timestamp: "2024-06-15T00:00:00.000Z",
                    afterHash: "hash-1",
                    operations: [
                        {
                            op: "update",
                            id: "rate-1",
                            changes: { id: "rate-1", rate: 3.5 },
                        },
                    ],
                },
            ],
        );

        const result = getRateChanges(
            history,
            new Date("2024-06-01T00:00:00.000Z"),
            new Date("2024-12-01T00:00:00.000Z"),
        );

        expect(result).toHaveLength(1);
        expect(result[0].changeType).toBe("changed");
        expect(result[0].previousRate).toBe(4.0);
        expect(result[0].newRate).toBe(3.5);
        expect(result[0].changeAmount).toBe(-0.5);
        expect(result[0].changePercent).toBeCloseTo(-12.5);
    });

    it("tracks field changes in update", () => {
        const history = createHistoryFile(
            {
                timestamp: "2024-01-01T00:00:00.000Z",
                rates: [
                    createRate({
                        id: "rate-1",
                        rate: 3.5,
                        minLtv: 0,
                        maxLtv: 80,
                    }),
                ],
            },
            [
                {
                    timestamp: "2024-06-15T00:00:00.000Z",
                    afterHash: "hash-1",
                    operations: [
                        {
                            op: "update",
                            id: "rate-1",
                            changes: { id: "rate-1", rate: 3.25, maxLtv: 90 },
                        },
                    ],
                },
            ],
        );

        const result = getRateChanges(
            history,
            new Date("2024-06-01T00:00:00.000Z"),
            new Date("2024-12-01T00:00:00.000Z"),
        );

        expect(result).toHaveLength(1);
        expect(result[0].fieldChanges).toBeDefined();
        expect(result[0].fieldChanges?.length).toBe(2);

        const rateChange = result[0].fieldChanges?.find(
            (f) => f.field === "rate",
        );
        expect(rateChange?.previousValue).toBe(3.5);
        expect(rateChange?.newValue).toBe(3.25);

        const ltvChange = result[0].fieldChanges?.find(
            (f) => f.field === "maxLtv",
        );
        expect(ltvChange?.previousValue).toBe(80);
        expect(ltvChange?.newValue).toBe(90);
    });

    it("excludes changesets after end date", () => {
        const history = createHistoryFile(
            {
                timestamp: "2024-01-01T00:00:00.000Z",
                rates: [createRate({ id: "rate-1", rate: 3.5 })],
            },
            [
                {
                    timestamp: "2024-12-15T00:00:00.000Z",
                    afterHash: "hash-1",
                    operations: [
                        {
                            op: "update",
                            id: "rate-1",
                            changes: { id: "rate-1", rate: 3.0 },
                        },
                    ],
                },
            ],
        );

        const result = getRateChanges(
            history,
            new Date("2024-06-01T00:00:00.000Z"),
            new Date("2024-12-01T00:00:00.000Z"),
        );

        // Changeset is after end date
        expect(result).toHaveLength(0);
    });

    it("works without date range (all changes)", () => {
        const history = createHistoryFile(
            {
                timestamp: "2024-01-01T00:00:00.000Z",
                rates: [createRate({ id: "rate-1" })],
            },
            [
                {
                    timestamp: "2024-06-15T00:00:00.000Z",
                    afterHash: "hash-1",
                    operations: [
                        {
                            op: "update",
                            id: "rate-1",
                            changes: { id: "rate-1", rate: 3.0 },
                        },
                    ],
                },
            ],
        );

        const result = getRateChanges(history);

        // Baseline + update
        expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it("handles array field changes correctly", () => {
        const history = createHistoryFile(
            {
                timestamp: "2024-01-01T00:00:00.000Z",
                rates: [
                    createRate({
                        id: "rate-1",
                        buyerTypes: ["ftb"],
                        perks: ["cashback"],
                    }),
                ],
            },
            [
                {
                    timestamp: "2024-06-15T00:00:00.000Z",
                    afterHash: "hash-1",
                    operations: [
                        {
                            op: "update",
                            id: "rate-1",
                            changes: {
                                id: "rate-1",
                                buyerTypes: ["ftb", "mover"],
                                perks: ["cashback", "freeValuation"],
                            },
                        },
                    ],
                },
            ],
        );

        const result = getRateChanges(
            history,
            new Date("2024-06-01T00:00:00.000Z"),
        );

        expect(result).toHaveLength(1);
        expect(
            result[0].fieldChanges?.find((f) => f.field === "buyerTypes"),
        ).toBeDefined();
        expect(
            result[0].fieldChanges?.find((f) => f.field === "perks"),
        ).toBeDefined();
    });

    it("does not create change entry when values are unchanged", () => {
        const history = createHistoryFile(
            {
                timestamp: "2024-01-01T00:00:00.000Z",
                rates: [createRate({ id: "rate-1", rate: 3.5 })],
            },
            [
                {
                    timestamp: "2024-06-15T00:00:00.000Z",
                    afterHash: "hash-1",
                    operations: [
                        {
                            op: "update",
                            id: "rate-1",
                            // Same rate value, no actual change
                            changes: { id: "rate-1", rate: 3.5 },
                        },
                    ],
                },
            ],
        );

        const result = getRateChanges(
            history,
            new Date("2024-06-01T00:00:00.000Z"),
        );

        // No changes should be recorded since rate didn't actually change
        expect(result).toHaveLength(0);
    });
});
