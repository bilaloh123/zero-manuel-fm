import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";

function toFormState(supplier) {
  return {
    company_name: supplier?.company_name ?? "",
    ice: supplier?.ice ?? "",
    if_no: supplier?.if_no ?? "",
    rc: supplier?.rc ?? "",
    address: supplier?.address ?? "",
    contact_name: supplier?.contact_name ?? "",
    phone: supplier?.phone ?? "",
    email: supplier?.email ?? "",
    payment_terms: supplier?.payment_terms ?? "",
    lead_time_days: supplier?.lead_time_days ?? "",
  };
}

export default function SupplierFormModal({ open, supplier, onClose, onSaved }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => toFormState(supplier));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!supplier;

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
      const strOrNull = (v) => v.trim() || null;
      const payload = {
        company_name: form.company_name.trim(),
        ice: strOrNull(form.ice),
        if_no: strOrNull(form.if_no),
        rc: strOrNull(form.rc),
        address: strOrNull(form.address),
        contact_name: strOrNull(form.contact_name),
        phone: strOrNull(form.phone),
        email: strOrNull(form.email),
        payment_terms: strOrNull(form.payment_terms),
        lead_time_days: form.lead_time_days === "" ? null : Number(form.lead_time_days),
      };
      if (isEdit) {
        const { error: updateError } = await supabase.from("suppliers").update(payload).eq("id", supplier.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("suppliers").insert(payload);
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
      title={isEdit ? t("suppliers.edit") : t("suppliers.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="supplier-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="supplier-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label={t("suppliers.fields.companyName")} htmlFor="company_name">
          <input
            id="company_name"
            required
            value={form.company_name}
            onChange={handleChange("company_name")}
            className={inputClass}
          />
        </FormField>

        <div className="grid grid-cols-3 gap-4">
          <FormField label={t("suppliers.fields.ice")} htmlFor="ice">
            <input id="ice" value={form.ice} onChange={handleChange("ice")} className={inputClass} />
          </FormField>
          <FormField label={t("suppliers.fields.ifNo")} htmlFor="if_no">
            <input id="if_no" value={form.if_no} onChange={handleChange("if_no")} className={inputClass} />
          </FormField>
          <FormField label={t("suppliers.fields.rc")} htmlFor="rc">
            <input id="rc" value={form.rc} onChange={handleChange("rc")} className={inputClass} />
          </FormField>
        </div>

        <FormField label={t("suppliers.fields.address")} htmlFor="address">
          <input id="address" value={form.address} onChange={handleChange("address")} className={inputClass} />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("suppliers.fields.contactName")} htmlFor="contact_name">
            <input
              id="contact_name"
              value={form.contact_name}
              onChange={handleChange("contact_name")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("suppliers.fields.phone")} htmlFor="phone">
            <input id="phone" value={form.phone} onChange={handleChange("phone")} className={inputClass} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("suppliers.fields.email")} htmlFor="email">
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={handleChange("email")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("suppliers.fields.leadTimeDays")} htmlFor="lead_time_days">
            <input
              id="lead_time_days"
              type="number"
              min="0"
              value={form.lead_time_days}
              onChange={handleChange("lead_time_days")}
              className={inputClass}
            />
          </FormField>
        </div>

        <FormField label={t("suppliers.fields.paymentTerms")} htmlFor="payment_terms">
          <input
            id="payment_terms"
            value={form.payment_terms}
            onChange={handleChange("payment_terms")}
            className={inputClass}
          />
        </FormField>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
