import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";

function toFormState(role) {
  return {
    code: role?.code ?? "",
    label_ar: role?.label_ar ?? "",
    label_fr: role?.label_fr ?? "",
  };
}

export default function RoleFormModal({ open, role, onClose, onSaved }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => toFormState(role));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!role;

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
      const payload = {
        code: form.code.trim(),
        label_ar: form.label_ar.trim(),
        label_fr: form.label_fr.trim(),
      };
      if (isEdit) {
        const { error: updateError } = await supabase.from("roles").update(payload).eq("id", role.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("roles").insert(payload);
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
      title={isEdit ? t("roles.edit") : t("roles.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="role-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="role-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label={t("roles.fields.code")} htmlFor="code">
          <input id="code" required value={form.code} onChange={handleChange("code")} className={inputClass} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("roles.fields.labelAr")} htmlFor="label_ar">
            <input
              id="label_ar"
              required
              dir="rtl"
              value={form.label_ar}
              onChange={handleChange("label_ar")}
              className={inputClass}
            />
          </FormField>
          <FormField label={t("roles.fields.labelFr")} htmlFor="label_fr">
            <input
              id="label_fr"
              required
              value={form.label_fr}
              onChange={handleChange("label_fr")}
              className={inputClass}
            />
          </FormField>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
