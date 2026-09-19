import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { login } from "./helpers.js";

// Transfers have no UI delete (append-only lifecycle, by design), so this test
// cleans up its own cancelled row directly via service_role afterwards --
// otherwise every run would leave a permanent artifact in the real database.
// Cancelling also fires the notify_transfer_status_change_trg trigger (Phase
// 1.3), which inserts a row into `alerts` -- clean that up too, or every run
// leaves an orphaned "transfer_cancelled" notification behind.
const QUANTITY = "137";

test.afterEach(async () => {
  const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: rows } = await admin
    .from("transfers")
    .select("id")
    .eq("quantity", Number(QUANTITY))
    .eq("status", "cancelled");
  const ids = (rows || []).map((r) => r.id);
  if (ids.length > 0) {
    await admin.from("alerts").delete().eq("related_table", "transfers").in("related_id", ids);
    await admin.from("transfers").delete().in("id", ids);
  }
});

test("create and cancel a transfer", async ({ page }) => {
  const quantity = QUANTITY;

  await login(page);
  await page.goto("/transfers");

  await page.getByRole("button", { name: "إضافة تحويل" }).click();
  await page.locator("#product_id").selectOption({ index: 1 });
  await page.locator("#quantity").fill(quantity);
  await page.locator("#source_farm_id").selectOption({ index: 1 });
  await page.locator("#destination_farm_id").selectOption({ index: 2 });
  await page.getByRole("button", { name: "حفظ" }).click();

  const row = page.locator("tr", { hasText: quantity });
  await expect(row).toBeVisible();
  await expect(row.getByText("مطلوب")).toBeVisible();

  await row.getByTitle("إلغاء التحويل").click();
  await page.getByRole("button", { name: "تأكيد" }).click();

  await expect(row.getByText("ملغى")).toBeVisible();
});
