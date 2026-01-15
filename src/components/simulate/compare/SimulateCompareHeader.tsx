import { ArrowLeft, GitCompareArrows } from "lucide-react";
import { ShareButton } from "@/components/ShareButton";
import { Button } from "@/components/ui/button";

interface SimulateCompareHeaderProps {
	simulationCount: number;
	onShare: () => Promise<string>;
	onClose: () => void;
}

/**
 * Header for the comparison view
 */
export function SimulateCompareHeader({
	simulationCount,
	onShare,
	onClose,
}: SimulateCompareHeaderProps) {
	return (
		<div className="flex items-center justify-between gap-4 mb-6">
			<div className="flex items-center gap-3">
				<Button
					variant="ghost"
					size="icon"
					onClick={onClose}
					title="Back to simulator"
				>
					<ArrowLeft className="h-4 w-4" />
					<span className="sr-only">Back</span>
				</Button>
				<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
					<GitCompareArrows className="h-5 w-5 text-primary" />
				</div>
				<div>
					<h1 className="text-xl font-semibold">Compare Simulations</h1>
					<p className="text-sm text-muted-foreground">
						Comparing {simulationCount} simulation
						{simulationCount !== 1 ? "s" : ""}
					</p>
				</div>
			</div>

			<ShareButton onShare={onShare} label="Share Comparison" />
		</div>
	);
}
