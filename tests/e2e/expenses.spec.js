import { test, expect } from "@playwright/test";
import { login } from "./helpers.js";

test("create and delete an expense", async ({ page }) => {
  const amount = "194713.5";

  await login(page);
  await page.goto("/expenses");

  await page.getByRole("button", { name: "إضافة مصروف" }).click();
  await page.locator("#farm_id").selectOption({ index: 1 });
  await page.locator("#amount").fill(amount);
  await page.getByRole("button", { name: "حفظ" }).click();

  const row = page.locator("tr", { hasText: amount });
  await expect(row).toBeVisible();

  await row.locator("button.text-red-600").click();
  await page.getByRole("button", { name: "حذف" }).click();

  await expect(page.locator("tr", { hasText: amount })).toHaveCount(0);
});
