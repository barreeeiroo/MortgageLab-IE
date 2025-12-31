import { z } from "zod";

export const DEFAULT_MAX_TERM = 35;

export const LenderSchema = z.object({
	id: z.string(),
	name: z.string(),
	logo: z.string().optional(),
	mortgagesUrl: z.string().url(), // Link to lender's mortgages home page
	ratesUrl: z.string().url().optional(), // Link to lender's mortgage rates page
	perks: z.array(z.string()).default([]),
	maxTerm: z.number().int().positive().optional(), // Maximum mortgage term in years, defaults to DEFAULT_MAX_TERM
});
export type Lender = z.infer<typeof LenderSchema>;

export const LendersFileSchema = z.array(LenderSchema);
