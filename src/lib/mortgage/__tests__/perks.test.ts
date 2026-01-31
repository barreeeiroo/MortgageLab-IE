import { describe, expect, it } from "vitest";
import type { Perk } from "@/lib/schemas/perk";
import { calculateCashbackAmount, getCashbackConfig } from "../perks";

// Test fixture: perks with cashback configurations
const testPerks: Perk[] = [
    {
        id: "fee-free-banking",
        label: "Fee Free Banking",
        icon: "PiggyBank",
    },
    {
        id: "cashback-1pct",
        label: "1% Cashback",
        icon: "Coins",
        cashback: { type: "percentage", value: 1 },
    },
    {
        id: "cashback-2pct",
        label: "2% Cashback",
        icon: "Coins",
        cashback: { type: "percentage", value: 2 },
    },
    {
        id: "cashback-2pct-max10k",
        label: "2% Cashback (Max €10k)",
        icon: "Coins",
        cashback: { type: "percentage", value: 2, cap: 10000 },
    },
    {
        id: "cashback-3pct",
        label: "3% Cashback",
        icon: "Coins",
        cashback: { type: "percentage", value: 3, cap: 15000 },
    },
    {
        id: "cashback-5k",
        label: "€5,000 Cashback",
        icon: "Coins",
        cashback: { type: "flat", value: 5000 },
    },
    {
        id: "switcher-3k",
        label: "€3,000 Switcher",
        icon: "Coins",
        cashback: { type: "flat", value: 3000 },
    },
];

describe("getCashbackConfig", () => {
    it("gets percentage cashback perks", () => {
        expect(getCashbackConfig("cashback-1pct", testPerks)).toEqual({
            type: "percentage",
            value: 1,
        });
        expect(getCashbackConfig("cashback-2pct", testPerks)).toEqual({
            type: "percentage",
            value: 2,
        });
    });

    it("gets capped percentage cashback", () => {
        expect(getCashbackConfig("cashback-2pct-max10k", testPerks)).toEqual({
            type: "percentage",
            value: 2,
            cap: 10000,
        });
        expect(getCashbackConfig("cashback-3pct", testPerks)).toEqual({
            type: "percentage",
            value: 3,
            cap: 15000,
        });
    });

    it("gets flat cashback perks", () => {
        expect(getCashbackConfig("cashback-5k", testPerks)).toEqual({
            type: "flat",
            value: 5000,
        });
        expect(getCashbackConfig("switcher-3k", testPerks)).toEqual({
            type: "flat",
            value: 3000,
        });
    });

    it("returns null for non-cashback perks", () => {
        expect(getCashbackConfig("fee-free-banking", testPerks)).toBeNull();
    });

    it("returns null for unknown perks", () => {
        expect(getCashbackConfig("unknown-perk", testPerks)).toBeNull();
    });

    it("returns null when perks array is empty", () => {
        expect(getCashbackConfig("cashback-2pct", [])).toBeNull();
    });
});

describe("calculateCashbackAmount", () => {
    it("calculates flat cashback correctly", () => {
        expect(
            calculateCashbackAmount(300000, { type: "flat", value: 5000 }),
        ).toBe(5000);
        expect(
            calculateCashbackAmount(500000, { type: "flat", value: 3000 }),
        ).toBe(3000);
    });

    it("calculates percentage cashback correctly", () => {
        expect(
            calculateCashbackAmount(300000, { type: "percentage", value: 2 }),
        ).toBe(6000);
        expect(
            calculateCashbackAmount(400000, { type: "percentage", value: 1 }),
        ).toBe(4000);
    });

    it("applies cap to percentage cashback", () => {
        expect(
            calculateCashbackAmount(600000, {
                type: "percentage",
                value: 2,
                cap: 10000,
            }),
        ).toBe(10000); // 2% of 600k = 12k, capped at 10k

        expect(
            calculateCashbackAmount(400000, {
                type: "percentage",
                value: 2,
                cap: 10000,
            }),
        ).toBe(8000); // 2% of 400k = 8k, under cap
    });

    it("applies cap to flat cashback", () => {
        expect(
            calculateCashbackAmount(300000, {
                type: "flat",
                value: 5000,
                cap: 3000,
            }),
        ).toBe(3000);
    });
});
