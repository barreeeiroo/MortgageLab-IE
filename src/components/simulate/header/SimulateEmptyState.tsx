import { useStore } from "@nanostores/react";
import { ArrowRight, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { $hasRequiredData, $initialized } from "@/lib/stores/simulate";
import { getPath } from "@/lib/utils/path";

export function SimulateEmptyState() {
	const hasRequiredData = useStore($hasRequiredData);
	const initialized = useStore($initialized);

	// Don't show anything until initialized (data loaded from localStorage)
	// Then only show empty state if there's no required data
	if (!initialized || hasRequiredData) {
		return null;
	}

	return (
		<Card className="border-dashed mt-6">
			<CardHeader className="text-center pb-2">
				<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
					<Calculator className="h-6 w-6 text-muted-foreground" />
				</div>
				<CardTitle>Start Your Simulation</CardTitle>
				<CardDescription>
					To simulate a mortgage, first select a rate from our comparison table.
					You can then model different scenarios with overpayments and rate
					changes.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex justify-center pb-6">
				<Button asChild className="gap-1.5">
					<a href={`${getPath("/rates")}?from=simulate`}>
						Compare Rates
						<ArrowRight className="h-4 w-4" />
					</a>
				</Button>
			</CardContent>
		</Card>
	);
}
