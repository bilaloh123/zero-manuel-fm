import { supabase } from "./supabaseClient";

export async function recomputeCustomerInvoiceStatus(invoiceId, totalAmount) {
  const [{ data: payments }, { data: creditNotes }] = await Promise.all([
    supabase.from("customer_payments").select("amount").eq("customer_invoice_id", invoiceId),
    supabase.from("credit_notes").select("amount").eq("customer_invoice_id", invoiceId),
  ]);
  const totalSettled =
    (payments || []).reduce((sum, p) => sum + Number(p.amount), 0) +
    (creditNotes || []).reduce((sum, c) => sum + Number(c.amount), 0);
  const status = totalSettled <= 0 ? "unpaid" : totalSettled >= Number(totalAmount) ? "paid" : "partial";
  await supabase.from("customer_invoices").update({ status }).eq("id", invoiceId);
  return totalSettled;
}
