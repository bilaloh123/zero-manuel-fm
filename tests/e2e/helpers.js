export async function login(page) {
  await page.goto("/");
  await page.locator("#email").fill(process.env.TEST_USER_EMAIL);
  await page.locator("#password").fill(process.env.TEST_USER_PASSWORD);
  await page.getByRole("button", { name: "دخول" }).click();
  // Login and the dashboard both live at "/" (Gate switches on auth state,
  // not route), so waiting for a URL change is a no-op, and both screens
  // show "AGRIMAX" text -- wait for the login form itself to disappear.
  await page.locator("#email").waitFor({ state: "detached" });
}

export function uniqueSuffix() {
  return Date.now().toString(36);
}
