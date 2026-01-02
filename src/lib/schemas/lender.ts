import { z } from "zod";

export const DEFAULT_MAX_TERM = 35;

// Default APRC fees used when lender-specific fees are unknown
export const DEFAULT_APRC_FEES = {
	valuationFee: 185,
	securityReleaseFee: 85,
} as const;

export const AprcFeesSchema = z.object({
	valuationFee: z.number().nonnegative(), // Valuation fee paid upfront
	securityReleaseFee: z.number().nonnegative(), // Security/deed release fee paid at end
});
export type AprcFees = z.infer<typeof AprcFeesSchema>;

export const LenderSchema = z.object({
	id: z.string(),
	name: z.string(),
	logo: z.string().optional(),
	mortgagesUrl: z.string().url(), // Link to lender's mortgages home page
	ratesUrl: z.string().url().optional(), // Link to lender's mortgage rates page
	perks: z.array(z.string()).default([]),
	maxTerm: z.number().int().positive().optional(), // Maximum mortgage term in years, defaults to DEFAULT_MAX_TERM
	aprcFees: AprcFeesSchema.optional(), // Fees used for APRC calculation
});
export type Lender = z.infer<typeof LenderSchema>;

export const LendersFileSchema = z.array(LenderSchema);
