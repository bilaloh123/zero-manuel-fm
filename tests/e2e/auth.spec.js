import { test, expect } from "@playwright/test";

test.describe("auth", () => {
  test("valid login reaches the dashboard", async ({ page }) => {
    await page.goto("/");
    await page.locator("#email").fill(process.env.TEST_USER_EMAIL);
    await page.locator("#password").fill(process.env.TEST_USER_PASSWORD);
    await page.getByRole("button", { name: "دخول" }).click();
    await page.locator("#email").waitFor({ state: "detached" });
    await expect(page.getByRole("heading", { name: "لوحة القيادة" })).toBeVisible();
  });

  test("invalid credentials show an error and stay on login", async ({ page }) => {
    await page.goto("/");
    await page.locator("#email").fill("nobody@agrimax-internal.test");
    await page.locator("#password").fill("wrong-password");
    await page.getByRole("button", { name: "دخول" }).click();
    await expect(page.getByText("البريد الإلكتروني أو كلمة المرور غير صحيحة")).toBeVisible();
    await expect(page).toHaveURL("/");
    await expect(page.locator("#email")).toBeVisible();
  });
});
