import type { Page } from "@playwright/test";

/**
 * Fill a currency input field (handles the €-formatted display).
 * Clears the field, types the value, and blurs to trigger state update.
 */
export async function fillCurrencyInput(
    page: Page,
    labelOrId: string,
    value: number,
) {
    // Try by label first, fall back to id
    let input = page.getByLabel(labelOrId);
    const count = await input.count();
    if (count === 0) {
        input = page.locator(`#${labelOrId}`);
    }

    await input.click();
    await input.fill(value.toString());
    await input.blur();
}

/**
 * Wait for the rates table to be visible and loaded with data.
 */
export async function waitForRatesTable(page: Page) {
    // Wait for table to exist
    await page.waitForSelector("table", { timeout: 10000 });
    // Wait for actual data cells (not just skeleton rows) - look for td with content
    await page.waitForSelector("tbody tr td", { timeout: 15000 });
    // Wait for rate percentages to appear (proves data is loaded)
    await page.locator("table").last().waitFor({ state: "visible" });
    // Brief pause to let React finish rendering
    await page.waitForTimeout(300);
}

/**
 * Get values from a specific column by header name.
 * Useful for getting all Rate values, Monthly values, etc.
 */
export async function getColumnValues(
    page: Page,
    columnHeader: string,
): Promise<string[]> {
    // Find the column index by header text
    const headers = page.locator("thead th");
    const headerCount = await headers.count();

    let columnIndex = -1;
    for (let i = 0; i < headerCount; i++) {
        const headerText = await headers.nth(i).textContent();
        if (headerText?.includes(columnHeader)) {
            columnIndex = i;
            break;
        }
    }

    if (columnIndex === -1) {
        return [];
    }

    // Get all values from that column
    const rows = page.locator("tbody tr");
    const rowCount = await rows.count();
    const values: string[] = [];

    for (let i = 0; i < rowCount; i++) {
        const cell = rows.nth(i).locator("td").nth(columnIndex);
        const text = await cell.textContent();
        if (text) {
            values.push(text.trim());
        }
    }

    return values;
}

/**
 * Get the number of rows in the rates table body.
 */
export async function getTableRowCount(page: Page): Promise<number> {
    return page.locator("tbody tr").count();
}

/**
 * Click a select/combobox trigger and select an option.
 */
export async function selectOption(
    page: Page,
    triggerSelector: string,
    optionText: string,
) {
    await page.locator(triggerSelector).click();
    await page.getByRole("option", { name: optionText }).click();
}

/**
 * Standard test inputs for rates page that ensure rates appear (80% LTV).
 */
export const STANDARD_INPUTS = {
    propertyValue: 400000,
    mortgageAmount: 320000,
    term: 30,
    buyerType: "First Time Buyer",
    ber: "B2",
};

/**
 * Fill the standard form inputs for a valid rates search.
 */
export async function fillStandardInputs(page: Page) {
    await fillCurrencyInput(
        page,
        "Property Value",
        STANDARD_INPUTS.propertyValue,
    );
    await fillCurrencyInput(
        page,
        "Mortgage Amount",
        STANDARD_INPUTS.mortgageAmount,
    );
}

/**
 * Parse a currency string like "€1,347" to a number.
 */
export function parseCurrency(text: string): number {
    return Number.parseFloat(text.replace(/[€,]/g, ""));
}

/**
 * Parse a percentage string like "3.45%" to a number.
 */
export function parsePercentage(text: string): number {
    return Number.parseFloat(text.replace(/%/g, ""));
}
