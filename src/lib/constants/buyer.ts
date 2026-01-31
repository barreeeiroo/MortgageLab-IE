import type { BuyerType } from "@/lib/schemas/buyer";

// Buyer type labels for display
export const BUYER_TYPE_LABELS: Record<BuyerType, string> = {
    ftb: "First Time Buyer",
    mover: "Mover",
    btl: "Buy to Let",
    "switcher-pdh": "Switcher (Home)",
    "switcher-btl": "Switcher (BTL)",
};

// Grouped buyer types
export const FIRST_MORTGAGE_BUYER_TYPES: BuyerType[] = ["ftb", "mover", "btl"];
export const SWITCHER_BUYER_TYPES: BuyerType[] = [
    "switcher-pdh",
    "switcher-btl",
];

// BTL buyer types - used for matching follow-on rates (BTL must match BTL)
export const BTL_BUYER_TYPES: BuyerType[] = ["btl", "switcher-btl"];
