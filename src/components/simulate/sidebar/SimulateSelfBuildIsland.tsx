import { useStore } from "@nanostores/react";
import { Banknote, Building2, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ResolvedDrawdownStage } from "@/lib/mortgage/self-build";
import type {
	ConstructionRepaymentType,
	DrawdownStage,
} from "@/lib/schemas/simulate";
import {
	$canEnableSelfBuild,
	$constructionEndMonth,
	$drawdownValidation,
	$nonSelfBuildLenders,
	$resolvedDrawdownStages,
} from "@/lib/stores/simulate/simulate-calculations";
import {
	$hasRequiredData,
	$selfBuildConfig,
	$simulationState,
	addDrawdownStage,
	disableSelfBuild,
	enableSelfBuild,
	removeDrawdownStage,
	setConstructionRepaymentType,
	setDrawdownStages,
	setInterestOnlyMonths,
	updateDrawdownStage,
} from "@/lib/stores/simulate/simulate-state";
import { formatCurrency } from "@/lib/utils/currency";
import {
	formatIncrementalPeriod,
	formatTransitionDate,
} from "@/lib/utils/date";
import { SimulateAddDrawdownDialog } from "./SimulateAddDrawdownDialog";
import { SimulateCopyTemplateDialog } from "./SimulateCopyTemplateDialog";
import { SimulateEditDrawdownDialog } from "./SimulateEditDrawdownDialog";

export function SimulateSelfBuildIsland() {
	const simulationState = useStore($simulationState);
	const hasRequiredData = useStore($hasRequiredData);
	const selfBuildConfig = useStore($selfBuildConfig);
	const canEnableSelfBuild = useStore($canEnableSelfBuild);
	const nonSelfBuildLenders = useStore($nonSelfBuildLenders);
	const resolvedDrawdownStages = useStore($resolvedDrawdownStages);
	const drawdownValidation = useStore($drawdownValidation);
	const constructionEndMonth = useStore($constructionEndMonth);

	const [showAddDrawdown, setShowAddDrawdown] = useState(false);
	const [showCopyTemplate, setShowCopyTemplate] = useState(false);
	const [editingDrawdown, setEditingDrawdown] =
		useState<ResolvedDrawdownStage | null>(null);
	const [deletingDrawdown, setDeletingDrawdown] = useState<string | null>(null);
	const [showDisableConfirmation, setShowDisableConfirmation] = useState(false);

	const isEnabled = selfBuildConfig?.enabled ?? false;
	const hasStages = resolvedDrawdownStages.length > 0;

	const handleToggle = (checked: boolean) => {
		if (checked) {
			enableSelfBuild();
		} else if (hasStages) {
			// Show confirmation if there are stages configured
			setShowDisableConfirmation(true);
		} else {
			disableSelfBuild();
		}
	};

	// Calculate years and months from total interestOnlyMonths
	const interestOnlyYears = Math.floor(
		(selfBuildConfig?.interestOnlyMonths ?? 0) / 12,
	);
	const interestOnlyRemainingMonths =
		(selfBuildConfig?.interestOnlyMonths ?? 0) % 12;

	const handleInterestOnlyYearsChange = (value: string) => {
		const years = Number.parseInt(value, 10);
		if (!Number.isNaN(years)) {
			// If max years (5) selected, reset months to 0
			const months = years === 5 ? 0 : interestOnlyRemainingMonths;
			setInterestOnlyMonths(years * 12 + months);
		}
	};

	const handleInterestOnlyMonthsChange = (value: string) => {
		const months = Number.parseInt(value, 10);
		if (!Number.isNaN(months)) {
			setInterestOnlyMonths(interestOnlyYears * 12 + months);
		}
	};

	const handleApplyTemplate = (
		stages: { month: number; amount: number; label: string }[],
	) => {
		const drawdownStages: DrawdownStage[] = stages.map((stage) => ({
			id: crypto.randomUUID(),
			month: stage.month,
			amount: stage.amount,
			label: stage.label,
		}));
		setDrawdownStages(drawdownStages);
	};

	if (!hasRequiredData) {
		return null;
	}

	return (
		<Card className="py-0 gap-0">
			<CardHeader className="py-3 px-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Building2 className="h-4 w-4 text-muted-foreground" />
						<CardTitle className="text-sm font-medium">Self-Build</CardTitle>
					</div>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div>
									<Switch
										checked={isEnabled}
										onCheckedChange={handleToggle}
										disabled={!canEnableSelfBuild && !isEnabled}
									/>
								</div>
							</TooltipTrigger>
							{!canEnableSelfBuild && !isEnabled && (
								<TooltipContent>
									<p>
										{nonSelfBuildLenders.join(", ")}{" "}
										{nonSelfBuildLenders.length === 1 ? "doesn't" : "don't"}{" "}
										offer self-build mortgages
									</p>
								</TooltipContent>
							)}
						</Tooltip>
					</TooltipProvider>
				</div>
			</CardHeader>

			{isEnabled && selfBuildConfig && (
				<CardContent className="pt-0 px-3 pb-3 space-y-6">
					{/* Drawdown Stages */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label className="text-xs text-muted-foreground">
								Drawdown Stages
							</Label>
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<span>
											<Button
												variant="ghost"
												size="sm"
												className="h-6 gap-1 text-xs px-2"
												onClick={() => setShowAddDrawdown(true)}
												disabled={drawdownValidation.isValid}
											>
												<Plus className="h-3 w-3" />
												Add
											</Button>
										</span>
									</TooltipTrigger>
									{drawdownValidation.isValid && (
										<TooltipContent>
											<p>All mortgage funds have been allocated</p>
										</TooltipContent>
									)}
								</Tooltip>
							</TooltipProvider>
						</div>

						{resolvedDrawdownStages.length === 0 ? (
							<div className="text-center py-4 space-y-2">
								<p className="text-sm text-muted-foreground">
									No drawdown stages configured.
								</p>
								<Button
									variant="outline"
									size="sm"
									className="gap-1.5"
									onClick={() => setShowCopyTemplate(true)}
								>
									<Copy className="h-3.5 w-3.5" />
									Copy from Template
								</Button>
							</div>
						) : (
							<div className="space-y-2">
								{resolvedDrawdownStages.map((stage, index) => {
									const percentOfMortgage =
										(stage.amount / simulationState.input.mortgageAmount) * 100;
									const cumulativePercent =
										(stage.cumulativeDrawn /
											simulationState.input.mortgageAmount) *
										100;

									return (
										<Popover key={stage.id}>
											<PopoverTrigger asChild>
												<button
													type="button"
													className="w-full flex items-center gap-3 p-2 rounded-lg border text-left transition-colors cursor-pointer hover:bg-muted/50"
												>
													<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
														<Banknote className="h-4 w-4 text-purple-600 dark:text-purple-400" />
													</div>
													<div className="flex-1 min-w-0">
														<div className="flex items-center gap-2">
															<span className="font-medium text-sm truncate">
																{stage.label || `Stage ${index + 1}`}
															</span>
															<span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
																{Math.round(percentOfMortgage)}%
															</span>
														</div>
														<div className="flex items-center gap-2 text-xs text-muted-foreground">
															<span>
																{formatCurrency(stage.amount / 100, {
																	showCents: false,
																})}
															</span>
															<span>•</span>
															<span>
																{formatTransitionDate(
																	simulationState.input.startDate,
																	stage.month,
																	{ short: true },
																)}
															</span>
														</div>
													</div>
												</button>
											</PopoverTrigger>
											<PopoverContent className="w-64" align="start">
												<div className="space-y-3">
													{/* Header */}
													<div className="flex items-center gap-3">
														<div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
															<Banknote className="h-5 w-5 text-purple-600 dark:text-purple-400" />
														</div>
														<div>
															<h4 className="font-medium text-sm">
																{stage.label || `Stage ${index + 1}`}
															</h4>
															<p className="text-xs text-muted-foreground">
																{formatCurrency(stage.amount / 100, {
																	showCents: false,
																})}{" "}
																•{" "}
																{formatTransitionDate(
																	simulationState.input.startDate,
																	stage.month,
																	{ short: true },
																)}
															</p>
														</div>
													</div>

													{/* Details */}
													<div className="grid grid-cols-2 gap-2 text-sm">
														<div
															className={
																simulationState.input.startDate
																	? ""
																	: "col-span-2"
															}
														>
															<span className="text-muted-foreground text-xs">
																Date
															</span>
															<p className="font-medium">
																{formatTransitionDate(
																	simulationState.input.startDate,
																	stage.month,
																	{ short: true },
																)}
															</p>
														</div>
														{simulationState.input.startDate && (
															<div>
																<span className="text-muted-foreground text-xs">
																	Since Start
																</span>
																<p className="font-medium">
																	{formatIncrementalPeriod(stage.month)}
																</p>
															</div>
														)}
														<div>
															<span className="text-muted-foreground text-xs">
																Drawn
															</span>
															<p className="font-medium">
																{formatCurrency(stage.amount / 100, {
																	showCents: false,
																})}
															</p>
														</div>
														<div>
															<span className="text-muted-foreground text-xs">
																% of Mortgage
															</span>
															<p className="font-medium">
																{percentOfMortgage.toFixed(1)}%
															</p>
														</div>
														<div>
															<span className="text-muted-foreground text-xs">
																Cumulative
															</span>
															<p className="font-medium">
																{formatCurrency(stage.cumulativeDrawn / 100, {
																	showCents: false,
																})}
															</p>
														</div>
														<div>
															<span className="text-muted-foreground text-xs">
																Cumulative %
															</span>
															<p className="font-medium">
																{cumulativePercent.toFixed(1)}%
															</p>
														</div>
													</div>

													{/* Actions */}
													<div className="flex gap-2 pt-2 border-t">
														<Button
															variant="outline"
															size="sm"
															className="flex-1"
															onClick={() => setEditingDrawdown(stage)}
														>
															<Pencil className="h-3.5 w-3.5 mr-1.5" />
															Edit
														</Button>
														<Button
															variant="outline"
															size="sm"
															className="text-destructive hover:text-destructive hover:bg-destructive/10"
															onClick={() => setDeletingDrawdown(stage.id)}
														>
															<Trash2 className="h-3.5 w-3.5" />
														</Button>
													</div>
												</div>
											</PopoverContent>
										</Popover>
									);
								})}
							</div>
						)}

						{/* Validation Warning */}
						{!drawdownValidation.isValid && (
							<Alert variant="destructive" className="py-2">
								<AlertDescription className="text-xs">
									{drawdownValidation.difference > 0
										? `${formatCurrency(drawdownValidation.difference / 100, { showCents: false })} remaining to allocate`
										: `Exceeds approved amount by ${formatCurrency(Math.abs(drawdownValidation.difference) / 100, { showCents: false })}`}
								</AlertDescription>
							</Alert>
						)}

						{/* Construction ends info */}
						{constructionEndMonth > 0 && (
							<div className="text-xs text-muted-foreground pt-1">
								Construction ends:{" "}
								{formatTransitionDate(
									simulationState.input.startDate,
									constructionEndMonth,
								)}
							</div>
						)}
					</div>

					{/* Repayment Option */}
					<div className="space-y-1">
						<Label className="text-xs text-muted-foreground">
							Repayment Option (during construction)
						</Label>
						<Select
							value={selfBuildConfig.constructionRepaymentType}
							onValueChange={(value: ConstructionRepaymentType) =>
								setConstructionRepaymentType(value)
							}
						>
							<SelectTrigger className="h-8 text-sm w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="interest_only">Interest Only</SelectItem>
								<SelectItem value="interest_and_capital">
									Interest + Capital
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Interest-Only Period - only show for interest_only mode */}
					{selfBuildConfig.constructionRepaymentType === "interest_only" && (
						<div className="space-y-1">
							<Label className="text-xs text-muted-foreground">
								Interest-Only Period (after final drawdown)
							</Label>
							<div className="grid grid-cols-2 gap-2">
								<Select
									value={String(interestOnlyYears)}
									onValueChange={handleInterestOnlyYearsChange}
								>
									<SelectTrigger className="h-8 text-sm w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{[0, 1, 2, 3, 4, 5].map((y) => (
											<SelectItem key={y} value={String(y)}>
												{y} {y === 1 ? "year" : "years"}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Select
									value={String(interestOnlyRemainingMonths)}
									onValueChange={handleInterestOnlyMonthsChange}
									disabled={interestOnlyYears === 5}
								>
									<SelectTrigger className="h-8 text-sm w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((m) => (
											<SelectItem key={m} value={String(m)}>
												{m} {m === 1 ? "month" : "months"}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							{/* Full payments start info */}
							{constructionEndMonth > 0 &&
								selfBuildConfig.interestOnlyMonths > 0 && (
									<div className="text-xs text-muted-foreground pt-1">
										Full payments start:{" "}
										{formatTransitionDate(
											simulationState.input.startDate,
											constructionEndMonth +
												selfBuildConfig.interestOnlyMonths +
												1,
										)}
									</div>
								)}
						</div>
					)}
				</CardContent>
			)}

			{/* Add Drawdown Dialog */}
			<SimulateAddDrawdownDialog
				open={showAddDrawdown}
				onOpenChange={setShowAddDrawdown}
				onAdd={addDrawdownStage}
				mortgageAmount={simulationState.input.mortgageAmount}
				totalDrawn={drawdownValidation.totalDrawn}
				startDate={simulationState.input.startDate}
			/>

			{/* Copy from Template Dialog */}
			<SimulateCopyTemplateDialog
				open={showCopyTemplate}
				onOpenChange={setShowCopyTemplate}
				mortgageAmount={simulationState.input.mortgageAmount}
				onApplyTemplate={handleApplyTemplate}
			/>

			{/* Edit Drawdown Dialog */}
			{editingDrawdown && (
				<SimulateEditDrawdownDialog
					open={!!editingDrawdown}
					onOpenChange={(open) => !open && setEditingDrawdown(null)}
					onSave={(stage) => {
						updateDrawdownStage(editingDrawdown.id, stage);
						setEditingDrawdown(null);
					}}
					editingStage={editingDrawdown}
					mortgageAmount={simulationState.input.mortgageAmount}
					totalDrawn={drawdownValidation.totalDrawn}
					startDate={simulationState.input.startDate}
				/>
			)}

			{/* Delete Drawdown Confirmation */}
			<AlertDialog
				open={!!deletingDrawdown}
				onOpenChange={(open) => !open && setDeletingDrawdown(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Drawdown Stage?</AlertDialogTitle>
						<AlertDialogDescription>
							This will remove this drawdown stage from your self-build
							configuration.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={() => {
								if (deletingDrawdown) {
									removeDrawdownStage(deletingDrawdown);
									setDeletingDrawdown(null);
								}
							}}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Disable Self-Build Confirmation */}
			<AlertDialog
				open={showDisableConfirmation}
				onOpenChange={setShowDisableConfirmation}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Disable Self-Build?</AlertDialogTitle>
						<AlertDialogDescription>
							This will remove all {resolvedDrawdownStages.length} drawdown
							stage{resolvedDrawdownStages.length !== 1 ? "s" : ""} you have
							configured.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={() => {
								disableSelfBuild();
								setShowDisableConfirmation(false);
							}}
						>
							Disable
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Card>
	);
}
