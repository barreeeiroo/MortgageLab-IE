import { expect, test } from "@playwright/test";
import { fillCurrencyInput } from "../helpers";

test.describe("Buy to Let Calculator", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/affordability/buy-to-let");
    });

    test.describe("page load", () => {
        test("page loads with correct title", async ({ page }) => {
            await expect(page).toHaveTitle(/Buy to Let/i);
        });

        test("displays calculator heading", async ({ page }) => {
            await expect(
                page.getByRole("heading", { name: "Buy to Let" }),
            ).toBeVisible();
        });

        test("displays form card with title", async ({ page }) => {
            await expect(
                page.getByText("How Much Can I Borrow?"),
            ).toBeVisible();
        });

        test("displays calculate button disabled initially", async ({
            page,
        }) => {
            const button = page.getByRole("button", { name: /calculate/i });
            await expect(button).toBeVisible();
            await expect(button).toBeDisabled();
        });
    });

    test.describe("form inputs", () => {
        test("displays income input", async ({ page }) => {
            await expect(
                page.getByLabel(/Gross Annual Salary/i).first(),
            ).toBeVisible();
        });

        test("displays deposit input", async ({ page }) => {
            await expect(page.getByLabel("Available Deposit")).toBeVisible();
        });

        test("displays expected rent input", async ({ page }) => {
            await expect(
                page.getByLabel("Expected Monthly Rent"),
            ).toBeVisible();
        });

        test("displays date of birth input", async ({ page }) => {
            await expect(
                page.getByPlaceholder("DD/MM/YYYY").first(),
            ).toBeVisible();
        });

        test("displays BER rating selector", async ({ page }) => {
            await expect(page.getByText("Expected BER Rating")).toBeVisible();
        });

        test("displays property type selector", async ({ page }) => {
            await expect(page.getByText("Property Type")).toBeVisible();
        });

        test("displays 30% deposit requirement note", async ({ page }) => {
            await expect(
                page.getByText(/requires minimum 30% deposit for buy-to-let/),
            ).toBeVisible();
        });
    });

    test.describe("applicant type toggle", () => {
        test("defaults to sole applicant", async ({ page }) => {
            // Sole applicant button should have default variant
            const soleButton = page.getByRole("button", {
                name: "Sole Applicant",
            });
            await expect(soleButton).toHaveAttribute("data-variant", "default");
        });

        test("can switch to joint applicants", async ({ page }) => {
            await page
                .getByRole("button", { name: "Joint Applicants" })
                .click();

            await expect(
                page.getByLabel(/Second Applicant's Gross Annual Salary/i),
            ).toBeVisible();
        });
    });

    test.describe("form validation and calculation", () => {
        test("enables calculate button when form is complete", async ({
            page,
        }) => {
            await fillCurrencyInput(page, "Gross Annual Salary", 80000);
            await fillCurrencyInput(page, "Available Deposit", 100000);
            await fillCurrencyInput(page, "Expected Monthly Rent", 1500);
            await page
                .getByPlaceholder("DD/MM/YYYY")
                .first()
                .fill("15/06/1990");

            const button = page.getByRole("button", { name: /calculate/i });
            await expect(button).not.toBeDisabled();
        });

        test("opens result dialog when calculate is clicked", async ({
            page,
        }) => {
            await fillCurrencyInput(page, "Gross Annual Salary", 80000);
            await fillCurrencyInput(page, "Available Deposit", 100000);
            await fillCurrencyInput(page, "Expected Monthly Rent", 1500);
            await page
                .getByPlaceholder("DD/MM/YYYY")
                .first()
                .fill("15/06/1990");

            await page.getByRole("button", { name: /calculate/i }).click();

            await expect(page.getByRole("alertdialog")).toBeVisible();
        });

        test("result dialog shows mortgage summary title when deposit constrained", async ({
            page,
        }) => {
            // Standard scenario - deposit is the constraint
            await fillCurrencyInput(page, "Gross Annual Salary", 100000);
            await fillCurrencyInput(page, "Available Deposit", 100000);
            await fillCurrencyInput(page, "Expected Monthly Rent", 2000);
            await page
                .getByPlaceholder("DD/MM/YYYY")
                .first()
                .fill("15/06/1990");

            await page.getByRole("button", { name: /calculate/i }).click();

            await expect(page.getByText("Your Mortgage Summary")).toBeVisible();
        });

        test("shows rental limited title when rent is constraint", async ({
            page,
        }) => {
            // High deposit, low rent scenario
            await fillCurrencyInput(page, "Gross Annual Salary", 200000);
            await fillCurrencyInput(page, "Available Deposit", 300000);
            await fillCurrencyInput(page, "Expected Monthly Rent", 800);
            await page
                .getByPlaceholder("DD/MM/YYYY")
                .first()
                .fill("15/06/1990");

            await page.getByRole("button", { name: /calculate/i }).click();

            await expect(
                page.getByText("Mortgage Summary (Limited by Rental Income)"),
            ).toBeVisible();
        });

        test("shows income limited title when income is constraint", async ({
            page,
        }) => {
            // Low income, high deposit scenario
            await fillCurrencyInput(page, "Gross Annual Salary", 40000);
            await fillCurrencyInput(page, "Available Deposit", 200000);
            await fillCurrencyInput(page, "Expected Monthly Rent", 2000);
            await page
                .getByPlaceholder("DD/MM/YYYY")
                .first()
                .fill("15/06/1990");

            await page.getByRole("button", { name: /calculate/i }).click();

            await expect(
                page.getByText("Mortgage Summary (Limited by Income)"),
            ).toBeVisible();
        });
    });

    test.describe("result dialog content", () => {
        test.beforeEach(async ({ page }) => {
            await fillCurrencyInput(page, "Gross Annual Salary", 80000);
            await fillCurrencyInput(page, "Available Deposit", 100000);
            await fillCurrencyInput(page, "Expected Monthly Rent", 1500);
            await page
                .getByPlaceholder("DD/MM/YYYY")
                .first()
                .fill("15/06/1990");
            await page.getByRole("button", { name: /calculate/i }).click();
            await expect(page.getByRole("alertdialog")).toBeVisible();
        });

        test("displays rental analysis section", async ({ page }) => {
            await expect(page.getByText("Rental Analysis")).toBeVisible();
        });

        test("displays expected monthly rent in dialog", async ({ page }) => {
            // Use dialog-specific locator to avoid matching the input label
            const dialog = page.getByRole("alertdialog");
            await expect(
                dialog.getByText("Expected Monthly Rent").first(),
            ).toBeVisible();
        });

        test("displays estimated mortgage payment", async ({ page }) => {
            await expect(page.getByText("Est. Mortgage Payment")).toBeVisible();
        });

        test("displays net monthly before tax", async ({ page }) => {
            await expect(
                page.getByText("Net Monthly (before tax)"),
            ).toBeVisible();
        });

        test("displays rental coverage metric", async ({ page }) => {
            // Use dialog-specific locator to avoid matching the result card metric
            const dialog = page.getByRole("alertdialog");
            await expect(
                dialog.getByText("Rental Coverage").first(),
            ).toBeVisible();
        });
    });

    test.describe("result dialog actions", () => {
        test.beforeEach(async ({ page }) => {
            await fillCurrencyInput(page, "Gross Annual Salary", 80000);
            await fillCurrencyInput(page, "Available Deposit", 100000);
            await fillCurrencyInput(page, "Expected Monthly Rent", 1500);
            await page
                .getByPlaceholder("DD/MM/YYYY")
                .first()
                .fill("15/06/1990");
            await page.getByRole("button", { name: /calculate/i }).click();
            await expect(page.getByRole("alertdialog")).toBeVisible();
        });

        test("displays Compare Mortgage Rates button", async ({ page }) => {
            await expect(
                page.getByRole("button", { name: /compare mortgage rates/i }),
            ).toBeVisible();
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

    test.describe("joint application calculation", () => {
        test("calculates with combined income", async ({ page }) => {
            await page
                .getByRole("button", { name: "Joint Applicants" })
                .click();

            // In joint mode, label changes to "Your Gross Annual Salary"
            await fillCurrencyInput(page, "Your Gross Annual Salary", 60000);
            await page
                .getByPlaceholder("DD/MM/YYYY")
                .first()
                .fill("15/06/1990");

            await fillCurrencyInput(
                page,
                "Second Applicant's Gross Annual Salary",
                50000,
            );
            await page.getByPlaceholder("DD/MM/YYYY").nth(1).fill("20/03/1992");

            await fillCurrencyInput(page, "Available Deposit", 100000);
            await fillCurrencyInput(page, "Expected Monthly Rent", 1500);

            await page.getByRole("button", { name: /calculate/i }).click();

            await expect(page.getByRole("alertdialog")).toBeVisible();
        });
    });
});
