import { z } from "zod";

export const EURIBOR_TENORS = ["1M", "3M", "6M", "12M"] as const;
export type EuriborTenor = (typeof EURIBOR_TENORS)[number];

/**
 * Single row: date + rate for each tenor
 */
export const EuriborRateSchema = z.object({
	date: z.string(), // ISO date: "2025-12-01"
	"1M": z.number(), // 1-month rate
	"3M": z.number(), // 3-month rate
	"6M": z.number(), // 6-month rate
	"12M": z.number(), // 12-month rate
});
export type EuriborRate = z.infer<typeof EuriborRateSchema>;

export const EuriborFileSchema = z.object({
	lastScrapedAt: z.string().datetime(),
	lastUpdatedAt: z.string().datetime(),
	ratesHash: z.string(),
	rates: z.array(EuriborRateSchema),
});
export type EuriborFile = z.infer<typeof EuriborFileSchema>;
