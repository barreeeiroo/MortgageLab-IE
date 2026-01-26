import { expect, test } from "@playwright/test";
import { fillCurrencyInput } from "../helpers";

test.describe("Rent vs Buy Calculator", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/breakeven/rent-vs-buy");
	});

	test.describe("page load", () => {
		test("page loads with correct title", async ({ page }) => {
			await expect(page).toHaveTitle(/Rent vs Buy/i);
		});

		test("displays calculator heading", async ({ page }) => {
			await expect(
				page.getByRole("heading", { name: "Rent vs Buy" }),
			).toBeVisible();
		});

		test("displays form card with title", async ({ page }) => {
			await expect(page.getByText("Should I Rent or Buy?")).toBeVisible();
		});

		test("displays calculate button disabled initially", async ({ page }) => {
			const button = page.getByRole("button", { name: /calculate breakeven/i });
			await expect(button).toBeVisible();
			await expect(button).toBeDisabled();
		});
	});

	test.describe("form inputs", () => {
		test("displays property value input", async ({ page }) => {
			await expect(page.getByLabel("Property Value")).toBeVisible();
		});

		test("displays deposit input", async ({ page }) => {
			await expect(page.getByLabel("Deposit (excl. fees)")).toBeVisible();
		});

		test("displays current rent input", async ({ page }) => {
			await expect(page.getByLabel("Current Monthly Rent")).toBeVisible();
		});

		test("displays legal fees input", async ({ page }) => {
			await expect(page.getByLabel("Estimated Legal Fees")).toBeVisible();
		});

		test("displays property type selector", async ({ page }) => {
			await expect(page.getByText("Property Type")).toBeVisible();
		});

		test("displays interest rate section", async ({ page }) => {
			await expect(page.getByText("Interest Rate")).toBeVisible();
		});

		test("displays rate input mode tabs", async ({ page }) => {
			await expect(
				page.getByRole("tab", { name: "Choose from rates" }),
			).toBeVisible();
			await expect(
				page.getByRole("tab", { name: "Enter manually" }),
			).toBeVisible();
		});
	});

	test.describe("auto-deposit calculation", () => {
		test("auto-fills deposit at 10% of property value", async ({ page }) => {
			await fillCurrencyInput(page, "Property Value", 400000);

			const depositInput = page.getByLabel("Deposit (excl. fees)");
			await expect(depositInput).toHaveValue("€40,000");
		});

		test("shows LTV calculation", async ({ page }) => {
			await fillCurrencyInput(page, "Property Value", 400000);
			await fillCurrencyInput(page, "Deposit (excl. fees)", 40000);

			await expect(page.getByText(/LTV: 90\.0%/)).toBeVisible();
		});

		test("shows stamp duty calculation", async ({ page }) => {
			await fillCurrencyInput(page, "Property Value", 400000);

			await expect(page.getByText(/Stamp Duty:/)).toBeVisible();
		});
	});

	test.describe("rate input modes", () => {
		test("can switch to manual rate entry", async ({ page }) => {
			await page.getByRole("tab", { name: "Enter manually" }).click();

			await expect(page.getByRole("textbox", { name: "Rate" })).toBeVisible();
		});

		test("can enter manual rate", async ({ page }) => {
			await page.getByRole("tab", { name: "Enter manually" }).click();

			const rateInput = page.getByRole("textbox", { name: "Rate" });
			await rateInput.fill("3.5");

			await expect(rateInput).toHaveValue("3.5");
		});
	});

	test.describe("advanced options", () => {
		test("displays advanced options collapsible", async ({ page }) => {
			await expect(
				page.getByRole("button", { name: /advanced options/i }),
			).toBeVisible();
		});

		test("expands advanced options on click", async ({ page }) => {
			await page.getByRole("button", { name: /advanced options/i }).click();

			// Check for "If Renting" section inputs
			await expect(page.getByLabel("Annual Rent Increase")).toBeVisible();
			await expect(page.getByLabel("Investment Return")).toBeVisible();

			// Check for "If Buying" section inputs
			await expect(page.getByLabel("Home Appreciation")).toBeVisible();
			await expect(page.getByLabel("Maintenance")).toBeVisible();
			await expect(page.getByLabel("Sale Costs")).toBeVisible();
		});
	});

	test.describe("form validation and calculation", () => {
		test("enables calculate button when form is complete", async ({ page }) => {
			await fillCurrencyInput(page, "Property Value", 400000);
			await fillCurrencyInput(page, "Deposit (excl. fees)", 40000);
			await fillCurrencyInput(page, "Current Monthly Rent", 2000);

			// Enter rate manually
			await page.getByRole("tab", { name: "Enter manually" }).click();
			await page.getByRole("textbox", { name: "Rate" }).fill("3.5");

			const button = page.getByRole("button", { name: /calculate breakeven/i });
			await expect(button).not.toBeDisabled();
		});

		test("opens result dialog when calculate is clicked", async ({ page }) => {
			await fillCurrencyInput(page, "Property Value", 400000);
			await fillCurrencyInput(page, "Deposit (excl. fees)", 40000);
			await fillCurrencyInput(page, "Current Monthly Rent", 2000);

			await page.getByRole("tab", { name: "Enter manually" }).click();
			await page.getByRole("textbox", { name: "Rate" }).fill("3.5");

			await page.getByRole("button", { name: /calculate breakeven/i }).click();

			await expect(page.getByRole("alertdialog")).toBeVisible();
		});

		test("result dialog shows breakeven analysis", async ({ page }) => {
			await fillCurrencyInput(page, "Property Value", 400000);
			await fillCurrencyInput(page, "Deposit (excl. fees)", 40000);
			await fillCurrencyInput(page, "Current Monthly Rent", 2000);

			await page.getByRole("tab", { name: "Enter manually" }).click();
			await page.getByRole("textbox", { name: "Rate" }).fill("3.5");

			await page.getByRole("button", { name: /calculate breakeven/i }).click();

			// Check for result content
			await expect(page.getByRole("alertdialog")).toBeVisible();
			// Results should include some analysis
			await expect(
				page.getByText(/breakeven|years|months/i).first(),
			).toBeVisible();
		});
	});

	test.describe("result dialog actions", () => {
		test.beforeEach(async ({ page }) => {
			await fillCurrencyInput(page, "Property Value", 400000);
			await fillCurrencyInput(page, "Deposit (excl. fees)", 40000);
			await fillCurrencyInput(page, "Current Monthly Rent", 2000);

			await page.getByRole("tab", { name: "Enter manually" }).click();
			await page.getByRole("textbox", { name: "Rate" }).fill("3.5");

			await page.getByRole("button", { name: /calculate breakeven/i }).click();
			await expect(page.getByRole("alertdialog")).toBeVisible();
		});

		test("displays Export PDF button", async ({ page }) => {
			await expect(
				page.getByRole("button", { name: /export pdf/i }),
			).toBeVisible();
		});

		test("displays Share button", async ({ page }) => {
			await expect(page.getByRole("button", { name: /share/i })).toBeVisible();
		});

		test("closes dialog when Close button is clicked", async ({ page }) => {
			await page.getByRole("button", { name: /close/i }).click();

			await expect(page.getByRole("alertdialog")).not.toBeVisible();
		});
	});

	test.describe("validation errors", () => {
		test("shows error when deposit exceeds property value", async ({
			page,
		}) => {
			await fillCurrencyInput(page, "Property Value", 100000);
			await fillCurrencyInput(page, "Deposit (excl. fees)", 150000);

			await expect(
				page.getByText(/Deposit cannot exceed property value/),
			).toBeVisible();
		});
	});
});
