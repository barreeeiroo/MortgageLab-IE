import { z } from "zod";
import { MortgageRateBaseSchema, MortgageRateSchema } from "./rate";

// Schema for partial rate changes using the base schema (no defaults)
// This prevents Zod from adding default values like minLtv: 0 when parsing
const RateChangesSchema = MortgageRateBaseSchema.partial().extend({
	id: z.string(), // id is always required in changes
});

// Diff operations for rate changes
export const RateAddOperationSchema = z.object({
	op: z.literal("add"),
	rate: MortgageRateSchema,
});

export const RateRemoveOperationSchema = z.object({
	op: z.literal("remove"),
	id: z.string(),
});

export const RateUpdateOperationSchema = z.object({
	op: z.literal("update"),
	id: z.string(),
	changes: RateChangesSchema,
});

export const RateDiffOperationSchema = z.discriminatedUnion("op", [
	RateAddOperationSchema,
	RateRemoveOperationSchema,
	RateUpdateOperationSchema,
]);
export type RateDiffOperation = z.infer<typeof RateDiffOperationSchema>;

// A changeset - all changes at a single point in time
export const RateChangesetSchema = z.object({
	timestamp: z.iso.datetime(),
	afterHash: z.string(), // Hash after applying this changeset (for validation)
	operations: z.array(RateDiffOperationSchema),
});
export type RateChangeset = z.infer<typeof RateChangesetSchema>;

// Baseline snapshot
export const RatesBaselineSchema = z.object({
	timestamp: z.iso.datetime(),
	ratesHash: z.string(),
	rates: z.array(MortgageRateSchema),
});
export type RatesBaseline = z.infer<typeof RatesBaselineSchema>;

// Complete history file (current rates stay in data/rates/{lenderId}.json)
export const RatesHistoryFileSchema = z.object({
	lenderId: z.string(),
	baseline: RatesBaselineSchema,
	changesets: z.array(RateChangesetSchema),
});
export type RatesHistoryFile = z.infer<typeof RatesHistoryFileSchema>;

// Field change tracking for detailed change history
export interface RateFieldChange {
	field: string;
	previousValue: unknown;
	newValue: unknown;
}

// Computed types for UI (not stored)
export interface RateChange {
	rateId: string;
	rateName: string;
	timestamp: string;
	previousRate: number | null;
	newRate: number | null;
	changeType: "added" | "removed" | "changed";
	changeAmount?: number;
	changePercent?: number;
	fieldChanges?: RateFieldChange[]; // All field changes (including non-rate fields)
}

export interface RateTimeSeries {
	rateId: string;
	rateName: string;
	lenderId: string;
	dataPoints: Array<{ timestamp: string; rate: number; apr?: number }>;
}
