import { ArrowLeft, Download, GitCompareArrows } from "lucide-react";
import { ShareButton } from "@/components/ShareButton";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SimulateCompareHeaderProps {
	simulationCount: number;
	onShare: () => Promise<string>;
	onClose: () => void;
	onExportExcel: () => Promise<void>;
	onExportPDF: () => Promise<void>;
	onExportPDFWithCharts: () => Promise<void>;
	isExporting: boolean;
	canExport: boolean;
}

/**
 * Header for the comparison view
 */
export function SimulateCompareHeader({
	simulationCount,
	onShare,
	onClose,
	onExportExcel,
	onExportPDF,
	onExportPDFWithCharts,
	isExporting,
	canExport,
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

			<div className="flex items-center gap-2">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							className="gap-1.5"
							disabled={!canExport || isExporting}
						>
							<Download className="h-4 w-4" />
							<span className="hidden sm:inline">
								{isExporting ? "Exporting..." : "Export"}
							</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={onExportExcel}>
							Export as Excel
						</DropdownMenuItem>
						<DropdownMenuItem onClick={onExportPDF}>
							Export as PDF
						</DropdownMenuItem>
						<DropdownMenuItem onClick={onExportPDFWithCharts}>
							Export as PDF (with charts)
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
				<ShareButton onShare={onShare} label="Share" />
			</div>
		</div>
	);
}
