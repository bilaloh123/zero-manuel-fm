import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";

const STATUS_OPTIONS = ["active", "inactive", "blocked"];

function toFormState(customer) {
  return {
    name: customer?.name ?? "",
    phone: customer?.contact_info?.phone ?? "",
    email: customer?.contact_info?.email ?? "",
    code: customer?.code ?? "",
    ice: customer?.ice ?? "",
    if_no: customer?.if_no ?? "",
    rc: customer?.rc ?? "",
    payment_terms: customer?.payment_terms ?? "",
    credit_limit: customer?.credit_limit ?? "",
    payment_delay_days: customer?.payment_delay_days ?? "",
    currency: customer?.currency ?? "MAD",
    status: customer?.status ?? "active",
  };
}

export default function CustomerFormModal({ open, customer, onClose, onSaved }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => toFormState(customer));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!customer;

  const resetAndClose = () => {
    setForm(toFormState(null));
    setError(null);
    onClose();
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const contact_info =
        form.phone.trim() || form.email.trim()
          ? { phone: form.phone.trim() || null, email: form.email.trim() || null }
          : null;
      const strOrNull = (v) => v.trim() || null;
      const payload = {
        name: form.name.trim(),
        contact_info,
        code: strOrNull(form.code),
        ice: strOrNull(form.ice),
        if_no: strOrNull(form.if_no),
        rc: strOrNull(form.rc),
        payment_terms: strOrNull(form.payment_terms),
        credit_limit: form.credit_limit === "" ? null : Number(form.credit_limit),
        payment_delay_days: form.payment_delay_days === "" ? null : Number(form.payment_delay_days),
        currency: form.currency.trim() || "MAD",
        status: form.status,
      };
      if (isEdit) {
        const { error: updateError } = await supabase.from("customers").update(payload).eq("id", customer.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("customers").insert(payload);
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
      title={isEdit ? t("customers.edit") : t("customers.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="customer-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="customer-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("customers.fields.name")} htmlFor="name">
            <input id="name" required value={form.name} onChange={handleChange("name")} className={inputClass} />
          </FormField>
          <FormField label={t("customers.fields.code")} htmlFor="code">
            <input id="code" value={form.code} onChange={handleChange("code")} className={inputClass} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("customers.fields.phone")} htmlFor="phone">
            <input id="phone" value={form.phone} onChange={handleChange("phone")} className={inputClass} />
          </FormField>
          <FormField label={t("customers.fields.email")} htmlFor="email">
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={handleChange("email")}
              className={inputClass}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField label={t("customers.fields.ice")} htmlFor="ice">
            <input id="ice" value={form.ice} onChange={handleChange("ice")} className={inputClass} />
          </FormField>
          <FormField label={t("customers.fields.ifNo")} htmlFor="if_no">
            <input id="if_no" value={form.if_no} onChange={handleChange("if_no")} className={inputClass} />
          </FormField>
          <FormField label={t("customers.fields.rc")} htmlFor="rc">
            <input id="rc" value={form.rc} onChange={handleChange("rc")} className={inputClass} />
          </FormField>
        </div>

        <FormField label={t("customers.fields.paymentTerms")} htmlFor="payment_terms">
          <input
            id="payment_terms"
            value={form.payment_terms}
            onChange={handleChange("payment_terms")}
            className={inputClass}
          />
        </FormField>

        <div className="grid grid-cols-3 gap-4">
          <FormField label={t("customers.fields.creditLimit")} htmlFor="credit_limit">
            <input
              id="credit_limit"
              type="number"
              step="0.01"
              min="0"
              value={form.credit_limit}
              onChange={handleChange("credit_limit")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("customers.fields.paymentDelayDays")} htmlFor="payment_delay_days">
            <input
              id="payment_delay_days"
              type="number"
              min="0"
              value={form.payment_delay_days}
              onChange={handleChange("payment_delay_days")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("customers.fields.currency")} htmlFor="currency">
            <input id="currency" value={form.currency} onChange={handleChange("currency")} className={inputClass} />
          </FormField>
        </div>

        <FormField label={t("customers.fields.status")} htmlFor="status">
          <select id="status" value={form.status} onChange={handleChange("status")} className={inputClass}>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {t(`customers.status.${opt}`)}
              </option>
            ))}
          </select>
        </FormField>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
