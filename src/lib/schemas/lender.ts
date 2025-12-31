import { z } from "zod";

export const DEFAULT_MAX_TERM = 35;

export const LenderSchema = z.object({
	id: z.string(),
	name: z.string(),
	logo: z.string().optional(),
	website: z.string().url(),
	perks: z.array(z.string()).default([]),
	maxTerm: z.number().int().positive().optional(), // Maximum mortgage term in years, defaults to DEFAULT_MAX_TERM
});
export type Lender = z.infer<typeof LenderSchema>;

export const LendersFileSchema = z.array(LenderSchema);
