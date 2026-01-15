import {
	Check,
	Coins,
	Copy,
	Infinity as InfinityIcon,
	type LucideIcon,
	MoreHorizontal,
	PiggyBank,
	Play,
	PlusCircle,
	Repeat,
	TriangleAlert,
	X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { type BerRating, DEFAULT_BER } from "@/lib/constants/ber";
import { getIncorrectRateUrl } from "@/lib/constants/contact";
import type { RatesMode } from "@/lib/constants/rates";
import { getOverpaymentPolicy, resolvePerks } from "@/lib/data";
import { type AprcConfig, calculateAprc } from "@/lib/mortgage/aprc";
import {
	calculateMonthlyPayment,
	calculateRemainingBalance,
} from "@/lib/mortgage/calculations";
import {
	calculateMonthlyFollowOn,
	calculateTotalRepayable,
} from "@/lib/mortgage/payments";
import { canRateBeRepeated, findVariableRate } from "@/lib/mortgage/rates";
import type { Lender } from "@/lib/schemas/lender";
import {
	type AprcFees,
	DEFAULT_APRC_FEES,
	DEFAULT_MAX_TERM,
} from "@/lib/schemas/lender";
import type { OverpaymentPolicy } from "@/lib/schemas/overpayment-policy";
import type { Perk } from "@/lib/schemas/perk";
import type { MortgageRate } from "@/lib/schemas/rate";
import {
	$customRates,
	addCustomRate,
	type StoredCustomRate,
} from "@/lib/stores/custom-rates";
import { $lenders } from "@/lib/stores/lenders";
import { $rates } from "@/lib/stores/rates/rates-state";
import {
	$simulationState,
	addRatePeriod,
	generateRepeatingPeriods,
	hasExistingSimulation,
	initializeFromRate,
} from "@/lib/stores/simulate/simulate-state";
import { formatCurrency } from "@/lib/utils/currency";
import { generateRateLabel } from "@/lib/utils/labels";
import { getPath } from "@/lib/utils/path";
import { formatTermDisplay } from "@/lib/utils/term";
import { LenderLogo } from "../lenders/LenderLogo";
import {
	type GlossaryTermId,
	GlossaryTermTooltip,
} from "../tooltips/GlossaryTermTooltip";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogBody,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "../ui/alert-dialog";
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
	mortgageTerm: number; // in months
	ltv: number;
	berRating?: string;
	mode?: RatesMode;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

interface RateCalculations {
	monthlyPayment: number;
	followOnRate?: MortgageRate;
	followOnLtv: number;
	monthlyFollowOn?: number;
	remainingBalance?: number;
	remainingBalancePct?: number;
	totalRepayable: number;
	costOfCredit: number;
	costOfCreditPct: number;
	indicativeAprc?: number;
	followOnTerm?: number;
}

interface SimulateOption {
	id: string;
	label: string;
	description: string;
	icon: React.ReactNode;
	onClick: () => void;
	group?: "add" | "simulate";
}

/**
 * Generate available term options based on current term (in months) and lender maxTerm (in years).
 * Always returns up to 3 options, aiming for ±5 years from current term.
 * Preserves month component from input (e.g., 27y 6m → 22y 6m, 27y 6m, 32y 6m).
 * If near boundaries (min 5 years or maxTerm), shifts to show 2 options in one direction.
 */
function getTermOptions(
	currentTermMonths: number,
	maxTermYears: number,
): { value: number; label: string }[] {
	const MIN_TERM_MONTHS = 5 * 12; // 5 years minimum
	const MAX_TERM_MONTHS = maxTermYears * 12;
	const STEP_MONTHS = 5 * 12; // 5 years = 60 months

	const lower = currentTermMonths - STEP_MONTHS;
	const upper = currentTermMonths + STEP_MONTHS;

	const canGoDown = lower >= MIN_TERM_MONTHS;
	const canGoUp = upper <= MAX_TERM_MONTHS;

	let options: number[];

	if (canGoDown && canGoUp) {
		// Ideal: -5y, current, +5y
		options = [lower, currentTermMonths, upper];
	} else if (!canGoUp) {
		// At or near max: go down twice
		options = [
			currentTermMonths - STEP_MONTHS * 2,
			currentTermMonths - STEP_MONTHS,
			currentTermMonths,
		];
	} else {
		// At or near min: go up twice
		options = [
			currentTermMonths,
			currentTermMonths + STEP_MONTHS,
			currentTermMonths + STEP_MONTHS * 2,
		];
	}

	// Filter to valid range, dedupe, and sort
	const validOptions = options.filter(
		(term) => term >= MIN_TERM_MONTHS && term <= MAX_TERM_MONTHS,
	);
	const uniqueOptions = [...new Set(validOptions)].sort((a, b) => a - b);

	// Format labels - use compact format for months
	return uniqueOptions.map((totalMonths) => {
		const years = Math.floor(totalMonths / 12);
		const months = totalMonths % 12;
		const label = months === 0 ? `${years} years` : `${years}y ${months}m`;
		return { value: totalMonths, label };
	});
}

/**
 * Calculate all rate info for a given term
 */
function calculateRateInfo(
	rate: MortgageRate,
	allRates: MortgageRate[],
	mortgageAmount: number,
	termMonths: number,
	ltv: number,
	berRating: string | undefined,
	aprcFees: AprcFees,
): RateCalculations {
	// Calculate LTV after fixed term ends
	let followOnLtv = ltv;
	let remainingBalance: number | undefined;

	if (rate.type === "fixed" && rate.fixedTerm) {
		const fixedMonths = rate.fixedTerm * 12;
		remainingBalance = calculateRemainingBalance(
			mortgageAmount,
			rate.rate,
			termMonths,
			fixedMonths,
		);
		// Remaining LTV = remainingBalance / propertyValue * 100
		// propertyValue = mortgageAmount / (ltv / 100)
		followOnLtv = (remainingBalance / mortgageAmount) * ltv;
	}

	// Find follow-on variable rate
	const followOnRate =
		rate.type === "fixed"
			? findVariableRate(
					rate,
					allRates,
					followOnLtv,
					berRating as Parameters<typeof findVariableRate>[3],
				)
			: undefined;

	// Calculate monthly payment
	const monthlyPayment = calculateMonthlyPayment(
		mortgageAmount,
		rate.rate,
		termMonths,
	);

	// Calculate follow-on monthly payment
	const monthlyFollowOn = calculateMonthlyFollowOn(
		rate,
		followOnRate,
		mortgageAmount,
		termMonths,
	);

	// Calculate total repayable
	const totalRepayable = calculateTotalRepayable(
		rate,
		monthlyPayment,
		monthlyFollowOn,
		termMonths,
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
			termMonths,
			valuationFee: aprcFees.valuationFee,
			securityReleaseFee: aprcFees.securityReleaseFee,
		};
		// Use follow-on rate if available, otherwise use fixed rate for whole term
		const followOnRateValue = followOnRate?.rate ?? rate.rate;
		indicativeAprc = calculateAprc(
			rate.rate,
			rate.fixedTerm * 12,
			followOnRateValue,
			aprcConfig,
		);
	}

	// Follow-on term (remaining after fixed) in years for display
	const termYears = Math.floor(termMonths / 12);
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
		followOnRate,
		followOnLtv,
		monthlyFollowOn,
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
	glossaryTermId?: GlossaryTermId;
}) {
	return (
		<tr className="border-b border-border/50 last:border-0">
			<td className="py-2 pr-4 text-muted-foreground text-sm">
				{glossaryTermId ? (
					<span className="inline-flex items-center gap-1">
						{label}
						<GlossaryTermTooltip termId={glossaryTermId} size="sm" />
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
	const [copiedRateId, setCopiedRateId] = useState<string | null>(null);
	const prevCalculationsRef = useRef<RateCalculations | null>(null);

	// Simulation confirmation state
	const [hasExistingSim, setHasExistingSim] = useState(false);
	const [showSimulateConfirm, setShowSimulateConfirm] = useState(false);
	const [pendingSimulateWithFollowOn, setPendingSimulateWithFollowOn] =
		useState(true);
	const [showOptionsDialog, setShowOptionsDialog] = useState(false);

	// Check for existing simulation when modal opens in remortgage mode
	useEffect(() => {
		if (open && mode === "remortgage") {
			setHasExistingSim(hasExistingSimulation());
		}
	}, [open, mode]);

	// Reset selected term and copied state when modal opens with new rate
	useMemo(() => {
		if (rate) {
			setSelectedTerm(mortgageTerm);
			prevCalculationsRef.current = null;
			setCopiedRateId(null);
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
		if (prev.followOnLtv !== calculations.followOnLtv)
			changed.add("followOnLtv");
		if (prev.followOnTerm !== calculations.followOnTerm)
			changed.add("followOnTerm");
		if (prev.monthlyFollowOn !== calculations.monthlyFollowOn)
			changed.add("monthlyFollowOn");
		if (prev.followOnRate?.id !== calculations.followOnRate?.id) {
			changed.add("followOnRate");
			changed.add("followOnProduct");
		}

		setHighlightedFields(changed);
		prevCalculationsRef.current = calculations;

		const timer = setTimeout(() => setHighlightedFields(new Set()), 700);
		return () => clearTimeout(timer);
	}, [calculations]);

	if (!rate || !calculations) return null;

	const isFixed = rate.type === "fixed";
	const hasFollowOn = isFixed && calculations.followOnRate;
	const resolvedPerks = resolvePerks(perks, combinedPerks);
	const isCustom = (rate as { isCustom?: boolean }).isCustom;
	const canRepeat = canRateBeRepeated(rate);

	// Handler for copying rate as custom
	const handleCopyAsCustom = () => {
		const customRate: StoredCustomRate = {
			id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
			name: rate.name,
			lenderId: rate.lenderId,
			type: rate.type,
			rate: rate.rate,
			apr: rate.apr,
			fixedTerm: rate.fixedTerm,
			minLtv: rate.minLtv,
			maxLtv: rate.maxLtv,
			minLoan: rate.minLoan,
			buyerTypes: [...rate.buyerTypes],
			berEligible: rate.berEligible ? [...rate.berEligible] : undefined,
			perks: [...rate.perks],
			customLenderName:
				(rate as { customLenderName?: string }).customLenderName ??
				lender?.name,
		};
		addCustomRate(customRate);
		setCopiedRateId(customRate.id);
	};

	// Handler for navigating to simulation
	// repeatMode: undefined = no repeat, 'with-buffers' = repeat with variable buffers, 'fixed-only' = repeat without buffers
	const handleSimulate = (
		includeFollowOn = true,
		repeatMode?: "with-buffers" | "fixed-only",
	) => {
		if (!rate) return;

		// Convert euros to cents for simulation state
		const mortgageAmountCents = Math.round(mortgageAmount * 100);
		const propertyValueCents = Math.round((mortgageAmount / ltv) * 100 * 100);

		// Get lender name for labels
		const lenderName =
			(rate as { customLenderName?: string }).customLenderName ??
			lender?.name ??
			rate.lenderId;

		// Generate label for the rate period
		const rateLabel = `${lenderName} ${rate.type === "fixed" && rate.fixedTerm ? `${rate.fixedTerm}-Year Fixed` : "Variable"} @ ${rate.rate.toFixed(2)}%`;

		// Prepare follow-on rate if available (for fixed rates) and includeFollowOn is true
		// Don't include follow-on when repeating (repeat will generate its own follow-on periods)
		const followOn =
			includeFollowOn && !repeatMode && calculations?.followOnRate
				? {
						lenderId: calculations.followOnRate.lenderId,
						rateId: calculations.followOnRate.id,
						isCustom:
							(calculations.followOnRate as { isCustom?: boolean }).isCustom ??
							false,
						label: generateRateLabel(lenderName, calculations.followOnRate),
					}
				: undefined;

		initializeFromRate({
			mortgageAmount: mortgageAmountCents,
			mortgageTermMonths: selectedTerm,
			propertyValue: propertyValueCents,
			ber: (berRating as BerRating) ?? DEFAULT_BER,
			lenderId: rate.lenderId,
			rateId: rate.id,
			isCustom: isCustom ?? false,
			fixedTerm: rate.fixedTerm,
			label: rateLabel,
			followOn,
		});

		// If repeat mode is set, generate repeating periods
		if (repeatMode) {
			const state = $simulationState.get();
			const lastPeriod = state.ratePeriods.at(-1);
			if (lastPeriod) {
				const rates = $rates.get();
				const customRates = $customRates.get();
				const lenders = $lenders.get();
				generateRepeatingPeriods(
					lastPeriod.id,
					rates,
					customRates,
					lenders,
					repeatMode === "with-buffers",
				);
			}
		}

		window.location.href = getPath("/simulate");
	};

	// Handler for adding a rate to an existing simulation (remortgage mode)
	// repeatMode: undefined = no repeat, 'with-buffers' = repeat with variable buffers, 'fixed-only' = repeat without buffers
	const handleAddToSimulation = (
		includeFollowOn = true,
		repeatMode?: "with-buffers" | "fixed-only",
	) => {
		if (!rate) return;

		// Get lender name for labels
		const lenderName =
			(rate as { customLenderName?: string }).customLenderName ??
			lender?.name ??
			rate.lenderId;

		// Generate label for the rate period
		const rateLabel = `${lenderName} ${rate.type === "fixed" && rate.fixedTerm ? `${rate.fixedTerm}-Year Fixed` : "Variable"} @ ${rate.rate.toFixed(2)}%`;

		// Add the rate period to simulation state
		addRatePeriod({
			lenderId: rate.lenderId,
			rateId: rate.id,
			isCustom: isCustom ?? false,
			durationMonths:
				rate.type === "fixed" && rate.fixedTerm ? rate.fixedTerm * 12 : 0,
			label: rateLabel,
		});

		// If this is a fixed rate with follow-on - add follow-on
		// Don't include follow-on when repeating (repeat will generate its own follow-on periods)
		if (includeFollowOn && !repeatMode && calculations?.followOnRate) {
			const followOnIsCustom =
				(calculations.followOnRate as { isCustom?: boolean }).isCustom ?? false;
			addRatePeriod({
				lenderId: calculations.followOnRate.lenderId,
				rateId: calculations.followOnRate.id,
				isCustom: followOnIsCustom,
				durationMonths: 0, // Until end of mortgage
				label: generateRateLabel(lenderName, calculations.followOnRate),
			});
		}

		// If repeat mode is set, generate repeating periods
		if (repeatMode) {
			const state = $simulationState.get();
			const lastPeriod = state.ratePeriods.at(-1);
			if (lastPeriod) {
				const rates = $rates.get();
				const customRates = $customRates.get();
				const lenders = $lenders.get();
				generateRepeatingPeriods(
					lastPeriod.id,
					rates,
					customRates,
					lenders,
					repeatMode === "with-buffers",
				);
			}
		}

		window.location.href = getPath("/simulate");
	};

	// Handler for simulate with confirmation (remortgage mode)
	const handleSimulateWithConfirm = (withFollowOn: boolean) => {
		setPendingSimulateWithFollowOn(withFollowOn);
		setShowSimulateConfirm(true);
	};

	const confirmSimulate = () => {
		handleSimulate(pendingSimulateWithFollowOn);
		setShowSimulateConfirm(false);
	};

	// Build options for the simulation options dialog
	const buildSimulateOptions = (): SimulateOption[] => {
		const options: SimulateOption[] = [];

		if (mode === "first-mortgage") {
			// Primary: Simulate (with follow-on if available)
			options.push({
				id: "simulate",
				label: "Simulate",
				description: hasFollowOn
					? "Start a new simulation with this rate, including the follow-on variable rate"
					: "Start a new simulation with this rate",
				icon: <Play className="h-4 w-4" />,
				onClick: () => handleSimulate(true),
			});

			if (hasFollowOn) {
				options.push({
					id: "simulate-fixed-only",
					label: "Simulate Fixed Only",
					description:
						"Start a new simulation with only the fixed period (no follow-on rate)",
					icon: <Play className="h-4 w-4" />,
					onClick: () => handleSimulate(false),
				});
			}

			if (canRepeat) {
				options.push({
					id: "simulate-repeat",
					label: "Simulate and Repeat",
					description:
						"Start a new simulation, repeating this fixed rate with variable buffers until the end",
					icon: <Repeat className="h-4 w-4" />,
					onClick: () => handleSimulate(false, "with-buffers"),
				});
				options.push({
					id: "simulate-repeat-fixed-only",
					label: "Simulate and Repeat Fixed Only",
					description:
						"Start a new simulation, repeating this fixed rate without variable buffers",
					icon: <Repeat className="h-4 w-4" />,
					onClick: () => handleSimulate(false, "fixed-only"),
				});
			}
		} else if (mode === "remortgage" && !hasExistingSim) {
			// Remortgage without existing simulation - same as first-mortgage but with confirm
			options.push({
				id: "simulate",
				label: "Simulate",
				description: hasFollowOn
					? "Start a new simulation with this rate, including the follow-on variable rate"
					: "Start a new simulation with this rate",
				icon: <Play className="h-4 w-4" />,
				onClick: () => handleSimulateWithConfirm(true),
			});

			if (hasFollowOn) {
				options.push({
					id: "simulate-fixed-only",
					label: "Simulate Fixed Only",
					description:
						"Start a new simulation with only the fixed period (no follow-on rate)",
					icon: <Play className="h-4 w-4" />,
					onClick: () => handleSimulateWithConfirm(false),
				});
			}

			if (canRepeat) {
				options.push({
					id: "simulate-repeat",
					label: "Simulate and Repeat",
					description:
						"Start a new simulation, repeating this fixed rate with variable buffers until the end",
					icon: <Repeat className="h-4 w-4" />,
					onClick: () => handleSimulate(false, "with-buffers"),
				});
				options.push({
					id: "simulate-repeat-fixed-only",
					label: "Simulate and Repeat Fixed Only",
					description:
						"Start a new simulation, repeating this fixed rate without variable buffers",
					icon: <Repeat className="h-4 w-4" />,
					onClick: () => handleSimulate(false, "fixed-only"),
				});
			}
		} else if (mode === "remortgage" && hasExistingSim) {
			// Remortgage with existing simulation - Add options first, then Simulate options
			options.push({
				id: "add",
				label: "Add to Simulation",
				description: hasFollowOn
					? "Add this rate to your existing simulation, including the follow-on variable rate"
					: "Add this rate to your existing simulation",
				icon: <PlusCircle className="h-4 w-4" />,
				onClick: () => handleAddToSimulation(true),
				group: "add",
			});

			if (isFixed && hasFollowOn) {
				options.push({
					id: "add-fixed-only",
					label: "Add Fixed Only",
					description:
						"Add only the fixed period to your existing simulation (no follow-on rate)",
					icon: <PlusCircle className="h-4 w-4" />,
					onClick: () => handleAddToSimulation(false),
					group: "add",
				});
			}

			if (canRepeat) {
				options.push({
					id: "add-repeat",
					label: "Add and Repeat",
					description:
						"Add this rate and repeat with variable buffers until the end",
					icon: <Repeat className="h-4 w-4" />,
					onClick: () => handleAddToSimulation(false, "with-buffers"),
					group: "add",
				});
				options.push({
					id: "add-repeat-fixed-only",
					label: "Add and Repeat Fixed Only",
					description: "Add this rate and repeat without variable buffers",
					icon: <Repeat className="h-4 w-4" />,
					onClick: () => handleAddToSimulation(false, "fixed-only"),
					group: "add",
				});
			}

			// Simulate options (start fresh)
			options.push({
				id: "simulate",
				label: "Simulate",
				description: hasFollowOn
					? "Start a new simulation with this rate, including the follow-on variable rate"
					: "Start a new simulation with this rate",
				icon: <Play className="h-4 w-4" />,
				onClick: () => handleSimulateWithConfirm(true),
				group: "simulate",
			});

			if (hasFollowOn) {
				options.push({
					id: "simulate-fixed-only",
					label: "Simulate Fixed Only",
					description:
						"Start a new simulation with only the fixed period (no follow-on rate)",
					icon: <Play className="h-4 w-4" />,
					onClick: () => handleSimulateWithConfirm(false),
					group: "simulate",
				});
			}

			if (canRepeat) {
				options.push({
					id: "simulate-repeat",
					label: "Simulate and Repeat",
					description:
						"Start a new simulation, repeating this fixed rate with variable buffers until the end",
					icon: <Repeat className="h-4 w-4" />,
					onClick: () => handleSimulate(false, "with-buffers"),
					group: "simulate",
				});
				options.push({
					id: "simulate-repeat-fixed-only",
					label: "Simulate and Repeat Fixed Only",
					description:
						"Start a new simulation, repeating this fixed rate without variable buffers",
					icon: <Repeat className="h-4 w-4" />,
					onClick: () => handleSimulate(false, "fixed-only"),
					group: "simulate",
				});
			}
		}

		return options;
	};

	const simulateOptions = buildSimulateOptions();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="sm:max-w-3xl flex flex-col overflow-hidden p-0"
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
											value={formatTermDisplay(selectedTerm)}
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
													{isFixed && !hasFollowOn && (
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
																	No matching follow-on variable rate was found.
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
													{isFixed && !hasFollowOn && (
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
																	No matching follow-on variable rate was found.
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
											{hasFollowOn ? (
												<>
													<InfoRow
														label="Interest Rate"
														value={`${calculations.followOnRate?.rate.toFixed(2)}%`}
														highlight={highlightedFields.has("followOnRate")}
													/>
													<InfoRow
														label="Product"
														value={calculations.followOnRate?.name}
														highlight={highlightedFields.has("followOnProduct")}
														glossaryTermId="followOnProduct"
													/>
													<InfoRow
														label="Monthly Repayments"
														value={
															calculations.monthlyFollowOn
																? formatCurrency(calculations.monthlyFollowOn, {
																		showCents: true,
																	})
																: "—"
														}
														highlight={highlightedFields.has("monthlyFollowOn")}
														glossaryTermId="followOnMonthly"
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
																		? "Add a custom variable rate with matching criteria (lender, LTV range, BER eligibility) to see follow-on calculations."
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
													// Show warning if APRC is calculated (no official APR) and no follow-on rate
													!rate.apr && isFixed && !hasFollowOn ? (
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
												value={`${calculations.followOnLtv.toFixed(1)}%`}
												highlight={highlightedFields.has("followOnLtv")}
											/>
										</tbody>
									</table>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Sticky Footer */}
				<div className="sticky bottom-0 bg-background z-10 px-6 py-4 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-2">
					{/* Hide report button for custom rates */}
					{!isCustom ? (
						<Button
							variant="ghost"
							size="sm"
							className="gap-1.5 text-muted-foreground hover:text-foreground justify-center sm:justify-start"
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
						<div className="hidden sm:block" />
					)}
					<div className="flex items-center justify-end gap-2 flex-wrap">
						{/* Copy as Custom Rate button - only for non-custom rates */}
						{!isCustom &&
							(copiedRateId ? (
								<span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
									<Check className="h-4 w-4 text-green-600" />
									Copied as Custom
								</span>
							) : (
								<Button
									variant="outline"
									size="sm"
									className="gap-1.5"
									onClick={handleCopyAsCustom}
								>
									<Copy className="h-4 w-4" />
									Copy as Custom Rate
								</Button>
							))}
						{/* First mortgage mode: Simulate button */}
						{mode === "first-mortgage" &&
							(simulateOptions.length > 1 ? (
								<div className="flex items-center">
									<Button
										className="gap-1.5 rounded-r-none"
										onClick={() => handleSimulate(true)}
									>
										<Play className="h-4 w-4" />
										Simulate
									</Button>
									<Button
										className="rounded-l-none border-l border-primary-foreground/20 px-2"
										aria-label="More simulation options"
										onClick={() => setShowOptionsDialog(true)}
									>
										<MoreHorizontal className="h-4 w-4" />
									</Button>
								</div>
							) : (
								<Button
									className="gap-1.5"
									onClick={() => handleSimulate(true)}
								>
									<Play className="h-4 w-4" />
									Simulate
								</Button>
							))}

						{/* Remortgage mode without existing simulation: Simulate with confirmation */}
						{mode === "remortgage" &&
							!hasExistingSim &&
							(simulateOptions.length > 1 ? (
								<div className="flex items-center">
									<Button
										className="gap-1.5 rounded-r-none"
										onClick={() => handleSimulateWithConfirm(true)}
									>
										<Play className="h-4 w-4" />
										Simulate
									</Button>
									<Button
										className="rounded-l-none border-l border-primary-foreground/20 px-2"
										aria-label="More simulation options"
										onClick={() => setShowOptionsDialog(true)}
									>
										<MoreHorizontal className="h-4 w-4" />
									</Button>
								</div>
							) : (
								<Button
									className="gap-1.5"
									onClick={() => handleSimulateWithConfirm(true)}
								>
									<Play className="h-4 w-4" />
									Simulate
								</Button>
							))}

						{/* Remortgage mode with existing simulation: Add to Simulation button */}
						{mode === "remortgage" &&
							hasExistingSim &&
							(simulateOptions.length > 1 ? (
								<div className="flex items-center">
									<Button
										className="gap-1.5 rounded-r-none"
										onClick={() => handleAddToSimulation(true)}
									>
										<PlusCircle className="h-4 w-4" />
										Add to Simulation
									</Button>
									<Button
										className="rounded-l-none border-l border-primary-foreground/20 px-2"
										aria-label="More options"
										onClick={() => setShowOptionsDialog(true)}
									>
										<MoreHorizontal className="h-4 w-4" />
									</Button>
								</div>
							) : (
								<Button
									className="gap-1.5"
									onClick={() => handleAddToSimulation(true)}
								>
									<PlusCircle className="h-4 w-4" />
									Add to Simulation
								</Button>
							))}
					</div>
				</div>
			</DialogContent>

			{/* Confirmation dialog for starting new simulation in remortgage mode */}
			<AlertDialog
				open={showSimulateConfirm}
				onOpenChange={setShowSimulateConfirm}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Start New Simulation?</AlertDialogTitle>
						<AlertDialogDescription className="space-y-3">
							<span className="block">
								Mortgage switches are typically a continuation of an existing
								mortgage.
							</span>
							<span className="block">
								To model a switch: on this page, select{" "}
								<strong>First Mortgage</strong> and click{" "}
								<strong>Simulate</strong> to create a simulation with your
								current mortgage. Then, on the Simulate page, click{" "}
								<strong>Add Rate</strong> and the{" "}
								<strong>Add to Simulation</strong> button will appear here when
								clicking on a remortgage product.
							</span>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={confirmSimulate}>
							Start Fresh Instead
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Simulation Options dialog */}
			<AlertDialog open={showOptionsDialog} onOpenChange={setShowOptionsDialog}>
				<AlertDialogContent className="max-h-[85vh]">
					<AlertDialogHeader>
						<AlertDialogTitle>Simulation Options</AlertDialogTitle>
						<AlertDialogDescription>
							Choose how to simulate this rate.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogBody className="space-y-2">
						{simulateOptions.map((option, index) => {
							const prevOption = simulateOptions[index - 1];
							const isNewGroup =
								option.group &&
								(!prevOption?.group || prevOption.group !== option.group);
							const isRepeatOption = option.id.includes("repeat");
							const hasEligibilityCriteria = rate.minLtv > 0 || rate.minLoan;
							const showRepeatWarning =
								isRepeatOption && hasEligibilityCriteria;

							return (
								<div key={option.id}>
									{isNewGroup && (
										<h4
											className={`text-xs font-medium text-muted-foreground uppercase tracking-wide ${index > 0 ? "mt-4" : ""} mb-2`}
										>
											{option.group === "add"
												? "Add to Existing Simulation"
												: "Start New Simulation"}
										</h4>
									)}
									<Button
										variant="outline"
										onClick={() => {
											setShowOptionsDialog(false);
											option.onClick();
										}}
										className="w-full h-auto text-left justify-start p-3 flex-col items-start whitespace-normal"
									>
										<span className="flex items-center gap-2 font-medium">
											{option.icon}
											{option.label}
											{showRepeatWarning && (
												<Tooltip>
													<TooltipTrigger asChild>
														<span className="inline-flex">
															<TriangleAlert className="h-4 w-4 text-amber-500" />
														</span>
													</TooltipTrigger>
													<TooltipContent className="max-w-xs">
														<p className="font-medium">Repeat Eligibility</p>
														<p className="text-xs text-muted-foreground mt-1">
															This rate will only repeat while eligible:{" "}
															{rate.minLtv > 0 && rate.minLoan
																? `LTV above ${rate.minLtv}% and balance above ${formatCurrency(rate.minLoan)}`
																: rate.minLtv > 0
																	? `LTV above ${rate.minLtv}%`
																	: `balance above ${formatCurrency(rate.minLoan ?? 0)}`}
															. After that, you'll need to add a different rate.
														</p>
													</TooltipContent>
												</Tooltip>
											)}
										</span>
										<span className="text-sm text-muted-foreground mt-1 font-normal text-wrap">
											{option.description}
										</span>
									</Button>
								</div>
							);
						})}
					</AlertDialogBody>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Dialog>
	);
}
