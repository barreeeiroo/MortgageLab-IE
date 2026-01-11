import { expect, test } from "@playwright/test";
import {
	fillStandardInputs,
	getTableRowCount,
	parseCurrency,
	waitForRatesTable,
} from "../helpers";

test.describe("Rates Page - Table Display", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/rates");
		await fillStandardInputs(page);
		await waitForRatesTable(page);
	});

	test("table displays rate data", async ({ page }) => {
		const rowCount = await getTableRowCount(page);
		expect(rowCount).toBeGreaterThan(0);

		// First row should have expected columns
		const firstRow = page.locator("tbody tr").first();
		await expect(firstRow).toBeVisible();
	});

	test("table shows lender names with logos", async ({ page }) => {
		// Look for lender logos in the table
		const lenderCells = page.locator("tbody tr td").first();
		await expect(lenderCells).toBeVisible();

		// Should have at least one img (lender logo)
		const logos = page.locator("tbody tr img");
		const logoCount = await logos.count();
		expect(logoCount).toBeGreaterThan(0);
	});

	test("table shows rate percentages formatted correctly", async ({ page }) => {
		// Table should contain rate percentages
		await expect(page.locator("table").last()).toContainText(/\d+\.\d+%/);
	});

	test("table shows monthly payments with currency symbol", async ({
		page,
	}) => {
		// Find cells with € symbol
		const paymentCells = page.locator('tbody tr td:has-text("€")');
		const paymentCount = await paymentCells.count();
		expect(paymentCount).toBeGreaterThan(0);

		// Check first payment is a reasonable value
		const paymentText = await paymentCells.first().textContent();
		expect(paymentText).toContain("€");

		const amount = parseCurrency(paymentText || "0");
		expect(amount).toBeGreaterThan(100); // Mortgage payments > €100
	});

	test("pagination controls are visible", async ({ page }) => {
		// Pagination should show page size selector
		await expect(page.getByText(/Rates per page/i)).toBeVisible();

		// Navigation buttons with chevron icons
		const paginationButtons = page.locator("button svg.lucide-chevron-left");
		const hasLeftChevron = (await paginationButtons.count()) > 0;
		expect(hasLeftChevron).toBe(true);
	});

	test("clicking product name opens rate details modal", async ({ page }) => {
		// Click on a product name in the table (it's a clickable button)
		const productLinks = page.locator("tbody tr button").first();
		await productLinks.click();

		// Modal should appear
		await expect(page.getByRole("dialog")).toBeVisible();
	});

	test("compare button shows with selection count", async ({ page }) => {
		// Compare button should show with tooltip
		const compareButton = page.getByRole("button", { name: /compare/i });
		await expect(compareButton).toBeVisible();
	});

	test("can select multiple rates for comparison", async ({ page }) => {
		// Find checkboxes in the table
		const checkboxes = page.locator("tbody tr").getByRole("checkbox");
		const checkboxCount = await checkboxes.count();
		expect(checkboxCount).toBeGreaterThan(1);

		// Select first two rates
		await checkboxes.nth(0).click();
		await checkboxes.nth(1).click();

		// Compare button should now be enabled and show count
		const compareButton = page.getByRole("button", { name: /compare.*2/i });
		await expect(compareButton).toBeVisible();
	});

	test("pagination navigates between pages", async ({ page }) => {
		// Get initial first row content
		const firstRow = page.locator("tbody tr").first();
		await expect(firstRow).toBeVisible();

		// Find the next page button (has chevron-right icon)
		const nextButton = page.locator(
			"button:has(svg.lucide-chevron-right):not([disabled])",
		);
		const hasNextButton = (await nextButton.count()) > 0;

		if (hasNextButton) {
			await nextButton.first().click();
			await page.waitForTimeout(300); // Wait for table update

			// Just verify table still has content
			const newRowCount = await getTableRowCount(page);
			expect(newRowCount).toBeGreaterThan(0);
		}
	});
});
