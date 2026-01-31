import { describe, expect, it } from "vitest";
import {
    getBugReportUrl,
    getFeatureRequestUrl,
    getIncorrectRateUrl,
    getMissingVariableRateUrl,
    getNewRateUrl,
} from "../contact";
import { AUTHOR } from "../site";

/**
 * Helper to decode URL and check if it contains the expected text.
 * URLSearchParams encodes spaces as + while encodeURIComponent uses %20,
 * so we decode the URL for comparison.
 */
function urlContains(url: string, text: string): boolean {
    return decodeURIComponent(url.replace(/\+/g, " ")).includes(text);
}

describe("getIncorrectRateUrl", () => {
    it("generates correct URL with required parameters", () => {
        const url = getIncorrectRateUrl({
            lenderId: "aib",
            rateName: "3 Year Fixed",
            reportSource: "Rate Info dialog",
        });

        expect(url).toContain(`${AUTHOR.github}/issues/new`);
        expect(url).toContain("template=3-incorrect-rate.yml");
        expect(urlContains(url, "[Rate] Incorrect rate for 3 Year Fixed")).toBe(
            true,
        );
        expect(url).toContain("rate-name=3+Year+Fixed");
        expect(urlContains(url, "_Reported from Rate Info dialog_")).toBe(true);
    });

    it("includes rateId as rate-name when provided", () => {
        const url = getIncorrectRateUrl({
            lenderId: "aib",
            rateName: "3 Year Fixed",
            rateId: "aib-fixed-3yr-50",
            reportSource: "Rate Info dialog",
        });

        expect(url).toContain("rate-name=aib-fixed-3yr-50");
    });

    it("includes source URL when provided", () => {
        const url = getIncorrectRateUrl({
            lenderId: "aib",
            rateName: "3 Year Fixed",
            sourceUrl: "https://aib.ie/rates",
            reportSource: "Rate Info dialog",
        });

        expect(url).toContain("source=https");
        expect(url).toContain("aib.ie");
    });

    it("includes additional context when provided", () => {
        const url = getIncorrectRateUrl({
            lenderId: "aib",
            rateName: "3 Year Fixed",
            reportSource: "Rate Info dialog",
            additionalContext: "Rate shown is 3.5% but website shows 3.25%",
        });

        expect(
            urlContains(url, "Rate shown is 3.5% but website shows 3.25%"),
        ).toBe(true);
    });

    it("uses default placeholder when no additional context", () => {
        const url = getIncorrectRateUrl({
            lenderId: "aib",
            rateName: "3 Year Fixed",
            reportSource: "Rate Info dialog",
        });

        expect(
            urlContains(url, "[Replace this with what you think is incorrect]"),
        ).toBe(true);
    });
});

describe("getNewRateUrl", () => {
    it("generates correct URL with minimal parameters", () => {
        const url = getNewRateUrl({
            reportSource: "Rate Updates dialog",
        });

        expect(url).toContain(`${AUTHOR.github}/issues/new`);
        expect(url).toContain("template=4-new-rate.yml");
        expect(urlContains(url, "_Reported from Rate Updates dialog_")).toBe(
            true,
        );
    });

    it("includes lender when provided", () => {
        const url = getNewRateUrl({
            reportSource: "Rate Updates dialog",
            lenderId: "aib",
        });

        expect(url).toContain("lender=AIB");
    });

    it("maps lender IDs to template values", () => {
        const lenderMappings: Record<string, string> = {
            aib: "AIB",
            avant: "Avant Money",
            boi: "Bank of Ireland",
            cu: "Credit Union Mortgages",
            ebs: "EBS",
            haven: "Haven Mortgages",
            ics: "ICS Mortgages",
            moco: "MoCo",
            nua: "Núa Mortgages",
            ptsb: "Permanent TSB",
        };

        for (const [lenderId, expected] of Object.entries(lenderMappings)) {
            const url = getNewRateUrl({ reportSource: "Test", lenderId });
            expect(urlContains(url, `lender=${expected}`)).toBe(true);
        }
    });

    it("uses 'Other' for unknown lenders", () => {
        const url = getNewRateUrl({
            reportSource: "Test",
            lenderId: "unknown-lender",
        });

        expect(url).toContain("lender=Other");
    });

    it("includes rate description when provided", () => {
        const url = getNewRateUrl({
            reportSource: "Test",
            rateDescription: "5 Year Fixed Green Rate",
        });

        expect(
            urlContains(url, "rate-description=5 Year Fixed Green Rate"),
        ).toBe(true);
    });

    it("includes source URL when provided", () => {
        const url = getNewRateUrl({
            reportSource: "Test",
            sourceUrl: "https://bank.ie/rates",
        });

        expect(url).toContain("source=https");
    });

    it("includes additional context when provided", () => {
        const url = getNewRateUrl({
            reportSource: "Test",
            additionalContext: "New rate launched today",
        });

        expect(urlContains(url, "New rate launched today")).toBe(true);
    });
});

describe("getBugReportUrl", () => {
    it("generates correct URL with no parameters", () => {
        const url = getBugReportUrl();

        expect(url).toContain(`${AUTHOR.github}/issues/new`);
        expect(url).toContain("template=1-bug-report.yml");
    });

    it("includes current behaviour when provided", () => {
        const url = getBugReportUrl({
            currentBehaviour: "Button does nothing when clicked",
        });

        expect(urlContains(url, "current-behaviour=Button does nothing")).toBe(
            true,
        );
    });

    it("includes expected behaviour when provided", () => {
        const url = getBugReportUrl({
            expectedBehaviour: "Should open modal",
        });

        expect(urlContains(url, "expected-behaviour=Should open modal")).toBe(
            true,
        );
    });

    it("includes steps when provided", () => {
        const url = getBugReportUrl({
            steps: "1. Click button\n2. Nothing happens",
        });

        expect(urlContains(url, "steps=1. Click button")).toBe(true);
    });

    it("includes browser when provided", () => {
        const url = getBugReportUrl({
            browser: "Chrome 120",
        });

        expect(urlContains(url, "browser=Chrome 120")).toBe(true);
    });

    it("includes report source in context when provided", () => {
        const url = getBugReportUrl({
            reportSource: "Rates page",
        });

        expect(urlContains(url, "_Reported from Rates page_")).toBe(true);
    });

    it("does not include context when reportSource is not provided", () => {
        const url = getBugReportUrl({
            currentBehaviour: "Test",
        });

        expect(url).not.toContain("context=");
    });
});

describe("getFeatureRequestUrl", () => {
    it("generates correct URL with no parameters", () => {
        const url = getFeatureRequestUrl();

        expect(url).toContain(`${AUTHOR.github}/issues/new`);
        expect(url).toContain("template=2-feature-request.yml");
    });

    it("includes description when provided", () => {
        const url = getFeatureRequestUrl({
            description: "Add dark mode support",
        });

        expect(urlContains(url, "description=Add dark mode support")).toBe(
            true,
        );
    });

    it("includes use case when provided", () => {
        const url = getFeatureRequestUrl({
            useCase: "Easier to read at night",
        });

        expect(urlContains(url, "use-case=Easier to read at night")).toBe(true);
    });

    it("includes report source in context when provided", () => {
        const url = getFeatureRequestUrl({
            reportSource: "Landing page",
        });

        expect(urlContains(url, "_Reported from Landing page_")).toBe(true);
    });
});

describe("getMissingVariableRateUrl", () => {
    const baseParams = {
        lenderId: "aib",
        lenderName: "AIB",
        fixedRateId: "aib-fixed-3yr-50",
        fixedRateName: "3 Year Fixed",
        fixedRate: 3.45,
        fixedTerm: 3,
        ltv: 75.5,
        minLtv: 0,
        maxLtv: 80,
    };

    it("generates correct URL with required parameters", () => {
        const url = getMissingVariableRateUrl(baseParams);

        expect(url).toContain(`${AUTHOR.github}/issues/new`);
        expect(url).toContain("template=3-incorrect-rate.yml");
        expect(url).toContain("rate-name=aib-fixed-3yr-50");
    });

    it("includes fixed rate details in additional context", () => {
        const url = getMissingVariableRateUrl(baseParams);

        expect(urlContains(url, "3 Year Fixed")).toBe(true);
        expect(urlContains(url, "3.45%")).toBe(true);
        expect(urlContains(url, "3-year fixed")).toBe(true);
        expect(urlContains(url, "up to 80% LTV")).toBe(true);
    });

    it("shows LTV range when minLtv is greater than 0", () => {
        const url = getMissingVariableRateUrl({
            ...baseParams,
            minLtv: 60,
        });

        expect(urlContains(url, "60%-80% LTV")).toBe(true);
    });

    it("includes user search context", () => {
        const url = getMissingVariableRateUrl({
            ...baseParams,
            mode: "first-mortgage",
            buyerType: "ftb",
            berRating: "b2",
        });

        expect(urlContains(url, "First Mortgage")).toBe(true);
        expect(urlContains(url, "First Time Buyer")).toBe(true);
        expect(urlContains(url, "B2")).toBe(true);
    });

    it("maps remortgage mode correctly", () => {
        const url = getMissingVariableRateUrl({
            ...baseParams,
            mode: "remortgage",
        });

        expect(urlContains(url, "Remortgage / Switcher")).toBe(true);
    });

    it("maps buyer types correctly", () => {
        const buyerMappings: Record<string, string> = {
            ftb: "First Time Buyer",
            mover: "Home Mover / Owner Occupied",
            btl: "Buy To Let / 2nd Home",
        };

        for (const [buyerType, expected] of Object.entries(buyerMappings)) {
            const url = getMissingVariableRateUrl({ ...baseParams, buyerType });
            expect(urlContains(url, expected)).toBe(true);
        }
    });

    it("includes source URL when provided", () => {
        const url = getMissingVariableRateUrl({
            ...baseParams,
            ratesUrl: "https://aib.ie/rates",
        });

        expect(url).toContain("source=https");
    });

    it("works without optional fixedTerm", () => {
        const params = { ...baseParams };
        (params as Partial<typeof baseParams>).fixedTerm = undefined;

        const url = getMissingVariableRateUrl(params as typeof baseParams);

        expect(urlContains(url, "fixed")).toBe(true);
        expect(urlContains(url, "3-year")).toBe(false);
    });

    it("includes expected variable rate description", () => {
        const url = getMissingVariableRateUrl(baseParams);

        expect(
            urlContains(
                url,
                "A variable rate from AIB that covers 75.5% LTV for customers rolling off fixed terms",
            ),
        ).toBe(true);
    });
});
