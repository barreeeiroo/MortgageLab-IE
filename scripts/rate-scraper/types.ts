import type { MortgageRate } from "../../src/lib/schemas/rate";

export type ScrapedRate = Omit<MortgageRate, "id"> & { id?: string };

export interface LenderProvider {
	lenderId: string;
	name: string;
	url: string;
	scrape(): Promise<MortgageRate[]>;
}

export interface BerRateTable {
	term: string;
	fixedTerm?: number;
	type: "fixed" | "variable";
	rates: {
		berGroup: string;
		rate: number;
	}[];
	apr: number;
}
