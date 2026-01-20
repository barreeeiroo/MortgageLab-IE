import { z } from "zod";

export const CashbackConfigSchema = z.object({
	type: z.enum(["percentage", "flat"]),
	value: z.number(),
	cap: z.number().optional(),
});
export type CashbackConfig = z.infer<typeof CashbackConfigSchema>;

export const PerkSchema = z.object({
	id: z.string(),
	label: z.string(),
	description: z.string().optional(),
	icon: z.string(), // Lucide icon name (e.g., "Landmark", "Percent")
	cashback: CashbackConfigSchema.optional(),
});
export type Perk = z.infer<typeof PerkSchema>;

export const PerksFileSchema = z.array(PerkSchema);
