import { z } from "zod";
import { BerRatingSchema } from "./rate";

// Rate Period - references a rate by lenderId + rateId with isCustom flag
// Stack-based model: periods are sequential, startMonth is computed from position
export const RatePeriodSchema = z.object({
	id: z.string(), // UUID for this period instance
	lenderId: z.string(), // Reference to lender (or custom lender)
	rateId: z.string(), // Reference to rate in lender's rates (or custom rate)
	isCustom: z.boolean(), // true = lookup in custom rates, false = lookup in database rates
	durationMonths: z.number().int().nonnegative(), // Fixed: fixedTerm * 12, Variable: user-specified (0 = until end)
	label: z.string().optional(), // Auto-generated, user can override
});
export type RatePeriod = z.infer<typeof RatePeriodSchema>;

// Overpayment effect type
export const OVERPAYMENT_EFFECTS = ["reduce_term", "reduce_payment"] as const;
export const OverpaymentEffectSchema = z.enum(OVERPAYMENT_EFFECTS);
export type OverpaymentEffect = z.infer<typeof OverpaymentEffectSchema>;

// Overpayment type
export const OVERPAYMENT_TYPES = ["one_time", "recurring"] as const;
export const OverpaymentTypeSchema = z.enum(OVERPAYMENT_TYPES);
export type OverpaymentType = z.infer<typeof OverpaymentTypeSchema>;

// Overpayment frequency (for recurring)
export const OVERPAYMENT_FREQUENCIES = ["monthly", "yearly"] as const;
export const OverpaymentFrequencySchema = z.enum(OVERPAYMENT_FREQUENCIES);
export type OverpaymentFrequency = z.infer<typeof OverpaymentFrequencySchema>;

// Overpayment Config - user input for overpayments
export const OverpaymentConfigSchema = z.object({
	id: z.string(),
	type: OverpaymentTypeSchema,
	frequency: OverpaymentFrequencySchema.optional(), // For recurring: monthly or yearly (defaults to monthly)
	amount: z.number().positive(), // Amount in cents
	startMonth: z.number().int().positive(), // When it starts (1-indexed)
	endMonth: z.number().int().positive().optional(), // For recurring: when it ends (inclusive)
	effect: OverpaymentEffectSchema, // What happens after overpayment
	label: z.string().optional(), // User note
});
export type OverpaymentConfig = z.infer<typeof OverpaymentConfigSchema>;

// Simulation Input Values
export const SimulateInputValuesSchema = z.object({
	mortgageAmount: z.number().positive(), // Principal amount in cents
	mortgageTermMonths: z.number().int().positive(), // Total term in months
	propertyValue: z.number().positive(), // For LTV calculations
	startDate: z.string().optional(), // ISO date string "2025-02-01", undefined = relative periods
	ber: BerRatingSchema, // BER rating for green rate eligibility
});
export type SimulateInputValues = z.infer<typeof SimulateInputValuesSchema>;

// Full Simulation State
export const SimulationStateSchema = z.object({
	input: SimulateInputValuesSchema,
	ratePeriods: z.array(RatePeriodSchema),
	overpaymentConfigs: z.array(OverpaymentConfigSchema),
	initialized: z.boolean(),
});
export type SimulationState = z.infer<typeof SimulationStateSchema>;

// Applied Overpayment (computed, not stored)
export interface AppliedOverpayment {
	month: number; // Which month this applies to
	amount: number; // Actual amount applied
	configId: string; // Which OverpaymentConfig generated this
	isRecurring: boolean; // From a recurring config?
	withinAllowance: boolean; // Within free overpayment allowance?
	excessAmount: number; // Amount exceeding allowance (for warnings)
}

// Simulation Warning
export type SimulationWarningType =
	| "allowance_exceeded"
	| "early_redemption"
	| "rate_gap";
export type SimulationWarningSeverity = "warning" | "error" | "info";

export interface SimulationWarning {
	type: SimulationWarningType;
	month: number;
	message: string;
	severity: SimulationWarningSeverity;
}

// Amortization Month (computed)
export interface AmortizationMonth {
	month: number; // 1-indexed month of mortgage
	year: number; // Year number (1, 2, 3...)
	monthOfYear: number; // 1-12
	date: string; // ISO date for display

	// Balances
	openingBalance: number;
	closingBalance: number;

	// Payments
	scheduledPayment: number; // Standard monthly payment
	interestPortion: number;
	principalPortion: number;
	overpayment: number; // Extra payment this month
	totalPayment: number; // scheduled + overpayment

	// Rate info
	rate: number; // Current rate for this month
	ratePeriodId: string; // Which rate period

	// Cumulative
	cumulativeInterest: number;
	cumulativePrincipal: number;
	cumulativeOverpayments: number;
	cumulativeTotal: number;
}

// Amortization Year (aggregated)
export interface AmortizationYear {
	year: number;
	openingBalance: number;
	closingBalance: number;
	totalInterest: number;
	totalPrincipal: number;
	totalOverpayments: number;
	totalPayments: number;
	cumulativeInterest: number;
	cumulativePrincipal: number;
	cumulativeTotal: number;
	months: AmortizationMonth[]; // For expansion
	hasWarnings: boolean;
	rateChanges: string[]; // Rate period labels that started this year
}

// Amortization Result (full calculation output)
export interface AmortizationResult {
	months: AmortizationMonth[];
	appliedOverpayments: AppliedOverpayment[];
	warnings: SimulationWarning[];
}

// Resolved Rate Period (after looking up rate details)
// startMonth is computed from stack position, not stored
export interface ResolvedRatePeriod {
	id: string;
	rateId: string; // Reference to the rate
	rate: number;
	type: "fixed" | "variable";
	fixedTerm?: number;
	lenderId: string;
	lenderName: string;
	rateName: string;
	startMonth: number; // Computed from stack position
	durationMonths: number;
	overpaymentPolicyId?: string;
	label: string;
	isCustom: boolean;
}

// Simulation Summary (computed)
export interface SimulationSummary {
	totalInterest: number;
	totalPaid: number;
	actualTermMonths: number;
	interestSaved: number; // vs no overpayments
	monthsSaved: number; // vs no overpayments
}

// Chart Config
export const ChartGranularitySchema = z.enum(["monthly", "yearly"]);
export type ChartGranularity = z.infer<typeof ChartGranularitySchema>;

export const ChartConfigSchema = z.object({
	showPrincipalRemaining: z.boolean(),
	showCumulativeInterest: z.boolean(),
	showCumulativePrincipal: z.boolean(),
	showTotalPaid: z.boolean(),
	granularity: ChartGranularitySchema,
});
export type ChartConfig = z.infer<typeof ChartConfigSchema>;

// Chart Data Point
export interface ChartDataPoint {
	period: string; // "Year 1" or "2025-02"
	principalRemaining: number;
	cumulativeInterest: number;
	cumulativePrincipal: number;
	totalPaid: number;
}

// Milestone types for timeline visualization
export const MILESTONE_TYPES = [
	"mortgage_start",
	"principal_25_percent",
	"principal_50_percent",
	"principal_75_percent",
	"ltv_80_percent",
	"mortgage_complete",
] as const;
export type MilestoneType = (typeof MILESTONE_TYPES)[number];

// Milestone event (computed, not stored)
export interface Milestone {
	type: MilestoneType;
	month: number; // When this milestone is reached
	date: string; // ISO date if start date is set
	label: string; // Human-readable label
	value?: number; // Associated value (e.g., balance at this point)
}
