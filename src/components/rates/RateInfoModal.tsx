import {
	Coins,
	HelpCircle,
	Infinity as InfinityIcon,
	type LucideIcon,
	PiggyBank,
	Play,
	TriangleAlert,
	X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { GLOSSARY_TERMS_MAP, getIncorrectRateUrl } from "@/lib/constants";
import {
	DEFAULT_MAX_TERM,
	getOverpaymentPolicy,
	type Lender,
	type MortgageRate,
	type OverpaymentPolicy,
	type Perk,
	resolvePerks,
} from "@/lib/data";
import {
	calculateAprc,
	calculateMonthlyFollowUp,
	calculateMonthlyPayment,
	calculateRemainingBalance,
	calculateTotalRepayable,
	findVariableRate,
} from "@/lib/mortgage";
import type { AprcConfig } from "@/lib/mortgage/aprc";
import { type AprcFees, DEFAULT_APRC_FEES } from "@/lib/schemas/lender";
import { formatCurrency } from "@/lib/utils";
import { LenderLogo } from "../LenderLogo";
import { Button } from "../ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

// Map perk icon names to lucide components
const PERK_ICONS: Record<string, LucideIcon> = {
	PiggyBank,
	Coins,
};

interface RateInfoModalProps {
	rate: MortgageRate | null;
	lender: Lender | undefined;
	allRates: MortgageRate[];
	perks: Perk[];
	overpaymentPolicies: OverpaymentPolicy[];
	combinedPerks: string[];
	mortgageAmount: number;
	mortgageTerm: number;
	ltv: number;
	berRating?: string;
	mode?: "first-mortgage" | "remortgage";
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

interface RateCalculations {
	monthlyPayment: number;
	followUpRate?: MortgageRate;
	followUpLtv: number;
	monthlyFollowUp?: number;
	remainingBalance?: number;
	remainingBalancePct?: number;
	totalRepayable: number;
	costOfCredit: number;
	costOfCreditPct: number;
	indicativeAprc?: number;
	followOnTerm?: number;
}

/**
 * Generate available term options based on current term and lender maxTerm
 */
function getTermOptions(
	currentTerm: number,
	maxTerm: number,
): { value: number; label: string }[] {
	const options: number[] = [];

	// Always include current term
	options.push(currentTerm);

	if (currentTerm === 5) {
		// If 5, show 10 and 15
		options.push(10, 15);
	} else if (currentTerm >= maxTerm) {
		// If at max (35 or 40), show max-5 and max-10
		options.push(maxTerm - 5, maxTerm - 10);
	} else {
		// Otherwise show ±5
		if (currentTerm - 5 >= 5) {
			options.push(currentTerm - 5);
		}
		if (currentTerm + 5 <= maxTerm) {
			options.push(currentTerm + 5);
		}
	}

	// Sort and dedupe
	const uniqueOptions = [...new Set(options)].sort((a, b) => a - b);

	return uniqueOptions.map((term) => ({
		value: term,
		label: `${term} years`,
	}));
}

/**
 * Calculate all rate info for a given term
 */
function calculateRateInfo(
	rate: MortgageRate,
	allRates: MortgageRate[],
	mortgageAmount: number,
	termYears: number,
	ltv: number,
	berRating: string | undefined,
	aprcFees: AprcFees,
): RateCalculations {
	const totalMonths = termYears * 12;

	// Calculate LTV after fixed term ends
	let followUpLtv = ltv;
	let remainingBalance: number | undefined;

	if (rate.type === "fixed" && rate.fixedTerm) {
		const fixedMonths = rate.fixedTerm * 12;
		remainingBalance = calculateRemainingBalance(
			mortgageAmount,
			rate.rate,
			totalMonths,
			fixedMonths,
		);
		// Remaining LTV = remainingBalance / propertyValue * 100
		// propertyValue = mortgageAmount / (ltv / 100)
		followUpLtv = (remainingBalance / mortgageAmount) * ltv;
	}

	// Find follow-up variable rate
	const followUpRate =
		rate.type === "fixed"
			? findVariableRate(
					rate,
					allRates,
					followUpLtv,
					berRating as Parameters<typeof findVariableRate>[3],
				)
			: undefined;

	// Calculate monthly payment
	const monthlyPayment = calculateMonthlyPayment(
		mortgageAmount,
		rate.rate,
		totalMonths,
	);

	// Calculate follow-up monthly payment
	const monthlyFollowUp = calculateMonthlyFollowUp(
		rate,
		followUpRate,
		mortgageAmount,
		termYears,
	);

	// Calculate total repayable
	const totalRepayable = calculateTotalRepayable(
		rate,
		monthlyPayment,
		monthlyFollowUp,
		termYears,
	);

	// Cost of credit
	const costOfCredit = totalRepayable - mortgageAmount;
	const costOfCreditPct = (costOfCredit / mortgageAmount) * 100;

	// Use existing APR if available (consistent with table display)
	// Only calculate APRC if no APR is provided
	let indicativeAprc: number | undefined = rate.apr;
	if (!indicativeAprc && rate.type === "fixed" && rate.fixedTerm) {
		const aprcConfig: AprcConfig = {
			loanAmount: mortgageAmount,
			termYears,
			valuationFee: aprcFees.valuationFee,
			securityReleaseFee: aprcFees.securityReleaseFee,
		};
		// Use follow-up rate if available, otherwise use fixed rate for whole term
		const followOnRate = followUpRate?.rate ?? rate.rate;
		indicativeAprc = calculateAprc(
			rate.rate,
			rate.fixedTerm * 12,
			followOnRate,
			aprcConfig,
		);
	}

	// Follow-on term (remaining after fixed)
	const followOnTerm =
		rate.type === "fixed" && rate.fixedTerm
			? termYears - rate.fixedTerm
			: undefined;

	// Remaining balance as percentage of mortgage amount
	const remainingBalancePct =
		remainingBalance !== undefined
			? (remainingBalance / mortgageAmount) * 100
			: undefined;

	return {
		monthlyPayment,
		followUpRate,
		followUpLtv,
		monthlyFollowUp,
		remainingBalance,
		remainingBalancePct,
		totalRepayable,
		costOfCredit,
		costOfCreditPct,
		indicativeAprc,
		followOnTerm,
	};
}

function InfoRow({
	label,
	value,
	muted = false,
	highlight = false,
	glossaryTermId,
}: {
	label: string;
	value: string | React.ReactNode;
	muted?: boolean;
	highlight?: boolean;
	glossaryTermId?: string;
}) {
	const glossaryTerm = glossaryTermId
		? GLOSSARY_TERMS_MAP[glossaryTermId]
		: null;

	return (
		<tr className="border-b border-border/50 last:border-0">
			<td className="py-2 pr-4 text-muted-foreground text-sm">
				{glossaryTerm ? (
					<span className="inline-flex items-center gap-1">
						{label}
						<Tooltip>
							<TooltipTrigger asChild>
								<span className="inline-flex items-center justify-center cursor-help">
									<HelpCircle className="h-3 w-3 text-muted-foreground" />
								</span>
							</TooltipTrigger>
							<TooltipContent className="max-w-xs">
								<p className="font-medium">{glossaryTerm.shortDescription}</p>
								<p className="text-xs text-muted-foreground mt-1">
									{glossaryTerm.fullDescription}
								</p>
							</TooltipContent>
						</Tooltip>
					</span>
				) : (
					label
				)}
			</td>
			<td
				className={`py-2 text-right font-medium transition-colors duration-700 ${
					highlight ? "text-primary" : muted ? "text-muted-foreground" : ""
				}`}
			>
				{value}
			</td>
		</tr>
	);
}

export function RateInfoModal({
	rate,
	lender,
	allRates,
	perks,
	overpaymentPolicies,
	combinedPerks,
	mortgageAmount,
	mortgageTerm,
	ltv,
	berRating,
	mode,
	open,
	onOpenChange,
}: RateInfoModalProps) {
	const [selectedTerm, setSelectedTerm] = useState(mortgageTerm);
	const [highlightedFields, setHighlightedFields] = useState<Set<string>>(
		new Set(),
	);
	const prevCalculationsRef = useRef<RateCalculations | null>(null);

	// Reset selected term when modal opens with new rate
	useMemo(() => {
		if (rate) {
			setSelectedTerm(mortgageTerm);
			prevCalculationsRef.current = null;
		}
	}, [rate, mortgageTerm]);

	// Get term options based on lender's maxTerm
	const maxTerm = lender?.maxTerm ?? DEFAULT_MAX_TERM;
	const termOptions = useMemo(
		() => getTermOptions(mortgageTerm, maxTerm),
		[mortgageTerm, maxTerm],
	);

	// Determine APRC fees: custom rate fees > lender fees > defaults
	const aprcFees = useMemo((): AprcFees => {
		// Check if rate has custom aprcFees (for custom rates)
		const rateAprcFees = (rate as { aprcFees?: AprcFees } | null)?.aprcFees;
		if (rateAprcFees) return rateAprcFees;

		// Use lender fees if available
		if (lender?.aprcFees) return lender.aprcFees;

		// Fall back to defaults
		return DEFAULT_APRC_FEES;
	}, [rate, lender]);

	// Calculate rate info for selected term
	const calculations = useMemo(() => {
		if (!rate) return null;
		return calculateRateInfo(
			rate,
			allRates,
			mortgageAmount,
			selectedTerm,
			ltv,
			berRating,
			aprcFees,
		);
	}, [rate, allRates, mortgageAmount, selectedTerm, ltv, berRating, aprcFees]);

	// Highlight fields that changed when term changes
	useEffect(() => {
		const prev = prevCalculationsRef.current;
		if (!prev || !calculations) {
			prevCalculationsRef.current = calculations;
			return;
		}

		const changed = new Set<string>();
		changed.add("term"); // Term always changes
		if (prev.monthlyPayment !== calculations.monthlyPayment)
			changed.add("monthlyPayment");
		if (prev.totalRepayable !== calculations.totalRepayable)
			changed.add("totalRepayable");
		if (prev.costOfCredit !== calculations.costOfCredit)
			changed.add("costOfCredit");
		if (prev.remainingBalance !== calculations.remainingBalance)
			changed.add("remainingBalance");
		if (prev.remainingBalancePct !== calculations.remainingBalancePct)
			changed.add("remainingBalancePct");
		if (prev.followUpLtv !== calculations.followUpLtv)
			changed.add("followUpLtv");
		if (prev.followOnTerm !== calculations.followOnTerm)
			changed.add("followOnTerm");
		if (prev.monthlyFollowUp !== calculations.monthlyFollowUp)
			changed.add("monthlyFollowUp");
		if (prev.followUpRate?.id !== calculations.followUpRate?.id) {
			changed.add("followUpRate");
			changed.add("followUpProduct");
		}

		setHighlightedFields(changed);
		prevCalculationsRef.current = calculations;

		const timer = setTimeout(() => setHighlightedFields(new Set()), 700);
		return () => clearTimeout(timer);
	}, [calculations]);

	if (!rate || !calculations) return null;

	const isFixed = rate.type === "fixed";
	const hasFollowUp = isFixed && calculations.followUpRate;
	const resolvedPerks = resolvePerks(perks, combinedPerks);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="sm:max-w-3xl max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden p-0"
				showCloseButton={false}
			>
				{/* Sticky Header */}
				<div className="sticky top-0 bg-background z-10 px-6 pt-6 pb-4 border-b space-y-4">
					<DialogHeader>
						<div className="flex items-start justify-between gap-3">
							<div className="flex items-center gap-3">
								<LenderLogo
									lenderId={rate.lenderId}
									size={40}
									isCustom={(rate as { isCustom?: boolean }).isCustom}
								/>
								<div>
									<DialogTitle className="flex items-center gap-2">
										{rate.name}
										{(rate as { isCustom?: boolean }).isCustom && (
											<span className="text-xs font-normal px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
												Custom
											</span>
										)}
									</DialogTitle>
									<DialogDescription>
										{(rate as { customLenderName?: string }).customLenderName ??
											lender?.name ??
											rate.lenderId}{" "}
										•{" "}
										{isFixed ? `${rate.fixedTerm} Year Fixed` : "Variable Rate"}
									</DialogDescription>
								</div>
							</div>
							{/* Perks and Close button */}
							<div className="flex items-center gap-3">
								{resolvedPerks.length > 0 && (
									<div className="flex flex-wrap gap-1.5 justify-end">
										{resolvedPerks.map((perk) => {
											const IconComponent = PERK_ICONS[perk.icon];
											return (
												<Tooltip key={perk.id}>
													<TooltipTrigger asChild>
														<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs cursor-help">
															{IconComponent && (
																<IconComponent className="h-3 w-3 text-muted-foreground" />
															)}
															<span>{perk.label}</span>
														</span>
													</TooltipTrigger>
													{perk.description && (
														<TooltipContent>
															<p className="text-xs">{perk.description}</p>
														</TooltipContent>
													)}
												</Tooltip>
											);
										})}
									</div>
								)}
								<DialogClose className="cursor-pointer rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
									<X className="h-4 w-4" />
									<span className="sr-only">Close</span>
								</DialogClose>
							</div>
						</div>
					</DialogHeader>

					{/* Term Selector */}
					{termOptions.length > 1 && (
						<Tabs
							value={String(selectedTerm)}
							onValueChange={(v) => setSelectedTerm(Number(v))}
						>
							<TabsList>
								{termOptions.map((option) => (
									<TabsTrigger key={option.value} value={String(option.value)}>
										{option.label}
									</TabsTrigger>
								))}
							</TabsList>
						</Tabs>
					)}
				</div>

				{/* Scrollable Content */}
				<div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
					{/* Two-column grid layout */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Left Column: Mortgage Details */}
						<div className="space-y-4">
							<div>
								<h4 className="text-sm font-semibold text-muted-foreground mb-2">
									Mortgage Details
								</h4>
								<table className="w-full">
									<tbody>
										<InfoRow
											label="Mortgage Amount"
											value={formatCurrency(mortgageAmount)}
										/>
										<InfoRow
											label="Full Term"
											value={`${selectedTerm} years`}
											highlight={highlightedFields.has("term")}
										/>
										<InfoRow
											label="Monthly Repayments"
											value={formatCurrency(calculations.monthlyPayment, {
												showCents: true,
											})}
											highlight={highlightedFields.has("monthlyPayment")}
										/>
										<InfoRow
											label="Total Repayable"
											value={
												<span className="inline-flex items-center gap-1">
													{formatCurrency(calculations.totalRepayable, {
														showCents: true,
													})}
													{isFixed && !hasFollowUp && (
														<Tooltip>
															<TooltipTrigger asChild>
																<span className="inline-flex items-center justify-center cursor-help">
																	<TriangleAlert className="h-3.5 w-3.5 text-yellow-500" />
																</span>
															</TooltipTrigger>
															<TooltipContent className="max-w-xs">
																<p className="font-medium">
																	Fixed Rate Used for Whole Term
																</p>
																<p className="text-xs text-muted-foreground">
																	No matching follow-up variable rate was found.
																	This calculation assumes the fixed rate
																	continues for the entire term.
																</p>
															</TooltipContent>
														</Tooltip>
													)}
												</span>
											}
											highlight={highlightedFields.has("totalRepayable")}
											glossaryTermId="totalRepayable"
										/>
										<InfoRow
											label="Cost of Credit"
											value={
												<span className="inline-flex items-center gap-1">
													{`${formatCurrency(calculations.costOfCredit)} (${calculations.costOfCreditPct.toFixed(1)}%)`}
													{isFixed && !hasFollowUp && (
														<Tooltip>
															<TooltipTrigger asChild>
																<span className="inline-flex items-center justify-center cursor-help">
																	<TriangleAlert className="h-3.5 w-3.5 text-yellow-500" />
																</span>
															</TooltipTrigger>
															<TooltipContent className="max-w-xs">
																<p className="font-medium">
																	Fixed Rate Used for Whole Term
																</p>
																<p className="text-xs text-muted-foreground">
																	No matching follow-up variable rate was found.
																	This calculation assumes the fixed rate
																	continues for the entire term.
																</p>
															</TooltipContent>
														</Tooltip>
													)}
												</span>
											}
											highlight={highlightedFields.has("costOfCredit")}
											glossaryTermId="costOfCredit"
										/>
									</tbody>
								</table>
							</div>

							{/* Follow-On Period (only for fixed rates) */}
							{isFixed && (
								<div>
									<h4 className="text-sm font-semibold text-muted-foreground mb-2">
										Follow-On Period
									</h4>
									<table className="w-full">
										<tbody>
											{calculations.followOnTerm !== undefined &&
												calculations.followOnTerm > 0 && (
													<InfoRow
														label="Term"
														value={`${calculations.followOnTerm} years`}
														highlight={highlightedFields.has("followOnTerm")}
													/>
												)}
											{hasFollowUp ? (
												<>
													<InfoRow
														label="Interest Rate"
														value={`${calculations.followUpRate?.rate.toFixed(2)}%`}
														highlight={highlightedFields.has("followUpRate")}
													/>
													<InfoRow
														label="Product"
														value={calculations.followUpRate?.name}
														highlight={highlightedFields.has("followUpProduct")}
														glossaryTermId="followUpProduct"
													/>
													<InfoRow
														label="Monthly Repayments"
														value={
															calculations.monthlyFollowUp
																? formatCurrency(calculations.monthlyFollowUp, {
																		showCents: true,
																	})
																: "—"
														}
														highlight={highlightedFields.has("monthlyFollowUp")}
													/>
												</>
											) : (
												<tr>
													<td colSpan={2} className="py-2">
														<div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
															<TriangleAlert className="h-4 w-4 shrink-0 mt-0.5" />
															<div>
																<p className="font-medium">
																	No matching variable rate found
																</p>
																<p className="text-xs text-destructive/80 mt-1">
																	{(rate as { isCustom?: boolean }).isCustom
																		? "Add a custom variable rate with matching criteria (lender, LTV range, BER eligibility) to see follow-up calculations."
																		: "Total repayable and cost of credit are calculated assuming the fixed rate continues for the entire term."}
																</p>
															</div>
														</div>
													</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>
							)}
						</div>

						{/* Right Column: Rate Details */}
						<div className="space-y-4">
							<div>
								<h4 className="text-sm font-semibold text-muted-foreground mb-2">
									Rate Details
								</h4>
								<table className="w-full">
									<tbody>
										<InfoRow
											label="Interest Rate"
											value={`${rate.rate.toFixed(2)}%`}
										/>
										{isFixed && rate.fixedTerm && (
											<InfoRow
												label="Fixed Period"
												value={`${rate.fixedTerm} years`}
											/>
										)}
										{calculations.indicativeAprc && (
											<InfoRow
												label="APRC"
												value={
													// Show warning if APRC is calculated (no official APR) and no follow-up rate
													!rate.apr && isFixed && !hasFollowUp ? (
														<span className="inline-flex items-center gap-1">
															{`${calculations.indicativeAprc.toFixed(2)}%`}
															<Tooltip>
																<TooltipTrigger asChild>
																	<span className="inline-flex items-center justify-center cursor-help">
																		<TriangleAlert className="h-3.5 w-3.5 text-yellow-500" />
																	</span>
																</TooltipTrigger>
																<TooltipContent className="max-w-xs">
																	<p className="font-medium">
																		Fixed Rate Used for Whole Term
																	</p>
																	<p className="text-xs text-muted-foreground">
																		No matching follow-up variable rate was
																		found. This APRC is calculated assuming the
																		fixed rate continues for the entire term.
																	</p>
																</TooltipContent>
															</Tooltip>
														</span>
													) : (
														`${calculations.indicativeAprc.toFixed(2)}%`
													)
												}
												glossaryTermId="aprc"
											/>
										)}
										<InfoRow
											label="Overpayment Policy"
											value={(() => {
												// Custom rates: unknown policy
												if ((rate as { isCustom?: boolean }).isCustom) {
													return "Unknown";
												}
												// Variable rates: always unlimited
												if (!isFixed) {
													return (
														<span className="inline-flex items-center gap-1">
															<InfinityIcon className="h-3.5 w-3.5 text-muted-foreground" />
															Unlimited
														</span>
													);
												}
												// Fixed rates: check for overpayment policy
												const policy = lender?.overpaymentPolicy
													? getOverpaymentPolicy(
															overpaymentPolicies,
															lender.overpaymentPolicy,
														)
													: undefined;
												if (!policy) {
													return "Fee Applies";
												}
												return (
													<Tooltip>
														<TooltipTrigger asChild>
															<span className="inline-flex items-center gap-1 cursor-help underline decoration-dotted underline-offset-2">
																{policy.label}
															</span>
														</TooltipTrigger>
														<TooltipContent>
															<p className="text-xs">{policy.description}</p>
														</TooltipContent>
													</Tooltip>
												);
											})()}
										/>
										{rate.minLoan && (
											<InfoRow
												label="Min. Loan Amount"
												value={formatCurrency(rate.minLoan)}
											/>
										)}
										{rate.berEligible && rate.berEligible.length > 0 && (
											<InfoRow
												label="BER Required"
												value={rate.berEligible.join(", ")}
											/>
										)}
									</tbody>
								</table>
							</div>

							{/* End of Fixed Period Details */}
							{isFixed && calculations.remainingBalance !== undefined && (
								<div>
									<h4 className="text-sm font-semibold text-muted-foreground mb-2">
										At End of Fixed Period
									</h4>
									<table className="w-full">
										<tbody>
											<InfoRow
												label="Remaining Balance"
												value={formatCurrency(calculations.remainingBalance)}
												highlight={highlightedFields.has("remainingBalance")}
											/>
											<InfoRow
												label="% of Original"
												value={`${calculations.remainingBalancePct?.toFixed(1)}%`}
												highlight={highlightedFields.has("remainingBalancePct")}
											/>
											<InfoRow
												label="LTV"
												value={`${calculations.followUpLtv.toFixed(1)}%`}
												highlight={highlightedFields.has("followUpLtv")}
											/>
										</tbody>
									</table>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Sticky Footer */}
				<div className="sticky bottom-0 bg-background z-10 px-6 py-4 border-t flex items-center justify-between">
					{/* Hide report button for custom rates */}
					{!(rate as { isCustom?: boolean }).isCustom ? (
						<Button
							variant="ghost"
							size="sm"
							className="gap-1.5 text-muted-foreground hover:text-foreground"
							asChild
						>
							<a
								href={getIncorrectRateUrl({
									lenderId: rate.lenderId,
									rateName: rate.name,
									rateId: rate.id,
									sourceUrl: lender?.ratesUrl,
									reportSource: "Rate Info dialog",
								})}
								target="_blank"
								rel="noopener noreferrer"
							>
								<TriangleAlert className="h-4 w-4" />
								Incorrect Info?
							</a>
						</Button>
					) : (
						<div />
					)}
					{mode === "first-mortgage" && (
						<Button className="gap-1.5">
							<Play className="h-4 w-4" />
							Simulate
						</Button>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
