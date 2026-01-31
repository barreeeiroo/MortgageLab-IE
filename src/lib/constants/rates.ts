// Rates page modes
export const RATES_MODES = ["first-mortgage", "remortgage"] as const;

export type RatesMode = (typeof RATES_MODES)[number];

// Fixed period options for rate selectors
export const FIXED_PERIOD_OPTIONS = [
    { value: "0", label: "Variable" },
    { value: "1", label: "1 Year Fixed" },
    { value: "2", label: "2 Years Fixed" },
    { value: "3", label: "3 Years Fixed" },
    { value: "4", label: "4 Years Fixed" },
    { value: "5", label: "5 Years Fixed" },
    { value: "7", label: "7 Years Fixed" },
    { value: "10", label: "10 Years Fixed" },
] as const;
