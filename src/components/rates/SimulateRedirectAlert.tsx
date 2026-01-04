import { Info, Play, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function SimulateRedirectAlert() {
	const [showAlert, setShowAlert] = useState(false);

	useEffect(() => {
		// Check if we came from the simulate page
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.get("from") === "simulate") {
			setShowAlert(true);

			// Clear the URL param without reloading
			urlParams.delete("from");
			const newUrl = urlParams.toString()
				? `${window.location.pathname}?${urlParams.toString()}`
				: window.location.pathname;
			window.history.replaceState({}, "", newUrl);
		}
	}, []);

	if (!showAlert) {
		return null;
	}

	return (
		<Alert className="mb-4 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
			<Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
			<AlertTitle className="text-blue-800 dark:text-blue-200">
				Select a rate to simulate
			</AlertTitle>
			<AlertDescription className="text-blue-700 dark:text-blue-300 block">
				Click on a product name to view details, then click{" "}
				<Play className="inline h-3 w-3 -mt-0.5" /> <strong>Simulate</strong> to
				model your mortgage with that rate.
			</AlertDescription>
			<Button
				variant="ghost"
				size="icon"
				className="absolute right-2 top-2 h-6 w-6 text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-200 dark:hover:bg-blue-900"
				onClick={() => setShowAlert(false)}
			>
				<X className="h-4 w-4" />
			</Button>
		</Alert>
	);
}
