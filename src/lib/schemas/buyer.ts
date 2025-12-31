import { z } from "zod";

export const BUYER_TYPES = [
	"ftb",
	"mover",
	"btl",
	"switcher-pdh",
	"switcher-btl",
] as const;
export const BuyerTypeSchema = z.enum(BUYER_TYPES);
export type BuyerType = z.infer<typeof BuyerTypeSchema>;
