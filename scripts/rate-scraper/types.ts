import type { MortgageRate, RateType } from "../../src/lib/schemas/rate";

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
	type: RateType;
	rates: {
		berGroup: string;
		rate: number;
	}[];
	apr: number;
}
