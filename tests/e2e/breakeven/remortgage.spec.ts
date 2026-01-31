import { expect, test } from "@playwright/test";
import { fillCurrencyInput } from "../helpers";

test.describe("Remortgage Breakeven Calculator", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/breakeven/remortgage");
    });

    test.describe("page load", () => {
        test("page loads with correct title", async ({ page }) => {
            await expect(page).toHaveTitle(/Remortgage Breakeven/i);
        });

        test("displays calculator heading", async ({ page }) => {
            await expect(
                page.getByRole("heading", { name: "Remortgage Breakeven" }),
            ).toBeVisible();
        });

        test("displays form card with title", async ({ page }) => {
            await expect(
                page.getByText("Is Switching Worth It?"),
            ).toBeVisible();
        });

        test("displays calculate button disabled initially", async ({
            page,
        }) => {
            const button = page.getByRole("button", {
                name: /calculate breakeven/i,
            });
            await expect(button).toBeVisible();
            await expect(button).toBeDisabled();
        });
    });

    test.describe("form inputs", () => {
        test("displays property value input", async ({ page }) => {
            await expect(page.getByLabel("Property Value")).toBeVisible();
        });

        test("displays outstanding balance input", async ({ page }) => {
            await expect(page.getByLabel("Outstanding Balance")).toBeVisible();
        });

        test("displays current rate input", async ({ page }) => {
            await expect(
                page.getByLabel(/Current Interest Rate/),
            ).toBeVisible();
        });

        test("displays legal fees input", async ({ page }) => {
            await expect(page.getByLabel("Estimated Legal Fees")).toBeVisible();
        });

        test("displays new rate section", async ({ page }) => {
            await expect(page.getByText("New Interest Rate")).toBeVisible();
        });

        test("displays rate input mode tabs", async ({ page }) => {
            await expect(
                page.getByRole("tab", { name: "Choose from rates" }),
            ).toBeVisible();
            await expect(
                page.getByRole("tab", { name: "Enter manually" }),
            ).toBeVisible();
        });

        test("displays remaining term selector", async ({ page }) => {
            await expect(page.getByText("Remaining Term")).toBeVisible();
        });
    });

    test.describe("LTV calculation", () => {
        test("shows current LTV when values entered", async ({ page }) => {
            await fillCurrencyInput(page, "Property Value", 400000);
            await fillCurrencyInput(page, "Outstanding Balance", 250000);

            await expect(page.getByText(/Current LTV: 62\.5%/)).toBeVisible();
        });
    });

    test.describe("rate input modes", () => {
        test("can switch to manual rate entry", async ({ page }) => {
            await page.getByRole("tab", { name: "Enter manually" }).click();

            // Wait for the manual input to appear (uses id="newRate")
            await expect(page.locator("#newRate")).toBeVisible();
        });

        test("can enter new rate manually", async ({ page }) => {
            await page.getByRole("tab", { name: "Enter manually" }).click();

            const rateInput = page.locator("#newRate");
            await rateInput.fill("3.2");

            await expect(rateInput).toHaveValue("3.2");
        });
    });

    test.describe("advanced options", () => {
        test("displays advanced options collapsible", async ({ page }) => {
            await expect(
                page.getByRole("button", { name: /advanced options/i }),
            ).toBeVisible();
        });

        test("expands advanced options on click", async ({ page }) => {
            await page
                .getByRole("button", { name: /advanced options/i })
                .click();

            await expect(
                page.getByLabel(/Cashback from New Lender/),
            ).toBeVisible();
            await expect(
                page.getByLabel(/Early Repayment Charge/),
            ).toBeVisible();
        });
    });

    test.describe("form validation and calculation", () => {
        test("enables calculate button when form is complete", async ({
            page,
        }) => {
            await fillCurrencyInput(page, "Property Value", 400000);
            await fillCurrencyInput(page, "Outstanding Balance", 250000);
            await page.getByLabel(/Current Interest Rate/).fill("4.5");

            // Enter new rate manually
            await page.getByRole("tab", { name: "Enter manually" }).click();
            await page.locator("#newRate").fill("3.2");

            const button = page.getByRole("button", {
                name: /calculate breakeven/i,
            });
            await expect(button).not.toBeDisabled();
        });

        test("opens result dialog when calculate is clicked", async ({
            page,
        }) => {
            await fillCurrencyInput(page, "Property Value", 400000);
            await fillCurrencyInput(page, "Outstanding Balance", 250000);
            await page.getByLabel(/Current Interest Rate/).fill("4.5");

            await page.getByRole("tab", { name: "Enter manually" }).click();
            await page.locator("#newRate").fill("3.2");

            await page
                .getByRole("button", { name: /calculate breakeven/i })
                .click();

            await expect(page.getByRole("alertdialog")).toBeVisible();
        });

        test("result dialog shows breakeven analysis", async ({ page }) => {
            await fillCurrencyInput(page, "Property Value", 400000);
            await fillCurrencyInput(page, "Outstanding Balance", 250000);
            await page.getByLabel(/Current Interest Rate/).fill("4.5");

            await page.getByRole("tab", { name: "Enter manually" }).click();
            await page.locator("#newRate").fill("3.2");

            await page
                .getByRole("button", { name: /calculate breakeven/i })
                .click();

            // Check for result content
            await expect(page.getByRole("alertdialog")).toBeVisible();
            // Should show monthly savings or breakeven info
            await expect(
                page.getByText(/saving|breakeven|months/i).first(),
            ).toBeVisible();
        });
    });

    test.describe("result dialog actions", () => {
        test.beforeEach(async ({ page }) => {
            await fillCurrencyInput(page, "Property Value", 400000);
            await fillCurrencyInput(page, "Outstanding Balance", 250000);
            await page.getByLabel(/Current Interest Rate/).fill("4.5");

            await page.getByRole("tab", { name: "Enter manually" }).click();
            await page.locator("#newRate").fill("3.2");

            await page
                .getByRole("button", { name: /calculate breakeven/i })
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

    test.describe("validation errors", () => {
        test("shows error when balance exceeds property value", async ({
            page,
        }) => {
            await fillCurrencyInput(page, "Property Value", 100000);
            await fillCurrencyInput(page, "Outstanding Balance", 150000);

            await expect(
                page.getByText(/Balance cannot exceed property value/),
            ).toBeVisible();
        });
    });
});
