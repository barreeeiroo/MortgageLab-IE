import { z } from "zod";
import { BER_RATINGS, type BerRating } from "@/lib/constants";
import { BuyerTypeSchema } from "./buyer";
import { PerkSchema } from "./perk";

export const BerRatingSchema = z.enum(BER_RATINGS);
export type { BerRating };

export const RATE_TYPES = ["fixed", "variable"] as const;
export const RateTypeSchema = z.enum(RATE_TYPES);
export type RateType = z.infer<typeof RateTypeSchema>;

export const MortgageRateSchema = z.object({
	id: z.string(),
	lenderId: z.string(),
	type: RateTypeSchema,
	rate: z.number().positive(), // e.g., 3.45 for 3.45%
	fixedTerm: z.number().int().positive().optional(), // Years, only for fixed rates

	// Eligibility constraints
	minLtv: z.number().min(0).max(100).default(0), // e.g., 0 for <60% bracket
	maxLtv: z.number().min(0).max(100), // e.g., 90 for 90% LTV
	buyerTypes: z.array(BuyerTypeSchema).min(1),
	berEligible: z.array(BerRatingSchema).optional(), // If undefined, all BER ratings eligible

	// Rate-specific perks
	perks: z.array(PerkSchema).default([]),
});
export type MortgageRate = z.infer<typeof MortgageRateSchema>;

export const RatesFileSchema = z.array(MortgageRateSchema);
