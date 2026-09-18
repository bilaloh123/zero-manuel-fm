import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";

function toFormState(customer) {
  return {
    name: customer?.name ?? "",
    phone: customer?.contact_info?.phone ?? "",
    email: customer?.contact_info?.email ?? "",
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
      const payload = { name: form.name.trim(), contact_info };
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
        <FormField label={t("customers.fields.name")} htmlFor="name">
          <input id="name" required value={form.name} onChange={handleChange("name")} className={inputClass} />
        </FormField>

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

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
