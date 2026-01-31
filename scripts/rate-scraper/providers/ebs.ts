import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import { GREEN_BER_RATINGS } from "@/lib/constants/ber";
import type { BuyerType } from "@/lib/schemas/buyer";
import type { MortgageRate } from "@/lib/schemas/rate";
import {
    parseLtvFromName,
    parsePercentageOrThrow,
    parseTermFromText,
} from "../utils/parsing";
import type {
    HistoricalLenderProvider,
    StructureValidation,
} from "../utils/types";

const LENDER_ID = "ebs";
const RATES_URL = "https://www.ebs.ie/mortgages/mortgage-interest-rates";

const PDH_BUYER_TYPES: BuyerType[] = ["ftb", "mover", "switcher-pdh"];
const BTL_BUYER_TYPES: BuyerType[] = ["btl", "switcher-btl"];

interface ParsedRow {
    name: string;
    term?: number;
    rate: number;
    apr: number;
    minLtv: number;
    maxLtv: number;
    isGreen: boolean;
    isBtl: boolean;
    isVariable: boolean;
}

function parseTableRow($: cheerio.CheerioAPI, row: Element): ParsedRow | null {
    const cells = $(row).find("td").toArray();
    if (cells.length < 3) return null;

    const name = $(cells[0]).text().trim();
    const rateText = $(cells[1]).text().trim();
    const aprText = $(cells[2]).text().trim();

    if (
        !name ||
        !rateText.includes("%") ||
        rateText.toLowerCase().includes("rate")
    ) {
        return null;
    }

    try {
        const rate = parsePercentageOrThrow(rateText);
        const apr = parsePercentageOrThrow(aprText);
        const term = parseTermFromText(name) ?? undefined;
        const { minLtv, maxLtv } = parseLtvFromName(name);
        const lowerName = name.toLowerCase();

        return {
            name,
            term,
            rate,
            apr,
            minLtv,
            maxLtv,
            isGreen: lowerName.includes("green"),
            isBtl:
                lowerName.includes("buy to let") || lowerName.includes("btl"),
            isVariable: lowerName.includes("variable"),
        };
    } catch {
        return null;
    }
}

type SectionType =
    | "new-fixed"
    | "new-variable"
    | "existing"
    | "topup"
    | "btl"
    | "unknown";

function getSectionType(heading: string): SectionType {
    const lower = heading.toLowerCase();
    if (lower.includes("buy to let")) return "btl";
    if (lower.includes("top up")) return "topup";
    if (lower.includes("existing business")) return "existing";
    if (lower.includes("new business variable")) return "new-variable";
    if (lower.includes("new business fixed")) return "new-fixed";
    return "unknown";
}

/**
 * Parse rates from HTML content.
 * Separated from fetch for historical scraping support.
 */
function parseRatesFromHtml(html: string): MortgageRate[] {
    const $ = cheerio.load(html);

    // Use a Map to deduplicate rates by ID
    const ratesMap = new Map<string, MortgageRate>();

    // Track current section by parsing h2, h3, and tables in document order
    let currentSection: SectionType = "unknown";

    $("h2, h3, table").each((_, el) => {
        const tagName = el.tagName.toLowerCase();

        if (tagName === "h2" || tagName === "h3") {
            const heading = $(el).text().trim();
            const section = getSectionType(heading);
            if (section !== "unknown") {
                currentSection = section;
            }
            return;
        }

        // Skip sections we don't want
        if (currentSection === "unknown" || currentSection === "topup") {
            return;
        }

        const isBtlSection = currentSection === "btl";
        const isNewVariableSection = currentSection === "new-variable";
        const isExistingSection = currentSection === "existing";

        // Check if this is a BTL variable rate table (rate in first column, no name)
        // The "Standard Variable" text is in a preceding sibling
        const prevSiblings = $(el).prevAll().text().toLowerCase();
        const isBtlVariableTable =
            isBtlSection && prevSiblings.includes("standard variable");

        if (isBtlVariableTable) {
            $(el)
                .find("tbody tr, tr")
                .each((_, row) => {
                    const cells = $(row).find("td").toArray();
                    if (cells.length < 2) return;

                    const rateText = $(cells[0]).text().trim();
                    const aprText = $(cells[1]).text().trim();

                    if (
                        !rateText.includes("%") ||
                        rateText.toLowerCase().includes("rate")
                    )
                        return;

                    try {
                        const rate = parsePercentageOrThrow(rateText);
                        const apr = parsePercentageOrThrow(aprText);

                        const mortgageRate: MortgageRate = {
                            id: "ebs-btl-variable",
                            name: "Buy-to-Let Variable Rate",
                            lenderId: LENDER_ID,
                            type: "variable",
                            rate,
                            apr,
                            minLtv: 0,
                            maxLtv: 70,
                            buyerTypes: BTL_BUYER_TYPES,
                            perks: [],
                        };

                        ratesMap.set(mortgageRate.id, mortgageRate);
                    } catch {
                        // Skip
                    }
                });
            return;
        }

        $(el)
            .find("tbody tr, tr")
            .each((_, row) => {
                const parsed = parseTableRow($, row);
                if (!parsed) return;

                // Detect variable rates: explicit "variable" in name, OR
                // LTV-only rows (no term, name is just LTV pattern), OR in new-variable section
                const ltvPattern = /^[<>=≤≥\s\d%-]+$/;
                const isLtvOnlyRow =
                    !parsed.term && ltvPattern.test(parsed.name);
                const isVariable =
                    parsed.isVariable || isLtvOnlyRow || isNewVariableSection;

                const isBtl = parsed.isBtl || isBtlSection;
                // Existing customer rates only available to switchers
                const buyerTypes: BuyerType[] = isExistingSection
                    ? isBtl
                        ? ["switcher-btl"]
                        : ["switcher-pdh"]
                    : isBtl
                      ? BTL_BUYER_TYPES
                      : PDH_BUYER_TYPES;

                const idParts = [LENDER_ID];
                if (isBtl) idParts.push("btl");
                if (parsed.isGreen) idParts.push("green");
                if (isVariable) {
                    idParts.push("variable");
                    if (parsed.maxLtv < 90) idParts.push(String(parsed.maxLtv));
                } else if (parsed.term) {
                    idParts.push("fixed", `${parsed.term}yr`);
                }

                const nameParts: string[] = [];
                if (isBtl) nameParts.push("Buy-to-Let");
                if (parsed.isGreen) nameParts.push("Green");
                if (isVariable) {
                    nameParts.push("Variable Rate");
                    if (parsed.maxLtv < 90)
                        nameParts.push(`- LTV ≤${parsed.maxLtv}%`);
                } else if (parsed.term) {
                    nameParts.push(`${parsed.term} Year Fixed`);
                }

                // Skip fixed rates from existing section (duplicates)
                if (isExistingSection && !isVariable) {
                    return;
                }

                const mortgageRate: MortgageRate = {
                    id: idParts.join("-"),
                    name: nameParts.join(" ") || parsed.name,
                    lenderId: LENDER_ID,
                    type: isVariable ? "variable" : "fixed",
                    rate: parsed.rate,
                    apr: parsed.apr,
                    fixedTerm: isVariable ? undefined : parsed.term,
                    minLtv: parsed.minLtv,
                    maxLtv: isBtl ? 70 : parsed.maxLtv,
                    buyerTypes,
                    berEligible: parsed.isGreen ? GREEN_BER_RATINGS : undefined,
                    newBusiness: isExistingSection ? false : !isExistingSection,
                    perks: [],
                };

                ratesMap.set(mortgageRate.id, mortgageRate);
            });
    });

    return Array.from(ratesMap.values());
}

/**
 * Validate that the HTML structure matches what we expect.
 * EBS uses heading-based sections (h2, h3) with tables following them.
 */
function validateStructure(html: string): StructureValidation {
    const $ = cheerio.load(html);

    // Check for tables
    const tables = $("table");
    if (tables.length === 0) {
        return { valid: false, error: "No tables found on page" };
    }

    // Check for section headings
    const headings = $("h2, h3");
    if (headings.length === 0) {
        return { valid: false, error: "No section headings (h2/h3) found" };
    }

    // Check for rate-related content
    const pageText = $("body").text().toLowerCase();
    if (!pageText.includes("fixed") && !pageText.includes("variable")) {
        return {
            valid: false,
            error: "No rate type content found (fixed/variable)",
        };
    }

    return { valid: true };
}

async function fetchAndParseRates(): Promise<MortgageRate[]> {
    console.log("Fetching rates page...");
    const response = await fetch(RATES_URL);
    const html = await response.text();

    console.log("Parsing HTML content with Cheerio...");
    const rates = parseRatesFromHtml(html);
    console.log(`Parsed ${rates.length} unique rates from HTML`);
    return rates;
}

export const ebsProvider: HistoricalLenderProvider = {
    lenderId: LENDER_ID,
    name: "EBS",
    url: RATES_URL,
    scrape: fetchAndParseRates,
    parseHtml: async (html: string) => parseRatesFromHtml(html),
    validateStructure,
};
