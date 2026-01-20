import type { LucideIcon } from "lucide-react";
import {
	ChartLine,
	FileDown,
	GitCompare,
	HardHat,
	History,
	Scale,
} from "lucide-react";

export interface WhatsNewItem {
	id: string;
	icon?: LucideIcon;
	title: string;
	description?: string;
	highlights?: string[];
}

// Bump this when adding new items
export const WHATS_NEW_VERSION = 2;

// Most recent items first (carousel shows up to 3)
export const WHATS_NEW_ITEMS: WhatsNewItem[] = [
	{
		id: "rate-history",
		icon: History,
		title: "Rate History",
		description: "Track mortgage rate changes over time",
		highlights: [
			"Timeline of rate updates by lender",
			"Interactive trend charts",
			"Individual rate history from rates table",
		],
	},
	{
		id: "simulation-comparison",
		icon: GitCompare,
		title: "Compare Simulations",
		description: "Compare multiple saved simulations side-by-side",
		highlights: [
			"5 chart types: Balance, Payments, Cumulative, Rates, Impact",
			"Export to PDF and Excel",
			"Shareable comparison URLs",
		],
	},
	{
		id: "self-build-simulation",
		icon: HardHat,
		title: "Self Build Mortgages",
		description: "Model self-build mortgages with staged drawdowns",
		highlights: [
			"Configure drawdown stages during construction",
			"Interest-only payments during build phase",
			"Full amortization after completion",
		],
	},
	{
		id: "export-data",
		icon: FileDown,
		title: "Export Your Data",
		description: "Export calculations in multiple formats",
		highlights: [
			"PDF reports with charts",
			"Excel spreadsheets for analysis",
			"CSV for custom processing",
		],
	},
	{
		id: "breakeven-calculators",
		icon: Scale,
		title: "Breakeven Calculators",
		description: "Make informed financial decisions",
		highlights: [
			"Rent vs Buy: Compare long-term costs",
			"Cashback: Compare rates with cashback offers",
			"Remortgage: Calculate when switching pays off",
		],
	},
	{
		id: "multi-chart-system",
		icon: ChartLine,
		title: "Interactive Charts",
		description: "Visualize your mortgage with multiple chart types",
		highlights: [
			"Balance, Payments, Cumulative views",
			"Rate timeline visualization",
			"Overpayment impact analysis",
		],
	},
];
