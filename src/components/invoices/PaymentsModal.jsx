import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";

function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function recomputeInvoiceStatus(invoiceId, invoiceAmount) {
  const { data: payments } = await supabase.from("payments").select("amount").eq("invoice_id", invoiceId);
  const total = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
  const status = total <= 0 ? "unpaid" : total >= Number(invoiceAmount) ? "paid" : "partial";
  await supabase.from("invoices").update({ status }).eq("id", invoiceId);
  return total;
}

export default function PaymentsModal({ open, invoice, onClose }) {
  const { t } = useTranslation();
  const [payments, setPayments] = useState(null);
  const [totalPaid, setTotalPaid] = useState(0);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadPayments = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("payments")
      .select("id, amount, paid_at")
      .eq("invoice_id", invoice.id)
      .order("paid_at", { ascending: false });
    if (fetchError) {
      setError(fetchError.message);
      setPayments([]);
      return;
    }
    setPayments(data);
    setTotalPaid((data || []).reduce((sum, p) => sum + Number(p.amount), 0));
  }, [invoice.id]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from("payments").insert({
        invoice_id: invoice.id,
        amount: Number(form.amount),
        paid_at: form.paid_at,
      });
      if (insertError) throw insertError;
      await recomputeInvoiceStatus(invoice.id, invoice.amount);
      setForm(null);
      await loadPayments();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (paymentId) => {
    setSaving(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase.from("payments").delete().eq("id", paymentId);
      if (deleteError) throw deleteError;
      await recomputeInvoiceStatus(invoice.id, invoice.amount);
      await loadPayments();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("invoices.payments.title")}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t("common.cancel")}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium text-ink">
          {t("invoices.payments.totalPaid", { total: totalPaid, amount: invoice.amount })}
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {!form && (
          <Button onClick={() => setForm({ amount: "", paid_at: todayStr() })} className="self-start">
            <Plus className="h-4 w-4" />
            {t("invoices.payments.addPayment")}
          </Button>
        )}

        {form && (
          <form onSubmit={handleAdd} className="flex flex-col gap-3 rounded-control border border-border p-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label={t("invoices.payments.amount")} htmlFor="amount">
                <input
                  id="amount"
                  type="number"
                  required
                  step="0.01"
                  min="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className={inputClass}
                />
              </FormField>
              <FormField label={t("invoices.payments.paidAt")} htmlFor="paid_at">
                <input
                  id="paid_at"
                  type="date"
                  required
                  value={form.paid_at}
                  onChange={(e) => setForm((f) => ({ ...f, paid_at: e.target.value }))}
                  className={inputClass}
                />
              </FormField>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setForm(null)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {t("common.save")}
              </Button>
            </div>
          </form>
        )}

        {payments === null ? (
          <p className="py-4 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : payments.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-muted">{t("invoices.payments.noPayments")}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="flex items-center justify-between rounded-control border border-border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{payment.amount}</p>
                  <p className="text-xs text-ink-muted">{payment.paid_at}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(payment.id)}
                  disabled={saving}
                  className="flex h-7 w-7 items-center justify-center rounded-control text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
