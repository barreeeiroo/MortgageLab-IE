import { z } from "zod";

export const PerkSchema = z.object({
	id: z.string(),
	label: z.string(),
	description: z.string().optional(),
});
export type Perk = z.infer<typeof PerkSchema>;

export const PerksFileSchema = z.array(PerkSchema);
