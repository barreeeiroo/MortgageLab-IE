import { useStore } from "@nanostores/react";
import { Button } from "@/components/ui/button";
import { EURIBOR_TENORS } from "@/lib/schemas/euribor";
import {
	$euriborToggles,
	toggleEuriborTenor,
} from "@/lib/stores/rates/rates-history-filters";

export function EuriborToggles() {
	const toggles = useStore($euriborToggles);

	return (
		<div className="flex items-center gap-1">
			<span className="text-xs text-muted-foreground mr-1">Euribor:</span>
			{EURIBOR_TENORS.map((tenor) => (
				<Button
					key={tenor}
					variant={toggles[tenor] ? "secondary" : "outline"}
					size="sm"
					className="h-6 px-2 text-xs"
					onClick={() => toggleEuriborTenor(tenor)}
				>
					{tenor}
				</Button>
			))}
		</div>
	);
}
