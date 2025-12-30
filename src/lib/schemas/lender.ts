import { z } from "zod";
import { PerkSchema } from "./perk";

export const LenderSchema = z.object({
	id: z.string(),
	name: z.string(),
	logo: z.string().optional(),
	website: z.string().url(),
	perks: z.array(PerkSchema).default([]),
});
export type Lender = z.infer<typeof LenderSchema>;

export const LendersFileSchema = z.array(LenderSchema);
