import { z } from "zod";

export const OverpaymentPolicySchema = z.object({
	id: z.string(),
	label: z.string(),
	description: z.string(),
	icon: z.string(), // Lucide icon name
	// Structured fields for calculations
	allowanceType: z.enum(["percentage", "flat"]),
	allowanceValue: z.number().positive(),
	allowanceBasis: z.enum(["balance", "monthly"]).optional(), // What the % applies to (required for percentage type)
	minAmount: z.number().nonnegative().optional(), // e.g., BOI's €65 minimum
	chargeCap: z.number().nonnegative().optional(), // e.g., Avant's 2% cap on early redemption fee
});
export type OverpaymentPolicy = z.infer<typeof OverpaymentPolicySchema>;

export const OverpaymentPoliciesFileSchema = z.array(OverpaymentPolicySchema);
