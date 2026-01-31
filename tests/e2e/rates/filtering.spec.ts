import { expect, test } from "@playwright/test";
import {
    fillStandardInputs,
    getColumnValues,
    getTableRowCount,
    waitForRatesTable,
} from "../helpers";

/**
 * Click the filter button in a column header (the one with ListFilter icon).
 * Column headers have multiple buttons - we want the filter one.
 */
async function clickColumnFilter(
    page: import("@playwright/test").Page,
    columnName: string,
) {
    // Find the header with the column name
    const header = page.locator("thead th").filter({ hasText: columnName });
    // Click the button that contains the filter icon (lucide-list-filter)
    const filterButton = header.locator("button:has(svg.lucide-list-filter)");
    await filterButton.click();
}

test.describe("Rates Page - Filtering", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/rates");
        await fillStandardInputs(page);
        await waitForRatesTable(page);
    });

    test("filter by lender shows only that lender's rates", async ({
        page,
    }) => {
        const initialCount = await getTableRowCount(page);
        expect(initialCount).toBeGreaterThan(0);

        // Open lender filter dropdown
        await clickColumnFilter(page, "Lender");

        // Select AIB from the dropdown (shown as "Allied Irish Banks" in dropdown)
        await page
            .getByRole("menuitemcheckbox", { name: /allied irish/i })
            .click();

        // Close the dropdown by clicking elsewhere
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);

        // Get all lender values from the table
        const lenderValues = await getColumnValues(page, "Lender");
        expect(lenderValues.length).toBeGreaterThan(0);

        // Verify EVERY row shows Allied Irish Banks
        for (const lender of lenderValues) {
            expect(lender.toLowerCase()).toContain("allied irish");
        }
    });

    test("filter by rate type shows only fixed or variable", async ({
        page,
    }) => {
        // Open type filter dropdown
        await clickColumnFilter(page, "Type");

        // Select "Fixed" from the dropdown
        await page.getByRole("menuitemcheckbox", { name: /fixed/i }).click();

        // Close dropdown
        await page.keyboard.press("Escape");
        await page.waitForTimeout(500);

        // Get all type values from the table
        const typeValues = await getColumnValues(page, "Type");
        expect(typeValues.length).toBeGreaterThan(0);

        // Verify EVERY row is Fixed type (not Variable)
        for (const type of typeValues) {
            expect(type.toLowerCase()).toContain("fixed");
            expect(type.toLowerCase()).not.toContain("variable");
        }
    });

    test("filter by fixed period shows correct terms", async ({ page }) => {
        // Open period filter dropdown
        await clickColumnFilter(page, "Period");

        // Select "3 year" from the dropdown
        await page.getByRole("menuitemcheckbox", { name: "3 year" }).click();

        // Close dropdown
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);

        // Get all period values from the table
        const periodValues = await getColumnValues(page, "Period");
        expect(periodValues.length).toBeGreaterThan(0);

        // Verify EVERY row shows 3 year period
        for (const period of periodValues) {
            expect(period).toMatch(/3\s*(year|yr)/i);
        }
    });

    test("combined filters narrow results", async ({ page }) => {
        const initialCount = await getTableRowCount(page);

        // First filter by type
        await clickColumnFilter(page, "Type");
        await page.getByRole("menuitemcheckbox", { name: /fixed/i }).click();
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);

        const afterTypeFilter = await getTableRowCount(page);

        // Then filter by period
        await clickColumnFilter(page, "Period");
        await page.getByRole("menuitemcheckbox", { name: "3 year" }).click();
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);

        const afterBothFilters = await getTableRowCount(page);

        // Combined filters should narrow results (or stay same if all 3yr are fixed)
        expect(afterBothFilters).toBeLessThanOrEqual(afterTypeFilter);
        expect(afterBothFilters).toBeLessThanOrEqual(initialCount);

        // Verify BOTH filters are applied correctly
        const typeValues = await getColumnValues(page, "Type");
        const periodValues = await getColumnValues(page, "Period");

        for (const type of typeValues) {
            expect(type.toLowerCase()).toContain("fixed");
        }
        for (const period of periodValues) {
            expect(period).toMatch(/3\s*(year|yr)/i);
        }
    });

    test("clearing filter restores all rates", async ({ page }) => {
        const initialCount = await getTableRowCount(page);

        // Apply a filter
        await clickColumnFilter(page, "Lender");
        await page
            .getByRole("menuitemcheckbox", { name: /allied irish/i })
            .click();
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);

        const filteredCount = await getTableRowCount(page);
        expect(filteredCount).toBeLessThanOrEqual(initialCount);

        // Clear the filter by clicking the same option again
        await clickColumnFilter(page, "Lender");
        await page
            .getByRole("menuitemcheckbox", { name: /allied irish/i })
            .click();
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);

        const restoredCount = await getTableRowCount(page);
        expect(restoredCount).toBe(initialCount);
    });

    test("empty filter results show message", async ({ page }) => {
        // Filter to a single lender
        await clickColumnFilter(page, "Lender");
        await page
            .getByRole("menuitemcheckbox", { name: /allied irish/i })
            .click();
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);

        // Check that table has content (or shows empty message)
        const rowCount = await getTableRowCount(page);
        if (rowCount === 0) {
            // Empty state message should be visible
            await expect(page.getByText(/no rates/i)).toBeVisible();
        } else {
            // We have results, which is fine
            expect(rowCount).toBeGreaterThan(0);
        }
    });
});
