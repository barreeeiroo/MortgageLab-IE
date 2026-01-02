import { CircleHelp, Pencil, Plus, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LenderLogo } from "@/components/LenderLogo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { GLOSSARY_TERMS_MAP } from "@/lib/constants";
import type { Lender, MortgageRate } from "@/lib/data";
import type { BuyerType } from "@/lib/schemas/buyer";
import { DEFAULT_APRC_FEES } from "@/lib/schemas/lender";
import { RATE_TYPES } from "@/lib/schemas/rate";
import type { StoredCustomRate } from "./customRates";

interface CustomLenderInfo {
	id: string;
	name: string;
}

interface AddCustomRateDialogProps {
	lenders: Lender[];
	customLenders: CustomLenderInfo[];
	currentBuyerType: BuyerType;
	onAddRate: (rate: StoredCustomRate) => void;
}

// First Mortgage buyer types
const FIRST_MORTGAGE_TYPES = ["ftb", "mover", "btl"] as const;
// Remortgage (Switcher) buyer types
const SWITCHER_TYPES = ["switcher-pdh", "switcher-btl"] as const;

// BER rating groups
const BER_GROUPS = {
	A: ["A1", "A2", "A3"],
	B: ["B1", "B2", "B3"],
	C: ["C1", "C2", "C3"],
	D: ["D1", "D2"],
	E: ["E1", "E2"],
	F: ["F"],
	G: ["G"],
	Exempt: ["Exempt"],
} as const;

const GREEN_BER_GROUPS = ["A", "B"] as const;
const OTHER_BER_GROUPS = ["C", "D", "E", "F", "G", "Exempt"] as const;

const BUYER_TYPE_LABELS: Record<string, string> = {
	ftb: "First Time Buyer",
	mover: "Mover",
	btl: "Buy to Let",
	"switcher-pdh": "Switcher (Home)",
	"switcher-btl": "Switcher (BTL)",
};

const CUSTOM_LENDER_VALUE = "__custom__";

interface FormState {
	lenderId: string;
	customLenderName: string;
	name: string;
	type: "fixed" | "variable";
	rate: string;
	fixedTerm: string;
	ltvRange: [number, number];
	buyerTypes: string[];
	berEligible: string[];
	allBerEligible: boolean;
	valuationFee: string;
	securityReleaseFee: string;
}

function getDefaultBuyerTypes(buyerType: BuyerType): string[] {
	// Pre-select based on current viewing mode
	if (buyerType === "ftb" || buyerType === "mover") {
		return ["ftb", "mover"];
	}
	if (buyerType === "btl") {
		return ["btl"];
	}
	if (buyerType === "switcher-pdh") {
		return ["switcher-pdh"];
	}
	if (buyerType === "switcher-btl") {
		return ["switcher-btl"];
	}
	return ["ftb", "mover"];
}

function createInitialFormState(buyerType: BuyerType): FormState {
	return {
		lenderId: "",
		customLenderName: "",
		name: "",
		type: "fixed",
		rate: "",
		fixedTerm: "3",
		ltvRange: [0, 90],
		buyerTypes: getDefaultBuyerTypes(buyerType),
		berEligible: [],
		allBerEligible: true,
		valuationFee: "",
		securityReleaseFee: "",
	};
}

export function AddCustomRateDialog({
	lenders,
	customLenders,
	currentBuyerType,
	onAddRate,
}: AddCustomRateDialogProps) {
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState<FormState>(() =>
		createInitialFormState(currentBuyerType),
	);

	// Reset form when dialog opens with current buyer type
	useEffect(() => {
		if (open) {
			setForm(createInitialFormState(currentBuyerType));
		}
	}, [open, currentBuyerType]);

	const isCustomLender = form.lenderId === CUSTOM_LENDER_VALUE;

	// Update fees when lender changes
	useEffect(() => {
		if (!form.lenderId || isCustomLender) {
			// Clear fees for custom lender - user must enter manually
			setForm((prev) => ({
				...prev,
				valuationFee: "",
				securityReleaseFee: "",
			}));
			return;
		}

		const lender = lenders.find((l) => l.id === form.lenderId);
		if (lender?.aprcFees) {
			setForm((prev) => ({
				...prev,
				valuationFee: lender.aprcFees?.valuationFee.toString() ?? "",
				securityReleaseFee:
					lender.aprcFees?.securityReleaseFee.toString() ?? "",
			}));
		} else {
			// Lender without known fees - clear to show placeholders
			setForm((prev) => ({
				...prev,
				valuationFee: "",
				securityReleaseFee: "",
			}));
		}
	}, [form.lenderId, isCustomLender, lenders]);

	const effectiveLenderId = useMemo(() => {
		if (isCustomLender) {
			// Generate a slug from custom lender name
			return (
				form.customLenderName
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, "-")
					.replace(/^-|-$/g, "") || "custom"
			);
		}
		return form.lenderId;
	}, [isCustomLender, form.lenderId, form.customLenderName]);

	const isFormValid = useMemo(() => {
		if (!form.lenderId) return false;
		if (isCustomLender && !form.customLenderName.trim()) return false;
		if (!form.name.trim()) return false;
		if (!form.rate || Number.isNaN(Number(form.rate)) || Number(form.rate) <= 0)
			return false;
		if (
			form.type === "fixed" &&
			(!form.fixedTerm || Number(form.fixedTerm) <= 0)
		)
			return false;
		if (form.buyerTypes.length === 0) return false;
		const [minLtv, maxLtv] = form.ltvRange;
		if (minLtv < 0 || minLtv > 100 || maxLtv < 0 || maxLtv > 100) return false;
		if (minLtv > maxLtv) return false;
		// Require both APRC fees
		if (
			!form.valuationFee ||
			Number.isNaN(Number(form.valuationFee)) ||
			Number(form.valuationFee) < 0
		)
			return false;
		if (
			!form.securityReleaseFee ||
			Number.isNaN(Number(form.securityReleaseFee)) ||
			Number(form.securityReleaseFee) < 0
		)
			return false;
		return true;
	}, [form, isCustomLender]);

	const handleSubmit = useCallback(() => {
		if (!isFormValid) return;

		const aprcFees = {
			valuationFee: Number(form.valuationFee),
			securityReleaseFee: Number(form.securityReleaseFee),
		};

		const customRate: StoredCustomRate = {
			id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
			name: form.name.trim(),
			lenderId: effectiveLenderId,
			type: form.type,
			rate: Number(form.rate),
			fixedTerm: form.type === "fixed" ? Number(form.fixedTerm) : undefined,
			minLtv: form.ltvRange[0],
			maxLtv: form.ltvRange[1],
			buyerTypes: form.buyerTypes as MortgageRate["buyerTypes"],
			berEligible: form.allBerEligible
				? undefined
				: (form.berEligible as MortgageRate["berEligible"]),
			perks: [],
			customLenderName: isCustomLender
				? form.customLenderName.trim()
				: undefined,
			aprcFees,
		};

		onAddRate(customRate);
		setForm(createInitialFormState(currentBuyerType));
		setOpen(false);
	}, [
		form,
		isFormValid,
		effectiveLenderId,
		isCustomLender,
		currentBuyerType,
		onAddRate,
	]);

	const updateForm = useCallback(
		<K extends keyof FormState>(key: K, value: FormState[K]) => {
			setForm((prev) => ({ ...prev, [key]: value }));
		},
		[],
	);

	const toggleBuyerType = useCallback((type: string) => {
		setForm((prev) => ({
			...prev,
			buyerTypes: prev.buyerTypes.includes(type)
				? prev.buyerTypes.filter((t) => t !== type)
				: [...prev.buyerTypes, type],
		}));
	}, []);

	const toggleBerGroup = useCallback((group: keyof typeof BER_GROUPS) => {
		const groupRatings = BER_GROUPS[group];
		setForm((prev) => {
			const allSelected = groupRatings.every((r) =>
				prev.berEligible.includes(r),
			);
			if (allSelected) {
				// Remove all ratings in this group
				return {
					...prev,
					berEligible: prev.berEligible.filter(
						(r) => !groupRatings.includes(r as (typeof groupRatings)[number]),
					),
				};
			}
			// Add all ratings in this group
			return {
				...prev,
				berEligible: [...new Set([...prev.berEligible, ...groupRatings])],
			};
		});
	}, []);

	const isGroupSelected = useCallback(
		(group: keyof typeof BER_GROUPS) => {
			const groupRatings = BER_GROUPS[group];
			return groupRatings.every((r) => form.berEligible.includes(r));
		},
		[form.berEligible],
	);

	const isGroupPartiallySelected = useCallback(
		(group: keyof typeof BER_GROUPS) => {
			const groupRatings = BER_GROUPS[group];
			const selected = groupRatings.filter((r) => form.berEligible.includes(r));
			return selected.length > 0 && selected.length < groupRatings.length;
		},
		[form.berEligible],
	);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" className="h-8 gap-1.5">
					<Plus className="h-4 w-4" />
					<span className="hidden sm:inline">Add</span> Custom Rate
				</Button>
			</DialogTrigger>
			<DialogContent
				className="sm:max-w-xl max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden p-0"
				showCloseButton={false}
			>
				{/* Sticky Header */}
				<div className="sticky top-0 bg-background z-10 px-6 pt-6 pb-4 border-b">
					<DialogHeader>
						<div className="flex items-start justify-between gap-3">
							<div className="flex items-center gap-3">
								<LenderLogo
									lenderId={
										isCustomLender ? "custom" : effectiveLenderId || "custom"
									}
									size={40}
									isCustom
								/>
								<div>
									<DialogTitle>Add Custom Rate</DialogTitle>
									<DialogDescription>
										Create a custom rate to compare against lender rates.
									</DialogDescription>
								</div>
							</div>
							<DialogClose className="cursor-pointer rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
								<X className="h-4 w-4" />
								<span className="sr-only">Close</span>
							</DialogClose>
						</div>
					</DialogHeader>
				</div>

				{/* Scrollable Content */}
				<div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
					<div className="space-y-6">
						{/* Lender Selection */}
						<div className="space-y-3">
							<Label className="text-sm font-semibold text-muted-foreground">
								Lender
							</Label>
							<Select
								value={form.lenderId}
								onValueChange={(value) => updateForm("lenderId", value)}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select a lender..." />
								</SelectTrigger>
								<SelectContent>
									{lenders.map((lender) => (
										<SelectItem key={lender.id} value={lender.id}>
											<div className="flex items-center gap-2">
												<LenderLogo lenderId={lender.id} size={20} />
												<span>{lender.name}</span>
											</div>
										</SelectItem>
									))}
									{customLenders.length > 0 && (
										<>
											<SelectSeparator />
											{customLenders.map((customLender) => (
												<SelectItem
													key={customLender.id}
													value={customLender.id}
												>
													<div className="flex items-center gap-2">
														<LenderLogo
															lenderId={customLender.id}
															size={20}
															isCustom
														/>
														<span>{customLender.name}</span>
													</div>
												</SelectItem>
											))}
										</>
									)}
									<SelectSeparator />
									<SelectItem value={CUSTOM_LENDER_VALUE}>
										<div className="flex items-center gap-2">
											<Pencil className="h-4 w-4 text-muted-foreground" />
											<span>New custom lender...</span>
										</div>
									</SelectItem>
								</SelectContent>
							</Select>

							{isCustomLender && (
								<Input
									placeholder="Enter custom lender name"
									value={form.customLenderName}
									onChange={(e) =>
										updateForm("customLenderName", e.target.value)
									}
								/>
							)}
						</div>

						{/* Rate Name */}
						<div className="space-y-2">
							<Label htmlFor="rate-name">Rate Name</Label>
							<Input
								id="rate-name"
								placeholder="e.g., Green Fixed 3 Year"
								value={form.name}
								onChange={(e) => updateForm("name", e.target.value)}
							/>
						</div>

						{/* Rate Type and Term */}
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Rate Type</Label>
								<Select
									value={form.type}
									onValueChange={(value: "fixed" | "variable") =>
										updateForm("type", value)
									}
								>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{RATE_TYPES.map((type) => (
											<SelectItem key={type} value={type}>
												{type.charAt(0).toUpperCase() + type.slice(1)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{form.type === "fixed" && (
								<div className="space-y-2">
									<Label htmlFor="fixed-term">Fixed Term (years)</Label>
									<Input
										id="fixed-term"
										type="number"
										min="1"
										max="10"
										value={form.fixedTerm}
										onChange={(e) => updateForm("fixedTerm", e.target.value)}
									/>
								</div>
							)}
						</div>

						{/* Interest Rate and APRC Fees */}
						<div className="space-y-3">
							<p className="text-sm font-semibold text-muted-foreground">
								Interest Rate & APRC Fees
							</p>
							<div className="grid grid-cols-3 gap-4">
								<div className="space-y-2">
									<Label htmlFor="rate">Interest Rate</Label>
									<div className="relative">
										<Input
											id="rate"
											type="number"
											step="0.01"
											min="0"
											placeholder="3.45"
											value={form.rate}
											onChange={(e) => updateForm("rate", e.target.value)}
											className="pr-7"
										/>
										<span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
											%
										</span>
									</div>
								</div>
								<div className="space-y-2">
									<Label
										htmlFor="valuation-fee"
										className="flex items-center gap-1"
									>
										Valuation Fee
										<Tooltip>
											<TooltipTrigger asChild>
												<CircleHelp className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
											</TooltipTrigger>
											<TooltipContent side="top" className="max-w-xs">
												<p className="text-xs">
													{GLOSSARY_TERMS_MAP.valuationFee?.shortDescription}
												</p>
											</TooltipContent>
										</Tooltip>
									</Label>
									<div className="relative">
										<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
											€
										</span>
										<Input
											id="valuation-fee"
											type="number"
											step="1"
											min="0"
											placeholder={DEFAULT_APRC_FEES.valuationFee.toString()}
											value={form.valuationFee}
											onChange={(e) =>
												updateForm("valuationFee", e.target.value)
											}
											className="pl-7"
										/>
									</div>
								</div>
								<div className="space-y-2">
									<Label
										htmlFor="security-fee"
										className="flex items-center gap-1"
									>
										Release Fee
										<Tooltip>
											<TooltipTrigger asChild>
												<CircleHelp className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
											</TooltipTrigger>
											<TooltipContent side="top" className="max-w-xs">
												<p className="text-xs">
													{
														GLOSSARY_TERMS_MAP.securityReleaseFee
															?.shortDescription
													}
												</p>
											</TooltipContent>
										</Tooltip>
									</Label>
									<div className="relative">
										<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
											€
										</span>
										<Input
											id="security-fee"
											type="number"
											step="1"
											min="0"
											placeholder={DEFAULT_APRC_FEES.securityReleaseFee.toString()}
											value={form.securityReleaseFee}
											onChange={(e) =>
												updateForm("securityReleaseFee", e.target.value)
											}
											className="pl-7"
										/>
									</div>
								</div>
							</div>
						</div>

						{/* LTV Range */}
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<Label>LTV Range</Label>
								<span className="text-sm text-muted-foreground">
									{form.ltvRange[0]}% – {form.ltvRange[1]}%
								</span>
							</div>
							<Slider
								value={form.ltvRange}
								onValueChange={(value) =>
									updateForm("ltvRange", value as [number, number])
								}
								min={0}
								max={90}
								step={5}
								className="w-full"
							/>
							<div className="flex justify-between text-xs text-muted-foreground px-1">
								{[0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map((val) => (
									<span key={val} className="w-4 text-center">
										{val}
									</span>
								))}
							</div>
						</div>

						{/* Buyer Types */}
						<div className="space-y-4">
							<p className="text-sm font-semibold text-muted-foreground">
								Buyer Types
							</p>

							{/* First Mortgage */}
							<div className="space-y-2">
								<p className="text-xs text-muted-foreground">First Mortgage</p>
								<div className="flex flex-wrap gap-3">
									{FIRST_MORTGAGE_TYPES.map((type) => {
										const id = `buyer-type-${type}`;
										return (
											<div key={type} className="flex items-center gap-2">
												<Checkbox
													id={id}
													checked={form.buyerTypes.includes(type)}
													onCheckedChange={() => toggleBuyerType(type)}
												/>
												<label htmlFor={id} className="text-sm cursor-pointer">
													{BUYER_TYPE_LABELS[type]}
												</label>
											</div>
										);
									})}
								</div>
							</div>

							{/* Switcher */}
							<div className="space-y-2">
								<p className="text-xs text-muted-foreground">Switcher</p>
								<div className="flex flex-wrap gap-3">
									{SWITCHER_TYPES.map((type) => {
										const id = `buyer-type-${type}`;
										return (
											<div key={type} className="flex items-center gap-2">
												<Checkbox
													id={id}
													checked={form.buyerTypes.includes(type)}
													onCheckedChange={() => toggleBuyerType(type)}
												/>
												<label htmlFor={id} className="text-sm cursor-pointer">
													{BUYER_TYPE_LABELS[type]}
												</label>
											</div>
										);
									})}
								</div>
							</div>
						</div>

						{/* BER Eligibility */}
						<div className="space-y-4">
							<p className="text-sm font-semibold text-muted-foreground">
								BER Eligibility
							</p>
							<div className="flex items-center gap-2">
								<Checkbox
									id="all-ber-eligible"
									checked={form.allBerEligible}
									onCheckedChange={(checked) =>
										updateForm("allBerEligible", !!checked)
									}
								/>
								<label
									htmlFor="all-ber-eligible"
									className="text-sm cursor-pointer"
								>
									All BER ratings eligible
								</label>
							</div>
							{!form.allBerEligible && (
								<div className="space-y-3 pt-2">
									{/* Green BER (A & B) */}
									<div className="space-y-2">
										<p className="text-xs text-muted-foreground">
											Green (A & B)
										</p>
										<div className="flex gap-4">
											{GREEN_BER_GROUPS.map((group) => (
												<div key={group} className="flex items-center gap-2">
													<Checkbox
														id={`ber-group-${group}`}
														checked={isGroupSelected(group)}
														onCheckedChange={() => toggleBerGroup(group)}
														className={
															isGroupPartiallySelected(group)
																? "data-[state=unchecked]:bg-primary/30"
																: ""
														}
													/>
													<label
														htmlFor={`ber-group-${group}`}
														className="text-sm cursor-pointer font-medium"
													>
														{group}
													</label>
												</div>
											))}
										</div>
									</div>

									{/* Other BER ratings */}
									<div className="space-y-2">
										<p className="text-xs text-muted-foreground">Other</p>
										<div className="flex flex-wrap gap-4">
											{OTHER_BER_GROUPS.map((group) => (
												<div key={group} className="flex items-center gap-2">
													<Checkbox
														id={`ber-group-${group}`}
														checked={isGroupSelected(group)}
														onCheckedChange={() => toggleBerGroup(group)}
														className={
															isGroupPartiallySelected(group)
																? "data-[state=unchecked]:bg-primary/30"
																: ""
														}
													/>
													<label
														htmlFor={`ber-group-${group}`}
														className="text-sm cursor-pointer font-medium"
													>
														{group}
													</label>
												</div>
											))}
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Sticky Footer */}
				<div className="sticky bottom-0 bg-background z-10 px-6 py-4 border-t flex items-center justify-between">
					<p className="text-xs text-muted-foreground">
						Custom rates are stored locally in your browser.
					</p>
					<Button
						onClick={handleSubmit}
						disabled={!isFormValid}
						className="gap-1.5"
					>
						<Plus className="h-4 w-4" />
						Create Rate
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
