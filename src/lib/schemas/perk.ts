import { z } from "zod";

export const PerkSchema = z.object({
	id: z.string(),
	label: z.string(),
	description: z.string().optional(),
	icon: z.string(), // Lucide icon name (e.g., "Landmark", "Percent")
});
export type Perk = z.infer<typeof PerkSchema>;

export const PerksFileSchema = z.array(PerkSchema);
