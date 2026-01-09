import { AlertTriangle, Plus } from "lucide-react";
import { LenderLogo } from "@/components/lenders/LenderLogo";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { BufferSuggestion } from "@/lib/stores/simulate/simulate-calculations";
import { insertRatePeriodAt } from "@/lib/stores/simulate/simulate-state";

interface SimulateBufferSuggestionProps {
	suggestion: BufferSuggestion;
}

export function SimulateBufferSuggestion({
	suggestion,
}: SimulateBufferSuggestionProps) {
	const isTrailing = suggestion.isTrailing ?? false;

	const handleAddBuffer = () => {
		// Insert a 1-month variable rate period after the fixed period
		insertRatePeriodAt(
			{
				lenderId: suggestion.suggestedRate.lenderId,
				rateId: suggestion.suggestedRate.id,
				isCustom: false,
				durationMonths: 1,
				label: `${suggestion.lenderName} - Follow-On Buffer`,
			},
			suggestion.afterIndex + 1,
		);
	};

	const handleAddUntilEnd = () => {
		// Insert a variable rate period until end of mortgage
		insertRatePeriodAt(
			{
				lenderId: suggestion.suggestedRate.lenderId,
				rateId: suggestion.suggestedRate.id,
				isCustom: false,
				durationMonths: 0, // 0 = until end of mortgage
				label: `${suggestion.lenderName} - Follow-On`,
			},
			suggestion.afterIndex + 1,
		);
	};

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="p-0.5 rounded hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors cursor-pointer"
					aria-label={
						isTrailing ? "Add follow-on rate" : "Variable buffer suggestion"
					}
				>
					<AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
				</button>
			</PopoverTrigger>
			<PopoverContent className="w-80" align="start">
				<div className="space-y-3">
					<div className="flex items-start gap-2">
						<AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
						<div>
							<h4 className="font-medium text-sm">
								{isTrailing
									? "Add Follow-On Rate"
									: "Consider a Variable Buffer"}
							</h4>
							<p className="text-xs text-muted-foreground mt-1">
								{isTrailing
									? "Your mortgage extends beyond this fixed rate period. Add the follow-on variable rate to continue."
									: "Adding a 1-month variable period before switching rates allows you to make a penalty-free lump sum overpayment."}
							</p>
						</div>
					</div>

					{/* Suggested rate */}
					<div className="bg-muted/50 rounded-lg p-2">
						<p className="text-xs text-muted-foreground mb-2">
							{isTrailing ? "Follow-on rate:" : "Follow-on rate (for buffer):"}
						</p>
						<div className="flex items-center gap-2">
							<LenderLogo
								lenderId={suggestion.suggestedRate.lenderId}
								size={24}
							/>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium truncate">
									{suggestion.suggestedRate.name}
								</p>
								<p className="text-xs text-muted-foreground">
									{suggestion.suggestedRate.rate.toFixed(2)}%
									{!isTrailing && " for 1 month"}
								</p>
							</div>
						</div>
					</div>

					{/* LTV info */}
					<p className="text-xs text-muted-foreground">
						Your LTV at this point will be approximately{" "}
						<span className="font-medium">
							{suggestion.ltvAtEnd.toFixed(1)}%
						</span>
					</p>

					{/* Actions */}
					{isTrailing ? (
						<div className="flex gap-2">
							<Button
								size="sm"
								className="flex-1 gap-1.5"
								onClick={handleAddUntilEnd}
							>
								<Plus className="h-3.5 w-3.5" />
								Add Until End
							</Button>
							<Button
								size="sm"
								variant="outline"
								className="flex-1 gap-1.5"
								onClick={handleAddBuffer}
							>
								<Plus className="h-3.5 w-3.5" />
								Add 1-Month
							</Button>
						</div>
					) : (
						<Button
							size="sm"
							className="w-full gap-1.5"
							onClick={handleAddBuffer}
						>
							<Plus className="h-3.5 w-3.5" />
							Add 1-Month Buffer
						</Button>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
