import { format, formatDistanceToNow } from "date-fns";
import {
	AlertCircle,
	Clock,
	ExternalLink,
	HelpCircle,
	Info,
	TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import type { Lender } from "@/lib/schemas";
import {
	calculateStampDuty,
	ESTIMATED_LEGAL_FEES,
	formatCurrency,
	formatCurrencyInput,
} from "@/lib/utils";
import { LenderLogo } from "../LenderLogo";
import { BerSelector } from "../selectors/BerSelector";
import { BuyerTypeSelector } from "../selectors/BuyerTypeSelector";
import { MortgageTermSelector } from "../selectors/MortgageTermSelector";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "../ui/tooltip";

export type RatesMode = "first-mortgage" | "remortgage";

export interface RatesInputValues {
	mode: RatesMode;
	propertyValue: string;
	mortgageAmount: string;
	monthlyRepayment: string;
	mortgageTerm: string;
	berRating: string;
	buyerType: string;
	currentLender: string;
}

interface RatesMetadata {
	lenderId: string;
	lastScrapedAt: string;
	lastUpdatedAt: string;
}

export interface RatesInputProps {
	values: RatesInputValues;
	onChange: (values: RatesInputValues) => void;
	lenders: Lender[];
	ratesMetadata: RatesMetadata[];
	// Computed values passed from parent
	deposit: number;
	ltv: number;
	isFormValid: boolean;
	hasError: boolean;
	hasWarning: boolean;
	errorMessage?: string;
	warningMessage?: string;
}

type LtvRange = "below-50" | "50-80" | "80-90" | "above-90";

function getLtvRange(ltv: number): LtvRange {
	if (ltv < 50) return "below-50";
	if (ltv < 80) return "50-80";
	if (ltv <= 90) return "80-90";
	return "above-90";
}

function formatDublinTime(isoString: string): string {
	return format(new Date(isoString), "d MMM yyyy, HH:mm");
}

function formatRelativeTime(isoString: string): string {
	return formatDistanceToNow(new Date(isoString), { addSuffix: true });
}

export function RatesInput({
	values,
	onChange,
	lenders,
	ratesMetadata,
	deposit,
	ltv,
	isFormValid,
	hasError,
	hasWarning,
	errorMessage,
	warningMessage,
}: RatesInputProps) {
	const [isMetadataOpen, setIsMetadataOpen] = useState(false);

	const {
		mode,
		propertyValue,
		mortgageAmount,
		monthlyRepayment,
		mortgageTerm,
		berRating,
		buyerType,
		currentLender,
	} = values;

	const isRemortgage = mode === "remortgage";
	const ltvRange = getLtvRange(ltv);
	const property = Number(propertyValue) || 0;
	const stampDuty = calculateStampDuty(property);
	const legalFees = ESTIMATED_LEGAL_FEES;

	// Create a map of lender metadata for easy lookup
	const metadataByLender = new Map(ratesMetadata.map((m) => [m.lenderId, m]));

	const updateField = <K extends keyof RatesInputValues>(
		field: K,
		value: RatesInputValues[K],
	) => {
		onChange({ ...values, [field]: value });
	};

	return (
		<TooltipProvider>
			<div className="flex items-center justify-between mb-3">
				<Tabs
					value={mode}
					onValueChange={(value) => updateField("mode", value as RatesMode)}
				>
					<TabsList>
						<TabsTrigger value="first-mortgage">First Mortgage</TabsTrigger>
						<TabsTrigger value="remortgage">Mortgage Switch</TabsTrigger>
					</TabsList>
				</Tabs>

				<Dialog open={isMetadataOpen} onOpenChange={setIsMetadataOpen}>
					<DialogTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							className="text-muted-foreground hover:text-foreground gap-1.5"
						>
							<Clock className="h-4 w-4" />
							<span className="hidden sm:inline">Rate Updates</span>
						</Button>
					</DialogTrigger>
					<DialogContent className="sm:max-w-2xl">
						<DialogHeader>
							<DialogTitle>Rate Update Information</DialogTitle>
						</DialogHeader>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b text-muted-foreground">
										<th className="text-left py-2 font-medium">Lender</th>
										<th className="text-left py-2 font-medium">Last Checked</th>
										<th className="text-left py-2 font-medium">
											Rates Updated
										</th>
										<th className="text-center py-2 font-medium">View Rates</th>
									</tr>
								</thead>
								<tbody>
									{lenders.map((lender) => {
										const metadata = metadataByLender.get(lender.id);
										if (!metadata) return null;

										return (
											<tr key={lender.id} className="border-b last:border-0">
												<td className="py-2">
													<a
														href={lender.mortgagesUrl}
														target="_blank"
														rel="noopener noreferrer"
														className="flex items-center gap-2 hover:text-primary transition-colors"
													>
														<LenderLogo lenderId={lender.id} size={24} />
														<span className="font-medium">{lender.name}</span>
													</a>
												</td>
												<td className="py-2 text-muted-foreground">
													<Tooltip>
														<TooltipTrigger className="cursor-default">
															{formatRelativeTime(metadata.lastScrapedAt)}
														</TooltipTrigger>
														<TooltipContent>
															{formatDublinTime(metadata.lastScrapedAt)}
														</TooltipContent>
													</Tooltip>
												</td>
												<td className="py-2 text-muted-foreground">
													<Tooltip>
														<TooltipTrigger className="cursor-default">
															{formatRelativeTime(metadata.lastUpdatedAt)}
														</TooltipTrigger>
														<TooltipContent>
															{formatDublinTime(metadata.lastUpdatedAt)}
														</TooltipContent>
													</Tooltip>
												</td>
												<td className="py-2">
													<div className="flex justify-center">
														{lender.ratesUrl && (
															<Tooltip>
																<TooltipTrigger asChild>
																	<a
																		href={lender.ratesUrl}
																		target="_blank"
																		rel="noopener noreferrer"
																		className="text-muted-foreground hover:text-primary transition-colors"
																	>
																		<ExternalLink className="h-4 w-4" />
																	</a>
																</TooltipTrigger>
																<TooltipContent>
																	View rates on website
																</TooltipContent>
															</Tooltip>
														)}
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</DialogContent>
				</Dialog>
			</div>
			<Card>
				<CardContent className="py-2">
					<div className="flex flex-col gap-3">
						{/* Row 1: Property Value, Mortgage Amount / Outstanding Balance */}
						<div className="flex flex-col lg:flex-row gap-3">
							<div className="flex gap-3 flex-1">
								<div className="space-y-1 flex-1">
									<Label htmlFor="propertyValue" className="text-xs">
										{isRemortgage ? "Current Property Value" : "Property Value"}
									</Label>
									<Input
										id="propertyValue"
										type="text"
										inputMode="numeric"
										placeholder="€350,000"
										className="h-9"
										value={formatCurrencyInput(propertyValue)}
										onChange={(e) =>
											updateField(
												"propertyValue",
												e.target.value.replace(/[^0-9]/g, ""),
											)
										}
									/>
								</div>
								<div className="space-y-1 flex-1">
									<Label htmlFor="mortgageAmount" className="text-xs">
										{isRemortgage ? "Outstanding Balance" : "Mortgage Amount"}
									</Label>
									<Input
										id="mortgageAmount"
										type="text"
										inputMode="numeric"
										placeholder="€315,000"
										className="h-9"
										value={formatCurrencyInput(mortgageAmount)}
										onChange={(e) =>
											updateField(
												"mortgageAmount",
												e.target.value.replace(/[^0-9]/g, ""),
											)
										}
									/>
									<div className="flex gap-1 pt-0.5">
										{(isRemortgage
											? [25, 50, 60, 70, 80]
											: [50, 70, 80, 90]
										).map((pct) => (
											<Button
												key={pct}
												type="button"
												variant="ghost"
												disabled={property === 0}
												onClick={() =>
													updateField(
														"mortgageAmount",
														String(Math.round(property * (pct / 100))),
													)
												}
												className="h-5 px-1.5 text-[10px] text-muted-foreground"
											>
												{pct}%
											</Button>
										))}
									</div>
								</div>
							</div>
							{/* Mobile Row 2: Deposit/Monthly Repayment, LTV - shown inline on lg */}
							<div className="flex gap-3 flex-1">
								{isRemortgage ? (
									<div className="space-y-1 flex-2">
										<Label htmlFor="monthlyRepayment" className="text-xs">
											Current Monthly Repayment
										</Label>
										<Input
											id="monthlyRepayment"
											type="text"
											inputMode="numeric"
											placeholder="€1,500"
											className="h-9"
											value={formatCurrencyInput(monthlyRepayment)}
											onChange={(e) =>
												updateField(
													"monthlyRepayment",
													e.target.value.replace(/[^0-9]/g, ""),
												)
											}
										/>
									</div>
								) : (
									<div className="space-y-1 flex-2">
										<div className="flex items-center gap-1">
											<Label htmlFor="deposit" className="text-xs">
												Deposit
											</Label>
											<Tooltip>
												<TooltipTrigger asChild>
													<button
														type="button"
														className="text-muted-foreground hover:text-foreground"
													>
														<HelpCircle className="h-3 w-3" />
													</button>
												</TooltipTrigger>
												<TooltipContent className="max-w-xs">
													<p className="font-medium mb-2">Additional costs:</p>
													<div className="space-y-1 text-sm">
														<div className="flex justify-between gap-4">
															<span>Stamp Duty:</span>
															<span className="font-medium">
																{formatCurrency(stampDuty)}
															</span>
														</div>
														<div className="flex justify-between gap-4">
															<span>Legal Fees:</span>
															<span className="font-medium">
																{formatCurrency(legalFees)}
															</span>
														</div>
														<div className="flex justify-between gap-4 pt-1 border-t">
															<span>Total Fees:</span>
															<span className="font-medium">
																{formatCurrency(stampDuty + legalFees)}
															</span>
														</div>
													</div>
													{deposit > 0 && (
														<div className="mt-2 pt-2 border-t text-sm">
															<div className="flex justify-between gap-4">
																<span>Total Cash Required:</span>
																<span className="font-medium">
																	{formatCurrency(
																		deposit + stampDuty + legalFees,
																	)}
																</span>
															</div>
														</div>
													)}
												</TooltipContent>
											</Tooltip>
										</div>
										<Input
											id="deposit"
											type="text"
											className="h-9 bg-muted"
											value={deposit > 0 ? formatCurrency(deposit) : "—"}
											disabled
										/>
									</div>
								)}
								<div className="space-y-1 flex-1">
									<Label htmlFor="ltvRange" className="text-xs">
										LTV
									</Label>
									<Input
										id="ltvRange"
										type="text"
										className={`h-9 bg-muted ${ltvRange === "above-90" ? "text-destructive" : ""}`}
										value={property > 0 ? `${ltv.toFixed(0)}%` : "—"}
										disabled
									/>
								</div>
							</div>
						</div>

						{/* Mobile Row 3: Buyer Type / Remortgage Type */}
						<div className="lg:hidden">
							{isRemortgage ? (
								<div className="space-y-1">
									<Label htmlFor="buyerTypeMobile" className="text-xs">
										Remortgage Type
									</Label>
									<BuyerTypeSelector
										value={buyerType}
										onChange={(v) => updateField("buyerType", v)}
										id="buyerTypeMobile"
										compact
										variant="remortgage"
									/>
								</div>
							) : (
								<div className="space-y-1">
									<Label htmlFor="buyerTypeMobile" className="text-xs">
										Buyer Type
									</Label>
									<BuyerTypeSelector
										value={buyerType}
										onChange={(v) => updateField("buyerType", v)}
										id="buyerTypeMobile"
										compact
										variant="purchase"
									/>
								</div>
							)}
						</div>

						{/* Row 2 (lg) / Row 4 (mobile): Buyer Type / Remortgage Type + Current Lender, Term, BER */}
						<div className="flex gap-3 items-end">
							{isRemortgage ? (
								<>
									<div className="hidden lg:block space-y-1 flex-1">
										<Label htmlFor="buyerType" className="text-xs">
											Remortgage Type
										</Label>
										<BuyerTypeSelector
											value={buyerType}
											onChange={(v) => updateField("buyerType", v)}
											id="buyerType"
											compact
											variant="remortgage"
										/>
									</div>
									<div className="space-y-1 flex-2 lg:flex-1">
										<Label htmlFor="currentLender" className="text-xs">
											Current Lender
										</Label>
										<Select
											value={currentLender}
											onValueChange={(v) => updateField("currentLender", v)}
										>
											<SelectTrigger id="currentLender" className="h-9 w-full">
												<SelectValue placeholder="Select lender" />
											</SelectTrigger>
											<SelectContent>
												{lenders.map((lender) => (
													<SelectItem key={lender.id} value={lender.id}>
														{lender.name}
													</SelectItem>
												))}
												<SelectItem value="other">Other</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</>
							) : (
								<div className="hidden lg:block space-y-1 flex-[1.5]">
									<Label htmlFor="buyerType" className="text-xs">
										Buyer Type
									</Label>
									<BuyerTypeSelector
										value={buyerType}
										onChange={(v) => updateField("buyerType", v)}
										id="buyerType"
										compact
										variant="purchase"
									/>
								</div>
							)}
							<div className="space-y-1 flex-1">
								<Label htmlFor="mortgageTerm" className="text-xs">
									Term
								</Label>
								<MortgageTermSelector
									value={mortgageTerm}
									onChange={(v) => updateField("mortgageTerm", v)}
									id="mortgageTerm"
									compact
								/>
							</div>
							<div className="space-y-1 flex-1">
								<Label htmlFor="berRating" className="text-xs">
									BER
								</Label>
								<BerSelector
									value={berRating}
									onChange={(v) => updateField("berRating", v)}
									id="berRating"
									compact
								/>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Status alerts below the input card */}
			{hasError && errorMessage && (
				<Card className="bg-destructive/10 border-destructive/30">
					<CardContent className="py-3 flex items-center gap-3">
						<AlertCircle className="h-5 w-5 text-destructive shrink-0" />
						<p className="text-sm text-destructive">{errorMessage}</p>
					</CardContent>
				</Card>
			)}

			{hasWarning && !hasError && warningMessage && (
				<Card className="bg-amber-500/10 border-amber-500/30">
					<CardContent className="py-3 flex items-center gap-3">
						<TriangleAlert className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0" />
						<p className="text-sm text-amber-600 dark:text-amber-500">
							{warningMessage}
						</p>
					</CardContent>
				</Card>
			)}

			{!isFormValid && !hasError && !hasWarning && (
				<Card className="bg-blue-500/10 border-blue-500/30">
					<CardContent className="py-3 flex items-center gap-3">
						<Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
						<p className="text-sm text-blue-600 dark:text-blue-400">
							Enter your property details above to compare mortgage rates from
							Irish lenders.
						</p>
					</CardContent>
				</Card>
			)}
		</TooltipProvider>
	);
}
