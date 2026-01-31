import { expect, test } from "@playwright/test";
import {
    fillCurrencyInput,
    fillStandardInputs,
    getTableRowCount,
    waitForRatesTable,
} from "../helpers";

// Run tests in this file serially to avoid race conditions
test.describe.configure({ mode: "serial" });

test.describe("Rates Page - Form Inputs", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/rates");
    });

    test("page loads with form inputs visible", async ({ page }) => {
        // Check form inputs are present
        await expect(page.getByLabel("Property Value")).toBeVisible();
        await expect(page.getByLabel("Mortgage Amount")).toBeVisible();

        // Info message shown when form is empty
        await expect(
            page.getByText("Enter your property details above"),
        ).toBeVisible();
    });

    test("filling property and mortgage shows rates table", async ({
        page,
    }) => {
        await fillStandardInputs(page);
        await waitForRatesTable(page);

        // Table should have rows
        const rowCount = await getTableRowCount(page);
        expect(rowCount).toBeGreaterThan(0);
    });

    test("LTV is calculated and displayed", async ({ page }) => {
        await fillCurrencyInput(page, "Property Value", 400000);
        await fillCurrencyInput(page, "Mortgage Amount", 320000);
        // Wait for calculations to update
        await page.waitForTimeout(200);

        // LTV should show 80%
        const ltvInput = page.locator("#ltvRange");
        await expect(ltvInput).toHaveValue("80.00%");
    });

    test("deposit is calculated correctly", async ({ page }) => {
        await fillCurrencyInput(page, "Property Value", 400000);
        await fillCurrencyInput(page, "Mortgage Amount", 320000);
        // Wait for calculations to update
        await page.waitForTimeout(200);

        // Deposit should be €80,000 (400k - 320k)
        const depositInput = page.locator("#deposit");
        await expect(depositInput).toHaveValue("€80,000");
    });

    test("LTV error appears when above 90%", async ({ page }) => {
        await fillCurrencyInput(page, "Property Value", 300000);
        await fillCurrencyInput(page, "Mortgage Amount", 285000); // 95% LTV
        // Wait for calculations to update
        await page.waitForTimeout(200);

        // Error message should appear (LTV above max 90%)
        await expect(page.getByText(/Maximum LTV/i)).toBeVisible();

        // LTV input should have destructive styling
        const ltvInput = page.locator("#ltvRange");
        await expect(ltvInput).toHaveClass(/text-destructive/);
    });

    test("quick LTV buttons set correct mortgage amount", async ({ page }) => {
        await fillCurrencyInput(page, "Property Value", 400000);
        // Wait for buttons to enable
        await page.waitForTimeout(200);

        // Click the 80% button
        await page.getByRole("button", { name: "80%" }).click();
        // Wait for mortgage to update
        await page.waitForTimeout(200);

        // Mortgage should be 320,000 (80% of 400k)
        const mortgageInput = page.getByLabel("Mortgage Amount");
        await expect(mortgageInput).toHaveValue("€320,000");
    });

    test("quick LTV buttons are disabled when property is 0", async ({
        page,
    }) => {
        // Don't fill property value, buttons should be disabled
        const button80 = page.getByRole("button", { name: "80%" });
        await expect(button80).toBeDisabled();
    });

    test("switching to remortgage mode changes form", async ({ page }) => {
        // Click the Mortgage Switch tab
        await page.getByRole("tab", { name: "Mortgage Switch" }).click();

        // Labels should change
        await expect(page.getByLabel("Outstanding Balance")).toBeVisible();
        await expect(
            page.getByLabel("Current Monthly Repayment"),
        ).toBeVisible();

        // Deposit field should not be visible in remortgage mode
        await expect(page.locator("#deposit")).not.toBeVisible();
    });

    test("term selector updates correctly", async ({ page }) => {
        // Fill form first
        await fillStandardInputs(page);
        await waitForRatesTable(page);

        // Get initial row count
        const initialCount = await getTableRowCount(page);
        expect(initialCount).toBeGreaterThan(0);

        // Change term - click the term dropdown (it's a combobox button)
        await page.locator("#mortgageTerm").click();
        // Select 20 years (uses button role in popover, not option)
        await page.getByRole("button", { name: "20 years" }).click();

        // Table should still have rates (term doesn't filter, just changes payments)
        await waitForRatesTable(page);
        const newCount = await getTableRowCount(page);
        expect(newCount).toBeGreaterThan(0);
    });

    test("BER selector is visible and selectable", async ({ page }) => {
        // BER dropdown should be present
        const berSelector = page.locator("#berRating");
        await expect(berSelector).toBeVisible();

        // Click and select a value
        await berSelector.click();
        await page.getByRole("option", { name: "A1" }).click();

        // Should update (green rates may now be included)
        await expect(berSelector).toContainText("A1");
    });
});
