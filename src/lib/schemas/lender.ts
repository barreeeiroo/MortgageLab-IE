import { z } from "zod";

export const LenderSchema = z.object({
	id: z.string(),
	name: z.string(),
	logo: z.string().optional(),
	website: z.string().url(),
	perks: z.array(z.string()).default([]),
});
export type Lender = z.infer<typeof LenderSchema>;

export const LendersFileSchema = z.array(LenderSchema);
