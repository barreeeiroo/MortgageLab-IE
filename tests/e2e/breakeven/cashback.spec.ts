import { expect, test } from "@playwright/test";
import { fillCurrencyInput } from "../helpers";

test.describe("Cashback Comparison Calculator", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/breakeven/cashback");
    });

    test.describe("page load", () => {
        test("page loads with correct title", async ({ page }) => {
            await expect(page).toHaveTitle(/Cashback Comparison/i);
        });

        test("displays calculator heading", async ({ page }) => {
            await expect(
                page.getByRole("heading", { name: "Cashback Comparison" }),
            ).toBeVisible();
        });

        test("displays form card with title", async ({ page }) => {
            await expect(
                page.getByText("Compare Cashback Options"),
            ).toBeVisible();
        });

        test("displays compare button disabled initially", async ({ page }) => {
            const button = page.getByRole("button", {
                name: /compare options/i,
            });
            await expect(button).toBeVisible();
            await expect(button).toBeDisabled();
        });
    });

    test.describe("form inputs", () => {
        test("displays mortgage amount input", async ({ page }) => {
            await expect(page.getByLabel("Mortgage Amount")).toBeVisible();
        });

        test("displays mortgage term selector", async ({ page }) => {
            await expect(page.getByText("Mortgage Term")).toBeVisible();
        });

        test("displays fixed period selector", async ({ page }) => {
            await expect(page.getByLabel("Fixed Period")).toBeVisible();
        });

        test("displays two default option cards", async ({ page }) => {
            // Check for option input fields (should have at least 2)
            const optionLabels = page.locator("input[placeholder*='Option']");
            await expect(optionLabels).toHaveCount(2);
        });

        test("displays add option button", async ({ page }) => {
            await expect(
                page.getByRole("button", { name: /add option/i }),
            ).toBeVisible();
        });
    });

    test.describe("option management", () => {
        test("can add a third option", async ({ page }) => {
            await page.getByRole("button", { name: /add option/i }).click();

            const optionLabels = page.locator("input[placeholder*='Option']");
            await expect(optionLabels).toHaveCount(3);
        });

        test("can remove an option when more than 2 exist", async ({
            page,
        }) => {
            // Add a third option first
            await page.getByRole("button", { name: /add option/i }).click();

            // Find and click remove button
            const removeButtons = page.getByRole("button", {
                name: /remove option/i,
            });
            await removeButtons.first().click();

            const optionLabels = page.locator("input[placeholder*='Option']");
            await expect(optionLabels).toHaveCount(2);
        });

        test("cannot add more than 5 options", async ({ page }) => {
            // Add options until we have 5
            for (let i = 0; i < 3; i++) {
                await page.getByRole("button", { name: /add option/i }).click();
            }

            // Add option button should be hidden when at max
            await expect(
                page.getByRole("button", { name: /add option/i }),
            ).not.toBeVisible();
        });
    });

    test.describe("rate input modes", () => {
        test("can switch to manual rate entry for an option", async ({
            page,
        }) => {
            // Click "Enter manually" tab for first option
            await page
                .getByRole("tab", { name: "Enter manually" })
                .first()
                .click();

            // Rate input should be visible
            await expect(
                page.locator("input[placeholder='e.g. 3.45']").first(),
            ).toBeVisible();
        });
    });

    test.describe("cashback configuration", () => {
        test("can toggle between percentage and flat cashback", async ({
            page,
        }) => {
            // Find the toggle group
            await expect(
                page.getByRole("radio", { name: /percentage/i }).first(),
            ).toBeVisible();
            await expect(
                page.getByRole("radio", { name: /flat amount/i }).first(),
            ).toBeVisible();
        });

        test("can enter cashback percentage", async ({ page }) => {
            const cashbackInput = page
                .locator("input[placeholder='2']")
                .first();
            await cashbackInput.fill("2.5");
            await expect(cashbackInput).toHaveValue("2.5");
        });
    });

    test.describe("form validation and calculation", () => {
        test("enables compare button when form is complete", async ({
            page,
        }) => {
            await fillCurrencyInput(page, "Mortgage Amount", 300000);

            // Enter rates for both options manually
            const manualTabs = page.getByRole("tab", {
                name: "Enter manually",
            });
            await manualTabs.first().click();
            await page
                .locator("input[placeholder='e.g. 3.45']")
                .first()
                .fill("3.5");

            await manualTabs.nth(1).click();
            await page
                .locator("input[placeholder='e.g. 3.45']")
                .nth(1)
                .fill("3.8");

            const button = page.getByRole("button", {
                name: /compare options/i,
            });
            await expect(button).not.toBeDisabled();
        });

        test("opens result dialog when compare is clicked", async ({
            page,
        }) => {
            await fillCurrencyInput(page, "Mortgage Amount", 300000);

            // Enter rates for both options manually
            const manualTabs = page.getByRole("tab", {
                name: "Enter manually",
            });
            await manualTabs.first().click();
            await page
                .locator("input[placeholder='e.g. 3.45']")
                .first()
                .fill("3.5");

            await manualTabs.nth(1).click();
            await page
                .locator("input[placeholder='e.g. 3.45']")
                .nth(1)
                .fill("3.8");

            await page
                .getByRole("button", { name: /compare options/i })
                .click();

            await expect(page.getByRole("alertdialog")).toBeVisible();
        });
    });

    test.describe("result dialog actions", () => {
        test.beforeEach(async ({ page }) => {
            await fillCurrencyInput(page, "Mortgage Amount", 300000);

            const manualTabs = page.getByRole("tab", {
                name: "Enter manually",
            });
            await manualTabs.first().click();
            await page
                .locator("input[placeholder='e.g. 3.45']")
                .first()
                .fill("3.5");

            await manualTabs.nth(1).click();
            await page
                .locator("input[placeholder='e.g. 3.45']")
                .nth(1)
                .fill("3.8");

            await page
                .getByRole("button", { name: /compare options/i })
                .click();
            await expect(page.getByRole("alertdialog")).toBeVisible();
        });

        test("displays Export PDF button", async ({ page }) => {
            await expect(
                page.getByRole("button", { name: /export pdf/i }),
            ).toBeVisible();
        });

        test("displays Share button", async ({ page }) => {
            await expect(
                page.getByRole("button", { name: /share/i }),
            ).toBeVisible();
        });

        test("closes dialog when Close button is clicked", async ({ page }) => {
            await page.getByRole("button", { name: /close/i }).click();

            await expect(page.getByRole("alertdialog")).not.toBeVisible();
        });
    });
});
