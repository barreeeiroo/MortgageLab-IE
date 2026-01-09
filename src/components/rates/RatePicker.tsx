import { ExternalLink } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { BerRating } from "@/lib/constants/ber";
import { filterRates, getLender } from "@/lib/data";
import { fetchAllRates, fetchLendersData } from "@/lib/data/fetch";
import type { BuyerType } from "@/lib/schemas/buyer";
import type { Lender } from "@/lib/schemas/lender";
import type { MortgageRate } from "@/lib/schemas/rate";
import { saveRatesForm } from "@/lib/storage/forms";
import { cn } from "@/lib/utils/cn";
import { LenderLogo } from "../lenders/LenderLogo";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Skeleton } from "../ui/skeleton";

interface RatePickerProps {
	value: string;
	onChange: (value: string) => void;
	mode: "picker" | "manual";
	onModeChange: (mode: "picker" | "manual") => void;
	// Filter params
	ltv?: number;
	buyerType?: BuyerType;
	berRating?: BerRating;
	isRemortgage?: boolean;
	currentLender?: string;
	// Optional
	label?: string;
	id?: string;
	maxRates?: number;
	// Callback when a rate is selected (returns full rate info including fixedTermMonths)
	onRateSelect?: (rate: MortgageRate) => void;
	// Show "View All Rates" link with prefilled filters
	showViewAllRates?: boolean;
	// For generating prefilled rates page link
	propertyValue?: string;
	mortgageAmount?: string;
	mortgageTerm?: string;
}

interface RateOption {
	rate: MortgageRate;
	lender: Lender | undefined;
}

export function RatePicker({
	value,
	onChange,
	mode,
	onModeChange,
	ltv,
	buyerType,
	berRating,
	isRemortgage = false,
	currentLender,
	label = "Interest Rate",
	id = "interestRate",
	maxRates = 5,
	onRateSelect,
	showViewAllRates = false,
	propertyValue,
	mortgageAmount,
	mortgageTerm,
}: RatePickerProps) {
	const [rates, setRates] = useState<MortgageRate[]>([]);
	const [lenders, setLenders] = useState<Lender[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	// Track selected rate ID for unique selection (since multiple rates can have same value)
	const [selectedRateId, setSelectedRateId] = useState<string | null>(null);

	// Fetch rates and lenders on mount
	useEffect(() => {
		async function loadData() {
			setIsLoading(true);
			setError(null);
			try {
				const fetchedLenders = await fetchLendersData();
				setLenders(fetchedLenders);

				if (fetchedLenders.length > 0) {
					const { rates: fetchedRates } = await fetchAllRates(fetchedLenders);
					setRates(fetchedRates);
				}
			} catch {
				setError("Failed to load rates");
			} finally {
				setIsLoading(false);
			}
		}
		loadData();
	}, []);

	// Filter and sort rates
	const filteredRates = useCallback((): RateOption[] => {
		if (rates.length === 0) return [];

		const filtered = filterRates(rates, {
			ltv,
			buyerType,
			ber: berRating,
			currentLender: isRemortgage ? currentLender : undefined,
		});

		// Sort by rate ascending and take top N
		const sorted = [...filtered].sort((a, b) => a.rate - b.rate);
		const topRates = sorted.slice(0, maxRates);

		return topRates.map((rate) => ({
			rate,
			lender: getLender(lenders, rate.lenderId),
		}));
	}, [
		rates,
		lenders,
		ltv,
		buyerType,
		berRating,
		isRemortgage,
		currentLender,
		maxRates,
	]);

	const rateOptions = filteredRates();

	// Sync selectedRateId when rates load and there's a pre-existing value
	useEffect(() => {
		if (rateOptions.length > 0 && value && !selectedRateId) {
			// Find a rate that matches the current value
			const matchingRate = rateOptions.find(
				(opt) => opt.rate.rate.toString() === value,
			);
			if (matchingRate) {
				setSelectedRateId(matchingRate.rate.id);
			}
		}
	}, [rateOptions, value, selectedRateId]);

	const handleRateSelect = (rateId: string) => {
		// Find the rate by ID and pass its value to onChange
		const selectedRate = rateOptions.find((opt) => opt.rate.id === rateId);
		if (selectedRate) {
			setSelectedRateId(rateId);
			onChange(selectedRate.rate.rate.toString());
			onRateSelect?.(selectedRate.rate);
		}
	};

	// Determine which rate is currently selected
	// If we have a selectedRateId, use that; otherwise try to match by rate value
	const isRateSelected = (rate: MortgageRate): boolean => {
		if (selectedRateId) {
			return rate.id === selectedRateId;
		}
		// Fallback: match by rate value (for initial load from shared URL)
		return rate.rate.toString() === value;
	};

	const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		// Allow only valid decimal numbers
		const inputValue = e.target.value;
		if (inputValue === "" || /^\d*\.?\d*$/.test(inputValue)) {
			onChange(inputValue);
		}
	};

	const formatFixedTerm = (rate: MortgageRate): string => {
		if (rate.type === "variable") return "Variable";
		if (rate.fixedTerm === 1) return "1 Year Fixed";
		return `${rate.fixedTerm} Years Fixed`;
	};

	return (
		<div className="space-y-3">
			{label && (
				<div className="flex items-center justify-between">
					<Label htmlFor={id}>{label}</Label>
					<button
						type="button"
						onClick={() =>
							onModeChange(mode === "picker" ? "manual" : "picker")
						}
						className="text-sm text-primary hover:underline"
					>
						{mode === "picker" ? "Enter manually" : "Choose from rates"}
					</button>
				</div>
			)}

			{mode === "manual" ? (
				<div className="flex items-center gap-2">
					<Input
						id={id}
						type="text"
						inputMode="decimal"
						value={value}
						onChange={handleManualInput}
						placeholder="e.g. 3.45"
						className="w-32"
					/>
					<span className="text-muted-foreground">%</span>
				</div>
			) : (
				<div className="space-y-1.5">
					{isLoading ? (
						<div className="space-y-1.5">
							{["skeleton-1", "skeleton-2", "skeleton-3"].map((key) => (
								<Skeleton key={key} className="h-[52px] w-full" />
							))}
						</div>
					) : error ? (
						<p className="text-sm text-destructive">{error}</p>
					) : rateOptions.length === 0 ? (
						<div className="text-sm text-muted-foreground p-4 border rounded-lg bg-muted/50">
							<p>No rates found for your criteria.</p>
							<p className="mt-1">
								Try adjusting LTV, BER rating, or{" "}
								<button
									type="button"
									onClick={() => onModeChange("manual")}
									className="text-primary hover:underline"
								>
									enter a rate manually
								</button>
								.
							</p>
						</div>
					) : (
						<>
							<RadioGroup
								value={selectedRateId ?? ""}
								onValueChange={handleRateSelect}
								className="gap-1.5"
							>
								{rateOptions.map(({ rate, lender }) => (
									<label
										key={rate.id}
										htmlFor={`rate-${rate.id}`}
										className={cn(
											"flex items-center gap-2.5 p-2 border rounded-lg cursor-pointer transition-colors",
											"hover:bg-muted/50",
											isRateSelected(rate) && "border-primary bg-primary/5",
										)}
									>
										<RadioGroupItem
											value={rate.id}
											id={`rate-${rate.id}`}
											className="shrink-0"
										/>
										<LenderLogo lenderId={rate.lenderId} size={32} />
										<div className="flex-1 min-w-0">
											<span className="font-medium text-sm truncate block">
												{rate.name}
											</span>
											<p className="text-xs text-muted-foreground truncate">
												{lender?.name ?? rate.lenderId} · LTV {rate.minLtv}-
												{rate.maxLtv}%
											</p>
										</div>
										<div className="text-right shrink-0">
											<span className="font-semibold text-primary text-sm">
												{rate.rate.toFixed(2)}%
											</span>
											<p className="text-xs text-muted-foreground">
												{formatFixedTerm(rate)}
											</p>
										</div>
									</label>
								))}
							</RadioGroup>
							{showViewAllRates && (
								<div className="flex justify-end mt-2">
									<a
										href="/rates"
										target="_blank"
										rel="noopener noreferrer"
										className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
										onClick={() => {
											const mode = isRemortgage
												? "remortgage"
												: "first-mortgage";
											saveRatesForm({
												mode,
												propertyValue: propertyValue ?? "",
												mortgageAmount: mortgageAmount ?? "",
												monthlyRepayment: "",
												mortgageTerm: mortgageTerm ?? "300",
												berRating: berRating ?? "C1",
												buyerType: buyerType ?? "ftb",
												currentLender:
													currentLender ?? (isRemortgage ? "other" : ""),
											});
										}}
									>
										View All Rates
										<ExternalLink className="h-3 w-3" />
									</a>
								</div>
							)}
						</>
					)}
				</div>
			)}
		</div>
	);
}
