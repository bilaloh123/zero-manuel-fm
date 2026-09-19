import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useFarmOptions } from "../../hooks/useFarmOptions";
import { useCustomerOptions } from "../../hooks/useCustomerOptions";

function toFormState(order, defaultFarmId) {
  return {
    farm_id: order?.farm_id ?? defaultFarmId ?? "",
    customer_id: order?.customer_id ?? "",
    quote_id: order?.quote_id ?? "",
    discount_pct: order?.discount_pct ?? "0",
    allow_backorder: order?.allow_backorder ?? false,
    notes: order?.notes ?? "",
  };
}

export default function SalesOrderFormModal({ open, order, defaultFarmId, onClose, onSaved }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { farms } = useFarmOptions();
  const { customers } = useCustomerOptions();
  const [quotes, setQuotes] = useState([]);
  const [form, setForm] = useState(() => toFormState(order, defaultFarmId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!order;

  useEffect(() => {
    supabase
      .from("quotes")
      .select("id, quote_no, farm_id, customer_id, discount_pct, status")
      .eq("status", "accepted")
      .then(({ data }) => setQuotes(data || []));
  }, []);

  const resetAndClose = () => {
    setForm(toFormState(null, defaultFarmId));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleQuoteChange = (e) => {
    const quote_id = e.target.value;
    const quote = quotes.find((q) => q.id === quote_id);
    setForm((f) => ({
      ...f,
      quote_id,
      farm_id: quote ? quote.farm_id : f.farm_id,
      customer_id: quote ? quote.customer_id : f.customer_id,
      discount_pct: quote ? String(quote.discount_pct) : f.discount_pct,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        farm_id: form.farm_id,
        customer_id: form.customer_id,
        quote_id: form.quote_id || null,
        discount_pct: Number(form.discount_pct) || 0,
        allow_backorder: form.allow_backorder,
        notes: form.notes.trim() || null,
      };
      if (isEdit) {
        const { error: updateError } = await supabase.from("sales_orders").update(payload).eq("id", order.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("sales_orders")
          .insert({ ...payload, created_by: user.id });
        if (insertError) throw insertError;
      }
      onSaved();
      resetAndClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      title={isEdit ? t("salesOrders.edit") : t("salesOrders.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="sales-order-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="sales-order-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label={t("salesOrders.fields.linkedQuote")} htmlFor="quote_id">
          <select id="quote_id" value={form.quote_id} onChange={handleQuoteChange} className={inputClass}>
            <option value="">{t("salesOrders.noLinkedQuote")}</option>
            {quotes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.quote_no}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("salesOrders.fields.farm")} htmlFor="farm_id">
            <select id="farm_id" required value={form.farm_id} onChange={handleChange("farm_id")} className={inputClass}>
              <option value="" disabled>
                {t("salesOrders.fields.farm")}
              </option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t("salesOrders.fields.customer")} htmlFor="customer_id">
            <select
              id="customer_id"
              required
              value={form.customer_id}
              onChange={handleChange("customer_id")}
              className={inputClass}
            >
              <option value="" disabled>
                {t("salesOrders.fields.customer")}
              </option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                  {customer.status === "blocked" ? ` (${t("customers.status.blocked")})` : ""}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("salesOrders.fields.discountPct")} htmlFor="discount_pct">
            <input
              id="discount_pct"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={form.discount_pct}
              onChange={handleChange("discount_pct")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("salesOrders.fields.allowBackorder")} htmlFor="allow_backorder">
            <label className="flex h-[42px] items-center gap-2">
              <input
                id="allow_backorder"
                type="checkbox"
                checked={form.allow_backorder}
                onChange={(e) => setForm((f) => ({ ...f, allow_backorder: e.target.checked }))}
                className="h-4 w-4 rounded border-border"
              />
              <span className="text-sm text-ink-muted">{t("salesOrders.allowBackorderHint")}</span>
            </label>
          </FormField>
        </div>

        <FormField label={t("salesOrders.fields.notes")} htmlFor="notes">
          <textarea id="notes" rows={2} value={form.notes} onChange={handleChange("notes")} className={inputClass} />
        </FormField>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
