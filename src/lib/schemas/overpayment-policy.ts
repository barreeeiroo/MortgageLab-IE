import { z } from "zod";

export const MaxTransactionsPeriodSchema = z.enum([
	"month",
	"quarter",
	"year",
	"fixed_period",
]);
export type MaxTransactionsPeriod = z.infer<typeof MaxTransactionsPeriodSchema>;

export const OverpaymentPolicySchema = z
	.object({
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
		// Transaction count limits (e.g., Avant's 2 per year)
		maxTransactions: z.number().int().positive().optional(),
		maxTransactionsPeriod: MaxTransactionsPeriodSchema.optional(),
	})
	.refine(
		(data) => {
			// Both fields must be set together or neither
			const hasMax = data.maxTransactions !== undefined;
			const hasPeriod = data.maxTransactionsPeriod !== undefined;
			return hasMax === hasPeriod;
		},
		{
			message:
				"maxTransactions and maxTransactionsPeriod must both be set or both be unset",
		},
	);
export type OverpaymentPolicy = z.infer<typeof OverpaymentPolicySchema>;

export const OverpaymentPoliciesFileSchema = z.array(OverpaymentPolicySchema);
