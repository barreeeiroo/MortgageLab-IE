import * as cheerio from "cheerio";
import type { BuyerType } from "@/lib/schemas/buyer";
import type { MortgageRate } from "@/lib/schemas/rate";
import { parsePercentage } from "../utils/parsing";
import type {
    HistoricalLenderProvider,
    StructureValidation,
} from "../utils/types";

const LENDER_ID = "ics";
const BASE_URL = "https://www.icsmortgages.ie";
const OWNER_OCCUPIER_URL = `${BASE_URL}/mortgages/owner-occupier-rates`;
const EXISTING_CUSTOMER_URL = `${BASE_URL}/useful-information/rates`;
const BTL_URL = `${BASE_URL}/mortgages/buy-to-let-rates`;

const PDH_NEW_BUYER_TYPES: BuyerType[] = ["ftb", "mover", "switcher-pdh"];
const PDH_EXISTING_BUYER_TYPES: BuyerType[] = ["switcher-pdh"];
const BTL_BUYER_TYPES: BuyerType[] = ["btl", "switcher-btl"];

function parseLtvFromText(text: string): number | null {
    const match = text.match(/≤?\s*(\d+)%/);
    if (!match) return null;
    return Number.parseInt(match[1], 10);
}

interface OwnerOccupierRate {
    ltv: number;
    variable: { rate: number; apr: number };
    fixed3yr: { rate: number; apr: number };
    fixed5yr: { rate: number; apr: number };
}

interface BtlRate {
    ltv: number;
    rate: number;
    apr: number;
    productType: string;
    investorType: "individual" | "company" | "pension";
}

async function parseOwnerOccupierRates(): Promise<MortgageRate[]> {
    console.log("Fetching owner occupier rates page...");
    const response = await fetch(OWNER_OCCUPIER_URL);
    const html = await response.text();
    const $ = cheerio.load(html);

    const rates: MortgageRate[] = [];
    const parsedRows: OwnerOccupierRate[] = [];

    // Find the main rates table
    $("table").each((_, table) => {
        const headerRow = $(table).find("tr").first();
        const headerText = headerRow.text().toLowerCase();

        // Look for the new customer rates table with Variable, 3 Year, 5 Year columns
        if (
            headerText.includes("variable") &&
            (headerText.includes("3 year") || headerText.includes("3-year"))
        ) {
            $(table)
                .find("tr")
                .slice(1)
                .each((_, row) => {
                    const cells = $(row).find("td").toArray();
                    if (cells.length < 4) return;

                    const ltvText = $(cells[0]).text().trim();
                    const ltv = parseLtvFromText(ltvText);
                    if (!ltv) return;

                    // Parse Variable rate (column 1)
                    // Cell format: "Rate - 4.10% \nAPRC - 4.25%"
                    const variableCell = $(cells[1]).text();
                    const variableRate = parsePercentage(variableCell);
                    const variableAprMatch = variableCell.match(
                        /APRC[\s\-:]*(\d+\.?\d*)/i,
                    );
                    const variableApr = variableAprMatch
                        ? parsePercentage(variableAprMatch[1])
                        : null;

                    // Parse 3 Year Fixed rate (column 2)
                    const fixed3Cell = $(cells[2]).text();
                    const fixed3Rate = parsePercentage(fixed3Cell);
                    const fixed3AprMatch = fixed3Cell.match(
                        /APRC[\s\-:]*(\d+\.?\d*)/i,
                    );
                    const fixed3Apr = fixed3AprMatch
                        ? parsePercentage(fixed3AprMatch[1])
                        : null;

                    // Parse 5 Year Fixed rate (column 3)
                    const fixed5Cell = $(cells[3]).text();
                    const fixed5Rate = parsePercentage(fixed5Cell);
                    const fixed5AprMatch = fixed5Cell.match(
                        /APRC[\s\-:]*(\d+\.?\d*)/i,
                    );
                    const fixed5Apr = fixed5AprMatch
                        ? parsePercentage(fixed5AprMatch[1])
                        : null;

                    if (
                        variableRate &&
                        variableApr &&
                        fixed3Rate &&
                        fixed3Apr &&
                        fixed5Rate &&
                        fixed5Apr
                    ) {
                        parsedRows.push({
                            ltv,
                            variable: { rate: variableRate, apr: variableApr },
                            fixed3yr: { rate: fixed3Rate, apr: fixed3Apr },
                            fixed5yr: { rate: fixed5Rate, apr: fixed5Apr },
                        });
                    }
                });
        }
    });

    // Convert parsed rows to MortgageRate objects
    for (const row of parsedRows) {
        const minLtv = getMinLtv(row.ltv, parsedRows);

        // Variable rate
        rates.push({
            id: `${LENDER_ID}-variable-${row.ltv}`,
            name: `Variable Rate - LTV ≤${row.ltv}%`,
            lenderId: LENDER_ID,
            type: "variable",
            rate: row.variable.rate,
            apr: row.variable.apr,
            minLtv,
            maxLtv: row.ltv,
            buyerTypes: PDH_NEW_BUYER_TYPES,
            newBusiness: true,
            perks: [],
        });

        // 3 Year Fixed
        rates.push({
            id: `${LENDER_ID}-fixed-3yr-${row.ltv}`,
            name: `3 Year Fixed - LTV ≤${row.ltv}%`,
            lenderId: LENDER_ID,
            type: "fixed",
            rate: row.fixed3yr.rate,
            apr: row.fixed3yr.apr,
            fixedTerm: 3,
            minLtv,
            maxLtv: row.ltv,
            buyerTypes: PDH_NEW_BUYER_TYPES,
            newBusiness: true,
            perks: [],
        });

        // 5 Year Fixed
        rates.push({
            id: `${LENDER_ID}-fixed-5yr-${row.ltv}`,
            name: `5 Year Fixed - LTV ≤${row.ltv}%`,
            lenderId: LENDER_ID,
            type: "fixed",
            rate: row.fixed5yr.rate,
            apr: row.fixed5yr.apr,
            fixedTerm: 5,
            minLtv,
            maxLtv: row.ltv,
            buyerTypes: PDH_NEW_BUYER_TYPES,
            newBusiness: true,
            perks: [],
        });
    }

    console.log(`Parsed ${rates.length} new business owner occupier rates`);
    return rates;
}

async function parseExistingCustomerRates(): Promise<MortgageRate[]> {
    console.log("Fetching existing customer rates page...");
    const response = await fetch(EXISTING_CUSTOMER_URL);
    const html = await response.text();
    const $ = cheerio.load(html);

    const rates: MortgageRate[] = [];
    const parsedRows: OwnerOccupierRate[] = [];

    // Find the Owner Occupier Existing Customer Rates table
    $("table").each((_, table) => {
        const headerRow = $(table).find("tr").first();
        const headerText = headerRow.text().toLowerCase();

        // Look for the existing customer rates table with Variable, 3 Year, 5 Year columns
        if (
            headerText.includes("variable") &&
            (headerText.includes("3 year") || headerText.includes("3-year"))
        ) {
            $(table)
                .find("tr")
                .slice(1)
                .each((_, row) => {
                    const cells = $(row).find("td").toArray();
                    if (cells.length < 4) return;

                    const ltvText = $(cells[0]).text().trim();
                    const ltv = parseLtvFromText(ltvText);
                    if (!ltv) return;

                    // Parse Variable rate (column 1)
                    const variableCell = $(cells[1]).text();
                    const variableRate = parsePercentage(variableCell);
                    const variableAprMatch = variableCell.match(
                        /APRC[\s\-:]*(\d+\.?\d*)/i,
                    );
                    const variableApr = variableAprMatch
                        ? parsePercentage(variableAprMatch[1])
                        : null;

                    // Parse 3 Year Fixed rate (column 2)
                    const fixed3Cell = $(cells[2]).text();
                    const fixed3Rate = parsePercentage(fixed3Cell);
                    const fixed3AprMatch = fixed3Cell.match(
                        /APRC[\s\-:]*(\d+\.?\d*)/i,
                    );
                    const fixed3Apr = fixed3AprMatch
                        ? parsePercentage(fixed3AprMatch[1])
                        : null;

                    // Parse 5 Year Fixed rate (column 3)
                    const fixed5Cell = $(cells[3]).text();
                    const fixed5Rate = parsePercentage(fixed5Cell);
                    const fixed5AprMatch = fixed5Cell.match(
                        /APRC[\s\-:]*(\d+\.?\d*)/i,
                    );
                    const fixed5Apr = fixed5AprMatch
                        ? parsePercentage(fixed5AprMatch[1])
                        : null;

                    if (
                        variableRate &&
                        variableApr &&
                        fixed3Rate &&
                        fixed3Apr &&
                        fixed5Rate &&
                        fixed5Apr
                    ) {
                        parsedRows.push({
                            ltv,
                            variable: { rate: variableRate, apr: variableApr },
                            fixed3yr: { rate: fixed3Rate, apr: fixed3Apr },
                            fixed5yr: { rate: fixed5Rate, apr: fixed5Apr },
                        });
                    }
                });
            return false; // Only process the first matching table (existing customer rates)
        }
    });

    // Convert parsed rows to MortgageRate objects for existing customers
    for (const row of parsedRows) {
        const minLtv = getMinLtv(row.ltv, parsedRows);

        // Variable rate - existing customers
        rates.push({
            id: `${LENDER_ID}-existing-variable-${row.ltv}`,
            name: `Existing Customer Variable Rate - LTV ≤${row.ltv}%`,
            lenderId: LENDER_ID,
            type: "variable",
            rate: row.variable.rate,
            apr: row.variable.apr,
            minLtv,
            maxLtv: row.ltv,
            buyerTypes: PDH_EXISTING_BUYER_TYPES,
            newBusiness: false,
            perks: [],
        });

        // 3 Year Fixed - existing customers
        rates.push({
            id: `${LENDER_ID}-existing-fixed-3yr-${row.ltv}`,
            name: `Existing Customer 3 Year Fixed - LTV ≤${row.ltv}%`,
            lenderId: LENDER_ID,
            type: "fixed",
            rate: row.fixed3yr.rate,
            apr: row.fixed3yr.apr,
            fixedTerm: 3,
            minLtv,
            maxLtv: row.ltv,
            buyerTypes: PDH_EXISTING_BUYER_TYPES,
            newBusiness: false,
            perks: [],
        });

        // 5 Year Fixed - existing customers
        rates.push({
            id: `${LENDER_ID}-existing-fixed-5yr-${row.ltv}`,
            name: `Existing Customer 5 Year Fixed - LTV ≤${row.ltv}%`,
            lenderId: LENDER_ID,
            type: "fixed",
            rate: row.fixed5yr.rate,
            apr: row.fixed5yr.apr,
            fixedTerm: 5,
            minLtv,
            maxLtv: row.ltv,
            buyerTypes: PDH_EXISTING_BUYER_TYPES,
            newBusiness: false,
            perks: [],
        });
    }

    console.log(`Parsed ${rates.length} existing customer rates`);
    return rates;
}

function getMinLtv(currentLtv: number, rows: { ltv: number }[]): number {
    const sortedLtvs = [...new Set(rows.map((r) => r.ltv))].sort(
        (a, b) => a - b,
    );
    const index = sortedLtvs.indexOf(currentLtv);
    return index === 0 ? 0 : sortedLtvs[index - 1];
}

async function parseBtlRates(): Promise<MortgageRate[]> {
    console.log("Fetching buy-to-let rates page...");
    const response = await fetch(BTL_URL);
    const html = await response.text();
    const $ = cheerio.load(html);

    const rates: MortgageRate[] = [];
    const parsedRates: BtlRate[] = [];

    let currentInvestorType: "individual" | "company" | "pension" =
        "individual";

    // Process tables for different investor types
    $("table").each((_, table) => {
        // Check the heading above this table
        const prevHeading = $(table)
            .prevAll("h2, h3, h4, h5, h6")
            .first()
            .text();
        const headingLower = prevHeading.toLowerCase();

        if (headingLower.includes("company")) {
            currentInvestorType = "company";
        } else if (
            headingLower.includes("pension") ||
            headingLower.includes("unit trust")
        ) {
            currentInvestorType = "pension";
        } else if (headingLower.includes("individual")) {
            currentInvestorType = "individual";
        }

        $(table)
            .find("tr")
            .slice(1)
            .each((_, row) => {
                const cells = $(row).find("td").toArray();
                if (cells.length < 3) return;

                const productType = $(cells[0]).text().trim();
                const rateText = $(cells[1]).text().trim();
                const aprText = $(cells[2]).text().trim();

                // Skip header rows
                if (
                    productType.toLowerCase().includes("product") ||
                    rateText.toLowerCase().includes("rate")
                ) {
                    return;
                }

                const rate = parsePercentage(rateText);
                const apr = parsePercentage(aprText);

                // LTV might be in a separate column or in the product name
                let ltv: number | null = null;
                if (cells.length >= 4) {
                    ltv = parseLtvFromText($(cells[3]).text());
                }
                if (!ltv) {
                    ltv = parseLtvFromText(productType);
                }

                // If still no LTV, try to infer from row position
                if (!ltv) {
                    // Default LTV tiers for BTL are typically 60% and 70%
                    ltv = 70;
                }

                if (rate && apr) {
                    parsedRates.push({
                        ltv,
                        rate,
                        apr,
                        productType,
                        investorType: currentInvestorType,
                    });
                }
            });
    });

    // Deduplicate and create rates
    const seenIds = new Set<string>();

    for (const btl of parsedRates) {
        // Determine product variant from product type
        const productLower = btl.productType.toLowerCase();
        let variant = "";

        if (productLower.includes("interest only")) {
            variant = "-io";
        } else if (productLower.includes("flexi")) {
            variant = "-flexi";
        } else if (
            productLower.includes("capital") &&
            productLower.includes("interest")
        ) {
            variant = "-ci";
        }

        const id = `${LENDER_ID}-btl-${btl.investorType}${variant}-${btl.ltv}`;

        if (seenIds.has(id)) continue;
        seenIds.add(id);

        // Determine minLtv based on LTV tier
        const minLtv = btl.ltv === 60 ? 0 : btl.ltv === 70 ? 60 : 0;

        // Create a readable name
        let nameVariant = "";
        if (variant === "-io") nameVariant = " Interest Only";
        else if (variant === "-flexi") nameVariant = " Flexi-Mortgage";
        else if (variant === "-ci") nameVariant = " Capital & Interest";

        const investorName =
            btl.investorType === "individual"
                ? "Individual"
                : btl.investorType === "company"
                  ? "Company"
                  : "Pension";

        rates.push({
            id,
            name: `Buy-to-Let ${investorName}${nameVariant} - LTV ≤${btl.ltv}%`,
            lenderId: LENDER_ID,
            type: "variable",
            rate: btl.rate,
            apr: btl.apr,
            minLtv,
            maxLtv: btl.ltv,
            buyerTypes: BTL_BUYER_TYPES,
            // BTL rates available to both new and existing customers
            perks: [],
        });
    }

    console.log(`Parsed ${rates.length} buy-to-let rates`);
    return rates;
}

async function fetchAndParseRates(): Promise<MortgageRate[]> {
    const [ownerOccupierRates, existingCustomerRates, btlRates] =
        await Promise.all([
            parseOwnerOccupierRates(),
            parseExistingCustomerRates(),
            parseBtlRates(),
        ]);

    const allRates = [
        ...ownerOccupierRates,
        ...existingCustomerRates,
        ...btlRates,
    ];
    console.log(`Total: ${allRates.length} rates scraped from ICS Mortgages`);
    return allRates;
}

/**
 * Parse existing customer rates from HTML content.
 */
function parseExistingCustomerHtml(html: string): MortgageRate[] {
    const $ = cheerio.load(html);
    const rates: MortgageRate[] = [];
    const parsedRows: OwnerOccupierRate[] = [];

    // Find the Owner Occupier Existing Customer Rates table (same logic as parseExistingCustomerRates)
    $("table").each((_, table) => {
        const headerRow = $(table).find("tr").first();
        const headerText = headerRow.text().toLowerCase();

        // Look for the existing customer rates table with Variable, 3 Year, 5 Year columns
        if (
            headerText.includes("variable") &&
            (headerText.includes("3 year") || headerText.includes("3-year"))
        ) {
            $(table)
                .find("tr")
                .slice(1)
                .each((_, row) => {
                    const cells = $(row).find("td").toArray();
                    if (cells.length < 4) return;

                    const ltvText = $(cells[0]).text().trim();
                    const ltv = parseLtvFromText(ltvText);
                    if (!ltv) return;

                    // Parse Variable rate (column 1)
                    const variableCell = $(cells[1]).text();
                    const variableRate = parsePercentage(variableCell);
                    const variableAprMatch = variableCell.match(
                        /APRC[\s\-:]*(\d+\.?\d*)/i,
                    );
                    const variableApr = variableAprMatch
                        ? parsePercentage(variableAprMatch[1])
                        : null;

                    // Parse 3 Year Fixed rate (column 2)
                    const fixed3Cell = $(cells[2]).text();
                    const fixed3Rate = parsePercentage(fixed3Cell);
                    const fixed3AprMatch = fixed3Cell.match(
                        /APRC[\s\-:]*(\d+\.?\d*)/i,
                    );
                    const fixed3Apr = fixed3AprMatch
                        ? parsePercentage(fixed3AprMatch[1])
                        : null;

                    // Parse 5 Year Fixed rate (column 3)
                    const fixed5Cell = $(cells[3]).text();
                    const fixed5Rate = parsePercentage(fixed5Cell);
                    const fixed5AprMatch = fixed5Cell.match(
                        /APRC[\s\-:]*(\d+\.?\d*)/i,
                    );
                    const fixed5Apr = fixed5AprMatch
                        ? parsePercentage(fixed5AprMatch[1])
                        : null;

                    if (
                        variableRate &&
                        variableApr &&
                        fixed3Rate &&
                        fixed3Apr &&
                        fixed5Rate &&
                        fixed5Apr
                    ) {
                        parsedRows.push({
                            ltv,
                            variable: { rate: variableRate, apr: variableApr },
                            fixed3yr: { rate: fixed3Rate, apr: fixed3Apr },
                            fixed5yr: { rate: fixed5Rate, apr: fixed5Apr },
                        });
                    }
                });
            return false; // Only process the first matching table
        }
    });

    // Convert parsed rows to MortgageRate objects for existing customers
    for (const row of parsedRows) {
        const minLtv = getMinLtv(row.ltv, parsedRows);

        // Variable rate - existing customers
        rates.push({
            id: `${LENDER_ID}-existing-variable-${row.ltv}`,
            name: `Existing Customer Variable Rate - LTV ≤${row.ltv}%`,
            lenderId: LENDER_ID,
            type: "variable",
            rate: row.variable.rate,
            apr: row.variable.apr,
            minLtv,
            maxLtv: row.ltv,
            buyerTypes: PDH_EXISTING_BUYER_TYPES,
            newBusiness: false,
            perks: [],
        });

        // 3 Year Fixed - existing customers
        rates.push({
            id: `${LENDER_ID}-existing-fixed-3yr-${row.ltv}`,
            name: `Existing Customer 3 Year Fixed - LTV ≤${row.ltv}%`,
            lenderId: LENDER_ID,
            type: "fixed",
            rate: row.fixed3yr.rate,
            apr: row.fixed3yr.apr,
            fixedTerm: 3,
            minLtv,
            maxLtv: row.ltv,
            buyerTypes: PDH_EXISTING_BUYER_TYPES,
            newBusiness: false,
            perks: [],
        });

        // 5 Year Fixed - existing customers
        rates.push({
            id: `${LENDER_ID}-existing-fixed-5yr-${row.ltv}`,
            name: `Existing Customer 5 Year Fixed - LTV ≤${row.ltv}%`,
            lenderId: LENDER_ID,
            type: "fixed",
            rate: row.fixed5yr.rate,
            apr: row.fixed5yr.apr,
            fixedTerm: 5,
            minLtv,
            maxLtv: row.ltv,
            buyerTypes: PDH_EXISTING_BUYER_TYPES,
            newBusiness: false,
            perks: [],
        });
    }

    return rates;
}

/**
 * Parse BTL rates from HTML content.
 */
function parseBtlHtml(html: string): MortgageRate[] {
    const $ = cheerio.load(html);
    const rates: MortgageRate[] = [];
    const parsedRates: BtlRate[] = [];

    let currentInvestorType: "individual" | "company" | "pension" =
        "individual";

    // Process tables for different investor types (same logic as parseBtlRates)
    $("table").each((_, table) => {
        // Check the heading above this table
        const prevHeading = $(table)
            .prevAll("h2, h3, h4, h5, h6")
            .first()
            .text();
        const headingLower = prevHeading.toLowerCase();

        if (headingLower.includes("company")) {
            currentInvestorType = "company";
        } else if (
            headingLower.includes("pension") ||
            headingLower.includes("unit trust")
        ) {
            currentInvestorType = "pension";
        } else if (headingLower.includes("individual")) {
            currentInvestorType = "individual";
        }

        $(table)
            .find("tr")
            .slice(1)
            .each((_, row) => {
                const cells = $(row).find("td").toArray();
                if (cells.length < 3) return;

                const productType = $(cells[0]).text().trim();
                const rateText = $(cells[1]).text().trim();
                const aprText = $(cells[2]).text().trim();

                // Skip header rows
                if (
                    productType.toLowerCase().includes("product") ||
                    rateText.toLowerCase().includes("rate")
                ) {
                    return;
                }

                const rate = parsePercentage(rateText);
                const apr = parsePercentage(aprText);

                // LTV might be in a separate column or in the product name
                let ltv: number | null = null;
                if (cells.length >= 4) {
                    ltv = parseLtvFromText($(cells[3]).text());
                }
                if (!ltv) {
                    ltv = parseLtvFromText(productType);
                }

                // If still no LTV, default to 70
                if (!ltv) {
                    ltv = 70;
                }

                if (rate && apr) {
                    parsedRates.push({
                        ltv,
                        rate,
                        apr,
                        productType,
                        investorType: currentInvestorType,
                    });
                }
            });
    });

    // Deduplicate and create rates
    const seenIds = new Set<string>();

    for (const btl of parsedRates) {
        // Determine product variant from product type
        const productLower = btl.productType.toLowerCase();
        let variant = "";

        if (productLower.includes("interest only")) {
            variant = "-io";
        } else if (productLower.includes("flexi")) {
            variant = "-flexi";
        } else if (
            productLower.includes("capital") &&
            productLower.includes("interest")
        ) {
            variant = "-ci";
        }

        const id = `${LENDER_ID}-btl-${btl.investorType}${variant}-${btl.ltv}`;

        if (seenIds.has(id)) continue;
        seenIds.add(id);

        // Determine minLtv based on LTV tier
        const minLtv = btl.ltv === 60 ? 0 : btl.ltv === 70 ? 60 : 0;

        // Create a readable name
        let nameVariant = "";
        if (variant === "-io") nameVariant = " Interest Only";
        else if (variant === "-flexi") nameVariant = " Flexi-Mortgage";
        else if (variant === "-ci") nameVariant = " Capital & Interest";

        const investorName =
            btl.investorType === "individual"
                ? "Individual"
                : btl.investorType === "company"
                  ? "Company"
                  : "Pension";

        rates.push({
            id,
            name: `Buy-to-Let ${investorName}${nameVariant} - LTV ≤${btl.ltv}%`,
            lenderId: LENDER_ID,
            type: "variable",
            rate: btl.rate,
            apr: btl.apr,
            minLtv,
            maxLtv: btl.ltv,
            buyerTypes: BTL_BUYER_TYPES,
            perks: [],
        });
    }

    return rates;
}

/**
 * Parse rates from owner occupier HTML content only.
 * Note: ICS has 3 separate pages. This only parses the owner occupier page.
 * For full scraping, use the normal scrape() method.
 */
function parseOwnerOccupierHtml(html: string): MortgageRate[] {
    const $ = cheerio.load(html);
    const rates: MortgageRate[] = [];
    const parsedRows: OwnerOccupierRate[] = [];

    // Find the main rates table (same logic as parseOwnerOccupierRates)
    $("table").each((_, table) => {
        const headerRow = $(table).find("tr").first();
        const headerText = headerRow.text().toLowerCase();

        if (
            headerText.includes("variable") &&
            (headerText.includes("3 year") || headerText.includes("3-year"))
        ) {
            $(table)
                .find("tr")
                .slice(1)
                .each((_, row) => {
                    const cells = $(row).find("td").toArray();
                    if (cells.length < 4) return;

                    const ltvText = $(cells[0]).text().trim();
                    const ltv = parseLtvFromText(ltvText);
                    if (!ltv) return;

                    const variableCell = $(cells[1]).text();
                    const variableRate = parsePercentage(variableCell);
                    const variableAprMatch = variableCell.match(
                        /APRC[\s\-:]*(\d+\.?\d*)/i,
                    );
                    const variableApr = variableAprMatch
                        ? parsePercentage(variableAprMatch[1])
                        : null;

                    const fixed3Cell = $(cells[2]).text();
                    const fixed3Rate = parsePercentage(fixed3Cell);
                    const fixed3AprMatch = fixed3Cell.match(
                        /APRC[\s\-:]*(\d+\.?\d*)/i,
                    );
                    const fixed3Apr = fixed3AprMatch
                        ? parsePercentage(fixed3AprMatch[1])
                        : null;

                    const fixed5Cell = $(cells[3]).text();
                    const fixed5Rate = parsePercentage(fixed5Cell);
                    const fixed5AprMatch = fixed5Cell.match(
                        /APRC[\s\-:]*(\d+\.?\d*)/i,
                    );
                    const fixed5Apr = fixed5AprMatch
                        ? parsePercentage(fixed5AprMatch[1])
                        : null;

                    if (
                        variableRate &&
                        variableApr &&
                        fixed3Rate &&
                        fixed3Apr &&
                        fixed5Rate &&
                        fixed5Apr
                    ) {
                        parsedRows.push({
                            ltv,
                            variable: { rate: variableRate, apr: variableApr },
                            fixed3yr: { rate: fixed3Rate, apr: fixed3Apr },
                            fixed5yr: { rate: fixed5Rate, apr: fixed5Apr },
                        });
                    }
                });
        }
    });

    // Convert to MortgageRate objects
    for (const row of parsedRows) {
        const minLtv = getMinLtv(row.ltv, parsedRows);

        rates.push({
            id: `${LENDER_ID}-variable-${row.ltv}`,
            name: `Variable Rate - LTV ≤${row.ltv}%`,
            lenderId: LENDER_ID,
            type: "variable",
            rate: row.variable.rate,
            apr: row.variable.apr,
            minLtv,
            maxLtv: row.ltv,
            buyerTypes: PDH_NEW_BUYER_TYPES,
            newBusiness: true,
            perks: [],
        });

        rates.push({
            id: `${LENDER_ID}-fixed-3yr-${row.ltv}`,
            name: `3 Year Fixed - LTV ≤${row.ltv}%`,
            lenderId: LENDER_ID,
            type: "fixed",
            rate: row.fixed3yr.rate,
            apr: row.fixed3yr.apr,
            fixedTerm: 3,
            minLtv,
            maxLtv: row.ltv,
            buyerTypes: PDH_NEW_BUYER_TYPES,
            newBusiness: true,
            perks: [],
        });

        rates.push({
            id: `${LENDER_ID}-fixed-5yr-${row.ltv}`,
            name: `5 Year Fixed - LTV ≤${row.ltv}%`,
            lenderId: LENDER_ID,
            type: "fixed",
            rate: row.fixed5yr.rate,
            apr: row.fixed5yr.apr,
            fixedTerm: 5,
            minLtv,
            maxLtv: row.ltv,
            buyerTypes: PDH_NEW_BUYER_TYPES,
            newBusiness: true,
            perks: [],
        });
    }

    return rates;
}

/**
 * Validate that the HTML structure matches what we expect.
 * ICS uses tables with Variable, 3 Year, 5 Year columns.
 */
function validateStructure(
    html: string,
    additionalHtmls?: Record<string, string>,
): StructureValidation {
    const $ = cheerio.load(html);

    // Check for tables
    const tables = $("table");
    if (tables.length === 0) {
        return { valid: false, error: "No tables found on main page" };
    }

    // Check for expected column headers on main page
    let hasValidTable = false;
    tables.each((_, table) => {
        const headerText = $(table).find("tr").first().text().toLowerCase();
        if (headerText.includes("variable") && headerText.includes("year")) {
            hasValidTable = true;
        }
    });

    if (!hasValidTable) {
        return {
            valid: false,
            error: "No valid rate table found on main page (expected Variable and Year columns)",
        };
    }

    // Validate additional pages if provided
    if (additionalHtmls) {
        for (const [url, pageHtml] of Object.entries(additionalHtmls)) {
            const $page = cheerio.load(pageHtml);
            const pageTables = $page("table");
            if (pageTables.length === 0) {
                return { valid: false, error: `No tables found on ${url}` };
            }
        }
    }

    return { valid: true };
}

/**
 * Parse rates from HTML content, including additional pages if provided.
 * For historical scraping, this combines rates from all ICS pages.
 */
async function parseAllHtml(
    html: string,
    additionalHtmls?: Record<string, string>,
): Promise<MortgageRate[]> {
    // Parse main page (owner occupier)
    const ownerOccupierRates = parseOwnerOccupierHtml(html);

    // Parse additional pages if available
    let existingCustomerRates: MortgageRate[] = [];
    let btlRates: MortgageRate[] = [];

    if (additionalHtmls) {
        // Find existing customer page
        for (const [url, pageHtml] of Object.entries(additionalHtmls)) {
            if (url.includes("useful-information/rates")) {
                existingCustomerRates = parseExistingCustomerHtml(pageHtml);
            } else if (url.includes("buy-to-let-rates")) {
                btlRates = parseBtlHtml(pageHtml);
            }
        }
    }

    return [...ownerOccupierRates, ...existingCustomerRates, ...btlRates];
}

export const icsProvider: HistoricalLenderProvider = {
    lenderId: LENDER_ID,
    name: "ICS Mortgages",
    url: OWNER_OCCUPIER_URL,
    additionalUrls: [EXISTING_CUSTOMER_URL, BTL_URL],
    scrape: fetchAndParseRates,
    parseHtml: parseAllHtml,
    validateStructure,
};
