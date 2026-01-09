import { Info } from "lucide-react";
import { AGE_LIMITS } from "@/lib/constants/central-bank";
import { Label } from "../ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "../ui/tooltip";

interface MortgageTermDisplayProps {
	maxMortgageTerm: number | null;
}

export function MortgageTermDisplay({
	maxMortgageTerm,
}: MortgageTermDisplayProps) {
	return (
		<div className="space-y-2">
			<div className="flex items-center gap-1">
				<Label htmlFor="maxMortgageTerm">Maximum Mortgage Term</Label>
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
						</TooltipTrigger>
						<TooltipContent className="max-w-xs">
							<p>
								Some lenders may offer mortgage terms of up to 40 years,
								depending on your age and circumstances.
							</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
			<Select value={maxMortgageTerm?.toString() ?? ""} disabled>
				<SelectTrigger id="maxMortgageTerm" className="w-full">
					<SelectValue placeholder="Select date of birth first" />
				</SelectTrigger>
				<SelectContent>
					{maxMortgageTerm !== null && (
						<SelectItem value={maxMortgageTerm.toString()}>
							{maxMortgageTerm} years
						</SelectItem>
					)}
				</SelectContent>
			</Select>
			<p className="text-xs text-muted-foreground">
				Based on a maximum age of {AGE_LIMITS.MAX_AGE_AT_END} at the end of
				term. Some lenders may extend to age{" "}
				{AGE_LIMITS.EXTENDED_MAX_AGE_AT_END}.
			</p>
		</div>
	);
}
