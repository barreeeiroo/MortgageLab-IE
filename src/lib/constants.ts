export const SITE = {
	name: "MortgageLab Ireland",
	shortName: "MortgageLab",
	description: "Compare and simulate mortgages in Ireland",
};

export const NAV_ITEMS = [
	{ label: "First Time Buyer", href: "/first-time-buyer" },
	{ label: "Home Mover", href: "/home-mover" },
	{ label: "Remortgage", href: "/remortgage" },
	{ label: "Buy-to-Let", href: "/buy-to-let" },
] as const;

export const AUTHOR = {
	name: "Diego Barreiro Perez",
	website: "https://diego.barreiro.dev",
	email: "diego@barreiro.dev",
	github: "https://github.com/barreeeiroo/MortgageLab-IE",
};

export const EXTERNAL_RESOURCES = {
	informational: {
		title: "Informational Guides",
		description: "Official guides and information about the home buying process",
		items: [
			{
				name: "Citizens Information - Steps to Buying a Home",
				url: "https://www.citizensinformation.ie/en/housing/owning-a-home/buying-a-home/steps-involved-buying-a-home/",
				description: "Official government guide on the home buying process in Ireland",
			},
			{
				name: "Citizens Information - Taking Out a Mortgage",
				url: "https://www.citizensinformation.ie/en/housing/owning-a-home/help-with-buying-a-home/taking-out-a-mortgage/",
				description: "Information on mortgage types, approval process, and protections",
			},
		],
	},
	comparators: {
		title: "Mortgage Comparators",
		description: "Tools to compare mortgage rates and offers from different lenders",
		items: [
			{
				name: "CCPC - Mortgage Comparisons",
				url: "https://www.ccpc.ie/consumers/money-tools/mortgage-comparisons/",
				description: "Official comparison tool from the Competition and Consumer Protection Commission",
			},
			{
				name: "Bonkers.ie - Compare Mortgages",
				url: "https://www.bonkers.ie/compare-mortgages/",
				description: "Independent mortgage comparison service",
			},
			{
				name: "Switcher.ie - Mortgages",
				url: "https://switcher.ie/mortgages/",
				description: "Mortgage switching and comparison platform",
			},
		],
	},
} as const;
