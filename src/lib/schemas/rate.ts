import { z } from "zod";
import { BER_RATINGS } from "@/lib/constants/ber";
import { BuyerTypeSchema } from "./buyer";

export const BerRatingSchema = z.enum(BER_RATINGS);
export type BerRating = z.infer<typeof BerRatingSchema>;

export const RATE_TYPES = ["fixed", "variable"] as const;
export const RateTypeSchema = z.enum(RATE_TYPES);
export type RateType = z.infer<typeof RateTypeSchema>;

/**
 * Base mortgage rate schema WITHOUT defaults.
 * Used for partial schemas (e.g., changeset operations) where we don't want
 * Zod to inject default values for missing fields.
 */
export const MortgageRateBaseSchema = z.object({
    id: z.string(),
    name: z.string(), // Human-readable rate name
    lenderId: z.string(),
    type: RateTypeSchema,
    rate: z.number().positive(), // e.g., 3.45 for 3.45%
    apr: z.number().positive().optional(), // Annual Percentage Rate
    fixedTerm: z.number().int().positive().optional(), // Years, only for fixed rates

    // Eligibility constraints
    minLtv: z.number().min(0).max(100), // e.g., 0 for <60% bracket
    maxLtv: z.number().min(0).max(100), // e.g., 90 for 90% LTV
    minLoan: z.number().positive().optional(), // Minimum loan amount (e.g., for HVM products)
    buyerTypes: z.array(BuyerTypeSchema).min(1),
    berEligible: z.array(BerRatingSchema).optional(), // If undefined, all BER ratings eligible
    newBusiness: z.boolean().optional(), // true = new business only, false = existing customers only, undefined = both

    // Rate-specific perk IDs
    perks: z.array(z.string()),

    // Optional warning message (e.g., for inferred rates)
    warning: z.string().optional(),
});

/**
 * Full mortgage rate schema WITH defaults for parsing rate files.
 * - minLtv defaults to 0 (for rates that apply to all LTV brackets)
 * - perks defaults to [] (most rates have no perks)
 */
export const MortgageRateSchema = MortgageRateBaseSchema.extend({
    minLtv: z.number().min(0).max(100).default(0),
    perks: z.array(z.string()).default([]),
});
export type MortgageRate = z.infer<typeof MortgageRateSchema>;

// Metadata about rates for a lender (used for UI display of last update times)
export const RatesMetadataSchema = z.object({
    lenderId: z.string(),
    lastScrapedAt: z.string(),
    lastUpdatedAt: z.string(),
});
export type RatesMetadata = z.infer<typeof RatesMetadataSchema>;

// Schema for individual rate files
export const RatesFileSchema = z.object({
    lenderId: z.string(),
    lastScrapedAt: z.iso.datetime(),
    lastUpdatedAt: z.iso.datetime(),
    ratesHash: z.string(),
    rates: z.array(MortgageRateSchema),
});
export type RatesFile = z.infer<typeof RatesFileSchema>;
