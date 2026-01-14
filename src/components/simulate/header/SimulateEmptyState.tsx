import { useStore } from "@nanostores/react";
import {
	ArrowRight,
	Calculator,
	ChevronDown,
	FolderOpen,
	Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { loadRatesForm, saveRatesForm } from "@/lib/storage/forms";
import { DEFAULT_VALUES } from "@/lib/stores/rates-form";
import {
	$hasSavedSimulations,
	$savedSimulations,
	loadSave,
} from "@/lib/stores/simulate/simulate-saves";
import {
	$hasRequiredData,
	$initialized,
} from "@/lib/stores/simulate/simulate-state";
import { getPath } from "@/lib/utils/path";

export function SimulateEmptyState() {
	const hasRequiredData = useStore($hasRequiredData);
	const initialized = useStore($initialized);
	const hasSavedSimulations = useStore($hasSavedSimulations);
	const savedSimulations = useStore($savedSimulations);

	// SSG: renders empty state (initialized=false by default)
	// Client: hide when user has set up a simulation
	const shouldHide = initialized && hasRequiredData;

	const handleLoadSave = (saveId: string, name: string) => {
		const success = loadSave(saveId);
		if (success) {
			toast.success(`Loaded "${name}"`);
		}
	};

	const formatDate = (isoDate: string) => {
		const date = new Date(isoDate);
		return date.toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

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
					<CardContent className="flex justify-center gap-2 pb-6">
						{initialized ? (
							<>
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
								{hasSavedSimulations && (
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant="outline" className="gap-1.5">
												<FolderOpen className="h-4 w-4" />
												Load
												<ChevronDown className="h-3 w-3 opacity-50" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="center" className="w-64">
											{savedSimulations.map((save) => (
												<DropdownMenuItem
													key={save.id}
													className="flex-col items-start gap-0"
													onClick={() => handleLoadSave(save.id, save.name)}
												>
													<div className="truncate text-sm">{save.name}</div>
													<div className="text-xs text-muted-foreground">
														Last modified {formatDate(save.lastUpdatedAt)}
													</div>
												</DropdownMenuItem>
											))}
										</DropdownMenuContent>
									</DropdownMenu>
								)}
							</>
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
