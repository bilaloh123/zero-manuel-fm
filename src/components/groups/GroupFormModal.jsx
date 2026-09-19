import { useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import FormField, { inputClass } from "../ui/FormField";
import { supabase } from "../../lib/supabaseClient";

function toFormState(group) {
  return {
    name: group?.name ?? "",
  };
}

export default function GroupFormModal({ open, group, onClose, onSaved }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(() => toFormState(group));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = !!group;

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
      const payload = { name: form.name.trim() };
      if (isEdit) {
        const { error: updateError } = await supabase.from("groups").update(payload).eq("id", group.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("groups").insert(payload);
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
      title={isEdit ? t("groups.edit") : t("groups.addTitle")}
      footer={
        <>
          <Button variant="secondary" onClick={resetAndClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="group-form" disabled={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="group-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label={t("groups.fields.name")} htmlFor="name">
          <input id="name" required value={form.name} onChange={handleChange("name")} className={inputClass} />
        </FormField>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
