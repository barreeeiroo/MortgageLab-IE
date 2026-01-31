import { expect, test } from "@playwright/test";

test.describe("Smoke Tests", () => {
    test("homepage loads", async ({ page }) => {
        await page.goto("/");
        await expect(page).toHaveTitle(/MortgageLab/i);
    });
});
