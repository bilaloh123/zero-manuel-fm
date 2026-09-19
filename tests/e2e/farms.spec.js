import { test, expect } from "@playwright/test";
import { login, uniqueSuffix } from "./helpers.js";

test("create and delete a farm", async ({ page }) => {
  const suffix = uniqueSuffix();
  const code = `E2E-${suffix}`;
  const name = `E2E Smoke Farm ${suffix}`;

  await login(page);
  await page.goto("/farms");

  await page.getByRole("button", { name: "إضافة مزرعة" }).click();
  await page.locator("#code").fill(code);
  await page.locator("#name").fill(name);
  await page.getByRole("button", { name: "حفظ" }).click();

  const row = page.locator("tr", { hasText: name });
  await expect(row).toBeVisible();

  await row.locator("button.text-red-600").click();
  await page.getByRole("button", { name: "حذف" }).click();

  await expect(page.locator("tr", { hasText: name })).toHaveCount(0);
});
