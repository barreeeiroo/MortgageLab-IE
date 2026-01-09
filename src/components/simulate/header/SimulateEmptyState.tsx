import { useStore } from "@nanostores/react";
import { ArrowRight, Calculator, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { loadRatesForm, saveRatesForm } from "@/lib/storage";
import { DEFAULT_VALUES } from "@/lib/stores";
import { $hasRequiredData, $initialized } from "@/lib/stores/simulate";
import { getPath } from "@/lib/utils/path";

export function SimulateEmptyState() {
	const hasRequiredData = useStore($hasRequiredData);
	const initialized = useStore($initialized);

	// SSG: renders empty state (initialized=false by default)
	// Client: hide when user has set up a simulation
	const shouldHide = initialized && hasRequiredData;

	// Wrap in div to ensure React controls the DOM properly during hydration
	return (
		<div data-simulate-empty-state data-hidden={shouldHide}>
			{!shouldHide && (
				<Card className="border-dashed mt-6" data-testid="simulate-empty-state">
					<CardHeader className="text-center pb-2">
						<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
							<Calculator className="h-6 w-6 text-muted-foreground" />
						</div>
						<CardTitle>Start Your Simulation</CardTitle>
						<CardDescription>
							To simulate a mortgage, first select a rate from our comparison
							table. You can then model different scenarios with overpayments
							and rate changes.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex justify-center pb-6">
						{initialized ? (
							<Button
								className="gap-1.5"
								onClick={() => {
									const saved = loadRatesForm();
									saveRatesForm({
										...DEFAULT_VALUES,
										...saved,
										mode: "first-mortgage",
										buyerType: "ftb",
									});
									window.location.href = `${getPath("/rates")}?from=simulate#first-mortgage`;
								}}
							>
								Compare Rates
								<ArrowRight className="h-4 w-4" />
							</Button>
						) : (
							<Button className="gap-1.5" disabled>
								<Loader2 className="h-4 w-4 animate-spin" />
								Loading...
							</Button>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
