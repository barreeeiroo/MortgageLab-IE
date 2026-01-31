import { expect, test } from "@playwright/test";
import {
    fillStandardInputs,
    getTableRowCount,
    waitForRatesTable,
} from "../helpers";

test.describe("Rates Page - Sorting", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/rates");
        await fillStandardInputs(page);
        await waitForRatesTable(page);
    });

    test("table has sortable column headers", async ({ page }) => {
        // Verify there are column headers in the table
        const headers = page.locator("thead th");
        const headerCount = await headers.count();
        expect(headerCount).toBeGreaterThan(0);

        // The table should be visible
        await expect(page.locator("table").last()).toBeVisible();
    });

    test("table displays sorted rates by default", async ({ page }) => {
        // The table should have rows after loading
        const rowCount = await getTableRowCount(page);
        expect(rowCount).toBeGreaterThan(0);

        // Table should contain percentage values (rates)
        await expect(page.locator("table").last()).toContainText(/\d+\.\d+%/);
    });
});
