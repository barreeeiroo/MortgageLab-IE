// Rates page modes
export const RATES_MODES = ["first-mortgage", "remortgage"] as const;

export type RatesMode = (typeof RATES_MODES)[number];
