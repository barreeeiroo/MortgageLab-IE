import { expect, test } from "@playwright/test";
import { fillCurrencyInput } from "../helpers";

test.describe("First Time Buyer Calculator", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/affordability/first-time-buyer");
    });

    test.describe("page load", () => {
        test("page loads with correct title", async ({ page }) => {
            await expect(page).toHaveTitle(/First Time Buyer/i);
        });

        test("displays calculator heading", async ({ page }) => {
            await expect(
                page.getByRole("heading", { name: "First Time Buyer" }),
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

        test("displays savings input", async ({ page }) => {
            await expect(
                page.getByLabel(/Total Savings for Deposit/i),
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

        test("displays self-build checkbox", async ({ page }) => {
            await expect(
                page.getByLabel(/Self Build \(building on land you own\)/),
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

            // Second applicant fields should appear
            await expect(
                page.getByLabel(/Second Applicant's Gross Annual Salary/i),
            ).toBeVisible();
            await expect(
                page.getByPlaceholder("DD/MM/YYYY").nth(1),
            ).toBeVisible();
        });

        test("hides second applicant fields when switching back to sole", async ({
            page,
        }) => {
            // Switch to joint
            await page
                .getByRole("button", { name: "Joint Applicants" })
                .click();
            await expect(
                page.getByLabel(/Second Applicant's Gross Annual Salary/i),
            ).toBeVisible();

            // Switch back to sole
            await page.getByRole("button", { name: "Sole Applicant" }).click();
            await expect(
                page.getByLabel(/Second Applicant's Gross Annual Salary/i),
            ).not.toBeVisible();
        });
    });

    test.describe("self-build mode", () => {
        test("shows site value input when self-build is checked", async ({
            page,
        }) => {
            await page.getByLabel(/Self Build/).click();

            await expect(page.getByLabel("Site Value")).toBeVisible();
        });

        test("changes savings label in self-build mode", async ({ page }) => {
            await page.getByLabel(/Self Build/).click();

            await expect(page.getByLabel("Additional Savings")).toBeVisible();
            await expect(
                page.getByLabel(/Total Savings for Deposit/),
            ).not.toBeVisible();
        });
    });

    test.describe("form validation and calculation", () => {
        test("enables calculate button when form is complete", async ({
            page,
        }) => {
            await fillCurrencyInput(page, "Gross Annual Salary", 80000);
            await fillCurrencyInput(page, "Total Savings for Deposit", 40000);
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
            await fillCurrencyInput(page, "Total Savings for Deposit", 40000);
            await page
                .getByPlaceholder("DD/MM/YYYY")
                .first()
                .fill("15/06/1990");

            await page.getByRole("button", { name: /calculate/i }).click();

            await expect(page.getByRole("alertdialog")).toBeVisible();
        });

        test("result dialog shows mortgage summary title", async ({ page }) => {
            await fillCurrencyInput(page, "Gross Annual Salary", 80000);
            await fillCurrencyInput(page, "Total Savings for Deposit", 100000);
            await page
                .getByPlaceholder("DD/MM/YYYY")
                .first()
                .fill("15/06/1990");

            await page.getByRole("button", { name: /calculate/i }).click();

            await expect(page.getByText("Your Mortgage Summary")).toBeVisible();
        });

        test("shows adjusted title when savings constrained", async ({
            page,
        }) => {
            // High income, low savings scenario
            await fillCurrencyInput(page, "Gross Annual Salary", 100000);
            await fillCurrencyInput(page, "Total Savings for Deposit", 20000);
            await page
                .getByPlaceholder("DD/MM/YYYY")
                .first()
                .fill("15/06/1990");

            await page.getByRole("button", { name: /calculate/i }).click();

            await expect(
                page.getByText("Mortgage Summary (Adjusted for Savings)"),
            ).toBeVisible();
        });
    });

    test.describe("result dialog actions", () => {
        test.beforeEach(async ({ page }) => {
            await fillCurrencyInput(page, "Gross Annual Salary", 80000);
            await fillCurrencyInput(page, "Total Savings for Deposit", 100000);
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

        test("displays Rent vs Buy Calculator link", async ({ page }) => {
            await expect(
                page.getByRole("button", { name: /rent vs buy calculator/i }),
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

            await fillCurrencyInput(page, "Total Savings for Deposit", 100000);

            await page.getByRole("button", { name: /calculate/i }).click();

            await expect(page.getByRole("alertdialog")).toBeVisible();
            await expect(page.getByText("Your Mortgage Summary")).toBeVisible();
        });
    });
});
