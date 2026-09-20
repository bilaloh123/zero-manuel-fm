import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { recomputeCustomerInvoiceStatus } from "../../lib/customerInvoiceStatus";

function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function CreditNotesModal({ open, invoice, onClose }) {
  const { t } = useTranslation();
  const [creditNotes, setCreditNotes] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadCreditNotes = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("credit_notes")
      .select("id, credit_no, amount, reason, credit_date")
      .eq("customer_invoice_id", invoice.id)
      .order("credit_date", { ascending: false });
    if (fetchError) {
      setError(fetchError.message);
      setCreditNotes([]);
      return;
    }
    setCreditNotes(data);
  }, [invoice.id]);

  useEffect(() => {
    loadCreditNotes();
  }, [loadCreditNotes]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from("credit_notes").insert({
        farm_id: invoice.farm_id,
        customer_id: invoice.customer_id,
        customer_invoice_id: invoice.id,
        amount: Number(form.amount),
        reason: form.reason.trim(),
        credit_date: form.credit_date,
      });
      if (insertError) throw insertError;
      await recomputeCustomerInvoiceStatus(invoice.id, invoice.total_amount);
      setForm(null);
      await loadCreditNotes();
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
      title={t("customerInvoices.creditNotes.title")}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t("common.cancel")}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!form && (
          <Button onClick={() => setForm({ amount: "", reason: "", credit_date: todayStr() })} className="self-start">
            <Plus className="h-4 w-4" />
            {t("customerInvoices.creditNotes.addCreditNote")}
          </Button>
        )}

        {form && (
          <form onSubmit={handleAdd} className="flex flex-col gap-3 rounded-control border border-border p-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label={t("customerInvoices.creditNotes.amount")} htmlFor="cn_amount">
                <input
                  id="cn_amount"
                  type="number"
                  required
                  step="0.01"
                  min="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className={inputClass}
                />
              </FormField>
              <FormField label={t("customerInvoices.creditNotes.creditDate")} htmlFor="cn_date">
                <input
                  id="cn_date"
                  type="date"
                  required
                  value={form.credit_date}
                  onChange={(e) => setForm((f) => ({ ...f, credit_date: e.target.value }))}
                  className={inputClass}
                />
              </FormField>
            </div>
            <FormField label={t("customerInvoices.creditNotes.reason")} htmlFor="cn_reason">
              <textarea
                id="cn_reason"
                required
                rows={2}
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                className={inputClass}
              />
            </FormField>
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

        {creditNotes === null ? (
          <p className="py-4 text-center text-sm text-ink-muted">{t("common.loading")}</p>
        ) : creditNotes.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-muted">{t("customerInvoices.creditNotes.noCreditNotes")}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {creditNotes.map((cn) => (
              <li key={cn.id} className="rounded-control border border-border px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-medium text-ink">{cn.credit_no}</span>
                  <span className="text-sm font-medium text-ink">{cn.amount}</span>
                </div>
                <p className="text-xs text-ink-muted">{cn.credit_date} — {cn.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
