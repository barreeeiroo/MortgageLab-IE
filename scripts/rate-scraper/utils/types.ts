import type { MortgageRate, RateType } from "@/lib/schemas/rate";

export type ScrapedRate = Omit<MortgageRate, "id"> & { id?: string };

export interface LenderProvider {
	lenderId: string;
	name: string;
	url: string;
	scrape(): Promise<MortgageRate[]>;
}

/**
 * Structure validation result for historical scraping.
 */
export interface StructureValidation {
	valid: boolean;
	error?: string;
}

/**
 * Extended provider interface that supports historical scraping via Wayback Machine.
 * Providers implementing this can parse HTML directly (without fetching).
 */
export interface HistoricalLenderProvider extends LenderProvider {
	/**
	 * Parse rates from HTML content directly.
	 * Used for historical scraping where HTML is fetched from Wayback Machine.
	 *
	 * @param html - HTML content from the main URL
	 * @param additionalHtmls - Optional map of URL -> HTML for providers with multiple pages
	 */
	parseHtml(
		html: string,
		additionalHtmls?: Record<string, string>,
	): Promise<MortgageRate[]>;

	/**
	 * Validate that the HTML structure matches what the parser expects.
	 * Returns { valid: false, error: "..." } if structure has changed.
	 * Historical scraping stops if validation fails.
	 *
	 * @param html - HTML content from the main URL
	 * @param additionalHtmls - Optional map of URL -> HTML for providers with multiple pages
	 */
	validateStructure?(
		html: string,
		additionalHtmls?: Record<string, string>,
	): StructureValidation;

	/**
	 * Legacy URL for historical scraping.
	 * Some lenders changed their URL structure over time.
	 * The parser should auto-detect the format based on HTML structure.
	 */
	legacyUrl?: string;

	/**
	 * Additional URLs to scrape for providers with multi-page rate listings.
	 * For each snapshot of the main URL, the historical scraper will attempt
	 * to find and fetch matching snapshots from these additional URLs.
	 */
	additionalUrls?: string[];
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
