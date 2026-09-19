import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useFarmOptions } from "../../hooks/useFarmOptions";
import { useCustomerOptions } from "../../hooks/useCustomerOptions";

const STATUS_OPTIONS = ["draft", "sent", "accepted", "rejected", "expired"];

function toFormState(quote, defaultFarmId) {
  return {
    farm_id: quote?.farm_id ?? defaultFarmId ?? "",
    customer_id: quote?.customer_id ?? "",
    status: quote?.status ?? "draft",
    valid_until: quote?.valid_until ?? "",
    discount_pct: quote?.discount_pct ?? "0",
    notes: quote?.notes ?? "",
  };
}

export default function QuoteFormModal({ open, quote, defaultFarmId, onClose, onSaved }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { farms } = useFarmOptions();
  const { customers } = useCustomerOptions();
  const [form, setForm] = useState(() => toFormState(quote, defaultFarmId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!quote;

  const resetAndClose = () => {
    setForm(toFormState(null, defaultFarmId));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        farm_id: form.farm_id,
        customer_id: form.customer_id,
        status: form.status,
        valid_until: form.valid_until || null,
        discount_pct: Number(form.discount_pct) || 0,
        notes: form.notes.trim() || null,
      };
      if (isEdit) {
        const { error: updateError } = await supabase.from("quotes").update(payload).eq("id", quote.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("quotes")
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
      title={isEdit ? t("quotes.edit") : t("quotes.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="quote-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="quote-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("quotes.fields.farm")} htmlFor="farm_id">
            <select id="farm_id" required value={form.farm_id} onChange={handleChange("farm_id")} className={inputClass}>
              <option value="" disabled>
                {t("quotes.fields.farm")}
              </option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t("quotes.fields.customer")} htmlFor="customer_id">
            <select
              id="customer_id"
              required
              value={form.customer_id}
              onChange={handleChange("customer_id")}
              className={inputClass}
            >
              <option value="" disabled>
                {t("quotes.fields.customer")}
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

        <div className="grid grid-cols-3 gap-4">
          <FormField label={t("quotes.fields.status")} htmlFor="status">
            <select id="status" value={form.status} onChange={handleChange("status")} className={inputClass}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`quotes.status.${opt}`)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("quotes.fields.validUntil")} htmlFor="valid_until">
            <input
              id="valid_until"
              type="date"
              value={form.valid_until}
              onChange={handleChange("valid_until")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("quotes.fields.discountPct")} htmlFor="discount_pct">
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
        </div>

        <FormField label={t("quotes.fields.notes")} htmlFor="notes">
          <textarea
            id="notes"
            rows={2}
            value={form.notes}
            onChange={handleChange("notes")}
            className={inputClass}
          />
        </FormField>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
